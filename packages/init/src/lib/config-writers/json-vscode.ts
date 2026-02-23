import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";
import { stripBom, isPlainObject } from "../parse-utils.js";

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
    const trimmed = stripBom(raw).trim();
    if (trimmed.length > 0) {
      try {
        const parsed = JSON.parse(trimmed);
        if (isPlainObject(parsed)) {
          existing = parsed as VsCodeMcpConfig;
        } else {
          console.warn(`Warning: ${configPath} is not a JSON object, creating fresh config.`);
          existing = {};
        }
      } catch {
        console.warn(`Warning: Could not parse ${configPath}, creating fresh config.`);
        existing = {};
      }
    }
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
