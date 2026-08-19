/**
 * Body truncation helpers (issue #1067).
 *
 * `gh pr view --json body` / `gh issue view --json body` pass the raw markdown
 * body straight through. Dependabot and release-note bodies routinely run to
 * 30k+ characters, almost all of it inside collapsed `<details>` blocks, which
 * blows the token budget of any agent that views such a PR.
 *
 * The helpers here shrink a body in two stages:
 *  1. Collapse `<details>…</details>` blocks to their `<summary>` text plus a
 *     ` […]` marker (this alone removes ~95% of a Dependabot body).
 *  2. Hard-cap the remaining text at `maxBodyLength` characters.
 *
 * Both stages are skipped when the cap is disabled (`maxBodyLength: 0`), so
 * callers that genuinely need the full text can still get it verbatim.
 */

/** Default cap applied to `body` fields in full-schema output. */
export const DEFAULT_MAX_BODY_LENGTH = 4000;

/** Marker appended in place of a collapsed `<details>` block's contents. */
const DETAILS_MARKER = "[…]";

/**
 * Matches the innermost `<details>` block — one whose contents do not
 * themselves contain another `<details>` open tag. Applying this repeatedly
 * collapses nested blocks from the inside out.
 */
const INNERMOST_DETAILS = /<details\b[^>]*>((?:(?!<details\b)[\s\S])*?)<\/details\s*>/gi;

const SUMMARY = /<summary\b[^>]*>([\s\S]*?)<\/summary\s*>/i;

/** Max collapse passes; guards against pathological nesting. */
const MAX_COLLAPSE_PASSES = 20;

/** Strips HTML tags and collapses whitespace in a `<summary>` label. */
function cleanSummary(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Collapses every `<details>…</details>` block to its `<summary>` text plus a
 * ` […]` marker. Nested blocks are collapsed innermost-first. Text outside
 * `<details>` blocks is left untouched.
 */
export function collapseDetailsBlocks(body: string): string {
  if (!body.includes("<details")) return body;

  let out = body;
  for (let pass = 0; pass < MAX_COLLAPSE_PASSES; pass++) {
    INNERMOST_DETAILS.lastIndex = 0;
    const next = out.replace(INNERMOST_DETAILS, (_match, inner: string) => {
      const summaryMatch = SUMMARY.exec(inner);
      const label = summaryMatch ? cleanSummary(summaryMatch[1]) : "";
      return label ? `${label} ${DETAILS_MARKER}` : DETAILS_MARKER;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Result of applying the body cap. */
export interface TruncatedBody {
  /** The (possibly collapsed and capped) body text. */
  body: string;
  /** True when any content was removed — collapsed `<details>` and/or capped. */
  bodyTruncated: boolean;
  /** Length in characters of the original, untouched body. */
  bodyLength: number;
}

/**
 * Collapses `<details>` blocks then caps `body` at `maxBodyLength` characters.
 *
 * @param body - Raw body text (may be `null`/`undefined`).
 * @param maxBodyLength - Character cap. `0` disables both the cap and the
 *   `<details>` collapse, returning the body verbatim.
 */
export function truncateBody(
  body: string | null | undefined,
  maxBodyLength: number = DEFAULT_MAX_BODY_LENGTH,
): TruncatedBody {
  const original = body ?? "";
  if (maxBodyLength <= 0) {
    return { body: original, bodyTruncated: false, bodyLength: original.length };
  }

  const collapsed = collapseDetailsBlocks(original);
  const capped = collapsed.length > maxBodyLength ? collapsed.slice(0, maxBodyLength) : collapsed;

  return {
    body: capped,
    bodyTruncated: capped !== original,
    bodyLength: original.length,
  };
}

/** Shape of any parsed payload carrying an optional top-level `body`. */
export interface HasBody {
  body?: string | null;
  bodyTruncated?: boolean;
  bodyLength?: number;
}

/**
 * Applies {@link truncateBody} in place of `data.body`, adding `bodyTruncated`
 * and `bodyLength` when (and only when) the body was actually shortened.
 *
 * A `null`/absent body is left as-is so "no body" stays distinguishable from
 * "empty body".
 */
export function applyBodyCap<T extends HasBody>(data: T, maxBodyLength?: number): T {
  const cap = maxBodyLength ?? DEFAULT_MAX_BODY_LENGTH;
  if (data.body === null || data.body === undefined || data.body === "") return data;

  const { body, bodyTruncated, bodyLength } = truncateBody(data.body, cap);
  data.body = body;
  if (bodyTruncated) {
    data.bodyTruncated = true;
    data.bodyLength = bodyLength;
  }
  return data;
}
