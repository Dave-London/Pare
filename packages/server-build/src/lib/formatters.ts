import type {
  TscResult,
  BuildResult,
  EsbuildResult,
  ViteBuildResult,
  WebpackResult,
} from "../schemas/index.js";

/** Formats structured TypeScript compiler results into a human-readable diagnostic summary. */
export function formatTsc(data: TscResult): string {
  if (data.success && data.total === 0) return "TypeScript: no errors found.";

  const lines = [`TypeScript: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity} TS${d.code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured build command results into a human-readable success/failure summary. */
export function formatBuildCommand(data: BuildResult): string {
  if (data.success) {
    const parts = [`Build succeeded in ${data.duration}s`];
    if (data.warnings.length) parts.push(`${data.warnings.length} warnings`);
    return parts.join(", ");
  }

  const lines = [`Build failed (${data.duration}s)`];
  for (const err of data.errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// esbuild
// ---------------------------------------------------------------------------

/** Formats structured esbuild results into a human-readable summary. */
export function formatEsbuild(data: EsbuildResult): string {
  if (data.success && data.errors.length === 0 && data.warnings.length === 0) {
    const parts = [`esbuild: build succeeded in ${data.duration}s`];
    if (data.outputFiles && data.outputFiles.length > 0) {
      parts.push(`${data.outputFiles.length} output files`);
    }
    return parts.join(", ");
  }

  const lines: string[] = [];
  if (data.success) {
    lines.push(`esbuild: build succeeded in ${data.duration}s with ${data.warnings.length} warnings`);
  } else {
    lines.push(`esbuild: build failed (${data.duration}s) — ${data.errors.length} errors, ${data.warnings.length} warnings`);
  }

  for (const err of data.errors) {
    const loc = err.file ? `${err.file}${err.line ? `:${err.line}` : ""}${err.column ? `:${err.column}` : ""}` : "";
    lines.push(`  ERROR${loc ? ` ${loc}` : ""}: ${err.message}`);
  }
  for (const warn of data.warnings) {
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
  if (data.success) {
    const lines = [`Vite build succeeded in ${data.duration}s`];
    if (data.outputs.length > 0) {
      lines.push(`  ${data.outputs.length} output files:`);
      for (const out of data.outputs) {
        lines.push(`    ${out.file}  ${out.size}`);
      }
    }
    if (data.warnings.length > 0) {
      lines.push(`  ${data.warnings.length} warnings`);
    }
    return lines.join("\n");
  }

  const lines = [`Vite build failed (${data.duration}s)`];
  for (const err of data.errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// webpack
// ---------------------------------------------------------------------------

/** Formats structured webpack build results into a human-readable summary. */
export function formatWebpack(data: WebpackResult): string {
  if (data.success) {
    const parts = [`webpack: build succeeded in ${data.duration}s`];
    if (data.assets.length > 0) parts.push(`${data.assets.length} assets`);
    if (data.modules !== undefined) parts.push(`${data.modules} modules`);
    if (data.warnings.length > 0) parts.push(`${data.warnings.length} warnings`);

    const lines = [parts.join(", ")];
    for (const asset of data.assets) {
      const sizeKB = (asset.size / 1024).toFixed(1);
      lines.push(`  ${asset.name}  ${sizeKB} kB`);
    }
    return lines.join("\n");
  }

  const lines = [`webpack: build failed (${data.duration}s)`];
  for (const err of data.errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}
