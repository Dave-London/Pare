import { z } from "zod";

/**
 * GitHub logins: alphanumerics and hyphens, starting with an alphanumeric, max 39 chars.
 * Underscore is allowed for Enterprise Managed User logins (`handle_shortcode`).
 */
export const GH_LOGIN_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/;

/** Env var naming the gh accounts this server may act as via the `account` input. */
export const ALLOWED_ACCOUNTS_ENV = "PARE_GITHUB_ALLOWED_ACCOUNTS";

/**
 * Asserts that `account` is listed in PARE_GITHUB_ALLOWED_ACCOUNTS (comma-separated).
 *
 * Unlike the permissive-by-default policies in @paretools/shared, this is deny-by-default:
 * acting as a different identity is off until the operator names the accounts, so an MCP
 * client cannot pick up every account that happens to be in the local gh keyring.
 * GitHub logins are case-insensitive, so the comparison is too.
 */
export function assertAccountAllowed(account: string): void {
  const allowed = (process.env[ALLOWED_ACCOUNTS_ENV] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    throw new Error(
      `The account option is disabled. To let this server act as "${account}", ` +
        `set ${ALLOWED_ACCOUNTS_ENV} to a comma-separated list of gh accounts in the server's environment.`,
    );
  }
  if (!allowed.includes(account.toLowerCase())) {
    throw new Error(
      `Account "${account}" is not allowed by ${ALLOWED_ACCOUNTS_ENV}. Allowed: ${allowed.sort().join(", ")}`,
    );
  }
}

/** Shared input for tools that can act as a non-active, locally logged-in gh account. */
export const accountInput = z
  .string()
  .max(39)
  .regex(GH_LOGIN_RE, "Must be a GitHub username")
  .optional()
  .describe(
    "Run this call as another gh account already logged in locally (see `gh auth status`), without switching the active account. Off unless the server's PARE_GITHUB_ALLOWED_ACCOUNTS env lists the account. github.com and ghe.com hosts only. Default: the active account.",
  );
