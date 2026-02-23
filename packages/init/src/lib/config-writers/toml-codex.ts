import { parse, stringify } from "smol-toml";
import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";
import { stripBom } from "../parse-utils.js";

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
    const trimmed = stripBom(raw).trim();
    if (trimmed.length > 0) {
      try {
        existing = parse(trimmed) as unknown as CodexConfig;
      } catch {
        console.warn(`Warning: Could not parse ${configPath}, creating fresh config.`);
        existing = {};
      }
    }
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
