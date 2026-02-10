import { z } from "zod";

/** Zod schema for a single ESLint diagnostic with file location, severity, rule name, and fixability. */
export const LintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  endLine: z.number().optional(),
  endColumn: z.number().optional(),
  severity: z.enum(["error", "warning", "info"]),
  rule: z.string(),
  message: z.string(),
  fixable: z.boolean(),
});

/** Zod schema for structured ESLint output including diagnostics, counts, and files checked. */
export const LintResultSchema = z.object({
  diagnostics: z.array(LintDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
  fixable: z.number(),
  filesChecked: z.number(),
});

export type LintResult = z.infer<typeof LintResultSchema>;
export type LintDiagnostic = z.infer<typeof LintDiagnosticSchema>;

/** Zod schema for structured Prettier format check output with formatted status and unformatted file list. */
export const FormatCheckResultSchema = z.object({
  formatted: z.boolean(),
  files: z.array(z.string()),
  total: z.number(),
});

export type FormatCheckResult = z.infer<typeof FormatCheckResultSchema>;
