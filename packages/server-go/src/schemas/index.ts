import { z } from "zod";

/** Zod schema for a single go build error with file location and message. */
export const GoBuildErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured go build output with success status and error list. */
export const GoBuildResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(GoBuildErrorSchema).optional(),
  total: z.number(),
});

export type GoBuildResult = z.infer<typeof GoBuildResultSchema>;

/** Zod schema for a single go test case with package, name, status, and optional elapsed time. */
export const GoTestCaseSchema = z.object({
  package: z.string(),
  name: z.string(),
  status: z.enum(["pass", "fail", "skip"]),
  elapsed: z.number().optional(),
  output: z.string().optional(),
});

/** Zod schema for structured go test output with test list and pass/fail/skip counts. */
export const GoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(GoTestCaseSchema).optional(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
});

export type GoTestResult = z.infer<typeof GoTestResultSchema>;

/** Zod schema for a single go vet diagnostic with file location and message. */
export const GoVetDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured go vet output with diagnostic list, total count, and success status. */
export const GoVetResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(GoVetDiagnosticSchema).optional(),
  total: z.number(),
});

export type GoVetResult = z.infer<typeof GoVetResultSchema>;

/** Zod schema for structured go run output with stdout, stderr, and exit code. */
export const GoRunResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  success: z.boolean(),
});

export type GoRunResult = z.infer<typeof GoRunResultSchema>;

/** Zod schema for structured go mod tidy output with success status and summary. */
export const GoModTidyResultSchema = z.object({
  success: z.boolean(),
  summary: z.string().optional(),
});

export type GoModTidyResult = z.infer<typeof GoModTidyResultSchema>;

/** Zod schema for structured gofmt output with file list and count. */
export const GoFmtResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  files: z.array(z.string()).optional(),
});

export type GoFmtResult = z.infer<typeof GoFmtResultSchema>;

/** Zod schema for structured go generate output with success status and output text. */
export const GoGenerateResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
});

export type GoGenerateResult = z.infer<typeof GoGenerateResultSchema>;

/** Zod schema for structured go env output with environment variables and key fields. */
export const GoEnvResultSchema = z.object({
  success: z.boolean(),
  vars: z.record(z.string(), z.string()).optional(),
  goroot: z.string(),
  gopath: z.string(),
  goversion: z.string(),
  goos: z.string(),
  goarch: z.string(),
});

export type GoEnvResult = z.infer<typeof GoEnvResultSchema>;

/** Zod schema for a single Go package from go list output. */
export const GoListPackageSchema = z.object({
  dir: z.string(),
  importPath: z.string(),
  name: z.string(),
  goFiles: z.array(z.string()).optional(),
  testGoFiles: z.array(z.string()).optional(),
});

/** Zod schema for structured go list output with package list and total count. */
export const GoListResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(GoListPackageSchema).optional(),
  total: z.number(),
});

export type GoListResult = z.infer<typeof GoListResultSchema>;

/** Zod schema for structured go get output with success status and output text. */
export const GoGetResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
});

export type GoGetResult = z.infer<typeof GoGetResultSchema>;

/** Zod schema for a single golangci-lint diagnostic with file location, linter, severity, and message. */
export const GolangciLintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  linter: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  sourceLine: z.string().optional(),
});

/** Zod schema for linter-level summary counts. */
export const GolangciLintLinterSummarySchema = z.object({
  linter: z.string(),
  count: z.number(),
});

/** Zod schema for structured golangci-lint output with diagnostics and summary counts. */
export const GolangciLintResultSchema = z.object({
  diagnostics: z.array(GolangciLintDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
  resultsTruncated: z.boolean().optional(),
  byLinter: z.array(GolangciLintLinterSummarySchema).optional(),
});

export type GolangciLintResult = z.infer<typeof GolangciLintResultSchema>;
export type GolangciLintDiagnostic = z.infer<typeof GolangciLintDiagnosticSchema>;
