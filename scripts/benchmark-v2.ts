#!/usr/bin/env npx tsx
/**
 * Pare Token Benchmark v2 — Multi-Scenario Runner
 *
 * Runs 10 tools × 3 scenarios = 30 benchmarks.
 * Each scenario pairs a raw CLI command with its equivalent Pare MCP tool.
 * Outputs CSV to benchmark-results/.
 *
 * Usage:
 *   npx tsx scripts/benchmark-v2.ts
 *   npx tsx scripts/benchmark-v2.ts --runs 3
 *   npx tsx scripts/benchmark-v2.ts --scenario log-5
 *   npx tsx scripts/benchmark-v2.ts --scenario log-5,log-20
 *   npx tsx scripts/benchmark-v2.ts --scenario 5A        (by registry #)
 *   npx tsx scripts/benchmark-v2.ts --scenario blame      (substring match)
 */

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { V2_SCENARIOS, type V2Scenario } from "./benchmark-v2-scenarios.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmark-results");

// Extend PATH for user-local tool installs (rg, make, mypy, ruff, black)
if (process.platform === "win32") {
  const home = process.env.USERPROFILE ?? "";
  const extraPaths = [
    resolve(home, ".local", "bin"),
    resolve(home, "AppData", "Roaming", "Python", "Python313", "Scripts"),
  ];
  process.env.PATH = extraPaths.join(";") + ";" + (process.env.PATH ?? "");
}

// ─── Types ────────────────────────────────────────────────────────

interface RunResult {
  scenarioId: string;
  rawTokens: number;
  pareTokens: number;
  pareRegularTokens: number;
  reduction: number;
  rawLatencyMs: number;
  pareLatencyMs: number;
  rawOutput: string;
  pareOutput: string;
  pareRegularOutput: string;
}

interface ScenarioSummary {
  scenario: V2Scenario;
  medianRawTokens: number;
  medianPareTokens: number;
  medianPareRegularTokens: number;
  medianReduction: number;
  medianRawLatencyMs: number;
  medianPareLatencyMs: number;
  runs: RunResult[];
}

interface BenchmarkConfig {
  runs: number;
  verbose: boolean;
  filter: string[];
}

// ─── Utilities ────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function csvEscape(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(vals: (string | number)[]): string {
  return vals.map(csvEscape).join(",");
}

function parseArgs(argv: string[] = process.argv.slice(2)): BenchmarkConfig {
  const config: BenchmarkConfig = { runs: 1, verbose: false, filter: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runs") {
      const n = parseInt(argv[++i], 10);
      if (isNaN(n) || n < 1) throw new Error(`Invalid --runs: ${argv[i]}`);
      config.runs = n;
    } else if (argv[i] === "--verbose") {
      config.verbose = true;
    } else if (argv[i] === "--scenario") {
      config.filter.push(...argv[++i].split(","));
    }
  }
  return config;
}

// ─── Tool availability ───────────────────────────────────────────

function isToolAvailable(cmd: string): Promise<boolean> {
  const whichCmd = process.platform === "win32" ? "where" : "which";
  return new Promise((res) => {
    execFile(whichCmd, [cmd], { shell: process.platform === "win32" }, (error) => {
      res(!error);
    });
  });
}

// ─── Raw CLI runner ──────────────────────────────────────────────

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ output: string; latencyMs: number }> {
  const start = performance.now();
  return new Promise((res) => {
    execFile(
      cmd,
      args,
      { cwd, timeout: 120_000, shell: process.platform === "win32" },
      (_error, stdout, stderr) => {
        const latencyMs = Math.round(performance.now() - start);
        res({ output: stdout + stderr, latencyMs });
      },
    );
  });
}

// ─── MCP Server connection ──────────────────────────────────────

async function connectServer(
  serverPath: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    stderr: "pipe",
    env: Object.fromEntries(
      Object.entries(process.env).filter((e): e is [string, string] => e[1] != null),
    ),
  });
  const client = new Client({ name: "benchmark-v2", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport };
}

// ─── Scenario runner ────────────────────────────────────────────

