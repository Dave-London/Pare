import { z } from "zod";

/** Zod schema for a single vulnerability entry from Trivy output. */
export const TrivyVulnerabilitySchema = z.object({
  id: z.string(),
  severity: z.string(),
  package: z.string(),
  installedVersion: z.string(),
  fixedVersion: z.string().optional(),
  title: z.string().optional(),
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

/** Zod schema for the structured Trivy scan result. */
export const TrivyScanResultSchema = z.object({
  target: z.string(),
  scanType: z.enum(["image", "fs", "config"]),
  vulnerabilities: z.array(TrivyVulnerabilitySchema).optional(),
  summary: TrivySeveritySummarySchema,
  totalVulnerabilities: z.number(),
});

export type TrivyScanResult = z.infer<typeof TrivyScanResultSchema>;

// -- Semgrep schemas ----------------------------------------------------------

/** Zod schema for a single Semgrep finding. */
export const SemgrepFindingSchema = z.object({
  ruleId: z.string(),
  path: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  message: z.string(),
  severity: z.string(),
  category: z.string().optional(),
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

/** Zod schema for the structured Semgrep scan result. */
export const SemgrepScanResultSchema = z.object({
  totalFindings: z.number(),
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
  config: z.string(),
});

export type SemgrepScanResult = z.infer<typeof SemgrepScanResultSchema>;

// -- Gitleaks schemas ---------------------------------------------------------

/** Zod schema for a single Gitleaks finding. */
export const GitleaksFindingSchema = z.object({
  ruleID: z.string(),
  description: z.string(),
  match: z.string(),
  secret: z.string(),
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  commit: z.string(),
  author: z.string(),
  date: z.string(),
});

export type GitleaksFinding = z.infer<typeof GitleaksFindingSchema>;

/** Zod schema for Gitleaks summary. */
export const GitleaksSummarySchema = z.object({
  totalFindings: z.number(),
  ruleCounts: z.record(z.string(), z.number()).optional(),
});

export type GitleaksSummary = z.infer<typeof GitleaksSummarySchema>;

/** Zod schema for the structured Gitleaks scan result. */
export const GitleaksScanResultSchema = z.object({
  totalFindings: z.number(),
  findings: z.array(GitleaksFindingSchema).optional(),
  summary: GitleaksSummarySchema.optional(),
});

export type GitleaksScanResult = z.infer<typeof GitleaksScanResultSchema>;
