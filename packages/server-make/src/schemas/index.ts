import { z } from "zod";

/** Zod schema for structured make/just run output with stdout, stderr, exit code, and duration. */
export const MakeRunResultSchema = z.object({
  target: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  tool: z.enum(["make", "just"]),
  timedOut: z.boolean(),
  errorType: z.enum(["missing-target", "recipe-failure", "parse-error"]).optional(),
});

export type MakeRunResult = z.infer<typeof MakeRunResultSchema>;

/** Zod schema for a single target entry with name, optional description, phony flag, and dependencies. */
export const MakeTargetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  isPhony: z.boolean().optional(),
  dependencies: z.array(z.string()).optional(),
  recipe: z.array(z.string()).optional(),
});

/** Zod schema for a Make pattern rule entry (e.g., `%.o: %.c`). */
export const MakePatternRuleSchema = z.object({
  pattern: z.string(),
  dependencies: z.array(z.string()).optional(),
  recipe: z.array(z.string()).optional(),
});

/** Zod schema for structured make/just list output with targets and total count. */
export const MakeListResultSchema = z.object({
  targets: z.array(MakeTargetSchema).optional(),
  patternRules: z.array(MakePatternRuleSchema).optional(),
  total: z.number(),
  tool: z.enum(["make", "just"]),
});

export type MakeListResult = z.infer<typeof MakeListResultSchema>;
