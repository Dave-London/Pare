import { existsSync, readFileSync } from "node:fs";
import { parse as parseToml } from "smol-toml";
import YAML from "yaml";
import { resolveConfigPath, type ClientEntry } from "./clients.js";
import { parseJsonc } from "./parse-utils.js";

export interface ServerConfig {
  command: string;
  args: string[];
}

/** Extract Pare server entries from a client's config file. */
export function extractPareServers(
  client: ClientEntry,
  projectDir: string,
): Map<string, ServerConfig> {
  const configPath = resolveConfigPath(client.configPath, projectDir);
  if (!existsSync(configPath)) {
    return new Map();
  }

  const raw = readFileSync(configPath, "utf-8");
  const servers = new Map<string, ServerConfig>();

  try {
    if (client.format === "json-mcpservers") {
      const config = parseJsonc(raw) as { mcpServers?: Record<string, ServerConfig> };
      if (config?.mcpServers) {
        for (const [key, val] of Object.entries(config.mcpServers)) {
          if (key.startsWith("pare-")) {
            servers.set(key, val);
          }
        }
      }
    } else if (client.format === "json-vscode") {
      const config = parseJsonc(raw) as {
        servers?: Record<string, { type: string; command: string; args: string[] }>;
      };
      if (config?.servers) {
        for (const [key, val] of Object.entries(config.servers)) {
          if (key.startsWith("pare-")) {
            servers.set(key, { command: val.command, args: val.args });
          }
        }
      }
    } else if (client.format === "json-zed") {
      const config = parseJsonc(raw) as {
        context_servers?: Record<string, { command: string; args: string[] }>;
      };
      if (config?.context_servers) {
        for (const [key, val] of Object.entries(config.context_servers)) {
          if (key.startsWith("pare-")) {
            servers.set(key, { command: val.command, args: val.args });
          }
        }
      }
    } else if (client.format === "toml-codex") {
      const config = parseToml(raw) as unknown as {
        mcp_servers?: Record<string, ServerConfig>;
      };
      if (config?.mcp_servers) {
        for (const [key, val] of Object.entries(config.mcp_servers)) {
          if (key.startsWith("pare-")) {
            servers.set(key, val);
          }
        }
      }
    } else if (client.format === "yaml-continue") {
      const config = YAML.parse(raw) as {
        mcpServers?: Array<{ name: string; command: string; args: string[] }>;
      };
      if (config?.mcpServers) {
        for (const entry of config.mcpServers) {
          if (entry.name.startsWith("pare-")) {
            servers.set(entry.name, { command: entry.command, args: entry.args });
          }
        }
      }
    }
  } catch {
    // Silently ignore parse errors — caller handles empty result
  }

  return servers;
}
