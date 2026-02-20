import { z } from "zod";

// ── cmake configure ────────────────────────────────────────────────

export const CMakeConfigureResultSchema = z.object({
  action: z.literal("configure"),
  success: z.boolean(),
  generator: z.string().optional(),
  buildDir: z.string(),
  warnings: z
    .array(
      z.object({
        message: z.string(),
        file: z.string().optional(),
        line: z.number().optional(),
      }),
    )
    .optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        file: z.string().optional(),
        line: z.number().optional(),
      }),
    )
    .optional(),
  exitCode: z.number(),
});

export type CMakeConfigureResult = z.infer<typeof CMakeConfigureResultSchema>;

// ── cmake build ────────────────────────────────────────────────────

export const CMakeBuildResultSchema = z.object({
  action: z.literal("build"),
  success: z.boolean(),
  warnings: z
    .array(
      z.object({
        message: z.string(),
        file: z.string().optional(),
        line: z.number().optional(),
        column: z.number().optional(),
      }),
    )
    .optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        file: z.string().optional(),
        line: z.number().optional(),
        column: z.number().optional(),
      }),
    )
    .optional(),
  summary: z.object({
    warningCount: z.number(),
    errorCount: z.number(),
  }),
  exitCode: z.number(),
});

export type CMakeBuildResult = z.infer<typeof CMakeBuildResultSchema>;

// ── cmake test (ctest) ─────────────────────────────────────────────

export const CMakeTestResultSchema = z.object({
  action: z.literal("test"),
  success: z.boolean(),
  tests: z.array(
    z.object({
      name: z.string(),
      number: z.number(),
      status: z.enum(["passed", "failed", "timeout", "skipped", "not_run", "disabled"]),
      durationSec: z.number().optional(),
      output: z.string().optional(),
    }),
  ),
  summary: z.object({
    totalTests: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    timeout: z.number(),
    totalDurationSec: z.number().optional(),
  }),
  exitCode: z.number(),
});

export type CMakeTestResult = z.infer<typeof CMakeTestResultSchema>;

// ── cmake list-presets ─────────────────────────────────────────────

export const CMakePresetsResultSchema = z.object({
  action: z.literal("list-presets"),
  success: z.boolean(),
  configurePresets: z
    .array(z.object({ name: z.string(), displayName: z.string().optional() }))
    .optional(),
  buildPresets: z
    .array(z.object({ name: z.string(), displayName: z.string().optional() }))
    .optional(),
  testPresets: z
    .array(z.object({ name: z.string(), displayName: z.string().optional() }))
    .optional(),
  exitCode: z.number(),
});

export type CMakePresetsResult = z.infer<typeof CMakePresetsResultSchema>;

// ── cmake install ──────────────────────────────────────────────────

export const CMakeInstallResultSchema = z.object({
  action: z.literal("install"),
  success: z.boolean(),
  prefix: z.string().optional(),
  installedFiles: z.array(z.string()).optional(),
  exitCode: z.number(),
});

export type CMakeInstallResult = z.infer<typeof CMakeInstallResultSchema>;

// ── cmake clean ────────────────────────────────────────────────────

export const CMakeCleanResultSchema = z.object({
  action: z.literal("clean"),
  success: z.boolean(),
  exitCode: z.number(),
});

export type CMakeCleanResult = z.infer<typeof CMakeCleanResultSchema>;

// ── Union schema ───────────────────────────────────────────────────

export const CMakeResultSchema = z.discriminatedUnion("action", [
  CMakeConfigureResultSchema,
  CMakeBuildResultSchema,
  CMakeTestResultSchema,
  CMakePresetsResultSchema,
  CMakeInstallResultSchema,
  CMakeCleanResultSchema,
]);

export type CMakeResult = z.infer<typeof CMakeResultSchema>;
