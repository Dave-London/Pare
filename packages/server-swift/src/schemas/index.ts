import { z } from "zod";

// ── Build Schemas ────────────────────────────────────────────────────

/** Zod schema for a single Swift compiler diagnostic with file location, severity, and message. */
export const SwiftDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  severity: z.enum(["error", "warning", "note"]),
  message: z.string(),
});

export type SwiftDiagnostic = z.infer<typeof SwiftDiagnosticSchema>;

/** Zod schema for structured swift build output including success status, diagnostics, and duration. */
export const SwiftBuildResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  errors: z.array(SwiftDiagnosticSchema),
  warnings: z.array(SwiftDiagnosticSchema),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type SwiftBuildResult = z.infer<typeof SwiftBuildResultSchema>;

// ── Test Schemas ─────────────────────────────────────────────────────

/** Zod schema for a single Swift test case with name, status, and optional duration. */
export const SwiftTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  duration: z.number().optional().describe("Test duration in seconds"),
});

export type SwiftTestCase = z.infer<typeof SwiftTestCaseSchema>;

/** Zod schema for structured swift test output with test list, pass/fail/skipped counts, and duration. */
export const SwiftTestResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  total: z.number(),
  testCases: z.array(SwiftTestCaseSchema),
  duration: z.number(),
});

export type SwiftTestResult = z.infer<typeof SwiftTestResultSchema>;

// ── Run Schemas ──────────────────────────────────────────────────────

/** Zod schema for structured swift run output with exit code, stdout, stderr, and duration. */
export const SwiftRunResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type SwiftRunResult = z.infer<typeof SwiftRunResultSchema>;

// ── Package Resolve Schemas ──────────────────────────────────────────

/** Zod schema for a resolved Swift package dependency. */
export const SwiftResolvedPackageSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  version: z.string().optional(),
});

export type SwiftResolvedPackage = z.infer<typeof SwiftResolvedPackageSchema>;

/** Zod schema for structured swift package resolve output. */
export const SwiftPackageResolveResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  resolvedPackages: z.array(SwiftResolvedPackageSchema),
  duration: z.number(),
});

export type SwiftPackageResolveResult = z.infer<typeof SwiftPackageResolveResultSchema>;

// ── Package Update Schemas ───────────────────────────────────────────

/** Zod schema for an updated Swift package dependency. */
export const SwiftUpdatedPackageSchema = z.object({
  name: z.string(),
  oldVersion: z.string().optional(),
  newVersion: z.string().optional(),
});

export type SwiftUpdatedPackage = z.infer<typeof SwiftUpdatedPackageSchema>;

/** Zod schema for structured swift package update output. */
export const SwiftPackageUpdateResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  updatedPackages: z.array(SwiftUpdatedPackageSchema),
  duration: z.number(),
});

export type SwiftPackageUpdateResult = z.infer<typeof SwiftPackageUpdateResultSchema>;

// ── Package Show-Dependencies Schemas ────────────────────────────────

/** Zod schema for a Swift package dependency entry. */
export const SwiftDependencySchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  version: z.string().optional(),
  path: z.string().optional(),
});

export type SwiftDependency = z.infer<typeof SwiftDependencySchema>;

/** Zod schema for structured swift package show-dependencies output. */
export const SwiftPackageShowDependenciesResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  dependencies: z.array(SwiftDependencySchema),
});

export type SwiftPackageShowDependenciesResult = z.infer<
  typeof SwiftPackageShowDependenciesResultSchema
>;

// ── Package Clean Schemas ────────────────────────────────────────────

/** Zod schema for structured swift package clean output. */
export const SwiftPackageCleanResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
});

export type SwiftPackageCleanResult = z.infer<typeof SwiftPackageCleanResultSchema>;

// ── Package Init Schemas ─────────────────────────────────────────────

/** Zod schema for structured swift package init output. */
export const SwiftPackageInitResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  createdFiles: z.array(z.string()),
  duration: z.number(),
});

export type SwiftPackageInitResult = z.infer<typeof SwiftPackageInitResultSchema>;
