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
});

export type MakeRunResult = z.infer<typeof MakeRunResultSchema>;

/** Zod schema for a single target entry with name and optional description. */
export const MakeTargetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

/** Zod schema for structured make/just list output with targets and total count. */
export const MakeListResultSchema = z.object({
  targets: z.array(MakeTargetSchema),
  total: z.number(),
  tool: z.enum(["make", "just"]),
});

export type MakeListResult = z.infer<typeof MakeListResultSchema>;
