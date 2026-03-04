import { spawn, execFileSync } from "node:child_process";
import { stripAnsi } from "./ansi.js";
import { sanitizeErrorOutput } from "./sanitize.js";

/**
 * Resolves a command name to its absolute path using `where` (Windows) or
 * `which` (Unix). On Windows this is used to detect whether a command is a
 * .cmd/.bat wrapper so the runner can invoke it via cmd.exe without using
 * `shell: true` (which triggers CodeQL alert #16).
 *
 * Returns the original command string if resolution fails (e.g., the command
 * is already an absolute path, or `which`/`where` is unavailable).
 */
function resolveCommand(cmd: string): string {
  // Skip resolution if cmd is already an absolute path
  if (cmd.startsWith("/") || /^[A-Za-z]:[/\\]/.test(cmd)) {
    return cmd;
  }
  try {
    const resolver = process.platform === "win32" ? "where" : "which";
    const resolved = execFileSync(resolver, [cmd], {
      timeout: 5_000,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    })
      .toString("utf-8")
      .split(/\r?\n/)[0]
      .trim();
    return resolved || cmd;
  } catch {
    // Resolution failed — fall back to the bare command name so existing
    // behavior (PATH lookup by the shell/OS) is preserved.
    return cmd;
  }
}

/** Options for the command runner, including working directory, timeout, and environment overrides. */
export interface RunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  /** Data to write to the child process's stdin. Useful for piping content
   *  (e.g., `git commit --file -`) instead of passing it as a command arg,
   *  which avoids cmd.exe argument-length and newline limitations on Windows. */
  stdin?: string;
  /** Override shell mode. Defaults to `false` on all platforms. On Windows,
   *  .cmd/.bat wrappers are automatically handled via cmd.exe invocation without
   *  shell mode. Set to `true` only when you need shell features (pipes, globs). */
  shell?: boolean;
  /** Maximum combined stdout+stderr buffer size in bytes. Defaults to 10 MB. */
  maxBuffer?: number;
  /** When true, pass `env` directly without merging with process.env.
   *  Useful for sandboxed execution where the parent environment should be excluded. */
  replaceEnv?: boolean;
}

/**
 * Kills an entire process group (Unix) or process tree (Windows).
 *
 * On Unix, `spawn({ detached: true })` calls `setsid(2)`, making the child
 * a process group leader. Sending a signal to `-pid` reaches every process
 * in that group, including grandchildren.
 *
 * On Windows, `taskkill /T /F` walks the native process tree.
 *
 * ESRCH (process already exited) is silently ignored.
 */
function killProcessGroup(pid: number): void {
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        timeout: 5_000,
      });
    } catch {
      /* best-effort */
    }
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ESRCH") throw err;
    }
  }
}

/** Result of a command execution, containing the exit code and ANSI-stripped stdout/stderr. */
export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  userCpuTimeMicros?: number;
  systemCpuTimeMicros?: number;
}

/**
 * Escapes a single argument for safe use with cmd.exe on Windows.
 *
 * When `shell: true` is used with `execFile` on Windows, Node.js joins the
 * command and args with spaces to build a cmd.exe command line. It does NOT
 * automatically quote individual arguments, so args containing spaces would
 * be split into multiple tokens by cmd.exe.
 *
 * Strategy:
 *   - Args with spaces, tabs, or double quotes are wrapped in double quotes.
 *     Inside double quotes cmd.exe treats `&`, `|`, `<`, `>`, `^` as literal,
 *     so only `%` needs escaping (`%%`). Internal `"` chars are doubled (`""`).
 *   - Args without spaces are left unquoted, with cmd.exe metacharacters
 *     escaped via the caret (`^`) prefix.
 *   - `%` → `%%` is applied unconditionally (active in both quoted/unquoted).
 *
 * Parentheses `(` `)` are NOT escaped because inside double-quoted strings
 * they are literal, and outside quotes they rarely appear in tool args.
 */
