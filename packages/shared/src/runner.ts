import { execFile } from "node:child_process";
import { stripAnsi } from "./ansi.js";
import { sanitizeErrorOutput } from "./sanitize.js";

/** Options for the command runner, including working directory, timeout, and environment overrides. */
export interface RunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
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
 * When `shell: true` is used with `execFile` on Windows, Node.js wraps each
 * argument in double quotes. Inside double quotes cmd.exe still interprets:
 *   - `%VAR%` for environment variable expansion
 *   - `^` as the escape character itself
 *   - `&`, `|`, `<`, `>` as pipeline / redirection operators
 *
 * We neutralise these by:
 *   1. Replacing `%` with `%%` (disables env-var expansion inside quotes).
 *   2. Prefixing `^`, `&`, `|`, `<`, `>`, `!` with the cmd.exe escape char `^`.
 *      (`!` must be escaped to prevent delayed expansion of `!VAR!`.)
 *
 * Parentheses `(` `)` are NOT escaped here because inside double-quoted
 * strings they are literal characters and do not affect grouping.
 */
export function escapeCmdArg(arg: string): string {
  // Step 1: Escape % → %% to prevent %VAR% expansion
  let escaped = arg.replace(/%/g, "%%");

  // Step 2: Caret-escape cmd.exe metacharacters that are dangerous
  // even inside double quotes. The caret itself must be escaped first
  // so that carets we insert are not themselves re-escaped.
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

    execFile(
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
  });
}
