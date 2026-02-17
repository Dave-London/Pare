import type {
  KubectlGetResult,
  KubectlDescribeResult,
  KubectlLogsResult,
  KubectlApplyResult,
  K8sResource,
  K8sAppliedResource,
  K8sCondition,
  K8sEvent,
  K8sOwnerReference,
  HelmListResult,
  HelmStatusResult,
  HelmInstallResult,
  HelmUpgradeResult,
  HelmUninstallResult,
  HelmRollbackResult,
  HelmRelease,
  HelmHistoryResult,
  HelmRevision,
  HelmTemplateResult,
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
    if (m.annotations && typeof m.annotations === "object") {
      metadata.annotations = m.annotations as Record<string, string>;
    }
    if (Array.isArray(m.ownerReferences) && m.ownerReferences.length > 0) {
      metadata.ownerReferences = m.ownerReferences
        .filter(
          (ref: unknown) =>
            ref &&
            typeof ref === "object" &&
            typeof (ref as Record<string, unknown>).apiVersion === "string" &&
            typeof (ref as Record<string, unknown>).kind === "string" &&
            typeof (ref as Record<string, unknown>).name === "string" &&
            typeof (ref as Record<string, unknown>).uid === "string",
        )
        .map((ref: unknown) => {
          const r = ref as Record<string, string>;
          return {
            apiVersion: r.apiVersion,
            kind: r.kind,
            name: r.name,
            uid: r.uid,
          } satisfies K8sOwnerReference;
        });
      if (metadata.ownerReferences.length === 0) {
        delete metadata.ownerReferences;
      }
    }
    if (Array.isArray(m.finalizers) && m.finalizers.length > 0) {
      metadata.finalizers = m.finalizers.filter((f: unknown): f is string => typeof f === "string");
      if (metadata.finalizers.length === 0) {
        delete metadata.finalizers;
      }
    }
    if (typeof m.resourceVersion === "string") metadata.resourceVersion = m.resourceVersion;
    if (typeof m.uid === "string") metadata.uid = m.uid;
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

function parseDescribeMetadataMap(
  output: string,
  sectionName: "Labels" | "Annotations",
): Record<string, string> | undefined {
  const lines = output.split("\n");
  const map: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(new RegExp(`^${sectionName}:\\s*(.*)$`));
    if (!headerMatch) continue;

    const entries: string[] = [];
    const first = headerMatch[1].trim();
    if (first && first !== "<none>") entries.push(first);

    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (!line.startsWith(" ") && !line.startsWith("\t")) break;
      const trimmed = line.trim();
      if (!trimmed || trimmed === "<none>") continue;
      entries.push(trimmed);
    }

    for (const entry of entries) {
      // Handle comma-separated labels on one line.
      const parts = entry.includes(",") ? entry.split(",") : [entry];
      for (const part of parts) {
        const kv = part.trim();
        if (!kv) continue;
        const eqIdx = kv.indexOf("=");
        const colonIdx = kv.indexOf(":");
        const sepIdx = eqIdx >= 0 ? eqIdx : colonIdx >= 0 ? colonIdx : -1;
        if (sepIdx < 0) continue;

        const key = kv.slice(0, sepIdx).trim();
        const value = kv.slice(sepIdx + 1).trim();
        if (key) map[key] = value;
      }
    }

    break;
  }

  return Object.keys(map).length > 0 ? map : undefined;
}

function parseDescribeField(output: string, label: string): string | undefined {
  const match = output.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  if (!match) return undefined;
  const value = match[1].trim();
  return value && value !== "<none>" ? value : undefined;
}

function parsePodDescribeDetails(output: string) {
  const containersSection = extractSection(output, "Containers");
  const containers: string[] = [];
  if (containersSection) {
    for (const line of containersSection.split("\n")) {
      const match = line.match(/^\s{2,}([^\s:]+):\s*$/);
      if (match) containers.push(match[1]);
    }
  }

  const details = {
    node: parseDescribeField(output, "Node"),
    ip: parseDescribeField(output, "IP"),
    qosClass: parseDescribeField(output, "QoS Class"),
    serviceAccount: parseDescribeField(output, "Service Account"),
    containers: containers.length > 0 ? containers : undefined,
  };

  return Object.values(details).some((v) => v !== undefined) ? details : undefined;
}

