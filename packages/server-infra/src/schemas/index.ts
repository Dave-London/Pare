import { z } from "zod";

// ── terraform init ──────────────────────────────────────────────────

export const TerraformInitResultSchema = z.object({
  success: z.boolean(),
  providers: z
    .array(
      z.object({
        name: z.string(),
        version: z.string().optional(),
      }),
    )
    .optional(),
  backendType: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type TerraformInitResult = z.infer<typeof TerraformInitResultSchema>;

// ── terraform plan ──────────────────────────────────────────────────

export const TerraformPlanResultSchema = z.object({
  success: z.boolean(),
  add: z.number(),
  change: z.number(),
  destroy: z.number(),
  resources: z
    .array(
      z.object({
        address: z.string(),
        action: z.enum(["create", "update", "delete", "replace", "read", "no-op"]),
      }),
    )
    .optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export type TerraformPlanResult = z.infer<typeof TerraformPlanResultSchema>;

// ── terraform validate ──────────────────────────────────────────────

export const TerraformValidateResultSchema = z.object({
  valid: z.boolean(),
  errorCount: z.number(),
  warningCount: z.number(),
  diagnostics: z
    .array(
      z.object({
        severity: z.enum(["error", "warning"]),
        summary: z.string(),
        detail: z.string().optional(),
        file: z.string().optional(),
        line: z.number().optional(),
      }),
    )
    .optional(),
});

export type TerraformValidateResult = z.infer<typeof TerraformValidateResultSchema>;

// ── terraform fmt ───────────────────────────────────────────────────

export const TerraformFmtResultSchema = z.object({
  success: z.boolean(),
  files: z.array(z.string()).optional(),
  diff: z.string().optional(),
});

export type TerraformFmtResult = z.infer<typeof TerraformFmtResultSchema>;

// ── terraform output ────────────────────────────────────────────────

export const TerraformOutputResultSchema = z.object({
  success: z.boolean(),
  outputs: z
    .array(
      z.object({
        name: z.string(),
        value: z.unknown(),
        type: z.string().optional(),
        sensitive: z.boolean().optional(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

export type TerraformOutputResult = z.infer<typeof TerraformOutputResultSchema>;

// ── terraform state list ────────────────────────────────────────────

export const TerraformStateListResultSchema = z.object({
  success: z.boolean(),
  resources: z.array(z.string()).optional(),
  total: z.number(),
  error: z.string().optional(),
});

export type TerraformStateListResult = z.infer<typeof TerraformStateListResultSchema>;

// ── terraform workspace ─────────────────────────────────────────────

export const TerraformWorkspaceResultSchema = z.object({
  success: z.boolean(),
  workspaces: z.array(z.string()).optional(),
  current: z.string().optional(),
  action: z.enum(["list", "select", "new", "delete"]),
  error: z.string().optional(),
});

export type TerraformWorkspaceResult = z.infer<typeof TerraformWorkspaceResultSchema>;

// ── terraform show ──────────────────────────────────────────────────

export const TerraformShowResultSchema = z.object({
  success: z.boolean(),
  terraformVersion: z.string().optional(),
  resourceCount: z.number(),
  resources: z
    .array(
      z.object({
        address: z.string(),
        type: z.string(),
        name: z.string(),
        provider: z.string().optional(),
      }),
    )
    .optional(),
  outputs: z
    .array(
      z.object({
        name: z.string(),
        value: z.unknown(),
        sensitive: z.boolean().optional(),
      }),
    )
    .optional(),
  error: z.string().optional(),
});

export type TerraformShowResult = z.infer<typeof TerraformShowResultSchema>;
