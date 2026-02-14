import type { SearchResult, FindResult, CountResult, JqResult } from "../schemas/index.js";

// ── Full formatters ─────────────────────────────────────────────────

/** Formats structured search results into a human-readable match listing. */
export function formatSearch(data: SearchResult): string {
  if (data.totalMatches === 0) return "search: no matches found.";

  const lines = [`search: ${data.totalMatches} matches in ${data.filesSearched} files`];
  for (const m of data.matches) {
    lines.push(`  ${m.file}:${m.line}:${m.column}: ${m.lineContent}`);
  }
  return lines.join("\n");
}

/** Formats structured find results into a human-readable file listing. */
export function formatFind(data: FindResult): string {
  if (data.total === 0) return "find: no files found.";

  const lines = [`find: ${data.total} files`];
  for (const f of data.files) {
    lines.push(`  ${f.path}`);
  }
  return lines.join("\n");
}

/** Formats structured count results into a human-readable per-file count listing. */
export function formatCount(data: CountResult): string {
  if (data.totalFiles === 0) return "count: no matches found.";

  const lines = [`count: ${data.totalMatches} matches in ${data.totalFiles} files`];
  for (const f of data.files) {
    lines.push(`  ${f.file}: ${f.count}`);
  }
  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ──────────────────────────

/** Compact search: totals only, drop individual matches. */
export interface SearchCompact {
  [key: string]: unknown;
  totalMatches: number;
  filesSearched: number;
}

export function compactSearchMap(data: SearchResult): SearchCompact {
  return {
    totalMatches: data.totalMatches,
    filesSearched: data.filesSearched,
  };
}

export function formatSearchCompact(data: SearchCompact): string {
  if (data.totalMatches === 0) return "search: no matches found.";
  return `search: ${data.totalMatches} matches in ${data.filesSearched} files`;
}

/** Compact find: total count only, drop individual file entries. */
export interface FindCompact {
  [key: string]: unknown;
  total: number;
}

export function compactFindMap(data: FindResult): FindCompact {
  return {
    total: data.total,
  };
}

export function formatFindCompact(data: FindCompact): string {
  if (data.total === 0) return "find: no files found.";
  return `find: ${data.total} files`;
}

/** Compact count: totals only, drop per-file breakdown. */
export interface CountCompact {
  [key: string]: unknown;
  totalMatches: number;
  totalFiles: number;
}

export function compactCountMap(data: CountResult): CountCompact {
  return {
    totalMatches: data.totalMatches,
    totalFiles: data.totalFiles,
  };
}

export function formatCountCompact(data: CountCompact): string {
  if (data.totalFiles === 0) return "count: no matches found.";
  return `count: ${data.totalMatches} matches in ${data.totalFiles} files`;
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
