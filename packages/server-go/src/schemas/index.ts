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
  /** Non-file errors (package-level, linker, build constraint) that don't match file:line:col format. */
  rawErrors: z.array(z.string()).optional(),
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

/** Zod schema for a package-level test failure (build error, missing dependency, etc.). */
export const GoTestPackageFailureSchema = z.object({
  package: z.string(),
  output: z.string().optional(),
});

/** Zod schema for structured go test output with test list and pass/fail/skip counts. */
export const GoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(GoTestCaseSchema).optional(),
  /** Package-level failures (build errors, missing dependencies) where no individual test ran. */
  packageFailures: z.array(GoTestPackageFailureSchema).optional(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
});

export type GoTestResult = z.infer<typeof GoTestResultSchema>;

/** Zod schema for a single go vet diagnostic with file location, message, and analyzer name. */
export const GoVetDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
  /** The analyzer that produced this diagnostic (e.g., "printf", "shadow", "unusedresult"). */
  analyzer: z.string().optional(),
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
  /** Whether stdout was truncated due to maxOutput limit. */
  stdoutTruncated: z.boolean().optional(),
  /** Whether stderr was truncated due to maxOutput limit. */
  stderrTruncated: z.boolean().optional(),
  success: z.boolean(),
});

export type GoRunResult = z.infer<typeof GoRunResultSchema>;

/** Zod schema for structured go mod tidy output with success status and summary. */
export const GoModTidyResultSchema = z.object({
  success: z.boolean(),
  summary: z.string().optional(),
  /** Whether go mod tidy actually changed go.mod/go.sum (true) or they were already tidy (false). */
  madeChanges: z.boolean().optional(),
});

export type GoModTidyResult = z.infer<typeof GoModTidyResultSchema>;

/** Zod schema for a gofmt parse error from stderr. */
export const GoFmtParseErrorSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  message: z.string(),
});

/** Zod schema for structured gofmt output with file list and count. */
export const GoFmtResultSchema = z.object({
  success: z.boolean(),
  filesChanged: z.number(),
  files: z.array(z.string()).optional(),
  /** Parse errors reported on stderr (e.g., syntax errors in Go files). */
  parseErrors: z.array(GoFmtParseErrorSchema).optional(),
});

export type GoFmtResult = z.infer<typeof GoFmtResultSchema>;

/** Zod schema for a single go generate directive. */
export const GoGenerateDirectiveSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  command: z.string(),
  status: z.enum(["running", "completed", "failed"]).optional(),
});

/** Zod schema for structured go generate output with success status and output text. */
export const GoGenerateResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  /** Parsed per-directive status from -v or -x output. */
  directives: z.array(GoGenerateDirectiveSchema).optional(),
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
  imports: z.array(z.string()).optional(),
  /** Error information when the package has issues (e.g., missing imports, build errors). */
  error: z.object({ err: z.string() }).optional(),
});

/** Zod schema for a single Go module from go list -m output. */
export const GoListModuleSchema = z.object({
  path: z.string(),
  version: z.string().optional(),
  dir: z.string().optional(),
  goMod: z.string().optional(),
  goVersion: z.string().optional(),
  main: z.boolean().optional(),
  indirect: z.boolean().optional(),
});

/** Zod schema for structured go list output with package/module list and total count. */
export const GoListResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(GoListPackageSchema).optional(),
  /** Module list (populated when modules mode is used). */
  modules: z.array(GoListModuleSchema).optional(),
  total: z.number(),
});

export type GoListResult = z.infer<typeof GoListResultSchema>;

/** Zod schema for a per-package status entry from go get output. */
export const GoGetPackageStatusSchema = z.object({
  /** The module/package path. */
  path: z.string(),
  /** The resolved version, if available. */
  version: z.string().optional(),
  /** Error message if this package failed. */
  error: z.string().optional(),
});

/** Zod schema for a resolved package from go get output. */
export const GoGetResolvedPackageSchema = z.object({
  /** The module/package path. */
  package: z.string(),
  /** The version the package was at before this operation, if upgraded. */
  previousVersion: z.string().optional(),
  /** The newly resolved version. */
  newVersion: z.string(),
});

/** Zod schema for structured go get output with success status, output text, and resolved packages. */
export const GoGetResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  /** Packages resolved/upgraded by go get with version information. */
  resolvedPackages: z.array(GoGetResolvedPackageSchema).optional(),
  /** Per-package status showing success/failure for each requested package. */
  packages: z.array(GoGetPackageStatusSchema).optional(),
});

export type GoGetResult = z.infer<typeof GoGetResultSchema>;

/** Zod schema for a fix/replacement suggestion from golangci-lint. */
export const GolangciLintFixSchema = z.object({
  /** The replacement text. */
  text: z.string(),
  /** The range in the file to replace. */
  range: z
    .object({
      start: z.object({ line: z.number(), column: z.number().optional() }),
      end: z.object({ line: z.number(), column: z.number().optional() }),
    })
    .optional(),
});

/** Zod schema for a single golangci-lint diagnostic with file location, linter, severity, and message. */
export const GolangciLintDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  linter: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  sourceLine: z.string().optional(),
  /** Fix/replacement suggestion from the linter, if available. */
  fix: GolangciLintFixSchema.optional(),
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
