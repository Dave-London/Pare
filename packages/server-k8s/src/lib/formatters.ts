import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  KubectlResult,
} from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats a kubectl get result into human-readable text. */
export function formatGet(data: KubectlGetResult): string {
  if (!data.success) {
    return `kubectl get ${data.resource}: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  const lines = [`kubectl get ${data.resource}${ns}: ${data.total} item(s)`];
  for (const item of data.items) {
    const name = item.metadata?.name ?? "unknown";
    const kind = item.kind ?? "";
    lines.push(`  ${kind} ${name}`);
  }
  return lines.join("\n");
}

/** Formats a kubectl describe result into human-readable text. */
export function formatDescribe(data: KubectlDescribeResult): string {
  if (!data.success) {
    return `kubectl describe ${data.resource} ${data.name}: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  return data.output;
}

/** Formats a kubectl logs result into human-readable text. */
export function formatLogs(data: KubectlLogsResult): string {
  if (!data.success) {
    return `kubectl logs ${data.pod}: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  const header = `kubectl logs ${data.pod}: ${data.lineCount} line(s)`;
  if (!data.logs) return header;
  return `${header}\n${data.logs}`;
}

/** Formats a kubectl apply result into human-readable text. */
export function formatApply(data: KubectlApplyResult): string {
  if (!data.success) {
    return `kubectl apply: failed (exit ${data.exitCode})${data.error ? `\n${data.error}` : ""}`;
  }
  return `kubectl apply: success\n${data.output}`;
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
    names: data.items.map((i) => i.metadata?.name ?? "unknown"),
  };
}

export function formatGetCompact(data: KubectlGetCompact): string {
  if (!data.success) return `kubectl get ${data.resource}: failed`;
  const ns = data.namespace ? ` -n ${data.namespace}` : "";
  return `kubectl get ${data.resource}${ns}: ${data.total} item(s)`;
}

/** Compact describe: just success/failure, no full output. */
export interface KubectlDescribeCompact {
  [key: string]: unknown;
  action: "describe";
  success: boolean;
  resource: string;
  name: string;
  namespace?: string;
}

export function compactDescribeMap(data: KubectlDescribeResult): KubectlDescribeCompact {
  return {
    action: "describe",
    success: data.success,
    resource: data.resource,
    name: data.name,
    namespace: data.namespace,
  };
}

export function formatDescribeCompact(data: KubectlDescribeCompact): string {
  if (!data.success) return `kubectl describe ${data.resource} ${data.name}: failed`;
  return `kubectl describe ${data.resource} ${data.name}: success`;
}

/** Compact logs: line count, no full log content. */
export interface KubectlLogsCompact {
  [key: string]: unknown;
  action: "logs";
  success: boolean;
  pod: string;
  namespace?: string;
  lineCount: number;
}

export function compactLogsMap(data: KubectlLogsResult): KubectlLogsCompact {
  return {
    action: "logs",
    success: data.success,
    pod: data.pod,
    namespace: data.namespace,
    lineCount: data.lineCount,
  };
}

export function formatLogsCompact(data: KubectlLogsCompact): string {
  if (!data.success) return `kubectl logs ${data.pod}: failed`;
  return `kubectl logs ${data.pod}: ${data.lineCount} line(s)`;
}

/** Compact apply: just success/failure status. */
export interface KubectlApplyCompact {
  [key: string]: unknown;
  action: "apply";
  success: boolean;
  exitCode: number;
}

export function compactApplyMap(data: KubectlApplyResult): KubectlApplyCompact {
  return {
    action: "apply",
    success: data.success,
    exitCode: data.exitCode,
  };
}

export function formatApplyCompact(data: KubectlApplyCompact): string {
  if (!data.success) return `kubectl apply: failed (exit ${data.exitCode})`;
  return "kubectl apply: success";
}
