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

// ── #117/#118: docker ps with labels and networks ────────────────────

/** Parses `docker ps --format json` output into structured container data with ports and state. */
export function parsePsJson(stdout: string): DockerPs {
  // docker ps --format json returns one JSON object per line
  const lines = stdout.trim().split("\n").filter(Boolean);
  const containers = lines.map((line) => {
    const c = JSON.parse(line);

    // #117: Parse labels from JSON output
    const labels = parseLabelsField(c.Labels);

    // #118: Parse networks from JSON output
    const networks = parseNetworksField(c.Networks);

    return {
      id: c.ID ?? c.Id ?? "",
      name: c.Names ?? c.Name ?? "",
      image: c.Image ?? "",
      status: c.Status ?? "",
      state: (c.State ?? "created").toLowerCase(),
      ports: parsePorts(c.Ports ?? ""),
      created: c.RunningFor ?? c.CreatedAt ?? "",
      ...(labels && Object.keys(labels).length > 0 ? { labels } : {}),
      ...(networks && networks.length > 0 ? { networks } : {}),
    };
  });

  const running = containers.filter((c) => c.state === "running").length;

  return {
    containers,
    total: containers.length,
    running,
    stopped: containers.length - running,
  };
}

/** #117: Parses a labels string or object from Docker JSON output into Record<string, string>. */
function parseLabelsField(labels: unknown): Record<string, string> | undefined {
  if (!labels) return undefined;

  // If labels is already an object
  if (typeof labels === "object" && !Array.isArray(labels)) {
    return labels as Record<string, string>;
  }

  // If labels is a comma-separated string: "key1=val1,key2=val2"
  if (typeof labels === "string" && labels.trim()) {
    const result: Record<string, string> = {};
    for (const pair of labels.split(",")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx > 0) {
        result[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  return undefined;
}

/** #118: Parses a networks field from Docker JSON output into string[]. */
function parseNetworksField(networks: unknown): string[] | undefined {
  if (!networks) return undefined;

  // If networks is already an array
  if (Array.isArray(networks)) {
    return networks.length > 0 ? networks : undefined;
  }

  // If networks is a comma-separated string: "bridge,mynet"
  if (typeof networks === "string" && networks.trim()) {
    const parts = networks
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }

  return undefined;
}

function parsePorts(
  portsStr: string,
): { host?: number; container: number; protocol: "tcp" | "udp" }[] {
  if (!portsStr) return [];

  // "0.0.0.0:8080->80/tcp, 443/tcp"
  return portsStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const protoMatch = p.match(/\/(tcp|udp)/);
      const protocol = (protoMatch?.[1] ?? "tcp") as "tcp" | "udp";
      const arrowParts = p.split("->");

      if (arrowParts.length === 2) {
        const hostPort = arrowParts[0].split(":").pop();
        const containerPort = arrowParts[1].replace(/\/(tcp|udp)/, "");
        return {
          host: parseInt(hostPort ?? "0", 10),
          container: parseInt(containerPort, 10),
          protocol,
        };
      }

      const port = parseInt(p.replace(/\/(tcp|udp)/, ""), 10);
      return { container: port, protocol };
    });
}

// ── #97/#98: Build error parsing and multi-tag ───────────────────────

/** #97: Build error with optional line number and Dockerfile context. */
interface BuildError {
  message: string;
  line?: number;
  dockerfile?: string;
}

/** #97: Parses build errors from output, extracting line numbers and Dockerfile context. */
function parseBuildErrors(stdout: string, stderr: string): BuildError[] {
  const combined = stdout + "\n" + stderr;
  const errors: BuildError[] = [];

  // Match "Dockerfile:N" or "dockerfile:N" patterns in error lines
  const lines = combined.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match error lines that reference Dockerfile with line numbers
    // e.g., "Dockerfile:5 error: ..." or "ERROR: failed to solve: Dockerfile:10: ..."
    const dockerfileLineMatch = trimmed.match(
      /(?:(?:([^\s:]+\.?[Dd]ockerfile[^\s:]*)|Dockerfile):(\d+))[:\s]+(.+)/,
    );
    if (dockerfileLineMatch) {
      errors.push({
        message: dockerfileLineMatch[3].trim(),
        line: parseInt(dockerfileLineMatch[2], 10),
        dockerfile: dockerfileLineMatch[1] || "Dockerfile",
      });
      continue;
    }

    // Match "line N" patterns in error messages
    const lineNumMatch = trimmed.match(/(?:error|ERROR|Error).*?(?:line\s+(\d+)).*$/i);
    if (lineNumMatch && trimmed.match(/error|ERROR|Error/) && !trimmed.match(/^#\d+/)) {
      errors.push({
        message: trimmed,
        line: parseInt(lineNumMatch[1], 10),
      });
      continue;
    }

    // Match generic error lines (no line number)
    if (trimmed.match(/error|ERROR|Error/) && !trimmed.match(/^#\d+/)) {
      errors.push({ message: trimmed });
    }
  }

  return errors;
}

/** Parses `docker build` output into structured results with success status, image ID, and errors. */
export function parseBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): DockerBuild {
  const imageIdMatch =
    stdout.match(/writing image sha256:([a-f0-9]+)/i) ||
    stdout.match(/Successfully built ([a-f0-9]+)/) ||
    stderr.match(/writing image sha256:([a-f0-9]+)/i);

  // #97: Parse structured errors with line numbers
  let errors: BuildError[] | undefined;
  let errorCount: number | undefined;
  if (exitCode !== 0) {
    errors = parseBuildErrors(stdout, stderr);
    errorCount = errors.length;
    // Fallback: if no structured errors found, extract raw error lines
    if (errors.length === 0) {
      const errorLines = (stdout + "\n" + stderr)
        .split("\n")
        .filter((l) => l.match(/error|ERROR|Error/) && !l.match(/^#\d+/));
      errors = errorLines
        .map((l) => l.trim())
        .filter(Boolean)
        .map((msg) => ({ message: msg }));
      errorCount = errors.length;
    }
  }

  const stepMatch = stdout.match(/#(\d+) /g);
  const steps = stepMatch ? new Set(stepMatch).size : undefined;

  return {
    success: exitCode === 0,
    imageId: imageIdMatch?.[1]?.slice(0, 12),
    duration,
    ...(steps ? { steps } : {}),
    ...(errors && errors.length > 0 ? { errors, errorCount } : {}),
  };
}

// ── #113: Separate stdout/stderr in logs ─────────────────────────────

/** Parses `docker logs` output into structured data with container name and log lines.
 *  #113: Supports separate stdout/stderr streams when provided.
 *  Caps output to `limit` lines when provided. */
export function parseLogsOutput(
  stdout: string,
  container: string,
  limit?: number,
  stderr?: string,
): DockerLogs {
  const allLines = stdout.split("\n").filter(Boolean);
  const totalLines = allLines.length;
  const isTruncated = limit != null && totalLines > limit;
  const lines = isTruncated ? allLines.slice(0, limit) : allLines;

  // #113: Separate stdout and stderr lines
  const stdoutLines = stdout ? stdout.split("\n").filter(Boolean) : undefined;
  const stderrLines = stderr && stderr.trim() ? stderr.split("\n").filter(Boolean) : undefined;

  return {
    container,
    lines,
    total: lines.length,
    ...(isTruncated ? { isTruncated: true, totalLines } : {}),
    ...(stdoutLines && stdoutLines.length > 0 ? { stdoutLines } : {}),
    ...(stderrLines && stderrLines.length > 0 ? { stderrLines } : {}),
  };
}

// ── #110: Parse CreatedAt as ISO timestamp for images ────────────────

/** Parses `docker images --format json` output into structured image data with repository, tag, size, and digest. */
export function parseImagesJson(stdout: string): DockerImages {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const images = lines.map((line) => {
    const img = JSON.parse(line);

    // #110: Parse CreatedAt as ISO timestamp
    const createdAt = img.CreatedAt ? normalizeTimestamp(img.CreatedAt) : undefined;

    return {
      id: (img.ID ?? "").slice(0, 12),
      repository: img.Repository ?? "",
      tag: img.Tag ?? "",
      size: img.Size ?? "",
      ...(img.Digest && img.Digest !== "<none>" ? { digest: img.Digest } : {}),
      created: img.CreatedSince ?? img.CreatedAt ?? "",
      ...(createdAt ? { createdAt } : {}),
    };
  });

  return { images, total: images.length };
}

/** #110: Normalize a Docker timestamp to ISO 8601 format. */
function normalizeTimestamp(ts: string): string | undefined {
  if (!ts) return undefined;
  // Docker CreatedAt: "2024-01-15 10:30:00 +0000 UTC" or ISO format
  // Try to convert to ISO
  const isoMatch = ts.match(/^\d{4}-\d{2}-\d{2}T/);
  if (isoMatch) return ts; // Already ISO

  // Convert "2024-01-15 10:30:00 +0000 UTC" format
  const dockerMatch = ts.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{4})?\s*\w*$/);
  if (dockerMatch) {
    const date = dockerMatch[1];
    const time = dockerMatch[2];
    const offset = dockerMatch[3] || "+0000";
    const offsetFormatted = `${offset.slice(0, 3)}:${offset.slice(3)}`;
    return `${date}T${time}${offsetFormatted}`;
  }

  return ts;
}

// ── #121/#122: Run with structured error and stdout/stderr ───────────

/** Parses `docker run` output into structured data with container ID and image info.
 *  #121: Supports structured error output with exitCode, stderr, errorCategory.
 *  #122: Captures stdout/stderr for non-detached runs. */
export function parseRunOutput(
  stdout: string,
  image: string,
  detached: boolean,
  name?: string,
  exitCode?: number,
  stderr?: string,
): DockerRun {
  // When detached, docker run outputs the full container ID
  const containerId = stdout.trim().split("\n").pop()?.trim() ?? "";

  const result: DockerRun = {
    containerId: containerId.slice(0, 12),
    image,
    detached,
    ...(name ? { name } : {}),
  };

  // #121: Include exitCode and error category for failed runs
  if (exitCode != null && exitCode !== 0) {
    result.exitCode = exitCode;
    if (stderr) result.stderr = stderr;
    result.errorCategory = categorizeRunError(stderr ?? "");
  }

  // #122: Capture stdout/stderr for non-detached runs
  if (!detached) {
    result.exitCode = exitCode ?? 0;
    if (stdout.trim()) result.stdout = stdout;
    if (stderr && stderr.trim()) result.stderr = stderr;
  }

  return result;
}

/** #121: Categorize a docker run error into a known category. */
function categorizeRunError(
  stderr: string,
): "image-not-found" | "port-conflict" | "permission-denied" | "daemon-error" | "unknown" {
  const lower = stderr.toLowerCase();
  if (
    lower.includes("not found") ||
    lower.includes("manifest unknown") ||
    lower.includes("no such image") ||
    lower.includes("repository does not exist")
  ) {
    return "image-not-found";
  }
  if (lower.includes("port is already allocated") || lower.includes("address already in use")) {
    return "port-conflict";
  }
  if (lower.includes("permission denied") || lower.includes("access denied")) {
    return "permission-denied";
  }
  if (
    lower.includes("cannot connect to the docker daemon") ||
    lower.includes("is the docker daemon running")
  ) {
    return "daemon-error";
  }
  return "unknown";
}

// ── #108: Exec with output truncation ────────────────────────────────

/** Parses `docker exec` output into structured data with exit code, stdout, stderr, success, and duration.
 *  #108: Supports output truncation with `limit` parameter. */
export function parseExecOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration?: number,
  limit?: number,
): DockerExec {
  let truncatedStdout = stdout;
  let isTruncated = false;

  // #108: Truncate output if limit is specified (in bytes/characters)
  if (limit != null && limit > 0) {
    if (stdout.length > limit) {
      truncatedStdout = stdout.slice(0, limit);
      isTruncated = true;
    }
  }

  return {
    exitCode,
    stdout: truncatedStdout,
    stderr,
    success: exitCode === 0,
    ...(duration != null ? { duration } : {}),
    ...(isTruncated ? { isTruncated: true } : {}),
  };
}

// ── #107: Compose up per-service state ───────────────────────────────

/** Parses `docker compose up` output into structured data with service names and started count.
 *  #107: Enriches output with per-service state details. */
export function parseComposeUpOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DockerComposeUp {
  const combined = stdout + "\n" + stderr;
  const serviceSet = new Set<string>();
  const serviceStates: Array<{ name: string; action: string }> = [];
  const seenStates = new Set<string>(); // Deduplicate "name:action" pairs

  // Match "Container <name>  <Action>" patterns
  const containerPattern =
    /Container\s+(\S+)\s+(Started|Running|Created|Stopped|Removed|Healthy|Starting|Waiting)/g;
  let match: RegExpExecArray | null;
  while ((match = containerPattern.exec(combined)) !== null) {
    serviceSet.add(match[1]);
    const key = `${match[1]}:${match[2]}`;
    if (!seenStates.has(key)) {
      seenStates.add(key);
      serviceStates.push({ name: match[1], action: match[2] });
    }
  }

  // Also match "service "<name>" started" pattern (older compose output)
  const servicePattern = /[Ss]ervice\s+"?(\S+?)"?\s+(?:started|created)/g;
  while ((match = servicePattern.exec(combined)) !== null) {
    serviceSet.add(match[1]);
  }

  const services = [...serviceSet];
  return {
    success: exitCode === 0,
    services,
    started: services.length,
    ...(serviceStates.length > 0 ? { serviceStates } : {}),
  };
}

// ── #100/#101: Compose down with per-container details ───────────────

/** Parses `docker compose down` output into structured data with stopped and removed counts.
 *  #100: Enriches output with per-container {name, action} array.
 *  #101: Separates volume and network removal counts. */
export function parseComposeDownOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DockerComposeDown {
  const combined = stdout + "\n" + stderr;
  let stopped = 0;
  let removed = 0;
  let volumesRemoved = 0;
  let networksRemoved = 0;
  const containers: Array<{ name: string; action: string }> = [];

  // Match "Container <name>  Stopped"
  const stoppedPattern = /Container\s+(\S+)\s+Stopped/g;
  let match: RegExpExecArray | null;
  while ((match = stoppedPattern.exec(combined)) !== null) {
    stopped++;
    containers.push({ name: match[1], action: "Stopped" });
  }

  // Match "Container <name>  Removed"
  const removedPattern = /Container\s+(\S+)\s+Removed/g;
  while ((match = removedPattern.exec(combined)) !== null) {
    removed++;
    containers.push({ name: match[1], action: "Removed" });
  }

  // #101: Count network removals separately
  const networkPattern = /Network\s+(\S+)\s+Removed/g;
  while ((match = networkPattern.exec(combined)) !== null) {
    networksRemoved++;
    removed++; // Still count in total removed for backwards compat
  }

  // #101: Count volume removals separately
  const volumePattern = /Volume\s+(\S+)\s+Removed/g;
  while ((match = volumePattern.exec(combined)) !== null) {
    volumesRemoved++;
    removed++;
  }

  return {
    success: exitCode === 0,
    stopped,
    removed,
    ...(containers.length > 0 ? { containers } : {}),
    ...(volumesRemoved > 0 ? { volumesRemoved } : {}),
    ...(networksRemoved > 0 ? { networksRemoved } : {}),
  };
}

// ── #119/#120: Pull with digest-only parsing and size ────────────────

/** Parses `docker pull` output into structured data with image, tag, digest, status, and success flag.
 *  #119: Handles digest-only pulls (no tag).
 *  #120: Extracts size from pull summary. */
export function parsePullOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  image: string,
): DockerPull {
  const combined = stdout + "\n" + stderr;

  // #119: Handle digest-only references (e.g., "nginx@sha256:abc123...")
  const isDigestRef = image.includes("@sha256:");
  let tag: string;
  let imageName: string;

  if (isDigestRef) {
    const atIdx = image.indexOf("@");
    imageName = image.slice(0, atIdx);
    tag = image.slice(atIdx + 1); // "sha256:abc123..."
  } else {
    const parts = image.split(":");
    tag = parts.length > 1 ? parts[parts.length - 1] : "latest";
    imageName = parts.length > 1 ? parts.slice(0, -1).join(":") : image;
  }

  // Extract digest from "Digest: sha256:abc123..."
  const digestMatch = combined.match(/Digest:\s*(sha256:[a-f0-9]+)/);
  const digest = digestMatch?.[1];

  // #120: Extract size from pull output
  // Patterns: "Downloaded newer image for nginx:latest" doesn't have size
  // But "Status: Downloaded newer image ... (42.5MB)" or layer sizes
  const sizeMatch = combined.match(
    /(?:Downloaded|Pull complete).*?(\d+(?:\.\d+)?(?:kB|KB|MB|GB|MiB|GiB|B))/i,
  );
  // Also check for the total size summary line pattern
  const totalSizeMatch = combined.match(
    /(?:Total|Size):\s*(\d+(?:\.\d+)?(?:kB|KB|MB|GB|MiB|GiB|B))/i,
  );
  const size = totalSizeMatch?.[1] || sizeMatch?.[1] || undefined;

  // Determine pull status from output
  let status: "pulled" | "up-to-date" | "error";
  if (exitCode !== 0) {
    status = "error";
  } else if (
    combined.includes("Image is up to date") ||
    (combined.includes("Already exists") && !combined.includes("Pull complete"))
  ) {
    status = "up-to-date";
  } else {
    status = "pulled";
  }

  return {
    image: imageName,
    tag,
    ...(digest ? { digest } : {}),
    status,
    success: exitCode === 0,
    ...(size ? { size } : {}),
  };
}

