import { z } from "zod";

/** Zod schema for structured pip install output with installed packages and satisfaction status. */
export const PipInstallSchema = z.object({
  success: z.boolean(),
  installed: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
    )
    .optional(),
  alreadySatisfied: z.boolean(),
  warnings: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
  total: z.number(),
});

export type PipInstall = z.infer<typeof PipInstallSchema>;

/** Zod schema for a single mypy diagnostic with file location, severity, message, and error code. */
export const MypyDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  severity: z.enum(["error", "warning", "note"]),
  message: z.string(),
  code: z.string().optional(),
});

/** Zod schema for structured mypy output including success status, diagnostics, and error/warning/note counts. */
export const MypyResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(MypyDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
  notes: z.number().describe("Count of note-level diagnostics, separated from warnings"),
});

export type MypyResult = z.infer<typeof MypyResultSchema>;

/** Zod schema for a single ruff diagnostic with file location, rule code, message, and fixability. */
export const RuffDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  endLine: z.number().optional(),
  endColumn: z.number().optional(),
  code: z.string(),
  message: z.string(),
  fixable: z.boolean(),
  fixApplicability: z
    .enum(["safe", "unsafe", "display"])
    .optional()
    .describe("Fix applicability level from ruff (safe/unsafe/display)"),
  url: z.string().optional(),
});

/** Zod schema for structured ruff check output with diagnostics, total count, fixable count, and success. */
export const RuffResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(RuffDiagnosticSchema).optional(),
  total: z.number(),
  fixable: z.number(),
  fixedCount: z.number().optional(),
});

export type RuffResult = z.infer<typeof RuffResultSchema>;

/** Zod schema for a single pip-audit vulnerability with package name, version, ID, and fix versions. */
export const PipAuditVulnSchema = z.object({
  name: z.string(),
  version: z.string(),
  id: z.string(),
  description: z.string(),
  fixVersions: z.array(z.string()),
  aliases: z
    .array(z.string())
    .optional()
    .describe("Alternative vulnerability IDs (e.g. CVE aliases)"),
  url: z.string().optional().describe("URL with vulnerability details"),
  severity: z.string().optional().describe("Severity level (e.g. HIGH, CRITICAL)"),
  cvssScore: z.number().optional().describe("CVSS score if available (0.0-10.0)"),
});

/** Zod schema for structured pip-audit output with vulnerability list, total count, and success status. */
export const PipAuditResultSchema = z.object({
  success: z.boolean(),
  vulnerabilities: z.array(PipAuditVulnSchema).optional(),
  byPackage: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
        vulnerabilities: z.array(PipAuditVulnSchema),
      }),
    )
    .optional(),
  skipped: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  total: z.number(),
});

export type PipAuditResult = z.infer<typeof PipAuditResultSchema>;

/** Zod schema for a single pytest failure with test name and failure message. */
export const PytestFailureSchema = z.object({
  test: z.string(),
  message: z.string(),
});

/** Zod schema for structured pytest output with pass/fail/error/skip counts and failure details. */
export const PytestResultSchema = z.object({
  success: z.boolean(),
  passed: z.number(),
  failed: z.number(),
  errors: z.number(),
  skipped: z.number(),
  warnings: z.number().describe("Count of warnings from pytest warnings summary"),
  total: z.number(),
  duration: z.number(),
  failures: z.array(PytestFailureSchema).optional(),
});

export type PytestResult = z.infer<typeof PytestResultSchema>;

/** Zod schema for a single resolution conflict from uv install. */
export const UvResolutionConflictSchema = z.object({
  package: z.string(),
  constraint: z.string(),
});

/** Zod schema for structured uv install output with installed packages and count. */
export const UvInstallSchema = z.object({
  success: z.boolean(),
  installed: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
    )
    .optional(),
  total: z.number(),
  duration: z.number(),
  alreadySatisfied: z.boolean().optional(),
  error: z.string().optional(),
  resolutionConflicts: z.array(UvResolutionConflictSchema).optional(),
});

export type UvInstall = z.infer<typeof UvInstallSchema>;

