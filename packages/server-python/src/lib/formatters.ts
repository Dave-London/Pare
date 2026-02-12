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
} from "../schemas/index.js";

/** Formats structured pip install results into a human-readable summary of installed packages. */
export function formatPipInstall(data: PipInstall): string {
  if (data.alreadySatisfied && data.total === 0) return "All requirements already satisfied.";
  if (!data.success) return "pip install failed.";

  const lines = [`Installed ${data.total} packages:`];
  for (const pkg of data.installed) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured mypy type-check results into a human-readable diagnostic summary. */
export function formatMypy(data: MypyResult): string {
  if (data.success && data.total === 0) return "mypy: no errors found.";

  const lines = [`mypy: ${data.errors} errors, ${data.warnings} warnings/notes`];
  for (const d of data.diagnostics) {
    const col = d.column ? `:${d.column}` : "";
    const code = d.code ? ` [${d.code}]` : "";
    lines.push(`  ${d.file}:${d.line}${col} ${d.severity}: ${d.message}${code}`);
  }
  return lines.join("\n");
}

/** Formats structured ruff lint results into a human-readable diagnostic listing. */
export function formatRuff(data: RuffResult): string {
  if (data.total === 0) return "ruff: no issues found.";

  const lines = [`ruff: ${data.total} issues (${data.fixable} fixable)`];
  for (const d of data.diagnostics) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured pip-audit vulnerability results into a human-readable security report. */
export function formatPipAudit(data: PipAuditResult): string {
  if (data.total === 0) return "No vulnerabilities found.";

  const lines = [`${data.total} vulnerabilities:`];
  for (const v of data.vulnerabilities) {
    const fix = v.fixVersions.length ? ` (fix: ${v.fixVersions.join(", ")})` : "";
    lines.push(`  ${v.name}==${v.version} ${v.id}: ${v.description}${fix}`);
  }
  return lines.join("\n");
}

/** Formats structured pytest results into a human-readable test summary. */
export function formatPytest(data: PytestResult): string {
  if (data.total === 0) return "pytest: no tests collected.";

  const parts: string[] = [];
  if (data.passed > 0) parts.push(`${data.passed} passed`);
  if (data.failed > 0) parts.push(`${data.failed} failed`);
  if (data.errors > 0) parts.push(`${data.errors} errors`);
  if (data.skipped > 0) parts.push(`${data.skipped} skipped`);

  const lines = [`pytest: ${parts.join(", ")} in ${data.duration}s`];

  for (const f of data.failures) {
    lines.push(`  FAILED ${f.test}: ${f.message}`);
  }

  return lines.join("\n");
}

/** Formats structured uv install results into a human-readable summary. */
export function formatUvInstall(data: UvInstall): string {
  if (!data.success) return "uv install failed.";
  if (data.total === 0) return "All requirements already satisfied.";

  const lines = [`Installed ${data.total} packages in ${data.duration}s:`];
  for (const pkg of data.installed) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured uv run results into a human-readable summary. */
export function formatUvRun(data: UvRun): string {
  const status = data.success ? "completed" : `failed (exit ${data.exitCode})`;
  const lines = [`uv run ${status} in ${data.duration}s`];

  if (data.stdout.trim()) {
    lines.push("stdout:", data.stdout.trim());
  }
  if (data.stderr.trim()) {
    lines.push("stderr:", data.stderr.trim());
  }

  return lines.join("\n");
}

/** Formats structured Black formatter results into a human-readable summary. */
export function formatBlack(data: BlackResult): string {
  if (data.filesChecked === 0) return "black: no Python files found.";

  if (data.success && data.filesChanged === 0) {
    return `black: ${data.filesUnchanged} files already formatted.`;
  }

  const lines: string[] = [];
  if (data.wouldReformat.length > 0) {
    lines.push(
      `black: ${data.filesChanged} files ${data.success ? "reformatted" : "would be reformatted"}, ${data.filesUnchanged} unchanged`,
    );
    for (const f of data.wouldReformat) {
      lines.push(`  ${f}`);
    }
  } else {
    lines.push(`black: ${data.filesChanged} files reformatted, ${data.filesUnchanged} unchanged`);
  }

  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact pytest: counts + duration + failure test names only (no stack traces). */
export interface PytestResultCompact {
  [key: string]: unknown;
  success: boolean;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  total: number;
  duration: number;
  failedTests: string[];
}

export function compactPytestMap(data: PytestResult): PytestResultCompact {
  return {
    success: data.success,
    passed: data.passed,
    failed: data.failed,
    errors: data.errors,
    skipped: data.skipped,
    total: data.total,
    duration: data.duration,
    failedTests: data.failures.map((f) => f.test),
  };
}

export function formatPytestCompact(data: PytestResultCompact): string {
  if (data.total === 0) return "pytest: no tests collected.";

  const parts: string[] = [];
  if (data.passed > 0) parts.push(`${data.passed} passed`);
  if (data.failed > 0) parts.push(`${data.failed} failed`);
  if (data.errors > 0) parts.push(`${data.errors} errors`);
  if (data.skipped > 0) parts.push(`${data.skipped} skipped`);

  const lines = [`pytest: ${parts.join(", ")} in ${data.duration}s`];
  for (const t of data.failedTests) {
    lines.push(`  FAILED ${t}`);
  }
  return lines.join("\n");
}

/** Compact mypy: success + diagnostic counts per severity. Drop individual diagnostics. */
export interface MypyResultCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  errors: number;
  warnings: number;
}

export function compactMypyMap(data: MypyResult): MypyResultCompact {
  return {
    success: data.success,
    total: data.total,
    errors: data.errors,
    warnings: data.warnings,
  };
}

export function formatMypyCompact(data: MypyResultCompact): string {
  if (data.success && data.total === 0) return "mypy: no errors found.";
  return `mypy: ${data.errors} errors, ${data.warnings} warnings/notes (${data.total} total)`;
}

/** Compact ruff: success + diagnostic count. Drop individual entries. */
export interface RuffResultCompact {
  [key: string]: unknown;
  total: number;
  fixable: number;
}

export function compactRuffMap(data: RuffResult): RuffResultCompact {
  return {
    total: data.total,
    fixable: data.fixable,
  };
}

export function formatRuffCompact(data: RuffResultCompact): string {
  if (data.total === 0) return "ruff: no issues found.";
  return `ruff: ${data.total} issues (${data.fixable} fixable)`;
}

/** Compact black: success + changed/unchanged counts. Drop individual file lists. */
export interface BlackResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged: number;
  filesChecked: number;
}

export function compactBlackMap(data: BlackResult): BlackResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
    filesUnchanged: data.filesUnchanged,
    filesChecked: data.filesChecked,
  };
}

