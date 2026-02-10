import { execFile } from "node:child_process";
import { stripAnsi } from "./ansi.js";

export interface RunOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Executes a command and returns cleaned output with ANSI codes stripped.
 * Uses execFile (not exec) to avoid shell injection.
 */
export function run(cmd: string, args: string[], opts?: RunOptions): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        cwd: opts?.cwd,
        timeout: opts?.timeout ?? 30_000,
        env: opts?.env ? { ...process.env, ...opts.env } : undefined,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error && "code" in error ? (error.code as number) : error ? 1 : 0,
          stdout: stripAnsi(stdout),
          stderr: stripAnsi(stderr),
        });
      },
    );
  });
}
