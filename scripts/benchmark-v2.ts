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
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { V2_SCENARIOS, type V2Scenario } from "./benchmark-v2-scenarios.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");
const BENCHMARKS_DIR = resolve(REPO_ROOT, "benchmarks");
const RESULTS_DIR = resolve(BENCHMARKS_DIR, "temp");

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
      "Use Frequency",
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
        s.scenario.useFrequency,
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

// ─── Mutating results reader ────────────────────────────────────

interface MutatingRow {
  ref: string;
  scenario: string;
  description: string;
  useFrequency: string;
  rawTokens: number;
  pareRegularTokens: number;
  pareCompactTokens: string; // may be empty
  saved: number;
  reductionPct: number;
  rawMs: number;
  pareMs: number;
  addedMs: number;
}

function readMutatingResults(): MutatingRow[] {
  const filePath = resolve(BENCHMARKS_DIR, "latest-mutating-results.csv");
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  // Skip header line
  const rows: MutatingRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 12) continue;
    rows.push({
      ref: parts[0],
      scenario: parts[1],
      description: parts[2],
      useFrequency: parts[3],
      rawTokens: parseInt(parts[4]) || 0,
      pareRegularTokens: parseInt(parts[5]) || 0,
      pareCompactTokens: parts[6],
      saved: parseInt(parts[7]) || 0,
      reductionPct: parseInt(parts[8]) || 0,
      rawMs: parseInt(parts[9]) || 0,
      pareMs: parseInt(parts[10]) || 0,
      addedMs: parseInt(parts[11]) || 0,
    });
  }
  return rows;
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ─── Combined output formatters ─────────────────────────────────

function formatCombinedDetailedCsv(
  reproducible: ScenarioSummary[],
  mutating: MutatingRow[],
): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      "#",
      "Scenario",
      "Description",
      "Use Frequency",
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

  // Build all rows with a sortable registry number
  interface CombinedRow {
    registryNum: number;
    csvLine: string;
  }
  const allRows: CombinedRow[] = [];

  // Add reproducible rows
  for (const s of reproducible) {
    const ref = `${s.scenario.registryNum}${s.scenario.variant}`;
    const compacted = s.medianPareTokens !== s.medianPareRegularTokens;
    const saved = s.medianRawTokens - s.medianPareTokens;
    const reductionPct =
      s.medianRawTokens > 0 ? Math.round((1 - s.medianPareTokens / s.medianRawTokens) * 100) : 0;
    const addedMs = s.medianPareLatencyMs - s.medianRawLatencyMs;
    allRows.push({
      registryNum: s.scenario.registryNum,
      csvLine: csvRow([
        ref,
        s.scenario.id,
        s.scenario.description,
        s.scenario.useFrequency,
        s.medianRawTokens,
        s.medianPareRegularTokens,
        compacted ? s.medianPareTokens : "",
        saved,
        reductionPct,
        s.medianRawLatencyMs,
        s.medianPareLatencyMs,
        addedMs,
      ]),
    });
  }

  // Add mutating rows
  for (const m of mutating) {
    const num = parseInt(m.ref.replace(/[A-Z]/g, "")) || 0;
    allRows.push({
      registryNum: num,
      csvLine: csvRow([
        m.ref,
        m.scenario,
        m.description,
        m.useFrequency,
        m.rawTokens,
        m.pareRegularTokens,
        m.pareCompactTokens,
        m.saved,
        m.reductionPct,
        m.rawMs,
        m.pareMs,
        m.addedMs,
      ]),
    });
  }

  // Sort by registry number
  allRows.sort((a, b) => a.registryNum - b.registryNum);
  for (const row of allRows) {
    lines.push(row.csvLine);
  }

  return lines.join("\n") + "\n";
}