function parseServiceDescribeDetails(output: string) {
  const lines = output.split("\n");
  const ports: Array<{
    name?: string;
    port: string;
    targetPort?: string;
    protocol?: string;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const portMatch = lines[i].match(/^\s*Port:\s*(.+)$/);
    if (!portMatch) continue;

    const rawPort = portMatch[1].trim();
    const parsed = rawPort.match(/^(?:(\S+)\s+)?(\S+)\/(\S+)$/);
    const current: {
      name?: string;
      port: string;
      targetPort?: string;
      protocol?: string;
    } = {
      port: parsed ? parsed[2] : rawPort,
      protocol: parsed ? parsed[3] : undefined,
      name: parsed?.[1],
    };

    const targetMatch = lines[i + 1]?.match(/^\s*TargetPort:\s*(.+)$/);
    if (targetMatch) {
      current.targetPort = targetMatch[1].trim();
      i += 1;
    }

    ports.push(current);
  }

  const details = {
    type: parseDescribeField(output, "Type"),
    clusterIP: parseDescribeField(output, "IP") ?? parseDescribeField(output, "IPs"),
    ports: ports.length > 0 ? ports : undefined,
  };

  return Object.values(details).some((v) => v !== undefined) ? details : undefined;
}

function parseDeploymentDescribeDetails(output: string) {
  const replicasRaw = parseDescribeField(output, "Replicas");
  const replicas = replicasRaw
    ? {
        desired: extractReplicasCount(replicasRaw, "desired"),
        updated: extractReplicasCount(replicasRaw, "updated"),
        total: extractReplicasCount(replicasRaw, "total"),
        available: extractReplicasCount(replicasRaw, "available"),
        unavailable: extractReplicasCount(replicasRaw, "unavailable"),
      }
    : undefined;

  const details = {
    strategy: parseDescribeField(output, "StrategyType"),
    replicas,
  };

  return Object.values(details).some((v) => v !== undefined) ? details : undefined;
}

