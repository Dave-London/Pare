import { z } from "zod";

// ── Shared ──────────────────────────────────────────────────────────

const BuildDiagnosticSchema = z.object({
  severity: z.enum(["error", "warning"]),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
});

export type BuildDiagnostic = z.infer<typeof BuildDiagnosticSchema>;

// ── Gradle schemas ──────────────────────────────────────────────────

export const GradleBuildResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
  timedOut: z.boolean(),
  tasksExecuted: z.number().optional(),
  tasksFailed: z.number().optional(),
  diagnostics: z.array(BuildDiagnosticSchema).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type GradleBuildResult = z.infer<typeof GradleBuildResultSchema>;

export const GradleTestCaseSchema = z.object({
  name: z.string(),
  className: z.string().optional(),
  passed: z.boolean(),
  duration: z.string().optional(),
  failure: z.string().optional(),
});

export type GradleTestCase = z.infer<typeof GradleTestCaseSchema>;

export const GradleTestResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
  timedOut: z.boolean(),
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  tests: z.array(GradleTestCaseSchema).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type GradleTestResult = z.infer<typeof GradleTestResultSchema>;

export const GradleTaskSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  group: z.string().optional(),
});

export type GradleTask = z.infer<typeof GradleTaskSchema>;

export const GradleTasksResultSchema = z.object({
  tasks: z.array(GradleTaskSchema),
  total: z.number(),
});

export type GradleTasksResult = z.infer<typeof GradleTasksResultSchema>;

export const GradleDependencySchema = z.object({
  group: z.string(),
  artifact: z.string(),
  version: z.string().optional(),
});

export type GradleDependency = z.infer<typeof GradleDependencySchema>;

export const GradleDependencyConfigSchema = z.object({
  configuration: z.string(),
  dependencies: z.array(GradleDependencySchema),
});

export type GradleDependencyConfig = z.infer<typeof GradleDependencyConfigSchema>;

export const GradleDependenciesResultSchema = z.object({
  configurations: z.array(GradleDependencyConfigSchema),
  totalDependencies: z.number(),
});

export type GradleDependenciesResult = z.infer<typeof GradleDependenciesResultSchema>;

// ── Maven schemas ───────────────────────────────────────────────────

export const MavenBuildResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
  timedOut: z.boolean(),
  diagnostics: z.array(BuildDiagnosticSchema).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type MavenBuildResult = z.infer<typeof MavenBuildResultSchema>;

export const MavenTestCaseSchema = z.object({
  name: z.string(),
  className: z.string().optional(),
  passed: z.boolean(),
  failure: z.string().optional(),
});

export type MavenTestCase = z.infer<typeof MavenTestCaseSchema>;

export const MavenTestResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
  timedOut: z.boolean(),
  totalTests: z.number(),
  passed: z.number(),
  failed: z.number(),
  errors: z.number(),
  skipped: z.number(),
  tests: z.array(MavenTestCaseSchema).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type MavenTestResult = z.infer<typeof MavenTestResultSchema>;

export const MavenDependencySchema = z.object({
  groupId: z.string(),
  artifactId: z.string(),
  version: z.string().optional(),
  scope: z.string().optional(),
});

export type MavenDependency = z.infer<typeof MavenDependencySchema>;

export const MavenDependenciesResultSchema = z.object({
  dependencies: z.array(MavenDependencySchema),
  total: z.number(),
});

export type MavenDependenciesResult = z.infer<typeof MavenDependenciesResultSchema>;

export const MavenVerifyResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  duration: z.number(),
  timedOut: z.boolean(),
  diagnostics: z.array(BuildDiagnosticSchema).optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type MavenVerifyResult = z.infer<typeof MavenVerifyResultSchema>;
