import { z } from "zod";

/** Reusable schema field indicating which package manager was used. */
const packageManagerField = z
  .enum(["npm", "pnpm", "yarn"])
  .optional()
  .describe("Package manager that was used (npm, pnpm, or yarn)");

/** Zod schema for structured npm install output including package counts, vulnerabilities, and duration. */
export const NpmInstallSchema = z.object({
  packageManager: packageManagerField,
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
  cve: z.string().optional().describe("CVE identifier for cross-referencing"),
  cwe: z.array(z.string()).optional().describe("CWE identifiers for weakness classification"),
});

/** Zod schema for structured npm audit output with vulnerability list and severity summary. */
export const NpmAuditSchema = z.object({
  packageManager: packageManagerField,
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
  packageManager: packageManagerField,
  packages: z.array(NpmOutdatedEntrySchema),
  total: z.number(),
});

export type NpmOutdated = z.infer<typeof NpmOutdatedSchema>;

/** A single dependency entry in the npm dependency list (recursive for nested deps). */
export interface NpmListDep {
  version: string;
  dependencies?: Record<string, NpmListDep>;
}

/** Zod schema for a single dependency entry in an npm list with version and nested dependencies. */
export const NpmListDepSchema: z.ZodType<NpmListDep> = z.object({
  version: z.string(),
  dependencies: z
    .record(
      z.string(),
      z.lazy(() => NpmListDepSchema),
    )
    .optional(),
});

/** Zod schema for structured npm list output with project name, version, and dependency map. */
export const NpmListSchema = z.object({
  packageManager: packageManagerField,
  name: z.string(),
  version: z.string(),
  dependencies: z.record(z.string(), NpmListDepSchema).optional(),
  total: z.number(),
});

export type NpmList = z.infer<typeof NpmListSchema>;

/** Zod schema for structured npm run output with script name, exit code, and captured output. */
export const NpmRunSchema = z.object({
  packageManager: packageManagerField,
  script: z.string().describe("The script that was executed"),
  exitCode: z.number().describe("Process exit code (0 = success)"),
  stdout: z.string().describe("Standard output from the script"),
  stderr: z.string().describe("Standard error from the script"),
  success: z.boolean().describe("Whether the script exited with code 0"),
  duration: z.number().describe("Execution duration in seconds"),
});

export type NpmRun = z.infer<typeof NpmRunSchema>;

/** Zod schema for structured npm test output with exit code and captured output. */
export const NpmTestSchema = z.object({
  packageManager: packageManagerField,
  exitCode: z.number().describe("Process exit code (0 = success)"),
  stdout: z.string().describe("Standard output from the test run"),
  stderr: z.string().describe("Standard error from the test run"),
  success: z.boolean().describe("Whether tests passed (exit code 0)"),
  duration: z.number().describe("Execution duration in seconds"),
});

export type NpmTest = z.infer<typeof NpmTestSchema>;

/** Zod schema for structured npm init output with package metadata. */
export const NpmInitSchema = z.object({
  packageManager: packageManagerField,
  success: z.boolean().describe("Whether package.json was created successfully"),
  packageName: z.string().describe("The name field from the generated package.json"),
  version: z.string().describe("The version field from the generated package.json"),
  path: z.string().describe("Path to the generated package.json"),
  stderr: z
    .string()
    .optional()
    .describe("Standard error output — present on failure to explain why"),
});

export type NpmInit = z.infer<typeof NpmInitSchema>;

/** Zod schema for repository metadata. */
export const NpmRepositorySchema = z.object({
  type: z.string().optional(),
  url: z.string().optional(),
});

/** Zod schema for structured npm info output with package metadata. */
export const NpmInfoSchema = z.object({
  packageManager: packageManagerField,
  name: z.string(),
  version: z.string(),
  description: z.string(),
  homepage: z.string().optional(),
  license: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  dist: z
    .object({
      tarball: z.string().optional(),
      integrity: z.string().optional().describe("Subresource integrity hash"),
    })
    .optional(),
  engines: z
    .record(z.string(), z.string())
    .optional()
    .describe("Node.js and other engine version requirements"),
  peerDependencies: z
    .record(z.string(), z.string())
    .optional()
    .describe("Peer dependencies that must be co-installed"),
  deprecated: z.string().optional().describe("Deprecation message if package is deprecated"),
  repository: NpmRepositorySchema.optional().describe("Source code repository info"),
  keywords: z.array(z.string()).optional().describe("Package keywords for discovery"),
  versions: z.array(z.string()).optional().describe("All published versions"),
});

export type NpmInfo = z.infer<typeof NpmInfoSchema>;

/** Zod schema for npm search package links. */
export const NpmSearchLinksSchema = z.object({
  npm: z.string().optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
});

/** Zod schema for a single package entry in npm search results. */
export const NpmSearchPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  keywords: z.array(z.string()).optional().describe("Package keywords"),
  score: z.number().optional().describe("Registry-computed relevance score"),
  links: NpmSearchLinksSchema.optional().describe("Package URLs"),
  scope: z.string().optional().describe("Package scope (e.g., '@types')"),
});

/** Zod schema for structured npm search output with matching packages. */
export const NpmSearchSchema = z.object({
  packageManager: packageManagerField,
  packages: z.array(NpmSearchPackageSchema),
  total: z.number(),
  registryTotal: z
    .number()
    .optional()
    .describe("Total matching packages in registry (may differ from returned count)"),
});

export type NpmSearch = z.infer<typeof NpmSearchSchema>;

/** Zod schema for structured nvm output with current version and installed versions list. */
export const NvmResultSchema = z.object({
  current: z.string().describe("Currently active Node.js version"),
  versions: z.array(z.string()).describe("List of installed Node.js versions"),
  default: z.string().optional().describe("Default Node.js version (alias default)"),
  which: z.string().optional().describe("Filesystem path to the active Node.js binary"),
  arch: z.string().optional().describe("Architecture of the active Node.js (e.g., x64, arm64)"),
});

export type NvmResult = z.infer<typeof NvmResultSchema>;
