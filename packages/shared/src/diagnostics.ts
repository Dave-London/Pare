import { z } from "zod";

/** Options for {@link surfaceEmptyFailure}. */
export interface SurfaceEmptyFailureOptions<T extends object> {
  /**
   * Predicate deciding whether the parsed data is "empty" — i.e. the parser
   * found nothing actionable (zero tests, zero diagnostics, zero results).
   */
  isEmpty: (data: T) => boolean;
  /**
   * Maximum number of characters of raw output to attach as the `error`
   * detail (the tail of the stream is kept). Default 4096.
   */
  maxBytes?: number;
}

/** Default maximum error detail length for {@link surfaceEmptyFailure}. */
export const SURFACE_EMPTY_FAILURE_MAX_BYTES = 4096;

/**
 * Surfaces a "silent green" failure: the CLI exited non-zero but the parser
 * produced no results, which would otherwise read as a clean/passing run.
 *
 * When `result.exitCode !== 0`, `opts.isEmpty(data)` is true, and no `error`
 * field is already set on `data`, this returns a copy of `data` with:
 *
 * - `error` — the trimmed tail (last `maxBytes` characters) of whichever
 *   stream has content, preferring stderr when non-empty, else stdout. When
 *   the detail exceeds `maxBytes` a `… (output truncated)` marker is
 *   prepended to the kept tail. When both streams are empty a fallback
 *   message is used so the `error` field is never an empty string.
 * - `exitCode` — the CLI's exit code.
 *
 * Otherwise `data` is returned unchanged (same reference).
 *
 * Generalizes `server-test`'s `surfaceLoadFailure` (issues #928/#931) for
 * every server (epic #1024): a test suite that fails at import/collection
 * time, a linter that crashes before emitting JSON, etc., all exit non-zero
 * with nothing parseable — this makes that state visible to agents.
 *
 * Layering note: this is NOT a replacement for `classifyError`/`errorOutput`
 * (see `errors.ts`). Those handle "the command itself failed and the tool
 * returns an error response". `surfaceEmptyFailure` covers the layer above:
 * the CLI ran, the tool still returns a structured (non-error) result, but
 * the output contained nothing parseable — so the result must carry evidence
 * of the failure instead of looking like a clean pass.
 *
 * @param data - The parsed result object (returned as-is when no failure is surfaced).
 * @param result - The raw CLI outcome (exit code plus captured streams).
 * @param opts - Emptiness predicate and optional detail size cap.
 * @returns `data`, possibly augmented with `error` and `exitCode`.
 */
export function surfaceEmptyFailure<T extends object>(
  data: T,
  result: { exitCode: number; stdout: string; stderr: string },
  opts: SurfaceEmptyFailureOptions<T>,
): T & { error?: string; exitCode?: number } {
  if (result.exitCode === 0 || !opts.isEmpty(data)) {
    return data;
  }
  if ((data as { error?: unknown }).error) {
    return data;
  }

  const maxBytes = opts.maxBytes ?? SURFACE_EMPTY_FAILURE_MAX_BYTES;
  const detail = (result.stderr.trim() || result.stdout.trim()).trim();
  const error =
    detail.length > maxBytes
      ? `… (output truncated)\n${detail.slice(-maxBytes)}`
      : detail ||
        `Command exited with code ${result.exitCode} but produced no parseable output. ` +
          `This is not a passing run.`;

  return { ...data, error, exitCode: result.exitCode };
}

/**
 * Zod fragment for the fields {@link surfaceEmptyFailure} may attach.
 *
 * Spread into a tool's result schema so augmented results validate:
 * ```ts
 * const MyResultSchema = z.object({
 *   summary: SummarySchema,
 *   ...EmptyFailureSchemaFields,
 * });
 * ```
 */
export const EmptyFailureSchemaFields = {
  /** Raw CLI output surfaced when the run failed but nothing was parseable. */
  error: z.string().optional(),
  /** CLI exit code, set alongside `error` when a silent failure was surfaced. */
  exitCode: z.number().optional(),
};
