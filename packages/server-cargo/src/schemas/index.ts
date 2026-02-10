import { z } from "zod";

/** Zod schema for a single Rust compiler diagnostic with file location, severity, and optional lint code. */
export const CargoDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "note", "help"]),
  code: z.string().optional(),
  message: z.string(),
});

/** Zod schema for structured cargo build output including success status, diagnostics, and error/warning counts. */
export const CargoBuildResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(CargoDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoBuildResult = z.infer<typeof CargoBuildResultSchema>;

/** Zod schema for a single cargo test case with name, status (ok/FAILED/ignored), and optional duration. */
export const CargoTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "FAILED", "ignored"]),
  duration: z.string().optional(),
});

/** Zod schema for structured cargo test output with test list, pass/fail/ignored counts. */
export const CargoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(CargoTestCaseSchema),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  ignored: z.number(),
});

export type CargoTestResult = z.infer<typeof CargoTestResultSchema>;

/** Zod schema for structured cargo clippy output with diagnostics and error/warning counts. */
export const CargoClippyResultSchema = z.object({
  diagnostics: z.array(CargoDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoClippyResult = z.infer<typeof CargoClippyResultSchema>;
