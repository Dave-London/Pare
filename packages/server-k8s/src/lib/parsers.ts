import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  K8sResource,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
  HelmRelease,
} from "../schemas/index.js";

/**
 * Parses `kubectl get -o json` output into a structured get result.
 */
export function parseGetOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  resource: string,
  namespace?: string,
): KubectlGetResult {
  if (exitCode !== 0) {
    return {
      action: "get",
      success: false,
      resource,
      namespace,
      items: [],
      total: 0,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  let items: K8sResource[] = [];
  try {
    const parsed = JSON.parse(stdout);
    if (parsed.kind === "List" && Array.isArray(parsed.items)) {
      items = parsed.items.map(extractResource);
    } else {
      // Single resource
      items = [extractResource(parsed)];
    }
  } catch {
    // If JSON parse fails, return raw output as error
    return {
      action: "get",
      success: false,
      resource,
      namespace,
      items: [],
      total: 0,
      exitCode,
      error: `Failed to parse kubectl JSON output: ${stdout.slice(0, 200)}`,
    };
  }

  return {
    action: "get",
    success: true,
    resource,
    namespace,
    items,
    total: items.length,
    exitCode,
  };
}

/**
 * Extracts a minimal K8sResource from a raw kubectl JSON object.
 * Only includes fields declared in K8sResourceSchema to avoid
 * "additional properties" validation errors from the MCP SDK.
 */
function extractResource(raw: Record<string, unknown>): K8sResource {
  const result: K8sResource = {};
  if (typeof raw.apiVersion === "string") result.apiVersion = raw.apiVersion;
  if (typeof raw.kind === "string") result.kind = raw.kind;
  if (raw.metadata && typeof raw.metadata === "object") {
    const m = raw.metadata as Record<string, unknown>;
    const metadata: NonNullable<K8sResource["metadata"]> = {};
    if (typeof m.name === "string") metadata.name = m.name;
    if (typeof m.namespace === "string") metadata.namespace = m.namespace;
    if (typeof m.creationTimestamp === "string") metadata.creationTimestamp = m.creationTimestamp;
    if (m.labels && typeof m.labels === "object") {
      metadata.labels = m.labels as Record<string, string>;
    }
    result.metadata = metadata;
  }
  if (raw.status && typeof raw.status === "object") {
    result.status = raw.status as Record<string, unknown>;
  }
  if (raw.spec && typeof raw.spec === "object") {
    result.spec = raw.spec as Record<string, unknown>;
  }
  return result;
}

/**
 * Parses `kubectl describe` output into a structured describe result.
 */
export function parseDescribeOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  resource: string,
  name: string,
  namespace?: string,
): KubectlDescribeResult {
  return {
    action: "describe",
    success: exitCode === 0,
    resource,
    name,
    namespace,
    output: stdout.trimEnd(),
    exitCode,
    error: exitCode !== 0 ? stderr.trim() || undefined : undefined,
  };
}

/**
 * Parses `kubectl logs` output into a structured logs result.
 */
export function parseLogsOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  pod: string,
  namespace?: string,
  container?: string,
): KubectlLogsResult {
  const logs = stdout.trimEnd();
  const lineCount = logs ? logs.split("\n").length : 0;

  return {
    action: "logs",
    success: exitCode === 0,
    pod,
    namespace,
    container,
    logs,
    lineCount,
    exitCode,
    error: exitCode !== 0 ? stderr.trim() || undefined : undefined,
  };
}

/**
 * Parses `kubectl apply` output into a structured apply result.
 */
export function parseApplyOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): KubectlApplyResult {
  return {
    action: "apply",
    success: exitCode === 0,
    output: (exitCode === 0 ? stdout : stderr).trimEnd(),
    exitCode,
    error: exitCode !== 0 ? stderr.trim() || undefined : undefined,
  };
}

// ── Helm parsers ────────────────────────────────────────────────────

/**
 * Parses `helm list -o json` output into a structured list result.
 */
export function parseHelmListOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  namespace?: string,
): HelmListResult {
  if (exitCode !== 0) {
    return {
      action: "list",
      success: false,
      namespace,
      releases: [],
      total: 0,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  let releases: HelmRelease[] = [];
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      releases = parsed.map((r: Record<string, unknown>) => ({
        name: String(r.name ?? ""),
        namespace: String(r.namespace ?? ""),
        revision: String(r.revision ?? ""),
        status: String(r.status ?? ""),
        chart: String(r.chart ?? ""),
        app_version: r.app_version != null ? String(r.app_version) : undefined,
      }));
    }
  } catch {
    return {
      action: "list",
      success: false,
      namespace,
      releases: [],
      total: 0,
      exitCode,
      error: `Failed to parse helm JSON output: ${stdout.slice(0, 200)}`,
    };
  }

  return {
    action: "list",
    success: true,
    namespace,
    releases,
    total: releases.length,
    exitCode,
  };
}

/**
 * Parses `helm status <release> -o json` output into a structured status result.
 */
export function parseHelmStatusOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  namespace?: string,
): HelmStatusResult {
  if (exitCode !== 0) {
    return {
      action: "status",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  try {
    const parsed = JSON.parse(stdout);
    const info = parsed.info as Record<string, unknown> | undefined;
    return {
      action: "status",
      success: true,
      name: String(parsed.name ?? release),
      namespace: String(parsed.namespace ?? namespace ?? ""),
      revision: parsed.version != null ? String(parsed.version) : undefined,
      status: info?.status != null ? String(info.status) : undefined,
      description: info?.description != null ? String(info.description) : undefined,
      notes: info?.notes != null ? String(info.notes).trimEnd() : undefined,
      exitCode,
    };
  } catch {
    return {
      action: "status",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: `Failed to parse helm JSON output: ${stdout.slice(0, 200)}`,
    };
  }
}

/**
 * Parses `helm install` output into a structured install result.
 */
export function parseHelmInstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  namespace?: string,
): HelmInstallResult {
  if (exitCode !== 0) {
    return {
      action: "install",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  try {
    const parsed = JSON.parse(stdout);
    const info = parsed.info as Record<string, unknown> | undefined;
    return {
      action: "install",
      success: true,
      name: String(parsed.name ?? release),
      namespace: String(parsed.namespace ?? namespace ?? ""),
      revision: parsed.version != null ? String(parsed.version) : undefined,
      status: info?.status != null ? String(info.status) : undefined,
      exitCode,
    };
  } catch {
    return {
      action: "install",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: `Failed to parse helm JSON output: ${stdout.slice(0, 200)}`,
    };
  }
}

/**
 * Parses `helm upgrade` output into a structured upgrade result.
 */
export function parseHelmUpgradeOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  namespace?: string,
): HelmUpgradeResult {
  if (exitCode !== 0) {
    return {
      action: "upgrade",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  try {
    const parsed = JSON.parse(stdout);
    const info = parsed.info as Record<string, unknown> | undefined;
    return {
      action: "upgrade",
      success: true,
      name: String(parsed.name ?? release),
      namespace: String(parsed.namespace ?? namespace ?? ""),
      revision: parsed.version != null ? String(parsed.version) : undefined,
      status: info?.status != null ? String(info.status) : undefined,
      exitCode,
    };
  } catch {
    return {
      action: "upgrade",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: `Failed to parse helm JSON output: ${stdout.slice(0, 200)}`,
    };
  }
}
