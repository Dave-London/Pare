import type { ProcessRunResult, ProcessRunResultInternal } from "../schemas/index.js";

// ── Schema maps (strip Internal-only fields for structuredContent) ──

/** Strips Internal-only fields from process run result for structuredContent. */
export function schemaRunMap(data: ProcessRunResultInternal): ProcessRunResult {
  return {
    exitCode: data.exitCode,
    success: data.success,
    stdout: data.stdout,
    stderr: data.stderr,
    timedOut: data.timedOut,
    truncated: data.truncated,
    signal: data.signal,
  };
}

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: ProcessRunResultInternal): string {
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
  if (data.userCpuTimeMs !== undefined || data.systemCpuTimeMs !== undefined) {
    const user = data.userCpuTimeMs !== undefined ? `${data.userCpuTimeMs.toFixed(2)}ms` : "n/a";
    const system =
      data.systemCpuTimeMs !== undefined ? `${data.systemCpuTimeMs.toFixed(2)}ms` : "n/a";
    lines.push(`  cpu: user=${user}, system=${system}`);
  }
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

/** Compact run: schema-compatible fields only. Drop stdout/stderr and Internal fields. */
export interface ProcessRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  truncated?: boolean;
  signal?: string;
}

export function compactRunMap(data: ProcessRunResultInternal): ProcessRunCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
    timedOut: data.timedOut,
    truncated: data.truncated,
    signal: data.signal,
  };
}

export function formatRunCompact(data: ProcessRunCompact): string {
  const parts: string[] = [];

  if (data.timedOut) {
    parts.push(`process: timed out${data.signal ? ` (${data.signal})` : ""}.`);
  } else if (data.success) {
    parts.push(`process: success.`);
  } else {
    parts.push(`process: exit code ${data.exitCode}.`);
  }

  if (data.truncated) {
    parts.push("  [output truncated: maxBuffer exceeded]");
  }

  return parts.join("\n");
}
