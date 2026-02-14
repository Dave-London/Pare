import { z } from "zod";

/** Zod schema for structured process run output with stdout, stderr, exit code, duration, and timeout/signal info. */
export const ProcessRunResultSchema = z.object({
  command: z.string(),
  exitCode: z.number(),
  success: z.boolean(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
  signal: z.string().optional(),
});

export type ProcessRunResult = z.infer<typeof ProcessRunResultSchema>;
