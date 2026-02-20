import { z } from "zod";

// ── vagrant status ─────────────────────────────────────────────────

export const VagrantStatusResultSchema = z.object({
  action: z.literal("status"),
  success: z.boolean(),
  machines: z.array(
    z.object({
      name: z.string(),
      state: z.string(),
      provider: z.string(),
    }),
  ),
  count: z.number(),
  exitCode: z.number(),
});

export type VagrantStatusResult = z.infer<typeof VagrantStatusResultSchema>;

// ── vagrant up ─────────────────────────────────────────────────────

export const VagrantUpResultSchema = z.object({
  action: z.literal("up"),
  success: z.boolean(),
  machines: z.array(
    z.object({
      name: z.string(),
      state: z.string(),
      provider: z.string(),
    }),
  ),
  warnings: z.array(z.string()).optional(),
  exitCode: z.number(),
});

export type VagrantUpResult = z.infer<typeof VagrantUpResultSchema>;

// ── vagrant halt / destroy ─────────────────────────────────────────

export const VagrantLifecycleResultSchema = z.object({
  action: z.enum(["halt", "destroy"]),
  success: z.boolean(),
  machines: z.array(
    z.object({
      name: z.string(),
      newState: z.string(),
    }),
  ),
  exitCode: z.number(),
});

export type VagrantLifecycleResult = z.infer<typeof VagrantLifecycleResultSchema>;

// ── vagrant global-status ──────────────────────────────────────────

export const VagrantGlobalStatusResultSchema = z.object({
  action: z.literal("global-status"),
  success: z.boolean(),
  machines: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      provider: z.string(),
      state: z.string(),
      directory: z.string(),
    }),
  ),
  count: z.number(),
  exitCode: z.number(),
});

export type VagrantGlobalStatusResult = z.infer<typeof VagrantGlobalStatusResultSchema>;

// ── Union result schema ────────────────────────────────────────────

export const VagrantResultSchema = z.discriminatedUnion("action", [
  VagrantStatusResultSchema,
  VagrantUpResultSchema,
  VagrantLifecycleResultSchema,
  VagrantGlobalStatusResultSchema,
]);

export type VagrantResult = z.infer<typeof VagrantResultSchema>;
