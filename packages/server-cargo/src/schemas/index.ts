import { z } from "zod";

// cargo build --message-format=json
export const CargoDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "note", "help"]),
  code: z.string().optional(),
  message: z.string(),
});

export const CargoBuildResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(CargoDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoBuildResult = z.infer<typeof CargoBuildResultSchema>;

// cargo test -- output
export const CargoTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "FAILED", "ignored"]),
  duration: z.string().optional(),
});

export const CargoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(CargoTestCaseSchema),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  ignored: z.number(),
});

export type CargoTestResult = z.infer<typeof CargoTestResultSchema>;

// cargo clippy --message-format=json (same shape as build diagnostics)
export const CargoClippyResultSchema = z.object({
  diagnostics: z.array(CargoDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoClippyResult = z.infer<typeof CargoClippyResultSchema>;
