import { z } from "zod";

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
});

export type LintResult = z.infer<typeof LintResultSchema>;
export type LintDiagnostic = z.infer<typeof LintDiagnosticSchema>;

/** Zod schema for structured Prettier format check output with formatted status and unformatted file list. */
export const FormatCheckResultSchema = z.object({
  formatted: z.boolean(),
  files: z.array(z.string()).optional(),
});

export type FormatCheckResult = z.infer<typeof FormatCheckResultSchema>;

/** Zod schema for structured format-write output (Prettier --write, Biome format --write). */
export const FormatWriteResultSchema = z.object({
  filesChanged: z.number(),
  filesUnchanged: z.number().optional(),
  files: z.array(z.string()).optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});

export type FormatWriteResult = z.infer<typeof FormatWriteResultSchema>;
