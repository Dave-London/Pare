import { z } from "zod";

/** Zod schema for structured process run output with stdout, stderr, exit code, and timeout/signal info.
 * Removed echo-back: command (agent already knows).
 * Moved to formatter: duration, userCpuTimeMs, systemCpuTimeMs, stdoutTruncatedLines, stderrTruncatedLines. */
export const ProcessRunResultSchema = z.object({
  exitCode: z.number(),
  success: z.boolean(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  timedOut: z.boolean(),
  truncated: z.boolean().optional(),
  signal: z.string().optional(),
});

export type ProcessRunResult = z.infer<typeof ProcessRunResultSchema>;

/** Internal type with display-only fields for formatters. */
export type ProcessRunResultInternal = ProcessRunResult & {
  command: string;
  duration: number;
  userCpuTimeMs?: number;
  systemCpuTimeMs?: number;
  stdoutTruncatedLines?: number;
  stderrTruncatedLines?: number;
};

/** Zod schema for structured reload tool output.
 * Moved to formatter: buildOutput, buildDuration. */
export const ReloadResultSchema = z.object({
  rebuilt: z.boolean(),
  notificationSent: z.boolean(),
  error: z.string().optional(),
});

export type ReloadResult = z.infer<typeof ReloadResultSchema>;

/** Internal type with display-only fields for reload formatters. */
export type ReloadResultInternal = ReloadResult & {
  buildCommand: string;
  buildDuration: number;
  buildOutput?: string;
};