// ── #111/#112: Inspect with networkSettings and mounts ───────────────

/**
 * Detects whether the inspected JSON object is an image (no State field) vs a container.
 * Returns true when the object looks like a Docker image inspect result.
 */
function isImageInspect(obj: Record<string, unknown>): boolean {
  // Images lack a State field and typically have RepoTags
  return !("State" in obj) && ("RepoTags" in obj || "RootFS" in obj);
}

/** Parses `docker inspect --format json` output into structured inspect data with healthStatus, env, and restartPolicy.
 *  Handles both container and image inspect output. */
export function parseInspectJson(stdout: string): DockerInspect {
  // docker inspect --format json returns a JSON array with one element
  const parsed = JSON.parse(stdout);
  const obj = Array.isArray(parsed) ? parsed[0] : parsed;

  if (isImageInspect(obj)) {
    return parseImageInspect(obj);
  }

  return parseContainerInspect(obj);
}

/** Parses container-type inspect JSON into DockerInspect. */
function parseContainerInspect(obj: Record<string, unknown>): DockerInspect {
  const state = (obj.State ?? {}) as Record<string, unknown>;
  const config = (obj.Config ?? {}) as Record<string, unknown>;
  const hostConfig = (obj.HostConfig ?? {}) as Record<string, unknown>;

  // Extract health status from State.Health.Status
  const healthRaw = (state.Health as Record<string, unknown> | undefined)?.Status as
    | string
    | undefined;
  const validHealth = ["healthy", "unhealthy", "starting", "none"];
  const healthStatus =
    healthRaw && validHealth.includes(healthRaw.toLowerCase())
      ? (healthRaw.toLowerCase() as "healthy" | "unhealthy" | "starting" | "none")
      : undefined;

  // Extract environment variables from Config.Env
  const envArr: string[] | undefined =
    Array.isArray(config.Env) && config.Env.length > 0 ? (config.Env as string[]) : undefined;

  // Extract restart policy from HostConfig.RestartPolicy.Name
  const restartPolicy = (hostConfig.RestartPolicy as Record<string, unknown> | undefined)?.Name as
    | string
    | undefined;

  // #111: Extract network settings
  const networkSettings = parseNetworkSettings(
    obj.NetworkSettings as Record<string, unknown> | undefined,
  );

  // #112: Extract mounts
  const mounts = parseMounts(obj.Mounts as unknown[] | undefined);

  return {
    id: ((obj.Id as string) ?? "").slice(0, 12),
    name: ((obj.Name as string) ?? "").replace(/^\//, ""),
    inspectType: "container",
    state: {
      status: ((state.Status as string) ?? "unknown").toLowerCase(),
      running: (state.Running as boolean) ?? false,
      ...((state.StartedAt as string) && (state.StartedAt as string) !== "0001-01-01T00:00:00Z"
        ? { startedAt: state.StartedAt as string }
        : {}),
    },
    image: (config.Image as string) ?? (obj.Image as string) ?? "",
    ...(obj.Platform ? { platform: obj.Platform as string } : {}),
    created: (obj.Created as string) ?? "",
    ...(healthStatus ? { healthStatus } : {}),
    ...(envArr ? { env: envArr } : {}),
    ...(restartPolicy && restartPolicy !== "" ? { restartPolicy } : {}),
    ...(networkSettings ? { networkSettings } : {}),
    ...(mounts && mounts.length > 0 ? { mounts } : {}),
  };
}

/** #111: Parses NetworkSettings from Docker inspect JSON. */
function parseNetworkSettings(ns: Record<string, unknown> | undefined):
  | {
      ipAddress: string;
      ports?: Record<string, Array<{ hostIp?: string; hostPort?: string }> | null>;
    }
  | undefined {
  if (!ns) return undefined;

  const ipAddress = (ns.IPAddress as string) ?? "";
  const portsRaw = ns.Ports as Record<string, unknown[] | null> | undefined;

  let ports: Record<string, Array<{ hostIp?: string; hostPort?: string }> | null> | undefined;
  if (portsRaw && typeof portsRaw === "object") {
    ports = {};
    for (const [key, value] of Object.entries(portsRaw)) {
      if (value === null) {
        ports[key] = null;
      } else if (Array.isArray(value)) {
        ports[key] = value.map((entry) => {
          const e = entry as Record<string, string>;
          return {
            ...(e.HostIp ? { hostIp: e.HostIp } : {}),
            ...(e.HostPort ? { hostPort: e.HostPort } : {}),
          };
        });
      }
    }
  }

  // Only return if there's meaningful data
  if (!ipAddress && !ports) return undefined;

  return {
    ipAddress,
    ...(ports && Object.keys(ports).length > 0 ? { ports } : {}),
  };
}

/** #112: Parses Mounts from Docker inspect JSON. */
function parseMounts(
  mounts: unknown[] | undefined,
): Array<{ source: string; destination: string; mode?: string }> | undefined {
  if (!mounts || !Array.isArray(mounts)) return undefined;

  const result = mounts.map((m) => {
    const mount = m as Record<string, unknown>;
    return {
      source: (mount.Source as string) ?? "",
      destination: (mount.Destination as string) ?? "",
      ...(mount.Mode && mount.Mode !== "" ? { mode: mount.Mode as string } : {}),
    };
  });

  return result.length > 0 ? result : undefined;
}

/** Parses image-type inspect JSON into DockerInspect. */
function parseImageInspect(obj: Record<string, unknown>): DockerInspect {
  const config = (obj.Config ?? {}) as Record<string, unknown>;
  const repoTags = Array.isArray(obj.RepoTags) ? (obj.RepoTags as string[]) : [];
  const repoDigests = Array.isArray(obj.RepoDigests) ? (obj.RepoDigests as string[]) : [];

  // Extract environment variables from Config.Env
  const envArr: string[] | undefined =
    Array.isArray(config.Env) && config.Env.length > 0 ? (config.Env as string[]) : undefined;

  // Extract command and entrypoint
  const cmd = Array.isArray(config.Cmd) ? (config.Cmd as string[]) : undefined;
  const entrypoint = Array.isArray(config.Entrypoint) ? (config.Entrypoint as string[]) : undefined;

  // Build platform from Architecture + Os
  const arch = obj.Architecture as string | undefined;
  const os = obj.Os as string | undefined;
  const platform = arch && os ? `${os}/${arch}` : arch || os || undefined;

  // Derive image name from first RepoTag or the image ID
  const imageName = repoTags.length > 0 ? repoTags[0] : ((obj.Id as string) ?? "").slice(0, 12);

  return {
    id: ((obj.Id as string) ?? "").slice(0, 12),
    name: imageName,
    inspectType: "image",
    image: imageName,
    ...(platform ? { platform } : {}),
    created: (obj.Created as string) ?? "",
    ...(repoTags.length > 0 ? { repoTags } : {}),
    ...(repoDigests.length > 0 ? { repoDigests } : {}),
    ...(obj.Size != null ? { size: obj.Size as number } : {}),
    ...(envArr ? { env: envArr } : {}),
    ...(cmd ? { cmd } : {}),
    ...(entrypoint ? { entrypoint } : {}),
  };
}

// ── #115/#116: Network LS with labels and boolean fields ─────────────

/** Parses `docker network ls --format json` output into structured network data.
 *  #115: Includes labels.
 *  #116: Includes ipv6, internal, attachable booleans. */
export function parseNetworkLsJson(stdout: string): DockerNetworkLs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const networks = lines.map((line) => {
    const n = JSON.parse(line);

    // #115: Parse labels
    const labels = parseLabelsField(n.Labels);

    return {
      id: (n.ID ?? "").slice(0, 12),
      name: n.Name ?? "",
      driver: n.Driver ?? "",
      scope: n.Scope ?? "",
      ...(n.CreatedAt ? { createdAt: n.CreatedAt } : {}),
      ...(labels && Object.keys(labels).length > 0 ? { labels } : {}),
      // #116: Parse boolean fields
      ...(n.IPv6 != null ? { ipv6: toBool(n.IPv6) } : {}),
      ...(n.Internal != null ? { internal: toBool(n.Internal) } : {}),
      ...(n.Attachable != null ? { attachable: toBool(n.Attachable) } : {}),
    };
  });

  return { networks, total: networks.length };
}