function extractReplicasCount(line: string, key: string): number | undefined {
  const match = line.match(new RegExp(`(\\d+)\\s+${key}`));
  return match ? Number.parseInt(match[1], 10) : undefined;
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
  const labels = exitCode === 0 ? parseDescribeMetadataMap(output, "Labels") : undefined;
  const annotations = exitCode === 0 ? parseDescribeMetadataMap(output, "Annotations") : undefined;

  const resourceLower = resource.toLowerCase();
  const resourceDetails =
    exitCode !== 0
      ? undefined
      : {
          pod:
            resourceLower.includes("pod") || resourceLower === "po"
              ? parsePodDescribeDetails(output)
              : undefined,
          service:
            resourceLower.includes("service") || resourceLower === "svc"
              ? parseServiceDescribeDetails(output)
              : undefined,
          deployment:
            resourceLower.includes("deployment") || resourceLower === "deploy"
              ? parseDeploymentDescribeDetails(output)
              : undefined,
        };

  return {
    action: "describe",
    success: exitCode === 0,
    resource,
    name,
    namespace,
    output,
    labels,
    annotations,
    resourceDetails:
      resourceDetails && Object.values(resourceDetails).some((value) => value !== undefined)
        ? resourceDetails
        : undefined,
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
  tail?: number,
  limitBytes?: number,
  parseJsonLogs?: boolean,
): KubectlLogsResult {
  const logs = stdout.trimEnd();
  const lineCount = logs ? logs.split("\n").length : 0;
  const byteLength = logs ? Buffer.byteLength(logs, "utf8") : 0;
  const truncatedByTail = tail !== undefined && tail > 0 && lineCount >= tail;
  const truncatedByBytes = limitBytes !== undefined && limitBytes > 0 && byteLength >= limitBytes;
  const truncated =
    tail !== undefined || limitBytes !== undefined
      ? truncatedByTail || truncatedByBytes
      : undefined;

  const logEntries =
    parseJsonLogs && logs
      ? logs
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const entry: { raw: string; json?: unknown } = { raw: line };
            try {
              entry.json = JSON.parse(line);
            } catch {
              // Leave json undefined when line is not JSON.
            }
            return entry;
          })
      : undefined;

  return {
    action: "logs",
    success: exitCode === 0,
    pod,
    namespace,
    container,
    logs,
    lineCount,
    truncated,
    logEntries,
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
    const metadata = (parsed.chart as { metadata?: Record<string, unknown> } | undefined)?.metadata;
    const chartName = metadata?.name != null ? String(metadata.name) : undefined;
    const chartVersion = metadata?.version != null ? String(metadata.version) : undefined;
    const chart = chartName && chartVersion ? `${chartName}-${chartVersion}` : chartName;
    const appVersion = metadata?.appVersion != null ? String(metadata.appVersion) : undefined;
    return {
      action: "install",
      success: true,
      name: String(parsed.name ?? release),
      namespace: String(parsed.namespace ?? namespace ?? ""),
      revision: parsed.version != null ? String(parsed.version) : undefined,
      status: info?.status != null ? String(info.status) : undefined,
      chart,
      appVersion,
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
    const metadata = (parsed.chart as { metadata?: Record<string, unknown> } | undefined)?.metadata;
    const chartName = metadata?.name != null ? String(metadata.name) : undefined;
    const chartVersion = metadata?.version != null ? String(metadata.version) : undefined;
    const chart = chartName && chartVersion ? `${chartName}-${chartVersion}` : chartName;
    const appVersion = metadata?.appVersion != null ? String(metadata.appVersion) : undefined;
    return {
      action: "upgrade",
      success: true,
      name: String(parsed.name ?? release),
      namespace: String(parsed.namespace ?? namespace ?? ""),
      revision: parsed.version != null ? String(parsed.version) : undefined,
      status: info?.status != null ? String(info.status) : undefined,
      chart,
      appVersion,
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

// ── Helm history parser ─────────────────────────────────────────────

/**
 * Parses `helm history <release> -o json` output into a structured history result.
 */
export function parseHelmHistoryOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  release: string,
  namespace?: string,
): HelmHistoryResult {
  if (exitCode !== 0) {
    return {
      action: "history",
      success: false,
      name: release,
      namespace,
      revisions: [],
      total: 0,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  let revisions: HelmRevision[] = [];
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      revisions = parsed.map((r: Record<string, unknown>) => {
        const rev: HelmRevision = {
          revision: Number(r.revision ?? 0),
          updated: String(r.updated ?? ""),
          status: String(r.status ?? ""),
          chart: String(r.chart ?? ""),
        };
        if (r.app_version != null && String(r.app_version) !== "") {
          rev.appVersion = String(r.app_version);
        }
        if (r.description != null && String(r.description) !== "") {
          rev.description = String(r.description);
        }
        return rev;
      });
    }
  } catch {
    return {
      action: "history",
      success: false,
      name: release,
      namespace,
      revisions: [],
      total: 0,
      exitCode,
      error: `Failed to parse helm JSON output: ${stdout.slice(0, 200)}`,
    };
  }

  return {
    action: "history",
    success: true,
    name: release,
    namespace,
    revisions,
    total: revisions.length,
    exitCode,
  };
}

// ── Helm template parser ────────────────────────────────────────────

/**
 * Parses `helm template` output into a structured template result.
 * Counts YAML document separators (`---`) to determine manifest count.
 */
export function parseHelmTemplateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): HelmTemplateResult {
  if (exitCode !== 0) {
    return {
      action: "template",
      success: false,
      manifestCount: 0,
      exitCode,
      error: stderr.trim() || undefined,
    };
  }

  const manifests = stdout.trimEnd();

  // Count the number of YAML document separators.
  // Each `---` at the start of a line indicates a new manifest.
  let manifestCount = 0;
  if (manifests) {
    const lines = manifests.split("\n");
    for (const line of lines) {
      if (line.trim() === "---") {
        manifestCount++;
      }
    }
    // If there are manifests but no separators, count as 1
    if (manifestCount === 0 && manifests.trim().length > 0) {
      manifestCount = 1;
    }
  }

  return {
    action: "template",
    success: true,
    manifests,
    manifestCount,
    exitCode,
  };
}
