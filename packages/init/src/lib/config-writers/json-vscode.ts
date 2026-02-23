import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";

interface VsCodeMcpConfig {
  servers?: Record<string, { type: string; command: string; args: string[] }>;
  [key: string]: unknown;
}

/**
 * Merge Pare server entries into a VS Code / GitHub Copilot MCP config.
 * Format: .vscode/mcp.json with "servers" key and "type": "stdio".
 */
export function writeVsCodeConfig(
  configPath: string,
  servers: ServerEntry[],
  fs: FileSystem,
): string {
  let existing: VsCodeMcpConfig = {};
  const raw = fs.readFile(configPath);
  if (raw !== undefined) {
    existing = JSON.parse(raw) as VsCodeMcpConfig;
  }

  if (!existing.servers) {
    existing.servers = {};
  }

  for (const s of servers) {
    const { command, args } = npxCommand(s.pkg);
    existing.servers[s.id] = { type: "stdio", command, args };
  }

  const output = JSON.stringify(existing, null, 2) + "\n";
  fs.writeFile(configPath, output);
  return output;
}
