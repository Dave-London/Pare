import type {
  TrivyScanResult,
  TrivyScanResultInternal,
  SemgrepScanResult,
  SemgrepScanResultInternal,
  GitleaksScanResult,
  GitleaksScanResultInternal,
} from "../schemas/index.js";

/** Maximum number of findings/vulnerabilities kept in compact projections. */
export const COMPACT_MAX_FINDINGS = 20;

/** Builds the optional error/exitCode passthrough fields (set by surfaceEmptyFailure). */
function errorFields(data: { error?: string; exitCode?: number }): {
  error?: string;
  exitCode?: number;
} {
  return {
    ...(data.error !== undefined ? { error: data.error } : {}),
    ...(data.exitCode !== undefined ? { exitCode: data.exitCode } : {}),
  };
}

/** Appends the surfaced scan-failure error (if any) to formatter output lines. */
function pushErrorLines(lines: string[], data: { error?: string; exitCode?: number }): void {
  if (!data.error) return;
  lines.push("");
  lines.push(
    `Scan failed${data.exitCode !== undefined ? ` (exit code ${data.exitCode})` : ""} — results are NOT a clean scan:`,
  );
  lines.push(data.error);
}

// -- Schema maps (strip Internal-only fields for structuredContent) -----------

/** Strips Internal-only fields from Trivy scan result for structuredContent. */
export function schemaTrivyScanMap(data: TrivyScanResultInternal): TrivyScanResult {
  return {
    target: data.target,
    scanType: data.scanType,
    vulnerabilities: data.vulnerabilities?.map((v) => ({
      id: v.id,
      severity: v.severity,
      package: v.package,
      installedVersion: v.installedVersion,
      fixedVersion: v.fixedVersion,
      cvssScore: v.cvssScore,
    })),
    summary: data.summary,
    ...errorFields(data),
  };
}

/** Strips Internal-only fields from Semgrep scan result for structuredContent. */
export function schemaSemgrepScanMap(data: SemgrepScanResultInternal): SemgrepScanResult {
  return {
    findings: data.findings?.map((f) => ({
      ruleId: f.ruleId,
      path: f.path,
      startLine: f.startLine,
      endLine: f.endLine,
      message: f.message,
      severity: f.severity,
      cwe: f.cwe,
    })),
    errors: data.errors,
    summary: data.summary,
    ...errorFields(data),
  };
}

/** Strips Internal-only fields from Gitleaks scan result for structuredContent. */
export function schemaGitleaksScanMap(data: GitleaksScanResultInternal): GitleaksScanResult {
  return {
    findings: data.findings?.map((f) => ({
      ruleID: f.ruleID,
      match: f.match,
      secret: f.secret,
      file: f.file,
      startLine: f.startLine,
      endLine: f.endLine,
      commit: f.commit,
    })),
    ...errorFields(data),
  };
}

// -- Full formatters ----------------------------------------------------------

/** Formats a Trivy scan result into human-readable text. */
export function formatTrivyScan(data: TrivyScanResultInternal): string {
  const lines: string[] = [];

  lines.push(`Trivy ${data.scanType} scan: ${data.target}`);
  lines.push(
    `Found ${data.totalVulnerabilities} vulnerabilities: ` +
      `${data.summary.critical} critical, ${data.summary.high} high, ` +
      `${data.summary.medium} medium, ${data.summary.low} low, ` +
      `${data.summary.unknown} unknown`,
  );

  if ((data.vulnerabilities ?? []).length > 0) {
    lines.push("");
    for (const v of data.vulnerabilities ?? []) {
      const fixed = v.fixedVersion ? ` -> ${v.fixedVersion}` : "";
      const title = v.title ? ` - ${v.title}` : "";
      const cvss = v.cvssScore !== undefined ? ` (CVSS ${v.cvssScore})` : "";
      lines.push(
        `  [${v.severity}] ${v.id}: ${v.package}@${v.installedVersion}${fixed}${cvss}${title}`,
      );
    }
  }

  pushErrorLines(lines, data);

  return lines.join("\n");
}

// -- Compact types, mappers, and formatters -----------------------------------

/** Compact scan result: severity summary plus the top critical/high
 * vulnerabilities (schema-compatible). */
