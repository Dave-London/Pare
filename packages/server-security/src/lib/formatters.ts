import type { TrivyScanResult, SemgrepScanResult, GitleaksScanResult } from "../schemas/index.js";

// -- Full formatters ----------------------------------------------------------

/** Formats a Trivy scan result into human-readable text. */
export function formatTrivyScan(data: TrivyScanResult): string {
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
      lines.push(`  [${v.severity}] ${v.id}: ${v.package}@${v.installedVersion}${fixed}${title}`);
    }
  }

  return lines.join("\n");
}

// -- Compact types, mappers, and formatters -----------------------------------

/** Compact scan result: summary and total only, no individual vulnerabilities. */
export interface TrivyScanCompact {
  [key: string]: unknown;
  target: string;
  scanType: "image" | "fs" | "config";
  totalVulnerabilities: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}

export function compactTrivyScanMap(data: TrivyScanResult): TrivyScanCompact {
  return {
    target: data.target,
    scanType: data.scanType,
    totalVulnerabilities: data.totalVulnerabilities,
    summary: data.summary,
  };
}

export function formatTrivyScanCompact(data: TrivyScanCompact): string {
  return (
    `Trivy ${data.scanType} scan: ${data.target} -- ` +
    `${data.totalVulnerabilities} vulnerabilities ` +
    `(${data.summary.critical}C/${data.summary.high}H/${data.summary.medium}M/${data.summary.low}L)`
  );
}

// -- Semgrep formatters -------------------------------------------------------

/** Formats a Semgrep scan result into human-readable text. */
export function formatSemgrepScan(data: SemgrepScanResult): string {
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
      lines.push(`  [${f.severity}] ${f.ruleId}: ${f.path}:${f.startLine}-${f.endLine}${category}`);
      lines.push(`    ${f.message}`);
    }
  }

  return lines.join("\n");
}

// -- Semgrep compact types, mappers, and formatters ---------------------------

/** Compact scan result: summary and total only, no individual findings. */
export interface SemgrepScanCompact {
  [key: string]: unknown;
  totalFindings: number;
  summary: {
    error: number;
    warning: number;
    info: number;
  };
  config: string;
}

export function compactSemgrepScanMap(data: SemgrepScanResult): SemgrepScanCompact {
  return {
    totalFindings: data.totalFindings,
    summary: data.summary,
    config: data.config,
  };
}

export function formatSemgrepScanCompact(data: SemgrepScanCompact): string {
  return (
    `Semgrep scan (config: ${data.config}) -- ` +
    `${data.totalFindings} findings ` +
    `(${data.summary.error}E/${data.summary.warning}W/${data.summary.info}I)`
  );
}

// -- Gitleaks formatters ------------------------------------------------------

/** Formats a Gitleaks scan result into human-readable text. */
export function formatGitleaksScan(data: GitleaksScanResult): string {
  const lines: string[] = [];

  lines.push(`Gitleaks secret detection scan`);
  lines.push(`Found ${data.totalFindings} secret(s)`);

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

/** Compact scan result: summary and total only, no individual findings. */
export interface GitleaksScanCompact {
  [key: string]: unknown;
  totalFindings: number;
}

export function compactGitleaksScanMap(data: GitleaksScanResult): GitleaksScanCompact {
  return {
    totalFindings: data.totalFindings,
  };
}

export function formatGitleaksScanCompact(data: GitleaksScanCompact): string {
  return `Gitleaks scan -- ${data.totalFindings} secret(s) detected`;
}
