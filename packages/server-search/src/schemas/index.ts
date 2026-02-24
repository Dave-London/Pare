import { z } from "zod";

// ── Search (rg --json) ───────────────────────────────────────────────

/** Zod schema for a single search match with file location and matched text. */
export const SearchMatchSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
  matchText: z.string(),
  lineContent: z.string(),
});

/** Zod schema for per-file search match counts. */
export const SearchFileSummarySchema = z.object({
  file: z.string(),
  matchCount: z.number(),
});

/** Zod schema for structured ripgrep search output with match list and totals. */
export const SearchResultSchema = z.object({
  matches: z.array(SearchMatchSchema).optional(),
  totalMatches: z.number(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// ── Find (fd) ────────────────────────────────────────────────────────

/** Zod schema for a single file entry with path and type. */
export const FindFileSchema = z.object({
  path: z.string(),
  type: z.enum(["file", "directory", "symlink", "other"]),
});

/** Zod schema for structured fd output with file list. */
export const FindResultSchema = z.object({
  files: z.array(FindFileSchema).optional(),
});

export type FindResult = z.infer<typeof FindResultSchema>;

// ── Count (rg --count) ──────────────────────────────────────────────

/** Zod schema for a single file match count entry. */
export const CountFileSchema = z.object({
  file: z.string(),
  count: z.number(),
});

/** Zod schema for structured rg --count output with per-file counts and totals. */
export const CountResultSchema = z.object({
  files: z.array(CountFileSchema).optional(),
  totalMatches: z.number(),
});

export type CountResult = z.infer<typeof CountResultSchema>;

// ── Jq (jq) ────────────────────────────────────────────────────────

/** Zod schema for structured jq output with the transformed result. */
export const JqResultSchema = z.object({
  output: z.string(),
  result: z.unknown().optional(),
  exitCode: z.number(),
});

export type JqResult = z.infer<typeof JqResultSchema>;

// ── Yq (yq) ────────────────────────────────────────────────────────

/** Zod schema for structured yq output with the transformed result. */
export const YqResultSchema = z.object({
  output: z.string(),
  exitCode: z.number(),
});

export type YqResult = z.infer<typeof YqResultSchema>;
