import { z } from "zod";

// ── SSH Run ─────────────────────────────────────────────────────────────

/** Zod schema for structured ssh command execution output. */
export const SshRunResultSchema = z.object({
  host: z.string(),
  user: z.string().optional(),
  command: z.string(),
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type SshRunResult = z.infer<typeof SshRunResultSchema>;

// ── SSH Test ────────────────────────────────────────────────────────────

/** Zod schema for structured ssh connectivity test output. */
export const SshTestResultSchema = z.object({
  host: z.string(),
  user: z.string().optional(),
  reachable: z.boolean(),
  exitCode: z.number(),
  banner: z.string().optional(),
  error: z.string().optional(),
  duration: z.number(),
});

export type SshTestResult = z.infer<typeof SshTestResultSchema>;

// ── SSH Keyscan ─────────────────────────────────────────────────────────

/** Zod schema for a single host key entry. */
export const HostKeySchema = z.object({
  host: z.string(),
  keyType: z.string(),
  key: z.string(),
});

/** Zod schema for structured ssh-keyscan output. */
export const SshKeyscanResultSchema = z.object({
  host: z.string(),
  keys: z.array(HostKeySchema),
  error: z.string().optional(),
  success: z.boolean(),
});

export type SshKeyscanResult = z.infer<typeof SshKeyscanResultSchema>;

// ── Rsync ───────────────────────────────────────────────────────────────

/** Zod schema for structured rsync transfer output. */
export const RsyncResultSchema = z.object({
  source: z.string(),
  destination: z.string(),
  dryRun: z.boolean(),
  success: z.boolean(),
  exitCode: z.number(),
  filesTransferred: z.number().optional(),
  totalSize: z.string().optional(),
  speedup: z.string().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type RsyncResult = z.infer<typeof RsyncResultSchema>;
