import type {
  CargoBuildResult,
  CargoTestResult,
  CargoClippyResult,
  CargoRunResult,
  CargoAddResult,
  CargoRemoveResult,
  CargoFmtResult,
  CargoDocResult,
  CargoUpdateResult,
  CargoTreeResult,
  CargoAuditResult,
} from "../schemas/index.js";

// ── Compact types ────────────────────────────────────────────────────

/** Compact build/check: success + counts, with diagnostics preserved when non-empty. */
export interface CargoBuildCompact {
  [key: string]: unknown;
  success: boolean;
  mode?: string;
  diagnostics?: CargoBuildResult["diagnostics"];
  errors: number;
  warnings: number;
  total: number;
  timings?: CargoBuildResult["timings"];
}

/** Compact test: summary counts with failed test entries preserved for diagnostics. */
export interface CargoTestCompact {
  [key: string]: unknown;
  success: boolean;
  tests: CargoTestResult["tests"];
  total: number;
  passed: number;
  failed: number;
  ignored: number;
  duration?: string;
  compilationDiagnostics?: CargoTestResult["compilationDiagnostics"];
}

/** Compact clippy: success + counts per severity, with diagnostics preserved when non-empty. */
export interface CargoClippyCompact {
  [key: string]: unknown;
  success: boolean;
  diagnostics?: CargoClippyResult["diagnostics"];
  errors: number;
  warnings: number;
  total: number;
}

/** Compact run: exit code + success only, no stdout/stderr. */
export interface CargoRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  signal?: string;
  failureType?: "compilation" | "runtime" | "timeout";
}

/** Compact add: success + package names only, no version details. */
export interface CargoAddCompact {
  [key: string]: unknown;
  success: boolean;
  packages: string[];
  total: number;
  dependencyType?: "normal" | "dev" | "build";
  dryRun?: boolean;
  error?: string;
}

/** Compact remove: success + package names. */
export interface CargoRemoveCompact {
  [key: string]: unknown;
  success: boolean;
  removed: string[];
  total: number;
  partialSuccess?: boolean;
  failedPackages?: string[];
  dependencyType?: "normal" | "dev" | "build";
  error?: string;
}

/** Compact fmt: success + needsFormatting + file count only. */
export interface CargoFmtCompact {
  [key: string]: unknown;
  success: boolean;
  needsFormatting: boolean;
  filesChanged: number;
}

/** Compact doc: success + warning count + optional warning details. */
export interface CargoDocCompact {
  [key: string]: unknown;
  success: boolean;
  warnings: number;
  warningDetails?: CargoDocResult["warningDetails"];
}

