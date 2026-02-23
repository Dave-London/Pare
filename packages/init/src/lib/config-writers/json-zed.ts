import type { FileSystem } from "../merge.js";
import type { ServerEntry } from "../servers.js";
import { npxCommand } from "../platform.js";

interface ZedSettings {
  context_servers?: Record<
    string,
    { command: string; args: string[]; env: Record<string, string> }
  >;
  [key: string]: unknown;
}

/**
 * Merge Pare server entries into Zed's settings.json.
 * Format: context_servers key with env field.
 */
export function writeZedConfig(configPath: string, servers: ServerEntry[], fs: FileSystem): string {
  let existing: ZedSettings = {};
  const raw = fs.readFile(configPath);
  if (raw !== undefined) {
    existing = JSON.parse(raw) as ZedSettings;
  }

  if (!existing.context_servers) {
    existing.context_servers = {};
  }

  for (const s of servers) {
    const { command, args } = npxCommand(s.pkg);
    existing.context_servers[s.id] = { command, args, env: {} };
  }

  const output = JSON.stringify(existing, null, 2) + "\n";
  fs.writeFile(configPath, output);
  return output;
}