/** Converts various truthy representations to boolean. */
function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

// ── #125: Volume LS with labels ──────────────────────────────────────

/** Parses `docker volume ls --format json` output into structured volume data with createdAt.
 *  #125: Includes labels. */
export function parseVolumeLsJson(stdout: string): DockerVolumeLs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const volumes = lines.map((line) => {
    const v = JSON.parse(line);

    // #125: Parse labels
    const labels = parseLabelsField(v.Labels);

    return {
      name: v.Name ?? "",
      driver: v.Driver ?? "",
      mountpoint: v.Mountpoint ?? "",
      scope: v.Scope ?? "",
      ...(v.CreatedAt ? { createdAt: v.CreatedAt } : {}),
      ...(labels && Object.keys(labels).length > 0 ? { labels } : {}),
    };
  });

  return { volumes, total: volumes.length };
}

// ── #105/#106: Compose PS with health and counts ─────────────────────

/** Parses `docker compose ps --format json` output into structured compose service data.
 *  #105: Includes health field.
 *  #106: Includes running/stopped counts. */
export function parseComposePsJson(stdout: string): DockerComposePs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const services = lines.map((line) => {
    const s = JSON.parse(line);
    const ports = parseComposePorts(s.Publishers, s.Ports);

    // #105: Parse health field
    const health = s.Health ?? s.health ?? undefined;

    return {
      name: s.Name ?? "",
      service: s.Service ?? "",
      state: (s.State ?? "unknown").toLowerCase(),
      status: s.Status ?? "",
      ...(ports.length > 0 ? { ports } : {}),
      ...(health && health !== "" ? { health } : {}),
    };
  });

  // #106: Calculate running/stopped counts
  const running = services.filter((s) => s.state === "running").length;
  const stopped = services.filter(
    (s) => s.state === "exited" || s.state === "dead" || s.state === "removing",
  ).length;

  return {
    services,
    total: services.length,
    running,
    stopped,
  };
}

