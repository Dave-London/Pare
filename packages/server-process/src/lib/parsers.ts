import type { ProcessRunResultInternal } from "../schemas/index.js";

/**
 * Truncates a string to a maximum number of lines.
 * Returns the truncated string and the number of lines dropped.
 */
function truncateLines(text: string, maxLines: number): { text: string; dropped: number } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) {
    return { text, dropped: 0 };
  }
  const dropped = lines.length - maxLines;
  return { text: lines.slice(0, maxLines).join("\n"), dropped };
}

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
  maxOutputLines?: number,
  truncated?: boolean,
  userCpuTimeMicros?: number,
  systemCpuTimeMicros?: number,
): ProcessRunResultInternal {
  let finalStdout = stdout.trimEnd() || undefined;
  let finalStderr = stderr.trimEnd() || undefined;
  let stdoutTruncatedLines: number | undefined;
  let stderrTruncatedLines: number | undefined;

  if (maxOutputLines != null && maxOutputLines > 0) {
    if (finalStdout) {
      const result = truncateLines(finalStdout, maxOutputLines);
      finalStdout = result.text || undefined;
      stdoutTruncatedLines = result.dropped > 0 ? result.dropped : undefined;
    }
    if (finalStderr) {
      const result = truncateLines(finalStderr, maxOutputLines);
      finalStderr = result.text || undefined;
      stderrTruncatedLines = result.dropped > 0 ? result.dropped : undefined;
    }
  }

  return {
    command,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: finalStdout,
    stderr: finalStderr,
    duration,
    userCpuTimeMs: userCpuTimeMicros !== undefined ? userCpuTimeMicros / 1000 : undefined,
    systemCpuTimeMs: systemCpuTimeMicros !== undefined ? systemCpuTimeMicros / 1000 : undefined,
    timedOut,
    truncated: truncated || undefined,
    signal: signal || undefined,
    stdoutTruncatedLines,
    stderrTruncatedLines,
  };
}
