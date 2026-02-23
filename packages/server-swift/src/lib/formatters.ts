import type {
  SwiftBuildResult,
  SwiftTestResult,
  SwiftRunResult,
  SwiftPackageResolveResult,
  SwiftPackageUpdateResult,
  SwiftPackageShowDependenciesResult,
  SwiftPackageCleanResult,
  SwiftPackageInitResult,
} from "../schemas/index.js";

// ── Compact types ────────────────────────────────────────────────────

/** Compact build: success + counts + duration. */
export interface SwiftBuildCompact {
  [key: string]: unknown;
  success: boolean;
  errorCount: number;
  warningCount: number;
  duration: number;
  timedOut: boolean;
}

/** Compact test: summary counts with failed test entries preserved. */
export interface SwiftTestCompact {
  [key: string]: unknown;
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failedTests: string[];
}

/** Compact run: exit code + success, no stdout/stderr. */
export interface SwiftRunCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

/** Compact package resolve: success + package names. */
export interface SwiftPackageResolveCompact {
  [key: string]: unknown;
  success: boolean;
  packageCount: number;
  duration: number;
}

/** Compact package update: success + updated package names. */
export interface SwiftPackageUpdateCompact {
  [key: string]: unknown;
  success: boolean;
  updatedCount: number;
  duration: number;
}

/** Compact show-dependencies: success + dependency count. */
export interface SwiftPackageShowDependenciesCompact {
  [key: string]: unknown;
  success: boolean;
  dependencyCount: number;
}

/** Compact package clean: success + duration. */
export interface SwiftPackageCleanCompact {
  [key: string]: unknown;
  success: boolean;
  duration: number;
}

/** Compact package init: success + file count. */
export interface SwiftPackageInitCompact {
  [key: string]: unknown;
  success: boolean;
  fileCount: number;
  duration: number;
}

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured swift build results into a human-readable diagnostic summary. */
export function formatBuild(data: SwiftBuildResult): string {
  const status = data.success ? "success" : "failed";
  const timedOutSuffix = data.timedOut ? " [timed out]" : "";

  if (data.success && data.errors.length === 0 && data.warnings.length === 0) {
    return `swift build: success (${data.duration}ms)${timedOutSuffix}`;
  }

  const lines = [
    `swift build: ${status} (${data.errors.length} errors, ${data.warnings.length} warnings, ${data.duration}ms)${timedOutSuffix}`,
  ];

  for (const d of data.errors) {
    lines.push(`  ${d.file}:${d.line}:${d.column} error: ${d.message}`);
  }
  for (const d of data.warnings) {
    lines.push(`  ${d.file}:${d.line}:${d.column} warning: ${d.message}`);
  }

  return lines.join("\n");
}

/** Formats structured swift test results into a human-readable test summary. */
export function formatTest(data: SwiftTestResult): string {
  const status = data.success ? "passed" : "FAILED";
  const lines = [
    `swift test: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.skipped} skipped (${data.duration}ms)`,
  ];

  for (const t of data.testCases) {
    const dur = t.duration !== undefined ? ` (${t.duration}s)` : "";
    lines.push(`  ${t.status.padEnd(7)} ${t.name}${dur}`);
  }

  return lines.join("\n");
}

/** Formats structured swift run output into a human-readable summary. */
export function formatRun(data: SwiftRunResult): string {
  const status = data.success ? "success" : "failed";
  const timedOutSuffix = data.timedOut ? " [timed out]" : "";
  const lines = [
    `swift run: ${status} (exit code ${data.exitCode}, ${data.duration}ms)${timedOutSuffix}`,
  ];
  if (data.stdout) lines.push(`stdout:\n${data.stdout}`);
  if (data.stderr) lines.push(`stderr:\n${data.stderr}`);
  return lines.join("\n");
}

/** Formats structured swift package resolve output. */
export function formatPackageResolve(data: SwiftPackageResolveResult): string {
  const status = data.success ? "success" : "failed";
  if (data.resolvedPackages.length === 0) {
    return `swift package resolve: ${status} (${data.duration}ms)`;
  }

  const lines = [
    `swift package resolve: ${status} (${data.resolvedPackages.length} packages, ${data.duration}ms)`,
  ];
  for (const pkg of data.resolvedPackages) {
    const ver = pkg.version ? ` @ ${pkg.version}` : "";
    lines.push(`  ${pkg.name}${ver}`);
  }
  return lines.join("\n");
}

/** Formats structured swift package update output. */
export function formatPackageUpdate(data: SwiftPackageUpdateResult): string {
  const status = data.success ? "success" : "failed";
  if (data.updatedPackages.length === 0) {
    return `swift package update: ${status} (${data.duration}ms)`;
  }

  const lines = [
    `swift package update: ${status} (${data.updatedPackages.length} packages updated, ${data.duration}ms)`,
  ];
  for (const pkg of data.updatedPackages) {
    const from = pkg.oldVersion ? ` ${pkg.oldVersion}` : "";
    const to = pkg.newVersion ? ` -> ${pkg.newVersion}` : "";
    lines.push(`  ${pkg.name}${from}${to}`);
  }
  return lines.join("\n");
}

