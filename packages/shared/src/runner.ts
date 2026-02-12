import { execFile } from "node:child_process";
import { stripAnsi } from "./ansi.js";

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
    // On Windows with shell mode, escape % to prevent env variable expansion.
    // Node.js wraps args in double quotes which prevents most cmd.exe metacharacters,
    // but %VAR% expansion still works inside double quotes.
    const safeArgs = process.platform === "win32" ? args.map((a) => a.replace(/%/g, "%%")) : args;

    execFile(
      cmd,
      safeArgs,
      {
        cwd: opts?.cwd,
        timeout: opts?.timeout ?? 30_000,
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
          stderr: stripAnsi(stderr),
        });
      },
    );
  });
}
