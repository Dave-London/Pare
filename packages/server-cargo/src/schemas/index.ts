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

/** Zod schema for structured cargo run output with exit code, stdout, stderr, and success flag. */
export const CargoRunResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  success: z.boolean(),
});

export type CargoRunResult = z.infer<typeof CargoRunResultSchema>;

/** Zod schema for a single added dependency entry. */
export const CargoAddedPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/** Zod schema for structured cargo add output with added packages list. */
export const CargoAddResultSchema = z.object({
  success: z.boolean(),
  added: z.array(CargoAddedPackageSchema),
  total: z.number(),
});

export type CargoAddResult = z.infer<typeof CargoAddResultSchema>;

/** Zod schema for structured cargo remove output with removed package names. */
export const CargoRemoveResultSchema = z.object({
  success: z.boolean(),
  removed: z.array(z.string()),
  total: z.number(),
});

export type CargoRemoveResult = z.infer<typeof CargoRemoveResultSchema>;

/** Zod schema for structured cargo fmt output with changed files list. */
export const CargoFmtResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  files: z.array(z.string()),
});

export type CargoFmtResult = z.infer<typeof CargoFmtResultSchema>;

/** Zod schema for structured cargo doc output with success flag and warning count. */
export const CargoDocResultSchema = z.object({
  success: z.boolean(),
  warnings: z.number(),
});

export type CargoDocResult = z.infer<typeof CargoDocResultSchema>;

/** Zod schema for structured cargo update output with success flag and output text. */
export const CargoUpdateResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
});

export type CargoUpdateResult = z.infer<typeof CargoUpdateResultSchema>;

/** Zod schema for structured cargo tree output with tree text and unique package count. */
export const CargoTreeResultSchema = z.object({
  tree: z.string(),
  packages: z.number(),
});

export type CargoTreeResult = z.infer<typeof CargoTreeResultSchema>;
