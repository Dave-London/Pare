import type { ProcessRunResult } from "../schemas/index.js";

/**
 * Parses the output of a process run into structured result data.
 */
export function parseRunOutput(
  command: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean,
  signal?: string,
): ProcessRunResult {
  return {
    command,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
    signal: signal || undefined,
  };
}
