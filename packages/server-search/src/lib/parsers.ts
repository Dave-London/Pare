import type { SearchResult, FindResult, CountResult, JqResult } from "../schemas/index.js";
import * as path from "node:path";
import { lstatSync } from "node:fs";

// ── rg --json parser ────────────────────────────────────────────────

/**
 * Represents a single match event from `rg --json` JSONL output.
 * Each line has a `type` field; we only care about "match" and "summary".
 */
interface RgJsonMatch {
  type: "match";
  data: {
    path: { text: string };
    lines: { text: string };
    line_number: number;
    absolute_offset: number;
    submatches: Array<{
      match: { text: string };
      start: number;
      end: number;
    }>;
  };
}

interface RgJsonSummary {
  type: "summary";
  data: {
    stats: {
      searches_with_match: number;
      bytes_searched: number;
    };
  };
}

type RgJsonLine = RgJsonMatch | RgJsonSummary | { type: string };

/**
 * Parses `rg --json` JSONL output into a structured SearchResult.
 *
 * Each line of stdout is a JSON object. We filter for type="match" events
 * and extract the file, line number, column (from submatches[0].start),
 * match text, and full line content (trimmed).
 */
export function parseRgJsonOutput(stdout: string, maxResults: number): SearchResult {
  const lines = stdout.split("\n").filter(Boolean);
  const matches: SearchResult["matches"] = [];
  const fileMatchCounts = new Map<string, number>();
  let filesSearched = 0;
  const seenFiles = new Set<string>();

  for (const line of lines) {
    let parsed: RgJsonLine;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    if (parsed.type === "match") {
      const data = (parsed as RgJsonMatch).data;
      const file = data.path.text;
      seenFiles.add(file);
      fileMatchCounts.set(file, (fileMatchCounts.get(file) ?? 0) + 1);

      if (matches.length < maxResults) {
        const submatch = data.submatches[0];
        matches.push({
          file,
          line: data.line_number,
          column: submatch ? submatch.start + 1 : 1, // 1-based column
          matchText: submatch ? submatch.match.text : "",
          lineContent: data.lines.text.trimEnd(),
        });
      }
    } else if (parsed.type === "summary") {
      const stats = (parsed as RgJsonSummary).data.stats;
      filesSearched = stats.searches_with_match;
    }
  }

  // If no summary line was emitted, use the count of unique files with matches
  if (filesSearched === 0) {
    filesSearched = seenFiles.size;
  }

  return {
    matches,
    files: Array.from(fileMatchCounts.entries()).map(([file, matchCount]) => ({
      file,
      matchCount,
    })),
    totalMatches: matches.length,
    filesSearched,
  };
}

// ── fd parser ───────────────────────────────────────────────────────

/**
 * Normalizes a file extension by stripping the leading dot.
 * This ensures output format matches the input format used in the `extension` param.
 * e.g., ".ts" -> "ts", ".json" -> "json", "" -> ""
 */
function normalizeExt(ext: string): string {
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

/**
 * Parses `fd` output (one file path per line) into a structured FindResult.
 * Extracts basename and extension for each entry.
 */
export function parseFdOutput(stdout: string, maxResults: number, cwd: string): FindResult {
  const lines = stdout.split("\n").filter(Boolean);
  const files: FindResult["files"] = [];

  for (const line of lines) {
    if (files.length >= maxResults) break;

    const filePath = line.trim();
    if (!filePath) continue;

    const name = path.basename(filePath);
    const ext = normalizeExt(path.extname(filePath));
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
    let type: "file" | "directory" | "symlink" | "other" = "other";
    try {
      const stat = lstatSync(resolvedPath);
      if (stat.isSymbolicLink()) {
        type = "symlink";
      } else if (stat.isDirectory()) {
        type = "directory";
      } else if (stat.isFile()) {
        type = "file";
      }
    } catch {
      // Entry might disappear between fd output and stat. Keep type as "other".
    }

    files.push({
      path: filePath,
      name,
      ext,
      type,
    });
  }

  return {
    files,
    total: files.length,
  };
}

// ── rg --count parser ───────────────────────────────────────────────

/**
 * Parses `rg --count` output into a structured CountResult.
 * Each line has the format `file:count`. We split on the LAST colon
 * to handle file paths that may contain colons (e.g., Windows drive letters).
 */
export function parseRgCountOutput(stdout: string): CountResult {
  const lines = stdout.split("\n").filter(Boolean);
  const files: CountResult["files"] = [];
  let totalMatches = 0;

  for (const line of lines) {
    const lastColon = line.lastIndexOf(":");
    if (lastColon === -1) continue;

    const file = line.slice(0, lastColon);
    const countStr = line.slice(lastColon + 1).trim();
    const count = parseInt(countStr, 10);

    if (isNaN(count)) continue;

    files.push({ file, count });
    totalMatches += count;
  }

  return {
    files,
    totalMatches,
    totalFiles: files.length,
  };
}

// ── jq parser ────────────────────────────────────────────────────────

/**
 * Parses jq command output into a structured JqResult.
 * If the command failed (non-zero exit), stderr is used as the output.
 */
export function parseJqOutput(stdout: string, stderr: string, exitCode: number): JqResult {
  if (exitCode !== 0) {
    // jq failed — return stderr as the output so the caller sees the error
    return {
      output: stderr.trim() || stdout.trim(),
      exitCode,
    };
  }

  const textOutput = stdout.trimEnd();
  const trimmed = textOutput.trim();
  if (trimmed.length === 0) {
    return { output: textOutput, exitCode };
  }

  // Try parsing as a single JSON document first.
  try {
    return {
      output: textOutput,
      result: JSON.parse(trimmed),
      exitCode,
    };
  } catch {
    // Fall through to JSONL parsing.
  }

  // Best-effort for multiple JSON outputs (one JSON value per line).
  const jsonLines = trimmed.split("\n").filter((line) => line.trim().length > 0);
  const parsedLines: unknown[] = [];
  for (const line of jsonLines) {
    try {
      parsedLines.push(JSON.parse(line));
    } catch {
      return {
        output: textOutput,
        exitCode,
      };
    }
  }

  return {
    output: textOutput,
    result: parsedLines.length > 0 ? parsedLines : undefined,
    exitCode,
  };
}
