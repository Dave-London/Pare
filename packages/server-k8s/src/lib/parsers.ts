import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  K8sResource,
  K8sAppliedResource,
  K8sCondition,
  K8sEvent,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
  HelmUninstallResult,
  HelmRollbackResult,
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
 * Extracts an indented section from kubectl describe output.
 * Sections start with a non-indented label (e.g., "Conditions:") and contain
 * subsequent indented lines until the next non-indented line or end of string.
 */
function extractSection(output: string, sectionName: string): string | null {
  const lines = output.split("\n");
  let capturing = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (!capturing) {
      // Look for section header at start of line (no leading whitespace)
      if (line.match(new RegExp(`^${sectionName}:\\s*$`))) {
        capturing = true;
      }
    } else {
      // Stop capturing when we hit a non-indented, non-empty line (new section)
      if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
        break;
      }
      sectionLines.push(line);
    }
  }

  return sectionLines.length > 0 ? sectionLines.join("\n") : null;
}

/**
 * Parses the Conditions section from `kubectl describe` output.
 *
 * Handles tabular format (with or without Reason/Message columns):
 *   Type              Status
 *   Initialized       True
 */
export function parseDescribeConditions(output: string): K8sCondition[] {
  const conditions: K8sCondition[] = [];

  const section = extractSection(output, "Conditions");
  if (!section) return conditions;

  const lines = section.split("\n");

  // Find the header line (contains "Type" and "Status")
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Type") && lines[i].includes("Status")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return conditions;

  const headerLine = lines[headerIdx];

  // Tabular format — parse column positions from the header
  const typeIdx = headerLine.indexOf("Type");
  const statusIdx = headerLine.indexOf("Status");

  // Look for optional Reason and Message columns
  const reasonIdx = headerLine.indexOf("Reason");
  const messageIdx = headerLine.indexOf("Message");
  // Also check for "LastTransitionTime" or similar columns between Status and Reason
  const lastTransIdx = headerLine.indexOf("LastTransitionTime");

  // Skip the separator line (----) if present
  let dataStart = headerIdx + 1;
  if (lines[dataStart] && lines[dataStart].trim().startsWith("----")) {
    dataStart++;
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Extract fields based on column positions
    const type = line.substring(typeIdx, statusIdx).trim();
    if (!type) continue;

    let status: string;
    if (lastTransIdx >= 0) {
      status = line.substring(statusIdx, lastTransIdx).trim();
    } else if (reasonIdx >= 0) {
      status = line.substring(statusIdx, reasonIdx).trim();
    } else if (messageIdx >= 0) {
      status = line.substring(statusIdx, messageIdx).trim();
    } else {
      status = line.substring(statusIdx).trim();
    }

    const condition: K8sCondition = { type, status };

    if (reasonIdx >= 0) {
      const endOfReason = messageIdx >= 0 ? messageIdx : line.length;
      const reason = line.substring(reasonIdx, endOfReason).trim();
      if (reason) condition.reason = reason;
    }

    if (messageIdx >= 0) {
      const message = line.substring(messageIdx).trim();
      if (message) condition.message = message;
    }

    conditions.push(condition);
  }

  return conditions;
}

/**
 * Parses the Events section from `kubectl describe` output.
 *
 * Expects tabular format:
 *   Type     Reason     Age   From               Message
 *   ----     ------     ---   ----               -------
 *   Normal   Scheduled  10m   default-scheduler  Successfully assigned...
 */
