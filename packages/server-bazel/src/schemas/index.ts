import { z } from "zod";

// ── Build ────────────────────────────────────────────────────────────

export const BazelBuildTargetSchema = z.object({
  label: z.string(),
  status: z.enum(["success", "failed", "skipped"]),
});

export const BazelBuildResultSchema = z.object({
  action: z.literal("build"),
  success: z.boolean(),
  targets: z.array(BazelBuildTargetSchema),
  summary: z.object({
    totalTargets: z.number(),
    successTargets: z.number(),
    failedTargets: z.number(),
  }),
  errors: z
    .array(
      z.object({
        target: z.string().optional(),
        message: z.string(),
        file: z.string().optional(),
        line: z.number().optional(),
      }),
    )
    .optional(),
  durationMs: z.number().optional(),
  exitCode: z.number(),
});

export type BazelBuildResult = z.infer<typeof BazelBuildResultSchema>;

// ── Test ─────────────────────────────────────────────────────────────

export const BazelTestCaseSchema = z.object({
  label: z.string(),
  status: z.enum(["passed", "failed", "timeout", "flaky", "skipped", "no_status"]),
  durationMs: z.number().optional(),
  failureMessage: z.string().optional(),
});

export const BazelTestResultSchema = z.object({
  action: z.literal("test"),
  success: z.boolean(),
  tests: z.array(BazelTestCaseSchema),
  summary: z.object({
    totalTests: z.number(),
    passed: z.number(),
    failed: z.number(),
    timeout: z.number(),
    flaky: z.number(),
    skipped: z.number(),
  }),
  durationMs: z.number().optional(),
  exitCode: z.number(),
});

export type BazelTestResult = z.infer<typeof BazelTestResultSchema>;

// ── Query ────────────────────────────────────────────────────────────

export const BazelQueryResultSchema = z.object({
  action: z.literal("query"),
  success: z.boolean(),
  results: z.array(z.string()),
  count: z.number(),
  exitCode: z.number(),
});

export type BazelQueryResult = z.infer<typeof BazelQueryResultSchema>;

// ── Info ─────────────────────────────────────────────────────────────

export const BazelInfoResultSchema = z.object({
  action: z.literal("info"),
  success: z.boolean(),
  info: z.record(z.string(), z.string()),
  exitCode: z.number(),
});

export type BazelInfoResult = z.infer<typeof BazelInfoResultSchema>;

// ── Run ──────────────────────────────────────────────────────────────

export const BazelRunResultSchema = z.object({
  action: z.literal("run"),
  success: z.boolean(),
  target: z.string(),
  stdout: z.string(),
  stderr: z.string().optional(),
  exitCode: z.number(),
});

export type BazelRunResult = z.infer<typeof BazelRunResultSchema>;

// ── Clean ────────────────────────────────────────────────────────────

export const BazelCleanResultSchema = z.object({
  action: z.literal("clean"),
  success: z.boolean(),
  expunged: z.boolean(),
  exitCode: z.number(),
});

export type BazelCleanResult = z.infer<typeof BazelCleanResultSchema>;

// ── Fetch ────────────────────────────────────────────────────────────

export const BazelFetchResultSchema = z.object({
  action: z.literal("fetch"),
  success: z.boolean(),
  exitCode: z.number(),
});

export type BazelFetchResult = z.infer<typeof BazelFetchResultSchema>;

// ── Union ────────────────────────────────────────────────────────────

export const BazelResultSchema = z.discriminatedUnion("action", [
  BazelBuildResultSchema,
  BazelTestResultSchema,
  BazelQueryResultSchema,
  BazelInfoResultSchema,
  BazelRunResultSchema,
  BazelCleanResultSchema,
  BazelFetchResultSchema,
]);

export type BazelResult = z.infer<typeof BazelResultSchema>;