/** Zod schema for structured uv run output with exit code and stdout/stderr. */
export const UvRunSchema = z.object({
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  commandStderr: z.string().optional(),
  uvDiagnostics: z.array(z.string()).optional(),
  truncated: z.boolean().optional(),
  success: z.boolean(),
  duration: z.number(),
});

export type UvRun = z.infer<typeof UvRunSchema>;

export const BlackDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured Black formatter output with file counts and reformat list.
 *  errorType distinguishes "check_failed" (exit 1, files need reformatting) from
 *  "internal_error" (exit 123, parse error or crash). */
export const BlackResultSchema = z.object({
  filesChanged: z.number(),
  filesUnchanged: z.number(),
  filesChecked: z.number(),
  success: z.boolean(),
  exitCode: z.number().optional(),
  errorType: z.enum(["check_failed", "internal_error"]).optional(),
  diagnostics: z.array(BlackDiagnosticSchema).optional(),
  wouldReformat: z.array(z.string()).optional(),
});

export type BlackResult = z.infer<typeof BlackResultSchema>;

/** Zod schema for a single pip list package entry with name, version, and optional metadata. */
export const PipListPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  location: z.string().optional(),
  editableProject: z.boolean().optional(),
  latestVersion: z
    .string()
    .optional()
    .describe("Latest available version (only when outdated=true)"),
  latestFiletype: z
    .string()
    .optional()
    .describe("File type of the latest version (only when outdated=true)"),
});

/** Zod schema for structured pip list output with packages, total count, and success status. */
export const PipListSchema = z.object({
  success: z.boolean(),
  packages: z.array(PipListPackageSchema).optional(),
  total: z.number(),
  error: z.string().optional().describe("Parse error message when JSON parsing fails"),
  rawOutput: z.string().optional().describe("Raw CLI output included when parsing fails"),
});

export type PipList = z.infer<typeof PipListSchema>;

/** Zod schema for a single pip-show package info entry. */
export const PipShowPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  summary: z.string(),
  homepage: z.string().optional(),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
  license: z.string().optional(),
  location: z.string().optional(),
  requires: z.array(z.string()).optional(),
  requiredBy: z.array(z.string()).optional(),
  metadataVersion: z.string().optional(),
  classifiers: z.array(z.string()).optional(),
});

/** Zod schema for structured pip show output with package metadata.
 *  Supports both single and multiple packages. */
export const PipShowSchema = z.object({
  success: z.boolean(),
  packages: z.array(PipShowPackageSchema).describe("Array of package info (one or more)"),
  // Keep top-level fields for backward compat (first package)
  name: z.string(),
  version: z.string(),
  summary: z.string(),
  homepage: z.string().optional(),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
  license: z.string().optional(),
  location: z.string().optional(),
  requires: z.array(z.string()).optional(),
  requiredBy: z.array(z.string()).optional(),
  metadataVersion: z.string().optional(),
  classifiers: z.array(z.string()).optional(),
});

export type PipShow = z.infer<typeof PipShowSchema>;

/** Zod schema for structured ruff format output with success status, file counts, and file list. */
export const RuffFormatResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  filesUnchanged: z.number(),
  files: z.array(z.string()).optional(),
  checkMode: z.boolean().optional(),
});

export type RuffFormatResult = z.infer<typeof RuffFormatResultSchema>;

/** Zod schema for a single conda package entry with name, version, and channel. */
export const CondaPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  channel: z.string(),
  buildString: z.string().optional(),
});

/** Zod schema for a single conda environment entry. */
export const CondaEnvSchema = z.object({
  name: z.string(),
  path: z.string(),
  active: z.boolean(),
});

/** Zod schema for structured conda output covering list, info, and env-list actions. */
const CondaMutationPackageSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  channel: z.string().optional(),
  buildString: z.string().optional(),
});

