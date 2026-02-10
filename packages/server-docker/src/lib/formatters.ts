import type { DockerPs, DockerBuild, DockerLogs, DockerImages } from "../schemas/index.js";

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

export function formatLogs(data: DockerLogs): string {
  return `${data.container} (${data.total} lines)\n${data.lines.join("\n")}`;
}

export function formatImages(data: DockerImages): string {
  if (data.total === 0) return "No images found.";

  const lines = [`${data.total} images:`];
  for (const img of data.images) {
    const tag = img.tag && img.tag !== "<none>" ? `:${img.tag}` : "";
    lines.push(`  ${img.repository}${tag} (${img.size}, ${img.created})`);
  }
  return lines.join("\n");
}
