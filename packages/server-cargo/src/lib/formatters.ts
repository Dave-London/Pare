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

/** Compact build/check: success + counts only, no diagnostic details. */
export interface CargoBuildCompact {
  [key: string]: unknown;
  success: boolean;
  errors: number;
  warnings: number;
  total: number;
}

/** Compact test: summary counts only, no individual test entries. */
export interface CargoTestCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  ignored: number;
}

/** Compact clippy: counts per severity only, no individual diagnostics. */
export interface CargoClippyCompact {
  [key: string]: unknown;
  errors: number;
  warnings: number;
  total: number;
}

/** Compact run: exit code + success only, no stdout/stderr. */
export interface CargoRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
}

/** Compact add: success + package names only, no version details. */
export interface CargoAddCompact {
  [key: string]: unknown;
  success: boolean;
  packages: string[];
  total: number;
}

/** Compact remove: success + package names. */
export interface CargoRemoveCompact {
  [key: string]: unknown;
  success: boolean;
  removed: string[];
  total: number;
}

/** Compact fmt: success + file count only. */
export interface CargoFmtCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
}

/** Compact doc: success + warning count. */
export interface CargoDocCompact {
  [key: string]: unknown;
  success: boolean;
  warnings: number;
}

/** Formats structured cargo build results into a human-readable diagnostic summary. */
export function formatCargoBuild(data: CargoBuildResult): string {
  if (data.success && data.total === 0) return "cargo build: success, no diagnostics.";

  const status = data.success ? "success" : "failed";
  const lines = [`cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)`];
  for (const d of data.diagnostics ?? []) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.severity}${code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo test results into a human-readable test summary with pass/fail status. */
export function formatCargoTest(data: CargoTestResult): string {
  const status = data.success ? "ok" : "FAILED";
  const lines = [
    `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored`,
  ];
  for (const t of data.tests ?? []) {
    lines.push(`  ${t.status.padEnd(7)} ${t.name}`);
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
  }
  return lines.join("\n");
}

/** Formats structured cargo run output into a human-readable summary. */
export function formatCargoRun(data: CargoRunResult): string {
  const status = data.success ? "success" : "failed";
  const lines = [`cargo run: ${status} (exit code ${data.exitCode})`];
  if (data.stdout) lines.push(`stdout:\n${data.stdout}`);
  if (data.stderr) lines.push(`stderr:\n${data.stderr}`);
  return lines.join("\n");
}

/** Formats structured cargo add output into a human-readable summary. */
export function formatCargoAdd(data: CargoAddResult): string {
  if (!data.success) return "cargo add: failed";

  if (data.total === 0) return "cargo add: success, no packages added.";

  const lines = [`cargo add: ${data.total} package(s) added`];
  for (const pkg of data.added ?? []) {
    lines.push(`  ${pkg.name} v${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo remove output into a human-readable summary. */
export function formatCargoRemove(data: CargoRemoveResult): string {
  if (!data.success) return "cargo remove: failed";

  if (data.total === 0) return "cargo remove: success, no packages removed.";

  const lines = [`cargo remove: ${data.total} package(s) removed`];
  for (const name of data.removed) {
    lines.push(`  ${name}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo fmt output into a human-readable summary. */
export function formatCargoFmt(data: CargoFmtResult): string {
  if (data.success && data.filesChanged === 0) return "cargo fmt: all files formatted.";

  const status = data.success ? "success" : "needs formatting";
  const lines = [`cargo fmt: ${status} (${data.filesChanged} file(s))`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured cargo doc output into a human-readable summary. */
export function formatCargoDoc(data: CargoDocResult): string {
  const status = data.success ? "success" : "failed";
  if (data.warnings === 0) return `cargo doc: ${status}.`;
  return `cargo doc: ${status} (${data.warnings} warning(s))`;
}

// ── Compact mappers ──────────────────────────────────────────────────

export function compactBuildMap(data: CargoBuildResult): CargoBuildCompact {
  return {
    success: data.success,
    diagnostics: [],
    errors: data.errors,
    warnings: data.warnings,
    total: data.total,
  };
}

export function compactTestMap(data: CargoTestResult): CargoTestCompact {
  return {
    success: data.success,
    tests: [],
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    ignored: data.ignored,
  };
}

export function compactClippyMap(data: CargoClippyResult): CargoClippyCompact {
  return {
    diagnostics: [],
    errors: data.errors,
    warnings: data.warnings,
    total: data.total,
  };
}

export function compactRunMap(data: CargoRunResult): CargoRunCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
  };
}

export function compactAddMap(data: CargoAddResult): CargoAddCompact {
  return {
    success: data.success,
    packages: (data.added ?? []).map((p) => p.name),
    total: data.total,
  };
}

export function compactRemoveMap(data: CargoRemoveResult): CargoRemoveCompact {
  return {
    success: data.success,
    removed: data.removed,
    total: data.total,
  };
}

export function compactFmtMap(data: CargoFmtResult): CargoFmtCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
  };
}

export function compactDocMap(data: CargoDocResult): CargoDocCompact {
  return {
    success: data.success,
    warnings: data.warnings,
  };
}

// ── Compact formatters ───────────────────────────────────────────────

export function formatBuildCompact(data: CargoBuildCompact): string {
  const status = data.success ? "success" : "failed";
  return `cargo build: ${status} (${data.errors} errors, ${data.warnings} warnings)`;
}

export function formatTestCompact(data: CargoTestCompact): string {
  const status = data.success ? "ok" : "FAILED";
  return `test result: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.ignored} ignored`;
}

export function formatClippyCompact(data: CargoClippyCompact): string {
  if (data.total === 0) return "clippy: no warnings.";
  return `clippy: ${data.errors} errors, ${data.warnings} warnings`;
}

export function formatRunCompact(data: CargoRunCompact): string {
  const status = data.success ? "success" : "failed";
  return `cargo run: ${status} (exit code ${data.exitCode})`;
}

export function formatAddCompact(data: CargoAddCompact): string {
  if (!data.success) return "cargo add: failed";
  if (data.total === 0) return "cargo add: success, no packages added.";
  return `cargo add: ${data.total} package(s) added: ${data.packages.join(", ")}`;
}

export function formatRemoveCompact(data: CargoRemoveCompact): string {
  if (!data.success) return "cargo remove: failed";
  if (data.total === 0) return "cargo remove: success, no packages removed.";
  return `cargo remove: ${data.total} package(s) removed: ${data.removed.join(", ")}`;
}

export function formatFmtCompact(data: CargoFmtCompact): string {
  if (data.success && data.filesChanged === 0) return "cargo fmt: all files formatted.";
  const status = data.success ? "success" : "needs formatting";
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
  if (!data.output) return `cargo update: ${status}.`;
  return `cargo update: ${status}\n${data.output}`;
}

/** Compact update: success flag only, no output text. */
export interface CargoUpdateCompact {
  [key: string]: unknown;
  success: boolean;
}

export function compactUpdateMap(data: CargoUpdateResult): CargoUpdateCompact {
  return {
    success: data.success,
  };
}

export function formatUpdateCompact(data: CargoUpdateCompact): string {
  const status = data.success ? "success" : "failed";
  return `cargo update: ${status}`;
}

// ── Tree formatters ──────────────────────────────────────────────────

/** Formats structured cargo tree output into a human-readable summary. */
export function formatCargoTree(data: CargoTreeResult): string {
  const lines = [`cargo tree: ${data.packages} unique packages`];
  if (data.tree) lines.push(data.tree);
  return lines.join("\n");
}

/** Compact tree: package count only, no full tree text. */
export interface CargoTreeCompact {
  [key: string]: unknown;
  packages: number;
}

export function compactTreeMap(data: CargoTreeResult): CargoTreeCompact {
  return {
    packages: data.packages,
  };
}

export function formatTreeCompact(data: CargoTreeCompact): string {
  return `cargo tree: ${data.packages} unique packages`;
}

// ── Audit formatters ─────────────────────────────────────────────────

/** Formats structured cargo audit output into a human-readable vulnerability report. */
export function formatCargoAudit(data: CargoAuditResult): string {
  const summary = data.summary ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  if (summary.total === 0) return "cargo audit: no vulnerabilities found.";

  const lines = [
    `cargo audit: ${summary.total} vulnerabilities (${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low)`,
  ];
  for (const v of data.vulnerabilities ?? []) {
    const patched = v.patched.length > 0 ? ` (patched: ${v.patched.join(", ")})` : "";
    lines.push(`  [${v.severity}] ${v.id} ${v.package}@${v.version}: ${v.title}${patched}`);
  }
  return lines.join("\n");
}

/** Compact audit: summary counts only, no individual vulnerabilities. */
export interface CargoAuditCompact {
  [key: string]: unknown;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function compactAuditMap(data: CargoAuditResult): CargoAuditCompact {
  const summary = data.summary ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  return {
    vulnerabilities: [],
    total: summary.total,
    critical: summary.critical,
    high: summary.high,
    medium: summary.medium,
    low: summary.low,
  };
}

export function formatAuditCompact(data: CargoAuditCompact): string {
  if (data.total === 0) return "cargo audit: no vulnerabilities found.";
  return `cargo audit: ${data.total} vulnerabilities (${data.critical} critical, ${data.high} high, ${data.medium} medium, ${data.low} low)`;
}
