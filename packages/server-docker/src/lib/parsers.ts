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
} from "../schemas/index.js";

/** Parses `docker ps --format json` output into structured container data with ports and state. */
export function parsePsJson(stdout: string): DockerPs {
  // docker ps --format json returns one JSON object per line
  const lines = stdout.trim().split("\n").filter(Boolean);
  const containers = lines.map((line) => {
    const c = JSON.parse(line);
    return {
      id: c.ID ?? c.Id ?? "",
      name: c.Names ?? c.Name ?? "",
      image: c.Image ?? "",
      status: c.Status ?? "",
      state: (c.State ?? "created").toLowerCase(),
      ports: parsePorts(c.Ports ?? ""),
      created: c.CreatedAt ?? c.RunningFor ?? "",
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

/** Parses `docker logs` output into structured data with container name and log lines. */
export function parseLogsOutput(stdout: string, container: string): DockerLogs {
  const lines = stdout.split("\n").filter(Boolean);
  return {
    container,
    lines,
    total: lines.length,
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
export function parseExecOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DockerExec {
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
