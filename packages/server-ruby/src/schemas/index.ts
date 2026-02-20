import { z } from "zod";

// ── Run ─────────────────────────────────────────────────────────────────

/** Zod schema for `ruby <file>` execution result. */
export const RubyRunResultSchema = z.object({
  file: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type RubyRunResult = z.infer<typeof RubyRunResultSchema>;

// ── Check ───────────────────────────────────────────────────────────────

/** Zod schema for `ruby -c <file>` syntax check result. */
export const RubyCheckResultSchema = z.object({
  file: z.string(),
  valid: z.boolean(),
  exitCode: z.number(),
  message: z.string().optional(),
  errors: z.string().optional(),
});

export type RubyCheckResult = z.infer<typeof RubyCheckResultSchema>;

// ── Gem List ────────────────────────────────────────────────────────────

export const GemEntrySchema = z.object({
  name: z.string(),
  versions: z.array(z.string()),
});

/** Zod schema for `gem list --local` result. */
export const GemListResultSchema = z.object({
  gems: z.array(GemEntrySchema),
  total: z.number(),
});

export type GemListResult = z.infer<typeof GemListResultSchema>;

// ── Gem Install ─────────────────────────────────────────────────────────

/** Zod schema for `gem install <name>` result. */
export const GemInstallResultSchema = z.object({
  gem: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
});

export type GemInstallResult = z.infer<typeof GemInstallResultSchema>;

// ── Gem Outdated ────────────────────────────────────────────────────────

export const OutdatedGemSchema = z.object({
  name: z.string(),
  current: z.string(),
  latest: z.string(),
});

/** Zod schema for `gem outdated` result. */
export const GemOutdatedResultSchema = z.object({
  gems: z.array(OutdatedGemSchema),
  total: z.number(),
});

export type GemOutdatedResult = z.infer<typeof GemOutdatedResultSchema>;

// ── Bundle Install ──────────────────────────────────────────────────────

/** Zod schema for `bundle install` result. */
export const BundleInstallResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
});

export type BundleInstallResult = z.infer<typeof BundleInstallResultSchema>;

// ── Bundle Exec ─────────────────────────────────────────────────────────

/** Zod schema for `bundle exec <cmd>` result. */
export const BundleExecResultSchema = z.object({
  command: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type BundleExecResult = z.infer<typeof BundleExecResultSchema>;

// ── Bundle Check ────────────────────────────────────────────────────────

/** Zod schema for `bundle check` result. */
export const BundleCheckResultSchema = z.object({
  satisfied: z.boolean(),
  exitCode: z.number(),
  message: z.string().optional(),
  errors: z.string().optional(),
});

export type BundleCheckResult = z.infer<typeof BundleCheckResultSchema>;
