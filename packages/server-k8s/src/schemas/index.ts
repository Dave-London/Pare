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
