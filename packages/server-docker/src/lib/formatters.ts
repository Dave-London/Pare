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
  const lines = [`${data.total} containers (${data.running} running, ${data.stopped} stopped)`];
  for (const c of data.containers) {
    const ports = c.ports.length
      ? ` [${c.ports.map((p) => (p.host ? `${p.host}->${p.container}/${p.protocol}` : `${p.container}/${p.protocol}`)).join(", ")}]`
      : "";
    lines.push(`  ${c.state.padEnd(10)} ${c.name} (${c.image})${ports}`);
  }
  return lines.join("\n");
}

/** Formats structured Docker build results into a human-readable success/failure summary. */
export function formatBuild(data: DockerBuild): string {
  if (data.success) {
    const parts = [`Build succeeded in ${data.duration}s`];
    if (data.imageId) parts[0] += ` → ${data.imageId}`;
    if (data.steps) parts.push(`${data.steps} steps`);
    return parts.join(", ");
  }

  const lines = [`Build failed (${data.duration}s)`];
  for (const err of data.errors) {
    lines.push(`  ${err}`);
  }
  return lines.join("\n");
}

/** Formats structured Docker logs data into a human-readable output with container name and line count. */
export function formatLogs(data: DockerLogs): string {
  const header = data.isTruncated
    ? `${data.container} (${data.total} of ${data.totalLines} lines, truncated)`
    : `${data.container} (${data.total} lines)`;
  return `${header}\n${data.lines.join("\n")}`;
}

/** Formats structured Docker image data into a human-readable listing with repository, tag, and size. */
export function formatImages(data: DockerImages): string {
  if (data.total === 0) return "No images found.";

  const lines = [`${data.total} images:`];
  for (const img of data.images) {
    const tag = img.tag && img.tag !== "<none>" ? `:${img.tag}` : "";
    lines.push(`  ${img.repository}${tag} (${img.size}, ${img.created})`);
  }
  return lines.join("\n");
}

/** Formats structured Docker run output into a human-readable summary. */
export function formatRun(data: DockerRun): string {
  const name = data.name ? ` (${data.name})` : "";
  const mode = data.detached ? "detached" : "attached";
  return `Container ${data.containerId}${name} started from ${data.image} [${mode}]`;
}

/** Formats structured Docker exec output into a human-readable summary. */
export function formatExec(data: DockerExec): string {
  const status = data.success ? "succeeded" : `failed (exit code ${data.exitCode})`;
  const lines = [`Exec ${status}`];
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(`stderr: ${data.stderr}`);
  return lines.join("\n");
}

/** Formats structured Docker Compose up output into a human-readable summary. */
export function formatComposeUp(data: DockerComposeUp): string {
  if (!data.success) return "Compose up failed";
  if (data.started === 0) return "Compose up succeeded (no new services started)";
  return `Compose up: ${data.started} services started (${data.services.join(", ")})`;
}

/** Formats structured Docker Compose down output into a human-readable summary. */
export function formatComposeDown(data: DockerComposeDown): string {
  if (!data.success) return "Compose down failed";
  return `Compose down: ${data.stopped} stopped, ${data.removed} removed`;
}

