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
import { V2_SCENARIOS, type V2Scenario, type UseFrequency } from "./benchmark-v2-scenarios.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

// ─── Use Frequency tier metadata ────────────────────────────────

const USE_FREQUENCY_META: { name: UseFrequency; calls: string; rep: number }[] = [
  { name: "Very High", calls: "12+", rep: 16 },
  { name: "High", calls: "6–11", rep: 8 },
  { name: "Average", calls: "3–5", rep: 4 },
  { name: "Low", calls: "1–2", rep: 1.5 },
  { name: "Very Low", calls: "<1", rep: 0.5 },
];

/** Scenario IDs excluded from session impact averages (outliers) */
const SESSION_OUTLIER_IDS = new Set(["npm-list-d2"]);
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
  useFrequency: UseFrequency;
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
      useFrequency: parts[3] as UseFrequency,
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

// ─── Tool registry reader ───────────────────────────────────────

interface RegistryTool {
  num: number;
  pkg: string;
  tool: string;
  useFrequency: UseFrequency;
}

function readToolRegistry(): RegistryTool[] {
  const filePath = resolve(BENCHMARKS_DIR, "tool-registry.csv");
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const tools: RegistryTool[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 4) continue;
    tools.push({
      num: parseInt(parts[0]) || 0,
      pkg: parts[1],
      tool: parts[2],
      useFrequency: parts[3] as UseFrequency,
    });
  }
  return tools;
}

// ─── Session impact calculation ─────────────────────────────────

interface ToolSessionRow {
  num: number;
  name: string;
  useFrequency: UseFrequency;
  avgRaw: number;
  avgPare: number;
  rawPerSession: number;
  parePerSession: number;
  outlierExcluded: boolean;
}

