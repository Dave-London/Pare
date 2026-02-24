import type {
  DockerPs,
  DockerBuild,
  DockerLogs,
  DockerImages,
  DockerRun,
  DockerExec,
  DockerComposeUp,
  DockerComposeDown,
  DockerPull,
  DockerInspect,
  DockerNetworkLs,
  DockerVolumeLs,
  DockerComposePs,
  DockerComposeLogs,
  DockerComposeBuild,
  DockerStats,
} from "../schemas/index.js";

/** Formats structured Docker container data into a human-readable listing with state and ports. */
export function formatPs(data: DockerPs): string {
  const total = data.containers.length;
  const running = data.containers.filter((c) => c.state === "running").length;
  const stopped = total - running;
  const lines = [`${total} containers (${running} running, ${stopped} stopped)`];
  for (const c of data.containers) {
    const portsArr = c.ports ?? [];
    const ports = portsArr.length
      ? ` [${portsArr.map((p) => (p.host ? `${p.host}->${p.container}/${p.protocol}` : `${p.container}/${p.protocol}`)).join(", ")}]`
      : "";
    // #117/#118: Show labels count and networks
    const labelsInfo =
      c.labels && Object.keys(c.labels).length > 0 ? ` labels=${Object.keys(c.labels).length}` : "";
    const networksInfo = c.networks && c.networks.length > 0 ? ` nets=${c.networks.join(",")}` : "";
    lines.push(
      `  ${(c.state ?? "unknown").padEnd(10)} ${c.name} (${c.image})${ports}${labelsInfo}${networksInfo}`,
    );
  }
  return lines.join("\n");
}

/** Formats structured Docker build results into a human-readable success/failure summary.
 *  #97: Includes structured error details with line numbers. */
export function formatBuild(data: DockerBuild): string {
  const cacheByStep = data.cacheByStep ?? [];
  const cacheHits = cacheByStep.filter((s) => s.cached).length;
  const cacheMisses = cacheByStep.filter((s) => !s.cached).length;
  const steps = cacheByStep.length;

  if (data.success) {
    const parts = ["Build succeeded"];
    if (data.imageId) parts[0] += ` → ${data.imageId}`;
    if (steps > 0) parts.push(`${steps} steps`);
    if (cacheByStep.length > 0) {
      parts.push(`cache hits=${cacheHits}, misses=${cacheMisses}`);
    }
    return parts.join(", ");
  }

  const lines = ["Build failed"];
  if (cacheByStep.length > 0) {
    lines.push(`  cache hits=${cacheHits}, misses=${cacheMisses}`);
  }
  for (const err of data.errors ?? []) {
    if (typeof err === "string") {
      lines.push(`  ${err}`);
    } else {
      const lineInfo = err.line != null ? `:${err.line}` : "";
      const fileInfo = err.dockerfile
        ? `${err.dockerfile}${lineInfo}`
        : lineInfo
          ? `line${lineInfo}`
          : "";
      const prefix = fileInfo ? `${fileInfo}: ` : "";
      lines.push(`  ${prefix}${err.message}`);
    }
  }
  return lines.join("\n");
}

/** Formats structured Docker logs data into a human-readable output with line count.
 *  #113: Notes when separate stdout/stderr streams are available. */
export function formatLogs(data: DockerLogs): string {
  const total = (data.lines ?? []).length;
  const header = data.isTruncated
    ? `${total} lines (truncated)`
    : `${total} lines`;
  const streamInfo =
    data.stdoutLines || data.stderrLines
      ? ` [stdout=${(data.stdoutLines ?? []).length}, stderr=${(data.stderrLines ?? []).length}]`
      : "";
  const body = data.entries
    ? data.entries.map((e) => `${e.timestamp ? `${e.timestamp} ` : ""}${e.message}`).join("\n")
    : (data.lines ?? []).join("\n");
  return `${header}${streamInfo}\n${body}`;
}

/** Formats structured Docker image data into a human-readable listing with repository, tag, and size.
 *  #110: Shows ISO creation timestamp when available. */
export function formatImages(data: DockerImages): string {
  const total = data.images.length;
  if (total === 0) return "No images found.";

  const lines = [`${total} images:`];
  for (const img of data.images) {
    const tag = img.tag && img.tag !== "<none>" ? `:${img.tag}` : "";
    const digest = img.digest ? ` [${img.digest.slice(0, 19)}...]` : "";
    const createdAt = img.createdAt ? ` (${img.createdAt})` : ` (${img.created})`;
    const bytes = img.sizeBytes != null ? ` ~${img.sizeBytes}B` : "";
    const labelCount =
      img.labels && Object.keys(img.labels).length > 0
        ? ` labels=${Object.keys(img.labels).length}`
        : "";
    lines.push(`  ${img.repository}${tag} (${img.size}${bytes})${createdAt}${digest}${labelCount}`);
  }
  return lines.join("\n");
}