/** Formats structured swift package show-dependencies output. */
export function formatPackageShowDependencies(data: SwiftPackageShowDependenciesResult): string {
  const status = data.success ? "success" : "failed";
  if (data.dependencies.length === 0) {
    return `swift package show-dependencies: ${status}, no dependencies.`;
  }

  const lines = [
    `swift package show-dependencies: ${status} (${data.dependencies.length} dependencies)`,
  ];
  for (const dep of data.dependencies) {
    const ver = dep.version ? ` @ ${dep.version}` : "";
    const url = dep.url ? ` (${dep.url})` : "";
    lines.push(`  ${dep.name}${ver}${url}`);
  }
  return lines.join("\n");
}

/** Formats structured swift package clean output. */
export function formatPackageClean(data: SwiftPackageCleanResult): string {
  const status = data.success ? "success" : "failed";
  return `swift package clean: ${status} (${data.duration}ms)`;
}

/** Formats structured swift package init output. */
export function formatPackageInit(data: SwiftPackageInitResult): string {
  const status = data.success ? "success" : "failed";
  if (data.createdFiles.length === 0) {
    return `swift package init: ${status} (${data.duration}ms)`;
  }

  const lines = [
    `swift package init: ${status} (${data.createdFiles.length} files created, ${data.duration}ms)`,
  ];
  for (const file of data.createdFiles) {
    lines.push(`  ${file}`);
  }
  return lines.join("\n");
}

// ── Compact mappers ──────────────────────────────────────────────────

export function compactBuildMap(data: SwiftBuildResult): SwiftBuildCompact {
  return {
    success: data.success,
    errorCount: data.errors.length,
    warningCount: data.warnings.length,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function compactTestMap(data: SwiftTestResult): SwiftTestCompact {
  return {
    success: data.success,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
    total: data.total,
    duration: data.duration,
    failedTests: data.testCases.filter((t) => t.status === "failed").map((t) => t.name),
  };
}

export function compactRunMap(data: SwiftRunResult): SwiftRunCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    timedOut: data.timedOut,
  };
}

export function compactPackageResolveMap(
  data: SwiftPackageResolveResult,
): SwiftPackageResolveCompact {
  return {
    success: data.success,
    packageCount: data.resolvedPackages.length,
    duration: data.duration,
  };
}

export function compactPackageUpdateMap(data: SwiftPackageUpdateResult): SwiftPackageUpdateCompact {
  return {
    success: data.success,
    updatedCount: data.updatedPackages.length,
    duration: data.duration,
  };
}

export function compactPackageShowDependenciesMap(
  data: SwiftPackageShowDependenciesResult,
): SwiftPackageShowDependenciesCompact {
  return {
    success: data.success,
    dependencyCount: data.dependencies.length,
  };
}

export function compactPackageCleanMap(data: SwiftPackageCleanResult): SwiftPackageCleanCompact {
  return {
    success: data.success,
    duration: data.duration,
  };
}

export function compactPackageInitMap(data: SwiftPackageInitResult): SwiftPackageInitCompact {
  return {
    success: data.success,
    fileCount: data.createdFiles.length,
    duration: data.duration,
  };
}

// ── Compact formatters ───────────────────────────────────────────────

export function formatBuildCompact(data: SwiftBuildCompact): string {
  const status = data.success ? "success" : "failed";
  const timedOutSuffix = data.timedOut ? " [timed out]" : "";
  return `swift build: ${status} (${data.errorCount} errors, ${data.warningCount} warnings, ${data.duration}ms)${timedOutSuffix}`;
}

export function formatTestCompact(data: SwiftTestCompact): string {
  const status = data.success ? "passed" : "FAILED";
  return `swift test: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.skipped} skipped (${data.duration}ms)`;
}

export function formatRunCompact(data: SwiftRunCompact): string {
  const status = data.success ? "success" : "failed";
  const timedOutSuffix = data.timedOut ? " [timed out]" : "";
  return `swift run: ${status} (exit code ${data.exitCode}, ${data.duration}ms)${timedOutSuffix}`;
}

export function formatPackageResolveCompact(data: SwiftPackageResolveCompact): string {
  const status = data.success ? "success" : "failed";
  return `swift package resolve: ${status} (${data.packageCount} packages, ${data.duration}ms)`;
}

export function formatPackageUpdateCompact(data: SwiftPackageUpdateCompact): string {
  const status = data.success ? "success" : "failed";
  return `swift package update: ${status} (${data.updatedCount} updated, ${data.duration}ms)`;
}

export function formatPackageShowDependenciesCompact(
  data: SwiftPackageShowDependenciesCompact,
): string {
  const status = data.success ? "success" : "failed";
  return `swift package show-dependencies: ${status} (${data.dependencyCount} dependencies)`;
}

export function formatPackageCleanCompact(data: SwiftPackageCleanCompact): string {
  const status = data.success ? "success" : "failed";
  return `swift package clean: ${status} (${data.duration}ms)`;
}

export function formatPackageInitCompact(data: SwiftPackageInitCompact): string {
  const status = data.success ? "success" : "failed";
  return `swift package init: ${status} (${data.fileCount} files, ${data.duration}ms)`;
}
