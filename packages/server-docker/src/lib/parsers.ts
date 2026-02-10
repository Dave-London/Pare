import type { DockerPs, DockerBuild, DockerLogs, DockerImages } from "../schemas/index.js";

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

export function parseLogsOutput(stdout: string, container: string): DockerLogs {
  const lines = stdout.split("\n").filter(Boolean);
  return {
    container,
    lines,
    total: lines.length,
  };
}

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
