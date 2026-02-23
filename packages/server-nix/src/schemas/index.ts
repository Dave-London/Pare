import { z } from "zod";

// ── nix build ────────────────────────────────────────────────────────

export const NixBuildOutputSchema = z.object({
  path: z.string(),
  size: z.number().optional(),
});

export const NixBuildResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  outputs: z.array(NixBuildOutputSchema),
  errors: z.array(z.string()).optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixBuildResult = z.infer<typeof NixBuildResultSchema>;

// ── nix run ──────────────────────────────────────────────────────────

export const NixRunResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixRunResult = z.infer<typeof NixRunResultSchema>;

// ── nix develop ──────────────────────────────────────────────────────

export const NixDevelopResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixDevelopResult = z.infer<typeof NixDevelopResultSchema>;

// ── nix shell ────────────────────────────────────────────────────────

export const NixShellResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixShellResult = z.infer<typeof NixShellResultSchema>;

// ── nix flake show ───────────────────────────────────────────────────

export const NixFlakeShowResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.string()).optional(),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixFlakeShowResult = z.infer<typeof NixFlakeShowResultSchema>;

// ── nix flake check ──────────────────────────────────────────────────

export const NixFlakeCheckEntrySchema = z.object({
  name: z.string(),
  status: z.enum(["pass", "fail", "unknown"]),
});

export const NixFlakeCheckResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  checks: z.array(NixFlakeCheckEntrySchema),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixFlakeCheckResult = z.infer<typeof NixFlakeCheckResultSchema>;

// ── nix flake update ─────────────────────────────────────────────────

export const NixFlakeUpdatedInputSchema = z.object({
  name: z.string(),
  oldRev: z.string().optional(),
  newRev: z.string().optional(),
});

export const NixFlakeUpdateResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  updatedInputs: z.array(NixFlakeUpdatedInputSchema),
  errors: z.array(z.string()),
  duration: z.number(),
  timedOut: z.boolean(),
});

export type NixFlakeUpdateResult = z.infer<typeof NixFlakeUpdateResultSchema>;
