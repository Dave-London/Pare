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
  return `${data.container} (${data.total} lines)\n${data.lines.join("\n")}`;
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