function resolveScenarioArgs(args: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.includes("__PACKAGE_PATH__")) {
      resolved[key] = value.replace("__PACKAGE_PATH__", REPO_ROOT);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function extractPareOutput(pareResult: Awaited<ReturnType<Client["callTool"]>>): string {
  if (pareResult.structuredContent != null) {
    return JSON.stringify(pareResult.structuredContent, null, 2);
  }
  const texts =
    (pareResult.content as Array<{ type: string; text?: string }>)
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n") ?? "";
  return texts;
}

async function runScenario(scenario: V2Scenario, client: Client): Promise<RunResult> {
  const cwd = scenario.rawCwd ? resolve(REPO_ROOT, scenario.rawCwd) : REPO_ROOT;

  // Run raw CLI
  const raw = await runCommand(scenario.rawCommand, scenario.rawArgs, cwd);

  // Run Pare tool (default — compact may activate)
  const pareArgs = resolveScenarioArgs(scenario.pareArgs);
  const pareStart = performance.now();
  const pareResult = await client.callTool(
    {
      name: scenario.pareTool,
      arguments: pareArgs,
    },
    undefined,
    { timeout: 120_000 },
  );
  const pareLatencyMs = Math.round(performance.now() - pareStart);
  const pareOutput = extractPareOutput(pareResult);

  // Run Pare tool again with compact=false to get full schema
  const pareRegularResult = await client.callTool(
    {
      name: scenario.pareTool,
      arguments: { ...pareArgs, compact: false },
    },
    undefined,
    { timeout: 120_000 },
  );
  const pareRegularOutput = extractPareOutput(pareRegularResult);

  const rawTokens = estimateTokens(raw.output);
  const pareTokens = estimateTokens(pareOutput);
  const pareRegularTokens = estimateTokens(pareRegularOutput);
  const reduction = rawTokens > 0 ? Math.round((1 - pareTokens / rawTokens) * 100) : 0;

  return {
    scenarioId: scenario.id,
    rawTokens,
    pareTokens,
    pareRegularTokens,
    reduction,
    rawLatencyMs: raw.latencyMs,
    pareLatencyMs,
    rawOutput: raw.output,
    pareOutput,
    pareRegularOutput,
  };
}

// ─── CSV formatters ─────────────────────────────────────────────

function formatDetailedCsv(scenarios: ScenarioSummary[]): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      "#",
      "Scenario",
      "Description",
      "Weight %",
      "Raw Tokens",
      "Pare Regular",
      "Pare Compact",
      "Saved",
      "Reduction %",
      "Raw ms",
      "Pare ms",
      "Added ms",
    ]),
  );

  for (const s of scenarios) {
    const ref = `${s.scenario.registryNum}${s.scenario.variant}`;
    const compacted = s.medianPareTokens !== s.medianPareRegularTokens;
    const saved = s.medianRawTokens - s.medianPareTokens;
    const reductionPct =
      s.medianRawTokens > 0 ? Math.round((1 - s.medianPareTokens / s.medianRawTokens) * 100) : 0;
    const addedMs = s.medianPareLatencyMs - s.medianRawLatencyMs;
    lines.push(
      csvRow([
        ref,
        s.scenario.id,
        s.scenario.description,
        s.scenario.weight,
        s.medianRawTokens,
        s.medianPareRegularTokens,
        compacted ? s.medianPareTokens : "",
        saved,
        reductionPct,
        s.medianRawLatencyMs,
        s.medianPareLatencyMs,
        addedMs,
      ]),
    );
  }

  return lines.join("\n") + "\n";
}

function formatOverallCsv(scenarios: ScenarioSummary[]): string {
  const totalRaw = scenarios.reduce((s, x) => s + x.medianRawTokens, 0);
  const totalPare = scenarios.reduce((s, x) => s + x.medianPareTokens, 0);
  const saved = totalRaw - totalPare;
  const pct = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;

  const lines = [
    csvRow(["Scenarios", "Total Raw", "Total Pare", "Saved", "Reduction %"]),
    csvRow([scenarios.length, totalRaw, totalPare, saved, pct]),
  ];
  return lines.join("\n") + "\n";
}

// ─── Output ─────────────────────────────────────────────────────

