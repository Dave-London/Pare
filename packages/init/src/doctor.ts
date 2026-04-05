#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDoctorArgs, DOCTOR_HELP } from "./lib/args.js";
import { CLIENT_MAP } from "./lib/clients.js";
import { checkServer, validateServerPackage } from "./lib/doctor/health-check.js";
import { formatReport } from "./lib/doctor/report.js";
import { detectClients } from "./lib/detect.js";
import { promptClient } from "./lib/prompts.js";
import { extractPareServers } from "./lib/extract-servers.js";

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

  // 3. Health check each server (validate package names first)
  const results = [];
  for (const [id, config] of servers) {
    process.stdout.write(`  Checking ${id}...`);

    // Validate @paretools/* package names against the allowlist
    const validation = validateServerPackage(config.args);
    const validationWarning = !validation.valid ? validation.warning : undefined;
    if (validationWarning) {
      console.warn(`\n  Warning: ${validationWarning}`);
    }

    const result = await checkServer(id, config.command, config.args);
    if (validationWarning) {
      result.warning = validationWarning;
    }
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
