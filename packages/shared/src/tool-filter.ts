/**
 * Granular tool selection — allows users to enable/disable individual tools
 * via environment variables.
 *
 * Environment variable precedence:
 *   1. `PARE_TOOLS` — universal filter across all servers.
 *      Format: comma-separated `server:tool` pairs.
 *      Example: `PARE_TOOLS=git:status,git:log,npm:install`
 *
 *   2. `PARE_PROFILE` — preset tool profile.
 *      Format: profile name (minimal, web, python, devops, rust, go, full).
 *      Example: `PARE_PROFILE=python`
 *
 *   3. `PARE_{SERVER}_TOOLS` — per-server filter.
 *      Format: comma-separated tool names.
 *      Example: `PARE_GIT_TOOLS=status,log`
 *
 *   4. No env vars → all tools enabled (default).
 *
 * Universal (`PARE_TOOLS`) takes precedence over profiles,
 * which take precedence over per-server env vars.
 */

import { resolveProfile, _resetProfileCache } from "./profiles.js";

export { _resetProfileCache };

/**
 * Returns `true` when lazy tool loading is enabled.
 *
 * Lazy mode is activated by setting `PARE_LAZY=true` (case-insensitive).
 * When active, only core tools are registered at startup; extended tools
 * are deferred and discoverable via the `discover-tools` meta-tool.
 *
 * Lazy mode is NOT active when `PARE_PROFILE=full` is explicitly set,
 * or when any explicit tool filter (`PARE_TOOLS`, `PARE_{SERVER}_TOOLS`)
 * is in use — those filters already provide precise control.
 */
export function isLazyEnabled(): boolean {
  // Explicit tool filters take precedence — no lazy behavior.
  if (process.env.PARE_TOOLS !== undefined) return false;

  // Explicit "full" profile means load everything.
  const profile = process.env.PARE_PROFILE;
  if (profile !== undefined && profile.trim().toLowerCase() === "full") return false;

  const raw = process.env.PARE_LAZY;
  if (raw === undefined) return false;
  return raw.trim().toLowerCase() === "true";
}

/**
 * Determines whether a tool should be registered based on environment variables.
 *
 * @param serverName - The server identifier (e.g., "git", "npm", "docker").
 * @param toolName - The tool name (e.g., "status", "log", "install").
 * @returns `true` if the tool should be registered, `false` if filtered out.
 */
export function shouldRegisterTool(serverName: string, toolName: string): boolean {
  // 1. PARE_TOOLS — highest priority universal filter.
  const universal = process.env.PARE_TOOLS;
  if (universal !== undefined) {
    if (universal.trim() === "") return false;
    const allowed = universal.split(",").map((s) => s.trim());
    return allowed.includes(`${serverName}:${toolName}`);
  }

  // 2. PARE_PROFILE — preset profile filter.
  const profileSet = resolveProfile();
  if (profileSet !== null) {
    return profileSet.has(`${serverName}:${toolName}`);
  }

  // 3. PARE_{SERVER}_TOOLS — per-server filter.
  const envKey = `PARE_${serverName.toUpperCase().replace(/-/g, "_")}_TOOLS`;
  const perServer = process.env[envKey];
  if (perServer !== undefined) {
    if (perServer.trim() === "") return false;
    const allowed = perServer.split(",").map((s) => s.trim());
    return allowed.includes(toolName);
  }

  // 4. Default: all enabled.
  return true;
}
