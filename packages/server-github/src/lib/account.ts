import { z } from "zod";

/**
 * GitHub logins: alphanumerics and hyphens, starting with an alphanumeric, max 39 chars.
 * Underscore is allowed for Enterprise Managed User logins (`handle_shortcode`).
 */
export const GH_LOGIN_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/;

/** Shared input for tools that can act as a non-active, locally logged-in gh account. */
export const accountInput = z
  .string()
  .max(39)
  .regex(GH_LOGIN_RE, "Must be a GitHub username")
  .optional()
  .describe(
    "Run this call as another gh account already logged in locally (see `gh auth status`), without switching the active account. github.com and ghe.com hosts only. Default: the active account.",
  );
