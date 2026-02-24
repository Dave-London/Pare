import type {
  TrivyScanResultInternal,
  TrivyVulnerabilityInternal,
  TrivySeveritySummary,
  SemgrepScanResultInternal,
  SemgrepFindingInternal,
  SemgrepSeveritySummary,
  GitleaksScanResultInternal,
  GitleaksFindingInternal,
} from "../schemas/index.js";

/** Raw Trivy JSON vulnerability shape (from `trivy --format json`). */
interface TrivyJsonVuln {
  VulnerabilityID?: string;
  Severity?: string;
  PkgName?: string;
  InstalledVersion?: string;
  FixedVersion?: string;
  Title?: string;
  CVSS?: Record<string, { V3Score?: number; Score?: number }>;
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
): TrivyScanResultInternal {
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

  const vulnerabilities: TrivyVulnerabilityInternal[] = [];

  if (parsed.Results) {
    for (const result of parsed.Results) {
      // Handle regular vulnerabilities
      if (result.Vulnerabilities) {
        for (const v of result.Vulnerabilities) {
          const cvssScore = extractCvssScore(v);
          vulnerabilities.push({
            id: v.VulnerabilityID || "UNKNOWN",
            severity: normalizeSeverity(v.Severity),
            package: v.PkgName || "unknown",
            installedVersion: v.InstalledVersion || "unknown",
            fixedVersion: v.FixedVersion || undefined,
            title: v.Title || undefined,
            ...(cvssScore !== undefined ? { cvssScore } : {}),
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

/** Extracts the highest CVSS score available from Trivy vulnerability metadata. */
function extractCvssScore(vuln: TrivyJsonVuln): number | undefined {
  const cvss = vuln.CVSS;
  if (!cvss) return undefined;
  const scores: number[] = [];
  for (const source of Object.values(cvss)) {
    if (typeof source.V3Score === "number" && Number.isFinite(source.V3Score)) {
      scores.push(source.V3Score);
    } else if (typeof source.Score === "number" && Number.isFinite(source.Score)) {
      scores.push(source.Score);
    }
  }
  return scores.length > 0 ? Math.max(...scores) : undefined;
}

/** Computes severity summary counts from a list of vulnerabilities. */
function computeSummary(vulnerabilities: TrivyVulnerabilityInternal[]): TrivySeveritySummary {
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
      cwe?: string | string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

/** Top-level Semgrep JSON output. */
interface SemgrepJsonOutput {
  results?: SemgrepJsonFinding[] | null;
  errors?: Array<{
    type?: string;
    message?: string;
    path?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Parses raw Semgrep JSON output into a structured SemgrepScanResult.
 *
 * Semgrep's JSON output has a `results` array containing findings,
 * each with check_id, path, start/end positions, and extra metadata.
 */
export function parseSemgrepJson(jsonStr: string, config: string): SemgrepScanResultInternal {
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

  const findings: SemgrepFindingInternal[] = [];

  if (parsed.results) {
    for (const r of parsed.results) {
      const cwe = normalizeCwe(r.extra?.metadata?.cwe);
      findings.push({
        ruleId: r.check_id || "unknown",
        path: r.path || "unknown",
        startLine: r.start?.line ?? 0,
        endLine: r.end?.line ?? 0,
        message: r.extra?.message || "",
        severity: normalizeSemgrepSeverity(r.extra?.severity),
        category: r.extra?.metadata?.category || undefined,
        ...(cwe ? { cwe } : {}),
      });
    }
  }

  const summary = computeSemgrepSummary(findings);

  const errors = (parsed.errors ?? [])
    .map((err) => ({
      type: err.type,
      message: err.message || "Unknown semgrep error",
      path: err.path,
    }))
    .filter((err) => err.message.length > 0);

  return {
    totalFindings: findings.length,
    findings,
    ...(errors.length > 0 ? { errors } : {}),
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

/** Normalizes Semgrep CWE metadata to a string array. */
function normalizeCwe(metadataCwe: string | string[] | undefined): string[] | undefined {
  if (Array.isArray(metadataCwe)) {
    const values = metadataCwe.map((x) => String(x).trim()).filter((x) => x.length > 0);
    return values.length > 0 ? values : undefined;
  }
  if (typeof metadataCwe === "string") {
    const values = metadataCwe
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    return values.length > 0 ? values : undefined;
  }
  return undefined;
}

/** Computes severity summary counts from a list of Semgrep findings. */
function computeSemgrepSummary(findings: SemgrepFindingInternal[]): SemgrepSeveritySummary {
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
export function parseGitleaksJson(jsonStr: string): GitleaksScanResultInternal {
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

  const findings: GitleaksFindingInternal[] = [];
  const ruleCounts: Record<string, number> = {};

  for (const f of parsed) {
    const ruleID = f.RuleID || "unknown";
    findings.push({
      ruleID,
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
    ruleCounts[ruleID] = (ruleCounts[ruleID] ?? 0) + 1;
  }

  return {
    totalFindings: findings.length,
    findings,
    summary: {
      totalFindings: findings.length,
      ...(Object.keys(ruleCounts).length > 0 ? { ruleCounts } : {}),
    },
  };
}
