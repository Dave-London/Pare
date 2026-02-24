import type {
  TrivyScanResult,
  TrivyScanResultInternal,
  SemgrepScanResult,
  SemgrepScanResultInternal,
  GitleaksScanResult,
  GitleaksScanResultInternal,
} from "../schemas/index.js";

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

  return lines.join("\n");
}

// -- Compact types, mappers, and formatters -----------------------------------

/** Compact scan result: summary only, no individual vulnerabilities (schema-compatible). */
export interface TrivyScanCompact {
  [key: string]: unknown;
  target: string;
  scanType: "image" | "fs" | "config";
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

export function compactTrivyScanMap(data: TrivyScanResultInternal): TrivyScanCompact {
  return {
    target: data.target,
    scanType: data.scanType,
    summary: data.summary,
  };
}

export function formatTrivyScanCompact(data: TrivyScanCompact): string {
  const total =
    data.summary.critical +
    data.summary.high +
    data.summary.medium +
    data.summary.low +
    data.summary.unknown;
  return (
    `Trivy ${data.scanType} scan: ${data.target} -- ` +
    `${total} vulnerabilities ` +
    `(${data.summary.critical}C/${data.summary.high}H/${data.summary.medium}M/${data.summary.low}L)`
  );
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

  return lines.join("\n");
}

// -- Semgrep compact types, mappers, and formatters ---------------------------

/** Compact scan result: summary only, no individual findings (schema-compatible). */
export interface SemgrepScanCompact {
  [key: string]: unknown;
  summary: {
    error: number;
    warning: number;
    info: number;
  };
}

export function compactSemgrepScanMap(data: SemgrepScanResultInternal): SemgrepScanCompact {
  return {
    summary: data.summary,
  };
}

export function formatSemgrepScanCompact(data: SemgrepScanCompact): string {
  const total = data.summary.error + data.summary.warning + data.summary.info;
  return (
    `Semgrep scan -- ` +
    `${total} findings ` +
    `(${data.summary.error}E/${data.summary.warning}W/${data.summary.info}I)`
  );
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

  return lines.join("\n");
}

// -- Gitleaks compact types, mappers, and formatters --------------------------

/** Compact scan result: empty projection, no findings (schema-compatible).
 * GitleaksScanResultSchema only has `findings`, which compact mode drops. */
export interface GitleaksScanCompact {
  [key: string]: unknown;
}

export function compactGitleaksScanMap(_data: GitleaksScanResultInternal): GitleaksScanCompact {
  return {};
}

export function formatGitleaksScanCompact(_data: GitleaksScanCompact): string {
  return `Gitleaks scan: compact summary`;
}
