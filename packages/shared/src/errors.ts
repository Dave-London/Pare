import { z } from "zod";
import type { RunResult } from "./runner.js";
import type { ToolOutput } from "./types.js";

// ---------------------------------------------------------------------------
// Error categories
// ---------------------------------------------------------------------------

/**
 * Zod schema for the set of error categories a Pare tool can return.
 *
 * Each category maps to a class of failure an AI agent can programmatically
 * match on, enabling automated recovery strategies without parsing free-text
 * error messages.
 */
export const PareErrorCategory = z.enum([
  "command-not-found", // CLI tool not installed or not in PATH
  "permission-denied", // Insufficient OS/filesystem permissions
  "timeout", // Command exceeded its time limit
  "invalid-input", // Validation failure on user-supplied input
  "not-found", // Requested resource does not exist
  "network-error", // Network connectivity / DNS failure
  "authentication-error", // Auth / credential failure
  "conflict", // Merge conflict, lock contention, etc.
  "configuration-error", // Missing or invalid config file
  "already-exists", // Resource already exists
  "command-failed", // Generic catch-all for unrecognised failures
]);

export type PareErrorCategoryType = z.infer<typeof PareErrorCategory>;

// ---------------------------------------------------------------------------
// Structured error object
// ---------------------------------------------------------------------------

/** Zod schema for the structured error every Pare tool can return. */
export const PareErrorSchema = z.object({
  isError: z.literal(true),
  category: PareErrorCategory,
  message: z.string(),
  command: z.string().optional(),
  exitCode: z.number().optional(),
  suggestion: z.string().optional(),
});

export type PareError = z.infer<typeof PareErrorSchema>;

// ---------------------------------------------------------------------------
// Pattern-matching helpers
// ---------------------------------------------------------------------------

/** Returns true when stderr / error text indicates the command was not found. */
export function isCommandNotFound(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("command not found") ||
    lower.includes("not recognized") ||
    lower.includes("enoent") ||
    lower.includes("no such file or directory") ||
    /is not recognized as an internal or external command/.test(lower)
  );
}

/** Returns true when stderr indicates a permission / access error. */
export function isPermissionDenied(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("permission denied") ||
    lower.includes("eacces") ||
    lower.includes("eperm") ||
    lower.includes("access denied") ||
    lower.includes("operation not permitted")
  );
}

/** Returns true when stderr indicates a timeout. */
export function isTimeout(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("timed out") || lower.includes("timeout");
}

/** Returns true when stderr indicates a network connectivity problem. */
export function isNetworkError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("connection refused") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("enetunreach") ||
    lower.includes("could not resolve host") ||
    lower.includes("network is unreachable") ||
    lower.includes("dns resolution failed")
  );
}

/** Returns true when stderr indicates an authentication / authorisation failure. */
export function isAuthError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("authentication") ||
    lower.includes("authenticated") ||
    lower.includes("credential") ||
    lower.includes("unauthorized") ||
    / 401[ :]/.test(lower) ||
    / 403[ :]/.test(lower) ||
    lower.includes("permission denied (publickey") ||
    lower.includes("invalid credentials") ||
    lower.includes("bad credentials") ||
    lower.includes("login required")
  );
}

/** Returns true when stderr indicates a conflict (merge, lock, etc.). */
export function isConflict(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("merge conflict") ||
    lower.includes("conflict") ||
    lower.includes("lock file") ||
    lower.includes("locked") ||
    lower.includes("already locked")
  );
}

/** Returns true when stderr indicates a resource was not found. */
export function isNotFound(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("no such") ||
    / 404[ :]/.test(lower) ||
    lower.includes("unknown revision") ||
    lower.includes("pathspec")
  );
}

/** Returns true when stderr indicates a resource already exists. */
export function isAlreadyExists(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("already exists") || lower.includes("already exist");
}

/** Returns true when stderr indicates a configuration problem. */
export function isConfigurationError(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("missing config") ||
    lower.includes("configuration error") ||
    lower.includes("config file not found") ||
    lower.includes("invalid configuration") ||
    lower.includes("no configuration") ||
    lower.includes(".eslintrc") ||
    lower.includes("tsconfig") ||
    lower.includes("could not read config")
  );
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classifies a failed {@link RunResult} into a structured {@link PareError}.
 *
 * The function inspects stderr (and stdout when stderr is empty), the exit
 * code, and well-known patterns to determine the most specific category.
 * When no pattern matches, the category falls back to `"command-failed"`.
 *
 * @param result  - The {@link RunResult} returned by the command runner.
 * @param command - A human-readable label for the command (e.g. `"git tag"`).
 * @returns A fully populated {@link PareError}.
 */