export interface TrivyScanCompact {
  [key: string]: unknown;
  target: string;
  scanType: "image" | "fs" | "config";
  vulnerabilities?: Array<{
    id: string;
    severity: string;
    package: string;
    installedVersion: string;
    fixedVersion?: string;
  }>;
  vulnerabilitiesTruncated?: true;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  error?: string;
  exitCode?: number;
}

export function compactTrivyScanMap(data: TrivyScanResultInternal): TrivyScanCompact {
  const all = data.vulnerabilities ?? [];
  const topSeverity = all.filter((v) => v.severity === "CRITICAL" || v.severity === "HIGH");
  const kept = topSeverity.slice(0, COMPACT_MAX_FINDINGS).map((v) => ({
    id: v.id,
    severity: v.severity,
    package: v.package,
    installedVersion: v.installedVersion,
    ...(v.fixedVersion !== undefined ? { fixedVersion: v.fixedVersion } : {}),
  }));
  const truncated = kept.length < all.length;
  return {
    target: data.target,
    scanType: data.scanType,
    ...(kept.length > 0 ? { vulnerabilities: kept } : {}),
    ...(truncated ? { vulnerabilitiesTruncated: true as const } : {}),
    summary: data.summary,
    ...errorFields(data),
  };
}

export function formatTrivyScanCompact(data: TrivyScanCompact): string {
  const total =
    data.summary.critical +
    data.summary.high +
    data.summary.medium +
    data.summary.low +
    data.summary.unknown;
  const lines: string[] = [
    `Trivy ${data.scanType} scan: ${data.target} -- ` +
      `${total} vulnerabilities ` +
      `(${data.summary.critical}C/${data.summary.high}H/${data.summary.medium}M/${data.summary.low}L)`,
  ];
  for (const v of data.vulnerabilities ?? []) {
    const fixed = v.fixedVersion ? ` -> ${v.fixedVersion}` : "";
    lines.push(`  [${v.severity}] ${v.id}: ${v.package}@${v.installedVersion}${fixed}`);
  }
  if (data.vulnerabilitiesTruncated) {
    lines.push(`  ... (list truncated; totals per severity above)`);
  }
  pushErrorLines(lines, data);
  return lines.join("\n");
}

// -- Semgrep formatters -------------------------------------------------------

/** Formats a Semgrep scan result into human-readable text. */
export function formatSemgrepScan(data: SemgrepScanResultInternal): string {
  const lines: string[] = [];

  lines.push(`Semgrep scan (config: ${data.config})`);
  lines.push(
    `Found ${data.totalFindings} findings: ` +
      `${data.summary.error} error, ${data.summary.warning} warning, ` +
      `${data.summary.info} info`,
  );

  if ((data.findings ?? []).length > 0) {
    lines.push("");
    for (const f of data.findings ?? []) {
      const category = f.category ? ` [${f.category}]` : "";
      const cwe = (f.cwe ?? []).length > 0 ? ` CWE: ${(f.cwe ?? []).join(",")}` : "";
      lines.push(`  [${f.severity}] ${f.ruleId}: ${f.path}:${f.startLine}-${f.endLine}${category}`);
      lines.push(`    ${f.message}${cwe}`);
    }
  }

  if ((data.errors ?? []).length > 0) {
    lines.push("");
    lines.push(`Errors: ${data.errors?.length ?? 0}`);
    for (const err of data.errors ?? []) {
      const type = err.type ? `[${err.type}] ` : "";
      const path = err.path ? ` (${err.path})` : "";
      lines.push(`  ${type}${err.message}${path}`);
    }
  }

  pushErrorLines(lines, data);

  return lines.join("\n");
}

// -- Semgrep compact types, mappers, and formatters ---------------------------

/** Compact scan result: severity summary plus the top findings and any scan
 * errors (schema-compatible). */
export interface SemgrepScanCompact {
  [key: string]: unknown;
  findings?: Array<{
    ruleId: string;
    path: string;
    startLine: number;
    endLine: number;
    message: string;
    severity: string;
  }>;
  findingsTruncated?: true;
  errors?: Array<{ type?: string; message: string; path?: string }>;
  summary: {
    error: number;
    warning: number;
    info: number;
  };
  error?: string;
  exitCode?: number;
}

