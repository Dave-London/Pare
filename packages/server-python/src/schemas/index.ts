import { z } from "zod";

/** Zod schema for structured pip install output with installed packages and satisfaction status. */
export const PipInstallSchema = z.object({
  success: z.boolean(),
  installed: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
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
  diagnostics: z.array(MypyDiagnosticSchema),
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
});

/** Zod schema for structured ruff check output with diagnostics, total count, and fixable count. */
export const RuffResultSchema = z.object({
  diagnostics: z.array(RuffDiagnosticSchema),
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

/** Zod schema for structured pip-audit output with vulnerability list and total count. */
export const PipAuditResultSchema = z.object({
  vulnerabilities: z.array(PipAuditVulnSchema),
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
  failures: z.array(PytestFailureSchema),
});

export type PytestResult = z.infer<typeof PytestResultSchema>;

/** Zod schema for structured uv install output with installed packages and count. */
export const UvInstallSchema = z.object({
  success: z.boolean(),
  installed: z.array(
    z.object({
      name: z.string(),
      version: z.string(),
    }),
  ),
  total: z.number(),
  duration: z.number(),
});

export type UvInstall = z.infer<typeof UvInstallSchema>;

/** Zod schema for structured uv run output with exit code and stdout/stderr. */
export const UvRunSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
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
  wouldReformat: z.array(z.string()),
});

export type BlackResult = z.infer<typeof BlackResultSchema>;
