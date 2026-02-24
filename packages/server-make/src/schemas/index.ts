import { z } from "zod";

/** Zod schema for structured make/just run output with stdout, stderr, exit code, and duration.
 * Moved to formatter: target (echo-back), tool (echo-back), duration (display-only), errorType (display-only). */
export const MakeRunResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  timedOut: z.boolean(),
});

export type MakeRunResult = z.infer<typeof MakeRunResultSchema>;

/** Internal type with display-only fields for formatters. */
export type MakeRunResultInternal = MakeRunResult & {
  target: string;
  tool: "make" | "just";
  duration: number;
  errorType?: "missing-target" | "recipe-failure" | "parse-error";
};

/** Zod schema for a single target entry with name, optional description, and dependencies.
 * Moved to formatter: isPhony (display-only), recipe (display-only). */
export const MakeTargetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

/** Zod schema for a Make pattern rule entry (e.g., `%.o: %.c`). */
export const MakePatternRuleSchema = z.object({
  pattern: z.string(),
  dependencies: z.array(z.string()).optional(),
  recipe: z.array(z.string()).optional(),
});

/** Zod schema for structured make/just list output with targets.
 * Removed derivable: total (= targets.length).
 * Moved to formatter: tool (echo-back). */
export const MakeListResultSchema = z.object({
  targets: z.array(MakeTargetSchema).optional(),
  patternRules: z.array(MakePatternRuleSchema).optional(),
});

export type MakeListResult = z.infer<typeof MakeListResultSchema>;

/** Internal target type with display-only fields. */
export interface MakeTargetInternal {
  name: string;
  description?: string;
  isPhony?: boolean;
  dependencies?: string[];
  recipe?: string[];
}

/** Internal type with display-only fields for formatters. */
export type MakeListResultInternal = Omit<MakeListResult, "targets"> & {
  targets?: MakeTargetInternal[];
  total: number;
  tool: "make" | "just";
};
