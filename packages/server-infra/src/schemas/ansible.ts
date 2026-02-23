import { z } from "zod";

// ── ansible-playbook ──────────────────────────────────────────────

export const AnsibleHostRecapSchema = z.object({
  host: z.string(),
  ok: z.number(),
  changed: z.number(),
  unreachable: z.number(),
  failed: z.number(),
  skipped: z.number(),
  rescued: z.number(),
  ignored: z.number(),
});

export type AnsibleHostRecap = z.infer<typeof AnsibleHostRecapSchema>;

export const AnsiblePlaySchema = z.object({
  name: z.string(),
  hosts: z.array(z.string()).optional(),
  taskCount: z.number().optional(),
});

export type AnsiblePlay = z.infer<typeof AnsiblePlaySchema>;

export const AnsiblePlaybookResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  plays: z.array(AnsiblePlaySchema).optional(),
  recap: z.array(AnsibleHostRecapSchema).optional(),
  duration: z.string().optional(),
  taskList: z.array(z.string()).optional(),
  tagList: z.array(z.string()).optional(),
  syntaxOk: z.boolean().optional(),
  error: z.string().optional(),
});

export type AnsiblePlaybookResult = z.infer<typeof AnsiblePlaybookResultSchema>;

// ── ansible-inventory ─────────────────────────────────────────────

export const AnsibleInventoryHostSchema = z.object({
  name: z.string(),
  vars: z.record(z.string(), z.unknown()).optional(),
});

export type AnsibleInventoryHost = z.infer<typeof AnsibleInventoryHostSchema>;

export const AnsibleInventoryGroupSchema = z.object({
  name: z.string(),
  hosts: z.array(z.string()),
  children: z.array(z.string()).optional(),
  vars: z.record(z.string(), z.unknown()).optional(),
});

export type AnsibleInventoryGroup = z.infer<typeof AnsibleInventoryGroupSchema>;

export const AnsibleInventoryResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  groups: z.array(AnsibleInventoryGroupSchema).optional(),
  graph: z.string().optional(),
  hostDetail: AnsibleInventoryHostSchema.optional(),
  error: z.string().optional(),
});

export type AnsibleInventoryResult = z.infer<typeof AnsibleInventoryResultSchema>;

// ── ansible-galaxy ────────────────────────────────────────────────

export const AnsibleGalaxyItemSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

export type AnsibleGalaxyItem = z.infer<typeof AnsibleGalaxyItemSchema>;

export const AnsibleGalaxyResultSchema = z.object({
  success: z.boolean(),
  exitCode: z.number(),
  action: z.enum(["collection-install", "role-install", "collection-list", "role-list"]),
  installed: z.array(AnsibleGalaxyItemSchema).optional(),
  items: z.array(AnsibleGalaxyItemSchema).optional(),
  duration: z.string().optional(),
  error: z.string().optional(),
});

export type AnsibleGalaxyResult = z.infer<typeof AnsibleGalaxyResultSchema>;
