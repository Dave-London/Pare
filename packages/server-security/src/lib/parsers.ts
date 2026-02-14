import type {
  TrivyScanResult,
  TrivyVulnerability,
  TrivySeveritySummary,
} from "../schemas/index.js";

/** Raw Trivy JSON vulnerability shape (from `trivy --format json`). */
interface TrivyJsonVuln {
  VulnerabilityID?: string;
  Severity?: string;
  PkgName?: string;
  InstalledVersion?: string;
  FixedVersion?: string;
  Title?: string;
}

/** Raw Trivy JSON result shape (one per target/layer). */
interface TrivyJsonResult {
  Target?: string;
  Vulnerabilities?: TrivyJsonVuln[] | null;
  Misconfigurations?: TrivyJsonMisconfig[] | null;
}

/** Raw Trivy JSON misconfiguration shape (from config scans). */
interface TrivyJsonMisconfig {
  ID?: string;
  Severity?: string;
  Type?: string;
  Title?: string;
  Message?: string;
}

/** Top-level Trivy JSON output. */
interface TrivyJsonOutput {
  Results?: TrivyJsonResult[] | null;
}

/**
 * Parses raw Trivy JSON output into a structured TrivyScanResult.
 *
 * Trivy's JSON output has a `Results` array, each entry containing
 * a `Target` and `Vulnerabilities` array. We flatten all vulnerabilities
 * across all results into a single list.
 */
export function parseTrivyJson(
  jsonStr: string,
  target: string,
  scanType: "image" | "fs" | "config",
): TrivyScanResult {
  let parsed: TrivyJsonOutput;
  try {
    parsed = JSON.parse(jsonStr) as TrivyJsonOutput;
  } catch {
    return {
      target,
      scanType,
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 0,
    };
  }

  const vulnerabilities: TrivyVulnerability[] = [];

  if (parsed.Results) {
    for (const result of parsed.Results) {
      // Handle regular vulnerabilities
      if (result.Vulnerabilities) {
        for (const v of result.Vulnerabilities) {
          vulnerabilities.push({
            id: v.VulnerabilityID || "UNKNOWN",
            severity: normalizeSeverity(v.Severity),
            package: v.PkgName || "unknown",
            installedVersion: v.InstalledVersion || "unknown",
            fixedVersion: v.FixedVersion || undefined,
            title: v.Title || undefined,
          });
        }
      }

      // Handle misconfigurations (config scans)
      if (result.Misconfigurations) {
        for (const m of result.Misconfigurations) {
          vulnerabilities.push({
            id: m.ID || "UNKNOWN",
            severity: normalizeSeverity(m.Severity),
            package: m.Type || "config",
            installedVersion: "N/A",
            fixedVersion: undefined,
            title: m.Title || m.Message || undefined,
          });
        }
      }
    }
  }

  const summary = computeSummary(vulnerabilities);

  return {
    target,
    scanType,
    vulnerabilities,
    summary,
    totalVulnerabilities: vulnerabilities.length,
  };
}

/** Normalizes Trivy severity strings to a consistent uppercase form. */
function normalizeSeverity(severity: string | undefined): string {
  if (!severity) return "UNKNOWN";
  const upper = severity.toUpperCase();
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(upper)) return upper;
  return upper;
}

/** Computes severity summary counts from a list of vulnerabilities. */
function computeSummary(vulnerabilities: TrivyVulnerability[]): TrivySeveritySummary {
  const summary: TrivySeveritySummary = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  for (const v of vulnerabilities) {
    switch (v.severity) {
      case "CRITICAL":
        summary.critical++;
        break;
      case "HIGH":
        summary.high++;
        break;
      case "MEDIUM":
        summary.medium++;
        break;
      case "LOW":
        summary.low++;
        break;
      default:
        summary.unknown++;
        break;
    }
  }
  return summary;
}
