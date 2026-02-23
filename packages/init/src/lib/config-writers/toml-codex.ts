import { parse, stringify } from "smol-toml";
import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";

interface CodexConfig {
  mcp_servers?: Record<string, { command: string; args: string[] }>;
  [key: string]: unknown;
}

/**
 * Merge Pare server entries into OpenAI Codex's config.toml.
 * Format: [mcp_servers.<name>] sections.
 */
export function writeCodexConfig(
  configPath: string,
  servers: ServerEntry[],
  fs: FileSystem,
): string {
  let existing: CodexConfig = {};
  const raw = fs.readFile(configPath);
  if (raw !== undefined) {
    existing = parse(raw) as unknown as CodexConfig;
  }

  if (!existing.mcp_servers) {
    existing.mcp_servers = {};
  }

  for (const s of servers) {
    const { command, args } = npxCommand(s.pkg);
    existing.mcp_servers[s.id] = { command, args };
  }

  const output = stringify(existing as Record<string, unknown>) + "\n";
  fs.writeFile(configPath, output);
  return output;
}