/** Formats structured Docker pull output into a human-readable summary. */
export function formatPull(data: DockerPull): string {
  if (!data.success) return `Pull failed for ${data.image}:${data.tag}`;
  const digest = data.digest ? ` (${data.digest.slice(0, 19)}...)` : "";
  return `Pulled ${data.image}:${data.tag}${digest}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact ps: short containerId, name, image, status only. Drop ports, createdAt, state details. */
export interface DockerPsCompact {
  [key: string]: unknown;
  containers: Array<{ id: string; name: string; image: string; status: string }>;
  total: number;
  running: number;
  stopped: number;
}

export function compactPsMap(data: DockerPs): DockerPsCompact {
  return {
    containers: data.containers.map((c) => ({
      id: c.id.slice(0, 12),
      name: c.name,
      image: c.image,
      status: c.status,
    })),
    total: data.total,
    running: data.running,
    stopped: data.stopped,
  };
}

export function formatPsCompact(data: DockerPsCompact): string {
  const lines = [`${data.total} containers (${data.running} running)`];
  for (const c of data.containers) {
    lines.push(`  ${c.id.slice(0, 12)} ${c.name} (${c.image}) ${c.status}`);
  }
  return lines.join("\n");
}

/** Compact images: repository, tag, short id, size. Drop createdAt. */
export interface DockerImagesCompact {
  [key: string]: unknown;
  images: Array<{ id: string; repository: string; tag: string; size: string }>;
  total: number;
}

export function compactImagesMap(data: DockerImages): DockerImagesCompact {
  return {
    images: data.images.map((img) => ({
      id: img.id.slice(0, 12),
      repository: img.repository,
      tag: img.tag,
      size: img.size,
    })),
    total: data.total,
  };
}

export function formatImagesCompact(data: DockerImagesCompact): string {
  if (data.total === 0) return "No images found.";
  const lines = [`${data.total} images:`];
  for (const img of data.images) {
    const tag = img.tag && img.tag !== "<none>" ? `:${img.tag}` : "";
    lines.push(`  ${img.repository}${tag} (${img.size})`);
  }
  return lines.join("\n");
}

/** Compact build: success, imageId, duration. Drop warnings array details, keep error count. */
export interface DockerBuildCompact {
  [key: string]: unknown;
  success: boolean;
  imageId?: string;
  duration: number;
  errorCount: number;
}

export function compactBuildMap(data: DockerBuild): DockerBuildCompact {
  return {
    success: data.success,
    ...(data.imageId ? { imageId: data.imageId } : {}),
    duration: data.duration,
    errorCount: data.errors.length,
  };
}

export function formatBuildCompact(data: DockerBuildCompact): string {
  if (data.success) {
    const id = data.imageId ? ` → ${data.imageId}` : "";
    return `Build succeeded in ${data.duration}s${id}`;
  }
  return `Build failed (${data.duration}s, ${data.errorCount} errors)`;
}

/** Compact logs: container, count, first/last few lines. Drop full lines array if large. */
export interface DockerLogsCompact {
  [key: string]: unknown;
  container: string;
  total: number;
  head: string[];
  tail: string[];
}

export function compactLogsMap(data: DockerLogs): DockerLogsCompact {
  const HEAD_SIZE = 5;
  const TAIL_SIZE = 5;
  return {
    container: data.container,
    total: data.total,
    head: data.lines.slice(0, HEAD_SIZE),
    tail: data.total > HEAD_SIZE + TAIL_SIZE ? data.lines.slice(-TAIL_SIZE) : [],
  };
}

export function formatLogsCompact(data: DockerLogsCompact): string {
  const parts = [`${data.container} (${data.total} lines)`];
  if (data.head.length) parts.push(data.head.join("\n"));
  if (data.tail.length)
    parts.push(
      `  ... ${data.total - data.head.length - data.tail.length} lines omitted ...`,
      data.tail.join("\n"),
    );
  return parts.join("\n");
}

/** Compact pull: passthrough (already small). */
export interface DockerPullCompact {
  [key: string]: unknown;
  image: string;
  tag: string;
  success: boolean;
}

export function compactPullMap(data: DockerPull): DockerPullCompact {
  return {
    image: data.image,
    tag: data.tag,
    success: data.success,
  };
}

export function formatPullCompact(data: DockerPullCompact): string {
  if (!data.success) return `Pull failed for ${data.image}:${data.tag}`;
  return `Pulled ${data.image}:${data.tag}`;
}

/** Compact run: passthrough (already small). */
export interface DockerRunCompact {
  [key: string]: unknown;
  containerId: string;
  image: string;
  detached: boolean;
}

export function compactRunMap(data: DockerRun): DockerRunCompact {
  return {
    containerId: data.containerId,
    image: data.image,
    detached: data.detached,
  };
}

export function formatRunCompact(data: DockerRunCompact): string {
  const mode = data.detached ? "detached" : "attached";
  return `Container ${data.containerId} from ${data.image} [${mode}]`;
}

/** Compact exec: passthrough (already small). */
export interface DockerExecCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
}

export function compactExecMap(data: DockerExec): DockerExecCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
  };
}

export function formatExecCompact(data: DockerExecCompact): string {
  return data.success ? "Exec succeeded" : `Exec failed (exit code ${data.exitCode})`;
}

/** Compact compose up: passthrough (already small). */
export interface DockerComposeUpCompact {
  [key: string]: unknown;
  success: boolean;
  started: number;
}

export function compactComposeUpMap(data: DockerComposeUp): DockerComposeUpCompact {
  return {
    success: data.success,
    started: data.started,
  };
}

export function formatComposeUpCompact(data: DockerComposeUpCompact): string {
  if (!data.success) return "Compose up failed";
  return `Compose up: ${data.started} services started`;
}

/** Compact compose down: passthrough (already small). */
export interface DockerComposeDownCompact {
  [key: string]: unknown;
  success: boolean;
  stopped: number;
  removed: number;
}

export function compactComposeDownMap(data: DockerComposeDown): DockerComposeDownCompact {
  return {
    success: data.success,
    stopped: data.stopped,
    removed: data.removed,
  };
}

export function formatComposeDownCompact(data: DockerComposeDownCompact): string {
  if (!data.success) return "Compose down failed";
  return `Compose down: ${data.stopped} stopped, ${data.removed} removed`;
}

// ── Inspect ──────────────────────────────────────────────────────────

/** Formats structured Docker inspect data into a human-readable summary. */
export function formatInspect(data: DockerInspect): string {
  const lines = [`${data.name} (${data.id})`];
  lines.push(`  Image: ${data.image}`);
  lines.push(`  State: ${data.state.status} (running: ${data.state.running})`);
  if (data.state.startedAt) lines.push(`  Started: ${data.state.startedAt}`);
  if (data.platform) lines.push(`  Platform: ${data.platform}`);
  lines.push(`  Created: ${data.created}`);
  return lines.join("\n");
}

/** Compact inspect: id, name, status, running. Drop startedAt, platform, created. */
export interface DockerInspectCompact {
  [key: string]: unknown;
  id: string;
  name: string;
  status: string;
  running: boolean;
  image: string;
}

export function compactInspectMap(data: DockerInspect): DockerInspectCompact {
  return {
    id: data.id,
    name: data.name,
    status: data.state.status,
    running: data.state.running,
    image: data.image,
  };
}

export function formatInspectCompact(data: DockerInspectCompact): string {
  return `${data.name} (${data.id}) ${data.status} [${data.running ? "running" : "stopped"}] image=${data.image}`;
}

// ── Network LS ───────────────────────────────────────────────────────

/** Formats structured Docker network list into a human-readable listing. */
export function formatNetworkLs(data: DockerNetworkLs): string {
  if (data.total === 0) return "No networks found.";

  const lines = [`${data.total} networks:`];
  for (const n of data.networks) {
    lines.push(`  ${n.name} (${n.driver}, ${n.scope})`);
  }
  return lines.join("\n");
}

/** Compact network-ls: name and driver only. Drop id, scope. */
export interface DockerNetworkLsCompact {
  [key: string]: unknown;
  networks: Array<{ name: string; driver: string }>;
  total: number;
}

export function compactNetworkLsMap(data: DockerNetworkLs): DockerNetworkLsCompact {
  return {
    networks: data.networks.map((n) => ({
      name: n.name,
      driver: n.driver,
    })),
    total: data.total,
  };
}

export function formatNetworkLsCompact(data: DockerNetworkLsCompact): string {
  if (data.total === 0) return "No networks found.";
  const lines = [`${data.total} networks:`];
  for (const n of data.networks) {
    lines.push(`  ${n.name} (${n.driver})`);
  }
  return lines.join("\n");
}

// ── Volume LS ────────────────────────────────────────────────────────

/** Formats structured Docker volume list into a human-readable listing. */
export function formatVolumeLs(data: DockerVolumeLs): string {
  if (data.total === 0) return "No volumes found.";

  const lines = [`${data.total} volumes:`];
  for (const v of data.volumes) {
    lines.push(`  ${v.name} (${v.driver}, ${v.scope})`);
  }
  return lines.join("\n");
}

/** Compact volume-ls: name and driver only. Drop mountpoint, scope. */
export interface DockerVolumeLsCompact {
  [key: string]: unknown;
  volumes: Array<{ name: string; driver: string }>;
  total: number;
}

export function compactVolumeLsMap(data: DockerVolumeLs): DockerVolumeLsCompact {
  return {
    volumes: data.volumes.map((v) => ({
      name: v.name,
      driver: v.driver,
    })),
    total: data.total,
  };
}

export function formatVolumeLsCompact(data: DockerVolumeLsCompact): string {
  if (data.total === 0) return "No volumes found.";
  const lines = [`${data.total} volumes:`];
  for (const v of data.volumes) {
    lines.push(`  ${v.name} (${v.driver})`);
  }
  return lines.join("\n");
}


// ── Compose Build ────────────────────────────────────────────────────

/** Formats structured Docker Compose build output into a human-readable summary. */
export function formatComposeBuild(data: DockerComposeBuild): string {
  if (!data.success && data.built === 0) {
    const lines = [`Compose build failed (${data.duration}s)`];
    for (const s of data.services) {
      if (s.error) lines.push(`  ${s.service}: ${s.error}`);
    }
    return lines.join("\n");
  }

  const lines = [`Compose build: ${data.built} built, ${data.failed} failed (${data.duration}s)`];
  for (const s of data.services) {
    const status = s.success ? "built" : "failed";
    const error = s.error ? ` — ${s.error}` : "";
    lines.push(`  ${s.service}: ${status}${error}`);
// ── Stats ────────────────────────────────────────────────────────────

/** Formats structured Docker stats data into a human-readable listing with CPU, memory, and I/O. */
export function formatStats(data: DockerStats): string {
  if (data.total === 0) return "No container stats available.";

  const lines = [`${data.total} containers:`];
  for (const c of data.containers) {
    lines.push(
      `  ${c.name} (${c.id}) CPU: ${c.cpuPercent.toFixed(2)}% Mem: ${c.memoryUsage}/${c.memoryLimit} (${c.memoryPercent.toFixed(2)}%) Net: ${c.netIO} Block: ${c.blockIO} PIDs: ${c.pids}`,
    );
  }
  return lines.join("\n");
}


/** Compact compose build: success, built, failed, duration. Drop per-service details. */
export interface DockerComposeBuildCompact {
  [key: string]: unknown;
  success: boolean;
  built: number;
  failed: number;
  duration: number;
}

export function compactComposeBuildMap(data: DockerComposeBuild): DockerComposeBuildCompact {
  return {
    success: data.success,
    built: data.built,
    failed: data.failed,
    duration: data.duration,
  };
}

export function formatComposeBuildCompact(data: DockerComposeBuildCompact): string {
  if (!data.success && data.built === 0) {
    return `Compose build failed (${data.duration}s)`;
  }
  return `Compose build: ${data.built} built, ${data.failed} failed (${data.duration}s)`;
/** Compact stats: name, cpuPercent, memoryPercent, pids only. Drop I/O details. */
export interface DockerStatsCompact {
  [key: string]: unknown;
  containers: Array<{
    id: string;
    name: string;
    cpuPercent: number;
    memoryPercent: number;
    pids: number;
  }>;
  total: number;
}

export function compactStatsMap(data: DockerStats): DockerStatsCompact {
  return {
    containers: data.containers.map((c) => ({
      id: c.id,
      name: c.name,
      cpuPercent: c.cpuPercent,
      memoryPercent: c.memoryPercent,
      pids: c.pids,
    })),
    total: data.total,
  };
}

export function formatStatsCompact(data: DockerStatsCompact): string {
  if (data.total === 0) return "No container stats available.";
  const lines = [`${data.total} containers:`];
  for (const c of data.containers) {
    lines.push(
      `  ${c.name} (${c.id}) CPU: ${c.cpuPercent.toFixed(2)}% Mem: ${c.memoryPercent.toFixed(2)}% PIDs: ${c.pids}`,
    );
  }
  return lines.join("\n");
}

// ── Compose PS ───────────────────────────────────────────────────────

/** Formats structured Docker Compose ps data into a human-readable listing. */
export function formatComposePs(data: DockerComposePs): string {
  if (data.total === 0) return "No compose services found.";

  const lines = [`${data.total} services:`];
  for (const s of data.services) {
    const ports = s.ports ? ` [${s.ports}]` : "";
    lines.push(`  ${s.state.padEnd(10)} ${s.name} (${s.service}) ${s.status}${ports}`);
  }
  return lines.join("\n");
}

/** Compact compose-ps: name, service, state. Drop status, ports. */
export interface DockerComposePsCompact {
  [key: string]: unknown;
  services: Array<{ name: string; service: string; state: string }>;
  total: number;
}

export function compactComposePsMap(data: DockerComposePs): DockerComposePsCompact {
  return {
    services: data.services.map((s) => ({
      name: s.name,
      service: s.service,
      state: s.state,
    })),
    total: data.total,
  };
}

export function formatComposePsCompact(data: DockerComposePsCompact): string {
  if (data.total === 0) return "No compose services found.";
  const lines = [`${data.total} services:`];
  for (const s of data.services) {
    lines.push(`  ${s.state.padEnd(10)} ${s.name} (${s.service})`);
  }
  return lines.join("\n");
}

// ── Compose Logs ─────────────────────────────────────────────────────

/** Formats structured Docker Compose logs into a human-readable output grouped by service. */
export function formatComposeLogs(data: DockerComposeLogs): string {
  const header = data.isTruncated
    ? `Compose logs: ${data.services.length} services, ${data.total} of ${data.totalEntries} entries (truncated)`
    : `Compose logs: ${data.services.length} services, ${data.total} entries`;

  const lines = [header];
  for (const entry of data.entries) {
    const ts = entry.timestamp ? `${entry.timestamp} ` : "";
    lines.push(`  ${entry.service} | ${ts}${entry.message}`);
  }
  return lines.join("\n");
}

/** Compact compose-logs: service list, total, head/tail entries. */
export interface DockerComposeLogsCompact {
  [key: string]: unknown;
  services: string[];
  total: number;
  head: Array<{ service: string; message: string }>;
  tail: Array<{ service: string; message: string }>;
}

export function compactComposeLogsMap(data: DockerComposeLogs): DockerComposeLogsCompact {
  const HEAD_SIZE = 5;
  const TAIL_SIZE = 5;
  return {
    services: data.services,
    total: data.total,
    head: data.entries.slice(0, HEAD_SIZE).map((e) => ({ service: e.service, message: e.message })),
    tail:
      data.total > HEAD_SIZE + TAIL_SIZE
        ? data.entries.slice(-TAIL_SIZE).map((e) => ({ service: e.service, message: e.message }))
        : [],
  };
}

export function formatComposeLogsCompact(data: DockerComposeLogsCompact): string {
  const parts = [`Compose logs: ${data.services.length} services, ${data.total} entries`];
  for (const e of data.head) {
    parts.push(`  ${e.service} | ${e.message}`);
  }
  if (data.tail.length) {
    parts.push(`  ... ${data.total - data.head.length - data.tail.length} entries omitted ...`);
    for (const e of data.tail) {
      parts.push(`  ${e.service} | ${e.message}`);
    }
  }
  return parts.join("\n");
}