export function formatBlackCompact(data: BlackResultCompact): string {
  if (data.filesChecked === 0) return "black: no Python files found.";
  if (data.filesChanged === 0) return `black: ${data.filesUnchanged} files already formatted.`;
  return `black: ${data.filesChanged} reformatted, ${data.filesUnchanged} unchanged`;
}

/** Compact pip-install: success + installed count. Drop individual package details. */
export interface PipInstallCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  alreadySatisfied: boolean;
}

export function compactPipInstallMap(data: PipInstall): PipInstallCompact {
  return {
    success: data.success,
    total: data.total,
    alreadySatisfied: data.alreadySatisfied,
  };
}

export function formatPipInstallCompact(data: PipInstallCompact): string {
  if (data.alreadySatisfied && data.total === 0) return "All requirements already satisfied.";
  if (!data.success) return "pip install failed.";
  return `Installed ${data.total} packages.`;
}

/** Compact pip-audit: success + vulnerability count. Drop individual CVE details. */
export interface PipAuditResultCompact {
  [key: string]: unknown;
  total: number;
}

export function compactPipAuditMap(data: PipAuditResult): PipAuditResultCompact {
  return {
    total: data.total,
  };
}

export function formatPipAuditCompact(data: PipAuditResultCompact): string {
  if (data.total === 0) return "No vulnerabilities found.";
  return `${data.total} vulnerabilities found.`;
}

