import type {
  KubectlGetResult,
  KubectlGetResultInternal,
  KubectlDescribeResult,
  KubectlDescribeResultInternal,
  KubectlLogsResult,
  KubectlLogsResultInternal,
  KubectlApplyResult,
  KubectlApplyResultInternal,
  HelmListResult,
  HelmListResultInternal,
  HelmStatusResult,
  HelmStatusResultInternal,
  HelmInstallResult,
  HelmInstallResultInternal,
  HelmUpgradeResult,
  HelmUpgradeResultInternal,
  HelmUninstallResult,
  HelmUninstallResultInternal,
  HelmRollbackResult,
  HelmRollbackResultInternal,
  HelmHistoryResult,
  HelmHistoryResultInternal,
  HelmTemplateResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats a kubectl get result into human-readable text. */
export function formatGet(data: KubectlGetResultInternal): string {
  if (!data.success) {
    return `kubectl get ${data.resource}: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  const lines = [`kubectl get ${data.resource}${ns}: ${data.total} item(s)`];
  for (const item of data.items ?? []) {
    const name = item.metadata?.name ?? "unknown";
    const kind = item.kind ?? "";
    const uid = item.metadata?.uid ? ` (uid: ${item.metadata.uid})` : "";
    const rv = item.metadata?.resourceVersion ? ` [rv: ${item.metadata.resourceVersion}]` : "";
    lines.push(`  ${kind} ${name}${uid}${rv}`);
    if (item.metadata?.annotations && Object.keys(item.metadata.annotations).length > 0) {
      const count = Object.keys(item.metadata.annotations).length;
      lines.push(`    annotations: ${count} key(s)`);
    }
    if (item.metadata?.ownerReferences && item.metadata.ownerReferences.length > 0) {
      for (const ref of item.metadata.ownerReferences) {
        lines.push(`    owner: ${ref.kind}/${ref.name}`);
      }
    }
    if (item.metadata?.finalizers && item.metadata.finalizers.length > 0) {
      lines.push(`    finalizers: ${item.metadata.finalizers.join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Formats a kubectl describe result into human-readable text. */
export function formatDescribe(data: KubectlDescribeResultInternal): string {
  if (!data.success) {
    return `kubectl describe ${data.resource} ${data.name}: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  const parts: string[] = [];
  if (data.output) parts.push(data.output);
  if (data.labels && Object.keys(data.labels).length > 0) {
    parts.push(`Labels: ${Object.keys(data.labels).length} parsed`);
  }
  if (data.annotations && Object.keys(data.annotations).length > 0) {
    parts.push(`Annotations: ${Object.keys(data.annotations).length} parsed`);
  }
  if (data.resourceDetails?.pod) {
    const pod = data.resourceDetails.pod;
    const podParts = [
      pod.node ? `node=${pod.node}` : undefined,
      pod.ip ? `ip=${pod.ip}` : undefined,
      pod.qosClass ? `qos=${pod.qosClass}` : undefined,
      pod.serviceAccount ? `serviceAccount=${pod.serviceAccount}` : undefined,
      pod.containers ? `containers=${pod.containers.length}` : undefined,
    ].filter(Boolean);
    if (podParts.length > 0) parts.push(`Pod details: ${podParts.join(", ")}`);
  }
  if (data.resourceDetails?.service) {
    const svc = data.resourceDetails.service;
    const svcParts = [
      svc.type ? `type=${svc.type}` : undefined,
      svc.clusterIP ? `clusterIP=${svc.clusterIP}` : undefined,
      svc.ports ? `ports=${svc.ports.length}` : undefined,
    ].filter(Boolean);
    if (svcParts.length > 0) parts.push(`Service details: ${svcParts.join(", ")}`);
  }
  if (data.resourceDetails?.deployment) {
    const dep = data.resourceDetails.deployment;
    const rep = dep.replicas;
    const replicaSummary = rep
      ? [rep.desired, rep.updated, rep.total, rep.available, rep.unavailable].some(
          (v) => v !== undefined,
        )
        ? `replicas desired=${rep.desired ?? "?"} updated=${rep.updated ?? "?"} total=${rep.total ?? "?"} available=${rep.available ?? "?"} unavailable=${rep.unavailable ?? "?"}`
        : undefined
      : undefined;
    const depParts = [dep.strategy ? `strategy=${dep.strategy}` : undefined, replicaSummary].filter(
      Boolean,
    );
    if (depParts.length > 0) parts.push(`Deployment details: ${depParts.join(", ")}`);
  }
  if (data.conditions && data.conditions.length > 0) {
    parts.push(`\nConditions: ${data.conditions.length} parsed`);
  }
  if (data.events && data.events.length > 0) {
    parts.push(`Events: ${data.events.length} parsed`);
  }
  return parts.join("\n") || "";
}

/** Formats a kubectl logs result into human-readable text. */
export function formatLogs(data: KubectlLogsResultInternal): string {
  if (!data.success) {
    return `kubectl logs ${data.pod}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const truncated = data.truncated ? " [truncated]" : "";
  const parsedJson = data.logEntries ? ` (${data.logEntries.length} parsed entries)` : "";
  const header = `kubectl logs ${data.pod}: ${data.lineCount} line(s)${truncated}${parsedJson}`;
  if (!data.logs) return header;
  return `${header}\n${data.logs}`;
}

/** Formats a kubectl apply result into human-readable text. */
export function formatApply(data: KubectlApplyResultInternal): string {
  if (!data.success) {
    return `kubectl apply: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  if (data.resources && data.resources.length > 0) {
    const lines = [`kubectl apply: ${data.resources.length} resource(s)`];
    for (const r of data.resources) {
      lines.push(`  ${r.kind}/${r.name} ${r.operation}`);
    }
    return lines.join("\n");
  }
  return `kubectl apply: success${data.output ? `\n${data.output}` : ""}`;
}

/** Internal union of all kubectl result types. */
type KubectlResultInternal =
  | KubectlGetResultInternal
  | KubectlDescribeResultInternal
  | KubectlLogsResultInternal
  | KubectlApplyResultInternal;

/** Dispatches formatting to the correct action formatter. */
export function formatResult(data: KubectlResultInternal): string {
  switch (data.action) {
    case "get":
      return formatGet(data);
    case "describe":
      return formatDescribe(data);
    case "logs":
      return formatLogs(data);
    case "apply":
      return formatApply(data);
  }
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact get: summary without full resource details (schema-compatible). */
export interface KubectlGetCompact {
  [key: string]: unknown;
  action: "get";
  success: boolean;
  exitCode?: number;
  error?: string;
}

export function compactGetMap(data: KubectlGetResultInternal): KubectlGetCompact {
  return {
    action: "get",
    success: data.success,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatGetCompact(data: KubectlGetCompact): string {
  if (!data.success) return `kubectl get: failed`;
  return `kubectl get: success`;
}

/** Compact describe: conditions & events summary (no full output text, schema-compatible). */
export interface KubectlDescribeCompact {
  [key: string]: unknown;
  action: "describe";
  success: boolean;
  labels?: KubectlDescribeResultInternal["labels"];
  annotations?: KubectlDescribeResultInternal["annotations"];
  resourceDetails?: KubectlDescribeResultInternal["resourceDetails"];
  conditions?: KubectlDescribeResultInternal["conditions"];
  events?: KubectlDescribeResultInternal["events"];
  exitCode?: number;
  error?: string;
}

export function compactDescribeMap(data: KubectlDescribeResultInternal): KubectlDescribeCompact {
  return {
    action: "describe",
    success: data.success,
    labels: data.labels,
    annotations: data.annotations,
    resourceDetails: data.resourceDetails,
    conditions: data.conditions,
    events: data.events,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatDescribeCompact(data: KubectlDescribeCompact): string {
  if (!data.success) return `kubectl describe: failed`;
  const parts = [`kubectl describe: success`];
  if (data.conditions && data.conditions.length > 0)
    parts.push(`${data.conditions.length} condition(s)`);
  if (data.events && data.events.length > 0) parts.push(`${data.events.length} event(s)`);
  return parts.join(", ");
}

/** Compact logs: no full log content (schema-compatible). */
export interface KubectlLogsCompact {
  [key: string]: unknown;
  action: "logs";
  success: boolean;
  truncated?: boolean;
  exitCode?: number;
  error?: string;
}

export function compactLogsMap(data: KubectlLogsResultInternal): KubectlLogsCompact {
  return {
    action: "logs",
    success: data.success,
    truncated: data.truncated,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatLogsCompact(data: KubectlLogsCompact): string {
  if (!data.success) return `kubectl logs: failed`;
  const truncated = data.truncated ? " [truncated]" : "";
  return `kubectl logs: success${truncated}`;
}

/** Compact apply: success/failure status with resources (no raw output text). */
export interface KubectlApplyCompact {
  [key: string]: unknown;
  action: "apply";
  success: boolean;
  resources?: KubectlApplyResultInternal["resources"];
  exitCode: number;
}

export function compactApplyMap(data: KubectlApplyResultInternal): KubectlApplyCompact {
  return {
    action: "apply",
    success: data.success,
    resources: data.resources,
    exitCode: data.exitCode ?? 0,
  };
}

export function formatApplyCompact(data: KubectlApplyCompact): string {
  if (!data.success) return `kubectl apply: failed (exit ${data.exitCode})`;
  if (data.resources && data.resources.length > 0)
    return `kubectl apply: ${data.resources.length} resource(s)`;
  return "kubectl apply: success";
}

// ── Schema maps (strip Internal-only fields for structuredContent) ──

/** Strips Internal-only fields from get result for structuredContent. */
export function schemaGetMap(data: KubectlGetResultInternal): KubectlGetResult {
  return {
    action: data.action,
    success: data.success,
    items: data.items,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from describe result for structuredContent. */
export function schemaDescribeMap(data: KubectlDescribeResultInternal): KubectlDescribeResult {
  return {
    action: data.action,
    success: data.success,
    labels: data.labels,
    annotations: data.annotations,
    resourceDetails: data.resourceDetails,
    conditions: data.conditions,
    events: data.events,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from logs result for structuredContent. */
export function schemaLogsMap(data: KubectlLogsResultInternal): KubectlLogsResult {
  return {
    action: data.action,
    success: data.success,
    logs: data.logs,
    truncated: data.truncated,
    logEntries: data.logEntries,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from apply result for structuredContent. */
export function schemaApplyMap(data: KubectlApplyResultInternal): KubectlApplyResult {
  return {
    action: data.action,
    success: data.success,
    resources: data.resources,
    exitCode: data.exitCode,
    error: data.error,
  };
}

// ── Helm formatters ─────────────────────────────────────────────────

/** Formats a helm list result into human-readable text. */
export function formatHelmList(data: HelmListResultInternal): string {
  if (!data.success) {
    return `helm list: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  const lines = [`helm list${ns}: ${data.total} release(s)`];
  for (const r of data.releases ?? []) {
    lines.push(`  ${r.name} (${r.chart}) - ${r.status}`);
  }
  return lines.join("\n");
}

/** Formats a helm status result into human-readable text. */
export function formatHelmStatus(data: HelmStatusResultInternal): string {
  if (!data.success) {
    return `helm status ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const lines = [`helm status ${data.name}: ${data.status ?? "unknown"}`];
  if (data.revision) lines.push(`  revision: ${data.revision}`);
  if (data.description) lines.push(`  description: ${data.description}`);
  if (data.notes) lines.push(`  notes: ${data.notes}`);
  return lines.join("\n");
}

/** Formats a helm install result into human-readable text. */
export function formatHelmInstall(data: HelmInstallResultInternal): string {
  if (!data.success) {
    return `helm install ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const parts = [`helm install ${data.name}: ${data.status ?? "success"}`];
  if (data.revision) parts.push(`(revision ${data.revision})`);
  if (data.chart) parts.push(`chart=${data.chart}`);
  if (data.appVersion) parts.push(`appVersion=${data.appVersion}`);
  return parts.join(" ");
}

/** Formats a helm upgrade result into human-readable text. */
export function formatHelmUpgrade(data: HelmUpgradeResultInternal): string {
  if (!data.success) {
    return `helm upgrade ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const parts = [`helm upgrade ${data.name}: ${data.status ?? "success"}`];
  if (data.revision) parts.push(`(revision ${data.revision})`);
  if (data.chart) parts.push(`chart=${data.chart}`);
  if (data.appVersion) parts.push(`appVersion=${data.appVersion}`);
  return parts.join(" ");
}

/** Formats a helm history result into human-readable text. */
export function formatHelmHistory(data: HelmHistoryResultInternal): string {
  if (!data.success) {
    return `helm history ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  const lines = [`helm history ${data.name}${ns}: ${data.total} revision(s)`];
  for (const r of data.revisions ?? []) {
    const ver = r.appVersion ? ` (v${r.appVersion})` : "";
    const desc = r.description ? ` - ${r.description}` : "";
    lines.push(`  ${r.revision}: ${r.chart}${ver} ${r.status}${desc}`);
  }
  return lines.join("\n");
}

/** Formats a helm template result into human-readable text. */
export function formatHelmTemplate(data: HelmTemplateResult): string {
  if (!data.success) {
    return `helm template: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const header = `helm template: ${data.manifestCount} manifest(s)`;
  if (!data.manifests) return header;
  return `${header}\n${data.manifests}`;
}

/** Internal union of all helm result types. */
type HelmResultInternal =
  | HelmListResultInternal
  | HelmStatusResultInternal
  | HelmInstallResultInternal
  | HelmUpgradeResultInternal
  | HelmUninstallResultInternal
  | HelmRollbackResultInternal
  | HelmHistoryResultInternal
  | HelmTemplateResult;

/** Dispatches formatting to the correct helm action formatter. */
export function formatHelmResult(data: HelmResultInternal): string {
  switch (data.action) {
    case "list":
      return formatHelmList(data);
    case "status":
      return formatHelmStatus(data);
    case "install":
      return formatHelmInstall(data);
    case "upgrade":
      return formatHelmUpgrade(data);
    case "uninstall":
      return formatHelmUninstall(data);
    case "rollback":
      return formatHelmRollback(data);
    case "history":
      return formatHelmHistory(data);
    case "template":
      return formatHelmTemplate(data);
  }
}

// ── Helm compact types, mappers, and formatters ─────────────────────

/** Compact list: schema-compatible summary. */
export interface HelmListCompact {
  [key: string]: unknown;
  action: "list";
  success: boolean;
  exitCode?: number;
  error?: string;
}

export function compactHelmListMap(data: HelmListResultInternal): HelmListCompact {
  return {
    action: "list",
    success: data.success,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmListCompact(data: HelmListCompact): string {
  if (!data.success) return "helm list: failed";
  return `helm list: success`;
}

/** Compact status: key fields only, no notes (schema-compatible). */
export interface HelmStatusCompact {
  [key: string]: unknown;
  action: "status";
  success: boolean;
  status?: string;
  revision?: string;
  description?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmStatusMap(data: HelmStatusResultInternal): HelmStatusCompact {
  return {
    action: "status",
    success: data.success,
    status: data.status,
    revision: data.revision,
    description: data.description,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmStatusCompact(data: HelmStatusCompact): string {
  if (!data.success) return `helm status: failed`;
  return `helm status: ${data.status ?? "unknown"}`;
}

/** Compact install: success/failure only (schema-compatible). */
export interface HelmInstallCompact {
  [key: string]: unknown;
  action: "install";
  success: boolean;
  namespace?: string;
  status?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmInstallMap(data: HelmInstallResultInternal): HelmInstallCompact {
  return {
    action: "install",
    success: data.success,
    namespace: data.namespace,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmInstallCompact(data: HelmInstallCompact): string {
  if (!data.success) return `helm install: failed`;
  return `helm install: ${data.status ?? "success"}`;
}

/** Compact upgrade: success/failure only (schema-compatible). */
export interface HelmUpgradeCompact {
  [key: string]: unknown;
  action: "upgrade";
  success: boolean;
  namespace?: string;
  status?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmUpgradeMap(data: HelmUpgradeResultInternal): HelmUpgradeCompact {
  return {
    action: "upgrade",
    success: data.success,
    namespace: data.namespace,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmUpgradeCompact(data: HelmUpgradeCompact): string {
  if (!data.success) return `helm upgrade: failed`;
  return `helm upgrade: ${data.status ?? "success"}`;
}

// ── Helm uninstall formatters ───────────────────────────────────────

/** Formats a helm uninstall result into human-readable text. */
export function formatHelmUninstall(data: HelmUninstallResultInternal): string {
  if (!data.success) {
    return `helm uninstall ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  return `helm uninstall ${data.name}: ${data.status ?? "uninstalled"}`;
}

/** Compact uninstall: success/failure only (schema-compatible). */
export interface HelmUninstallCompact {
  [key: string]: unknown;
  action: "uninstall";
  success: boolean;
  namespace?: string;
  status?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmUninstallMap(data: HelmUninstallResultInternal): HelmUninstallCompact {
  return {
    action: "uninstall",
    success: data.success,
    namespace: data.namespace,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmUninstallCompact(data: HelmUninstallCompact): string {
  if (!data.success) return `helm uninstall: failed`;
  return `helm uninstall: ${data.status ?? "uninstalled"}`;
}

// ── Helm rollback formatters ────────────────────────────────────────

/** Formats a helm rollback result into human-readable text. */
export function formatHelmRollback(data: HelmRollbackResultInternal): string {
  if (!data.success) {
    return `helm rollback ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const rev = data.revision ? ` to revision ${data.revision}` : "";
  return `helm rollback ${data.name}${rev}: ${data.status ?? "success"}`;
}

/** Compact rollback: success/failure only (schema-compatible). */
export interface HelmRollbackCompact {
  [key: string]: unknown;
  action: "rollback";
  success: boolean;
  namespace?: string;
  revision?: string;
  status?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmRollbackMap(data: HelmRollbackResultInternal): HelmRollbackCompact {
  return {
    action: "rollback",
    success: data.success,
    namespace: data.namespace,
    revision: data.revision,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmRollbackCompact(data: HelmRollbackCompact): string {
  if (!data.success) return `helm rollback: failed`;
  const rev = data.revision ? ` to revision ${data.revision}` : "";
  return `helm rollback${rev}: ${data.status ?? "success"}`;
}

// ── Helm history compact formatters ─────────────────────────────────

/** Compact history: schema-compatible summary, no revision details. */
export interface HelmHistoryCompact {
  [key: string]: unknown;
  action: "history";
  success: boolean;
  namespace?: string;
  exitCode?: number;
  error?: string;
}

export function compactHelmHistoryMap(data: HelmHistoryResultInternal): HelmHistoryCompact {
  return {
    action: "history",
    success: data.success,
    namespace: data.namespace,
    exitCode: data.exitCode,
    error: data.error,
  };
}

export function formatHelmHistoryCompact(data: HelmHistoryCompact): string {
  if (!data.success) return `helm history: failed`;
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  return `helm history${ns}: success`;
}

// ── Helm template compact formatters ────────────────────────────────

/** Compact template: manifest count only, no rendered content. */
export interface HelmTemplateCompact {
  [key: string]: unknown;
  action: "template";
  success: boolean;
  manifestCount: number;
}

export function compactHelmTemplateMap(data: HelmTemplateResult): HelmTemplateCompact {
  return {
    action: "template",
    success: data.success,
    manifestCount: data.manifestCount,
  };
}

export function formatHelmTemplateCompact(data: HelmTemplateCompact): string {
  if (!data.success) return "helm template: failed";
  return `helm template: ${data.manifestCount} manifest(s)`;
}

// ── Helm schema maps (strip Internal-only fields for structuredContent) ──

/** Strips Internal-only fields from helm list result for structuredContent. */
export function schemaHelmListMap(data: HelmListResultInternal): HelmListResult {
  return {
    action: data.action,
    success: data.success,
    releases: data.releases,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm status result for structuredContent. */
export function schemaHelmStatusMap(data: HelmStatusResultInternal): HelmStatusResult {
  return {
    action: data.action,
    success: data.success,
    revision: data.revision,
    status: data.status,
    description: data.description,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm install result for structuredContent. */
export function schemaHelmInstallMap(data: HelmInstallResultInternal): HelmInstallResult {
  return {
    action: data.action,
    success: data.success,
    namespace: data.namespace,
    revision: data.revision,
    status: data.status,
    chart: data.chart,
    appVersion: data.appVersion,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm upgrade result for structuredContent. */
export function schemaHelmUpgradeMap(data: HelmUpgradeResultInternal): HelmUpgradeResult {
  return {
    action: data.action,
    success: data.success,
    namespace: data.namespace,
    revision: data.revision,
    status: data.status,
    chart: data.chart,
    appVersion: data.appVersion,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm uninstall result for structuredContent. */
export function schemaHelmUninstallMap(data: HelmUninstallResultInternal): HelmUninstallResult {
  return {
    action: data.action,
    success: data.success,
    namespace: data.namespace,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm rollback result for structuredContent. */
export function schemaHelmRollbackMap(data: HelmRollbackResultInternal): HelmRollbackResult {
  return {
    action: data.action,
    success: data.success,
    namespace: data.namespace,
    revision: data.revision,
    status: data.status,
    exitCode: data.exitCode,
    error: data.error,
  };
}

/** Strips Internal-only fields from helm history result for structuredContent. */
export function schemaHelmHistoryMap(data: HelmHistoryResultInternal): HelmHistoryResult {
  return {
    action: data.action,
    success: data.success,
    namespace: data.namespace,
    revisions: data.revisions,
    exitCode: data.exitCode,
    error: data.error,
  };
}
