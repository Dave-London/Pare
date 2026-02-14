/**
 * Security policy controls — opt-in hardening via environment variables.
 *
 * All controls follow the same global/per-server precedence pattern as
 * tool filtering (see tool-filter.ts):
 *
 *   1. `PARE_{SETTING}` — global, applies to all servers.
 *   2. `PARE_{SERVER}_{SETTING}` — per-server override.
 *   3. No env var → permissive (default, no restriction).
 *
 * Global takes precedence over per-server when both are set.
 *
 * ## Available Controls
 *
 * ### PARE_ALLOWED_COMMANDS / PARE_{SERVER}_ALLOWED_COMMANDS
 * Comma-separated list of allowed command names.
 * When set, only listed commands may be executed.
 * Example: `PARE_PROCESS_ALLOWED_COMMANDS=node,python,make`
 * Example: `PARE_ALLOWED_COMMANDS=node,python,git,npm` (all servers)
 *
 * ### PARE_ALLOWED_ROOTS / PARE_{SERVER}_ALLOWED_ROOTS
 * Comma-separated list of allowed root directories.
 * When set, all path/cwd parameters must be under one of these roots.
 * Example: `PARE_ALLOWED_ROOTS=/home/user/projects,/tmp/builds`
 * Example: `PARE_PROCESS_ALLOWED_ROOTS=/home/user/safe-dir`
 *
 * ### PARE_BUILD_STRICT_PATH
 * When set to "true", the build server rejects path-qualified commands
 * (e.g., `/tmp/evil/npm`) and only allows bare command names resolved via PATH.
 */

import { resolve, normalize } from "node:path";

/**
 * Reads a policy env var with global/per-server precedence.
 * Global (`PARE_{setting}`) wins over per-server (`PARE_{SERVER}_{setting}`).
 * Returns undefined when neither is set (no restriction).
 */
function readPolicyVar(serverName: string, setting: string): string | undefined {
  const global = process.env[`PARE_${setting}`];
  if (global !== undefined) return global;

  const envKey = `PARE_${serverName.toUpperCase().replace(/-/g, "_")}_${setting}`;
  return process.env[envKey];
}

/**
 * Parses a comma-separated env var value into a trimmed Set.
 * Returns undefined if the raw value is undefined or empty.
 */
function parseList(raw: string | undefined): Set<string> | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Asserts that a command is allowed by the ALLOWED_COMMANDS policy.
 * No-op when the policy is not configured (permissive default).
 *
 * @param command - The command to check (e.g., "node", "python").
 * @param serverName - Server identifier for per-server overrides (e.g., "process").
 * @throws Error if the command is not in the allowlist.
 */
export function assertAllowedByPolicy(command: string, serverName: string): void {
  const raw = readPolicyVar(serverName, "ALLOWED_COMMANDS");
  const allowed = parseList(raw);
  if (!allowed) return; // No policy — everything allowed

  // Extract basename for comparison (handle paths like /usr/bin/node)
  const base =
    command
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.replace(/\.(cmd|exe|bat|sh)$/i, "") ?? "";

  if (!allowed.has(base) && !allowed.has(command)) {
    throw new Error(
      `Command "${command}" is not allowed by ALLOWED_COMMANDS policy. ` +
        `Allowed: ${[...allowed].sort().join(", ")}`,
    );
  }
}

/**
 * Asserts that a working directory path is under one of the allowed roots.
 * No-op when the policy is not configured (permissive default).
 *
 * @param targetPath - The path/cwd to validate.
 * @param serverName - Server identifier for per-server overrides (e.g., "process").
 * @throws Error if the path is outside all allowed roots.
 */
export function assertAllowedRoot(targetPath: string, serverName: string): void {
  const raw = readPolicyVar(serverName, "ALLOWED_ROOTS");
  const roots = parseList(raw);
  if (!roots) return; // No policy — all paths allowed

  const normalizedTarget = normalize(resolve(targetPath));

  for (const root of roots) {
    const normalizedRoot = normalize(resolve(root));
    if (
      normalizedTarget === normalizedRoot ||
      normalizedTarget.startsWith(normalizedRoot + (process.platform === "win32" ? "\\" : "/"))
    ) {
      return; // Path is under an allowed root
    }
  }

  throw new Error(
    `Path "${targetPath}" is outside allowed roots. ` + `Allowed roots: ${[...roots].join(", ")}`,
  );
}

/**
 * Asserts that a command does not contain path separators (strict path mode).
 * Used by build server when PARE_BUILD_STRICT_PATH=true.
 *
 * @param command - The command to check.
 * @throws Error if the command contains `/` or `\`.
 */
export function assertNoPathQualifiedCommand(command: string): void {
  if (process.env.PARE_BUILD_STRICT_PATH === "true") {
    if (command.includes("/") || command.includes("\\")) {
      throw new Error(
        `Path-qualified commands are not allowed when PARE_BUILD_STRICT_PATH is enabled. ` +
          `Use a bare command name (e.g., "npm" not "${command}") that resolves via PATH.`,
      );
    }
  }
}