/** Compact uv-install: success + installed count + duration. Drop individual packages. */
export interface UvInstallCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  duration: number;
}

export function compactUvInstallMap(data: UvInstall): UvInstallCompact {
  return {
    success: data.success,
    total: data.total,
    duration: data.duration,
  };
}

export function formatUvInstallCompact(data: UvInstallCompact): string {
  if (!data.success) return "uv install failed.";
  if (data.total === 0) return "All requirements already satisfied.";
  return `Installed ${data.total} packages in ${data.duration}s.`;
}

/** Compact uv-run: exitCode + duration. Drop stdout/stderr. */
export interface UvRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  duration: number;
}

export function compactUvRunMap(data: UvRun): UvRunCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
    duration: data.duration,
  };
}

export function formatUvRunCompact(data: UvRunCompact): string {
  const status = data.success ? "completed" : `failed (exit ${data.exitCode})`;
  return `uv run ${status} in ${data.duration}s`;
}

// ── pip-list formatters ──────────────────────────────────────────────

/** Formats structured pip list results into a human-readable package listing. */
export function formatPipList(data: PipList): string {
  if (data.total === 0) return "No packages installed.";

  const lines = [`${data.total} packages installed:`];
  for (const pkg of data.packages) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Compact pip-list: total count only. Drop individual package details. */
export interface PipListCompact {
  [key: string]: unknown;
  total: number;
}

export function compactPipListMap(data: PipList): PipListCompact {
  return {
    total: data.total,
  };
}

export function formatPipListCompact(data: PipListCompact): string {
  if (data.total === 0) return "No packages installed.";
  return `${data.total} packages installed.`;
}

// ── pip-show formatters ──────────────────────────────────────────────

/** Formats structured pip show results into a human-readable package info display. */
export function formatPipShow(data: PipShow): string {
  if (!data.name) return "Package not found.";

  const lines = [`${data.name}==${data.version}`];
  if (data.summary) lines.push(`  Summary: ${data.summary}`);
  if (data.author) lines.push(`  Author: ${data.author}`);
  if (data.license) lines.push(`  License: ${data.license}`);
  if (data.homepage) lines.push(`  Homepage: ${data.homepage}`);
  if (data.location) lines.push(`  Location: ${data.location}`);
  if (data.requires.length > 0) lines.push(`  Requires: ${data.requires.join(", ")}`);
  return lines.join("\n");
}

/** Compact pip-show: name + version + summary only. Drop detailed metadata. */
export interface PipShowCompact {
  [key: string]: unknown;
  name: string;
  version: string;
  summary: string;
}

export function compactPipShowMap(data: PipShow): PipShowCompact {
  return {
    name: data.name,
    version: data.version,
    summary: data.summary,
  };
}

export function formatPipShowCompact(data: PipShowCompact): string {
  if (!data.name) return "Package not found.";
  return `${data.name}==${data.version}: ${data.summary}`;
}

// ── ruff-format formatters ───────────────────────────────────────────

/** Formats structured ruff format results into a human-readable summary. */
export function formatRuffFormat(data: RuffFormatResult): string {
  if (data.success && data.filesChanged === 0) {
    return "ruff format: all files already formatted.";
  }

  const lines: string[] = [];
  const verb = data.success ? "reformatted" : "would be reformatted";
  lines.push(`ruff format: ${data.filesChanged} files ${verb}`);

  if (data.files && data.files.length > 0) {
    for (const f of data.files) {
      lines.push(`  ${f}`);
    }
  }

  return lines.join("\n");
}

/** Compact ruff-format: success + filesChanged count. Drop individual file lists. */
export interface RuffFormatResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
}

export function compactRuffFormatMap(data: RuffFormatResult): RuffFormatResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
  };
}

export function formatRuffFormatCompact(data: RuffFormatResultCompact): string {
  if (data.success && data.filesChanged === 0) {
    return "ruff format: all files already formatted.";
  }
  const verb = data.success ? "reformatted" : "would be reformatted";
  return `ruff format: ${data.filesChanged} files ${verb}`;
}
