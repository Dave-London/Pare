import { execFile } from "node:child_process";
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
  // Step 1: Escape % → %% to prevent %VAR% expansion (works quoted & unquoted)
  let escaped = arg.replace(/%/g, "%%");

  // Step 2: If the arg contains spaces, tabs, or double quotes, wrap it in
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

  // Step 3: For unquoted args, caret-escape cmd.exe metacharacters.
  // The caret itself must be escaped first so that carets we insert
  // are not themselves re-escaped.
  escaped = escaped.replace(/\^/g, "^^");
  escaped = escaped.replace(/&/g, "^&");
  escaped = escaped.replace(/\|/g, "^|");
  escaped = escaped.replace(/</g, "^<");
  escaped = escaped.replace(/>/g, "^>");

  // Step 4: Escape ! to prevent delayed expansion (!VAR!)
  escaped = escaped.replace(/!/g, "^!");

  return escaped;
}

/**
 * Executes a command and returns cleaned output with ANSI codes stripped.
 * Uses execFile (not exec) to avoid shell injection. On Windows, shell is
 * enabled so that .cmd/.bat wrappers (like npx) can be executed — args are
 * still passed as an array so they remain properly escaped.
 *
 * Throws on system-level errors (command not found, permission denied).
 * Normal non-zero exit codes are returned in the result, not thrown.
 */
export function run(cmd: string, args: string[], opts?: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    // On Windows with shell mode, escape cmd.exe metacharacters to prevent
    // environment variable expansion and command injection via special chars.
    // See escapeCmdArg() for details on what is escaped and why.
    const safeArgs = process.platform === "win32" ? args.map(escapeCmdArg) : args;

    const child = execFile(
      cmd,
      safeArgs,
      {
        cwd: opts?.cwd,
        timeout: opts?.timeout ?? 60_000,
        env: opts?.env ? { ...process.env, ...opts.env } : undefined,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        shell: process.platform === "win32",
      },
      (error, stdout, stderr) => {
        if (error) {
          const errno = error as NodeJS.ErrnoException;

          // Unix: direct ENOENT from execFile (no shell wrapping)
          if (errno.code === "ENOENT") {
            reject(
              new Error(
                `Command not found: "${cmd}". Ensure it is installed and available in your PATH.`,
              ),
            );
            return;
          }
          if (errno.code === "EACCES" || errno.code === "EPERM") {
            reject(new Error(`Permission denied executing "${cmd}": ${errno.message}`));
            return;
          }

          // Timeout: execFile killed the child after the configured timeout.
          // Surface this clearly instead of silently returning exitCode 1.
          if (error.killed && error.signal) {
            reject(
              new Error(
                `Command "${cmd}" timed out after ${opts?.timeout ?? 60_000}ms and was killed (${error.signal}).`,
              ),
            );
            return;
          }

          // Windows: cmd.exe masks ENOENT — detect via stderr message
          const cleanStderr = stripAnsi(stderr);
          if (cleanStderr.includes("is not recognized")) {
            reject(
              new Error(
                `Command not found: "${cmd}". Ensure it is installed and available in your PATH.`,
              ),
            );
            return;
          }
        }

        resolve({
          exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0,
          stdout: stripAnsi(stdout),
          stderr: sanitizeErrorOutput(stripAnsi(stderr)),
        });
      },
    );

    // Pipe stdin data if provided, then close the stream so the child
    // process knows input is complete (e.g., `git commit --file -`).
    if (opts?.stdin != null) {
      child.stdin?.write(opts.stdin);
      child.stdin?.end();
    }
  });
}
