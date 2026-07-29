import type {
  PipInstall,
  MypyResult,
  RuffResult,
  PipAuditResult,
  PytestResult,
  UvInstall,
  UvRun,
  BlackResult,
  PipList,
  PipShow,
  RuffFormatResult,
  CondaList,
  CondaInfo,
  CondaEnvList,
  CondaCreate,
  CondaRemove,
  CondaUpdate,
  CondaResult,
  PyenvResult,
  PoetryResult,
} from "../schemas/index.js";
import { compactStreamFields, type CompactStreamFields } from "@paretools/shared";

/** Maximum diagnostic entries kept in compact mode (mypy/ruff). */
const COMPACT_MAX_DIAGNOSTICS = 20;
/** Maximum vulnerability entries kept in compact mode (pip-audit). */
const COMPACT_MAX_VULNS = 10;
/** Maximum characters of a vulnerability description kept in compact mode. */
const COMPACT_VULN_DESCRIPTION_MAX = 140;
/** Maximum package/artifact/version entries kept in compact mode (pip-list/poetry/pyenv). */
const COMPACT_MAX_ENTRIES = 50;
/** Maximum message lines kept in compact mode (poetry). */
const COMPACT_MAX_MESSAGES = 20;

/** Formats structured pip install results into a human-readable summary of installed packages. */
export function formatPipInstall(data: PipInstall): string {
  const total = (data.installed ?? []).length;
  if (data.alreadySatisfied && total === 0 && data.success) {
    return "All requirements already satisfied.";
  }
  if (!data.success) {
    const lines = [
      `pip install failed${data.exitCode !== undefined ? ` (exit code ${data.exitCode})` : ""}.`,
    ];
    if (data.error) lines.push(data.error);
    return lines.join("\n");
  }

  const verb = data.dryRun ? "Would install" : "Installed";
  const lines = [`${verb} ${total} packages:`];
  for (const pkg of data.installed ?? []) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured mypy type-check results into a human-readable diagnostic summary. */
export function formatMypy(data: MypyResult): string {
  const diagnostics = data.diagnostics ?? [];
  if (data.error && diagnostics.length === 0) {
    return [`mypy: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (data.success && diagnostics.length === 0) return "mypy: no errors found.";

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const notes = diagnostics.filter((d) => d.severity === "note").length;

  const lines = [`mypy: ${errors} errors, ${warnings} warnings, ${notes} notes`];
  for (const d of diagnostics) {
    const col = d.column ? `:${d.column}` : "";
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}${col} ${d.severity}: ${d.message}${code}`);
  }
  if (data.error) lines.push(data.error);
  return lines.join("\n");
}

/** Formats structured ruff lint results into a human-readable diagnostic listing. */
export function formatRuff(data: RuffResult): string {
  const diagnostics = data.diagnostics ?? [];
  const total = diagnostics.length;
  if (data.error && total === 0) {
    return [`ruff: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (total === 0) return "ruff: no issues found.";

  const fixable = diagnostics.filter((d) => d.fixable).length;
  const fixedPart = data.fixedCount !== undefined ? `, ${data.fixedCount} fixed` : "";
  const lines = [`ruff: ${total} issues (${fixable} fixable${fixedPart})`];
  for (const d of diagnostics) {
    const fixInfo = d.fixApplicability ? ` [fix: ${d.fixApplicability}]` : "";
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}${fixInfo}`);
  }
  return lines.join("\n");
}

/** Formats structured pip-audit vulnerability results into a human-readable security report. */
export function formatPipAudit(data: PipAuditResult): string {
  const vulns = data.vulnerabilities ?? [];
  const total = vulns.length;
  if (data.error && total === 0) {
    return [
      `pip-audit: audit failed (exit code ${data.exitCode ?? "?"}) — result is NOT a clean scan.`,
      data.error,
    ].join("\n");
  }
  if (total === 0) return "No vulnerabilities found.";

  const lines = [`${total} vulnerabilities:`];
  for (const v of vulns) {
    const fix = v.fixVersions.length ? ` (fix: ${v.fixVersions.join(", ")})` : "";
    const severity = v.severity ? ` [${v.severity}]` : "";
    const score = v.cvssScore != null ? ` CVSS:${v.cvssScore}` : "";
    lines.push(`  ${v.name}==${v.version} ${v.id}${severity}${score}: ${v.description}${fix}`);
  }
  return lines.join("\n");
}

/** Formats structured pytest results into a human-readable test summary. */
export function formatPytest(data: PytestResult): string {
  const total = data.passed + data.failed + data.errors + data.skipped;
  if (total === 0) {
    if (data.success) return "pytest: no tests collected.";
    const lines = [`pytest: run failed with no test results (exit code ${data.exitCode ?? "?"}).`];
    if (data.errorOutput) lines.push(data.errorOutput);
    return lines.join("\n");
  }

  const parts: string[] = [];
  if (data.passed > 0) parts.push(`${data.passed} passed`);
  if (data.failed > 0) parts.push(`${data.failed} failed`);
  if (data.errors > 0) parts.push(`${data.errors} errors`);
  if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
  if (data.warnings > 0) parts.push(`${data.warnings} warnings`);

  const lines = [`pytest: ${parts.join(", ")}`];

  for (const f of data.failures ?? []) {
    lines.push(`  FAILED ${f.test}: ${f.message}`);
  }
  if (data.errorOutput) {
    lines.push(data.errorOutput);
  }

  return lines.join("\n");
}

/** Formats structured uv install results into a human-readable summary. */
export function formatUvInstall(data: UvInstall): string {
  const installed = data.installed ?? [];
  const total = installed.length;
  if (!data.success) {
    const lines = ["uv install failed."];
    if (data.resolutionConflicts && data.resolutionConflicts.length > 0) {
      lines.push("Resolution conflicts:");
      for (const c of data.resolutionConflicts) {
        lines.push(`  ${c.package} ${c.constraint}`);
      }
    } else if (data.error) {
      lines.push(data.error);
    }
    return lines.join("\n");
  }
  if (data.alreadySatisfied || total === 0) return "All requirements already satisfied.";

  const lines = [`Installed ${total} packages:`];
  for (const pkg of installed) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured uv run results into a human-readable summary. */
export function formatUvRun(data: UvRun): string {
  const status = data.success ? "completed" : `failed (exit ${data.exitCode})`;
  const lines = [`uv run ${status}`];

  if (data.uvDiagnostics && data.uvDiagnostics.length > 0) {
    lines.push("uv diagnostics:");
    for (const d of data.uvDiagnostics) {
      lines.push(`  ${d}`);
    }
  }
  if (data.stdout?.trim()) {
    lines.push("stdout:", data.stdout.trim());
  }
  const commandErr = data.commandStderr ?? data.stderr;
  if (commandErr?.trim()) {
    lines.push("stderr:", commandErr.trim());
  }
  if (data.truncated) {
    lines.push("output truncated");
  }

  return lines.join("\n");
}

/** Formats structured Black formatter results into a human-readable summary. */
export function formatBlack(data: BlackResult): string {
  if (data.errorType === "internal_error") {
    if (data.diagnostics && data.diagnostics.length > 0) {
      const first = data.diagnostics[0];
      const col = first.column !== undefined ? `:${first.column}` : "";
      return `black: internal error (exit 123). ${first.file}:${first.line}${col} ${first.message}`;
    }
    return "black: internal error (exit 123). Check for syntax errors.";
  }

  const filesChecked = data.filesChanged + data.filesUnchanged;
  if (filesChecked === 0) return "black: no Python files found.";

  if (data.success && data.filesChanged === 0) {
    return `black: ${data.filesUnchanged} files already formatted.`;
  }

  const lines: string[] = [];
  const wouldReformat = data.wouldReformat ?? [];
  if (wouldReformat.length > 0) {
    lines.push(
      `black: ${data.filesChanged} files ${data.errorType === "check_failed" ? "would be reformatted" : "reformatted"}, ${data.filesUnchanged} unchanged`,
    );
    for (const f of wouldReformat) {
      lines.push(`  ${f}`);
    }
  } else {
    lines.push(`black: ${data.filesChanged} files reformatted, ${data.filesUnchanged} unchanged`);
  }

  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact pytest: counts + failure test names only (no stack traces).
 *  Diagnostics (exitCode/errorOutput) are kept: they only appear on failed runs
 *  with no test results, where they are the sole actionable signal. */
export interface PytestResultCompact {
  [key: string]: unknown;
  success: boolean;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  warnings: number;
  failedTests: string[];
  exitCode?: number;
  errorOutput?: string;
}

export function compactPytestMap(data: PytestResult): PytestResultCompact {
  const compact: PytestResultCompact = {
    success: data.success,
    passed: data.passed,
    failed: data.failed,
    errors: data.errors,
    skipped: data.skipped,
    warnings: data.warnings,
    failedTests: (data.failures ?? []).map((f) => f.test),
  };
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  if (data.errorOutput !== undefined) compact.errorOutput = data.errorOutput;
  return compact;
}

export function formatPytestCompact(data: PytestResultCompact): string {
  const total = data.passed + data.failed + data.errors + data.skipped;
  if (total === 0) {
    if (data.success) return "pytest: no tests collected.";
    const lines = [`pytest: run failed with no test results (exit code ${data.exitCode ?? "?"}).`];
    if (data.errorOutput) lines.push(data.errorOutput);
    return lines.join("\n");
  }

  const parts: string[] = [];
  if (data.passed > 0) parts.push(`${data.passed} passed`);
  if (data.failed > 0) parts.push(`${data.failed} failed`);
  if (data.errors > 0) parts.push(`${data.errors} errors`);
  if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
  if (data.warnings > 0) parts.push(`${data.warnings} warnings`);

  const lines = [`pytest: ${parts.join(", ")}`];
  for (const t of data.failedTests) {
    lines.push(`  FAILED ${t}`);
  }
  if (data.errorOutput) {
    lines.push(data.errorOutput);
  }
  return lines.join("\n");
}

/** Compact mypy diagnostic entry: full location + message, minus column/url extras. */
export interface MypyDiagnosticCompact {
  file: string;
  line: number;
  severity: "error" | "warning" | "note";
  message: string;
  code?: string;
}

/** Compact mypy: severity counts + first-N diagnostics. Notes beyond the cap are dropped. */
export interface MypyResultCompact {
  [key: string]: unknown;
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics?: MypyDiagnosticCompact[];
  truncated?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactMypyMap(data: MypyResult): MypyResultCompact {
  const diagnostics = data.diagnostics ?? [];
  const compact: MypyResultCompact = {
    success: data.success,
    errorCount: diagnostics.filter((d) => d.severity === "error").length,
    warningCount: diagnostics.filter((d) => d.severity === "warning").length,
  };
  if (diagnostics.length > 0) {
    compact.diagnostics = diagnostics.slice(0, COMPACT_MAX_DIAGNOSTICS).map((d) => ({
      file: d.file,
      line: d.line,
      severity: d.severity,
      message: d.message,
      ...(d.code ? { code: d.code } : {}),
    }));
    if (diagnostics.length > COMPACT_MAX_DIAGNOSTICS) compact.truncated = true;
  }
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatMypyCompact(data: MypyResultCompact): string {
  const diagnostics = data.diagnostics ?? [];
  if (data.error && diagnostics.length === 0) {
    return [`mypy: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (data.success && diagnostics.length === 0) return "mypy: no errors found.";

  const lines = [`mypy: ${data.errorCount} errors, ${data.warningCount} warnings`];
  for (const d of diagnostics) {
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line} ${d.severity}: ${d.message}${code}`);
  }
  if (data.truncated) {
    lines.push("  … more diagnostics omitted (run with compact:false for the full list)");
  }
  if (data.error) lines.push(data.error);
  return lines.join("\n");
}

/** Compact ruff diagnostic entry: location + rule + message + fixability. */
export interface RuffDiagnosticCompact {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  fixable: boolean;
}

/** Compact ruff: totals + first-N diagnostics. Drop fix metadata/urls. */
export interface RuffResultCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  fixableCount: number;
  fixedCount?: number;
  diagnostics?: RuffDiagnosticCompact[];
  truncated?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactRuffMap(data: RuffResult): RuffResultCompact {
  const diagnostics = data.diagnostics ?? [];
  const compact: RuffResultCompact = {
    success: data.success,
    total: diagnostics.length,
    fixableCount: diagnostics.filter((d) => d.fixable).length,
    fixedCount: data.fixedCount,
  };
  if (diagnostics.length > 0) {
    compact.diagnostics = diagnostics.slice(0, COMPACT_MAX_DIAGNOSTICS).map((d) => ({
      file: d.file,
      line: d.line,
      column: d.column,
      code: d.code,
      message: d.message,
      fixable: d.fixable,
    }));
    if (diagnostics.length > COMPACT_MAX_DIAGNOSTICS) compact.truncated = true;
  }
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatRuffCompact(data: RuffResultCompact): string {
  if (data.error && data.total === 0) {
    return [`ruff: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (data.total === 0 && !data.fixedCount) return "ruff: no issues found.";
  const fixedPart = data.fixedCount !== undefined ? `, ${data.fixedCount} fixed` : "";
  const lines = [`ruff: ${data.total} issues (${data.fixableCount} fixable${fixedPart})`];
  for (const d of data.diagnostics ?? []) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`);
  }
  if (data.truncated) {
    lines.push(
      `  … ${data.total - (data.diagnostics ?? []).length} more issues omitted (run with compact:false for the full list)`,
    );
  }
  if (data.error) lines.push(data.error);
  return lines.join("\n");
}

/** Compact black: success + changed/unchanged counts + errorType. Drop individual file lists. */
export interface BlackResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged: number;
  errorType?: "check_failed" | "internal_error";
}

export function compactBlackMap(data: BlackResult): BlackResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
    filesUnchanged: data.filesUnchanged,
    errorType: data.errorType,
  };
}

export function formatBlackCompact(data: BlackResultCompact): string {
  if (data.errorType === "internal_error") {
    return "black: internal error (exit 123).";
  }
  const filesChecked = data.filesChanged + data.filesUnchanged;
  if (filesChecked === 0) return "black: no Python files found.";
  if (data.filesChanged === 0) return `black: ${data.filesUnchanged} files already formatted.`;
  return `black: ${data.filesChanged} reformatted, ${data.filesUnchanged} unchanged`;
}

/** Compact pip-install: success + dryRun + failure diagnostics. Drop individual package details. */
export interface PipInstallCompact {
  [key: string]: unknown;
  success: boolean;
  alreadySatisfied: boolean;
  dryRun?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactPipInstallMap(data: PipInstall): PipInstallCompact {
  const compact: PipInstallCompact = {
    success: data.success,
    alreadySatisfied: data.alreadySatisfied,
    dryRun: data.dryRun || undefined,
  };
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatPipInstallCompact(data: PipInstallCompact): string {
  if (!data.success) {
    const lines = [
      `pip install failed${data.exitCode !== undefined ? ` (exit code ${data.exitCode})` : ""}.`,
    ];
    if (data.error) lines.push(data.error);
    return lines.join("\n");
  }
  if (data.alreadySatisfied) return "All requirements already satisfied.";
  const verb = data.dryRun ? "Would install" : "Installed";
  return `${verb} packages.`;
}

/** Compact pip-audit vulnerability entry: identity + fix versions, truncated description. */
export interface PipAuditVulnCompact {
  name: string;
  version: string;
  id: string;
  description: string;
  fixVersions: string[];
  severity?: string;
}

/** Compact pip-audit: total + severity counts + first-N vulnerability identities. */
export interface PipAuditResultCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  severityCounts?: Record<string, number>;
  vulnerabilities?: PipAuditVulnCompact[];
  truncated?: boolean;
  skippedCount?: number;
  error?: string;
  exitCode?: number;
}

export function compactPipAuditMap(data: PipAuditResult): PipAuditResultCompact {
  const vulns = data.vulnerabilities ?? [];
  const compact: PipAuditResultCompact = {
    success: data.success,
    total: vulns.length,
  };
  if (vulns.length > 0) {
    const severityCounts: Record<string, number> = {};
    for (const v of vulns) {
      const severity = v.severity ?? "unknown";
      severityCounts[severity] = (severityCounts[severity] ?? 0) + 1;
    }
    compact.severityCounts = severityCounts;
    compact.vulnerabilities = vulns.slice(0, COMPACT_MAX_VULNS).map((v) => ({
      name: v.name,
      version: v.version,
      id: v.id,
      description:
        v.description.length > COMPACT_VULN_DESCRIPTION_MAX
          ? v.description.slice(0, COMPACT_VULN_DESCRIPTION_MAX) + "…"
          : v.description,
      fixVersions: v.fixVersions,
      ...(v.severity ? { severity: v.severity } : {}),
    }));
    if (vulns.length > COMPACT_MAX_VULNS) compact.truncated = true;
  }
  if (data.skipped && data.skipped.length > 0) compact.skippedCount = data.skipped.length;
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatPipAuditCompact(data: PipAuditResultCompact): string {
  if (data.error && data.total === 0) {
    return [
      `pip-audit: audit failed (exit code ${data.exitCode ?? "?"}) — result is NOT a clean scan.`,
      data.error,
    ].join("\n");
  }
  if (data.total === 0) return "No vulnerabilities found.";

  const severityPart = data.severityCounts
    ? ` (${Object.entries(data.severityCounts)
        .map(([sev, count]) => `${count} ${sev}`)
        .join(", ")})`
    : "";
  const lines = [`${data.total} vulnerabilities${severityPart}:`];
  for (const v of data.vulnerabilities ?? []) {
    const fix = v.fixVersions.length ? ` (fix: ${v.fixVersions.join(", ")})` : "";
    const severity = v.severity ? ` [${v.severity}]` : "";
    lines.push(`  ${v.name}==${v.version} ${v.id}${severity}${fix}`);
  }
  if (data.truncated) {
    lines.push(
      `  … ${data.total - (data.vulnerabilities ?? []).length} more omitted (run with compact:false for the full list)`,
    );
  }
  return lines.join("\n");
}

/** Compact uv-install: success + error info. Drop individual packages. */
export interface UvInstallCompact {
  [key: string]: unknown;
  success: boolean;
  alreadySatisfied?: boolean;
  error?: string;
  resolutionConflicts?: { package: string; constraint: string }[];
}

export function compactUvInstallMap(data: UvInstall): UvInstallCompact {
  return {
    success: data.success,
    alreadySatisfied: data.alreadySatisfied,
    error: data.error,
    resolutionConflicts: data.resolutionConflicts,
  };
}

export function formatUvInstallCompact(data: UvInstallCompact): string {
  if (!data.success) {
    if (data.resolutionConflicts && data.resolutionConflicts.length > 0) {
      return `uv install failed: ${data.resolutionConflicts.length} resolution conflicts.`;
    }
    return "uv install failed.";
  }
  if (data.alreadySatisfied) return "All requirements already satisfied.";
  return "Installed packages.";
}

/** Compact uv-run: exitCode + truncated stdout/stderr streams (the #983/#1020 pattern).
 *  Streams are trimmed to the shared compact budget instead of being dropped. */
export interface UvRunCompact extends CompactStreamFields {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  truncated?: boolean;
}

export function compactUvRunMap(data: UvRun): UvRunCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
    truncated: data.truncated,
    ...compactStreamFields(data.stdout, data.commandStderr ?? data.stderr),
  };
}

export function formatUvRunCompact(data: UvRunCompact): string {
  const status = data.success ? "completed" : `failed (exit ${data.exitCode})`;
  const truncated = data.truncated ? " (truncated)" : "";
  const lines = [`uv run ${status}${truncated}`];
  if (data.stdout?.trim()) {
    lines.push("stdout:", data.stdout.trim());
  }
  if (data.stderr?.trim()) {
    lines.push("stderr:", data.stderr.trim());
  }
  if (data.stdoutTruncated || data.stderrTruncated) {
    lines.push("… streams truncated to compact budget (run with compact:false for full output)");
  }
  return lines.join("\n");
}

// ── pip-list formatters ──────────────────────────────────────────────

/** Formats structured pip list results into a human-readable package listing. */
export function formatPipList(data: PipList): string {
  if (data.error) return `pip list error: ${data.error}`;
  const packages = data.packages ?? [];
  const total = packages.length;
  if (total === 0) return "No packages installed.";

  const lines = [`${total} packages installed:`];
  for (const pkg of packages) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Compact pip-list package entry: name/version (+ latest when outdated=true). */
export interface PipListPackageCompact {
  name: string;
  version: string;
  latestVersion?: string;
}

/** Compact pip-list: total + first-N name/version pairs. Drop location metadata. */
export interface PipListCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  packages?: PipListPackageCompact[];
  truncated?: boolean;
  error?: string;
}

export function compactPipListMap(data: PipList): PipListCompact {
  const packages = data.packages ?? [];
  const compact: PipListCompact = {
    success: data.success,
    total: packages.length,
    error: data.error,
  };
  if (packages.length > 0) {
    compact.packages = packages.slice(0, COMPACT_MAX_ENTRIES).map((p) => ({
      name: p.name,
      version: p.version,
      ...(p.latestVersion ? { latestVersion: p.latestVersion } : {}),
    }));
    if (packages.length > COMPACT_MAX_ENTRIES) compact.truncated = true;
  }
  return compact;
}

export function formatPipListCompact(data: PipListCompact): string {
  if (data.error) return `pip list error: ${data.error}`;
  if (data.total === 0) return "No packages installed.";

  const lines = [`${data.total} packages installed:`];
  for (const pkg of data.packages ?? []) {
    const latest = pkg.latestVersion ? ` (latest: ${pkg.latestVersion})` : "";
    lines.push(`  ${pkg.name}==${pkg.version}${latest}`);
  }
  if (data.truncated) {
    lines.push(
      `  … ${data.total - (data.packages ?? []).length} more omitted (run with compact:false for the full list)`,
    );
  }
  return lines.join("\n");
}

// ── pip-show formatters ──────────────────────────────────────────────

/** Formats structured pip show results into a human-readable package info display. */
export function formatPipShow(data: PipShow): string {
  if (!data.name) return "Package not found.";

  // If multiple packages, format each
  if (data.packages && data.packages.length > 1) {
    const sections: string[] = [];
    for (const pkg of data.packages) {
      sections.push(formatSinglePipShowPackage(pkg));
    }
    return sections.join("\n---\n");
  }

  return formatSinglePipShowPackage(data);
}

function formatSinglePipShowPackage(pkg: {
  name: string;
  version: string;
  summary: string;
  homepage?: string;
  author?: string;
  authorEmail?: string;
  license?: string;
  location?: string;
  metadataVersion?: string;
  requires?: string[];
  requiredBy?: string[];
  classifiers?: string[];
}): string {
  const lines = [`${pkg.name}==${pkg.version}`];
  if (pkg.summary) lines.push(`  Summary: ${pkg.summary}`);
  if (pkg.author) lines.push(`  Author: ${pkg.author}`);
  if (pkg.authorEmail) lines.push(`  Author-email: ${pkg.authorEmail}`);
  if (pkg.license) lines.push(`  License: ${pkg.license}`);
  if (pkg.homepage) lines.push(`  Homepage: ${pkg.homepage}`);
  if (pkg.location) lines.push(`  Location: ${pkg.location}`);
  if (pkg.metadataVersion) lines.push(`  Metadata-Version: ${pkg.metadataVersion}`);
  const requires = pkg.requires ?? [];
  if (requires.length > 0) lines.push(`  Requires: ${requires.join(", ")}`);
  const requiredBy = pkg.requiredBy ?? [];
  if (requiredBy.length > 0) lines.push(`  Required-by: ${requiredBy.join(", ")}`);
  const classifiers = pkg.classifiers ?? [];
  if (classifiers.length > 0) lines.push(`  Classifiers: ${classifiers.join(", ")}`);
  return lines.join("\n");
}

/** Compact pip-show: name + version + summary only. Drop detailed metadata. */
export interface PipShowCompact {
  [key: string]: unknown;
  success: boolean;
  name: string;
  version: string;
  summary: string;
  requires: string[];
  packageCount: number;
}

export function compactPipShowMap(data: PipShow): PipShowCompact {
  return {
    success: data.success,
    name: data.name,
    version: data.version,
    summary: data.summary,
    requires: data.requires ?? [],
    packageCount: data.packages?.length ?? 1,
  };
}

export function formatPipShowCompact(data: PipShowCompact): string {
  if (!data.name) return "Package not found.";
  if (data.packageCount > 1) {
    return `${data.name}==${data.version}: ${data.summary} (+${data.packageCount - 1} more)`;
  }
  return `${data.name}==${data.version}: ${data.summary}`;
}

// ── ruff-format formatters ───────────────────────────────────────────

/** Formats structured ruff format results into a human-readable summary. */
export function formatRuffFormat(data: RuffFormatResult): string {
  if (data.error && data.filesChanged === 0) {
    return [`ruff format: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (data.success && data.filesChanged === 0) {
    const unchanged = data.filesUnchanged > 0 ? ` (${data.filesUnchanged} unchanged)` : "";
    return `ruff format: all files already formatted.${unchanged}`;
  }

  const lines: string[] = [];
  const verb = data.checkMode ? "would be reformatted" : "reformatted";
  const unchanged = data.filesUnchanged > 0 ? `, ${data.filesUnchanged} unchanged` : "";
  lines.push(`ruff format: ${data.filesChanged} files ${verb}${unchanged}`);

  if (data.files && data.files.length > 0) {
    for (const f of data.files) {
      lines.push(`  ${f}`);
    }
  }

  return lines.join("\n");
}

/** Compact ruff-format: success + filesChanged count + filesUnchanged + checkMode. Drop individual file lists. */
export interface RuffFormatResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged: number;
  checkMode?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactRuffFormatMap(data: RuffFormatResult): RuffFormatResultCompact {
  const compact: RuffFormatResultCompact = {
    success: data.success,
    filesChanged: data.filesChanged,
    filesUnchanged: data.filesUnchanged,
    checkMode: data.checkMode || undefined,
  };
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatRuffFormatCompact(data: RuffFormatResultCompact): string {
  if (data.error && data.filesChanged === 0) {
    return [`ruff format: run failed (exit code ${data.exitCode ?? "?"}).`, data.error].join("\n");
  }
  if (data.success && data.filesChanged === 0) {
    const unchanged = data.filesUnchanged > 0 ? ` (${data.filesUnchanged} unchanged)` : "";
    return `ruff format: all files already formatted.${unchanged}`;
  }
  const verb = data.checkMode ? "would be reformatted" : "reformatted";
  const unchanged = data.filesUnchanged > 0 ? `, ${data.filesUnchanged} unchanged` : "";
  return `ruff format: ${data.filesChanged} files ${verb}${unchanged}`;
}

// ── conda formatters ─────────────────────────────────────────────────

/** Formats structured conda list results into a human-readable package listing. */
export function formatCondaList(data: CondaList): string {
  if (data.parseError) return `conda list parse error: ${data.parseError}`;
  if (data.total === 0) return "conda: no packages found.";

  const env = data.environment ? ` (env: ${data.environment})` : "";
  const lines = [`conda list${env}: ${data.total} packages:`];
  for (const pkg of data.packages) {
    lines.push(`  ${pkg.name}==${pkg.version} (${pkg.channel})`);
  }
  return lines.join("\n");
}

/** Formats structured conda info results into a human-readable summary. */
export function formatCondaInfo(data: CondaInfo): string {
  if (data.parseError) return `conda info parse error: ${data.parseError}`;
  const lines = [
    `conda ${data.condaVersion}`,
    `  platform: ${data.platform}`,
    `  python: ${data.pythonVersion}`,
    `  default prefix: ${data.defaultPrefix}`,
  ];
  if (data.activePrefix) {
    lines.push(`  active prefix: ${data.activePrefix}`);
  }
  if (data.channels.length > 0) {
    lines.push(`  channels: ${data.channels.join(", ")}`);
  }
  return lines.join("\n");
}

/** Formats structured conda env list results into a human-readable listing. */
export function formatCondaEnvList(data: CondaEnvList): string {
  if (data.parseError) return `conda env list parse error: ${data.parseError}`;
  if (data.total === 0) return "conda: no environments found.";

  const lines = [`conda environments: ${data.total}`];
  for (const env of data.environments) {
    const marker = env.active ? " *" : "";
    lines.push(`  ${env.name}${marker}: ${env.path}`);
  }
  return lines.join("\n");
}

function formatCondaCreate(data: CondaCreate): string {
  if (!data.success) return `conda create failed: ${data.error || "unknown error"}`;
  const target = data.environment
    ? ` (${data.environment})`
    : data.prefix
      ? ` (${data.prefix})`
      : "";
  return `conda create${target}: ${data.totalAdded} packages added.`;
}

function formatCondaRemove(data: CondaRemove): string {
  if (!data.success) return `conda remove failed: ${data.error || "unknown error"}`;
  const target = data.environment
    ? ` (${data.environment})`
    : data.prefix
      ? ` (${data.prefix})`
      : "";
  return `conda remove${target}: ${data.totalRemoved} packages removed.`;
}

function formatCondaUpdate(data: CondaUpdate): string {
  if (!data.success) return `conda update failed: ${data.error || "unknown error"}`;
  const target = data.environment
    ? ` (${data.environment})`
    : data.prefix
      ? ` (${data.prefix})`
      : "";
  return `conda update${target}: ${data.totalUpdated} packages changed.`;
}

/** Formats any CondaResult variant into human-readable text. */
export function formatCondaResult(data: CondaResult): string {
  switch (data.action) {
    case "list":
      return formatCondaList(data as CondaList);
    case "info":
      return formatCondaInfo(data as CondaInfo);
    case "env-list":
      return formatCondaEnvList(data as CondaEnvList);
    case "create":
      return formatCondaCreate(data as CondaCreate);
    case "remove":
      return formatCondaRemove(data as CondaRemove);
    case "update":
      return formatCondaUpdate(data as CondaUpdate);
    default:
      return "conda: unknown action.";
  }
}

// ── conda compact formatters ─────────────────────────────────────────

/** Compact conda list: total count only. */
export interface CondaListCompact {
  [key: string]: unknown;
  action: "list";
  total: number;
  environment?: string;
  parseError?: string;
}

export function compactCondaListMap(data: CondaList): CondaListCompact {
  return {
    action: "list",
    total: data.total,
    environment: data.environment,
    parseError: data.parseError,
  };
}

export function formatCondaListCompact(data: CondaListCompact): string {
  if (data.parseError) return `conda list parse error: ${data.parseError}`;
  if (data.total === 0) return "conda: no packages found.";
  const env = data.environment ? ` (env: ${data.environment})` : "";
  return `conda list${env}: ${data.total} packages.`;
}

/** Compact conda info: version + platform only. */
export interface CondaInfoCompact {
  [key: string]: unknown;
  action: "info";
  condaVersion: string;
  platform: string;
  pythonVersion: string;
  parseError?: string;
}

export function compactCondaInfoMap(data: CondaInfo): CondaInfoCompact {
  return {
    action: "info",
    condaVersion: data.condaVersion,
    platform: data.platform,
    pythonVersion: data.pythonVersion,
    parseError: data.parseError,
  };
}

export function formatCondaInfoCompact(data: CondaInfoCompact): string {
  if (data.parseError) return `conda info parse error: ${data.parseError}`;
  return `conda ${data.condaVersion} (${data.platform}, python ${data.pythonVersion})`;
}

/** Compact conda env-list: total count only. */
export interface CondaEnvListCompact {
  [key: string]: unknown;
  action: "env-list";
  total: number;
  parseError?: string;
}

export function compactCondaEnvListMap(data: CondaEnvList): CondaEnvListCompact {
  return {
    action: "env-list",
    total: data.total,
    parseError: data.parseError,
  };
}

export function formatCondaEnvListCompact(data: CondaEnvListCompact): string {
  if (data.parseError) return `conda env list parse error: ${data.parseError}`;
  if (data.total === 0) return "conda: no environments found.";
  return `conda: ${data.total} environments.`;
}

/** Compact conda create/remove/update: success + count summary. */
export interface CondaCreateCompact {
  [key: string]: unknown;
  action: "create";
  success: boolean;
  totalAdded: number;
  error?: string;
}

export interface CondaRemoveCompact {
  [key: string]: unknown;
  action: "remove";
  success: boolean;
  totalRemoved: number;
  error?: string;
}

export interface CondaUpdateCompact {
  [key: string]: unknown;
  action: "update";
  success: boolean;
  totalUpdated: number;
  error?: string;
}

function compactCondaCreateMap(data: CondaCreate): CondaCreateCompact {
  return {
    action: "create",
    success: data.success,
    totalAdded: data.totalAdded,
    error: data.error,
  };
}

function compactCondaRemoveMap(data: CondaRemove): CondaRemoveCompact {
  return {
    action: "remove",
    success: data.success,
    totalRemoved: data.totalRemoved,
    error: data.error,
  };
}

function compactCondaUpdateMap(data: CondaUpdate): CondaUpdateCompact {
  return {
    action: "update",
    success: data.success,
    totalUpdated: data.totalUpdated,
    error: data.error,
  };
}

function formatCondaCreateCompact(data: CondaCreateCompact): string {
  if (!data.success) return "conda create failed.";
  return `conda create: ${data.totalAdded} packages added.`;
}

function formatCondaRemoveCompact(data: CondaRemoveCompact): string {
  if (!data.success) return "conda remove failed.";
  return `conda remove: ${data.totalRemoved} packages removed.`;
}

function formatCondaUpdateCompact(data: CondaUpdateCompact): string {
  if (!data.success) return "conda update failed.";
  return `conda update: ${data.totalUpdated} packages changed.`;
}

export type CondaResultCompact =
  | CondaListCompact
  | CondaInfoCompact
  | CondaEnvListCompact
  | CondaCreateCompact
  | CondaRemoveCompact
  | CondaUpdateCompact;

export function compactCondaResultMap(data: CondaResult): CondaResultCompact {
  switch (data.action) {
    case "list":
      return compactCondaListMap(data as CondaList);
    case "info":
      return compactCondaInfoMap(data as CondaInfo);
    case "env-list":
      return compactCondaEnvListMap(data as CondaEnvList);
    case "create":
      return compactCondaCreateMap(data as CondaCreate);
    case "remove":
      return compactCondaRemoveMap(data as CondaRemove);
    case "update":
      return compactCondaUpdateMap(data as CondaUpdate);
    default:
      return { action: "list", total: 0 };
  }
}

export function formatCondaResultCompact(data: CondaResultCompact): string {
  switch (data.action) {
    case "list":
      return formatCondaListCompact(data as CondaListCompact);
    case "info":
      return formatCondaInfoCompact(data as CondaInfoCompact);
    case "env-list":
      return formatCondaEnvListCompact(data as CondaEnvListCompact);
    case "create":
      return formatCondaCreateCompact(data as CondaCreateCompact);
    case "remove":
      return formatCondaRemoveCompact(data as CondaRemoveCompact);
    case "update":
      return formatCondaUpdateCompact(data as CondaUpdateCompact);
  }
}

// ── pyenv formatters ─────────────────────────────────────────────────

/** Formats structured pyenv results into a human-readable summary. */
export function formatPyenv(data: PyenvResult): string {
  if (!data.success) return `pyenv ${data.action} failed: ${data.error || "unknown error"}`;

  switch (data.action) {
    case "versions": {
      if (!data.versions || data.versions.length === 0) return "pyenv: no versions installed.";
      const lines = [`${data.versions.length} versions installed:`];
      for (const v of data.versions) {
        const marker = v === data.current ? " *" : "";
        lines.push(`  ${v}${marker}`);
      }
      return lines.join("\n");
    }
    case "version":
      return data.current ? `pyenv: current version is ${data.current}` : "pyenv: no version set.";
    case "installList": {
      const avail = data.availableVersions ?? [];
      if (avail.length === 0) return "pyenv: no versions available.";
      const lines = [`${avail.length} versions available for installation:`];
      for (const v of avail) {
        lines.push(`  ${v}`);
      }
      return lines.join("\n");
    }
    case "install":
      return data.installed
        ? `pyenv: installed Python ${data.installed}`
        : "pyenv: installation completed.";
    case "uninstall":
      return data.uninstalled
        ? `pyenv: uninstalled Python ${data.uninstalled}`
        : "pyenv: uninstall completed.";
    case "local":
      return data.localVersion
        ? `pyenv: local version set to ${data.localVersion}`
        : "pyenv: local version set.";
    case "global":
      return data.globalVersion
        ? `pyenv: global version set to ${data.globalVersion}`
        : "pyenv: global version set.";
    case "which":
      return data.commandPath
        ? `pyenv: resolved command path ${data.commandPath}`
        : "pyenv: command path not found.";
    case "rehash":
      return "pyenv: shims rehashed.";
  }
}

/** Compact pyenv: action + success + key value, keeping version lists for list
 *  actions (the whole point of calling them) with a cap on the huge installList. */
export interface PyenvResultCompact {
  [key: string]: unknown;
  action: string;
  success: boolean;
  keyValue?: string;
  versions?: string[];
  current?: string;
  availableVersionCount?: number;
  availableVersions?: string[];
  truncated?: boolean;
  error?: string;
}

export function compactPyenvMap(data: PyenvResult): PyenvResultCompact {
  const compact: PyenvResultCompact = {
    action: data.action,
    success: data.success,
  };
  if (data.error !== undefined) compact.error = data.error;

  if (data.action === "versions") {
    if (data.versions) compact.versions = data.versions;
    if (data.current) compact.current = data.current;
    return compact;
  }
  if (data.action === "installList") {
    const avail = data.availableVersions ?? [];
    compact.availableVersionCount = avail.length;
    if (avail.length > 0) {
      compact.availableVersions = avail.slice(0, COMPACT_MAX_ENTRIES);
      if (avail.length > COMPACT_MAX_ENTRIES) compact.truncated = true;
    }
    return compact;
  }

  let keyValue: string | undefined;
  if (data.action === "version") keyValue = data.current;
  if (data.action === "local") keyValue = data.localVersion;
  if (data.action === "global") keyValue = data.globalVersion;
  if (data.action === "install") keyValue = data.installed;
  if (data.action === "uninstall") keyValue = data.uninstalled;
  if (data.action === "which") keyValue = data.commandPath;
  compact.keyValue = keyValue;
  return compact;
}

export function formatPyenvCompact(data: PyenvResultCompact): string {
  if (!data.success) {
    return `pyenv ${data.action} failed${data.error ? `: ${data.error}` : "."}`;
  }
  if (data.versions) {
    const lines = [`${data.versions.length} versions installed:`];
    for (const v of data.versions) {
      const marker = v === data.current ? " *" : "";
      lines.push(`  ${v}${marker}`);
    }
    return lines.join("\n");
  }
  if (data.availableVersionCount !== undefined) {
    const lines = [`${data.availableVersionCount} versions available for installation:`];
    for (const v of data.availableVersions ?? []) {
      lines.push(`  ${v}`);
    }
    if (data.truncated) {
      lines.push(
        `  … ${data.availableVersionCount - (data.availableVersions ?? []).length} more omitted (run with compact:false for the full list)`,
      );
    }
    return lines.join("\n");
  }
  if (data.keyValue) return `pyenv ${data.action}: ${data.keyValue}`;
  return `pyenv ${data.action}: success.`;
}

// ── poetry formatters ────────────────────────────────────────────────

/** Formats structured poetry results into a human-readable summary.
 *  action is passed separately since it is not included in the output schema. */
export function formatPoetry(data: PoetryResult, action: string): string {
  if (!data.success) {
    const lines = [
      `poetry ${action} failed${data.exitCode !== undefined ? ` (exit code ${data.exitCode})` : ""}.`,
    ];
    for (const m of data.messages ?? []) {
      lines.push(`  ${m}`);
    }
    if (data.error) lines.push(data.error);
    return lines.join("\n");
  }

  if (action === "show") {
    const pkgs = data.packages ?? [];
    if (pkgs.length === 0) return "No packages found.";
    const lines = [`${pkgs.length} packages:`];
    for (const pkg of pkgs) {
      const desc = pkg.description ? ` - ${pkg.description}` : "";
      lines.push(`  ${pkg.name}==${pkg.version}${desc}`);
    }
    return lines.join("\n");
  }

  if (action === "build") {
    const arts = data.artifacts ?? [];
    if (arts.length === 0) return "poetry build: no artifacts produced.";
    const lines = [`Built ${arts.length} artifacts:`];
    for (const a of arts) {
      lines.push(`  ${a.file}`);
    }
    return lines.join("\n");
  }

  if (action === "check" || action === "lock" || action === "export") {
    const msgs = data.messages ?? [];
    if (msgs.length === 0) return `poetry ${action}: success.`;
    const lines = [`poetry ${action}:`];
    for (const m of msgs) {
      lines.push(`  ${m}`);
    }
    return lines.join("\n");
  }

  // install, add, remove, update
  const pkgs = data.packages ?? [];
  if (pkgs.length === 0) return `poetry ${action}: no changes.`;
  const lines = [`poetry ${action}: ${pkgs.length} packages:`];
  for (const pkg of pkgs) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Compact poetry: counts + first-N entries per collection. Drop descriptions.
 *  action is not in the Zod schema so it must not appear in compact output. */
export interface PoetryResultCompact {
  [key: string]: unknown;
  success: boolean;
  packageCount?: number;
  packages?: { name: string; version: string }[];
  artifactCount?: number;
  artifacts?: { file: string }[];
  messageCount?: number;
  messages?: string[];
  truncated?: boolean;
  error?: string;
  exitCode?: number;
}

export function compactPoetryMap(data: PoetryResult): PoetryResultCompact {
  const compact: PoetryResultCompact = {
    success: data.success,
  };
  if (data.packages) {
    compact.packageCount = data.packages.length;
    compact.packages = data.packages
      .slice(0, COMPACT_MAX_ENTRIES)
      .map((p) => ({ name: p.name, version: p.version }));
    if (data.packages.length > COMPACT_MAX_ENTRIES) compact.truncated = true;
  }
  if (data.artifacts) {
    compact.artifactCount = data.artifacts.length;
    compact.artifacts = data.artifacts.slice(0, COMPACT_MAX_ENTRIES).map((a) => ({ file: a.file }));
    if (data.artifacts.length > COMPACT_MAX_ENTRIES) compact.truncated = true;
  }
  if (data.messages) {
    compact.messageCount = data.messages.length;
    compact.messages = data.messages.slice(0, COMPACT_MAX_MESSAGES);
    if (data.messages.length > COMPACT_MAX_MESSAGES) compact.truncated = true;
  }
  if (data.error !== undefined) compact.error = data.error;
  if (data.exitCode !== undefined) compact.exitCode = data.exitCode;
  return compact;
}

export function formatPoetryCompact(data: PoetryResultCompact): string {
  const lines = [data.success ? "poetry: success." : "poetry: failed."];
  if (data.packageCount !== undefined) {
    lines.push(`${data.packageCount} packages:`);
    for (const pkg of data.packages ?? []) {
      lines.push(`  ${pkg.name}==${pkg.version}`);
    }
  }
  if (data.artifactCount !== undefined) {
    lines.push(`${data.artifactCount} artifacts:`);
    for (const a of data.artifacts ?? []) {
      lines.push(`  ${a.file}`);
    }
  }
  if (data.messages && data.messages.length > 0) {
    for (const m of data.messages) {
      lines.push(`  ${m}`);
    }
  }
  if (data.truncated) {
    lines.push("  … entries omitted (run with compact:false for the full list)");
  }
  if (data.error) lines.push(data.error);
  return lines.join("\n");
}
