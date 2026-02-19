import type {
  DotnetBuildResult,
  DotnetTestResult,
  DotnetRunResult,
  DotnetPublishResult,
  DotnetRestoreResult,
  DotnetCleanResult,
  DotnetAddPackageResult,
  DotnetListPackageResult,
} from "../schemas/index.js";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

/** Formats structured dotnet build results into a human-readable diagnostic summary. */
export function formatDotnetBuild(data: DotnetBuildResult): string {
  if (data.success && data.total === 0) {
    return "dotnet build: success, no diagnostics.";
  }

  const status = data.success ? "success" : "failed";
  const lines = [`dotnet build: ${status} (${data.errors} errors, ${data.warnings} warnings)`];
  for (const d of data.diagnostics) {
    const col = d.column !== undefined ? `,${d.column}` : "";
    const code = d.code ? ` ${d.code}` : "";
    const msg = d.message ? `: ${d.message}` : "";
    lines.push(`  ${d.file}(${d.line}${col}) ${d.severity}${code}${msg}`);
  }
  return lines.join("\n");
}

/** Compact build: success and error/warning counts. */
export interface DotnetBuildCompact {
  [key: string]: unknown;
  success: boolean;
  errors: number;
  warnings: number;
  diagnostics: Array<{ file: string; line: number; severity: string }>;
}

const BUILD_COMPACT_DIAG_LIMIT = 10;

export function compactBuildMap(data: DotnetBuildResult): DotnetBuildCompact {
  return {
    success: data.success,
    errors: data.errors,
    warnings: data.warnings,
    diagnostics: data.diagnostics.slice(0, BUILD_COMPACT_DIAG_LIMIT).map((d) => ({
      file: d.file,
      line: d.line,
      severity: d.severity,
    })),
  };
}

export function formatBuildCompact(data: DotnetBuildCompact): string {
  if (data.errors === 0 && data.warnings === 0) return "dotnet build: success, no diagnostics.";

  const lines = [`dotnet build: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line} ${d.severity}`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

/** Formats structured dotnet test results into a human-readable summary. */
export function formatDotnetTest(data: DotnetTestResult): string {
  const status = data.success ? "passed" : "failed";
  const lines = [
    `dotnet test: ${status} — ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped (${data.total} total)`,
  ];
  for (const t of data.tests) {
    const dur = t.duration ? ` [${t.duration}]` : "";
    lines.push(`  ${t.status} ${t.name}${dur}`);
    if (t.errorMessage) {
      lines.push(`    ${t.errorMessage}`);
    }
  }
  return lines.join("\n");
}

/** Compact test: summary counts only, no individual test details. */
export interface DotnetTestCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  failedTests?: string[];
}

export function compactTestMap(data: DotnetTestResult): DotnetTestCompact {
  const failedTests = data.tests.filter((t) => t.status === "Failed").map((t) => t.name);
  return {
    success: data.success,
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
    failedTests: failedTests.length > 0 ? failedTests : undefined,
  };
}

export function formatTestCompact(data: DotnetTestCompact): string {
  const status = data.success ? "passed" : "failed";
  const line = `dotnet test: ${status} — ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped (${data.total} total)`;
  if (data.failedTests && data.failedTests.length > 0) {
    return line + "\n  Failed: " + data.failedTests.join(", ");
  }
  return line;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

/** Formats structured dotnet run results into a human-readable summary. */
export function formatDotnetRun(data: DotnetRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(`dotnet run: timed out (exit ${data.exitCode})`);
  } else if (data.success) {
    lines.push("dotnet run: success (exit 0)");
  } else {
    lines.push(`dotnet run: failed (exit ${data.exitCode})`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Compact run: exit code and truncated output only. */
export interface DotnetRunCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  timedOut?: boolean;
}

export function compactRunMap(data: DotnetRunResult): DotnetRunCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: DotnetRunCompact): string {
  if (data.timedOut) return `dotnet run: timed out (exit ${data.exitCode})`;
  if (data.success) return "dotnet run: success (exit 0)";
  return `dotnet run: failed (exit ${data.exitCode})`;
}

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

/** Formats structured dotnet publish results into a human-readable summary. */
export function formatDotnetPublish(data: DotnetPublishResult): string {
  if (data.success) {
    const parts = ["dotnet publish: success"];
    if (data.outputPath) parts.push(`-> ${data.outputPath}`);
    if (data.warnings?.length) parts.push(`(${data.warnings.length} warnings)`);
    return parts.join(" ");
  }

  const lines = [`dotnet publish: failed (exit ${data.exitCode})`];
  for (const err of data.errors ?? []) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

/** Compact publish. */
export interface DotnetPublishCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  outputPath?: string;
}

export function compactPublishMap(data: DotnetPublishResult): DotnetPublishCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    outputPath: data.outputPath,
  };
}

export function formatPublishCompact(data: DotnetPublishCompact): string {
  if (data.success) {
    return data.outputPath
      ? `dotnet publish: success -> ${data.outputPath}`
      : "dotnet publish: success";
  }
  return `dotnet publish: failed (exit ${data.exitCode})`;
}

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