function cleanResultsDir(): void {
  if (existsSync(RESULTS_DIR)) {
    rmSync(RESULTS_DIR, { recursive: true, force: true });
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
}

// ─── Main ───────────────────────────────────────────────────────

function matchesFilter(scenario: V2Scenario, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const id = scenario.id.toLowerCase();
  const ref = `${scenario.registryNum}${scenario.variant}`.toLowerCase();
  return filters.some((f) => {
    const fl = f.toLowerCase();
    // Exact match on id or ref (e.g. "log-5" or "5A")
    if (id === fl || ref === fl) return true;
    // Substring match only if filter doesn't match any id exactly
    // (prevents "log-5" from also matching "log-50")
    const hasExactMatch = V2_SCENARIOS.some(
      (s) => s.id.toLowerCase() === fl || `${s.registryNum}${s.variant}`.toLowerCase() === fl,
    );
    if (hasExactMatch) return false;
    // Substring/prefix match for broad filters like "blame", "log", "npm"
    return id.includes(fl);
  });
}

async function main() {
  const config = parseArgs();
  const scenarios =
    config.filter.length > 0
      ? V2_SCENARIOS.filter((s) => matchesFilter(s, config.filter))
      : V2_SCENARIOS;

  if (scenarios.length === 0) {
    process.stderr.write(`No scenarios match filter: ${config.filter.join(", ")}\n`);
    process.stderr.write(`Available: ${V2_SCENARIOS.map((s) => s.id).join(", ")}\n`);
    process.exit(1);
  }

  const log = (msg: string) => process.stderr.write(msg + "\n");

  log("Pare Token Benchmark v2 — Multi-Scenario");
  log(`Date: ${new Date().toISOString().split("T")[0]}`);
  log(`Platform: ${process.platform}`);
  log(`Node: ${process.version}`);
  log(
    `Runs: ${config.runs}, Scenarios: ${scenarios.length}${config.filter.length > 0 ? ` (filtered: ${config.filter.join(", ")})` : ""}`,
  );
  log("");

  // Check tool availability
  const available: V2Scenario[] = [];
  const skipped: string[] = [];
  const checkedCommands = new Map<string, boolean>();

  for (const s of scenarios) {
    const cmd = s.rawCommand === "npx" ? "npx" : s.rawCommand;
    if (!checkedCommands.has(cmd)) {
      checkedCommands.set(cmd, await isToolAvailable(cmd));
    }
    if (checkedCommands.get(cmd)) {
      available.push(s);
    } else {
      skipped.push(s.id);
      log(`⚠ Skipping ${s.id}: '${cmd}' not found`);
    }
  }

  if (available.length === 0) {
    log("No scenarios to run. Exiting.");
    process.exit(1);
  }

  // Connect to unique servers
  const serverMap = new Map<string, { client: Client; transport: StdioClientTransport }>();

  for (const s of available) {
    if (!serverMap.has(s.pareServer)) {
      const serverPath = resolve(REPO_ROOT, `packages/${s.pareServer}/dist/index.js`);
      log(`Connecting to ${s.pareServer}...`);
      try {
        const conn = await connectServer(serverPath);
        serverMap.set(s.pareServer, conn);
      } catch (err) {
        log(`✗ Failed to connect to ${s.pareServer}: ${err}`);
        const ids = available.filter((a) => a.pareServer === s.pareServer).map((a) => a.id);
        for (const id of ids) {
          skipped.push(id);
          const idx = available.findIndex((a) => a.id === id);
          if (idx >= 0) available.splice(idx, 1);
        }
      }
    }
  }

  // Run scenarios
  const allRuns = new Map<string, RunResult[]>();

  for (const s of available) {
    const conn = serverMap.get(s.pareServer);
    if (!conn) continue;

    log(
      `Running ${s.registryNum}${s.variant} ${s.id} (${config.runs} run${config.runs > 1 ? "s" : ""})...`,
    );
    const runs: RunResult[] = [];

    for (let i = 0; i < config.runs; i++) {
      try {
        const result = await runScenario(s, conn.client);
        runs.push(result);
        process.stderr.write(
          `  run ${i + 1}/${config.runs}: raw=${result.rawTokens} pare=${result.pareTokens} regular=${result.pareRegularTokens} (${result.reduction}%)\n`,
        );
      } catch (err) {
        log(`  ✗ run ${i + 1} failed: ${err}`);
      }
    }

    if (runs.length > 0) {
      allRuns.set(s.id, runs);
    } else {
      skipped.push(s.id);
    }
  }

  // Compute summaries
  const summaries: ScenarioSummary[] = [];

  for (const s of available) {
    const runs = allRuns.get(s.id);
    if (!runs || runs.length === 0) continue;

    summaries.push({
      scenario: s,
      medianRawTokens: Math.round(computeMedian(runs.map((r) => r.rawTokens))),
      medianPareTokens: Math.round(computeMedian(runs.map((r) => r.pareTokens))),
      medianPareRegularTokens: Math.round(computeMedian(runs.map((r) => r.pareRegularTokens))),
      medianReduction: Math.round(computeMedian(runs.map((r) => r.reduction))),
      medianRawLatencyMs: Math.round(computeMedian(runs.map((r) => r.rawLatencyMs))),
      medianPareLatencyMs: Math.round(computeMedian(runs.map((r) => r.pareLatencyMs))),
      runs,
    });
  }

  // Write output
  cleanResultsDir();

  writeFileSync(
    resolve(RESULTS_DIR, "results-detailed.csv"),
    formatDetailedCsv(summaries),
    "utf-8",
  );
  writeFileSync(resolve(RESULTS_DIR, "results-overall.csv"), formatOverallCsv(summaries), "utf-8");

  log("");
  log(`Results written to ${RESULTS_DIR}/`);
  if (skipped.length > 0) {
    log(`Skipped: ${skipped.join(", ")}`);
  }

  // Print quick summary to stderr
  const totalRaw = summaries.reduce((s, x) => s + x.medianRawTokens, 0);
  const totalPare = summaries.reduce((s, x) => s + x.medianPareTokens, 0);
  const overallPct = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;
  log(
    `\nOverall: ${summaries.length} scenarios, ${totalRaw} raw → ${totalPare} pare (${overallPct}% reduction)`,
  );

  // Close all server connections
  for (const [, conn] of serverMap) {
    try {
      await conn.transport.close();
    } catch {
      // ignore cleanup errors
    }
  }

  log("\nDone.");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
