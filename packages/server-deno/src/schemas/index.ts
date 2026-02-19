import { z } from "zod";

// ── Deno Test ────────────────────────────────────────────────────────

/** A single test case result from `deno test`. */
export const DenoTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed", "ignored"]),
  duration: z.number().optional(),
  error: z.string().optional(),
});

export type DenoTestCase = z.infer<typeof DenoTestCaseSchema>;

/** Structured output from `deno test`. */
export const DenoTestResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  ignored: z.number(),
  filtered: z.number(),
  measured: z.number(),
  duration: z.number(),
  tests: z.array(DenoTestCaseSchema).optional(),
});

export type DenoTestResult = z.infer<typeof DenoTestResultSchema>;

// ── Deno Lint ────────────────────────────────────────────────────────

/** A single lint diagnostic from `deno lint`. */
export const DenoLintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  code: z.string().optional(),
  message: z.string(),
  hint: z.string().optional(),
});

export type DenoLintDiagnostic = z.infer<typeof DenoLintDiagnosticSchema>;

/** Structured output from `deno lint`. */
export const DenoLintResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  errors: z.number(),
  diagnostics: z.array(DenoLintDiagnosticSchema).optional(),
});

export type DenoLintResult = z.infer<typeof DenoLintResultSchema>;

// ── Deno Fmt ─────────────────────────────────────────────────────────

/** Structured output from `deno fmt --check` or `deno fmt`. */
export const DenoFmtResultSchema = z.object({
  success: z.boolean(),
  mode: z.enum(["check", "write"]),
  files: z.array(z.string()).optional(),
  total: z.number(),
});

export type DenoFmtResult = z.infer<typeof DenoFmtResultSchema>;

// ── Deno Check ───────────────────────────────────────────────────────

/** A single type error from `deno check`. */
export const DenoCheckErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  code: z.string().optional(),
  message: z.string(),
});

export type DenoCheckError = z.infer<typeof DenoCheckErrorSchema>;

/** Structured output from `deno check`. */
export const DenoCheckResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  errors: z.array(DenoCheckErrorSchema).optional(),
});

export type DenoCheckResult = z.infer<typeof DenoCheckResultSchema>;

// ── Deno Task ────────────────────────────────────────────────────────

/** Structured output from `deno task <name>`. */
export const DenoTaskResultSchema = z.object({
  task: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type DenoTaskResult = z.infer<typeof DenoTaskResultSchema>;

// ── Deno Run ─────────────────────────────────────────────────────────

/** Structured output from `deno run <file>`. */
export const DenoRunResultSchema = z.object({
  file: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type DenoRunResult = z.infer<typeof DenoRunResultSchema>;

// ── Deno Info ────────────────────────────────────────────────────────

/** A single dependency from `deno info`. */
export const DenoDependencySchema = z.object({
  specifier: z.string(),
  type: z.enum(["local", "remote", "npm"]).optional(),
  size: z.number().optional(),
});

export type DenoDependency = z.infer<typeof DenoDependencySchema>;

/** Structured output from `deno info`. */
export const DenoInfoResultSchema = z.object({
  success: z.boolean(),
  module: z.string().optional(),
  type: z.string().optional(),
  local: z.string().optional(),
  totalDependencies: z.number(),
  totalSize: z.number().optional(),
  dependencies: z.array(DenoDependencySchema).optional(),
});

export type DenoInfoResult = z.infer<typeof DenoInfoResultSchema>;
