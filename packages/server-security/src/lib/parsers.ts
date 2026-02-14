import type {
  TrivyScanResult,
  TrivyVulnerability,
  TrivySeveritySummary,
  SemgrepScanResult,
  SemgrepFinding,
  SemgrepSeveritySummary,
  GitleaksScanResult,
  GitleaksFinding,
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

// -- Semgrep parser -----------------------------------------------------------

/** Raw Semgrep JSON finding shape (from `semgrep scan --json`). */
interface SemgrepJsonFinding {
  check_id?: string;
  path?: string;
  start?: { line?: number; col?: number };
  end?: { line?: number; col?: number };
  extra?: {
    message?: string;
    severity?: string;
    metadata?: {
      category?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/** Top-level Semgrep JSON output. */
interface SemgrepJsonOutput {
  results?: SemgrepJsonFinding[] | null;
  errors?: unknown[];
}

/**
 * Parses raw Semgrep JSON output into a structured SemgrepScanResult.
 *
 * Semgrep's JSON output has a `results` array containing findings,
 * each with check_id, path, start/end positions, and extra metadata.
 */
export function parseSemgrepJson(jsonStr: string, config: string): SemgrepScanResult {
  let parsed: SemgrepJsonOutput;
  try {
    parsed = JSON.parse(jsonStr) as SemgrepJsonOutput;
  } catch {
    return {
      totalFindings: 0,
      findings: [],
      summary: { error: 0, warning: 0, info: 0 },
      config,
    };
  }

  const findings: SemgrepFinding[] = [];

  if (parsed.results) {
    for (const r of parsed.results) {
      findings.push({
        ruleId: r.check_id || "unknown",
        path: r.path || "unknown",
        startLine: r.start?.line ?? 0,
        endLine: r.end?.line ?? 0,
        message: r.extra?.message || "",
        severity: normalizeSemgrepSeverity(r.extra?.severity),
        category: r.extra?.metadata?.category || undefined,
      });
    }
  }

  const summary = computeSemgrepSummary(findings);

  return {
    totalFindings: findings.length,
    findings,
    summary,
    config,
  };
}

/** Normalizes Semgrep severity strings to a consistent uppercase form. */
function normalizeSemgrepSeverity(severity: string | undefined): string {
  if (!severity) return "INFO";
  const upper = severity.toUpperCase();
  if (["ERROR", "WARNING", "INFO"].includes(upper)) return upper;
  return upper;
}

/** Computes severity summary counts from a list of Semgrep findings. */
function computeSemgrepSummary(findings: SemgrepFinding[]): SemgrepSeveritySummary {
  const summary: SemgrepSeveritySummary = { error: 0, warning: 0, info: 0 };
  for (const f of findings) {
    switch (f.severity) {
      case "ERROR":
        summary.error++;
        break;
      case "WARNING":
        summary.warning++;
        break;
      case "INFO":
        summary.info++;
        break;
      default:
        // Map unknown severities to info
        summary.info++;
        break;
    }
  }
  return summary;
}

// -- Gitleaks parser ----------------------------------------------------------

/** Raw Gitleaks JSON finding shape (from `gitleaks detect --report-format json`). */
interface GitleaksJsonFinding {
  RuleID?: string;
  Description?: string;
  Match?: string;
  Secret?: string;
  File?: string;
  StartLine?: number;
  EndLine?: number;
  Commit?: string;
  Author?: string;
  Date?: string;
}

/**
 * Redacts a secret string, keeping only the first 3 and last 3 characters
 * and replacing the rest with asterisks. Secrets 8 chars or shorter are fully
 * redacted.
 */
function redactSecret(secret: string): string {
  if (secret.length <= 8) return "***";
  return secret.slice(0, 3) + "***" + secret.slice(-3);
}

/**
 * Parses raw Gitleaks JSON output into a structured GitleaksScanResult.
 *
 * Gitleaks outputs a JSON array of findings. Each finding contains
 * RuleID, Description, Match, Secret, File, StartLine, EndLine,
 * Commit, Author, and Date fields.
 */
export function parseGitleaksJson(jsonStr: string): GitleaksScanResult {
  let parsed: GitleaksJsonFinding[];
  try {
    const raw = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(raw)) {
      return { totalFindings: 0, findings: [], summary: { totalFindings: 0 } };
    }
    parsed = raw as GitleaksJsonFinding[];
  } catch {
    return { totalFindings: 0, findings: [], summary: { totalFindings: 0 } };
  }

  const findings: GitleaksFinding[] = [];

  for (const f of parsed) {
    findings.push({
      ruleID: f.RuleID || "unknown",
      description: f.Description || "",
      match: f.Match || "",
      secret: redactSecret(f.Secret || ""),
      file: f.File || "unknown",
      startLine: f.StartLine ?? 0,
      endLine: f.EndLine ?? 0,
      commit: f.Commit || "",
      author: f.Author || "",
      date: f.Date || "",
    });
  }

  return {
    totalFindings: findings.length,
    findings,
    summary: { totalFindings: findings.length },
  };
}
