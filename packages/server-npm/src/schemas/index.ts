import { z } from "zod";

/** Zod schema for structured npm install output including package counts, vulnerabilities, and duration. */
export const NpmInstallSchema = z.object({
  added: z.number(),
  removed: z.number(),
  changed: z.number(),
  duration: z.number(),
  packages: z.number().describe("Total packages after install"),
  vulnerabilities: z
    .object({
      total: z.number(),
      critical: z.number(),
      high: z.number(),
      moderate: z.number(),
      low: z.number(),
      info: z.number(),
    })
    .optional(),
  funding: z.number().optional(),
});

export type NpmInstall = z.infer<typeof NpmInstallSchema>;

/** Zod schema for a single npm audit vulnerability entry with severity, title, and fix availability. */
export const NpmAuditVulnSchema = z.object({
  name: z.string(),
  severity: z.enum(["critical", "high", "moderate", "low", "info"]),
  title: z.string(),
  url: z.string().optional(),
  range: z.string().optional(),
  fixAvailable: z.boolean(),
});

/** Zod schema for structured npm audit output with vulnerability list and severity summary. */
export const NpmAuditSchema = z.object({
  vulnerabilities: z.array(NpmAuditVulnSchema),
  summary: z.object({
    total: z.number(),
    critical: z.number(),
    high: z.number(),
    moderate: z.number(),
    low: z.number(),
    info: z.number(),
  }),
});

export type NpmAudit = z.infer<typeof NpmAuditSchema>;

/** Zod schema for a single outdated package entry with current, wanted, and latest versions. */
export const NpmOutdatedEntrySchema = z.object({
  name: z.string(),
  current: z.string(),
  wanted: z.string(),
  latest: z.string(),
  location: z.string().optional(),
  type: z.string().optional(),
});

/** Zod schema for structured npm outdated output with a list of packages needing updates. */
export const NpmOutdatedSchema = z.object({
  packages: z.array(NpmOutdatedEntrySchema),
  total: z.number(),
});

export type NpmOutdated = z.infer<typeof NpmOutdatedSchema>;

/** Zod schema for a single dependency entry in an npm list with version and optional resolved URL. */
export const NpmListDepSchema: z.ZodType<NpmListDep> = z.object({
  version: z.string(),
  resolved: z.string().optional(),
});

/** A single dependency entry in the npm dependency list. */
export interface NpmListDep {
  version: string;
  resolved?: string;
}

/** Zod schema for structured npm list output with project name, version, and dependency map. */
export const NpmListSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencies: z.record(z.string(), NpmListDepSchema),
  total: z.number(),
});

export type NpmList = z.infer<typeof NpmListSchema>;
