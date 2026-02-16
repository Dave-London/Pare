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

/** Zod schema for structured mypy output including success status, diagnostics, and error/warning counts. */
export const MypyResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(MypyDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
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
  url: z.string().optional(),
});

/** Zod schema for structured ruff check output with diagnostics, total count, fixable count, and success. */
export const RuffResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(RuffDiagnosticSchema).optional(),
  total: z.number(),
  fixable: z.number(),
});

export type RuffResult = z.infer<typeof RuffResultSchema>;

/** Zod schema for a single pip-audit vulnerability with package name, version, ID, and fix versions. */
export const PipAuditVulnSchema = z.object({
  name: z.string(),
  version: z.string(),
  id: z.string(),
  description: z.string(),
  fixVersions: z.array(z.string()),
});

/** Zod schema for structured pip-audit output with vulnerability list, total count, and success status. */
export const PipAuditResultSchema = z.object({
  success: z.boolean(),
  vulnerabilities: z.array(PipAuditVulnSchema).optional(),
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
  total: z.number(),
  duration: z.number(),
  failures: z.array(PytestFailureSchema).optional(),
});

export type PytestResult = z.infer<typeof PytestResultSchema>;

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
});

export type UvInstall = z.infer<typeof UvInstallSchema>;

/** Zod schema for structured uv run output with exit code and stdout/stderr. */
export const UvRunSchema = z.object({
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  success: z.boolean(),
  duration: z.number(),
});

export type UvRun = z.infer<typeof UvRunSchema>;

/** Zod schema for structured Black formatter output with file counts and reformat list. */
export const BlackResultSchema = z.object({
  filesChanged: z.number(),
  filesUnchanged: z.number(),
  filesChecked: z.number(),
  success: z.boolean(),
  wouldReformat: z.array(z.string()).optional(),
});

export type BlackResult = z.infer<typeof BlackResultSchema>;

/** Zod schema for a single pip list package entry with name, version, and optional metadata. */
export const PipListPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  location: z.string().optional(),
  editableProject: z.boolean().optional(),
});

/** Zod schema for structured pip list output with packages, total count, and success status. */
export const PipListSchema = z.object({
  success: z.boolean(),
  packages: z.array(PipListPackageSchema).optional(),
  total: z.number(),
});

export type PipList = z.infer<typeof PipListSchema>;

/** Zod schema for structured pip show output with package metadata. */
export const PipShowSchema = z.object({
  success: z.boolean(),
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
  files: z.array(z.string()).optional(),
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
export const CondaResultSchema = z.object({
  action: z.enum(["list", "info", "env-list"]),
  // list fields
  packages: z.array(CondaPackageSchema).optional(),
  total: z.number().optional(),
  environment: z.string().optional(),
  // info fields
  condaVersion: z.string().optional(),
  platform: z.string().optional(),
  pythonVersion: z.string().optional(),
  defaultPrefix: z.string().optional(),
  activePrefix: z.string().optional(),
  channels: z.array(z.string()).optional(),
  envsDirs: z.array(z.string()).optional(),
  pkgsDirs: z.array(z.string()).optional(),
  // env-list fields
  environments: z.array(CondaEnvSchema).optional(),
});

export type CondaResult = z.infer<typeof CondaResultSchema>;

/** Narrowed type for conda list action. */
export type CondaList = CondaResult & {
  action: "list";
  packages: { name: string; version: string; channel: string; buildString?: string }[];
  total: number;
};

/** Narrowed type for conda info action. */
export type CondaInfo = CondaResult & {
  action: "info";
  condaVersion: string;
  platform: string;
  pythonVersion: string;
  defaultPrefix: string;
  channels: string[];
  envsDirs: string[];
  pkgsDirs: string[];
};

/** Narrowed type for conda env-list action. */
export type CondaEnvList = CondaResult & {
  action: "env-list";
  environments: { name: string; path: string; active: boolean }[];
  total: number;
};

/** Zod schema for structured pyenv output with action results and version info. */
export const PyenvResultSchema = z.object({
  action: z.enum(["versions", "version", "install", "local", "global"]),
  success: z.boolean(),
  current: z.string().optional(),
  versions: z.array(z.string()).optional(),
  installed: z.string().optional(),
  localVersion: z.string().optional(),
  globalVersion: z.string().optional(),
  error: z.string().optional(),
});

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
  action: z.enum(["install", "add", "remove", "show", "build"]),
  packages: z.array(PoetryPackageSchema).optional(),
  artifacts: z.array(PoetryArtifactSchema).optional(),
  total: z.number(),
});

export type PoetryResult = z.infer<typeof PoetryResultSchema>;