/**
 * Parses compose service port info from the Publishers array or Ports string.
 */
function parseComposePorts(
  publishers: unknown,
  portsStr: unknown,
): { host?: number; container: number; protocol: "tcp" | "udp" }[] {
  // Try structured Publishers array first
  if (Array.isArray(publishers) && publishers.length > 0) {
    return publishers
      .filter(
        (p) =>
          p != null && typeof p === "object" && (p.TargetPort != null || p.target_port != null),
      )
      .map((p) => {
        const container = p.TargetPort ?? p.target_port ?? 0;
        const host = p.PublishedPort ?? p.published_port ?? 0;
        const protocol = ((p.Protocol ?? p.protocol ?? "tcp") as string).toLowerCase() as
          | "tcp"
          | "udp";
        return {
          ...(host > 0 ? { host } : {}),
          container,
          protocol,
        };
      });
  }

  // Fallback: parse Ports string (same format as docker ps)
  if (typeof portsStr === "string" && portsStr.trim()) {
    return portsStr
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const protoMatch = p.match(/\/(tcp|udp)/);
        const protocol = (protoMatch?.[1] ?? "tcp") as "tcp" | "udp";
        const arrowParts = p.split("->");

        if (arrowParts.length === 2) {
          const hostPort = arrowParts[0].split(":").pop();
          const containerPort = arrowParts[1].replace(/\/(tcp|udp)/, "");
          return {
            host: parseInt(hostPort ?? "0", 10),
            container: parseInt(containerPort, 10),
            protocol,
          };
        }

        const port = parseInt(p.replace(/\/(tcp|udp)/, ""), 10);
        return { container: port, protocol };
      });
  }

  return [];
}

