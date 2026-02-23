import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";
import { isPlainObject, parseJsonc } from "../parse-utils.js";

interface McpServersConfig {
  mcpServers?: Record<string, { command: string; args: string[] }>;
  [key: string]: unknown;
}

/** Build the mcpServers entries for a list of Pare servers. */
export function buildMcpServersEntries(
  servers: ServerEntry[],
): Record<string, { command: string; args: string[] }> {
  const entries: Record<string, { command: string; args: string[] }> = {};
  for (const s of servers) {
    const { command, args } = npxCommand(s.pkg);
    entries[s.id] = { command, args };
  }
  return entries;
}

/**
 * Merge Pare server entries into a JSON file using the mcpServers format.
 * Used by: Claude Code, Claude Desktop, Cursor, Windsurf, Cline, Roo Code, Gemini CLI.
 * Handles JSONC (JSON with comments) safely.
 */
export function writeMcpServersConfig(
  configPath: string,
  servers: ServerEntry[],
  fs: FileSystem,
): string {
  let existing: McpServersConfig = {};
  const raw = fs.readFile(configPath);
  if (raw !== undefined && raw.trim().length > 0) {
    try {
      const parsed = parseJsonc(raw);
      if (isPlainObject(parsed)) {
        existing = parsed as McpServersConfig;
      } else {
        console.warn(`Warning: ${configPath} is not a JSON object, creating fresh config.`);
      }
    } catch {
      console.warn(`Warning: Could not parse ${configPath}, creating fresh config.`);
    }
  }

  if (!existing.mcpServers) {
    existing.mcpServers = {};
  }

  const newEntries = buildMcpServersEntries(servers);
  Object.assign(existing.mcpServers, newEntries);

  const output = JSON.stringify(existing, null, 2) + "\n";
  fs.writeFile(configPath, output);
  return output;
}
