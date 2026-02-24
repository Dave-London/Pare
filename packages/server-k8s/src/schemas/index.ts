import { z } from "zod";

// ── Shared resource item schema ─────────────────────────────────────

/** Owner reference for a Kubernetes resource. */
export const K8sOwnerReferenceSchema = z.object({
  apiVersion: z.string(),
  kind: z.string(),
  name: z.string(),
  uid: z.string(),
});

export type K8sOwnerReference = z.infer<typeof K8sOwnerReferenceSchema>;

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
      annotations: z.record(z.string(), z.string()).optional(),
      ownerReferences: z.array(K8sOwnerReferenceSchema).optional(),
      finalizers: z.array(z.string()).optional(),
      resourceVersion: z.string().optional(),
      uid: z.string().optional(),
    })
    .optional(),
  status: z.record(z.string(), z.unknown()).optional(),
  spec: z.record(z.string(), z.unknown()).optional(),
});

export type K8sResource = z.infer<typeof K8sResourceSchema>;

// ── Get result ──────────────────────────────────────────────────────

/** Zod schema for structured `kubectl get` output.
 * Removed echo-back: resource, namespace, names (agent already knows).
 * Removed derivable: total (= items.length). */
export const KubectlGetResultSchema = z.object({
  action: z.literal("get"),
  success: z.boolean(),
  items: z.array(K8sResourceSchema).optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type KubectlGetResult = z.infer<typeof KubectlGetResultSchema>;

/** Internal type for parser -> formatter data flow (includes display-only fields). */
export type KubectlGetResultInternal = KubectlGetResult & {
  resource: string;
  namespace?: string;
  names?: string[];
  total: number;
};

// ── Describe result ─────────────────────────────────────────────────

/** A single Kubernetes condition from `kubectl describe`. */
export const K8sConditionSchema = z.object({
  type: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  message: z.string().optional(),
});

export type K8sCondition = z.infer<typeof K8sConditionSchema>;

/** A single Kubernetes event from `kubectl describe`. */
export const K8sEventSchema = z.object({
  type: z.string(),
  reason: z.string(),
  age: z.string(),
  from: z.string(),
  message: z.string(),
});

export type K8sEvent = z.infer<typeof K8sEventSchema>;

/** Zod schema for structured `kubectl describe` output.
 * Removed echo-back: resource, name, namespace (agent already knows).
 * Moved to formatter: output (raw describe text). */
export const KubectlDescribeResultSchema = z.object({
  action: z.literal("describe"),
  success: z.boolean(),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
  resourceDetails: z
    .object({
      pod: z
        .object({
          node: z.string().optional(),
          ip: z.string().optional(),
          qosClass: z.string().optional(),
          serviceAccount: z.string().optional(),
          containers: z.array(z.string()).optional(),
        })
        .optional(),
      service: z
        .object({
          type: z.string().optional(),
          clusterIP: z.string().optional(),
          ports: z
            .array(
              z.object({
                name: z.string().optional(),
                port: z.string(),
                targetPort: z.string().optional(),
                protocol: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
      deployment: z
        .object({
          strategy: z.string().optional(),
          replicas: z
            .object({
              desired: z.number().optional(),
              updated: z.number().optional(),
              total: z.number().optional(),
              available: z.number().optional(),
              unavailable: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  conditions: z.array(K8sConditionSchema).optional(),
  events: z.array(K8sEventSchema).optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type KubectlDescribeResult = z.infer<typeof KubectlDescribeResultSchema>;

/** Internal type for parser -> formatter data flow (includes display-only fields). */
export type KubectlDescribeResultInternal = KubectlDescribeResult & {
  resource: string;
  name: string;
  namespace?: string;
  output?: string;
};

// ── Logs result ─────────────────────────────────────────────────────

/** Zod schema for structured `kubectl logs` output.
 * Removed echo-back: pod, container, namespace (agent already knows).
 * Removed derivable: lineCount (= logs.split('\\n').length). */
export const KubectlLogsResultSchema = z.object({
  action: z.literal("logs"),
  success: z.boolean(),
  logs: z.string().optional(),
  truncated: z.boolean().optional(),
  logEntries: z
    .array(
      z.object({
        raw: z.string(),
        json: z.unknown().optional(),
      }),
    )
    .optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type KubectlLogsResult = z.infer<typeof KubectlLogsResultSchema>;

/** Internal type for parser -> formatter data flow (includes display-only fields). */
export type KubectlLogsResultInternal = KubectlLogsResult & {
  pod: string;
  namespace?: string;
  container?: string;
  lineCount: number;
};

// ── Apply result ────────────────────────────────────────────────────

/** A single resource affected by `kubectl apply`. */
export const K8sAppliedResourceSchema = z.object({
  kind: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  operation: z.enum(["created", "configured", "unchanged", "deleted", "pruned", "unknown"]),
});

export type K8sAppliedResource = z.infer<typeof K8sAppliedResourceSchema>;

/** Zod schema for structured `kubectl apply` output.
 * Moved to formatter: output (raw apply text). */
export const KubectlApplyResultSchema = z.object({
  action: z.literal("apply"),
  success: z.boolean(),
  resources: z.array(K8sAppliedResourceSchema).optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type KubectlApplyResult = z.infer<typeof KubectlApplyResultSchema>;

/** Internal type for parser -> formatter data flow (includes display-only fields). */
export type KubectlApplyResultInternal = KubectlApplyResult & {
  output?: string;
};

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

/** Helm list result.
 * Removed echo-back: namespace, names (agent already knows).
 * Removed derivable: total (= releases.length). */
export const HelmListResultSchema = z.object({
  action: z.literal("list"),
  success: z.boolean(),
  releases: z.array(HelmReleaseSchema).optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmListResult = z.infer<typeof HelmListResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmListResultInternal = HelmListResult & {
  namespace?: string;
  names?: string[];
  total: number;
};

/** Helm status result.
 * Removed echo-back: name, namespace (agent already knows).
 * Moved to formatter: notes (display-only). */
export const HelmStatusResultSchema = z.object({
  action: z.literal("status"),
  success: z.boolean(),
  revision: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmStatusResult = z.infer<typeof HelmStatusResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmStatusResultInternal = HelmStatusResult & {
  name: string;
  namespace?: string;
  notes?: string;
};

/** Helm install/upgrade result.
 * Removed echo-back: name (agent already knows). */
export const HelmInstallResultSchema = z.object({
  action: z.literal("install"),
  success: z.boolean(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  chart: z.string().optional(),
  appVersion: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmInstallResult = z.infer<typeof HelmInstallResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmInstallResultInternal = HelmInstallResult & {
  name: string;
};

export const HelmUpgradeResultSchema = z.object({
  action: z.literal("upgrade"),
  success: z.boolean(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  chart: z.string().optional(),
  appVersion: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmUpgradeResult = z.infer<typeof HelmUpgradeResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmUpgradeResultInternal = HelmUpgradeResult & {
  name: string;
};

export const HelmUninstallResultSchema = z.object({
  action: z.literal("uninstall"),
  success: z.boolean(),
  namespace: z.string().optional(),
  status: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmUninstallResult = z.infer<typeof HelmUninstallResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmUninstallResultInternal = HelmUninstallResult & {
  name: string;
};

export const HelmRollbackResultSchema = z.object({
  action: z.literal("rollback"),
  success: z.boolean(),
  namespace: z.string().optional(),
  revision: z.string().optional(),
  status: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmRollbackResult = z.infer<typeof HelmRollbackResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmRollbackResultInternal = HelmRollbackResult & {
  name: string;
};

// ── Helm history schema ─────────────────────────────────────────────

/** A single Helm revision from `helm history -o json`. */
export const HelmRevisionSchema = z.object({
  revision: z.number(),
  updated: z.string(),
  status: z.string(),
  chart: z.string(),
  appVersion: z.string().optional(),
  description: z.string().optional(),
});

export type HelmRevision = z.infer<typeof HelmRevisionSchema>;

/** Helm history result.
 * Removed echo-back: name (agent already knows).
 * Removed derivable: total (= revisions.length). */
export const HelmHistoryResultSchema = z.object({
  action: z.literal("history"),
  success: z.boolean(),
  namespace: z.string().optional(),
  revisions: z.array(HelmRevisionSchema).optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmHistoryResult = z.infer<typeof HelmHistoryResultSchema>;

/** Internal type for parser -> formatter data flow. */
export type HelmHistoryResultInternal = HelmHistoryResult & {
  name: string;
  total: number;
};

// ── Helm template schema ────────────────────────────────────────────

/** Helm template result. */
export const HelmTemplateResultSchema = z.object({
  action: z.literal("template"),
  success: z.boolean(),
  manifests: z.string().optional(),
  manifestCount: z.number(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
});

export type HelmTemplateResult = z.infer<typeof HelmTemplateResultSchema>;

/** Union of all helm result types. */
export const HelmResultSchema = z.discriminatedUnion("action", [
  HelmListResultSchema,
  HelmStatusResultSchema,
  HelmInstallResultSchema,
  HelmUpgradeResultSchema,
  HelmUninstallResultSchema,
  HelmRollbackResultSchema,
  HelmHistoryResultSchema,
  HelmTemplateResultSchema,
]);

export type HelmResult = z.infer<typeof HelmResultSchema>;
