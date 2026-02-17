import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  KubectlResult,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
  HelmUninstallResult,
  HelmRollbackResult,
  HelmHistoryResult,
  HelmTemplateResult,
  HelmResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats a kubectl get result into human-readable text. */
export function formatGet(data: KubectlGetResult): string {
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
export function formatDescribe(data: KubectlDescribeResult): string {
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
export function formatLogs(data: KubectlLogsResult): string {
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
export function formatApply(data: KubectlApplyResult): string {
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

/** Dispatches formatting to the correct action formatter. */
export function formatResult(data: KubectlResult): string {
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

/** Compact get: summary without full resource details. */
export interface KubectlGetCompact {
  [key: string]: unknown;
  action: "get";
  success: boolean;
  resource: string;
  namespace?: string;
  total: number;
  names: string[];
}

export function compactGetMap(data: KubectlGetResult): KubectlGetCompact {
  return {
    action: "get",
    success: data.success,
    resource: data.resource,
    namespace: data.namespace,
    total: data.total,
    names: (data.items ?? []).map((i) => i.metadata?.name ?? "unknown"),
  };
}

export function formatGetCompact(data: KubectlGetCompact): string {
  if (!data.success) return `kubectl get ${data.resource}: failed`;
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  return `kubectl get ${data.resource}${ns}: ${data.total} item(s)`;
}

/** Compact describe: success/failure with conditions & events (no full output text). */
export interface KubectlDescribeCompact {
  [key: string]: unknown;
  action: "describe";
  success: boolean;
  resource: string;
  name: string;
  namespace?: string;
  labels?: KubectlDescribeResult["labels"];
  annotations?: KubectlDescribeResult["annotations"];
  resourceDetails?: KubectlDescribeResult["resourceDetails"];
  conditions?: KubectlDescribeResult["conditions"];
  events?: KubectlDescribeResult["events"];
}

export function compactDescribeMap(data: KubectlDescribeResult): KubectlDescribeCompact {
  return {
    action: "describe",
    success: data.success,
    resource: data.resource,
    name: data.name,
    namespace: data.namespace,
    labels: data.labels,
    annotations: data.annotations,
    resourceDetails: data.resourceDetails,
    conditions: data.conditions,
    events: data.events,
  };
}

export function formatDescribeCompact(data: KubectlDescribeCompact): string {
  if (!data.success) return `kubectl describe ${data.resource} ${data.name}: failed`;
  const parts = [`kubectl describe ${data.resource} ${data.name}: success`];
  if (data.conditions && data.conditions.length > 0)
    parts.push(`${data.conditions.length} condition(s)`);
  if (data.events && data.events.length > 0) parts.push(`${data.events.length} event(s)`);
  return parts.join(", ");
}

/** Compact logs: line count, no full log content. */
export interface KubectlLogsCompact {
  [key: string]: unknown;
  action: "logs";
  success: boolean;
  pod: string;
  namespace?: string;
  lineCount: number;
  truncated?: boolean;
  parsedEntries?: number;
}

export function compactLogsMap(data: KubectlLogsResult): KubectlLogsCompact {
  return {
    action: "logs",
    success: data.success,
    pod: data.pod,
    namespace: data.namespace,
    lineCount: data.lineCount,
    truncated: data.truncated,
    parsedEntries: data.logEntries?.length,
  };
}

export function formatLogsCompact(data: KubectlLogsCompact): string {
  if (!data.success) return `kubectl logs ${data.pod}: failed`;
  const truncated = data.truncated ? " [truncated]" : "";
  const parsed = data.parsedEntries !== undefined ? ` (${data.parsedEntries} parsed entries)` : "";
  return `kubectl logs ${data.pod}: ${data.lineCount} line(s)${truncated}${parsed}`;
}

/** Compact apply: success/failure status with resources (no raw output text). */
export interface KubectlApplyCompact {
  [key: string]: unknown;
  action: "apply";
  success: boolean;
  resources?: KubectlApplyResult["resources"];
  exitCode: number;
}

export function compactApplyMap(data: KubectlApplyResult): KubectlApplyCompact {
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

// ── Helm formatters ─────────────────────────────────────────────────

/** Formats a helm list result into human-readable text. */
export function formatHelmList(data: HelmListResult): string {
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
export function formatHelmStatus(data: HelmStatusResult): string {
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
export function formatHelmInstall(data: HelmInstallResult): string {
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
export function formatHelmUpgrade(data: HelmUpgradeResult): string {
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
export function formatHelmHistory(data: HelmHistoryResult): string {
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

/** Dispatches formatting to the correct helm action formatter. */
export function formatHelmResult(data: HelmResult): string {
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

/** Compact list: release names only. */
export interface HelmListCompact {
  [key: string]: unknown;
  action: "list";
  success: boolean;
  namespace?: string;
  total: number;
  names: string[];
}

export function compactHelmListMap(data: HelmListResult): HelmListCompact {
  return {
    action: "list",
    success: data.success,
    namespace: data.namespace,
    total: data.total,
    names: (data.releases ?? []).map((r) => r.name),
  };
}

export function formatHelmListCompact(data: HelmListCompact): string {
  if (!data.success) return "helm list: failed";
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  return `helm list${ns}: ${data.total} release(s)`;
}

/** Compact status: key fields only, no notes. */
export interface HelmStatusCompact {
  [key: string]: unknown;
  action: "status";
  success: boolean;
  name: string;
  namespace?: string;
  status?: string;
  revision?: string;
}

export function compactHelmStatusMap(data: HelmStatusResult): HelmStatusCompact {
  return {
    action: "status",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    status: data.status,
    revision: data.revision,
  };
}

export function formatHelmStatusCompact(data: HelmStatusCompact): string {
  if (!data.success) return `helm status ${data.name}: failed`;
  return `helm status ${data.name}: ${data.status ?? "unknown"}`;
}

/** Compact install: success/failure only. */
export interface HelmInstallCompact {
  [key: string]: unknown;
  action: "install";
  success: boolean;
  name: string;
  namespace?: string;
  status?: string;
}

export function compactHelmInstallMap(data: HelmInstallResult): HelmInstallCompact {
  return {
    action: "install",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    status: data.status,
  };
}

export function formatHelmInstallCompact(data: HelmInstallCompact): string {
  if (!data.success) return `helm install ${data.name}: failed`;
  return `helm install ${data.name}: ${data.status ?? "success"}`;
}

/** Compact upgrade: success/failure only. */
export interface HelmUpgradeCompact {
  [key: string]: unknown;
  action: "upgrade";
  success: boolean;
  name: string;
  namespace?: string;
  status?: string;
}

export function compactHelmUpgradeMap(data: HelmUpgradeResult): HelmUpgradeCompact {
  return {
    action: "upgrade",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    status: data.status,
  };
}

export function formatHelmUpgradeCompact(data: HelmUpgradeCompact): string {
  if (!data.success) return `helm upgrade ${data.name}: failed`;
  return `helm upgrade ${data.name}: ${data.status ?? "success"}`;
}

// ── Helm uninstall formatters ───────────────────────────────────────

/** Formats a helm uninstall result into human-readable text. */
export function formatHelmUninstall(data: HelmUninstallResult): string {
  if (!data.success) {
    return `helm uninstall ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  return `helm uninstall ${data.name}: ${data.status ?? "uninstalled"}`;
}

/** Compact uninstall: success/failure only. */
export interface HelmUninstallCompact {
  [key: string]: unknown;
  action: "uninstall";
  success: boolean;
  name: string;
  namespace?: string;
  status?: string;
}

export function compactHelmUninstallMap(data: HelmUninstallResult): HelmUninstallCompact {
  return {
    action: "uninstall",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    status: data.status,
  };
}

export function formatHelmUninstallCompact(data: HelmUninstallCompact): string {
  if (!data.success) return `helm uninstall ${data.name}: failed`;
  return `helm uninstall ${data.name}: ${data.status ?? "uninstalled"}`;
}

// ── Helm rollback formatters ────────────────────────────────────────

/** Formats a helm rollback result into human-readable text. */
export function formatHelmRollback(data: HelmRollbackResult): string {
  if (!data.success) {
    return `helm rollback ${data.name}: failed${data.exitCode !== undefined ? ` (exit ${data.exitCode})` : ""}${data.error ? `\n${data.error}` : ""}`;
  }
  const rev = data.revision ? ` to revision ${data.revision}` : "";
  return `helm rollback ${data.name}${rev}: ${data.status ?? "success"}`;
}

/** Compact rollback: success/failure only. */
export interface HelmRollbackCompact {
  [key: string]: unknown;
  action: "rollback";
  success: boolean;
  name: string;
  namespace?: string;
  revision?: string;
  status?: string;
}

export function compactHelmRollbackMap(data: HelmRollbackResult): HelmRollbackCompact {
  return {
    action: "rollback",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    revision: data.revision,
    status: data.status,
  };
}

export function formatHelmRollbackCompact(data: HelmRollbackCompact): string {
  if (!data.success) return `helm rollback ${data.name}: failed`;
  const rev = data.revision ? ` to revision ${data.revision}` : "";
  return `helm rollback ${data.name}${rev}: ${data.status ?? "success"}`;
}

// ── Helm history compact formatters ─────────────────────────────────

/** Compact history: name and total only, no revision details. */
export interface HelmHistoryCompact {
  [key: string]: unknown;
  action: "history";
  success: boolean;
  name: string;
  namespace?: string;
  total: number;
}

export function compactHelmHistoryMap(data: HelmHistoryResult): HelmHistoryCompact {
  return {
    action: "history",
    success: data.success,
    name: data.name,
    namespace: data.namespace,
    total: data.total,
  };
}

export function formatHelmHistoryCompact(data: HelmHistoryCompact): string {
  if (!data.success) return `helm history ${data.name}: failed`;
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  return `helm history ${data.name}${ns}: ${data.total} revision(s)`;
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
