import type {
  DenoTestResult,
  DenoLintResult,
  DenoFmtResult,
  DenoCheckResult,
  DenoTaskResult,
  DenoRunResult,
  DenoInfoResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured test results into a human-readable summary. */
export function formatTest(data: DenoTestResult): string {
  const lines: string[] = [];
  const status = data.success ? "ok" : "FAILED";
  lines.push(
    `deno test: ${status} | ${data.passed} passed | ${data.failed} failed | ${data.ignored} ignored (${data.duration}ms)`,
  );
  if (data.filtered > 0) lines.push(`  ${data.filtered} filtered out`);
  if (data.measured > 0) lines.push(`  ${data.measured} measured`);
  for (const t of data.tests ?? []) {
    const dur = t.duration !== undefined ? ` (${t.duration}ms)` : "";
    lines.push(`  ${t.name} ... ${t.status}${dur}`);
    if (t.error) {
      for (const errLine of t.error.split("\n").slice(0, 5)) {
        lines.push(`    ${errLine}`);
      }
    }
  }
  return lines.join("\n");
}

/** Formats structured lint results into a human-readable diagnostic listing. */
export function formatLint(data: DenoLintResult): string {
  if (data.total === 0) return "deno lint: no issues found.";

  const lines = [`deno lint: ${data.errors} errors`];
  for (const d of data.diagnostics ?? []) {
    const loc = d.column ? `${d.file}:${d.line}:${d.column}` : `${d.file}:${d.line}`;
    const code = d.code ? `(${d.code}) ` : "";
    lines.push(`  ${loc} ${code}${d.message}`);
    if (d.hint) lines.push(`    hint: ${d.hint}`);
  }
  return lines.join("\n");
}

/** Formats structured fmt results into a human-readable summary. */
export function formatFmt(data: DenoFmtResult): string {
  if (data.mode === "check") {
    if (data.success) return "deno fmt: all files formatted.";
    const lines = [`deno fmt: ${data.total} files need formatting`];
    for (const f of data.files ?? []) {
      lines.push(`  ${f}`);
    }
    return lines.join("\n");
  }
  // write mode
  if (data.total === 0) return "deno fmt: no files changed.";
  const lines = [`deno fmt: formatted ${data.total} files`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured check results into a human-readable error listing. */
export function formatCheck(data: DenoCheckResult): string {
  if (data.success) return "deno check: no type errors.";

  const lines = [`deno check: ${data.total} type errors`];
  for (const e of data.errors ?? []) {
    const loc = e.column ? `${e.file}:${e.line}:${e.column}` : `${e.file}:${e.line}`;
    const code = e.code ? `${e.code}: ` : "";
    lines.push(`  ${loc} ${code}${e.message}`);
  }
  return lines.join("\n");
}

/** Formats structured task results into a human-readable output summary. */
export function formatTask(data: DenoTaskResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `deno task ${data.task}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`deno task ${data.task}: success (${data.duration}ms).`);
  } else {
    lines.push(`deno task ${data.task}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: DenoRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `deno run ${data.file}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`deno run ${data.file}: success (${data.duration}ms).`);
  } else {
    lines.push(`deno run ${data.file}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured info results into a human-readable dependency listing. */
export function formatInfo(data: DenoInfoResult): string {
  if (!data.success) return "deno info: failed to retrieve module info.";

  const lines: string[] = [];
  if (data.module) lines.push(`deno info: ${data.module}`);
  if (data.type) lines.push(`  type: ${data.type}`);
  if (data.local) lines.push(`  local: ${data.local}`);
  lines.push(`  dependencies: ${data.totalDependencies}`);
  if (data.totalSize) lines.push(`  total size: ${formatBytes(data.totalSize)}`);
  for (const d of data.dependencies ?? []) {
    const size = d.size ? ` (${formatBytes(d.size)})` : "";
    const type = d.type ? ` [${d.type}]` : "";
    lines.push(`    ${d.specifier}${type}${size}`);
  }
  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact test: summary counts only, no per-test details. */
export interface DenoTestCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  ignored: number;
  duration: number;
}

export function compactTestMap(data: DenoTestResult): DenoTestCompact {
  return {
    success: data.success,
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    ignored: data.ignored,
    duration: data.duration,
  };
}

export function formatTestCompact(data: DenoTestCompact): string {
  const status = data.success ? "ok" : "FAILED";
  return `deno test: ${status} | ${data.passed} passed | ${data.failed} failed | ${data.ignored} ignored (${data.duration}ms)`;
}

/** Compact lint: total count only, no diagnostics. */
export interface DenoLintCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  errors: number;
}

export function compactLintMap(data: DenoLintResult): DenoLintCompact {
  return {
    success: data.success,
    total: data.total,
    errors: data.errors,
  };
}

export function formatLintCompact(data: DenoLintCompact): string {
  if (data.total === 0) return "deno lint: no issues found.";
  return `deno lint: ${data.errors} errors`;
}

/** Compact fmt: success and total only. */
export interface DenoFmtCompact {
  [key: string]: unknown;
  success: boolean;
  mode: "check" | "write";
  total: number;
}

export function compactFmtMap(data: DenoFmtResult): DenoFmtCompact {
  return {
    success: data.success,
    mode: data.mode,
    total: data.total,
  };
}

export function formatFmtCompact(data: DenoFmtCompact): string {
  if (data.mode === "check") {
    if (data.success) return "deno fmt: all files formatted.";
    return `deno fmt: ${data.total} files need formatting`;
  }
  if (data.total === 0) return "deno fmt: no files changed.";
  return `deno fmt: formatted ${data.total} files`;
}

/** Compact check: success and total only. */
export interface DenoCheckCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactCheckMap(data: DenoCheckResult): DenoCheckCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatCheckCompact(data: DenoCheckCompact): string {
  if (data.success) return "deno check: no type errors.";
  return `deno check: ${data.total} type errors`;
}

/** Compact task: success, exitCode, duration. Drop stdout/stderr. */
export interface DenoTaskCompact {
  [key: string]: unknown;
  task: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactTaskMap(data: DenoTaskResult): DenoTaskCompact {
  return {
    task: data.task,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatTaskCompact(data: DenoTaskCompact): string {
  if (data.timedOut) {
    return `deno task ${data.task}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `deno task ${data.task}: success (${data.duration}ms).`;
  return `deno task ${data.task}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact run: success, exitCode, duration. Drop stdout/stderr. */
export interface DenoRunCompact {
  [key: string]: unknown;
  file: string;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export function compactRunMap(data: DenoRunResult): DenoRunCompact {
  return {
    file: data.file,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: DenoRunCompact): string {
  if (data.timedOut) {
    return `deno run ${data.file}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `deno run ${data.file}: success (${data.duration}ms).`;
  return `deno run ${data.file}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact info: module and total dependencies. */
export interface DenoInfoCompact {
  [key: string]: unknown;
  success: boolean;
  module: string | undefined;
  totalDependencies: number;
}

export function compactInfoMap(data: DenoInfoResult): DenoInfoCompact {
  return {
    success: data.success,
    module: data.module,
    totalDependencies: data.totalDependencies,
  };
}

export function formatInfoCompact(data: DenoInfoCompact): string {
  if (!data.success) return "deno info: failed.";
  return `deno info: ${data.module ?? "unknown"} — ${data.totalDependencies} dependencies`;
}
