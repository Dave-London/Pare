import type {
  TscResult,
  BuildResult,
  EsbuildResult,
  EsbuildError,
  EsbuildWarning,
  ViteBuildResult,
  WebpackResult,
  TurboResult,
  NxResult,
  LernaResult,
  RollupResult,
} from "../schemas/index.js";

/** Formats structured TypeScript compiler results into a human-readable diagnostic summary. */
export function formatTsc(data: TscResult): string {
  if (data.success && data.total === 0) {
    if (data.emittedFiles && data.emittedFiles.length > 0) {
      return `TypeScript: no errors found. Emitted ${data.emittedFiles.length} files.`;
    }
    return "TypeScript: no errors found.";
  }

  const fileSummary = data.totalFiles !== undefined ? ` in ${data.totalFiles} files` : "";
  const lines = [`TypeScript: ${data.errors} errors, ${data.warnings} warnings${fileSummary}`];
  for (const d of data.diagnostics ?? []) {
    const col = d.column !== undefined ? `:${d.column}` : "";
    const code = d.code !== undefined ? ` TS${d.code}` : "";
    const msg = d.message ? `: ${d.message}` : "";
    lines.push(`  ${d.file}:${d.line}${col} ${d.severity}${code}${msg}`);
  }
  if (data.emittedFiles && data.emittedFiles.length > 0) {
    lines.push(`Emitted files (${data.emittedFiles.length}):`);
    for (const file of data.emittedFiles) {
      lines.push(`  ${file}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured build command results into a human-readable success/failure summary. */
export function formatBuildCommand(data: BuildResult): string {
  const exitInfo = data.exitCode !== undefined ? ` (exit ${data.exitCode})` : "";

  if (data.success) {
    const parts = [`Build succeeded in ${data.duration}s${exitInfo}`];
    if ((data.warnings ?? []).length) parts.push(`${(data.warnings ?? []).length} warnings`);
    if (data.outputLines !== undefined) parts.push(`${data.outputLines} output lines`);
    return parts.join(", ");
  }

  const lines = [`Build failed (${data.duration}s)${exitInfo}`];
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
    if (data.metafile) {
      const inputCount = Object.keys(data.metafile.inputs).length;
      const outputCount = Object.keys(data.metafile.outputs).length;
      parts.push(`${inputCount} inputs, ${outputCount} outputs`);
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
        const bytesInfo = out.sizeBytes !== undefined ? ` (${out.sizeBytes} bytes)` : "";
        const gzipInfo =
          out.gzipSize !== undefined
            ? ` | gzip ${out.gzipSize}${out.gzipBytes !== undefined ? ` (${out.gzipBytes} bytes)` : ""}`
            : "";
        lines.push(`    ${out.file}  ${out.size}${bytesInfo}${gzipInfo}`);
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
    if ((data.chunks ?? []).length > 0) parts.push(`${(data.chunks ?? []).length} chunks`);
    if (data.modules !== undefined) parts.push(`${data.modules} modules`);
    if (warnings.length > 0) parts.push(`${warnings.length} warnings`);

    const lines = [parts.join(", ")];
    for (const asset of assets) {
      const sizeKB = (asset.size / 1024).toFixed(1);
      lines.push(`  ${asset.name}  ${sizeKB} kB`);
    }
    for (const chunk of data.chunks ?? []) {
      const name = chunk.names?.[0] ?? String(chunk.id ?? "unknown");
      const files = chunk.files?.join(", ") ?? "no-files";
      const entry = chunk.entry ? " entry" : "";
      lines.push(`  chunk ${name}${entry}: ${files}`);
    }
    if (data.profile) {
      lines.push(`  Profile: ${data.profile.modules.length} modules with timing data`);
      // Show top 5 slowest modules
      const sorted = [...data.profile.modules].sort((a, b) => b.time - a.time).slice(0, 5);
      for (const mod of sorted) {
        lines.push(`    ${mod.name}  ${mod.time}ms`);
      }
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

/** Compact esbuild: success and duration. Error/warning arrays included when non-empty. */
export interface EsbuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  errors?: EsbuildError[];
  warnings?: EsbuildWarning[];
}

export function compactEsbuildMap(data: EsbuildResult): EsbuildCompact {
  const compact: EsbuildCompact = {
    success: data.success,
    duration: data.duration,
  };
  if (data.errors?.length) compact.errors = data.errors;
  if (data.warnings?.length) compact.warnings = data.warnings;
  return compact;
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

/** Compact vite-build: success and duration. Error/warning arrays included when non-empty. */
export interface ViteBuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  errors?: string[];
  warnings?: string[];
}

export function compactViteBuildMap(data: ViteBuildResult): ViteBuildCompact {
  const compact: ViteBuildCompact = {
    success: data.success,
    duration: data.duration,
  };
  if (data.errors?.length) compact.errors = data.errors;
  if (data.warnings?.length) compact.warnings = data.warnings;
  return compact;
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

/** Compact webpack: success, duration, optional modules count. Error/warning arrays included when non-empty. */
export interface WebpackCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  modules?: number;
  errors?: string[];
  warnings?: string[];
}

export function compactWebpackMap(data: WebpackResult): WebpackCompact {
  const compact: WebpackCompact = {
    success: data.success,
    duration: data.duration,
  };
  if (data.modules !== undefined) compact.modules = data.modules;
  if (data.errors?.length) compact.errors = data.errors;
  if (data.warnings?.length) compact.warnings = data.warnings;
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

/** Compact build: success and duration only. Error/warning arrays included when non-empty. */
export interface BuildCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  exitCode?: number;
  errors?: string[];
  warnings?: string[];
}

export function compactBuildMap(data: BuildResult): BuildCompact {
  const compact: BuildCompact = {
    success: data.success,
    duration: data.duration,
  };
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  if (data.errors?.length) compact.errors = data.errors;
  if (data.warnings?.length) compact.warnings = data.warnings;
  return compact;
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
      const msPart = t.durationMs !== undefined ? ` [${t.durationMs}ms]` : "";
      lines.push(`  ${t.package}#${t.task}: ${t.status}${cachePart}${durationPart}${msPart}`);
    }
    if (data.summary) {
      lines.push(`  summary: ${Object.keys(data.summary).length} field(s)`);
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
  if (data.summary) {
    lines.push(`  summary: ${Object.keys(data.summary).length} field(s)`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// nx
// ---------------------------------------------------------------------------

/** Formats structured Nx results into a human-readable summary. */
export function formatNx(data: NxResult): string {
  const tasks = data.tasks ?? [];
  const skipped = tasks.filter((t) => t.status === "skipped").length;
  const summary = `nx: ${data.passed} passed, ${data.failed} failed, ${skipped} skipped, ${data.cached} cached (${data.duration}s)`;

  if (tasks.length === 0) return summary;

  const lines = [summary];
  if (data.affectedProjects && data.affectedProjects.length > 0) {
    lines.push(`  affected projects: ${data.affectedProjects.join(", ")}`);
  }
  for (const task of tasks) {
    const icon = task.status === "success" ? "✔" : task.status === "skipped" ? "↷" : "✖";
    const cacheTag = task.cache ? ` [${task.cache}]` : "";
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

// ---------------------------------------------------------------------------
// lerna
// ---------------------------------------------------------------------------

/** Formats structured Lerna results into a human-readable summary. */
export function formatLerna(data: LernaResult): string {
  const packages = data.packages ?? [];
  const errors = data.errors ?? [];

  if (data.success) {
    const lines = [`lerna ${data.action}: succeeded in ${data.duration}s`];
    if (packages.length > 0) {
      lines.push(`  ${packages.length} packages:`);
      for (const pkg of packages) {
        const priv = pkg.private ? " (private)" : "";
        const loc = pkg.location ? ` @ ${pkg.location}` : "";
        lines.push(`    ${pkg.name}@${pkg.version}${priv}${loc}`);
      }
    }
    if (data.output) {
      const outputLines = data.output.split("\n").filter(Boolean);
      if (outputLines.length > 0) {
        lines.push(`  output: ${outputLines.length} lines`);
      }
    }
    return lines.join("\n");
  }

  const lines = [`lerna ${data.action}: failed (${data.duration}s)`];
  for (const err of errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// lerna compact
// ---------------------------------------------------------------------------

/** Compact lerna: success, action, duration, and package count only. */
export interface LernaCompact {
  [key: string]: unknown;
  success: boolean;
  action: string;
  duration: number;
  packageCount: number;
  errors?: string[];
}

export function compactLernaMap(data: LernaResult): LernaCompact {
  const compact: LernaCompact = {
    success: data.success,
    action: data.action,
    duration: data.duration,
    packageCount: (data.packages ?? []).length,
  };
  if (data.errors?.length) compact.errors = data.errors;
  return compact;
}

export function formatLernaCompact(data: LernaCompact): string {
  if (data.success) {
    const parts = [`lerna ${data.action}: succeeded in ${data.duration}s`];
    if (data.packageCount > 0) parts.push(`${data.packageCount} packages`);
    return parts.join(", ");
  }
  return `lerna ${data.action}: failed (${data.duration}s)`;
}

// ---------------------------------------------------------------------------
// rollup
// ---------------------------------------------------------------------------

/** Formats structured Rollup results into a human-readable summary. */
export function formatRollup(data: RollupResult): string {
  const bundles = data.bundles ?? [];
  const errors = data.errors ?? [];
  const warnings = data.warnings ?? [];

  if (data.success) {
    const parts = [`rollup: build succeeded in ${data.duration}s`];
    if (bundles.length > 0) parts.push(`${bundles.length} bundles`);
    if (warnings.length > 0) parts.push(`${warnings.length} warnings`);

    const lines = [parts.join(", ")];
    for (const bundle of bundles) {
      const fmt = bundle.format ? ` [${bundle.format}]` : "";
      const size = bundle.size !== undefined ? ` (${bundle.size} bytes)` : "";
      lines.push(`  ${bundle.input} → ${bundle.output}${fmt}${size}`);
    }
    for (const warn of warnings) {
      lines.push(`  WARN: ${warn}`);
    }
    return lines.join("\n");
  }

  const lines = [
    `rollup: build failed (${data.duration}s) — ${errors.length} errors, ${warnings.length} warnings`,
  ];
  for (const err of errors) {
    const loc = err.file
      ? `${err.file}${err.line ? `:${err.line}` : ""}${err.column ? `:${err.column}` : ""}`
      : "";
    lines.push(`  ERROR${loc ? ` ${loc}` : ""}: ${err.message}`);
  }
  for (const warn of warnings) {
    lines.push(`  WARN: ${warn}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// rollup compact
// ---------------------------------------------------------------------------

/** Compact rollup: success and duration. Error/warning arrays included when non-empty. */
export interface RollupCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
  bundleCount: number;
  errors?: Array<{ file?: string; line?: number; message: string }>;
  warnings?: string[];
}

export function compactRollupMap(data: RollupResult): RollupCompact {
  const compact: RollupCompact = {
    success: data.success,
    duration: data.duration,
    bundleCount: (data.bundles ?? []).length,
  };
  if (data.errors?.length) compact.errors = data.errors;
  if (data.warnings?.length) compact.warnings = data.warnings;
  return compact;
}

export function formatRollupCompact(data: RollupCompact): string {
  if (data.success) {
    const parts = [`rollup: build succeeded in ${data.duration}s`];
    if (data.bundleCount > 0) parts.push(`${data.bundleCount} bundles`);
    return parts.join(", ");
  }
  return `rollup: build failed (${data.duration}s)`;
}
