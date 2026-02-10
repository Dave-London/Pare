import { z } from "zod";

/** Zod schema for a single TypeScript compiler diagnostic with file location, severity, and error code. */
export const TscDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  code: z.number(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});

/** Zod schema for structured tsc output including success status, diagnostics array, and error/warning counts. */
export const TscResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type TscResult = z.infer<typeof TscResultSchema>;
export type TscDiagnostic = z.infer<typeof TscDiagnosticSchema>;

/** Zod schema for structured build command output with success status, duration, errors, and warnings. */
export const BuildResultSchema = z.object({
  success: z.boolean(),
  duration: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type BuildResult = z.infer<typeof BuildResultSchema>;