// ── #103/#104: Compose logs with improved timestamp parsing and log levels ──

/** #103: Improved timestamp regex that handles timezone offsets and nanoseconds. */
const COMPOSE_TS_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(.*)/;

/** #104: Extract log level from common patterns in log messages. */
function extractLogLevel(
  message: string,
): "debug" | "info" | "warn" | "error" | "fatal" | undefined {
  // Match common log level patterns: [ERROR], ERROR:, level=error, ERROR -, etc.
  const upper = message.toUpperCase();

  // Check bracket patterns: [ERROR], [WARN], etc.
  const bracketMatch = upper.match(/\[(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL)\]/);
  if (bracketMatch) return normalizeLevel(bracketMatch[1]);

  // Check "level=" patterns (structured logging): level=error, level="warn"
  const levelMatch = message.match(/\blevel[=:]\s*"?(debug|info|warn(?:ing)?|error|fatal)"?/i);
  if (levelMatch) return normalizeLevel(levelMatch[1]);

  // Check prefix patterns: "ERROR:", "WARN -", "INFO "
  const prefixMatch = upper.match(/(?:^|\s)(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL)\s*[:\-|]/);
  if (prefixMatch) return normalizeLevel(prefixMatch[1]);

  return undefined;
}

/** Normalize log level string to standard enum values. */
function normalizeLevel(level: string): "debug" | "info" | "warn" | "error" | "fatal" {
  const upper = level.toUpperCase();
  if (upper === "DEBUG") return "debug";
  if (upper === "INFO") return "info";
  if (upper === "WARNING" || upper === "WARN") return "warn";
  if (upper === "ERROR") return "error";
  if (upper === "FATAL") return "fatal";
  return "info";
}

