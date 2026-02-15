/**
 * Sanitizes error output by replacing sensitive filesystem paths.
 *
 * Default mode (home paths only):
 *   /home/<user>/...  → ~/...
 *   /Users/<user>/... → ~/...
 *   /root/...         → ~/...
 *   C:\Users\<user>\... → ~\...
 *
 * Broad mode (PARE_SANITIZE_ALL_PATHS=true):
 *   Also redacts other absolute paths outside home directories:
 *   /etc/..., /var/..., /opt/..., C:\Program Files\..., etc.
 *   These are replaced with <redacted-path>/basename to preserve
 *   the filename while hiding directory structure.
 */
export function sanitizeErrorOutput(text: string): string {
  // Unix: /home/<username>/rest → ~/rest
  let result = text.replace(/\/home\/[^/\s]+\//g, "~/");

  // macOS: /Users/<username>/rest → ~/rest
  result = result.replace(/\/Users\/[^/\s]+\//g, "~/");

  // Unix: /root/rest → ~/rest
  result = result.replace(/\/root\//g, "~/");

  // Windows: C:\Users\<username>\rest → ~\rest (with escaped or literal backslashes)
  result = result.replace(/[A-Z]:\\Users\\[^\\:\s]+\\/gi, "~\\");

  // Broad mode: redact remaining absolute paths
  if (process.env.PARE_SANITIZE_ALL_PATHS === "true") {
    // Unix absolute paths not already handled (e.g., /etc/foo/bar → <redacted>/bar)
    result = result.replace(/\/(?:etc|var|opt|usr|tmp|srv|snap|nix)\/[^\s:]+/g, (match) => {
      const basename = match.split("/").pop() ?? "";
      return `<redacted-path>/${basename}`;
    });

    // Windows non-user absolute paths (e.g., C:\Program Files\foo → <redacted>\foo)
    result = result.replace(/[A-Z]:\\(?!Users\\)[^\s:]+/gi, (match) => {
      const basename = match.split("\\").pop() ?? "";
      return `<redacted-path>\\${basename}`;
    });
  }

  return result;
}
