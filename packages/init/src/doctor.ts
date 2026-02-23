#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDoctorArgs, DOCTOR_HELP } from "./lib/args.js";
import { CLIENT_MAP, resolveConfigPath, type ClientEntry } from "./lib/clients.js";
import { checkServer } from "./lib/doctor/health-check.js";
import { formatReport } from "./lib/doctor/report.js";
import { detectClients } from "./lib/detect.js";
import { promptClient } from "./lib/prompts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

interface ServerConfig {
  command: string;
  args: string[];
}

/** Extract Pare server entries from a client's config file. */
function extractPareServers(client: ClientEntry, projectDir: string): Map<string, ServerConfig> {
  const configPath = resolveConfigPath(client.configPath, projectDir);
  if (!existsSync(configPath)) {
    return new Map();
  }

  const raw = readFileSync(configPath, "utf-8");
  const servers = new Map<string, ServerConfig>();

  if (client.format === "json-mcpservers") {
    const config = JSON.parse(raw) as { mcpServers?: Record<string, ServerConfig> };
    if (config.mcpServers) {
      for (const [key, val] of Object.entries(config.mcpServers)) {
        if (key.startsWith("pare-")) {
          servers.set(key, val);
        }
      }
    }
  } else if (client.format === "json-vscode") {
    const config = JSON.parse(raw) as {
      servers?: Record<string, { type: string; command: string; args: string[] }>;
    };
    if (config.servers) {
      for (const [key, val] of Object.entries(config.servers)) {
        if (key.startsWith("pare-")) {
          servers.set(key, { command: val.command, args: val.args });
        }
      }
    }
  } else if (client.format === "json-zed") {
    const config = JSON.parse(raw) as {
      context_servers?: Record<string, { command: string; args: string[] }>;
    };
    if (config.context_servers) {
      for (const [key, val] of Object.entries(config.context_servers)) {
        if (key.startsWith("pare-")) {
          servers.set(key, { command: val.command, args: val.args });
        }
      }
    }
  }
  // TOML and YAML formats would need additional parsing — skip for now
  // as doctor focuses on the most common clients

  return servers;
}

async function main(): Promise<void> {
  const args = parseDoctorArgs(process.argv.slice(2));

  if (args.help) {
    console.log(DOCTOR_HELP);
    return;
  }

  if (args.version) {
    console.log(getVersion());
    return;
  }

  // 1. Resolve client
  let client;
  if (args.client) {
    client = CLIENT_MAP.get(args.client);
    if (!client) {
      console.error(`Unknown client: ${args.client}`);
      process.exit(1);
    }
  } else {
    const detected = detectClients();
    if (detected.length === 1) {
      client = detected[0];
    } else {
      client = await promptClient();
    }
  }

  // 2. Extract Pare servers from config
  const projectDir = process.cwd();
  const servers = extractPareServers(client, projectDir);

  if (servers.size === 0) {
    console.log(`\nNo Pare servers found in ${client.name} config.`);
    console.log(`Run 'npx @paretools/init' to set up servers first.`);
    return;
  }

  console.log(`\nChecking ${servers.size} Pare server(s) for ${client.name}...\n`);

  // 3. Health check each server
  const results = [];
  for (const [id, config] of servers) {
    process.stdout.write(`  Checking ${id}...`);
    const result = await checkServer(id, config.command, config.args);
    process.stdout.write(` ${result.status === "pass" ? "OK" : "FAILED"}\n`);
    results.push(result);
  }

  // 4. Print report
  console.log(formatReport(results));

  const failed = results.filter((r) => r.status === "fail").length;
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
