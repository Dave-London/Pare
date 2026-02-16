import { z } from "zod";

/** Zod schema for a single Rust compiler diagnostic with file location, severity, and optional lint code. */
export const CargoDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "note", "help"]),
  code: z.string().optional(),
  message: z.string(),
  suggestion: z.string().optional().describe("Suggested fix text from compiler/clippy children"),
});

/** Zod schema for structured cargo build output including success status, diagnostics, and error/warning counts. */
export const CargoBuildResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(CargoDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoBuildResult = z.infer<typeof CargoBuildResultSchema>;

/** Zod schema for a single cargo test case with name, status (ok/FAILED/ignored), optional duration, and optional failure output. */
export const CargoTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "FAILED", "ignored"]),
  duration: z.string().optional(),
  output: z.string().optional().describe("Captured stdout/stderr for failed tests"),
});

/** Zod schema for structured cargo test output with test list, pass/fail/ignored counts. */
export const CargoTestResultSchema = z.object({
  success: z.boolean(),
  tests: z.array(CargoTestCaseSchema).optional(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  ignored: z.number(),
  compilationDiagnostics: z
    .array(CargoDiagnosticSchema)
    .optional()
    .describe("Compiler diagnostics from --message-format=json when tests fail to compile"),
});

export type CargoTestResult = z.infer<typeof CargoTestResultSchema>;

/** Zod schema for structured cargo clippy output with diagnostics, success flag, and error/warning counts. */
export const CargoClippyResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(CargoDiagnosticSchema).optional(),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

export type CargoClippyResult = z.infer<typeof CargoClippyResultSchema>;

/** Zod schema for structured cargo run output with exit code, stdout, stderr, and success flag. */
export const CargoRunResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  success: z.boolean(),
  failureType: z
    .enum(["compilation", "runtime", "timeout"])
    .optional()
    .describe("Type of failure: compilation (rustc error), runtime (program error), or timeout"),
  stdoutTruncated: z
    .boolean()
    .optional()
    .describe("True when stdout exceeded maxOutputSize and was truncated"),
  stderrTruncated: z
    .boolean()
    .optional()
    .describe("True when stderr exceeded maxOutputSize and was truncated"),
});

export type CargoRunResult = z.infer<typeof CargoRunResultSchema>;

/** Zod schema for a single added dependency entry. */
export const CargoAddedPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/** Zod schema for structured cargo add output with added packages list and optional error message. */
export const CargoAddResultSchema = z.object({
  success: z.boolean(),
  added: z.array(CargoAddedPackageSchema).optional(),
  total: z.number(),
  dependencyType: z
    .enum(["normal", "dev", "build"])
    .optional()
    .describe("Type of dependency: normal, dev, or build"),
  dryRun: z
    .boolean()
    .optional()
    .describe("True when --dry-run was used; Cargo.toml was not modified"),
  error: z.string().optional(),
});

export type CargoAddResult = z.infer<typeof CargoAddResultSchema>;

/** Zod schema for structured cargo remove output with removed package names and optional error message. */
export const CargoRemoveResultSchema = z.object({
  success: z.boolean(),
  removed: z.array(z.string()),
  total: z.number(),
  dependencyType: z
    .enum(["normal", "dev", "build"])
    .optional()
    .describe("Type of dependency that was removed: normal, dev, or build"),
  error: z.string().optional(),
});

export type CargoRemoveResult = z.infer<typeof CargoRemoveResultSchema>;

/** Zod schema for structured cargo fmt output with changed files list and formatting status. */
export const CargoFmtResultSchema = z.object({
  success: z.boolean(),
  needsFormatting: z
    .boolean()
    .describe(
      "True when check mode detects unformatted files. Distinguishes 'needs formatting' from actual errors.",
    ),
  filesChanged: z.number(),
  files: z.array(z.string()).optional(),
});

export type CargoFmtResult = z.infer<typeof CargoFmtResultSchema>;