function formatSummaryMd(
  reproducible: ScenarioSummary[],
  mutating: MutatingRow[],
  config: BenchmarkConfig,
  skipped: string[],
): string {
  const repRaw = reproducible.reduce((s, x) => s + x.medianRawTokens, 0);
  const repPare = reproducible.reduce((s, x) => s + x.medianPareTokens, 0);
  const repPct = repRaw > 0 ? Math.round((1 - repPare / repRaw) * 100) : 0;

  const mutRaw = mutating.reduce((s, m) => s + m.rawTokens, 0);
  const mutPare = mutating.reduce(
    (s, m) =>
      s +
      (m.pareCompactTokens
        ? parseInt(m.pareCompactTokens) || m.pareRegularTokens
        : m.pareRegularTokens),
    0,
  );
  const mutPct = mutRaw > 0 ? Math.round((1 - mutPare / mutRaw) * 100) : 0;

  const totalRaw = repRaw + mutRaw;
  const totalPare = repPare + mutPare;
  const totalPct = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;
  const totalScenarios = reproducible.length + mutating.length;

  // Top savers (reproducible only — we have full data)
  const sorted = [...reproducible].sort(
    (a, b) => b.medianRawTokens - b.medianPareTokens - (a.medianRawTokens - a.medianPareTokens),
  );
  const topSavers = sorted.slice(0, 5);

  // Worst overhead
  const worstOverhead = sorted.slice(-5).reverse();

  // Latency
  const addedMs = reproducible.map((s) => s.medianPareLatencyMs - s.medianRawLatencyMs);
  const medianAdded = computeMedian(addedMs);

  const lines = [
    `# Pare Benchmark Summary`,
    ``,
    `**Date**: ${new Date().toISOString().split("T")[0]}`,
    `**Platform**: ${process.platform} (${process.arch})`,
    `**Node**: ${process.version}`,
    `**Runs per scenario**: ${config.runs}`,
    ``,
    `## Overall`,
    ``,
    `| Metric | Value |`,
    `|---|---:|`,
    `| Total scenarios | ${totalScenarios} |`,
    `| Total raw tokens | ${totalRaw.toLocaleString()} |`,
    `| Total Pare tokens | ${totalPare.toLocaleString()} |`,
    `| Tokens saved | ${(totalRaw - totalPare).toLocaleString()} |`,
    `| **Overall reduction** | **${totalPct}%** |`,
    ``,
    `## Breakdown`,
    ``,
    `| Suite | Scenarios | Raw Tokens | Pare Tokens | Reduction |`,
    `|---|---:|---:|---:|---:|`,
    `| Reproducible | ${reproducible.length} | ${repRaw.toLocaleString()} | ${repPare.toLocaleString()} | ${repPct}% |`,
    `| Mutating (one-shot) | ${mutating.length} | ${mutRaw.toLocaleString()} | ${mutPare.toLocaleString()} | ${mutPct}% |`,
    ``,
    `## Top Token Savers`,
    ``,
    `| Scenario | Raw | Pare | Saved |`,
    `|---|---:|---:|---:|`,
    ...topSavers.map((s) => {
      const saved = s.medianRawTokens - s.medianPareTokens;
      return `| ${s.scenario.id} | ${s.medianRawTokens} | ${s.medianPareTokens} | ${saved} |`;
    }),
    ``,
    `## Worst Overhead`,
    ``,
    `| Scenario | Raw | Pare | Overhead |`,
    `|---|---:|---:|---:|`,
    ...worstOverhead.map((s) => {
      const overhead = s.medianPareTokens - s.medianRawTokens;
      return `| ${s.scenario.id} | ${s.medianRawTokens} | ${s.medianPareTokens} | +${overhead} |`;
    }),
    ``,
    `## Latency`,
    ``,
    `Median added latency (Pare vs raw CLI): **${Math.round(medianAdded)} ms**`,
    ``,
  ];

  if (skipped.length > 0) {
    lines.push(`## Skipped Scenarios`);
    lines.push(``);
    for (const s of skipped) {
      lines.push(`- ${s}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`See \`Benchmark-Detailed.csv\` for full per-scenario data.`);
  lines.push(``);

  return lines.join("\n");
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

  // Write intermediates to temp/
  writeFileSync(
    resolve(RESULTS_DIR, "results-detailed.csv"),
    formatDetailedCsv(summaries),
    "utf-8",
  );
  writeFileSync(resolve(RESULTS_DIR, "results-overall.csv"), formatOverallCsv(summaries), "utf-8");

  // Read mutating results and generate combined tracked outputs
  const mutatingRows = readMutatingResults();
  writeFileSync(
    resolve(BENCHMARKS_DIR, "Benchmark-Detailed.csv"),
    formatCombinedDetailedCsv(summaries, mutatingRows),
    "utf-8",
  );
  writeFileSync(
    resolve(BENCHMARKS_DIR, "Benchmark-Summary.md"),
    formatSummaryMd(summaries, mutatingRows, config, skipped),
    "utf-8",
  );

  log("");
  log(`Intermediates written to ${RESULTS_DIR}/`);
  log(`Combined results written to ${BENCHMARKS_DIR}/`);
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
  if (mutatingRows.length > 0) {
    log(`Combined with ${mutatingRows.length} mutating scenarios in Benchmark-Detailed.csv`);
  }

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