/** Formats structured dotnet restore results into a human-readable summary. */
export function formatDotnetRestore(data: DotnetRestoreResult): string {
  if (data.success) {
    const parts = ["dotnet restore: success"];
    if (data.restoredProjects) parts.push(`(${data.restoredProjects} projects restored)`);
    if (data.warnings?.length) parts.push(`${data.warnings.length} warnings`);
    return parts.join(", ");
  }

  const lines = [`dotnet restore: failed (exit ${data.exitCode})`];
  for (const err of data.errors ?? []) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

/** Compact restore. */
export interface DotnetRestoreCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  restoredProjects?: number;
}

export function compactRestoreMap(data: DotnetRestoreResult): DotnetRestoreCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    restoredProjects: data.restoredProjects,
  };
}

export function formatRestoreCompact(data: DotnetRestoreCompact): string {
  if (data.success) {
    return data.restoredProjects
      ? `dotnet restore: success (${data.restoredProjects} projects)`
      : "dotnet restore: success";
  }
  return `dotnet restore: failed (exit ${data.exitCode})`;
}

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

/** Formats structured dotnet clean results into a human-readable summary. */
export function formatDotnetClean(data: DotnetCleanResult): string {
  if (data.success) return "dotnet clean: success";
  return `dotnet clean: failed (exit ${data.exitCode})`;
}

/** Compact clean (identical to full since clean is already minimal). */
export interface DotnetCleanCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
}

export function compactCleanMap(data: DotnetCleanResult): DotnetCleanCompact {
  return { success: data.success, exitCode: data.exitCode };
}

export function formatCleanCompact(data: DotnetCleanCompact): string {
  if (data.success) return "dotnet clean: success";
  return `dotnet clean: failed (exit ${data.exitCode})`;
}

// ---------------------------------------------------------------------------
// add-package
// ---------------------------------------------------------------------------

/** Formats structured dotnet add package results into a human-readable summary. */
export function formatDotnetAddPackage(data: DotnetAddPackageResult): string {
  if (data.success) {
    const ver = data.version ? ` v${data.version}` : "";
    return `dotnet add package: added ${data.package}${ver}`;
  }

  const lines = [`dotnet add package: failed (exit ${data.exitCode})`];
  for (const err of data.errors ?? []) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

/** Compact add-package. */
export interface DotnetAddPackageCompact {
  [key: string]: unknown;
  success: boolean;
  package: string;
  version?: string;
}

export function compactAddPackageMap(data: DotnetAddPackageResult): DotnetAddPackageCompact {
  return {
    success: data.success,
    package: data.package,
    version: data.version,
  };
}

export function formatAddPackageCompact(data: DotnetAddPackageCompact): string {
  if (data.success) {
    const ver = data.version ? ` v${data.version}` : "";
    return `dotnet add package: added ${data.package}${ver}`;
  }
  return `dotnet add package: failed for ${data.package}`;
}

// ---------------------------------------------------------------------------
// list-package
// ---------------------------------------------------------------------------

/** Formats structured dotnet list package results into a human-readable summary. */
export function formatDotnetListPackage(data: DotnetListPackageResult): string {
  if (data.projects.length === 0) {
    return data.success ? "dotnet list package: no projects found" : "dotnet list package: failed";
  }

  const lines: string[] = [];
  for (const proj of data.projects) {
    lines.push(`Project: ${proj.project}`);
    for (const fw of proj.frameworks) {
      lines.push(`  [${fw.framework}]`);
      for (const pkg of fw.topLevel ?? []) {
        const latest = pkg.latest ? ` -> ${pkg.latest}` : "";
        const dep = pkg.deprecated ? " (deprecated)" : "";
        lines.push(`    ${pkg.id}  ${pkg.resolved}${latest}${dep}`);
      }
      if (fw.transitive && fw.transitive.length > 0) {
        lines.push(`    Transitive:`);
        for (const pkg of fw.transitive) {
          const latest = pkg.latest ? ` -> ${pkg.latest}` : "";
          lines.push(`      ${pkg.id}  ${pkg.resolved}${latest}`);
        }
      }
    }
  }
  return lines.join("\n");
}

/** Compact list-package: project names and package counts only. */
export interface DotnetListPackageCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  projects: Array<{ project: string; packageCount: number }>;
}

export function compactListPackageMap(data: DotnetListPackageResult): DotnetListPackageCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    projects: data.projects.map((p) => ({
      project: p.project,
      packageCount: p.frameworks.reduce(
        (sum, fw) => sum + (fw.topLevel?.length ?? 0) + (fw.transitive?.length ?? 0),
        0,
      ),
    })),
  };
}

export function formatListPackageCompact(data: DotnetListPackageCompact): string {
  if (data.projects.length === 0) return "dotnet list package: no projects found";
  const parts = data.projects.map((p) => `${p.project} (${p.packageCount} packages)`);
  return `dotnet list package: ${parts.join(", ")}`;
}