/** Formats structured Docker run output into a human-readable summary.
 *  #121/#122: Shows exitCode, errorCategory, and stdout/stderr for non-detached runs. */
export function formatRun(data: DockerRun): string {
  const name = data.name ? ` (${data.name})` : "";
  const mode = data.detached ? "detached" : "attached";
  const lines = [`Container ${data.containerId}${name} started [${mode}]`];

  if (data.exitCode != null && data.exitCode !== 0) {
    lines.push(`  Exit code: ${data.exitCode}`);
    if (data.errorCategory) lines.push(`  Error: ${data.errorCategory}`);
    if (data.stderr) lines.push(`  stderr: ${data.stderr.slice(0, 200)}`);
  } else if (!data.detached) {
    if (data.stdout) lines.push(data.stdout);
    if (data.stderr) lines.push(`stderr: ${data.stderr}`);
  }

  return lines.join("\n");
}

/** Formats structured Docker exec output into a human-readable summary.
 *  #108: Shows truncation indicator. */
export function formatExec(data: DockerExec): string {
  const success = data.exitCode === 0;
  const status = data.timedOut
    ? "timed out"
    : success
      ? "succeeded"
      : `failed (exit code ${data.exitCode})`;
  const trunc = data.isTruncated ? " [truncated]" : "";
  const lines = [`Exec ${status}${trunc}`];
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(`stderr: ${data.stderr}`);
  if (data.json !== undefined) lines.push(`json: ${JSON.stringify(data.json)}`);
  if (data.parseJsonError) lines.push(`json-parse-error: ${data.parseJsonError}`);
  return lines.join("\n");
}

/** Formats structured Docker Compose up output into a human-readable summary.
 *  #107: Shows per-service state details when available. */
export function formatComposeUp(data: DockerComposeUp): string {
  if (!data.success) return "Compose up failed";
  const started = (data.services ?? []).length;
  if (started === 0) return "Compose up succeeded (no new services started)";
  const lines = [
    `Compose up: ${started} services started (${(data.services ?? []).join(", ")})`,
  ];
  if (data.serviceStates && data.serviceStates.length > 0) {
    for (const ss of data.serviceStates) {
      lines.push(`  ${ss.name}: ${ss.action}`);
    }
  }
  if (data.networksCreated != null) lines.push(`  networks created: ${data.networksCreated}`);
  if (data.volumesCreated != null) lines.push(`  volumes created: ${data.volumesCreated}`);
  return lines.join("\n");
}

/** Formats structured Docker Compose down output into a human-readable summary.
 *  #100: Shows per-container details.
 *  #101: Shows separate volume and network counts. */
export function formatComposeDown(data: DockerComposeDown): string {
  if (!data.success) return "Compose down failed";
  const removedContainers = (data.containers ?? []).filter((c) => c.action === "Removed").length;
  const removed =
    removedContainers + (data.volumesRemoved ?? 0) + (data.networksRemoved ?? 0);
  const parts = [`Compose down: ${data.stopped} stopped, ${removed} removed`];
  if (data.volumesRemoved) parts[0] += `, ${data.volumesRemoved} volumes removed`;
  if (data.networksRemoved) parts[0] += `, ${data.networksRemoved} networks removed`;
  if (data.containers && data.containers.length > 0) {
    for (const c of data.containers) {
      parts.push(`  ${c.name}: ${c.action}`);
    }
  }
  return parts.join("\n");
}

/** Formats structured Docker pull output into a human-readable summary.
 *  #120: Shows size when available. */
