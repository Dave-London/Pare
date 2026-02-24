import type {
  SearchResult,
  FindResult,
  CountResult,
  JqResult,
  YqResult,
} from "../schemas/index.js";

// ── Full formatters ─────────────────────────────────────────────────

/** Formats structured search results into a human-readable match listing. */
export function formatSearch(data: SearchResult): string {
  if (data.totalMatches === 0) return "search: no matches found.";

  // Compute filesSearched locally from matches
  const filesSearched = new Set((data.matches ?? []).map((m) => m.file)).size;
  const lines = [`search: ${data.totalMatches} matches in ${filesSearched} files`];
  for (const m of data.matches ?? []) {
    lines.push(`  ${m.file}:${m.line}:${m.column}: ${m.lineContent}`);
  }
  return lines.join("\n");
}

/** Formats structured find results into a human-readable file listing. */
export function formatFind(data: FindResult): string {
  const total = (data.files ?? []).length;
  if (total === 0) return "find: no files found.";

  const lines = [`find: ${total} files`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f.path} [${f.type}]`);
  }
  return lines.join("\n");
}

/** Formats structured count results into a human-readable per-file count listing. */
export function formatCount(data: CountResult): string {
  const totalFiles = (data.files ?? []).length;
  if (totalFiles === 0) return "count: no matches found.";

  const lines = [`count: ${data.totalMatches} matches in ${totalFiles} files`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f.file}: ${f.count}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ──────────────────────────

/** Compact search: totalMatches only (filesSearched removed from schema, derivable from matches). */
export interface SearchCompact {
  [key: string]: unknown;
  totalMatches: number;
}

export function compactSearchMap(data: SearchResult): SearchCompact {
  return {
    totalMatches: data.totalMatches,
  };
}

export function formatSearchCompact(data: SearchCompact): string {
  if (data.totalMatches === 0) return "search: no matches found.";
  return `search: ${data.totalMatches} matches`;
}

/** Compact find: file count only, drop individual file entries (total derived from files.length). */
export interface FindCompact {
  [key: string]: unknown;
  fileCount: number;
}

export function compactFindMap(data: FindResult): FindCompact {
  return {
    fileCount: (data.files ?? []).length,
  };
}

export function formatFindCompact(data: FindCompact): string {
  if (data.fileCount === 0) return "find: no files found.";
  return `find: ${data.fileCount} files`;
}

/** Compact count: totalMatches only (totalFiles removed from schema, derivable from files.length). */
export interface CountCompact {
  [key: string]: unknown;
  totalMatches: number;
}

export function compactCountMap(data: CountResult): CountCompact {
  return {
    totalMatches: data.totalMatches,
  };
}

export function formatCountCompact(data: CountCompact): string {
  if (data.totalMatches === 0) return "count: no matches found.";
  return `count: ${data.totalMatches} matches`;
}

// ── Jq formatters ───────────────────────────────────────────────────

/** Formats jq result into a human-readable string. */
export function formatJq(data: JqResult): string {
  if (data.exitCode !== 0) {
    return `jq: error (exit ${data.exitCode})\n${data.output}`;
  }
  return data.output;
}

/** Compact jq: same as full — output is already minimal. */
export interface JqCompact {
  [key: string]: unknown;
  output: string;
  exitCode: number;
}

export function compactJqMap(data: JqResult): JqCompact {
  return {
    output: data.output,
    exitCode: data.exitCode,
  };
}

export function formatJqCompact(data: JqCompact): string {
  if (data.exitCode !== 0) {
    return `jq: error (exit ${data.exitCode})\n${data.output}`;
  }
  return data.output;
}

// ── Yq formatters ───────────────────────────────────────────────────

/** Formats yq result into a human-readable string. */
export function formatYq(data: YqResult): string {
  if (data.exitCode !== 0) {
    return `yq: error (exit ${data.exitCode})\n${data.output}`;
  }
  return data.output;
}

/** Compact yq: same as full — output is already minimal. */
export interface YqCompact {
  [key: string]: unknown;
  output: string;
  exitCode: number;
}

export function compactYqMap(data: YqResult): YqCompact {
  return {
    output: data.output,
    exitCode: data.exitCode,
  };
}

export function formatYqCompact(data: YqCompact): string {
  if (data.exitCode !== 0) {
    return `yq: error (exit ${data.exitCode})\n${data.output}`;
  }
  return data.output;
}
