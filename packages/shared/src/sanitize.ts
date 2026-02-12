/**
 * Sanitizes error output by replacing sensitive filesystem paths with
 * home-relative equivalents. This prevents leaking usernames and absolute
 * home directory paths in error messages returned to MCP clients.
 *
 * Replacements:
 *   /home/<user>/...  → ~/...
 *   /Users/<user>/... → ~/...
 *   /root/...         → ~/...
 *   C:\Users\<user>\... → ~\...
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

  return result;
}
