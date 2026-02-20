import { z } from "zod";

// ── Run ─────────────────────────────────────────────────────────────

/** Zod schema for structured `bun run` output. */
export const BunRunResultSchema = z.object({
  script: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type BunRunResult = z.infer<typeof BunRunResultSchema>;

// ── Test ────────────────────────────────────────────────────────────

export const BunTestCaseSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  duration: z.number().optional(),
  error: z.string().optional(),
});

/** Zod schema for structured `bun test` output. */
export const BunTestResultSchema = z.object({
  success: z.boolean(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  total: z.number(),
  duration: z.number(),
  tests: z.array(BunTestCaseSchema).optional(),
  stderr: z.string().optional(),
});

export type BunTestResult = z.infer<typeof BunTestResultSchema>;

// ── Build ───────────────────────────────────────────────────────────

export const BunBuildArtifactSchema = z.object({
  path: z.string(),
  size: z.string().optional(),
});

/** Zod schema for structured `bun build` output. */
export const BunBuildResultSchema = z.object({
  success: z.boolean(),
  entrypoints: z.array(z.string()),
  artifacts: z.array(BunBuildArtifactSchema).optional(),
  duration: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type BunBuildResult = z.infer<typeof BunBuildResultSchema>;

// ── Install ─────────────────────────────────────────────────────────

/** Zod schema for structured `bun install` output. */
export const BunInstallResultSchema = z.object({
  success: z.boolean(),
  installedCount: z.number(),
  duration: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type BunInstallResult = z.infer<typeof BunInstallResultSchema>;

// ── Add ─────────────────────────────────────────────────────────────

/** Zod schema for structured `bun add` output. */
export const BunAddResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(z.string()),
  dev: z.boolean(),
  duration: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type BunAddResult = z.infer<typeof BunAddResultSchema>;

// ── Remove ──────────────────────────────────────────────────────────

/** Zod schema for structured `bun remove` output. */
export const BunRemoveResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(z.string()),
  duration: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
});

export type BunRemoveResult = z.infer<typeof BunRemoveResultSchema>;

// ── Outdated ────────────────────────────────────────────────────────

export const BunOutdatedEntrySchema = z.object({
  name: z.string(),
  current: z.string(),
  latest: z.string(),
  wanted: z.string().optional(),
});

/** Zod schema for structured `bun outdated` output. */
export const BunOutdatedResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(BunOutdatedEntrySchema),
  total: z.number(),
  duration: z.number(),
});

export type BunOutdatedResult = z.infer<typeof BunOutdatedResultSchema>;

// ── Pm Ls ───────────────────────────────────────────────────────────

export const BunPmLsEntrySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

/** Zod schema for structured `bun pm ls` output. */
export const BunPmLsResultSchema = z.object({
  success: z.boolean(),
  packages: z.array(BunPmLsEntrySchema),
  total: z.number(),
  duration: z.number(),
});

export type BunPmLsResult = z.infer<typeof BunPmLsResultSchema>;
