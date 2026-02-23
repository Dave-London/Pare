import YAML from "yaml";
import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";

interface ContinueConfig {
  name?: string;
  version?: string;
  schema?: string;
  mcpServers?: Array<{ name: string; type: string; command: string; args: string[] }>;
}

/**
 * Merge Pare server entries into Continue.dev's pare.yaml.
 * Format: mcpServers array with name, type, command, args.
 */
export function writeContinueConfig(
  configPath: string,
  servers: ServerEntry[],
  fs: FileSystem,
): string {
  let existing: ContinueConfig = {};
  const raw = fs.readFile(configPath);
  if (raw !== undefined) {
    existing = YAML.parse(raw) as ContinueConfig;
  }

  if (!existing.name) existing.name = "Pare Tools";
  if (!existing.version) existing.version = "0.0.1";
  if (!existing.schema) existing.schema = "v1";
  if (!existing.mcpServers) existing.mcpServers = [];

  // Build a set of existing Pare server names for replacement
  const existingNames = new Set(existing.mcpServers.map((s) => s.name));

  for (const s of servers) {
    const { command, args } = npxCommand(s.pkg);
    const entry = { name: s.id, type: "stdio", command, args };

    if (existingNames.has(s.id)) {
      // Replace existing entry
      const idx = existing.mcpServers.findIndex((e) => e.name === s.id);
      existing.mcpServers[idx] = entry;
    } else {
      existing.mcpServers.push(entry);
    }
  }

  const output = YAML.stringify(existing);
  fs.writeFile(configPath, output);
  return output;
}