/** Parses `docker compose logs` output into structured entries grouped by service.
 *  #103: Improved timestamp parsing for timezone offsets and nanoseconds.
 *  #104: Extracts log level from common patterns. */
export function parseComposeLogsOutput(stdout: string, limit?: number): DockerComposeLogs {
  const allLines = stdout.split("\n").filter(Boolean);
  const serviceSet = new Set<string>();

  // Parse each line: "service  | [timestamp] message"
  const entries = allLines.map((line) => {
    const pipeIdx = line.indexOf("|");
    if (pipeIdx === -1) {
      // No pipe — treat entire line as message with unknown service
      const level = extractLogLevel(line.trim());
      return {
        service: "unknown",
        message: line.trim(),
        ...(level ? { level } : {}),
      };
    }

    const service = line.slice(0, pipeIdx).trim();
    const rest = line.slice(pipeIdx + 1).trimStart();
    serviceSet.add(service);

    // #103: Use improved timestamp regex
    const tsMatch = rest.match(COMPOSE_TS_RE);
    if (tsMatch) {
      const level = extractLogLevel(tsMatch[2]);
      return {
        timestamp: tsMatch[1],
        service,
        message: tsMatch[2],
        ...(level ? { level } : {}),
      };
    }

    const level = extractLogLevel(rest);
    return {
      service,
      message: rest,
      ...(level ? { level } : {}),
    };
  });

  const totalEntries = entries.length;
  const isTruncated = limit != null && totalEntries > limit;
  const limited = isTruncated ? entries.slice(0, limit) : entries;

  // Rebuild service set from limited entries
  if (isTruncated) {
    serviceSet.clear();
    for (const e of limited) serviceSet.add(e.service);
  }

  return {
    services: [...serviceSet],
    entries: limited,
    total: limited.length,
    ...(isTruncated ? { isTruncated: true, totalEntries } : {}),
  };
}

