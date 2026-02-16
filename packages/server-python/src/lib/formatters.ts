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
  CondaResult,
  PyenvResult,
  PoetryResult,
} from "../schemas/index.js";

/** Formats structured pip install results into a human-readable summary of installed packages. */
export function formatPipInstall(data: PipInstall): string {
  if (data.alreadySatisfied && data.total === 0) return "All requirements already satisfied.";
  if (!data.success) return "pip install failed.";

  const verb = data.dryRun ? "Would install" : "Installed";
  const lines = [`${verb} ${data.total} packages:`];
  for (const pkg of data.installed ?? []) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured mypy type-check results into a human-readable diagnostic summary. */
export function formatMypy(data: MypyResult): string {
  if (data.success && data.total === 0) return "mypy: no errors found.";

  const lines = [`mypy: ${data.errors} errors, ${data.warnings} warnings/notes`];
  for (const d of data.diagnostics ?? []) {
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
  for (const d of data.diagnostics ?? []) {
    lines.push(`  ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured pip-audit vulnerability results into a human-readable security report. */
export function formatPipAudit(data: PipAuditResult): string {
  if (data.total === 0) return "No vulnerabilities found.";

  const lines = [`${data.total} vulnerabilities:`];
  for (const v of data.vulnerabilities ?? []) {
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

  for (const f of data.failures ?? []) {
    lines.push(`  FAILED ${f.test}: ${f.message}`);
  }

  return lines.join("\n");
}

/** Formats structured uv install results into a human-readable summary. */
export function formatUvInstall(data: UvInstall): string {
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
  if (data.total === 0) return "All requirements already satisfied.";

  const lines = [`Installed ${data.total} packages in ${data.duration}s:`];
  for (const pkg of data.installed ?? []) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Formats structured uv run results into a human-readable summary. */
export function formatUvRun(data: UvRun): string {
  const status = data.success ? "completed" : `failed (exit ${data.exitCode})`;
  const lines = [`uv run ${status} in ${data.duration}s`];

  if (data.stdout?.trim()) {
    lines.push("stdout:", data.stdout.trim());
  }
  if (data.stderr?.trim()) {
    lines.push("stderr:", data.stderr.trim());
  }

  return lines.join("\n");
}

/** Formats structured Black formatter results into a human-readable summary. */
export function formatBlack(data: BlackResult): string {
  if (data.errorType === "internal_error") {
    return "black: internal error (exit 123). Check for syntax errors.";
  }

  if (data.filesChecked === 0) return "black: no Python files found.";

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
    failedTests: (data.failures ?? []).map((f) => f.test),
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
  success: boolean;
  total: number;
  fixable: number;
}

export function compactRuffMap(data: RuffResult): RuffResultCompact {
  return {
    success: data.success,
    total: data.total,
    fixable: data.fixable,
  };
}

export function formatRuffCompact(data: RuffResultCompact): string {
  if (data.total === 0) return "ruff: no issues found.";
  return `ruff: ${data.total} issues (${data.fixable} fixable)`;
}

/** Compact black: success + changed/unchanged counts + errorType. Drop individual file lists. */
export interface BlackResultCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  filesUnchanged: number;
  filesChecked: number;
  errorType?: "check_failed" | "internal_error";
}

export function compactBlackMap(data: BlackResult): BlackResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
    filesUnchanged: data.filesUnchanged,
    filesChecked: data.filesChecked,
    errorType: data.errorType,
  };
}

export function formatBlackCompact(data: BlackResultCompact): string {
  if (data.errorType === "internal_error") {
    return "black: internal error (exit 123).";
  }
  if (data.filesChecked === 0) return "black: no Python files found.";
  if (data.filesChanged === 0) return `black: ${data.filesUnchanged} files already formatted.`;
  return `black: ${data.filesChanged} reformatted, ${data.filesUnchanged} unchanged`;
}

/** Compact pip-install: success + installed count + dryRun. Drop individual package details. */
export interface PipInstallCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  alreadySatisfied: boolean;
  dryRun?: boolean;
}

export function compactPipInstallMap(data: PipInstall): PipInstallCompact {
  return {
    success: data.success,
    total: data.total,
    alreadySatisfied: data.alreadySatisfied,
    dryRun: data.dryRun || undefined,
  };
}

export function formatPipInstallCompact(data: PipInstallCompact): string {
  if (data.alreadySatisfied && data.total === 0) return "All requirements already satisfied.";
  if (!data.success) return "pip install failed.";
  const verb = data.dryRun ? "Would install" : "Installed";
  return `${verb} ${data.total} packages.`;
}

/** Compact pip-audit: success + vulnerability count. Drop individual CVE details. */
export interface PipAuditResultCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactPipAuditMap(data: PipAuditResult): PipAuditResultCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatPipAuditCompact(data: PipAuditResultCompact): string {
  if (data.total === 0) return "No vulnerabilities found.";
  return `${data.total} vulnerabilities found.`;
}

/** Compact uv-install: success + installed count + duration + error info. Drop individual packages. */
export interface UvInstallCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  duration: number;
  error?: string;
  resolutionConflicts?: { package: string; constraint: string }[];
}

export function compactUvInstallMap(data: UvInstall): UvInstallCompact {
  return {
    success: data.success,
    total: data.total,
    duration: data.duration,
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
  for (const pkg of data.packages ?? []) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Compact pip-list: total count only. Drop individual package details. */
export interface PipListCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactPipListMap(data: PipList): PipListCompact {
  return {
    success: data.success,
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
  if (data.authorEmail) lines.push(`  Author-email: ${data.authorEmail}`);
  if (data.license) lines.push(`  License: ${data.license}`);
  if (data.homepage) lines.push(`  Homepage: ${data.homepage}`);
  if (data.location) lines.push(`  Location: ${data.location}`);
  if (data.metadataVersion) lines.push(`  Metadata-Version: ${data.metadataVersion}`);
  const requires = data.requires ?? [];
  if (requires.length > 0) lines.push(`  Requires: ${requires.join(", ")}`);
  const requiredBy = data.requiredBy ?? [];
  if (requiredBy.length > 0) lines.push(`  Required-by: ${requiredBy.join(", ")}`);
  const classifiers = data.classifiers ?? [];
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
}

export function compactPipShowMap(data: PipShow): PipShowCompact {
  return {
    success: data.success,
    name: data.name,
    version: data.version,
    summary: data.summary,
    requires: data.requires ?? [],
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
}

export function compactRuffFormatMap(data: RuffFormatResult): RuffFormatResultCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
    filesUnchanged: data.filesUnchanged,
    checkMode: data.checkMode || undefined,
  };
}

export function formatRuffFormatCompact(data: RuffFormatResultCompact): string {
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
  if (data.total === 0) return "conda: no environments found.";

  const lines = [`conda environments: ${data.total}`];
  for (const env of data.environments) {
    const marker = env.active ? " *" : "";
    lines.push(`  ${env.name}${marker}: ${env.path}`);
  }
  return lines.join("\n");
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
}

export function compactCondaListMap(data: CondaList): CondaListCompact {
  return {
    action: "list",
    total: data.total,
    environment: data.environment,
  };
}

export function formatCondaListCompact(data: CondaListCompact): string {
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
}

export function compactCondaInfoMap(data: CondaInfo): CondaInfoCompact {
  return {
    action: "info",
    condaVersion: data.condaVersion,
    platform: data.platform,
    pythonVersion: data.pythonVersion,
  };
}

export function formatCondaInfoCompact(data: CondaInfoCompact): string {
  return `conda ${data.condaVersion} (${data.platform}, python ${data.pythonVersion})`;
}

/** Compact conda env-list: total count only. */
export interface CondaEnvListCompact {
  [key: string]: unknown;
  action: "env-list";
  total: number;
}

export function compactCondaEnvListMap(data: CondaEnvList): CondaEnvListCompact {
  return {
    action: "env-list",
    total: data.total,
  };
}

export function formatCondaEnvListCompact(data: CondaEnvListCompact): string {
  if (data.total === 0) return "conda: no environments found.";
  return `conda: ${data.total} environments.`;
}

export type CondaResultCompact = CondaListCompact | CondaInfoCompact | CondaEnvListCompact;

export function compactCondaResultMap(data: CondaResult): CondaResultCompact {
  switch (data.action) {
    case "list":
      return compactCondaListMap(data as CondaList);
    case "info":
      return compactCondaInfoMap(data as CondaInfo);
    case "env-list":
      return compactCondaEnvListMap(data as CondaEnvList);
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
    case "local":
      return data.localVersion
        ? `pyenv: local version set to ${data.localVersion}`
        : "pyenv: local version set.";
    case "global":
      return data.globalVersion
        ? `pyenv: global version set to ${data.globalVersion}`
        : "pyenv: global version set.";
  }
}

/** Compact pyenv: action + success + key value only. */
export interface PyenvResultCompact {
  [key: string]: unknown;
  action: string;
  success: boolean;
}

export function compactPyenvMap(data: PyenvResult): PyenvResultCompact {
  return {
    action: data.action,
    success: data.success,
  };
}

export function formatPyenvCompact(data: PyenvResultCompact): string {
  if (!data.success) return `pyenv ${data.action} failed.`;
  return `pyenv ${data.action}: success.`;
}

// ── poetry formatters ────────────────────────────────────────────────

/** Formats structured poetry results into a human-readable summary. */
export function formatPoetry(data: PoetryResult): string {
  if (!data.success) return `poetry ${data.action} failed.`;

  if (data.action === "show") {
    const pkgs = data.packages ?? [];
    if (pkgs.length === 0) return "No packages found.";
    const lines = [`${pkgs.length} packages:`];
    for (const pkg of pkgs) {
      const desc = pkg.description ? ` - ${pkg.description}` : "";
      lines.push(`  ${pkg.name}==${pkg.version}${desc}`);
    }
    return lines.join("\n");
  }

  if (data.action === "build") {
    const arts = data.artifacts ?? [];
    if (arts.length === 0) return "poetry build: no artifacts produced.";
    const lines = [`Built ${arts.length} artifacts:`];
    for (const a of arts) {
      lines.push(`  ${a.file}`);
    }
    return lines.join("\n");
  }

  // install, add, remove
  const pkgs = data.packages ?? [];
  if (pkgs.length === 0) return `poetry ${data.action}: no changes.`;
  const lines = [`poetry ${data.action}: ${pkgs.length} packages:`];
  for (const pkg of pkgs) {
    lines.push(`  ${pkg.name}==${pkg.version}`);
  }
  return lines.join("\n");
}

/** Compact poetry: success + action + total count. Drop individual package/artifact details. */
export interface PoetryResultCompact {
  [key: string]: unknown;
  success: boolean;
  action: string;
  total: number;
}

export function compactPoetryMap(data: PoetryResult): PoetryResultCompact {
  return {
    success: data.success,
    action: data.action,
    total: data.total,
  };
}

export function formatPoetryCompact(data: PoetryResultCompact): string {
  if (!data.success) return `poetry ${data.action} failed.`;

  if (data.action === "show") {
    if (data.total === 0) return "No packages found.";
    return `${data.total} packages installed.`;
  }

  if (data.action === "build") {
    if (data.total === 0) return "poetry build: no artifacts produced.";
    return `Built ${data.total} artifacts.`;
  }

  if (data.total === 0) return `poetry ${data.action}: no changes.`;
  return `poetry ${data.action}: ${data.total} packages.`;
}
