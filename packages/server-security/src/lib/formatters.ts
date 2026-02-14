import type { TrivyScanResult } from "../schemas/index.js";

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

  if (data.vulnerabilities.length > 0) {
    lines.push("");
    for (const v of data.vulnerabilities) {
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
