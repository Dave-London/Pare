/**
 * Pre-validates a regex pattern before passing it to ripgrep or fd.
 *
 * JavaScript's `RegExp` catches most common syntax errors (unmatched parens,
 * brackets, bad quantifiers) that would otherwise cause rg/fd to exit with
 * code 2 and return empty results — silently confusing the caller.
 *
 * Note: ripgrep uses Rust regex syntax, which is slightly different from
 * JavaScript's (e.g., rg supports `(?P<name>...)` named groups). This
 * pre-check intentionally uses a loose heuristic: it only rejects patterns
 * that are unambiguously broken. Patterns that are valid in Rust regex but
 * invalid in JS regex are NOT rejected here — rg will handle them fine.
 */
export function validateRegexPattern(pattern: string): void {
  try {
    new RegExp(pattern);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Invalid regex pattern: "${pattern}". ${message}. ` +
        `If you intended a literal search, set fixedStrings: true.`,
    );
  }
}