export function compactSemgrepScanMap(data: SemgrepScanResultInternal): SemgrepScanCompact {
  const all = data.findings ?? [];
  const kept = all.slice(0, COMPACT_MAX_FINDINGS).map((f) => ({
    ruleId: f.ruleId,
    path: f.path,
    startLine: f.startLine,
    endLine: f.endLine,
    message: f.message,
    severity: f.severity,
  }));
  return {
    ...(kept.length > 0 ? { findings: kept } : {}),
    ...(kept.length < all.length ? { findingsTruncated: true as const } : {}),
    ...(data.errors && data.errors.length > 0 ? { errors: data.errors } : {}),
    summary: data.summary,
    ...errorFields(data),
  };
}

export function formatSemgrepScanCompact(data: SemgrepScanCompact): string {
  const total = data.summary.error + data.summary.warning + data.summary.info;
  const lines: string[] = [
    `Semgrep scan -- ` +
      `${total} findings ` +
      `(${data.summary.error}E/${data.summary.warning}W/${data.summary.info}I)`,
  ];
  for (const f of data.findings ?? []) {
    lines.push(`  [${f.severity}] ${f.ruleId}: ${f.path}:${f.startLine}-${f.endLine}`);
    lines.push(`    ${f.message}`);
  }
  if (data.findingsTruncated) {
    lines.push(`  ... (list truncated; totals per severity above)`);
  }
  if ((data.errors ?? []).length > 0) {
    lines.push(`Errors: ${data.errors?.length ?? 0}`);
    for (const err of data.errors ?? []) {
      const type = err.type ? `[${err.type}] ` : "";
      const path = err.path ? ` (${err.path})` : "";
      lines.push(`  ${type}${err.message}${path}`);
    }
  }
  pushErrorLines(lines, data);
  return lines.join("\n");
}

// -- Gitleaks formatters ------------------------------------------------------

/** Formats a Gitleaks scan result into human-readable text. */
export function formatGitleaksScan(data: GitleaksScanResultInternal): string {
  const lines: string[] = [];

  lines.push(`Gitleaks secret detection scan`);
  lines.push(`Found ${data.totalFindings} secret(s)`);
  if (data.summary?.ruleCounts && Object.keys(data.summary.ruleCounts).length > 0) {
    lines.push(
      `Rule counts: ${Object.entries(data.summary.ruleCounts)
        .map(([rule, count]) => `${rule}=${count}`)
        .join(", ")}`,
    );
  }

  if ((data.findings ?? []).length > 0) {
    lines.push("");
    for (const f of data.findings ?? []) {
      const commit = f.commit ? ` (commit: ${f.commit.slice(0, 8)})` : "";
      lines.push(`  [${f.ruleID}] ${f.file}:${f.startLine}-${f.endLine}${commit}`);
      lines.push(`    ${f.description} -- secret: ${f.secret}`);
    }
  }

  pushErrorLines(lines, data);

  return lines.join("\n");
}

// -- Gitleaks compact types, mappers, and formatters --------------------------

/** Compact scan result: finding count plus the top findings by rule/file/line
 * (schema-compatible). Drops match/secret/commit details. */
export interface GitleaksScanCompact {
  [key: string]: unknown;
  totalFindings: number;
  findings?: Array<{
    ruleID: string;
    file: string;
    startLine: number;
    endLine: number;
  }>;
  findingsTruncated?: true;
  error?: string;
  exitCode?: number;
}

export function compactGitleaksScanMap(data: GitleaksScanResultInternal): GitleaksScanCompact {
  const all = data.findings ?? [];
  const kept = all.slice(0, COMPACT_MAX_FINDINGS).map((f) => ({
    ruleID: f.ruleID,
    file: f.file,
    startLine: f.startLine,
    endLine: f.endLine,
  }));
  return {
    totalFindings: data.totalFindings,
    ...(kept.length > 0 ? { findings: kept } : {}),
    ...(kept.length < all.length ? { findingsTruncated: true as const } : {}),
    ...errorFields(data),
  };
}

export function formatGitleaksScanCompact(data: GitleaksScanCompact): string {
  const lines: string[] = [`Gitleaks scan -- ${data.totalFindings} secret(s) found`];
  for (const f of data.findings ?? []) {
    lines.push(`  [${f.ruleID}] ${f.file}:${f.startLine}-${f.endLine}`);
  }
  if (data.findingsTruncated) {
    lines.push(`  ... (list truncated; ${data.totalFindings} total)`);
  }
  pushErrorLines(lines, data);
  return lines.join("\n");
}