export const CondaListResultSchema = z
  .object({
    action: z.literal("list"),
    packages: z.array(CondaPackageSchema),
    total: z.number(),
    environment: z.string().optional(),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaInfoResultSchema = z
  .object({
    action: z.literal("info"),
    condaVersion: z.string(),
    platform: z.string(),
    pythonVersion: z.string(),
    defaultPrefix: z.string(),
    activePrefix: z.string().optional(),
    channels: z.array(z.string()),
    envsDirs: z.array(z.string()),
    pkgsDirs: z.array(z.string()),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaEnvListResultSchema = z
  .object({
    action: z.literal("env-list"),
    environments: z.array(CondaEnvSchema),
    total: z.number(),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaCreateResultSchema = z
  .object({
    action: z.literal("create"),
    success: z.boolean(),
    environment: z.string().optional(),
    prefix: z.string().optional(),
    addedPackages: z.array(CondaMutationPackageSchema).optional(),
    totalAdded: z.number(),
    error: z.string().optional(),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaRemoveResultSchema = z
  .object({
    action: z.literal("remove"),
    success: z.boolean(),
    environment: z.string().optional(),
    prefix: z.string().optional(),
    removedPackages: z.array(CondaMutationPackageSchema).optional(),
    totalRemoved: z.number(),
    error: z.string().optional(),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaUpdateResultSchema = z
  .object({
    action: z.literal("update"),
    success: z.boolean(),
    environment: z.string().optional(),
    prefix: z.string().optional(),
    updatedPackages: z.array(CondaMutationPackageSchema).optional(),
    addedPackages: z.array(CondaMutationPackageSchema).optional(),
    removedPackages: z.array(CondaMutationPackageSchema).optional(),
    totalUpdated: z.number(),
    error: z.string().optional(),
    parseError: z.string().optional(),
  })
  .strict();

export const CondaResultSchema = z.discriminatedUnion("action", [
  CondaListResultSchema,
  CondaInfoResultSchema,
  CondaEnvListResultSchema,
  CondaCreateResultSchema,
  CondaRemoveResultSchema,
  CondaUpdateResultSchema,
]);

export type CondaResult = z.infer<typeof CondaResultSchema>;
export type CondaList = z.infer<typeof CondaListResultSchema>;
export type CondaInfo = z.infer<typeof CondaInfoResultSchema>;
export type CondaEnvList = z.infer<typeof CondaEnvListResultSchema>;
export type CondaCreate = z.infer<typeof CondaCreateResultSchema>;
export type CondaRemove = z.infer<typeof CondaRemoveResultSchema>;
export type CondaUpdate = z.infer<typeof CondaUpdateResultSchema>;

/** Zod schema for structured pyenv output with action results and version info. */
const PyenvBaseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const PyenvResultSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("versions"),
      versions: z.array(z.string()).optional(),
      current: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("version"),
      current: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("install"),
      installed: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("installList"),
      availableVersions: z
        .array(z.string())
        .optional()
        .describe("Available Python versions for installation (installList action)"),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("local"),
      localVersion: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("global"),
      globalVersion: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("uninstall"),
      uninstalled: z
        .string()
        .optional()
        .describe("Version that was uninstalled (uninstall action)"),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("which"),
      commandPath: z.string().optional(),
    })
    .merge(PyenvBaseSchema)
    .strict(),
  z
    .object({
      action: z.literal("rehash"),
    })
    .merge(PyenvBaseSchema)
    .strict(),
]);

export type PyenvResult = z.infer<typeof PyenvResultSchema>;
/** Zod schema for a single package entry from poetry show. */
export const PoetryPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
});

/** Zod schema for a build artifact from poetry build. */
export const PoetryArtifactSchema = z.object({
  file: z.string(),
});

/** Zod schema for structured poetry output covering install/add/remove/show/build actions. */
export const PoetryResultSchema = z.object({
  success: z.boolean(),
  action: z.enum([
    "install",
    "add",
    "remove",
    "show",
    "build",
    "update",
    "lock",
    "check",
    "export",
  ]),
  packages: z.array(PoetryPackageSchema).optional(),
  artifacts: z.array(PoetryArtifactSchema).optional(),
  messages: z.array(z.string()).optional(),
  total: z.number(),
});

export type PoetryResult = z.infer<typeof PoetryResultSchema>;
