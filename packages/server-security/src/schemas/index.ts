import { z } from "zod";

/** Zod schema for a single vulnerability entry from Trivy output.
 * Moved to formatter: title (display-only). */
export const TrivyVulnerabilitySchema = z.object({
  id: z.string(),
  severity: z.string(),
  package: z.string(),
  installedVersion: z.string(),
  fixedVersion: z.string().optional(),
  cvssScore: z.number().optional(),
});

export type TrivyVulnerability = z.infer<typeof TrivyVulnerabilitySchema>;

/** Zod schema for severity summary counts. */
export const TrivySeveritySummarySchema = z.object({
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
  unknown: z.number(),
});

export type TrivySeveritySummary = z.infer<typeof TrivySeveritySummarySchema>;

/** Zod schema for the structured Trivy scan result.
 * Removed derivable: totalVulnerabilities (= vulnerabilities.length). */
export const TrivyScanResultSchema = z.object({
  target: z.string(),
  scanType: z.enum(["image", "fs", "config"]),
  vulnerabilities: z.array(TrivyVulnerabilitySchema).optional(),
  summary: TrivySeveritySummarySchema,
});

export type TrivyScanResult = z.infer<typeof TrivyScanResultSchema>;

/** Internal type with display-only fields for formatters. */
export type TrivyVulnerabilityInternal = TrivyVulnerability & {
  title?: string;
};

/** Internal type with display-only fields for formatters. */
export type TrivyScanResultInternal = Omit<TrivyScanResult, "vulnerabilities"> & {
  vulnerabilities?: TrivyVulnerabilityInternal[];
  totalVulnerabilities: number;
};

// -- Semgrep schemas ----------------------------------------------------------

/** Zod schema for a single Semgrep finding.
 * Moved to formatter: category (display-only). */
export const SemgrepFindingSchema = z.object({
  ruleId: z.string(),
  path: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  message: z.string(),
  severity: z.string(),
  cwe: z.array(z.string()).optional(),
});

export type SemgrepFinding = z.infer<typeof SemgrepFindingSchema>;

/** Zod schema for Semgrep severity summary counts. */
export const SemgrepSeveritySummarySchema = z.object({
  error: z.number(),
  warning: z.number(),
  info: z.number(),
});

export type SemgrepSeveritySummary = z.infer<typeof SemgrepSeveritySummarySchema>;

/** Zod schema for the structured Semgrep scan result.
 * Removed derivable: totalFindings (= findings.length).
 * Moved to formatter: config (echo-back / display-only). */
export const SemgrepScanResultSchema = z.object({
  findings: z.array(SemgrepFindingSchema).optional(),
  errors: z
    .array(
      z.object({
        type: z.string().optional(),
        message: z.string(),
        path: z.string().optional(),
      }),
    )
    .optional(),
  summary: SemgrepSeveritySummarySchema,
});

export type SemgrepScanResult = z.infer<typeof SemgrepScanResultSchema>;

/** Internal type with display-only fields for formatters. */
export type SemgrepFindingInternal = SemgrepFinding & {
  category?: string;
};

/** Internal type with display-only fields for formatters. */
export type SemgrepScanResultInternal = Omit<SemgrepScanResult, "findings"> & {
  findings?: SemgrepFindingInternal[];
  totalFindings: number;
  config: string;
};

// -- Gitleaks schemas ---------------------------------------------------------

/** Zod schema for a single Gitleaks finding.
 * Moved to formatter: description, author, date (display-only). */
export const GitleaksFindingSchema = z.object({
  ruleID: z.string(),
  match: z.string(),
  secret: z.string(),
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  commit: z.string(),
});

export type GitleaksFinding = z.infer<typeof GitleaksFindingSchema>;

/** Zod schema for Gitleaks summary.
 * Removed derivable: totalFindings (= findings.length), ruleCounts (derivable from findings). */
export const GitleaksSummarySchema = z.object({});

export type GitleaksSummary = z.infer<typeof GitleaksSummarySchema>;

/** Zod schema for the structured Gitleaks scan result.
 * Removed derivable: totalFindings (= findings.length). */
export const GitleaksScanResultSchema = z.object({
  findings: z.array(GitleaksFindingSchema).optional(),
});

export type GitleaksScanResult = z.infer<typeof GitleaksScanResultSchema>;

/** Internal type with display-only fields for formatters. */
export type GitleaksFindingInternal = GitleaksFinding & {
  description: string;
  author: string;
  date: string;
};

/** Internal type with display-only fields for formatters. */
export interface GitleaksSummaryInternal {
  totalFindings: number;
  ruleCounts?: Record<string, number>;
}

/** Internal type with display-only fields for formatters. */
export type GitleaksScanResultInternal = Omit<GitleaksScanResult, "findings"> & {
  findings?: GitleaksFindingInternal[];
  totalFindings: number;
  summary?: GitleaksSummaryInternal;
};
