import type {
  TscResult,
  BuildResult,
  EsbuildResult,
  ViteBuildResult,
  WebpackResult,
  TurboResult,
  NxResult,
} from "../schemas/index.js";

/** Formats structured TypeScript compiler results into a human-readable diagnostic summary. */
export function formatTsc(data: TscResult): string {
  if (data.success && data.total === 0) return "TypeScript: no errors found.";

  const lines = [`TypeScript: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics ?? []) {
    const col = d.column !== undefined ? `:${d.column}` : "";
    const code = d.code !== undefined ? ` TS${d.code}` : "";
    const msg = d.message ? `: ${d.message}` : "";
    lines.push(`  ${d.file}:${d.line}${col} ${d.severity}${code}${msg}`);
  }
  return lines.join("\n");
}

/** Formats structured build command results into a human-readable success/failure summary. */
export function formatBuildCommand(data: BuildResult): string {
  if (data.success) {
    const parts = [`Build succeeded in ${data.duration}s`];
    if ((data.warnings ?? []).length) parts.push(`${(data.warnings ?? []).length} warnings`);
    return parts.join(", ");
  }

  const lines = [`Build failed (${data.duration}s)`];
  for (const err of data.errors ?? []) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// esbuild
// ---------------------------------------------------------------------------

/** Formats structured esbuild results into a human-readable summary. */
export function formatEsbuild(data: EsbuildResult): string {
  const errors = data.errors ?? [];
  const warnings = data.warnings ?? [];

  if (data.success && errors.length === 0 && warnings.length === 0) {
    const parts = [`esbuild: build succeeded in ${data.duration}s`];
    if (data.outputFiles && data.outputFiles.length > 0) {
      parts.push(`${data.outputFiles.length} output files`);
    }
    return parts.join(", ");
  }

  const lines: string[] = [];
  if (data.success) {
    lines.push(`esbuild: build succeeded in ${data.duration}s with ${warnings.length} warnings`);
  } else {
    lines.push(
      `esbuild: build failed (${data.duration}s) — ${errors.length} errors, ${warnings.length} warnings`,
    );
  }

  for (const err of errors) {
    const loc = err.file
      ? `${err.file}${err.line ? `:${err.line}` : ""}${err.column ? `:${err.column}` : ""}`
      : "";
    lines.push(`  ERROR${loc ? ` ${loc}` : ""}: ${err.message}`);
  }
  for (const warn of warnings) {
    const loc = warn.file ? `${warn.file}${warn.line ? `:${warn.line}` : ""}` : "";
    lines.push(`  WARN${loc ? ` ${loc}` : ""}: ${warn.message}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// vite-build
// ---------------------------------------------------------------------------

/** Formats structured Vite build results into a human-readable summary. */
export function formatViteBuild(data: ViteBuildResult): string {
  const outputs = data.outputs ?? [];
  const warnings = data.warnings ?? [];
  const errors = data.errors ?? [];

  if (data.success) {
    const lines = [`Vite build succeeded in ${data.duration}s`];
    if (outputs.length > 0) {
      lines.push(`  ${outputs.length} output files:`);
      for (const out of outputs) {
        lines.push(`    ${out.file}  ${out.size}`);
      }
    }
    if (warnings.length > 0) {
      lines.push(`  ${warnings.length} warnings`);
    }
    return lines.join("\n");
  }

  const lines = [`Vite build failed (${data.duration}s)`];
  for (const err of errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// webpack
// ---------------------------------------------------------------------------

/** Formats structured webpack build results into a human-readable summary. */
export function formatWebpack(data: WebpackResult): string {
  const assets = data.assets ?? [];
  const warnings = data.warnings ?? [];
  const errors = data.errors ?? [];

  if (data.success) {
    const parts = [`webpack: build succeeded in ${data.duration}s`];
    if (assets.length > 0) parts.push(`${assets.length} assets`);
    if (data.modules !== undefined) parts.push(`${data.modules} modules`);
    if (warnings.length > 0) parts.push(`${warnings.length} warnings`);

    const lines = [parts.join(", ")];
    for (const asset of assets) {
      const sizeKB = (asset.size / 1024).toFixed(1);
      lines.push(`  ${asset.name}  ${sizeKB} kB`);
    }
    return lines.join("\n");
  }

  const lines = [`webpack: build failed (${data.duration}s)`];
  for (const err of errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

// ---------------------------------------------------------------------------
// tsc compact
// ---------------------------------------------------------------------------

/** Compact tsc: success, error/warning counts, and first few file:line locations only. */
export interface TscCompact {
  [key: string]: unknown;
  success: boolean;
  errors: number;
  warnings: number;
  diagnostics: Array<{ file: string; line: number; severity: string }>;
}

const TSC_COMPACT_DIAG_LIMIT = 10;

export function compactTscMap(data: TscResult): TscCompact {
  return {
    success: data.success,
    errors: data.errors,
    warnings: data.warnings,
    diagnostics: (data.diagnostics ?? []).slice(0, TSC_COMPACT_DIAG_LIMIT).map((d) => ({
      file: d.file,
      line: d.line,
      severity: d.severity,
    })),
  };
}

export function formatTscCompact(data: TscCompact): string {
  if (data.errors === 0 && data.warnings === 0) return "TypeScript: no errors found.";

  const lines = [`TypeScript: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line} ${d.severity}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// esbuild compact
// ---------------------------------------------------------------------------

/** Compact esbuild: success and duration only. Schema-compatible (all arrays omitted). */
export interface EsbuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
}

export function compactEsbuildMap(data: EsbuildResult): EsbuildCompact {
  return {
    success: data.success,
    duration: data.duration,
  };
}

export function formatEsbuildCompact(data: EsbuildCompact): string {
  if (data.success) {
    return `esbuild: build succeeded in ${data.duration}s`;
  }
  return `esbuild: build failed (${data.duration}s)`;
}

// ---------------------------------------------------------------------------
// vite-build compact
// ---------------------------------------------------------------------------

/** Compact vite-build: success and duration only. Schema-compatible (all arrays omitted). */
export interface ViteBuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
}

export function compactViteBuildMap(data: ViteBuildResult): ViteBuildCompact {
  return {
    success: data.success,
    duration: data.duration,
  };
}

export function formatViteBuildCompact(data: ViteBuildCompact): string {
  if (data.success) {
    return `Vite build succeeded in ${data.duration}s`;
  }
  return `Vite build failed (${data.duration}s)`;
}

// ---------------------------------------------------------------------------
// webpack compact
// ---------------------------------------------------------------------------

/** Compact webpack: success, duration, and optional modules count. Schema-compatible (arrays omitted). */
export interface WebpackCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  modules?: number;
}

export function compactWebpackMap(data: WebpackResult): WebpackCompact {
  const compact: WebpackCompact = {
    success: data.success,
    duration: data.duration,
  };
  if (data.modules !== undefined) compact.modules = data.modules;
  return compact;
}

export function formatWebpackCompact(data: WebpackCompact): string {
  if (data.success) {
    const parts = [`webpack: build succeeded in ${data.duration}s`];
    if (data.modules !== undefined) parts.push(`${data.modules} modules`);
    return parts.join(", ");
  }
  return `webpack: build failed (${data.duration}s)`;
}

// ---------------------------------------------------------------------------
// build (generic) compact
// ---------------------------------------------------------------------------

/** Compact build: success and duration only. Schema-compatible (arrays omitted). */
export interface BuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
}

export function compactBuildMap(data: BuildResult): BuildCompact {
  return {
    success: data.success,
    duration: data.duration,
  };
}

export function formatBuildCompact(data: BuildCompact): string {
  if (data.success) {
    return `Build succeeded in ${data.duration}s`;
  }
  return `Build failed (${data.duration}s)`;
}

// ---------------------------------------------------------------------------
// turbo
// ---------------------------------------------------------------------------

/** Formats structured Turbo run results into a human-readable summary. */
export function formatTurbo(data: TurboResult): string {
  const tasks = data.tasks ?? [];

  if (data.success) {
    const parts = [`turbo: ${data.totalTasks} tasks completed in ${data.duration}s`];
    if (data.cached > 0) parts.push(`${data.cached} cached`);
    if (data.failed > 0) parts.push(`${data.failed} failed`);

    const lines = [parts.join(", ")];
    for (const t of tasks) {
      const cachePart = t.cache ? ` [${t.cache}]` : "";
      const durationPart = t.duration ? ` (${t.duration})` : "";
      lines.push(`  ${t.package}#${t.task}: ${t.status}${cachePart}${durationPart}`);
    }
    return lines.join("\n");
  }

  const lines = [
    `turbo: failed (${data.duration}s) — ${data.passed} passed, ${data.failed} failed`,
  ];
  for (const t of tasks) {
    const cachePart = t.cache ? ` [${t.cache}]` : "";
    const durationPart = t.duration ? ` (${t.duration})` : "";
    lines.push(`  ${t.package}#${t.task}: ${t.status}${cachePart}${durationPart}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// nx
// ---------------------------------------------------------------------------

/** Formats structured Nx results into a human-readable summary. */
export function formatNx(data: NxResult): string {
  const tasks = data.tasks ?? [];
  const summary = `nx: ${data.passed} passed, ${data.failed} failed, ${data.cached} cached (${data.duration}s)`;

  if (tasks.length === 0) return summary;

  const lines = [summary];
  for (const task of tasks) {
    const icon = task.status === "success" ? "✔" : "✖";
    const cacheTag = task.cache ? " [cache]" : "";
    const dur = task.duration !== undefined ? ` (${task.duration}s)` : "";
    lines.push(`  ${icon} ${task.project}:${task.target}${cacheTag}${dur}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// turbo compact
// ---------------------------------------------------------------------------

/** Compact turbo: success, duration, and summary counts only. Schema-compatible (tasks array omitted). */
export interface TurboCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  totalTasks: number;
  passed: number;
  failed: number;
  cached: number;
}

export function compactTurboMap(data: TurboResult): TurboCompact {
  return {
    success: data.success,
    duration: data.duration,
    totalTasks: data.totalTasks,
    passed: data.passed,
    failed: data.failed,
    cached: data.cached,
  };
}

export function formatTurboCompact(data: TurboCompact): string {
  if (data.success) {
    const parts = [`turbo: ${data.totalTasks} tasks completed in ${data.duration}s`];
    if (data.cached > 0) parts.push(`${data.cached} cached`);
    return parts.join(", ");
  }
  return `turbo: failed (${data.duration}s) — ${data.passed} passed, ${data.failed} failed`;
}

// ---------------------------------------------------------------------------
// nx compact
// ---------------------------------------------------------------------------

/** Compact nx: success, summary counts only. Schema-compatible (tasks array omitted). */
export interface NxCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  cached: number;
}

export function compactNxMap(data: NxResult): NxCompact {
  return {
    success: data.success,
    duration: data.duration,
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    cached: data.cached,
  };
}

export function formatNxCompact(data: NxCompact): string {
  if (data.success) {
    return `nx: ${data.passed} passed, ${data.failed} failed, ${data.cached} cached (${data.duration}s)`;
  }
  return `nx: failed — ${data.passed} passed, ${data.failed} failed, ${data.cached} cached (${data.duration}s)`;
}