export function classifyError(result: RunResult, command: string): PareError {
  const text = result.stderr || result.stdout;
  const category = classifyText(text, result.exitCode);

  return {
    isError: true,
    category,
    message: text.trim() || `${command} failed with exit code ${result.exitCode}`,
    command,
    exitCode: result.exitCode,
    suggestion: suggestRecovery(category, command),
  };
}

/**
 * Determines the error category from combined error text and exit code.
 *
 * Order matters — more specific patterns are checked before generic ones.
 * For example `"permission denied (publickey)"` should match
 * `authentication-error` rather than `permission-denied`.
 */
function classifyText(text: string, exitCode: number): PareErrorCategoryType {
  // Timeout (often signalled by exit code 124 from `timeout(1)`)
  if (exitCode === 124 || isTimeout(text)) return "timeout";

  // Command not found
  if (isCommandNotFound(text)) return "command-not-found";

  // Auth — checked before permission-denied because some auth errors
  // contain the substring "permission denied"
  if (isAuthError(text)) return "authentication-error";

  // Permission
  if (isPermissionDenied(text)) return "permission-denied";

  // Network
  if (isNetworkError(text)) return "network-error";

  // Already exists
  if (isAlreadyExists(text)) return "already-exists";

  // Configuration
  if (isConfigurationError(text)) return "configuration-error";

  // Conflict — checked before not-found because conflict messages sometimes
  // contain path references that include "not found"
  if (isConflict(text)) return "conflict";

  // Not found
  if (isNotFound(text)) return "not-found";

  // Catch-all
  return "command-failed";
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

const SUGGESTION_MAP: Record<PareErrorCategoryType, (cmd: string) => string> = {
  "command-not-found": (cmd) => `Ensure "${cmd}" is installed and available in your PATH.`,
  "permission-denied": () => "Check file/directory permissions or run with elevated privileges.",
  timeout: () => "The command took too long. Retry with a longer timeout or a smaller scope.",
  "invalid-input": () => "Check the input parameters and try again.",
  "not-found": () => "Verify the resource (file, branch, ref, etc.) exists.",
  "network-error": () => "Check your network connection and try again.",
  "authentication-error": () => "Verify your credentials or tokens are valid and not expired.",
  conflict: () => "Resolve the conflict or release the lock and retry.",
  "configuration-error": () => "Check that all required config files exist and are valid.",
  "already-exists": () => "The resource already exists. Use a different name or remove it first.",
  "command-failed": (cmd) => `Inspect the error message from "${cmd}" for more details.`,
};

function suggestRecovery(category: PareErrorCategoryType, command: string): string {
  return SUGGESTION_MAP[category](command);
}

// ---------------------------------------------------------------------------
// Error output helper
// ---------------------------------------------------------------------------

/**
 * Formats a {@link PareError} as human-readable text for the `content` field.
 */
function formatPareError(error: PareError): string {
  const lines: string[] = [`Error [${error.category}]: ${error.message}`];
  if (error.command) lines.push(`Command: ${error.command}`);
  if (error.exitCode !== undefined) lines.push(`Exit code: ${error.exitCode}`);
  if (error.suggestion) lines.push(`Suggestion: ${error.suggestion}`);
  return lines.join("\n");
}

/**
 * Creates a dual-output error response that can be returned directly from a
 * tool handler. The response carries both human-readable text (`content`) and
 * structured JSON (`structuredContent`) with `isError: true` so the MCP
 * client knows the call did not succeed.
 *
 * Usage:
 * ```ts
 * if (result.exitCode !== 0) {
 *   return errorOutput(classifyError(result, "git tag"));
 * }
 * ```
 */
export function errorOutput(error: PareError): ToolOutput<PareError> {
  return {
    content: [{ type: "text", text: formatPareError(error) }],
    structuredContent: error,
    isError: true,
  };
}

/**
 * Convenience: creates a {@link PareError} for input-validation failures and
 * returns it as a dual-output response. Useful in `inputSchema` guards before
 * the CLI command is even invoked.
 *
 * @param message - Description of what was wrong with the input.
 */
export function invalidInputError(message: string): ToolOutput<PareError> {
  return errorOutput({
    isError: true,
    category: "invalid-input",
    message,
    suggestion: "Check the input parameters and try again.",
  });
}
