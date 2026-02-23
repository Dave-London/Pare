#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInitArgs, INIT_HELP } from "./lib/args.js";
import { CLIENT_MAP } from "./lib/clients.js";
import { PRESET_MAP } from "./lib/presets.js";
import { resolveServers } from "./lib/servers.js";
import { mergeConfig, realFs, memoryFs } from "./lib/merge.js";
import { promptClient, promptServers } from "./lib/prompts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const args = parseInitArgs(process.argv.slice(2));

  if (args.help) {
    console.log(INIT_HELP);
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
      console.error(`Available clients: ${[...CLIENT_MAP.keys()].join(", ")}`);
      process.exit(1);
    }
  } else {
    client = await promptClient();
  }

  // 2. Resolve servers
  let servers;
  if (args.preset) {
    const preset = PRESET_MAP.get(args.preset);
    if (!preset) {
      console.error(`Unknown preset: ${args.preset}`);
      console.error(`Available presets: ${[...PRESET_MAP.keys()].join(", ")}`);
      process.exit(1);
    }
    servers = resolveServers(preset.serverIds);
  } else {
    servers = await promptServers();
  }

  // 3. Merge config
  const projectDir = process.cwd();
  const fs = args.dryRun ? memoryFs() : realFs();
  const result = mergeConfig(client, servers, projectDir, fs);

  // 4. Print summary
  if (args.dryRun) {
    console.log(`\n[dry-run] Would write to: ${result.configPath}\n`);
    console.log(result.output);
  } else {
    if (result.backupPath) {
      console.log(`\nBacked up existing config to: ${result.backupPath}`);
    }
    console.log(`\nWrote ${result.serverCount} Pare servers to: ${result.configPath}`);
    console.log(`\nServers added: ${servers.map((s) => s.id).join(", ")}`);
    console.log(`\nRestart your ${client.name} session to activate the new servers.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
