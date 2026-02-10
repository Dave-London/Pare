import { z } from "zod";

export const TscDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  code: z.number(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});

export const TscResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type TscResult = z.infer<typeof TscResultSchema>;
export type TscDiagnostic = z.infer<typeof TscDiagnosticSchema>;

export const BuildResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;