/** Formats structured cargo build results into a human-readable diagnostic summary. */
export function formatCargoBuild(data: CargoBuildResult): string {
  if (data.success && data.total === 0) return "cargo build: success, no diagnostics.";

  const status = data.success ? "success" : "failed";
  const lines = [`cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)`];
  for (const d of data.diagnostics ?? []) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
    if (d.suggestion) {
      lines.push(`    suggestion: ${d.suggestion}`);
    }
  }
  if (data.timings?.generated) {
    const timingParts = ["timings generated"];
    if (data.timings.format) timingParts.push(`format=${data.timings.format}`);
    if (data.timings.reportPath) timingParts.push(`report=${data.timings.reportPath}`);
    lines.push(`  ${timingParts.join(", ")}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo test results into a human-readable test summary with pass/fail status. */
export function formatCargoTest(data: CargoTestResult): string {
  const status = data.success ? "ok" : "FAILED";
  const durationSuffix = data.duration ? `; finished in ${data.duration}` : "";
  const lines = [
    `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored${durationSuffix}`,
  ];
  for (const t of data.tests ?? []) {
    const perTestDuration = t.duration ? ` (${t.duration})` : "";
    lines.push(`  ${t.status.padEnd(7)} ${t.name}${perTestDuration}`);
    if (t.output) {
      // Indent failure output under the test entry
      for (const outputLine of t.output.split("\n")) {
        lines.push(`           ${outputLine}`);
      }
    }
  }
  // Gap #95: Show compilation diagnostics when available
  if (data.compilationDiagnostics && data.compilationDiagnostics.length > 0) {
    lines.push(`\nCompilation diagnostics (${data.compilationDiagnostics.length}):`);
    for (const d of data.compilationDiagnostics) {
      const code = d.code ? ` [${d.code}]` : "";
      lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured cargo clippy results into a human-readable lint warning summary. */
export function formatCargoClippy(data: CargoClippyResult): string {
  if (data.total === 0) return "clippy: no warnings.";

  const lines = [`clippy: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics ?? []) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
    if (d.suggestion) {
      lines.push(`    suggestion: ${d.suggestion}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured cargo run output into a human-readable summary. */
export function formatCargoRun(data: CargoRunResult): string {
  const status = data.success ? "success" : "failed";
  const failType = data.failureType ? ` [${data.failureType}]` : "";
  const signalSuffix = data.signal ? ` signal=${data.signal}` : "";
  const lines = [`cargo run: ${status}${failType} (exit code ${data.exitCode}${signalSuffix})`];
  if (data.stdout) {
    const truncNote = data.stdoutTruncated ? " [truncated]" : "";
    lines.push(`stdout${truncNote}:\n${data.stdout}`);
  }
  if (data.stderr) {
    const truncNote = data.stderrTruncated ? " [truncated]" : "";
    lines.push(`stderr${truncNote}:\n${data.stderr}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo add output into a human-readable summary. */
export function formatCargoAdd(data: CargoAddResult): string {
  if (!data.success) {
    const err = data.error ? `: ${data.error}` : "";
    return `cargo add: failed${err}`;
  }

  const dryRunSuffix = data.dryRun ? " (dry-run)" : "";
  const depTypeSuffix =
    data.dependencyType && data.dependencyType !== "normal" ? ` [${data.dependencyType}]` : "";

  if (data.total === 0)
    return `cargo add: success, no packages added.${dryRunSuffix ? ` ${dryRunSuffix.trim()}` : ""}`;

  const lines = [`cargo add: ${data.total} package(s) added${depTypeSuffix}${dryRunSuffix}`];
  for (const pkg of data.added ?? []) {
    lines.push(`  ${pkg.name} v${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo remove output into a human-readable summary. */
export function formatCargoRemove(data: CargoRemoveResult): string {
  if (!data.success) {
    const err = data.error ? `: ${data.error}` : "";
    const partial = data.partialSuccess ? " (partial)" : "";
    const failedPkgs =
      data.failedPackages && data.failedPackages.length > 0
        ? `; failed packages: ${data.failedPackages.join(", ")}`
        : "";
    return `cargo remove: failed${partial}${err}${failedPkgs}`;
  }

  const depTypeSuffix =
    data.dependencyType && data.dependencyType !== "normal" ? ` [${data.dependencyType}]` : "";

  if (data.total === 0) return "cargo remove: success, no packages removed.";

  const lines = [`cargo remove: ${data.total} package(s) removed${depTypeSuffix}`];
  for (const name of data.removed) {
    lines.push(`  ${name}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo fmt output into a human-readable summary. */
export function formatCargoFmt(data: CargoFmtResult): string {
  if (data.success && data.filesChanged === 0) return "cargo fmt: all files formatted.";

  const status = data.needsFormatting ? "needs formatting" : data.success ? "success" : "failed";
  const lines = [`cargo fmt: ${status} (${data.filesChanged} file(s))`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo doc output into a human-readable summary. */
export function formatCargoDoc(data: CargoDocResult): string {
  const status = data.success ? "success" : "failed";
  const parts = [`cargo doc: ${status}`];
  if (data.warnings > 0) parts.push(`(${data.warnings} warning(s))`);
  if (data.outputDir) parts.push(`-> ${data.outputDir}`);
  if (data.warnings === 0 && !data.outputDir) return `${parts[0]}.`;

  const lines = [parts.join(" ")];
  for (const w of data.warningDetails ?? []) {
    const loc = w.file ? `${w.file}:${w.line}` : "";
    lines.push(`  ${loc ? `${loc} ` : ""}warning: ${w.message}`);
  }
  return lines.join("\n");
}

// ── Compact mappers ──────────────────────────────────────────────────

export function compactBuildMap(data: CargoBuildResult): CargoBuildCompact {
  const compact: CargoBuildCompact = {
    success: data.success,
    errors: data.errors,
    warnings: data.warnings,
    total: data.total,
  };
  if ("mode" in data && (data as { mode?: string }).mode)
    compact.mode = (data as { mode?: string }).mode;
  if (data.diagnostics?.length) compact.diagnostics = data.diagnostics;
  if (data.timings) compact.timings = data.timings;
  return compact;
}

export function compactTestMap(data: CargoTestResult): CargoTestCompact {
  // In compact mode, only keep failed tests (with their output) for diagnostics
  const failedTests = (data.tests ?? []).filter((t) => t.status === "FAILED");
  const compact: CargoTestCompact = {
    success: data.success,
    tests: failedTests.length > 0 ? failedTests : [],
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    ignored: data.ignored,
  };
  if (data.duration) compact.duration = data.duration;
  // Gap #95: Preserve compilation diagnostics in compact mode
  if (data.compilationDiagnostics?.length) {
    compact.compilationDiagnostics = data.compilationDiagnostics;
  }
  return compact;
}

export function compactClippyMap(data: CargoClippyResult): CargoClippyCompact {
  const compact: CargoClippyCompact = {
    success: data.success,
    errors: data.errors,
    warnings: data.warnings,
    total: data.total,
  };
  if (data.diagnostics?.length) compact.diagnostics = data.diagnostics;
  return compact;
}

export function compactRunMap(data: CargoRunResult): CargoRunCompact {
  const compact: CargoRunCompact = {
    exitCode: data.exitCode,
    success: data.success,
  };
  if (data.failureType) compact.failureType = data.failureType;
  if (data.signal) compact.signal = data.signal;
  return compact;
}

export function compactAddMap(data: CargoAddResult): CargoAddCompact {
  const compact: CargoAddCompact = {
    success: data.success,
    packages: (data.added ?? []).map((p) => p.name),
    total: data.total,
  };
  if (data.dependencyType) compact.dependencyType = data.dependencyType;
  if (data.dryRun) compact.dryRun = true;
  if (data.error) compact.error = data.error;
  return compact;
}

export function compactRemoveMap(data: CargoRemoveResult): CargoRemoveCompact {
  const compact: CargoRemoveCompact = {
    success: data.success,
    removed: data.removed,
    total: data.total,
  };
  if (data.partialSuccess) compact.partialSuccess = true;
  if (data.failedPackages?.length) compact.failedPackages = data.failedPackages;
  if (data.dependencyType) compact.dependencyType = data.dependencyType;
  if (data.error) compact.error = data.error;
  return compact;
}

export function compactFmtMap(data: CargoFmtResult): CargoFmtCompact {
  return {
    success: data.success,
    needsFormatting: data.needsFormatting,
    filesChanged: data.filesChanged,
  };
}

export function compactDocMap(data: CargoDocResult): CargoDocCompact {
  const compact: CargoDocCompact = {
    success: data.success,
    warnings: data.warnings,
  };
  if (data.warningDetails?.length) compact.warningDetails = data.warningDetails;
  return compact;
}

// ── Compact formatters ───────────────────────────────────────────────

export function formatBuildCompact(data: CargoBuildCompact): string {
  const status = data.success ? "success" : "failed";
  const timingSuffix = data.timings?.generated ? " [timings]" : "";
  return `cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)${timingSuffix}`;
}

export function formatTestCompact(data: CargoTestCompact): string {
  const status = data.success ? "ok" : "FAILED";
  const durationSuffix = data.duration ? `; finished in ${data.duration}` : "";
  return `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored${durationSuffix}`;
}

export function formatClippyCompact(data: CargoClippyCompact): string {
  if (data.total === 0) return "clippy: no warnings.";
  return `clippy: ${data.errors} errors, ${data.warnings} warnings`;
}

export function formatRunCompact(data: CargoRunCompact): string {
  const status = data.success ? "success" : "failed";
  const failType = data.failureType ? ` [${data.failureType}]` : "";
  const signalSuffix = data.signal ? ` signal=${data.signal}` : "";
  return `cargo run: ${status}${failType} (exit code ${data.exitCode}${signalSuffix})`;
}

export function formatAddCompact(data: CargoAddCompact): string {
  if (!data.success) {
    const err = data.error ? `: ${data.error}` : "";
    return `cargo add: failed${err}`;
  }
  const dryRunSuffix = data.dryRun ? " (dry-run)" : "";
  if (data.total === 0)
    return `cargo add: success, no packages added.${dryRunSuffix ? ` ${dryRunSuffix.trim()}` : ""}`;
  return `cargo add: ${data.total} package(s) added${dryRunSuffix}: ${data.packages.join(", ")}`;
}

export function formatRemoveCompact(data: CargoRemoveCompact): string {
  if (!data.success) {
    const err = data.error ? `: ${data.error}` : "";
    return `cargo remove: failed${err}`;
  }
  if (data.total === 0) return "cargo remove: success, no packages removed.";
  return `cargo remove: ${data.total} package(s) removed: ${data.removed.join(", ")}`;
}

export function formatFmtCompact(data: CargoFmtCompact): string {
  if (data.success && data.filesChanged === 0) return "cargo fmt: all files formatted.";
  const status = data.needsFormatting ? "needs formatting" : data.success ? "success" : "failed";
  return `cargo fmt: ${status} (${data.filesChanged} file(s))`;
}

export function formatDocCompact(data: CargoDocCompact): string {
  const status = data.success ? "success" : "failed";
  if (data.warnings === 0) return `cargo doc: ${status}.`;
  return `cargo doc: ${status} (${data.warnings} warning(s))`;
}

// ── Update formatters ────────────────────────────────────────────────

/** Formats structured cargo update output into a human-readable summary. */
export function formatCargoUpdate(data: CargoUpdateResult): string {
  const status = data.success ? "success" : "failed";
  if (data.totalUpdated === 0 && !data.output) return `cargo update: ${status}.`;

  const lines = [`cargo update: ${status} (${data.totalUpdated} package(s) updated)`];
  for (const u of data.updated ?? []) {
    lines.push(`  ${u.name} v${u.from} -> v${u.to}`);
  }
  return lines.join("\n");
}

/** Compact update: success flag + updated packages, no raw output text. Gap #96: always includes updateCount. */
export interface CargoUpdateCompact {
  [key: string]: unknown;
  success: boolean;
  updated: CargoUpdateResult["updated"];
  totalUpdated: number;
}

export function compactUpdateMap(data: CargoUpdateResult): CargoUpdateCompact {
  return {
    success: data.success,
    updated: data.updated,
    totalUpdated: data.totalUpdated,
  };
}

export function formatUpdateCompact(data: CargoUpdateCompact): string {
  const status = data.success ? "success" : "failed";
  if (data.totalUpdated === 0) return `cargo update: ${status}`;
  const names = (data.updated ?? []).map((u) => u.name).join(", ");
  return `cargo update: ${status} (${data.totalUpdated} updated: ${names})`;
}

// ── Tree formatters ──────────────────────────────────────────────────

/** Formats structured cargo tree output into a human-readable summary. */
export function formatCargoTree(data: CargoTreeResult): string {
  if (!data.success) {
    return `cargo tree: failed${data.tree ? `\n${data.tree}` : ""}`;
  }
  const lines = [`cargo tree: ${data.packages} unique packages`];
  if (data.tree) lines.push(data.tree);
  return lines.join("\n");
}

/** Compact tree: success + dependencies + package count, no full tree text. */
export interface CargoTreeCompact {
  [key: string]: unknown;
  success: boolean;
  dependencies: CargoTreeResult["dependencies"];
  packages: number;
}

export function compactTreeMap(data: CargoTreeResult): CargoTreeCompact {
  return {
    success: data.success,
    dependencies: data.dependencies,
    packages: data.packages,
  };
}

export function formatTreeCompact(data: CargoTreeCompact): string {
  if (!data.success) return "cargo tree: failed";
  return `cargo tree: ${data.packages} unique packages`;
}

// ── Audit formatters ─────────────────────────────────────────────────

/** Formats structured cargo audit output into a human-readable vulnerability report. */
export function formatCargoAudit(data: CargoAuditResult): string {
  const summary = data.summary ?? {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    unknown: 0,
  };

  const fixesSuffix =
    data.fixesApplied !== undefined ? ` (${data.fixesApplied} fix(es) applied)` : "";

  if (summary.total === 0) return `cargo audit: no vulnerabilities found.${fixesSuffix}`;

  const lines = [
    `cargo audit: ${summary.total} vulnerabilities (${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low)${fixesSuffix}`,
  ];
  for (const v of data.vulnerabilities ?? []) {
    const patched = v.patched.length > 0 ? ` (patched: ${v.patched.join(", ")})` : "";
    const score = v.cvssScore !== undefined ? ` [CVSS: ${v.cvssScore}]` : "";
    lines.push(`  [${v.severity}] ${v.id} ${v.package}@${v.version}: ${v.title}${score}${patched}`);
  }
  return lines.join("\n");
}

/** Compact audit: success + summary counts only, no individual vulnerabilities. */
export interface CargoAuditCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
  unknown: number;
  fixesApplied?: number;
}

export function compactAuditMap(data: CargoAuditResult): CargoAuditCompact {
  const summary = data.summary ?? {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
    unknown: 0,
  };
  const compact: CargoAuditCompact = {
    success: data.success,
    vulnerabilities: [],
    total: summary.total,
    critical: summary.critical,
    high: summary.high,
    medium: summary.medium,
    low: summary.low,
    informational: summary.informational,
    unknown: summary.unknown,
  };
  if (data.fixesApplied !== undefined) {
    compact.fixesApplied = data.fixesApplied;
  }
  return compact;
}

export function formatAuditCompact(data: CargoAuditCompact): string {
  const fixesSuffix =
    data.fixesApplied !== undefined ? ` (${data.fixesApplied} fix(es) applied)` : "";
  if (data.total === 0) return `cargo audit: no vulnerabilities found.${fixesSuffix}`;
  return `cargo audit: ${data.total} vulnerabilities (${data.critical} critical, ${data.high} high, ${data.medium} medium, ${data.low} low)${fixesSuffix}`;
}
