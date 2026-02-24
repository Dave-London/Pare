import type {
  MakeRunResult,
  MakeRunResultInternal,
  MakeListResult,
  MakeListResultInternal,
} from "../schemas/index.js";

// ── Schema maps (strip Internal-only fields for structuredContent) ──

/** Strips Internal-only fields from make run result for structuredContent. */
export function schemaRunMap(data: MakeRunResultInternal): MakeRunResult {
  return {
    success: data.success,
    exitCode: data.exitCode,
    stdout: data.stdout,
    stderr: data.stderr,
    timedOut: data.timedOut,
  };
}

/** Strips Internal-only fields from make list result for structuredContent. */
export function schemaListMap(data: MakeListResultInternal): MakeListResult {
  return {
    targets: data.targets?.map((t) => ({
      name: t.name,
      description: t.description,
      dependencies: t.dependencies,
    })),
    patternRules: data.patternRules,
  };
}

// ── Full formatters ──────────────────────────────────────────────────

/** Formats structured run results into a human-readable output summary. */
export function formatRun(data: MakeRunResultInternal): string {
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
export function formatList(data: MakeListResultInternal): string {
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

/** Compact run: schema-compatible fields only. Drop stdout/stderr and Internal fields. */
export interface MakeRunCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  timedOut: boolean;
}

export function compactRunMap(data: MakeRunResultInternal): MakeRunCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    timedOut: data.timedOut,
  };
}

export function formatRunCompact(data: MakeRunCompact): string {
  if (data.timedOut) {
    return `make/just: TIMED OUT (exit code ${data.exitCode}).`;
  }
  if (data.success) return `make/just: success.`;
  return `make/just: exit code ${data.exitCode}.`;
}

/** Compact list: schema-compatible fields only. Drop target details and Internal fields. */
export interface MakeListCompact {
  [key: string]: unknown;
  patternRules?: MakeListResultInternal["patternRules"];
}

export function compactListMap(data: MakeListResultInternal): MakeListCompact {
  return {
    patternRules: data.patternRules,
  };
}

export function formatListCompact(data: MakeListCompact): string {
  const patternCount = (data.patternRules ?? []).length;
  return `make/just: targets listed (${patternCount} pattern rules)`;
}
