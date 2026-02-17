import type { MakeRunResult, MakeListResult } from "../schemas/index.js";

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: MakeRunResult): string {
  const lines: string[] = [];
  if (data.timedOut) {
    lines.push(
      `${data.tool} ${data.target}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`,
    );
  } else if (data.success) {
    lines.push(`${data.tool} ${data.target}: success (${data.duration}ms).`);
  } else {
    lines.push(`${data.tool} ${data.target}: exit code ${data.exitCode} (${data.duration}ms).`);
  }
  if (data.errorType) {
    lines.push(`errorType: ${data.errorType}`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured list results into a human-readable target listing. */
export function formatList(data: MakeListResult): string {
  if (data.total === 0) return `${data.tool}: no targets found.`;

  const lines = [`${data.tool}: ${data.total} targets`];
  for (const t of data.targets ?? []) {
    const parts: string[] = [`  ${t.name}`];
    if (t.isPhony) parts.push("[phony]");
    if (t.dependencies && t.dependencies.length > 0) {
      parts.push(`-> ${t.dependencies.join(", ")}`);
    }
    if (t.description) parts.push(`# ${t.description}`);
    lines.push(parts.join(" "));
    for (const cmd of t.recipe ?? []) {
      lines.push(`    $ ${cmd}`);
    }
  }

  if ((data.patternRules ?? []).length > 0) {
    lines.push(`pattern rules: ${data.patternRules?.length ?? 0}`);
    for (const r of data.patternRules ?? []) {
      const deps = (r.dependencies ?? []).length > 0 ? ` -> ${r.dependencies?.join(", ")}` : "";
      lines.push(`  ${r.pattern}${deps}`);
      for (const cmd of r.recipe ?? []) {
        lines.push(`    $ ${cmd}`);
      }
    }
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact run: target, exitCode, success, duration, timedOut. Drop stdout/stderr. */
export interface MakeRunCompact {
  [key: string]: unknown;
  target: string;
  success: boolean;
  exitCode: number;
  duration: number;
  tool: "make" | "just";
  timedOut: boolean;
  errorType?: "missing-target" | "recipe-failure" | "parse-error";
}

export function compactRunMap(data: MakeRunResult): MakeRunCompact {
  return {
    target: data.target,
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
    tool: data.tool,
    timedOut: data.timedOut,
    errorType: data.errorType,
  };
}

export function formatRunCompact(data: MakeRunCompact): string {
  if (data.timedOut) {
    return `${data.tool} ${data.target}: TIMED OUT after ${data.duration}ms (exit code ${data.exitCode}).`;
  }
  if (data.success) return `${data.tool} ${data.target}: success (${data.duration}ms).`;
  return `${data.tool} ${data.target}: exit code ${data.exitCode} (${data.duration}ms)${data.errorType ? ` [${data.errorType}]` : ""}.`;
}

/** Compact list: total and tool. Drop individual target details. */
export interface MakeListCompact {
  [key: string]: unknown;
  total: number;
  patternRuleCount: number;
  tool: "make" | "just";
}

export function compactListMap(data: MakeListResult): MakeListCompact {
  return {
    total: data.total,
    patternRuleCount: (data.patternRules ?? []).length,
    tool: data.tool,
  };
}

export function formatListCompact(data: MakeListCompact): string {
  if (data.total === 0) return `${data.tool}: no targets found.`;
  return `${data.tool}: ${data.total} targets (${data.patternRuleCount} pattern rules)`;
}
