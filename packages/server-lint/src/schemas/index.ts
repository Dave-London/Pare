import { z } from "zod";
import { EmptyFailureSchemaFields } from "@paretools/shared";

/** Zod schema for a single ESLint diagnostic with file location, severity, rule name, and message. */
export const LintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  severity: z.enum(["error", "warning", "info"]),
  rule: z.string(),
  message: z.string(),
});

/** Zod schema for structured ESLint output including diagnostics, counts, and files checked. */
export const LintResultSchema = z.object({
  diagnostics: z.array(LintDiagnosticSchema).optional(),
  errors: z.number(),
  warnings: z.number(),
  fixableErrorCount: z.number().optional(),
  fixableWarningCount: z.number().optional(),
  filesChecked: z.number(),
  deprecations: z
    .array(
      z.object({
        text: z.string(),
        reference: z.string().optional(),
      }),
    )
    .optional(),
  /** Whether the compact diagnostics list was capped (only set when true). */
  diagnosticsTruncated: z.boolean().optional(),
  /** Number of diagnostics omitted from the compact list (set alongside diagnosticsTruncated). */
  omittedCount: z.number().optional(),
  ...EmptyFailureSchemaFields,
});

export type LintResult = z.infer<typeof LintResultSchema>;
export type LintDiagnostic = z.infer<typeof LintDiagnosticSchema>;

/** Zod schema for structured Prettier format check output with formatted status and unformatted file list. */
export const FormatCheckResultSchema = z.object({
  formatted: z.boolean(),
  files: z.array(z.string()).optional(),
  /** Total number of files needing formatting (may exceed files.length in compact mode). */
  total: z.number().optional(),
  /** Whether the compact file list was capped (only set when true). */
  filesTruncated: z.boolean().optional(),
  ...EmptyFailureSchemaFields,
});

export type FormatCheckResult = z.infer<typeof FormatCheckResultSchema>;

/** Zod schema for structured format-write output (Prettier --write, Biome format --write). */
export const FormatWriteResultSchema = z.object({
  filesChanged: z.number(),
  filesUnchanged: z.number().optional(),
  files: z.array(z.string()).optional(),
  /** Whether the compact file list was capped (only set when true). */
  filesTruncated: z.boolean().optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});

export type FormatWriteResult = z.infer<typeof FormatWriteResultSchema>;