export function escapeCmdArg(arg: string): string {
  // NOTE: We intentionally do NOT escape % → %%. While % starts environment
  // variable expansion in cmd.exe (%VAR%), the %% escape only works in batch
  // files. When Node.js uses `shell: true`, it runs via `cmd.exe /d /s /c`
  // which is NOT batch context — so %% passes through literally as two %
  // characters. This breaks tools like git that use % in format strings
  // (e.g., --format=%H), because git interprets %% as its own escape for
  // literal %. User-provided text that might contain %VAR% patterns should
  // be passed via stdin (e.g., git commit --file -) rather than as args.
  let escaped = arg;

  // Step 1: If the arg contains spaces, tabs, or double quotes, wrap it in
  // double quotes so cmd.exe keeps it as a single token.
  if (/[ \t"]/.test(arg)) {
    // Replace newlines with spaces — cmd.exe treats \n as a command-line
    // terminator even inside double quotes, so literal newlines cannot be
    // passed via command args. Tools that need newline-preserving input
    // should use RunOptions.stdin instead (e.g., git commit --file -).
    escaped = escaped.replace(/\r?\n/g, " ");
    // Escape internal double quotes by doubling them
    escaped = escaped.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  // Step 2: For unquoted args, caret-escape cmd.exe metacharacters.
  // The caret itself must be escaped first so that carets we insert
  // are not themselves re-escaped.
  escaped = escaped.replace(/\^/g, "^^");
  escaped = escaped.replace(/&/g, "^&");
  escaped = escaped.replace(/\|/g, "^|");
  escaped = escaped.replace(/</g, "^<");
  escaped = escaped.replace(/>/g, "^>");

  // Step 3: Escape ! to prevent delayed expansion (!VAR!)
  escaped = escaped.replace(/!/g, "^!");

  return escaped;
}

// ---------------------------------------------------------------------------
// Verbatim-mode escaping helpers (cross-spawn pattern)
//
// These are used when spawning .cmd/.bat files via cmd.exe with
// windowsVerbatimArguments: true, where libuv performs NO quoting.
// Algorithm ported from cross-spawn (https://github.com/moxystudio/node-cross-spawn).
// ---------------------------------------------------------------------------

/** cmd.exe metacharacters that need caret-escaping. */
const META_CHARS_RE = /([()\][%!^"`<>&|;, *?])/g;

/** Caret-escape cmd.exe metacharacters in a command path. */
function escapeCommandForVerbatim(cmd: string): string {
  return cmd.replace(META_CHARS_RE, "^$1");
}

/**
 * Escapes a single argument for cmd.exe in windowsVerbatimArguments mode.
 *
 * Based on https://qntm.org/cmd (same algorithm as cross-spawn):
 * 1. Handle backslash+quote sequences for MSVC C runtime parsing
 * 2. Wrap in double quotes
 * 3. Caret-escape cmd.exe metacharacters on the quoted result
 */
function escapeArgForVerbatim(arg: string): string {
  // Sequence of backslashes followed by a double quote:
  // double up all the backslashes and escape the double quote
  let escaped = arg.replace(/(?=(\\+?))\1"/g, '$1$1\\"');

  // Sequence of backslashes at end of string (will be followed by our closing quote):
  // double up all the backslashes
  escaped = escaped.replace(/(?=(\\+?))\1$/, "$1$1");

  // Wrap in double quotes, then caret-escape metacharacters
  escaped = `"${escaped}"`;
  escaped = escaped.replace(META_CHARS_RE, "^$1");

  return escaped;
}

// ---------------------------------------------------------------------------
// Spawn configuration
// ---------------------------------------------------------------------------

/** Configuration for how to invoke `spawn()`. @internal — exported for testing only. */
export interface SpawnConfig {
  command: string;
  args: string[];
  shell: boolean;
  windowsVerbatimArguments: boolean;
}

/**
 * Determines how to spawn a command, handling Windows .cmd/.bat wrappers
 * without using `shell: true` (which triggers CodeQL alert #16).
 *
 * @internal — Exported for unit testing only. Use `run()` instead.
 *
 * Branches:
 *   1. Explicit `shell: true` — pass cmd directly, don't resolve (caller wants shell features)
 *   2. Windows .cmd/.bat detected — cmd.exe /d /s /c "..." with windowsVerbatimArguments
 *   3. Windows native .exe — spawn resolved path directly
 *   4. Unix — spawn cmd directly, execvp handles PATH
 */
export function _buildSpawnConfig(
  cmd: string,
  args: string[],
  opts?: { shell?: boolean },
  platform: string = process.platform,
  resolver: (cmd: string) => string = resolveCommand,
): SpawnConfig {
  // Branch 1: Explicit shell: true — caller wants shell features (pipes, globs).
  // Pass cmd directly to spawn with shell: true — do NOT call resolveCommand,
  // which breaks the taint flow that CodeQL flags (environment → shell command).
  if (opts?.shell === true) {
    const safeArgs = platform === "win32" ? args.map(escapeCmdArg) : args;
    return { command: cmd, args: safeArgs, shell: true, windowsVerbatimArguments: false };
  }

  // Branches 2+3: Windows without shell — detect .cmd/.bat wrappers
  if (platform === "win32") {
    const resolved = resolver(cmd);
    if (/\.(cmd|bat)$/i.test(resolved)) {
      // Branch 2: .cmd/.bat files need cmd.exe to interpret them.
      // Use cross-spawn pattern: cmd.exe /d /s /c "escaped-command escaped-args"
      // with windowsVerbatimArguments: true so libuv doesn't re-quote.
      // shell: false ensures resolveCommand output never enters a shell command
      // string from Node's perspective — satisfying CodeQL.
      const escapedParts = [
        escapeCommandForVerbatim(resolved),
        ...args.map((a) => escapeArgForVerbatim(a)),
      ];
      return {
        command: "cmd.exe",
        args: ["/d", "/s", "/c", `"${escapedParts.join(" ")}"`],
        shell: false,
        windowsVerbatimArguments: true,
      };
    }
    // Branch 3: Native .exe on Windows — spawn resolved path directly
    return { command: resolved, args, shell: false, windowsVerbatimArguments: false };
  }

  // Branch 4: Unix — spawn cmd directly with shell: false.
  // execvp handles PATH lookup natively, no resolution needed.
  return { command: cmd, args, shell: false, windowsVerbatimArguments: false };
}

/**
 * Executes a command and returns cleaned output with ANSI codes stripped.
 * Uses spawn (not exec) to avoid shell injection. The child is spawned in its
 * own process group (`detached: true` on Unix) so that on timeout we can kill
 * the entire group — preventing orphaned grandchild processes.
 *
 * Shell mode defaults to `false` on all platforms. On Windows, .cmd/.bat
 * wrappers (like npm, npx) are automatically handled via cmd.exe invocation
 * with windowsVerbatimArguments (cross-spawn pattern), avoiding shell injection.
 *
 * Callers can opt in to `shell: true` for shell features (pipes, globs),
 * but this bypasses security protections — use only with trusted input.
 *
 * Throws on system-level errors (command not found, permission denied, timeout).
 * Normal non-zero exit codes are returned in the result, not thrown.
 */
export function run(cmd: string, args: string[], opts?: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const config = _buildSpawnConfig(cmd, args, { shell: opts?.shell });

    const child = spawn(config.command, config.args, {
      cwd: opts?.cwd,
      env: opts?.env ? (opts.replaceEnv ? opts.env : { ...process.env, ...opts.env }) : undefined,
      shell: config.shell,
      windowsVerbatimArguments: config.windowsVerbatimArguments,
      // Unix: creates a new process group via setsid(2) so we can kill the
      // entire group on timeout (prevents orphaned grandchild processes).
      // Windows: skip — detached on Windows creates a visible console window,
      // not a process group. Use taskkill /T /F instead.
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // --- Buffer accumulation (replaces execFile's maxBuffer) ---
    const maxBuffer = opts?.maxBuffer ?? 10 * 1024 * 1024; // 10 MB
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutLen = 0;
    let stderrLen = 0;
    let bufferExceeded = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutLen += chunk.length;
      if (stdoutLen + stderrLen > maxBuffer && !bufferExceeded) {
        bufferExceeded = true;
        killProcessGroup(child.pid!);
        return;
      }
      if (!bufferExceeded) stdoutChunks.push(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrLen += chunk.length;
      if (stdoutLen + stderrLen > maxBuffer && !bufferExceeded) {
        bufferExceeded = true;
        killProcessGroup(child.pid!);
        return;
      }
      if (!bufferExceeded) stderrChunks.push(chunk);
    });

    // --- Timeout handling (replaces execFile's timeout) ---
    let timedOut = false;
    let timeoutSignal: string | undefined;
    const timeoutMs = opts?.timeout ?? 180_000;
    const timer = setTimeout(() => {
      timedOut = true;
      timeoutSignal = "SIGTERM";
      killProcessGroup(child.pid!);
    }, timeoutMs);

    // --- Settlement guard (prevents double-resolve from close + error) ---
    let settled = false;

    // Handle spawn errors (ENOENT, EACCES on Unix — spawn emits these as
    // 'error' events, unlike execFile which passes them to the callback).
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      if (err.code === "ENOENT") {
        reject(
          new Error(
            `Command not found: "${cmd}". Ensure it is installed and available in your PATH.`,
          ),
        );
        return;
      }
      if (err.code === "EACCES" || err.code === "EPERM") {
        reject(new Error(`Permission denied executing "${cmd}": ${err.message}`));
        return;
      }

      reject(err);
    });

    // Resolve on 'close' (not 'exit') — close fires after ALL stdio streams
    // are flushed, guaranteeing no late data events.
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      let userCpuTimeMicros: number | undefined;
      let systemCpuTimeMicros: number | undefined;
      const childWithUsage = child as typeof child & {
        resourceUsage?: () => NodeJS.ResourceUsage;
      };
      if (typeof childWithUsage.resourceUsage === "function") {
        const usage = childWithUsage.resourceUsage();
        userCpuTimeMicros = usage.userCPUTime;
        systemCpuTimeMicros = usage.systemCPUTime;
      }

      const stdout = stripAnsi(Buffer.concat(stdoutChunks).toString("utf-8"));
      const stderr = sanitizeErrorOutput(stripAnsi(Buffer.concat(stderrChunks).toString("utf-8")));

      // Timeout: we killed the process group after the configured timeout.
      if (timedOut) {
        reject(
          new Error(
            `Command "${cmd}" timed out after ${timeoutMs}ms and was killed (${timeoutSignal ?? signal ?? "SIGTERM"}).`,
          ),
        );
        return;
      }

      // maxBuffer exceeded
      if (bufferExceeded) {
        reject(
          new Error(
            `Command "${cmd}" output exceeded maxBuffer (${maxBuffer} bytes) and was killed.`,
          ),
        );
        return;
      }

      // Windows: cmd.exe masks ENOENT — detect via stderr message
      if (code !== 0 && stderr.includes("is not recognized")) {
        reject(
          new Error(
            `Command not found: "${cmd}". Ensure it is installed and available in your PATH.`,
          ),
        );
        return;
      }

      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        ...(userCpuTimeMicros !== undefined ? { userCpuTimeMicros } : {}),
        ...(systemCpuTimeMicros !== undefined ? { systemCpuTimeMicros } : {}),
      });
    });

    // Pipe stdin data if provided, then close the stream so the child
    // process knows input is complete (e.g., `git commit --file -`).
    if (opts?.stdin != null) {
      child.stdin?.write(opts.stdin);
      child.stdin?.end();
    }
  });
}
