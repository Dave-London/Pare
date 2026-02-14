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
} from "../schemas/index.js";

/** Parses `docker ps --format json` output into structured container data with ports and state. */
export function parsePsJson(stdout: string): DockerPs {
  // docker ps --format json returns one JSON object per line
  const lines = stdout.trim().split("\n").filter(Boolean);
  const containers = lines.map((line) => {
    const c = JSON.parse(line);
    return {
      id: (c.ID ?? c.Id ?? "").slice(0, 12),
      name: c.Names ?? c.Name ?? "",
      image: c.Image ?? "",
      status: c.Status ?? "",
      state: (c.State ?? "created").toLowerCase(),
      ports: parsePorts(c.Ports ?? ""),
      created: c.RunningFor ?? c.CreatedAt ?? "",
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

/** Parses `docker build` output into structured results with success status, image ID, and errors. */
export function parseBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): DockerBuild {
  const errors: string[] = [];
  const imageIdMatch =
    stdout.match(/writing image sha256:([a-f0-9]+)/i) ||
    stdout.match(/Successfully built ([a-f0-9]+)/) ||
    stderr.match(/writing image sha256:([a-f0-9]+)/i);

  if (exitCode !== 0) {
    const errorLines = (stdout + "\n" + stderr)
      .split("\n")
      .filter((l) => l.match(/error|ERROR|Error/) && !l.match(/^#\d+/));
    errors.push(...errorLines.map((l) => l.trim()).filter(Boolean));
  }

  const stepMatch = stdout.match(/#(\d+) /g);
  const steps = stepMatch ? new Set(stepMatch).size : undefined;

  return {
    success: exitCode === 0,
    imageId: imageIdMatch?.[1]?.slice(0, 12),
    duration,
    ...(steps ? { steps } : {}),
    errors,
  };
}

/** Parses `docker logs` output into structured data with container name and log lines. Caps output to `limit` lines when provided. */
export function parseLogsOutput(stdout: string, container: string, limit?: number): DockerLogs {
  const allLines = stdout.split("\n").filter(Boolean);
  const totalLines = allLines.length;
  const isTruncated = limit != null && totalLines > limit;
  const lines = isTruncated ? allLines.slice(0, limit) : allLines;
  return {
    container,
    lines,
    total: lines.length,
    ...(isTruncated ? { isTruncated: true, totalLines } : {}),
  };
}

/** Parses `docker images --format json` output into structured image data with repository, tag, and size. */
export function parseImagesJson(stdout: string): DockerImages {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const images = lines.map((line) => {
    const img = JSON.parse(line);
    return {
      id: (img.ID ?? "").slice(0, 12),
      repository: img.Repository ?? "",
      tag: img.Tag ?? "",
      size: img.Size ?? "",
      created: img.CreatedSince ?? img.CreatedAt ?? "",
    };
  });

  return { images, total: images.length };
}

/** Parses `docker run` output into structured data with container ID and image info. */
export function parseRunOutput(
  stdout: string,
  image: string,
  detached: boolean,
  name?: string,
): DockerRun {
  // When detached, docker run outputs the full container ID
  const containerId = stdout.trim().split("\n").pop()?.trim() ?? "";
  return {
    containerId: containerId.slice(0, 12),
    image,
    detached,
    ...(name ? { name } : {}),
  };
}

/** Parses `docker exec` output into structured data with exit code, stdout, stderr, and success. */
export function parseExecOutput(stdout: string, stderr: string, exitCode: number): DockerExec {
  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
  };
}

/** Parses `docker compose up` output into structured data with service names and started count. */
export function parseComposeUpOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DockerComposeUp {
  // Compose v2 outputs to stderr; service names appear in lines like:
  //  ✔ Container myapp-web-1  Started
  //  ✔ Container myapp-db-1   Started
  // Or: Container myapp-web-1  Creating / Created / Starting / Started
  const combined = stdout + "\n" + stderr;
  const serviceSet = new Set<string>();

  // Match "Container <name>  Started" or "Container <name>  Running"
  const startedPattern = /Container\s+(\S+)\s+(?:Started|Running|Created)/g;
  let match: RegExpExecArray | null;
  while ((match = startedPattern.exec(combined)) !== null) {
    serviceSet.add(match[1]);
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
  };
}

/** Parses `docker compose down` output into structured data with stopped and removed counts. */
export function parseComposeDownOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DockerComposeDown {
  const combined = stdout + "\n" + stderr;
  let stopped = 0;
  let removed = 0;

  // Match "Container <name>  Stopped"
  const stoppedPattern = /Container\s+\S+\s+Stopped/g;
  while (stoppedPattern.exec(combined) !== null) {
    stopped++;
  }

  // Match "Container <name>  Removed"
  const removedPattern = /Container\s+\S+\s+Removed/g;
  while (removedPattern.exec(combined) !== null) {
    removed++;
  }

  // Also count network/volume removals as part of removed
  const networkPattern = /Network\s+\S+\s+Removed/g;
  while (networkPattern.exec(combined) !== null) {
    removed++;
  }

  return {
    success: exitCode === 0,
    stopped,
    removed,
  };
}

/** Parses `docker pull` output into structured data with image, tag, digest, and success flag. */
export function parsePullOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  image: string,
): DockerPull {
  const combined = stdout + "\n" + stderr;

  // Extract tag from image string (e.g., "nginx:latest" -> "latest", "nginx" -> "latest")
  const parts = image.split(":");
  const tag = parts.length > 1 ? parts[parts.length - 1] : "latest";
  const imageName = parts.length > 1 ? parts.slice(0, -1).join(":") : image;

  // Extract digest from "Digest: sha256:abc123..."
  const digestMatch = combined.match(/Digest:\s*(sha256:[a-f0-9]+)/);
  const digest = digestMatch?.[1];

  return {
    image: imageName,
    tag,
    ...(digest ? { digest } : {}),
    success: exitCode === 0,
  };
}

/** Parses `docker inspect --format json` output into structured inspect data. */
export function parseInspectJson(stdout: string): DockerInspect {
  // docker inspect --format json returns a JSON array with one element
  const parsed = JSON.parse(stdout);
  const obj = Array.isArray(parsed) ? parsed[0] : parsed;

  const state = obj.State ?? {};
  const config = obj.Config ?? {};

  return {
    id: (obj.Id ?? "").slice(0, 12),
    name: (obj.Name ?? "").replace(/^\//, ""),
    state: {
      status: (state.Status ?? "unknown").toLowerCase(),
      running: state.Running ?? false,
      ...(state.StartedAt && state.StartedAt !== "0001-01-01T00:00:00Z"
        ? { startedAt: state.StartedAt }
        : {}),
    },
    image: config.Image ?? obj.Image ?? "",
    ...(obj.Platform ? { platform: obj.Platform } : {}),
    created: obj.Created ?? "",
  };
}

/** Parses `docker network ls --format json` output into structured network data. */
export function parseNetworkLsJson(stdout: string): DockerNetworkLs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const networks = lines.map((line) => {
    const n = JSON.parse(line);
    return {
      id: (n.ID ?? "").slice(0, 12),
      name: n.Name ?? "",
      driver: n.Driver ?? "",
      scope: n.Scope ?? "",
    };
  });

  return { networks, total: networks.length };
}

/** Parses `docker volume ls --format json` output into structured volume data. */
export function parseVolumeLsJson(stdout: string): DockerVolumeLs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const volumes = lines.map((line) => {
    const v = JSON.parse(line);
    return {
      name: v.Name ?? "",
      driver: v.Driver ?? "",
      mountpoint: v.Mountpoint ?? "",
      scope: v.Scope ?? "",
    };
  });

  return { volumes, total: volumes.length };
}

/** Parses `docker compose build` output into structured per-service build status. */
export function parseComposeBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): DockerComposeBuild {
  const combined = stdout + "\n" + stderr;
  const serviceMap = new Map<string, { success: boolean; error?: string }>();

  // Match successful builds: "Service web Built" or "web Built" patterns
  // Compose v2 outputs lines like: " ✔ Service web Built" or just "web Built"
  const builtPattern = /(?:Service\s+)?(\S+)\s+Built/g;
  let match: RegExpExecArray | null;
  while ((match = builtPattern.exec(combined)) !== null) {
    serviceMap.set(match[1], { success: true });
  }

  // Match build step patterns: "#N [service ...]" to discover service names
  const stepPattern = /\[(\S+)\s+/g;
  while ((match = stepPattern.exec(combined)) !== null) {
    const svc = match[1];
    // Only add if not already tracked (don't overwrite success)
    if (!serviceMap.has(svc) && svc !== "internal") {
      serviceMap.set(svc, { success: exitCode === 0 });
    }
  }

  // Match "Building <service>" lines (compose v2 progress output)
  const buildingPattern = /Building\s+(\S+)/g;
  while ((match = buildingPattern.exec(combined)) !== null) {
    const svc = match[1];
    if (!serviceMap.has(svc)) {
      serviceMap.set(svc, { success: exitCode === 0 });
    }
  }

  // Match error lines referencing services: "failed to solve: ..." or "ERROR: Service 'web' failed to build"
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

  // If no services were detected but there's output and success, try to infer
  // If the build failed and no services found, create a generic entry from error
  if (serviceMap.size === 0 && exitCode !== 0) {
    const errorLines = combined
      .split("\n")
      .filter((l) => l.match(/error|ERROR|failed/i))
      .map((l) => l.trim())
      .filter(Boolean);
    if (errorLines.length > 0) {
      // Cannot determine service name — leave services empty
    }
  }

  const services = [...serviceMap.entries()].map(([service, status]) => ({
    service,
    success: status.success,
    ...(status.error ? { error: status.error } : {}),
  }));

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

/** Parses `docker compose ps --format json` output into structured compose service data. */
export function parseComposePsJson(stdout: string): DockerComposePs {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const services = lines.map((line) => {
    const s = JSON.parse(line);
    const ports = s.Ports ?? s.Publishers ?? "";
    const portsStr = typeof ports === "string" ? ports : "";
    return {
      name: s.Name ?? "",
      service: s.Service ?? "",
      state: (s.State ?? "unknown").toLowerCase(),
      status: s.Status ?? "",
      ...(portsStr ? { ports: portsStr } : {}),
    };
  });

  return { services, total: services.length };
}

/** Parses `docker compose logs` output into structured entries grouped by service.
 *
 * Compose logs format: `service-name  | [timestamp] message`
 * or with --timestamps: `service-name  | 2024-01-01T00:00:00.000000000Z message`
 */
export function parseComposeLogsOutput(stdout: string, limit?: number): DockerComposeLogs {
  const allLines = stdout.split("\n").filter(Boolean);
  const serviceSet = new Set<string>();

  // Parse each line: "service  | [timestamp] message"
  // The pipe separator may have varying whitespace
  const entries = allLines.map((line) => {
    const pipeIdx = line.indexOf("|");
    if (pipeIdx === -1) {
      // No pipe — treat entire line as message with unknown service
      return { service: "unknown", message: line.trim() };
    }

    const service = line.slice(0, pipeIdx).trim();
    const rest = line.slice(pipeIdx + 1).trimStart();
    serviceSet.add(service);

    // Try to extract an ISO timestamp at the beginning
    const tsMatch = rest.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s+(.*)/);
    if (tsMatch) {
      return { timestamp: tsMatch[1], service, message: tsMatch[2] };
    }

    return { service, message: rest };
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
