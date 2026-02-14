import { z } from "zod";

/** Zod schema for a single vulnerability entry from Trivy output. */
export const TrivyVulnerabilitySchema = z.object({
  id: z.string(),
  severity: z.string(),
  package: z.string(),
  installedVersion: z.string(),
  fixedVersion: z.string().optional(),
  title: z.string().optional(),
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
  vulnerabilities: z.array(TrivyVulnerabilitySchema),
  summary: TrivySeveritySummarySchema,
  totalVulnerabilities: z.number(),
});

export type TrivyScanResult = z.infer<typeof TrivyScanResultSchema>;
