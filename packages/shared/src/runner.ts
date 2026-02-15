import { spawn, execFile as nodeExecFile } from "node:child_process";
import { stripAnsi } from "./ansi.js";
import { sanitizeErrorOutput } from "./sanitize.js";

/** Options for the command runner, including working directory, timeout, and environment overrides. */
export interface RunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  /** Data to write to the child process's stdin. Useful for piping content
   *  (e.g., `git commit --file -`) instead of passing it as a command arg,
   *  which avoids cmd.exe argument-length and newline limitations on Windows. */
  stdin?: string;
  /** Override shell mode. Defaults to `true` on Windows (for .cmd/.bat wrappers)
   *  and `false` elsewhere. Set to `false` for native executables (e.g., git)
   *  whose args contain characters that cmd.exe would misinterpret (like `<>`). */
  shell?: boolean;
  /** Maximum combined stdout+stderr buffer size in bytes. Defaults to 10 MB. */
  maxBuffer?: number;
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
      nodeExecFile("taskkill", ["/pid", String(pid), "/T", "/F"]);
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

/**
 * Executes a command and returns cleaned output with ANSI codes stripped.
 * Uses spawn (not exec) to avoid shell injection. The child is spawned in its
 * own process group (`detached: true` on Unix) so that on timeout we can kill
 * the entire group — preventing orphaned grandchild processes.
 *
 * On Windows, shell is enabled so that .cmd/.bat wrappers (like npx) can be
 * executed — args are still passed as an array so they remain properly escaped.
 *
 * Throws on system-level errors (command not found, permission denied, timeout).
 * Normal non-zero exit codes are returned in the result, not thrown.
 */
export function run(cmd: string, args: string[], opts?: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // Determine shell mode: default to true on Windows (for .cmd/.bat wrappers),
    // but allow callers to override (e.g., git uses shell:false to avoid cmd.exe
    // mangling format strings that contain < > characters).
    const useShell = opts?.shell ?? process.platform === "win32";

    // On Windows with shell mode, escape cmd.exe metacharacters to prevent
    // environment variable expansion and command injection via special chars.
    // See escapeCmdArg() for details on what is escaped and why.
    const safeArgs = useShell && process.platform === "win32" ? args.map(escapeCmdArg) : args;

    const child = spawn(cmd, safeArgs, {
      cwd: opts?.cwd,
      env: opts?.env ? { ...process.env, ...opts.env } : undefined,
      shell: useShell,
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
    const timeoutMs = opts?.timeout ?? 60_000;
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
