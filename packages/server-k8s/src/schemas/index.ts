import { z } from "zod";

// ── Shared resource item schema ─────────────────────────────────────

/** A single Kubernetes resource item from `kubectl get -o json`. */
export const K8sResourceSchema = z.object({
  apiVersion: z.string().optional(),
  kind: z.string().optional(),
  metadata: z
    .object({
      name: z.string().optional(),
      namespace: z.string().optional(),
      creationTimestamp: z.string().optional(),
      labels: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  status: z.record(z.string(), z.unknown()).optional(),
  spec: z.record(z.string(), z.unknown()).optional(),
});

export type K8sResource = z.infer<typeof K8sResourceSchema>;

// ── Get result ──────────────────────────────────────────────────────

/** Zod schema for structured `kubectl get` output. */
export const KubectlGetResultSchema = z.object({
  action: z.literal("get"),
  success: z.boolean(),
  resource: z.string(),
  namespace: z.string().optional(),
  items: z.array(K8sResourceSchema),
  total: z.number(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type KubectlGetResult = z.infer<typeof KubectlGetResultSchema>;

// ── Describe result ─────────────────────────────────────────────────

/** Zod schema for structured `kubectl describe` output. */
export const KubectlDescribeResultSchema = z.object({
  action: z.literal("describe"),
  success: z.boolean(),
  resource: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  output: z.string(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type KubectlDescribeResult = z.infer<typeof KubectlDescribeResultSchema>;

// ── Logs result ─────────────────────────────────────────────────────

/** Zod schema for structured `kubectl logs` output. */
export const KubectlLogsResultSchema = z.object({
  action: z.literal("logs"),
  success: z.boolean(),
  pod: z.string(),
  namespace: z.string().optional(),
  container: z.string().optional(),
  logs: z.string(),
  lineCount: z.number(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type KubectlLogsResult = z.infer<typeof KubectlLogsResultSchema>;

// ── Apply result ────────────────────────────────────────────────────

/** Zod schema for structured `kubectl apply` output. */
export const KubectlApplyResultSchema = z.object({
  action: z.literal("apply"),
  success: z.boolean(),
  output: z.string(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type KubectlApplyResult = z.infer<typeof KubectlApplyResultSchema>;

// ── Union result ────────────────────────────────────────────────────

/** Union of all kubectl result types. */
export const KubectlResultSchema = z.discriminatedUnion("action", [
  KubectlGetResultSchema,
  KubectlDescribeResultSchema,
  KubectlLogsResultSchema,
  KubectlApplyResultSchema,
]);

export type KubectlResult = z.infer<typeof KubectlResultSchema>;

// ── Helm schemas ───────────────────────────────────────────────────

/** A single Helm release from `helm list -o json`. */
export const HelmReleaseSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  revision: z.string(),
  status: z.string(),
  chart: z.string(),
  app_version: z.string().optional(),
});

export type HelmRelease = z.infer<typeof HelmReleaseSchema>;

/** Helm list result. */
export const HelmListResultSchema = z.object({
  action: z.literal("list"),
  success: z.boolean(),
  namespace: z.string().optional(),
  releases: z.array(HelmReleaseSchema),
  total: z.number(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type HelmListResult = z.infer<typeof HelmListResultSchema>;

/** Helm status result. */
export const HelmStatusResultSchema = z.object({
  action: z.literal("status"),
  success: z.boolean(),
  name: z.string(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type HelmStatusResult = z.infer<typeof HelmStatusResultSchema>;

/** Helm install/upgrade result. */
export const HelmInstallResultSchema = z.object({
  action: z.literal("install"),
  success: z.boolean(),
  name: z.string(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type HelmInstallResult = z.infer<typeof HelmInstallResultSchema>;

export const HelmUpgradeResultSchema = z.object({
  action: z.literal("upgrade"),
  success: z.boolean(),
  name: z.string(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  exitCode: z.number(),
  error: z.string().optional(),
});

export type HelmUpgradeResult = z.infer<typeof HelmUpgradeResultSchema>;

/** Union of all helm result types. */
export const HelmResultSchema = z.discriminatedUnion("action", [
  HelmListResultSchema,
  HelmStatusResultSchema,
  HelmInstallResultSchema,
  HelmUpgradeResultSchema,
]);

export type HelmResult = z.infer<typeof HelmResultSchema>;