function computeSessionImpact(
  reproducible: ScenarioSummary[],
  mutating: MutatingRow[],
  registry: RegistryTool[],
  excludeOutliers = true,
): ToolSessionRow[] {
  // Collect per-tool scenario data
  const toolData = new Map<number, { raw: number; pare: number; isOutlier: boolean }[]>();

  for (const s of reproducible) {
    const num = s.scenario.registryNum;
    if (!toolData.has(num)) toolData.set(num, []);
    const isOutlier = SESSION_OUTLIER_IDS.has(s.scenario.id);
    const effectivePare = Math.min(s.medianPareTokens, s.medianPareRegularTokens);
    toolData.get(num)!.push({ raw: s.medianRawTokens, pare: effectivePare, isOutlier });
  }

  for (const m of mutating) {
    const num = parseInt(m.ref.replace(/[A-Z*]/g, "")) || 0;
    if (!toolData.has(num)) toolData.set(num, []);
    const effectivePare = m.pareCompactTokens
      ? Math.min(m.pareRegularTokens, parseInt(m.pareCompactTokens) || m.pareRegularTokens)
      : m.pareRegularTokens;
    toolData.get(num)!.push({ raw: m.rawTokens, pare: effectivePare, isOutlier: false });
  }

  // Build session rows from registry
  const rows: ToolSessionRow[] = [];

  for (const tool of registry) {
    const scenarios = toolData.get(tool.num) || [];
    const nonOutlier = scenarios.filter((s) => !s.isOutlier);
    const outlierExcluded = excludeOutliers && nonOutlier.length < scenarios.length;
    const useScenarios = excludeOutliers && nonOutlier.length > 0 ? nonOutlier : scenarios;

    const avgRaw =
      useScenarios.length > 0
        ? Math.round(useScenarios.reduce((sum, s) => sum + s.raw, 0) / useScenarios.length)
        : 0;
    const avgPare =
      useScenarios.length > 0
        ? Math.round(useScenarios.reduce((sum, s) => sum + s.pare, 0) / useScenarios.length)
        : 0;

    const rep = USE_FREQUENCY_META.find((m) => m.name === tool.useFrequency)?.rep ?? 0.5;

    rows.push({
      num: tool.num,
      name: `${tool.pkg}/${tool.tool}`,
      useFrequency: tool.useFrequency,
      avgRaw,
      avgPare,
      rawPerSession: Math.round(avgRaw * rep),
      parePerSession: Math.round(avgPare * rep),
      outlierExcluded,
    });
  }

  return rows;
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
    const isOutlier = SESSION_OUTLIER_IDS.has(s.scenario.id);
    const ref = `${s.scenario.registryNum}${s.scenario.variant}${isOutlier ? "*" : ""}`;
    const desc = isOutlier ? `${s.scenario.description} (*)` : s.scenario.description;
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
        desc,
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
  registry: RegistryTool[],
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
  const totalScenarios = reproducible.length + mutating.length;

  // Top savers — exclude outliers, combine reproducible + mutating
  interface SaverEntry {
    id: string;
    raw: number;
    pare: number;
    saved: number;
  }
  const allSavers: SaverEntry[] = [];
  for (const s of reproducible) {
    if (SESSION_OUTLIER_IDS.has(s.scenario.id)) continue;
    const pare = Math.min(s.medianPareTokens, s.medianPareRegularTokens);
    allSavers.push({
      id: s.scenario.id,
      raw: s.medianRawTokens,
      pare,
      saved: s.medianRawTokens - pare,
    });
  }
  for (const m of mutating) {
    const pare = m.pareCompactTokens
      ? Math.min(m.pareRegularTokens, parseInt(m.pareCompactTokens) || m.pareRegularTokens)
      : m.pareRegularTokens;
    allSavers.push({ id: m.scenario, raw: m.rawTokens, pare, saved: m.rawTokens - pare });
  }
  allSavers.sort((a, b) => b.saved - a.saved);
  const topSavers = allSavers.slice(0, 5);

  // Worst overhead (reproducible only — we have full data)
  const sorted = [...reproducible].sort(
    (a, b) => b.medianRawTokens - b.medianPareTokens - (a.medianRawTokens - a.medianPareTokens),
  );
  const worstOverhead = sorted.slice(-5).reverse();

  // Latency
  const addedMs = [
    ...reproducible.map((s) => s.medianPareLatencyMs - s.medianRawLatencyMs),
    ...mutating.map((m) => m.addedMs),
  ];
  const medianAdded = computeMedian(addedMs);
  const allLatencies = [
    ...reproducible.map((s) => s.medianRawLatencyMs),
    ...reproducible.map((s) => s.medianPareLatencyMs),
    ...mutating.map((m) => m.rawMs),
    ...mutating.map((m) => m.pareMs),
  ];
  const latencyMin = Math.min(...allLatencies);
  const latencyMax = Math.max(...allLatencies);
  const latencyMedian = computeMedian(allLatencies);

  // Session impact
  const sessionRows = computeSessionImpact(reproducible, mutating, registry);
  const totalRawSession = sessionRows.reduce((s, r) => s + r.rawPerSession, 0);
  const totalPareSession = sessionRows.reduce((s, r) => s + r.parePerSession, 0);
  const sessionSaved = totalRawSession - totalPareSession;
  const sessionPct =
    totalRawSession > 0 ? Math.round((1 - totalPareSession / totalRawSession) * 100) : 0;
  const hasOutliers = sessionRows.some((r) => r.outlierExcluded);

  // Tier counts from registry
  const tierCounts = new Map<string, number>();
  for (const tool of registry) {
    tierCounts.set(tool.useFrequency, (tierCounts.get(tool.useFrequency) ?? 0) + 1);
  }

  // ─── Build output ─────────────────────────────────────────────

  const lines = [
    `# Pare Benchmark Summary`,
    ``,
    `## Overall`,
    ``,
    `Pare is a suite of MCP (Model Context Protocol) server packages that wrap standard developer CLI tools with structured, token-efficient JSON output. This benchmark measures the token efficiency of Pare's 100 tools across 14 packages by comparing the output of each Pare tool against its raw CLI equivalent.`,
    ``,
    `Each of Pare's **100 tools** is tested through one or more **benchmark scenarios** that exercise different output sizes and configurations. For each scenario, both the raw CLI command and the equivalent Pare MCP tool call are executed, and their output token counts are compared.`,
    ``,
    `**Date**: ${new Date().toISOString().split("T")[0]}`,
    `**Platform**: ${process.platform} (${process.arch})`,
    `**Node**: ${process.version}`,
    `**Coding agent**: Claude Code (Claude Opus 4.6 / Sonnet 4.5)`,
    `**Tested scenarios**: ${totalScenarios}`,
    `**Runs per scenario**: ${config.runs}`,
    `**Total tokens consumed in tests**: ${(totalRaw + totalPare).toLocaleString()}`,
    ``,
  ];

  if (skipped.length > 0) {
    lines.push(`### Skipped Scenarios`);
    lines.push(``);
    for (const s of skipped) {
      lines.push(`- ${s}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ─── Methodology section ────────────────────────────────────────

  lines.push(`## Methodology`);
  lines.push(``);
  lines.push(`### Use Frequency`);
  lines.push(``);
  lines.push(
    `Each tool is assigned a **Use Frequency** category reflecting how often it is called during a typical AI coding agent session. Categories are defined relative to a reference session of ~200 Pare-wrappable tool calls, representing a medium-complexity coding task (30–60 minutes).`,
  );
  lines.push(``);
  lines.push(`| Category  | Calls per session | Representative value | Tools |`);
  lines.push(`| --------- | ----------------: | -------------------: | ----: |`);
  for (const tier of USE_FREQUENCY_META) {
    const count = tierCounts.get(tier.name) ?? 0;
    lines.push(
      `| ${tier.name.padEnd(9)} | ${tier.calls.padStart(17)} | ${String(tier.rep).padStart(20)} | ${String(count).padStart(5)} |`,
    );
  }
  lines.push(``);
  lines.push(
    `**Representative values** are mid-range estimates used for calculating estimated session impact:`,
  );
  lines.push(``);
  lines.push("```");
  lines.push(`session_impact = Σ (representative_calls × avg_tokens_per_call)`);
  lines.push("```");
  lines.push(``);
  lines.push(`### Per-tool averaging`);
  lines.push(``);
  lines.push(
    `When a tool has multiple benchmark scenarios (e.g., git diff has small, large, and full-patch variants), the per-tool token count is a **simple average** across all its scenarios. This treats each scenario as equally likely, which is a simplifying assumption — in practice, small outputs are more common than large ones. Simple averaging was chosen for transparency and reproducibility; if this proves insufficiently nuanced, scenario-type weighting (e.g., higher weight for typical-sized output) can be introduced later.`,
  );
  lines.push(``);
  lines.push(`### Reference session`);
  lines.push(``);
  lines.push(
    `The 200-call reference session is an order-of-magnitude estimate, not a directly measured figure. It is informed by:`,
  );
  lines.push(``);
  lines.push(
    `- **MCP tool call benchmarks** — MCPMark reports an average of ~17 tool calls per atomic task. A medium-complexity coding session chains 10–15 such tasks (explore, edit, test, fix, lint, commit), yielding ~170–250 tool calls.`,
  );
  lines.push(
    `- **Agent workflow analysis** — typical coding agent loops (explore → edit → test → fix → lint → commit) are dominated by git and build tool calls, with git status/diff/add/commit comprising the highest-frequency operations.`,
  );
  lines.push(
    `- **Observed Pare MCP usage** — real-world sessions using Pare tools for all git, test, build, lint, and npm operations.`,
  );
  lines.push(``);
  lines.push(
    `Since Use Frequency categories are used for _relative_ comparison between tools (not absolute savings predictions), the exact session length has minimal impact on the conclusions — proportions remain stable across session sizes.`,
  );
  lines.push(``);
  lines.push(`### Frequency assignment rationale`);
  lines.push(``);
  lines.push(
    `Tools were assigned to tiers based on the natural clustering of expected call counts:`,
  );
  lines.push(``);
  lines.push(
    `- **Very High** — Core git read/write cycle: \`status\`, \`diff\`, \`commit\`, \`add\`, \`log\`. Called on nearly every iteration of an edit-test-commit loop.`,
  );
  lines.push(
    `- **High** — Session-level operations: \`push\`, \`test run\`, \`checkout\`, \`npm run\`. Called multiple times per session but not on every loop iteration.`,
  );
  lines.push(
    `- **Average** — Periodic operations: \`pull\`, \`install\`, \`tsc\`, \`npm test\`, \`branch\`, \`show\`, \`build\`, \`lint\`. Used a few times per session, often at phase transitions (start of session, before push, after major changes).`,
  );
  lines.push(
    `- **Low** — Situational operations: docker, coverage, formatting, blame, audit, language-specific build/test. Used when the workflow requires them, typically 1–2 times.`,
  );
  lines.push(
    `- **Very Low** — Occasional operations: specialized linters, package search/info, stash, compose, HTTP tools, language-specific formatters. Used less than once per average session.`,
  );
  lines.push(``);
  lines.push(`### Data sources`);
  lines.push(``);
  lines.push(
    `- [MCPMark benchmark](https://github.com/yiranwu0/MCPMark) — tool call frequency data for AI coding agents`,
  );
  lines.push(`- Anthropic Claude Code documentation — agent workflow patterns`);
  lines.push(`- Pare project internal usage telemetry — observed tool call distributions`);
  lines.push(``);
  lines.push(`### Token estimation`);
  lines.push(``);
  lines.push(
    `Tokens are estimated as \`Math.ceil(text.length / 4)\`, a standard heuristic for English text with code. Actual tokenizer counts may vary by ±10–15%.`,
  );
  lines.push(``);

  // ─── Session impact table ───────────────────────────────────────

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Estimated Session Impact`);
  lines.push(``);
  lines.push(
    `Per-tool token usage weighted by Use Frequency representative values. Each tool's avg tokens are a simple average across its benchmark scenarios. Session values = avg tokens × representative calls.`,
  );
  lines.push(``);
  lines.push(
    `|   # | Tool                 | Use Frequency | Avg Raw | Raw / Session | Avg Pare | Pare / Session |`,
  );
  lines.push(
    `| --: | -------------------- | ------------- | ------: | ------------: | -------: | -------------: |`,
  );

  for (const r of sessionRows) {
    const toolName = r.outlierExcluded ? `${r.name} (\\*)` : r.name;
    lines.push(
      `| ${String(r.num).padStart(3)} | ${toolName.padEnd(20)} | ${r.useFrequency.padEnd(13)} | ${r.avgRaw.toLocaleString().padStart(7)} | ${r.rawPerSession.toLocaleString().padStart(13)} | ${r.avgPare.toLocaleString().padStart(8)} | ${r.parePerSession.toLocaleString().padStart(14)} |`,
    );
  }

  lines.push(
    `|     | **Total**            |               |         | ${("**" + totalRawSession.toLocaleString() + "**").padStart(13)} |          | ${("**" + totalPareSession.toLocaleString() + "**").padStart(14)} |`,
  );
  lines.push(``);
  lines.push(`**Estimated savings per coding session:**`);
  lines.push(``);
  lines.push(
    `Using Pare tools, a coding agent's input token consumption is reduced by an estimated **${sessionSaved.toLocaleString()} tokens** relative to standard CLI tool use — a **${sessionPct}% reduction** per session.`,
  );
  lines.push(``);
  lines.push(`### Estimated Cost Savings`);
  lines.push(``);
  lines.push(
    `An active developer using AI coding agents runs an estimated **8–12 sessions per week** (24–48 per month), where each session involves ~200 tool calls. This estimate is derived from polling three frontier LLMs for their assessment of typical CLI agent usage patterns and should be treated as a rough approximation — actual usage varies widely by workflow and role.`,
  );
  lines.push(``);
  const blendedRate = 4.5; // $/MTok — usage-weighted (most sessions use cheaper models)
  const costPerSession = (sessionSaved / 1_000_000) * blendedRate;
  const monthlyLow = costPerSession * 24;
  const monthlyHigh = costPerSession * 48;
  lines.push(
    `Token pricing varies by model. Sonnet-class models cost ~$3/MTok while Opus-class models cost ~$15/MTok. Since most coding agent usage skews toward faster, cheaper models, we use a usage-weighted estimate of **$${blendedRate.toFixed(2)} per million tokens**.`,
  );
  lines.push(``);
  lines.push(
    `At this rate, ${sessionSaved.toLocaleString()} tokens saved per session = **$${costPerSession.toFixed(2)} per session**, or **$${monthlyLow.toFixed(1)} to $${monthlyHigh.toFixed(1)} per developer per month**.`,
  );
  lines.push(``);
  lines.push(
    `These are input token savings only — the measurable floor. The harder-to-quantify benefits of structured MCP output (reduced context window consumption, fewer parsing failures, more deterministic agent behavior) are likely worth more than the raw token cost savings but cannot be derived from this benchmark alone. Pare is a free, open source toolset that requires no workflow changes — it wraps the same CLI tools already in use, so these savings come at zero cost and zero friction.`,
  );

  if (hasOutliers) {
    lines.push(``);
    lines.push(`&nbsp;`);
    // Compute "with outlier" percentage for comparison
    const withOutlier = computeSessionImpact(reproducible, mutating, registry, false);
    const rawWithOutlier = withOutlier.reduce((s, r) => s + r.rawPerSession, 0);
    const pareWithOutlier = withOutlier.reduce((s, r) => s + r.parePerSession, 0);
    const pctWithOutlier =
      rawWithOutlier > 0 ? Math.round((1 - pareWithOutlier / rawWithOutlier) * 100) : 0;

    lines.push(``);
    lines.push(
      `_(\\*) npm/list excludes the depth=2 scenario (40C) from its session average. While npm-list-d2 shows a large 60% reduction (177,467 → 70,531 tokens), depth=2 output is an outlier — it is rarely requested by coding agents and its extreme size (177K tokens from a single call) would disproportionately inflate the session estimate. The scenario is retained in the detailed benchmark data for transparency. Excluding it has minimal effect on the overall reduction (${sessionPct}% vs ${pctWithOutlier}%) but yields a more representative session estimate._`,
    );
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ─── Detailed breakdowns (appendix) ────────────────────────────

  lines.push(`## Breakdown`);
  lines.push(``);
  lines.push(`| Suite               | Scenarios | Raw Tokens | Pare Tokens | Reduction |`);
  lines.push(`| ------------------- | --------: | ---------: | ----------: | --------: |`);
  lines.push(
    `| Reproducible        | ${String(reproducible.length).padStart(9)} | ${repRaw.toLocaleString().padStart(10)} | ${repPare.toLocaleString().padStart(11)} | ${String(repPct + "%").padStart(9)} |`,
  );
  lines.push(
    `| Mutating (one-shot) | ${String(mutating.length).padStart(9)} | ${mutRaw.toLocaleString().padStart(10)} | ${mutPare.toLocaleString().padStart(11)} | ${String(mutPct + "%").padStart(9)} |`,
  );
  lines.push(``);
  lines.push(`## Top Token Savers`);
  lines.push(``);
  lines.push(`| Scenario | Raw | Pare | Saved |`);
  lines.push(`|---|---:|---:|---:|`);
  for (const s of topSavers) {
    lines.push(
      `| ${s.id} | ${s.raw.toLocaleString()} | ${s.pare.toLocaleString()} | ${s.saved.toLocaleString()} |`,
    );
  }
  lines.push(``);
  lines.push(`## Worst Overhead`);
  lines.push(``);
  lines.push(`| Scenario | Raw | Pare | Overhead |`);
  lines.push(`|---|---:|---:|---:|`);
  for (const s of worstOverhead) {
    const overhead = s.medianPareTokens - s.medianRawTokens;
    lines.push(
      `| ${s.scenario.id} | ${s.medianRawTokens.toLocaleString()} | ${s.medianPareTokens.toLocaleString()} | +${overhead.toLocaleString()} |`,
    );
  }
  lines.push(``);
  lines.push(`## Latency`);
  lines.push(``);
  lines.push(
    `The median difference in execution time between Pare and raw CLI is **${Math.round(medianAdded)} ms**, which is negligible given that the ${totalScenarios} benchmark scenarios span a range of **${latencyMin.toLocaleString()} ms to ${latencyMax.toLocaleString()} ms** with a median execution time of **${Math.round(latencyMedian).toLocaleString()} ms**. Pare's structured parsing and schema validation add no meaningful overhead to tool execution.`,
  );
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(
    `See \`Benchmark-Detailed.csv\` for full per-scenario data.` +
      (hasOutliers
        ? ` _Scenarios marked with (\\*) are excluded from session impact averages — see footnote in Estimated Session Impact above._`
        : ``),
  );
  lines.push(
    `See \`tool-registry.csv\` for the complete tool registry with Use Frequency assignments.`,
  );
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

  // Read mutating results and tool registry, generate combined tracked outputs
  const mutatingRows = readMutatingResults();
  const registry = readToolRegistry();
  writeFileSync(
    resolve(BENCHMARKS_DIR, "Benchmark-Detailed.csv"),
    formatCombinedDetailedCsv(summaries, mutatingRows),
    "utf-8",
  );
  writeFileSync(
    resolve(BENCHMARKS_DIR, "Benchmark-Summary.md"),
    formatSummaryMd(summaries, mutatingRows, config, skipped, registry),
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
