import { z } from "zod";

/** Zod schema for a single ESLint diagnostic with file location, severity, rule name, and message. */
export const LintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  severity: z.enum(["error", "warning", "info"]),
  rule: z.string(),
  message: z.string(),
  wikiUrl: z.string().optional(),
});

/** Zod schema for structured ESLint output including diagnostics, counts, and files checked. */
export const LintResultSchema = z.object({
  diagnostics: z.array(LintDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
  fixableErrorCount: z.number().optional(),
  fixableWarningCount: z.number().optional(),
  filesChecked: z.number(),
});

export type LintResult = z.infer<typeof LintResultSchema>;
export type LintDiagnostic = z.infer<typeof LintDiagnosticSchema>;

/** Zod schema for structured Prettier format check output with formatted status and unformatted file list. */
export const FormatCheckResultSchema = z.object({
  formatted: z.boolean(),
  files: z.array(z.string()).optional(),
  total: z.number(),
});

export type FormatCheckResult = z.infer<typeof FormatCheckResultSchema>;

/** Zod schema for structured format-write output (Prettier --write, Biome format --write). */
export const FormatWriteResultSchema = z.object({
  filesChanged: z.number(),
  files: z.array(z.string()).optional(),
  success: z.boolean(),
});

export type FormatWriteResult = z.infer<typeof FormatWriteResultSchema>;