export function parseDescribeEvents(output: string): K8sEvent[] {
  const events: K8sEvent[] = [];

  const section = extractSection(output, "Events");
  if (!section) return events;

  // Check for "<none>" events
  if (section.trim() === "<none>") return events;

  const lines = section.split("\n");

  // Find the header line (contains "Type", "Reason", etc.)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Type") && lines[i].includes("Reason") && lines[i].includes("Message")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return events;

  const headerLine = lines[headerIdx];

  // Parse column positions from header
  const typeIdx = headerLine.indexOf("Type");
  const reasonIdx = headerLine.indexOf("Reason");
  const ageIdx = headerLine.indexOf("Age");
  const fromIdx = headerLine.indexOf("From");
  const messageIdx = headerLine.indexOf("Message");

  if (typeIdx < 0 || reasonIdx < 0 || ageIdx < 0 || fromIdx < 0 || messageIdx < 0) {
    return events;
  }

  // Skip the separator line (----) if present
  let dataStart = headerIdx + 1;
  if (lines[dataStart] && lines[dataStart].trim().startsWith("----")) {
    dataStart++;
  }

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const type = line.substring(typeIdx, reasonIdx).trim();
    const reason = line.substring(reasonIdx, ageIdx).trim();
    const age = line.substring(ageIdx, fromIdx).trim();
    const from = line.substring(fromIdx, messageIdx).trim();
    const message = line.substring(messageIdx).trim();

    if (!type || !reason) continue;

    events.push({ type, reason, age, from, message });
  }

  return events;
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
  const output = stdout.trimEnd();
  const conditions = exitCode === 0 ? parseDescribeConditions(output) : [];
  const events = exitCode === 0 ? parseDescribeEvents(output) : [];

  return {
    action: "describe",
    success: exitCode === 0,
    resource,
    name,
    namespace,
    output,
    conditions: conditions.length > 0 ? conditions : undefined,
    events: events.length > 0 ? events : undefined,
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
 * Parses a single line of `kubectl apply` text output into a resource.
 *
 * Lines look like:
 *   deployment.apps/my-app configured
 *   service/my-service unchanged
 *   configmap/my-config created
 *   namespace/my-ns created (server-side dry run)
 */
export function parseApplyLine(line: string): K8sAppliedResource | null {
  // Match: <kind>/<name> <operation> (optionally followed by dry-run annotation)
  // Also handle namespaced resources: <kind>/<name> <operation>
  // kubectl may also print warnings or other lines; skip those
  const match = line.match(
    /^(\S+?)\/(\S+)\s+(created|configured|unchanged|deleted|pruned)(?:\s|$)/,
  );
  if (!match) return null;

  const kindRaw = match[1]; // e.g., "deployment.apps" or "service"
  const name = match[2];
  const operation = match[3] as K8sAppliedResource["operation"];

  return { kind: kindRaw, name, operation };
}

/**
 * Parses `kubectl apply` output into a structured apply result.
 */
export function parseApplyOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): KubectlApplyResult {
  const rawOutput = (exitCode === 0 ? stdout : stderr).trimEnd();

  // Parse resource lines from stdout (text mode output)
  const resources: K8sAppliedResource[] = [];
  if (exitCode === 0 && stdout.trim()) {
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const resource = parseApplyLine(trimmed);
      if (resource) {
        resources.push(resource);
      }
    }
  }

  return {
    action: "apply",
    success: exitCode === 0,
    resources: resources.length > 0 ? resources : undefined,
    output: rawOutput,
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

// ── Helm uninstall/rollback parsers ─────────────────────────────────

/**
 * Parses `helm uninstall` output into a structured uninstall result.
 * Output is plain text like: 'release "my-release" uninstalled'
 */
export function parseHelmUninstallOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  namespace?: string,
): HelmUninstallResult {
  if (exitCode !== 0) {
    return {
      action: "uninstall",
      success: false,
      name: release,
      namespace,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  const output = (stdout + "\n" + stderr).trim();
  let status = "uninstalled";
  if (output.includes("uninstalled")) {
    status = "uninstalled";
  }

  return {
    action: "uninstall",
    success: true,
    name: release,
    namespace,
    status,
    exitCode,
  };
}

/**
 * Parses `helm rollback` output into a structured rollback result.
 * Output is plain text like: 'Rollback was a success! Happy Helming!'
 */
export function parseHelmRollbackOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  revision?: number,
  namespace?: string,
): HelmRollbackResult {
  if (exitCode !== 0) {
    return {
      action: "rollback",
      success: false,
      name: release,
      namespace,
      revision: revision !== undefined ? String(revision) : undefined,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  const output = (stdout + "\n" + stderr).trim();
  let status = "rolled back";
  if (output.toLowerCase().includes("success")) {
    status = "success";
  }

  return {
    action: "rollback",
    success: true,
    name: release,
    namespace,
    revision: revision !== undefined ? String(revision) : undefined,
    status,
    exitCode,
  };
}
