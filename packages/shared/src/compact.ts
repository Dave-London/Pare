import { z } from "zod";

/**
 * Default number of leading lines kept when truncating a stream for compact
 * output. Matches the budget introduced for `server-process` in PR #1020.
 */
export const COMPACT_HEAD_LINES = 40;

/**
 * Default number of trailing lines kept when truncating a stream for compact
 * output. Matches the budget introduced for `server-process` in PR #1020.
 */
export const COMPACT_TAIL_LINES = 10;

/**
 * Default hard byte cap applied to each stream after line trimming.
 * Matches the budget introduced for `server-process` in PR #1020.
 */
export const COMPACT_BYTE_CAP = 8192;

/** Options for {@link truncateStream} and {@link compactStreamFields}. */
export interface TruncateStreamOptions {
  /** Number of leading lines to keep (default {@link COMPACT_HEAD_LINES}). */
  headLines?: number;
  /** Number of trailing lines to keep (default {@link COMPACT_TAIL_LINES}). */
  tailLines?: number;
  /** Hard byte cap applied after line trimming (default {@link COMPACT_BYTE_CAP}). */
  byteCap?: number;
}

/** Result of {@link truncateStream}. */
export interface TruncateStreamResult {
  /** The (possibly truncated) text. */
  text: string;
  /** Whether any truncation (line trimming or byte cap) occurred. */
  truncated: boolean;
  /** Total number of lines in the original text (before truncation). */
  totalLines: number;
}

/**
 * Truncates a stream (stdout/stderr) to a compact budget: the first
 * `headLines` lines and the last `tailLines` lines with a
 * `... (N lines omitted) ...` marker in between, followed by a hard byte cap
 * that appends `... (truncated)` when exceeded.
 *
 * Behaviorally identical to the compact truncation shipped for
 * `server-process` in PR #1020, extracted so every server can share it
 * (epic #1022).
 *
 * Notes:
 * - Lines are split on `"\n"`; CRLF input keeps its `"\r"` characters and a
 *   trailing newline counts as one extra (empty) line, mirroring the
 *   reference implementation.
 * - The byte cap is applied to the JavaScript string length (UTF-16 code
 *   units), matching the original implementation.
 *
 * @param text - The raw stream text to truncate.
 * @param opts - Optional budget overrides (see {@link TruncateStreamOptions}).
 * @returns The truncated text, whether truncation occurred, and the total
 *   line count of the original text.
 */
export function truncateStream(
  text: string,
  opts: TruncateStreamOptions = {},
): TruncateStreamResult {
  const headLines = opts.headLines ?? COMPACT_HEAD_LINES;
  const tailLines = opts.tailLines ?? COMPACT_TAIL_LINES;
  const byteCap = opts.byteCap ?? COMPACT_BYTE_CAP;

  const lines = text.split("\n");
  const totalLines = lines.length;
  let out = text;
  let truncated = false;

  if (totalLines > headLines + tailLines) {
    const omitted = totalLines - headLines - tailLines;
    out = [
      ...lines.slice(0, headLines),
      `... (${omitted} lines omitted) ...`,
      ...lines.slice(totalLines - tailLines),
    ].join("\n");
    truncated = true;
  }

  if (out.length > byteCap) {
    out = out.slice(0, byteCap) + "\n... (truncated)";
    truncated = true;
  }

  return { text: out, truncated, totalLines };
}

/**
 * The optional stdout/stderr fields produced by {@link compactStreamFields}.
 *
 * Truncation flags are only present (and always `true`) when the
 * corresponding stream was truncated; total line counts are only present
 * alongside their flag. Empty streams are omitted entirely.
 */
export interface CompactStreamFields {
  /** Truncated stdout (omitted when the stream is empty). */
  stdout?: string;
  /** Truncated stderr (omitted when the stream is empty). */
  stderr?: string;
  /** Present (and `true`) only when stdout was truncated. */
  stdoutTruncated?: true;
  /** Present (and `true`) only when stderr was truncated. */
  stderrTruncated?: true;
  /** Total stdout lines before truncation; present only when stdoutTruncated. */
  stdoutTotalLines?: number;
  /** Total stderr lines before truncation; present only when stderrTruncated. */
  stderrTotalLines?: number;
}

/**
 * Builds the compact stdout/stderr field set used by compact tool results.
 *
 * Convenience wrapper around {@link truncateStream} producing the exact
 * optional-field shape shipped for `server-process` in PR #1020:
 *
 * - Empty or `undefined` streams are omitted entirely (no `stdout: ""`).
 * - `stdoutTruncated`/`stderrTruncated` are set (to `true`) only when the
 *   corresponding stream was actually truncated — never `false`.
 * - `stdoutTotalLines`/`stderrTotalLines` are set only when the
 *   corresponding truncated flag is set.
 *
 * Spread the result into a compact result object:
 * ```ts
 * const compact = { exitCode, success, ...compactStreamFields(stdout, stderr) };
 * ```
 *
 * @param stdout - Raw stdout text (empty/undefined streams are omitted).
 * @param stderr - Raw stderr text (empty/undefined streams are omitted).
 * @param opts - Optional budget overrides (see {@link TruncateStreamOptions}).
 * @returns An object containing only the fields that apply.
 */
export function compactStreamFields(
  stdout: string | undefined,
  stderr: string | undefined,
  opts: TruncateStreamOptions = {},
): CompactStreamFields {
  const fields: CompactStreamFields = {};

  if (stdout) {
    const t = truncateStream(stdout, opts);
    fields.stdout = t.text;
    if (t.truncated) {
      fields.stdoutTruncated = true;
      fields.stdoutTotalLines = t.totalLines;
    }
  }
  if (stderr) {
    const t = truncateStream(stderr, opts);
    fields.stderr = t.text;
    if (t.truncated) {
      fields.stderrTruncated = true;
      fields.stderrTotalLines = t.totalLines;
    }
  }

  return fields;
}

/**
 * Zod fragment for the compact stream truncation metadata fields.
 *
 * Spread into a tool's result schema so `structuredContent` produced with
 * {@link compactStreamFields} validates:
 * ```ts
 * const MyResultSchema = z.object({
 *   exitCode: z.number(),
 *   stdout: z.string().optional(),
 *   stderr: z.string().optional(),
 *   ...CompactStreamSchemaFields,
 * });
 * ```
 *
 * Field-compatible with the `server-process` run schema from PR #1020.
 */
export const CompactStreamSchemaFields = {
  /** Whether stdout was truncated to the compact output budget (only set when true). */
  stdoutTruncated: z.boolean().optional(),
  /** Whether stderr was truncated to the compact output budget (only set when true). */
  stderrTruncated: z.boolean().optional(),
  /** Total stdout lines before compact truncation (only set when stdoutTruncated). */
  stdoutTotalLines: z.number().optional(),
  /** Total stderr lines before compact truncation (only set when stderrTruncated). */
  stderrTotalLines: z.number().optional(),
};
