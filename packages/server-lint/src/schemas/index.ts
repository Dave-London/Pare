import { z } from "zod";

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

export const FormatCheckResultSchema = z.object({
  formatted: z.boolean(),
  files: z.array(z.string()),
  total: z.number(),
});

export type FormatCheckResult = z.infer<typeof FormatCheckResultSchema>;
