import { z } from "zod";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

/** Zod schema for a single MSBuild diagnostic with file location, severity, and error code. */
export const DotnetDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number().optional(),
  code: z.string().optional(),
  severity: z.enum(["error", "warning"]),
  message: z.string().optional(),
});

/** Zod schema for structured `dotnet build` output. */
export const DotnetBuildResultSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(DotnetDiagnosticSchema),
  total: z.number(),
  errors: z.number(),
  warnings: z.number(),
});

/** Full dotnet build diagnostic. */
export interface DotnetDiagnostic {
  [key: string]: unknown;
  file: string;
  line: number;
  column?: number;
  code?: string;
  severity: "error" | "warning";
  message?: string;
}

/** Full dotnet build result. */
export interface DotnetBuildResult {
  [key: string]: unknown;
  success: boolean;
  diagnostics: DotnetDiagnostic[];
  total: number;
  errors: number;
  warnings: number;
}

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

/** Zod schema for a single test case result. */
export const DotnetTestCaseSchema = z.object({
  name: z.string(),
  status: z.enum(["Passed", "Failed", "Skipped"]),
  duration: z.string().optional(),
  errorMessage: z.string().optional(),
});

/** Zod schema for structured `dotnet test` output. */
export const DotnetTestResultSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  tests: z.array(DotnetTestCaseSchema),
});

/** Full dotnet test case. */
export interface DotnetTestCase {
  [key: string]: unknown;
  name: string;
  status: "Passed" | "Failed" | "Skipped";
  duration?: string;
  errorMessage?: string;
}

/** Full dotnet test result. */
export interface DotnetTestResult {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  tests: DotnetTestCase[];
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

/** Zod schema for structured `dotnet run` output. */
export const DotnetRunResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  timedOut: z.boolean().optional(),
});

/** Full dotnet run result. */
export interface DotnetRunResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
}

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

/** Zod schema for structured `dotnet publish` output. */
export const DotnetPublishResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  outputPath: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

/** Full dotnet publish result. */
export interface DotnetPublishResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  outputPath?: string;
  warnings?: string[];
  errors?: string[];
}

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

/** Zod schema for structured `dotnet restore` output. */
export const DotnetRestoreResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  restoredProjects: z.number().optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

/** Full dotnet restore result. */
export interface DotnetRestoreResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  restoredProjects?: number;
  warnings?: string[];
  errors?: string[];
}

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

/** Zod schema for structured `dotnet clean` output. */
export const DotnetCleanResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
});

/** Full dotnet clean result. */
export interface DotnetCleanResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
}

// ---------------------------------------------------------------------------
// add-package
// ---------------------------------------------------------------------------

/** Zod schema for structured `dotnet add package` output. */
export const DotnetAddPackageResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  package: z.string(),
  version: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

/** Full dotnet add-package result. */
export interface DotnetAddPackageResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  package: string;
  version?: string;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// list-package
// ---------------------------------------------------------------------------

/** Zod schema for a single NuGet package entry. */
export const DotnetPackageEntrySchema = z.object({
  id: z.string(),
  resolved: z.string(),
  latest: z.string().optional(),
  deprecated: z.boolean().optional(),
});

/** Zod schema for a project's package listing. */
export const DotnetProjectPackagesSchema = z.object({
  project: z.string(),
  frameworks: z.array(
    z.object({
      framework: z.string(),
      topLevel: z.array(DotnetPackageEntrySchema).optional(),
      transitive: z.array(DotnetPackageEntrySchema).optional(),
    }),
  ),
});

/** Zod schema for structured `dotnet list package` output. */
export const DotnetListPackageResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  projects: z.array(DotnetProjectPackagesSchema),
});

/** Full dotnet package entry. */
export interface DotnetPackageEntry {
  [key: string]: unknown;
  id: string;
  resolved: string;
  latest?: string;
  deprecated?: boolean;
}

/** Full project package listing. */
export interface DotnetProjectPackages {
  [key: string]: unknown;
  project: string;
  frameworks: Array<{
    framework: string;
    topLevel?: DotnetPackageEntry[];
    transitive?: DotnetPackageEntry[];
  }>;
}

/** Full dotnet list-package result. */
export interface DotnetListPackageResult {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  projects: DotnetProjectPackages[];
}