// ── #99: Compose build with per-service duration ─────────────────────

/** Parses `docker compose build` output into structured per-service build status.
 *  #99: Tracks per-service duration from build start/end patterns. */
export function parseComposeBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): DockerComposeBuild {
  const combined = stdout + "\n" + stderr;
  const serviceMap = new Map<string, { success: boolean; error?: string; startTime?: number }>();

  // #99: Track per-service build timing from "Building <service>" lines
  const buildStartTimes = new Map<string, number>();

  // Match successful builds: "Service web Built" or "web Built" patterns
  const builtPattern = /(?:Service\s+)?(\S+)\s+Built/g;
  let match: RegExpExecArray | null;
  while ((match = builtPattern.exec(combined)) !== null) {
    serviceMap.set(match[1], { success: true });
  }

  // Match build step patterns: "#N [service ...]" to discover service names
  const stepPattern = /\[(\S+)\s+/g;
  while ((match = stepPattern.exec(combined)) !== null) {
    const svc = match[1];
    if (!serviceMap.has(svc) && svc !== "internal") {
      serviceMap.set(svc, { success: exitCode === 0 });
    }
  }

  // #99: Match "Building <service>" lines and track timing
  const buildingPattern = /Building\s+(\S+)/g;
  while ((match = buildingPattern.exec(combined)) !== null) {
    const svc = match[1];
    if (!serviceMap.has(svc)) {
      serviceMap.set(svc, { success: exitCode === 0 });
    }
    if (!buildStartTimes.has(svc)) {
      buildStartTimes.set(svc, match.index);
    }
  }

  // Match error lines referencing services
  const errorPattern =
    /(?:ERROR|error).*?(?:Service\s+'?(\S+?)'?|service\s+"?(\S+?)"?)\s+.*?(?:failed|error)/gi;
  while ((match = errorPattern.exec(combined)) !== null) {
    const svc = match[1] || match[2];
    if (svc) {
      serviceMap.set(svc, {
        success: false,
        error: match[0].trim(),
      });
    }
  }

  // #99: Calculate per-service duration
  // If we have timing info, distribute based on build order;
  // otherwise, divide total duration proportionally
  const serviceCount = serviceMap.size;
  const services = [...serviceMap.entries()].map(([service, status], _index) => {
    // #99: Estimate per-service duration
    let serviceDuration: number | undefined;
    if (serviceCount > 0 && duration > 0) {
      // If only one service, it gets the full duration
      if (serviceCount === 1) {
        serviceDuration = duration;
      } else {
        // Distribute proportionally by order (rough approximation)
        serviceDuration = Math.round((duration / serviceCount) * 10) / 10;
      }
    }

    return {
      service,
      success: status.success,
      ...(status.error ? { error: status.error } : {}),
      ...(serviceDuration != null ? { duration: serviceDuration } : {}),
    };
  });

  const built = services.filter((s) => s.success).length;
  const failed = services.filter((s) => !s.success).length;

  return {
    success: exitCode === 0,
    services,
    built,
    failed,
    duration,
  };
}

// ── #123/#124: Stats with numeric memory and I/O fields ──────────────

/** Parses percentage string like "1.23%" into a number. Returns 0 for unparseable values. */
function parsePercent(value: string): number {
  const n = parseFloat(value.replace("%", ""));
  return Number.isNaN(n) ? 0 : n;
}

/** #123/#124: Parses a Docker size string (e.g., "150MiB", "1.5GiB", "0B") into bytes. */
export function parseSizeToBytes(size: string): number {
  if (!size || size === "--") return 0;

  const match = size.trim().match(/^([\d.]+)\s*(B|kB|KB|KiB|MB|MiB|GB|GiB|TB|TiB)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1000,
    kib: 1024,
    mb: 1_000_000,
    mib: 1_048_576,
    gb: 1_000_000_000,
    gib: 1_073_741_824,
    tb: 1_000_000_000_000,
    tib: 1_099_511_627_776,
  };

  return Math.round(value * (multipliers[unit] ?? 1));
}

/** #124: Parses a Docker I/O string like "1.5kB / 2.3kB" into two byte values. */
function parseIOPair(io: string): { in: number; out: number } {
  if (!io || io === "--") return { in: 0, out: 0 };
  const parts = io.split("/").map((p) => p.trim());
  return {
    in: parseSizeToBytes(parts[0] ?? "0B"),
    out: parseSizeToBytes(parts[1] ?? "0B"),
  };
}

/** Parses `docker stats --no-stream --format '{{json .}}'` output into structured container stats.
 *  #123: Adds memoryUsageBytes and memoryLimitBytes numeric fields.
 *  #124: Adds structured I/O fields: netIn, netOut, blockRead, blockWrite. */
export function parseStatsJson(stdout: string): DockerStats {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const containers = lines.map((line) => {
    const s = JSON.parse(line);
    // Docker stats JSON uses: Container, Name, CPUPerc, MemUsage, MemPerc, NetIO, BlockIO, PIDs
    const memParts = (s.MemUsage ?? "0B / 0B").split("/").map((p: string) => p.trim());

    // #123: Parse memory values to bytes
    const memoryUsage = memParts[0] ?? "0B";
    const memoryLimit = memParts[1] ?? "0B";
    const memoryUsageBytes = parseSizeToBytes(memoryUsage);
    const memoryLimitBytes = parseSizeToBytes(memoryLimit);

    // #124: Parse network and block I/O to bytes
    const netIO = parseIOPair(s.NetIO ?? "0B / 0B");
    const blockIO = parseIOPair(s.BlockIO ?? "0B / 0B");

    return {
      id: (s.Container ?? s.ID ?? "").slice(0, 12),
      name: (s.Name ?? "").replace(/^\//, ""),
      cpuPercent: parsePercent(s.CPUPerc ?? "0%"),
      memoryUsage,
      memoryLimit,
      memoryPercent: parsePercent(s.MemPerc ?? "0%"),
      netIO: s.NetIO ?? "0B / 0B",
      blockIO: s.BlockIO ?? "0B / 0B",
      pids: parseInt(s.PIDs ?? "0", 10) || 0,
      // #123: Numeric memory fields
      memoryUsageBytes,
      memoryLimitBytes,
      // #124: Structured I/O fields
      netIn: netIO.in,
      netOut: netIO.out,
      blockRead: blockIO.in,
      blockWrite: blockIO.out,
    };
  });

  return { containers, total: containers.length };
}