/** Zod schema for a structured doc warning with file location and message. */
export const CargoDocWarningSchema = z.object({
  file: z.string(),
  line: z.number(),
  message: z.string(),
});

/** Zod schema for structured cargo doc output with success flag, warning count, details, and optional output path. */
export const CargoDocResultSchema = z.object({
  success: z.boolean(),
  warnings: z.number(),
  warningDetails: z
    .array(CargoDocWarningSchema)
    .optional()
    .describe("Structured warning details with file, line, and message"),
  outputDir: z.string().optional(),
});

export type CargoDocResult = z.infer<typeof CargoDocResultSchema>;

/** Zod schema for a single updated dependency entry. */
export const CargoUpdatedPackageSchema = z.object({
  name: z.string().describe("Crate name"),
  from: z.string().describe("Previous version"),
  to: z.string().describe("Updated version"),
});

/** Zod schema for structured cargo update output with success flag, parsed updates, and raw output. */
export const CargoUpdateResultSchema = z.object({
  success: z.boolean(),
  updated: z
    .array(CargoUpdatedPackageSchema)
    .optional()
    .describe("Parsed list of updated dependencies"),
  totalUpdated: z.number().describe("Count of updated packages"),
  output: z.string().optional().describe("Raw combined output text"),
});

export type CargoUpdateResult = z.infer<typeof CargoUpdateResultSchema>;

/** Zod schema for a single dependency node in the parsed tree. */
export const CargoDependencyNodeSchema = z.object({
  name: z.string().describe("Crate name"),
  version: z.string().describe("Crate version"),
  depth: z.number().describe("Nesting depth in the dependency tree (0 = root)"),
});

/** Zod schema for structured cargo tree output with parsed dependencies, tree text, unique package count, and success flag. */
export const CargoTreeResultSchema = z.object({
  success: z.boolean(),
  dependencies: z
    .array(CargoDependencyNodeSchema)
    .optional()
    .describe("Flat list of dependencies with name, version, and depth"),
  tree: z.string().optional().describe("Raw ASCII tree text"),
  packages: z.number(),
});

export type CargoTreeResult = z.infer<typeof CargoTreeResultSchema>;

/** Zod schema for a single cargo audit vulnerability entry with advisory ID, package, severity, and fix info. */
export const CargoAuditVulnSchema = z.object({
  id: z.string().describe("Advisory ID (e.g. RUSTSEC-2022-0090)"),
  package: z.string().describe("Affected crate name"),
  version: z.string().describe("Installed version of the affected crate"),
  severity: z
    .enum(["critical", "high", "medium", "low", "informational", "unknown"])
    .describe("Severity level derived from CVSS"),
  title: z.string().describe("Short description of the vulnerability"),
  url: z.string().optional().describe("URL with more information"),
  date: z.string().optional().describe("Date the advisory was published"),
  patched: z.array(z.string()).describe("Version requirements that fix the vulnerability"),
  unaffected: z.array(z.string()).optional().describe("Version requirements not affected"),
  cvssScore: z.number().optional().describe("Raw CVSS base score (0.0-10.0)"),
  cvssVector: z.string().optional().describe("Raw CVSS vector string"),
});

/** Zod schema for structured cargo audit output with vulnerability list, success flag, and severity summary. */
export const CargoAuditResultSchema = z.object({
  success: z.boolean(),
  vulnerabilities: z.array(CargoAuditVulnSchema).optional(),
  summary: z
    .object({
      total: z.number(),
      critical: z.number(),
      high: z.number(),
      medium: z.number(),
      low: z.number(),
      informational: z.number(),
      unknown: z.number(),
    })
    .optional(),
  fixesApplied: z
    .number()
    .optional()
    .describe("Number of fixes applied when using cargo audit fix"),
});

export type CargoAuditResult = z.infer<typeof CargoAuditResultSchema>;
