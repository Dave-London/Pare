import type {
  ProcessRunResult,
  ProcessRunResultInternal,
  ReloadResult,
  ReloadResultInternal,
} from "../schemas/index.js";

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

/** Compact output budget: keep the first N lines and last N lines of each stream. */
export const COMPACT_HEAD_LINES = 40;
export const COMPACT_TAIL_LINES = 10;
/** Compact output budget: hard byte cap per stream (applied after line trimming). */
export const COMPACT_BYTE_CAP = 8192;

/**
 * Truncates a stream to the compact budget: first 40 lines + last 10 lines,
 * then a hard 8KB byte cap. Returns the (possibly truncated) text, whether
 * truncation occurred, and the total line count of the original text.
 */
function truncateForCompact(text: string): {
  text: string;
  truncated: boolean;
  totalLines: number;
} {
  const lines = text.split("\n");
  const totalLines = lines.length;
  let out = text;
  let truncated = false;

  if (totalLines > COMPACT_HEAD_LINES + COMPACT_TAIL_LINES) {
    const omitted = totalLines - COMPACT_HEAD_LINES - COMPACT_TAIL_LINES;
    out = [
      ...lines.slice(0, COMPACT_HEAD_LINES),
      `... (${omitted} lines omitted) ...`,
      ...lines.slice(totalLines - COMPACT_TAIL_LINES),
    ].join("\n");
    truncated = true;
  }

  if (out.length > COMPACT_BYTE_CAP) {
    out = out.slice(0, COMPACT_BYTE_CAP) + "\n... (truncated)";
    truncated = true;
  }

  return { text: out, truncated, totalLines };
}

/** Compact run: schema-compatible fields only. stdout/stderr kept, truncated to a small budget. */
export interface ProcessRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  stdout?: string;
  stderr?: string;
  stdoutTruncated?: boolean;
  stderrTruncated?: boolean;
  stdoutTotalLines?: number;
  stderrTotalLines?: number;
  truncated?: boolean;
  signal?: string;
}

export function compactRunMap(data: ProcessRunResultInternal): ProcessRunCompact {
  const compact: ProcessRunCompact = {
    exitCode: data.exitCode,
    success: data.success,
    timedOut: data.timedOut,
    truncated: data.truncated,
    signal: data.signal,
  };

  if (data.stdout) {
    const t = truncateForCompact(data.stdout);
    compact.stdout = t.text;
    if (t.truncated) {
      compact.stdoutTruncated = true;
      compact.stdoutTotalLines = t.totalLines;
    }
  }
  if (data.stderr) {
    const t = truncateForCompact(data.stderr);
    compact.stderr = t.text;
    if (t.truncated) {
      compact.stderrTruncated = true;
      compact.stderrTotalLines = t.totalLines;
    }
  }

  return compact;
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

  if (data.stdout) {
    parts.push(data.stdout);
    if (data.stdoutTruncated) {
      parts.push(
        `  [stdout truncated: ${data.stdoutTotalLines} total lines; re-run with compact:false for full output]`,
      );
    }
  }
  if (data.stderr) {
    parts.push(data.stderr);
    if (data.stderrTruncated) {
      parts.push(
        `  [stderr truncated: ${data.stderrTotalLines} total lines; re-run with compact:false for full output]`,
      );
    }
  }

  return parts.join("\n");
}

// ── Reload schema maps ──────────────────────────────────────────────

/** Strips Internal-only fields from reload result for structuredContent. */
export function schemaReloadMap(data: ReloadResultInternal): ReloadResult {
  return {
    rebuilt: data.rebuilt,
    notificationSent: data.notificationSent,
    error: data.error,
  };
}

// ── Reload formatters ───────────────────────────────────────────────

/** Formats structured reload results into a human-readable output summary. */
export function formatReload(data: ReloadResultInternal): string {
  const lines: string[] = [];

  if (data.rebuilt) {
    lines.push(`reload: rebuilt via "${data.buildCommand}" (${data.buildDuration}ms).`);
  } else {
    lines.push(`reload: build failed via "${data.buildCommand}" (${data.buildDuration}ms).`);
  }

  if (data.notificationSent) {
    lines.push("  notifications/tools/list_changed sent.");
  }

  if (data.error) {
    lines.push(`  error: ${data.error}`);
  }

  if (data.buildOutput) {
    lines.push(data.buildOutput);
  }

  return lines.join("\n");
}
