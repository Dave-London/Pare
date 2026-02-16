import type { ProcessRunResult } from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: ProcessRunResult): string {
  const lines: string[] = [];

  if (data.timedOut) {
    lines.push(
      `${data.command}: timed out after ${data.duration}ms${data.signal ? ` (${data.signal})` : ""}.`,
    );
  } else if (data.success) {
    lines.push(`${data.command}: success (${data.duration}ms).`);
  } else {
    lines.push(`${data.command}: exit code ${data.exitCode} (${data.duration}ms).`);
  }

  if (data.truncated) {
    lines.push("  [output truncated: maxBuffer exceeded]");
  }

  if (data.stdout) lines.push(data.stdout);
  if (data.stdoutTruncatedLines) {
    lines.push(`  ... ${data.stdoutTruncatedLines} stdout lines truncated`);
  }
  if (data.stderr) lines.push(data.stderr);
  if (data.stderrTruncatedLines) {
    lines.push(`  ... ${data.stderrTruncatedLines} stderr lines truncated`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact run: command, exitCode, success, duration, timedOut, signal, truncated. Drop stdout/stderr. */
export interface ProcessRunCompact {
  [key: string]: unknown;
  command: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
  truncated?: boolean;
  signal?: string;
  stdoutTruncatedLines?: number;
  stderrTruncatedLines?: number;
}

export function compactRunMap(data: ProcessRunResult): ProcessRunCompact {
  return {
    command: data.command,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
    truncated: data.truncated,
    signal: data.signal,
    stdoutTruncatedLines: data.stdoutTruncatedLines,
    stderrTruncatedLines: data.stderrTruncatedLines,
  };
}

export function formatRunCompact(data: ProcessRunCompact): string {
  const parts: string[] = [];

  if (data.timedOut) {
    parts.push(
      `${data.command}: timed out after ${data.duration}ms${data.signal ? ` (${data.signal})` : ""}.`,
    );
  } else if (data.success) {
    parts.push(`${data.command}: success (${data.duration}ms).`);
  } else {
    parts.push(`${data.command}: exit code ${data.exitCode} (${data.duration}ms).`);
  }

  if (data.truncated) {
    parts.push("  [output truncated: maxBuffer exceeded]");
  }

  return parts.join("\n");
}
