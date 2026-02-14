import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  K8sResource,
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
 */
function extractResource(raw: Record<string, unknown>): K8sResource {
  const result: K8sResource = {};
  if (typeof raw.apiVersion === "string") result.apiVersion = raw.apiVersion;
  if (typeof raw.kind === "string") result.kind = raw.kind;
  if (raw.metadata && typeof raw.metadata === "object") {
    result.metadata = raw.metadata as K8sResource["metadata"];
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
