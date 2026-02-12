import type { MakeRunResult, MakeListResult } from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: MakeRunResult): string {
  const lines: string[] = [];
  if (data.success) {
    lines.push(`${data.tool} ${data.target}: success (${data.duration}ms).`);
  } else {
    lines.push(`${data.tool} ${data.target}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured list results into a human-readable target listing. */
export function formatList(data: MakeListResult): string {
  if (data.total === 0) return `${data.tool}: no targets found.`;

  const lines = [`${data.tool}: ${data.total} targets`];
  for (const t of data.targets) {
    const desc = t.description ? ` # ${t.description}` : "";
    lines.push(`  ${t.name}${desc}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact run: target, exitCode, success, duration. Drop stdout/stderr. */
export interface MakeRunCompact {
  [key: string]: unknown;
  target: string;
  success: boolean;
  exitCode: number;
  duration: number;
  tool: "make" | "just";
}

export function compactRunMap(data: MakeRunResult): MakeRunCompact {
  return {
    target: data.target,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    tool: data.tool,
  };
}

export function formatRunCompact(data: MakeRunCompact): string {
  if (data.success) return `${data.tool} ${data.target}: success (${data.duration}ms).`;
  return `${data.tool} ${data.target}: exit code ${data.exitCode} (${data.duration}ms).`;
}

/** Compact list: total and tool. Drop individual target details. */
export interface MakeListCompact {
  [key: string]: unknown;
  total: number;
  tool: "make" | "just";
}

export function compactListMap(data: MakeListResult): MakeListCompact {
  return {
    total: data.total,
    tool: data.tool,
  };
}

export function formatListCompact(data: MakeListCompact): string {
  if (data.total === 0) return `${data.tool}: no targets found.`;
  return `${data.tool}: ${data.total} targets`;
}
