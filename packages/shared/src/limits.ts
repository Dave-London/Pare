/**
 * Shared input-validation limits for all Pare MCP servers.
 *
 * These provide defense-in-depth against DoS via extremely long inputs.
 * Applied to Zod input schemas with `.max()` — output schemas are NOT
 * constrained because their size is determined by tool output, not user input.
 */
export const INPUT_LIMITS = {
  /** Maximum length for any general string parameter (64 KB). */
  STRING_MAX: 65_536,

  /** Maximum items in any array parameter. */
  ARRAY_MAX: 1_000,

  /** Maximum length for file system paths. */
  PATH_MAX: 4_096,

  /** Maximum length for commit messages (generous to allow long messages). */
  MESSAGE_MAX: 72_000,

  /** Maximum length for short identifiers (branch names, package names, etc.). */
  SHORT_STRING_MAX: 255,
} as const;