export function formatPull(data: DockerPull): string {
  if (!data.success) {
    const errType = data.errorType ? ` (${data.errorType})` : "";
    const msg = data.errorMessage ? `: ${data.errorMessage}` : "";
    return `Pull failed${errType}${msg}`;
  }
  const digest = data.digest ? ` (${data.digest.slice(0, 19)}...)` : "";
  const size = data.size ? ` [${data.size}]` : "";
  if (data.status === "up-to-date") return `Image is up to date${digest}`;
  return `Pulled${digest}${size}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact ps: short containerId, name, image, status only. Drop ports, createdAt, state details. */
export interface DockerPsCompact {
  [key: string]: unknown;
  containers: Array<{ id: string; name: string; image: string; status: string }>;
}

export function compactPsMap(data: DockerPs): DockerPsCompact {
  return {
    containers: data.containers.map((c) => ({
      id: c.id.slice(0, 12),
      name: c.name,
      image: c.image,
      status: c.status,
    })),
  };
}

export function formatPsCompact(data: DockerPsCompact): string {
  const total = data.containers.length;
  const running = data.containers.filter((c) => c.status.toLowerCase().startsWith("up")).length;
  const lines = [`${total} containers (${running} running)`];
  for (const c of data.containers) {
    lines.push(`  ${c.id.slice(0, 12)} ${c.name} (${c.image}) ${c.status}`);
  }
  return lines.join("\n");
}

/** Compact images: repository, tag, short id, size. Drop createdAt. */
export interface DockerImagesCompact {
  [key: string]: unknown;
  images: Array<{ id: string; repository: string; tag: string; size: string }>;
}

export function compactImagesMap(data: DockerImages): DockerImagesCompact {
  return {
    images: data.images.map((img) => ({
      id: img.id.slice(0, 12),
      repository: img.repository,
      tag: img.tag,
      size: img.size,
    })),
  };
}

export function formatImagesCompact(data: DockerImagesCompact): string {
  const total = data.images.length;
  if (total === 0) return "No images found.";
  const lines = [`${total} images:`];
  for (const img of data.images) {
    const tag = img.tag && img.tag !== "<none>" ? `:${img.tag}` : "";
    lines.push(`  ${img.repository}${tag} (${img.size})`);
  }
  return lines.join("\n");
}

/** Compact build: success, imageId. Drop errors array details. */
export interface DockerBuildCompact {
  [key: string]: unknown;
  success: boolean;
  imageId?: string;
}

export function compactBuildMap(data: DockerBuild): DockerBuildCompact {
  return {
    success: data.success,
    ...(data.imageId ? { imageId: data.imageId } : {}),
  };
}

export function formatBuildCompact(data: DockerBuildCompact): string {
  if (data.success) {
    const id = data.imageId ? ` → ${data.imageId}` : "";
    return `Build succeeded${id}`;
  }
  return "Build failed";
}

/** Compact logs: first/last few lines. Drop full lines array if large. */
export interface DockerLogsCompact {
  [key: string]: unknown;
  head: string[];
  tail: string[];
}

export function compactLogsMap(data: DockerLogs): DockerLogsCompact {
  const HEAD_SIZE = 5;
  const TAIL_SIZE = 5;
  const lines = data.lines ?? [];
  const total = lines.length;
  return {
    head: lines.slice(0, HEAD_SIZE),
    tail: total > HEAD_SIZE + TAIL_SIZE ? lines.slice(-TAIL_SIZE) : [],
  };
}

export function formatLogsCompact(data: DockerLogsCompact): string {
  const total = data.head.length + data.tail.length + (data.tail.length > 0 ? 0 : 0);
  // Estimate total from head+tail; if tail is present there are omitted lines
  const parts = [`${data.head.length + data.tail.length} lines`];
  if (data.head.length) parts.push(data.head.join("\n"));
  if (data.tail.length)
    parts.push(
      "  ... lines omitted ...",
      data.tail.join("\n"),
    );
  return parts.join("\n");
}

/** Compact pull: preserve digest and status since they are small and highly actionable. */
export interface DockerPullCompact {
  [key: string]: unknown;
  digest?: string;
  status: "pulled" | "up-to-date" | "error";
  success: boolean;
  errorType?: "auth" | "not-found" | "network-timeout" | "rate-limit" | "unknown";
}

export function compactPullMap(data: DockerPull): DockerPullCompact {
  return {
    ...(data.digest ? { digest: data.digest } : {}),
    status: data.status,
    success: data.success,
    ...(data.errorType ? { errorType: data.errorType } : {}),
  };
}

export function formatPullCompact(data: DockerPullCompact): string {
  if (!data.success) {
    const err = data.errorType ? ` (${data.errorType})` : "";
    return `Pull failed${err}`;
  }
  const digest = data.digest ? ` (${data.digest.slice(0, 19)}...)` : "";
  if (data.status === "up-to-date") return `Image is up to date${digest}`;
  return `Pulled${digest}`;
}

/** Compact run: passthrough (already small). */
export interface DockerRunCompact {
  [key: string]: unknown;
  containerId: string;
  detached: boolean;
}

export function compactRunMap(data: DockerRun): DockerRunCompact {
  return {
    containerId: data.containerId,
    detached: data.detached,
  };
}

export function formatRunCompact(data: DockerRunCompact): string {
  const mode = data.detached ? "detached" : "attached";
  return `Container ${data.containerId} [${mode}]`;
}

/** Compact exec: passthrough (already small). */
export interface DockerExecCompact {
  [key: string]: unknown;
  exitCode: number;
  timedOut?: boolean;
  isTruncated?: boolean;
  stdoutPreview?: string;
  stderrPreview?: string;
}

export function compactExecMap(data: DockerExec): DockerExecCompact {
  return {
    exitCode: data.exitCode,
    ...(data.timedOut ? { timedOut: true } : {}),
    ...(data.isTruncated ? { isTruncated: true } : {}),
    ...(data.stdout ? { stdoutPreview: data.stdout.slice(0, 200) } : {}),
    ...(data.stderr ? { stderrPreview: data.stderr.slice(0, 200) } : {}),
  };
}

export function formatExecCompact(data: DockerExecCompact): string {
  const success = data.exitCode === 0;
  const status = data.timedOut
    ? "timed out"
    : success
      ? "succeeded"
      : `failed (exit code ${data.exitCode})`;
  const trunc = data.isTruncated ? " [truncated]" : "";
  const lines = [`Exec ${status}${trunc}`];
  if (data.stdoutPreview) lines.push(data.stdoutPreview);
  if (data.stderrPreview) lines.push(`stderr: ${data.stderrPreview}`);
  return lines.join("\n");
}

/** Compact compose up: passthrough (already small). */
export interface DockerComposeUpCompact {
  [key: string]: unknown;
  success: boolean;
  services?: string[];
  networksCreated?: number;
  volumesCreated?: number;
}

export function compactComposeUpMap(data: DockerComposeUp): DockerComposeUpCompact {
  return {
    success: data.success,
    ...(data.services ? { services: data.services } : {}),
    ...(data.networksCreated != null ? { networksCreated: data.networksCreated } : {}),
    ...(data.volumesCreated != null ? { volumesCreated: data.volumesCreated } : {}),
  };
}

export function formatComposeUpCompact(data: DockerComposeUpCompact): string {
  if (!data.success) return "Compose up failed";
  const started = (data.services ?? []).length;
  const infra =
    data.networksCreated != null || data.volumesCreated != null
      ? ` (networks=${data.networksCreated ?? 0}, volumes=${data.volumesCreated ?? 0})`
      : "";
  return `Compose up: ${started} services started${infra}`;
}

/** Compact compose down: passthrough (already small). */
export interface DockerComposeDownCompact {
  [key: string]: unknown;
  success: boolean;
  stopped: number;
}

export function compactComposeDownMap(data: DockerComposeDown): DockerComposeDownCompact {
  return {
    success: data.success,
    stopped: data.stopped,
  };
}

export function formatComposeDownCompact(data: DockerComposeDownCompact): string {
  if (!data.success) return "Compose down failed";
  return `Compose down: ${data.stopped} stopped`;
}

// ── Inspect ──────────────────────────────────────────────────────────

/** Formats structured Docker inspect data into a human-readable summary.
 *  Handles both container and image inspect results. */
export function formatInspect(data: DockerInspect): string {
  if (data.inspectType === "image") {
    return formatImageInspect(data);
  }
  if (data.inspectType === "volume") {
    return formatVolumeInspect(data);
  }
  if (data.inspectType === "network") {
    return formatNetworkInspect(data);
  }
  return formatContainerInspect(data);
}

/** Formats a container inspect result.
 *  #111: Shows network settings.
 *  #112: Shows mount information. */
function formatContainerInspect(data: DockerInspect): string {
  const lines = [`${data.name} (${data.id})`];
  lines.push(`  Image: ${data.image}`);
  const state = data.state;
  if (state) {
    lines.push(`  State: ${state.status} (running: ${state.running})`);
    if (state.startedAt) lines.push(`  Started: ${state.startedAt}`);
  }
  if (data.healthStatus) lines.push(`  Health: ${data.healthStatus}`);
  if (data.restartPolicy) lines.push(`  Restart: ${data.restartPolicy}`);
  if (data.platform) lines.push(`  Platform: ${data.platform}`);
  if (data.created) lines.push(`  Created: ${data.created}`);
  if (data.env && data.env.length > 0) {
    lines.push(`  Env: ${data.env.length} variables`);
  }
  // #111: Show network settings
  if (data.networkSettings) {
    lines.push(`  Network: IP=${data.networkSettings.ipAddress}`);
  }
  // #112: Show mounts
  if (data.mounts && data.mounts.length > 0) {
    lines.push(`  Mounts: ${data.mounts.length} mount(s)`);
    for (const m of data.mounts) {
      const mode = m.mode ? ` [${m.mode}]` : "";
      lines.push(`    ${m.source} → ${m.destination}${mode}`);
    }
  }
  if (data.relatedTargets && data.relatedTargets.length > 1) {
    lines.push(`  Related targets: ${data.relatedTargets.length}`);
  }
  return lines.join("\n");
}

/** Formats an image inspect result. */
function formatImageInspect(data: DockerInspect): string {
  const lines = [`Image: ${data.name} (${data.id})`];
  if (data.repoTags && data.repoTags.length > 0) {
    lines.push(`  Tags: ${data.repoTags.join(", ")}`);
  }
  if (data.repoDigests && data.repoDigests.length > 0) {
    lines.push(`  Digests: ${data.repoDigests.map((d) => d.slice(0, 40) + "...").join(", ")}`);
  }
  if (data.size != null) {
    const sizeMB = (data.size / 1024 / 1024).toFixed(1);
    lines.push(`  Size: ${sizeMB} MB`);
  }
  if (data.platform) lines.push(`  Platform: ${data.platform}`);
  if (data.created) lines.push(`  Created: ${data.created}`);
  if (data.entrypoint && data.entrypoint.length > 0) {
    lines.push(`  Entrypoint: ${data.entrypoint.join(" ")}`);
  }
  if (data.cmd && data.cmd.length > 0) {
    lines.push(`  Cmd: ${data.cmd.join(" ")}`);
  }
  if (data.env && data.env.length > 0) {
    lines.push(`  Env: ${data.env.length} variables`);
  }
  if (data.relatedTargets && data.relatedTargets.length > 1) {
    lines.push(`  Related targets: ${data.relatedTargets.length}`);
  }
  return lines.join("\n");
}

function formatVolumeInspect(data: DockerInspect): string {
  const lines = [`Volume: ${data.name} (${data.id})`];
  if (data.driver) lines.push(`  Driver: ${data.driver}`);
  if (data.scope) lines.push(`  Scope: ${data.scope}`);
  if (data.mountpoint) lines.push(`  Mountpoint: ${data.mountpoint}`);
  if (data.created) lines.push(`  Created: ${data.created}`);
  if (data.labels && Object.keys(data.labels).length > 0) {
    lines.push(`  Labels: ${Object.keys(data.labels).length}`);
  }
  return lines.join("\n");
}

function formatNetworkInspect(data: DockerInspect): string {
  const lines = [`Network: ${data.name} (${data.id})`];
  if (data.driver) lines.push(`  Driver: ${data.driver}`);
  if (data.scope) lines.push(`  Scope: ${data.scope}`);
  if (data.created) lines.push(`  Created: ${data.created}`);
  if (data.labels && Object.keys(data.labels).length > 0) {
    lines.push(`  Labels: ${Object.keys(data.labels).length}`);
  }
  return lines.join("\n");
}

/** Compact inspect: id, name, status, running. Drop startedAt, platform, created.
 *  For images: id, name, tags, platform. */
export interface DockerInspectCompact {
  [key: string]: unknown;
  id: string;
  name: string;
  inspectType?: string;
  status: string;
  running: boolean;
  image: string;
  healthStatus?: string;
  repoTags?: string[];
}

export function compactInspectMap(data: DockerInspect): DockerInspectCompact {
  if (data.inspectType === "image") {
    return {
      id: data.id,
      name: data.name,
      inspectType: "image",
      status: "n/a",
      running: false,
      image: data.image,
      ...(data.repoTags ? { repoTags: data.repoTags } : {}),
    };
  }
  if (data.inspectType === "volume" || data.inspectType === "network") {
    return {
      id: data.id,
      name: data.name,
      inspectType: data.inspectType,
      status: data.status ?? "n/a",
      running: false,
      image: data.image,
    };
  }
  return {
    id: data.id,
    name: data.name,
    inspectType: "container",
    status: data.state?.status ?? data.status ?? "unknown",
    running: data.state?.running ?? data.running ?? false,
    image: data.image,
    ...(data.healthStatus ? { healthStatus: data.healthStatus } : {}),
  };
}

export function formatInspectCompact(data: DockerInspectCompact): string {
  if (data.inspectType === "image") {
    const tags = data.repoTags ? ` tags=${data.repoTags.join(",")}` : "";
    return `Image ${data.name} (${data.id})${tags}`;
  }
  if (data.inspectType === "volume") {
    return `Volume ${data.name} (${data.id})`;
  }
  if (data.inspectType === "network") {
    return `Network ${data.name} (${data.id})`;
  }
  const health = data.healthStatus ? ` health=${data.healthStatus}` : "";
  return `${data.name} (${data.id}) ${data.status} [${data.running ? "running" : "stopped"}] image=${data.image}${health}`;
}

// ── Network LS ───────────────────────────────────────────────────────

/** Formats structured Docker network list into a human-readable listing.
 *  #115: Shows labels when present.
 *  #116: Shows boolean flags. */
export function formatNetworkLs(data: DockerNetworkLs): string {
  const total = data.networks.length;
  if (total === 0) return "No networks found.";

  const lines = [`${total} networks:`];
  for (const n of data.networks) {
    const created = n.createdAt ? ` (${n.createdAt})` : "";
    const flags: string[] = [];
    if (n.ipv6) flags.push("ipv6");
    if (n.internal) flags.push("internal");
    if (n.attachable) flags.push("attachable");
    const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    const labelCount =
      n.labels && Object.keys(n.labels).length > 0 ? ` labels=${Object.keys(n.labels).length}` : "";
    lines.push(`  ${n.name} (${n.driver}, ${n.scope})${created}${flagStr}${labelCount}`);
  }
  return lines.join("\n");
}

/** Compact network-ls: name, driver, and id for subsequent inspect/rm calls. */
export interface DockerNetworkLsCompact {
  [key: string]: unknown;
  networks: Array<{ id?: string; name: string; driver: string }>;
}

export function compactNetworkLsMap(data: DockerNetworkLs): DockerNetworkLsCompact {
  return {
    networks: data.networks.map((n) => ({
      ...(n.id ? { id: n.id } : {}),
      name: n.name,
      driver: n.driver,
    })),
  };
}

export function formatNetworkLsCompact(data: DockerNetworkLsCompact): string {
  const total = data.networks.length;
  if (total === 0) return "No networks found.";
  const lines = [`${total} networks:`];
  for (const n of data.networks) {
    const id = n.id ? ` [${n.id}]` : "";
    lines.push(`  ${n.name} (${n.driver})${id}`);
  }
  return lines.join("\n");
}

// ── Volume LS ────────────────────────────────────────────────────────

/** Formats structured Docker volume list into a human-readable listing.
 *  #125: Shows labels when present. */
export function formatVolumeLs(data: DockerVolumeLs): string {
  const total = data.volumes.length;
  if (total === 0) return "No volumes found.";

  const lines = [`${total} volumes:`];
  for (const v of data.volumes) {
    const created = v.createdAt ? ` (${v.createdAt})` : "";
    const status = v.status ? ` status=${v.status}` : "";
    const labelCount =
      v.labels && Object.keys(v.labels).length > 0 ? ` labels=${Object.keys(v.labels).length}` : "";
    lines.push(`  ${v.name} (${v.driver}, ${v.scope})${created}${status}${labelCount}`);
  }
  return lines.join("\n");
}

/** Compact volume-ls: name, driver, and mountpoint for verifying mount configurations. */
export interface DockerVolumeLsCompact {
  [key: string]: unknown;
  volumes: Array<{ name: string; driver: string; mountpoint?: string }>;
}

export function compactVolumeLsMap(data: DockerVolumeLs): DockerVolumeLsCompact {
  return {
    volumes: data.volumes.map((v) => ({
      name: v.name,
      driver: v.driver,
      ...(v.mountpoint ? { mountpoint: v.mountpoint } : {}),
    })),
  };
}

export function formatVolumeLsCompact(data: DockerVolumeLsCompact): string {
  const total = data.volumes.length;
  if (total === 0) return "No volumes found.";
  const lines = [`${total} volumes:`];
  for (const v of data.volumes) {
    const mp = v.mountpoint ? ` @ ${v.mountpoint}` : "";
    lines.push(`  ${v.name} (${v.driver})${mp}`);
  }
  return lines.join("\n");
}

// ── Compose Build ────────────────────────────────────────────────────

/** Formats structured Docker Compose build output into a human-readable summary.
 *  #99: Shows per-service duration. */
export function formatComposeBuild(data: DockerComposeBuild): string {
  const services = data.services ?? [];
  const built = services.filter((s) => s.success).length;
  const failed = services.filter((s) => !s.success).length;

  if (!data.success && built === 0) {
    const lines = ["Compose build failed"];
    for (const s of services) {
      if (s.error) lines.push(`  ${s.service}: ${s.error}`);
    }
    return lines.join("\n");
  }

  const lines = [`Compose build: ${built} built, ${failed} failed`];
  for (const s of data.services ?? []) {
    const status = s.success ? "built" : "failed";
    const error = s.error ? ` — ${s.error}` : "";
    const dur = s.duration != null ? ` (${s.duration}s)` : "";
    const imageId = s.imageId ? ` id=${s.imageId}` : "";
    const image = s.image ? ` image=${s.image}` : "";
    lines.push(`  ${s.service}: ${status}${dur}${imageId}${image}${error}`);
  }
  return lines.join("\n");
}

// ── Stats ────────────────────────────────────────────────────────────

/** Formats structured Docker stats data into a human-readable listing with CPU, memory, and I/O.
 *  #123/#124: Shows numeric memory and I/O values. */
export function formatStats(data: DockerStats): string {
  const total = data.containers.length;
  if (total === 0) return "No container stats available.";

  const lines = [`${total} containers:`];
  for (const c of data.containers) {
    const state = c.state ? ` [${c.state}]` : "";
    lines.push(
      `  ${c.name}${state} (${c.id}) CPU: ${c.cpuPercent.toFixed(2)}% Mem: ${c.memoryUsage}/${c.memoryLimit} (${c.memoryPercent.toFixed(2)}%) Net: ${c.netIO} Block: ${c.blockIO} PIDs: ${c.pids}`,
    );
  }
  return lines.join("\n");
}

/** Compact compose build: success only. Drop per-service details. */
export interface DockerComposeBuildCompact {
  [key: string]: unknown;
  success: boolean;
  services?: Array<{ service: string; success: boolean }>;
}

export function compactComposeBuildMap(data: DockerComposeBuild): DockerComposeBuildCompact {
  return {
    success: data.success,
    ...(data.services
      ? {
          services: data.services.map((s) => ({
            service: s.service,
            success: s.success,
          })),
        }
      : {}),
  };
}

export function formatComposeBuildCompact(data: DockerComposeBuildCompact): string {
  const services = data.services ?? [];
  const built = services.filter((s) => s.success).length;
  const failed = services.filter((s) => !s.success).length;
  if (!data.success && built === 0) {
    return "Compose build failed";
  }
  return `Compose build: ${built} built, ${failed} failed`;
}

/** Compact stats: name, cpuPercent, memoryPercent, memoryUsage, pids. Preserve memoryUsage since absolute memory is often more useful than percentage. */
export interface DockerStatsCompact {
  [key: string]: unknown;
  containers: Array<{
    id: string;
    name: string;
    state?: string;
    cpuPercent: number;
    memoryUsage?: string;
    memoryPercent: number;
    pids: number;
  }>;
}

export function compactStatsMap(data: DockerStats): DockerStatsCompact {
  return {
    containers: data.containers.map((c) => ({
      id: c.id,
      name: c.name,
      ...(c.state ? { state: c.state } : {}),
      cpuPercent: c.cpuPercent,
      memoryUsage: c.memoryUsage,
      memoryPercent: c.memoryPercent,
      pids: c.pids,
    })),
  };
}

export function formatStatsCompact(data: DockerStatsCompact): string {
  const total = data.containers.length;
  if (total === 0) return "No container stats available.";
  const lines = [`${total} containers:`];
  for (const c of data.containers) {
    const mem = c.memoryUsage ? ` ${c.memoryUsage}` : "";
    const state = c.state ? ` [${c.state}]` : "";
    lines.push(
      `  ${c.name}${state} (${c.id}) CPU: ${c.cpuPercent.toFixed(2)}% Mem:${mem} (${c.memoryPercent.toFixed(2)}%) PIDs: ${c.pids}`,
    );
  }
  return lines.join("\n");
}

// ── Compose PS ───────────────────────────────────────────────────────

/** Formats structured Docker Compose ps data into a human-readable listing.
 *  #105: Shows health status.
 *  #106: Shows running/stopped counts. */
export function formatComposePs(data: DockerComposePs): string {
  const total = data.services.length;
  if (total === 0) return "No compose services found.";

  const running = data.services.filter((s) => s.state === "running").length;
  const stopped = data.services.filter(
    (s) => s.state === "exited" || s.state === "dead" || s.state === "removing",
  ).length;
  const countInfo = ` (${running} running, ${stopped} stopped)`;
  const lines = [`${total} services${countInfo}:`];
  for (const s of data.services) {
    const portsArr = s.ports ?? [];
    const ports = portsArr.length
      ? ` [${portsArr.map((p) => (p.host ? `${p.host}->${p.container}/${p.protocol}` : `${p.container}/${p.protocol}`)).join(", ")}]`
      : "";
    const health = s.health ? ` health=${s.health}` : "";
    const exit = s.exitCode != null ? ` exit=${s.exitCode}` : "";
    lines.push(
      `  ${s.state.padEnd(10)} ${s.name} (${s.service}) ${s.status}${ports}${health}${exit}`,
    );
  }
  return lines.join("\n");
}

/** Compact compose-ps: name, service, state. Drop status, ports. */
export interface DockerComposePsCompact {
  [key: string]: unknown;
  services: Array<{ name: string; service: string; state: string; exitCode?: number }>;
}

export function compactComposePsMap(data: DockerComposePs): DockerComposePsCompact {
  return {
    services: data.services.map((s) => ({
      name: s.name,
      service: s.service,
      state: s.state,
      ...(s.exitCode != null ? { exitCode: s.exitCode } : {}),
    })),
  };
}

export function formatComposePsCompact(data: DockerComposePsCompact): string {
  const total = data.services.length;
  if (total === 0) return "No compose services found.";
  const lines = [`${total} services:`];
  for (const s of data.services) {
    const exit = s.exitCode != null ? ` exit=${s.exitCode}` : "";
    lines.push(`  ${s.state.padEnd(10)} ${s.name} (${s.service})${exit}`);
  }
  return lines.join("\n");
}

// ── Compose Logs ─────────────────────────────────────────────────────

/** Formats structured Docker Compose logs into a human-readable output grouped by service.
 *  #104: Shows log level when available. */
export function formatComposeLogs(data: DockerComposeLogs): string {
  const entries = data.entries ?? [];
  const total = entries.length;
  const serviceSet = new Set(entries.map((e) => e.service));
  const serviceCount = serviceSet.size;
  const header = data.isTruncated
    ? `Compose logs: ${serviceCount} services, ${total} entries (truncated)`
    : `Compose logs: ${serviceCount} services, ${total} entries`;

  const lines = [header];
  for (const entry of data.entries ?? []) {
    const ts = entry.timestamp ? `${entry.timestamp} ` : "";
    const level = entry.level ? `[${entry.level.toUpperCase()}] ` : "";
    lines.push(`  ${entry.service} | ${ts}${level}${entry.message}`);
  }
  return lines.join("\n");
}

/** Compact compose-logs: head/tail entries. Preserve timestamps for log correlation. */
export interface DockerComposeLogsCompact {
  [key: string]: unknown;
  head: Array<{ service: string; message: string; timestamp?: string }>;
  tail: Array<{ service: string; message: string; timestamp?: string }>;
}

export function compactComposeLogsMap(data: DockerComposeLogs): DockerComposeLogsCompact {
  const HEAD_SIZE = 5;
  const TAIL_SIZE = 5;
  const entries = data.entries ?? [];
  const total = entries.length;
  return {
    head: entries.slice(0, HEAD_SIZE).map((e) => ({
      service: e.service,
      message: e.message,
      ...(e.timestamp ? { timestamp: e.timestamp } : {}),
    })),
    tail:
      total > HEAD_SIZE + TAIL_SIZE
        ? entries.slice(-TAIL_SIZE).map((e) => ({
            service: e.service,
            message: e.message,
            ...(e.timestamp ? { timestamp: e.timestamp } : {}),
          }))
        : [],
  };
}

export function formatComposeLogsCompact(data: DockerComposeLogsCompact): string {
  const total = data.head.length + data.tail.length;
  const serviceSet = new Set([...data.head, ...data.tail].map((e) => e.service));
  const parts = [`Compose logs: ${serviceSet.size} services, ${total} entries`];
  for (const e of data.head) {
    const ts = e.timestamp ? `${e.timestamp} ` : "";
    parts.push(`  ${e.service} | ${ts}${e.message}`);
  }
  if (data.tail.length) {
    parts.push("  ... entries omitted ...");
    for (const e of data.tail) {
      const ts = e.timestamp ? `${e.timestamp} ` : "";
      parts.push(`  ${e.service} | ${ts}${e.message}`);
    }
  }
  return parts.join("\n");
}
