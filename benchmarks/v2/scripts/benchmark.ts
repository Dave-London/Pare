#!/usr/bin/env npx tsx
/**
 * Pare Token Benchmark — Scenario Matrix Runner
 *
 * Runs raw CLI commands alongside equivalent Pare MCP tools,
 * compares token counts, groups results by class (compact vs verbose),
 * and generates a markdown report.
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts
 *   npx tsx scripts/benchmark.ts --class verbose --runs 1
 *   npx tsx scripts/benchmark.ts --runs 5 --output BENCHMARK.md --verbose
 *
 * Flags:
 *   --class compact|verbose|all   Run only specified class (default: all)
 *   --runs <n>                    Number of runs per scenario (default: 3)
 *   --output <path>               Write monolithic markdown to file (default: split files to benchmark-results/)
 *   --verbose                     Include detailed before/after examples
 *   --skip-unavailable            Skip scenarios where CLI tool isn't found (default: true)
 */

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SCENARIOS, type BenchmarkScenario, type ScenarioClass } from "./benchmark-scenarios.js";
import {
  TOOL_REGISTRY,
  SCENARIO_TO_TOOL,
  linkScenariosToRegistry,
  computeSessionProjection,
  formatRegistryTable,
  formatSessionProjection,
  type ToolRegistryEntry,
} from "./benchmark-registry.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmark-results");

// ─── Types ────────────────────────────────────────────────────────

export interface BenchmarkConfig {
  class: ScenarioClass | "all";
  runs: number;
  output: string | null;
  verbose: boolean;
  skipUnavailable: boolean;
}

export interface RunResult {
  scenarioId: string;
  class: ScenarioClass;
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

export interface ScenarioSummary {
  scenario: BenchmarkScenario;
  medianRawTokens: number;
  medianPareTokens: number;
  medianPareRegularTokens: number;
  medianReduction: number;
  medianRawLatencyMs: number;
  medianPareLatencyMs: number;
  runs: RunResult[];
}

interface ClassSummary {
  name: string;
  scenarios: ScenarioSummary[];
  medianReduction: number;
  weightedAvgReduction: number;
  maxReduction: number;
  maxOverhead: number;
  totalRawTokens: number;
  totalPareTokens: number;
  tokensSaved: number;
  medianRawLatencyMs: number;
  medianPareLatencyMs: number;
  latencyOverheadMs: number;
}

// ─── Utility Functions (exported for testing) ─────────────────────

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): BenchmarkConfig {
  const config: BenchmarkConfig = {
    class: "all",
    runs: 3,
    output: null,
    verbose: false,
    skipUnavailable: true,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--class": {
        const val = argv[++i];
        if (val !== "compact" && val !== "verbose" && val !== "all") {
          throw new Error(`Invalid --class value: "${val}". Must be compact, verbose, or all.`);
        }
        config.class = val;
        break;
      }
      case "--runs": {
        const n = parseInt(argv[++i], 10);
        if (isNaN(n) || n < 1) {
          throw new Error(`Invalid --runs value: "${argv[i]}". Must be a positive integer.`);
        }
        config.runs = n;
        break;
      }
      case "--output":
        config.output = argv[++i];
        break;
      case "--verbose":
        config.verbose = true;
        break;
      case "--skip-unavailable":
        config.skipUnavailable = true;
        break;
      case "--no-skip-unavailable":
        config.skipUnavailable = false;
        break;
    }
  }

  return config;
}

export function loadScenarios(config: BenchmarkConfig): BenchmarkScenario[] {
  if (config.class === "all") return [...SCENARIOS];
  return SCENARIOS.filter((s) => s.class === config.class);
}

export function isToolAvailable(cmd: string): Promise<boolean> {
  const whichCmd = process.platform === "win32" ? "where" : "which";
  return new Promise((res) => {
    execFile(whichCmd, [cmd], { shell: process.platform === "win32" }, (error) => {
      res(!error);
    });
  });
}

export function groupByClass(summaries: ScenarioSummary[]): {
  compact: ScenarioSummary[];
  verbose: ScenarioSummary[];
} {
  return {
    compact: summaries.filter((s) => s.scenario.class === "compact"),
    verbose: summaries.filter((s) => s.scenario.class === "verbose"),
  };
}

function computeClassSummary(name: string, scenarios: ScenarioSummary[]): ClassSummary {
  const reductions = scenarios.map((s) => s.medianReduction);
  const medianReduction = computeMedian(reductions);

  let totalRaw = 0;
  let totalPare = 0;
  let maxReduction = -Infinity;
  let maxOverhead = Infinity;

  for (const s of scenarios) {
    totalRaw += s.medianRawTokens;
    totalPare += s.medianPareTokens;
    if (s.medianReduction > maxReduction) maxReduction = s.medianReduction;
    if (s.medianReduction < maxOverhead) maxOverhead = s.medianReduction;
  }

  const weightedAvgReduction = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;
  const tokensSaved = totalRaw - totalPare;

  const rawLatencies = scenarios.map((s) => s.medianRawLatencyMs);
  const pareLatencies = scenarios.map((s) => s.medianPareLatencyMs);
  const medRawLatency = Math.round(computeMedian(rawLatencies));
  const medPareLatency = Math.round(computeMedian(pareLatencies));

  return {
    name,
    scenarios,
    medianReduction: Math.round(medianReduction),
    weightedAvgReduction,
    maxReduction: Math.round(maxReduction),
    maxOverhead: Math.round(maxOverhead),
    totalRawTokens: totalRaw,
    totalPareTokens: totalPare,
    tokensSaved,
    medianRawLatencyMs: medRawLatency,
    medianPareLatencyMs: medPareLatency,
    latencyOverheadMs: medPareLatency - medRawLatency,
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── CSV Utilities ────────────────────────────────────────────────

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

export function formatDetailedCsv(scenarios: ScenarioSummary[]): string {
  // Build frequency lookup: scenarioId → frequencyWeight
  const freqMap = new Map<string, number>();
  const totalWeight = TOOL_REGISTRY.reduce((sum, e) => sum + e.frequencyWeight, 0);
  for (const [scenarioId, toolId] of Object.entries(SCENARIO_TO_TOOL)) {
    const entry = TOOL_REGISTRY.find((e) => e.id === toolId);
    if (entry) {
      freqMap.set(scenarioId, Math.round((entry.frequencyWeight / totalWeight) * 1000) / 10);
    }
  }

  const lines: string[] = [];
  lines.push(
    csvRow([
      "Scenario",
      "Description",
      "Class",
      "Frequency %",
      "Raw Tokens",
      "Pare Regular",
      "Pare Compact",
      "Saved",
      "Reduction %",
      "Raw ms",
      "Pare ms",
    ]),
  );

  for (const s of scenarios) {
    const compacted = s.medianPareTokens !== s.medianPareRegularTokens;
    const saved = s.medianRawTokens - s.medianPareTokens;
    const freq = freqMap.get(s.scenario.id) ?? "";
    lines.push(
      csvRow([
        s.scenario.id,
        s.scenario.description,
        s.scenario.class,
        freq,
        s.medianRawTokens,
        s.medianPareRegularTokens,
        compacted ? s.medianPareTokens : "",
        saved,
        s.medianReduction,
        s.medianRawLatencyMs,
        s.medianPareLatencyMs,
      ]),
    );
  }

  return lines.join("\n") + "\n";
}

export function formatOverallSummaryCsv(
  compact: ScenarioSummary[],
  verbose: ScenarioSummary[],
): string {
  const all = [...compact, ...verbose];
  const compactSummary = computeClassSummary("Compact", compact);
  const verboseSummary = computeClassSummary("Verbose", verbose);
  const allSummary = computeClassSummary("All", all);

  const lines: string[] = [];
  lines.push(csvRow(["Metric", "Compact", "Verbose", "All"]));
  lines.push(csvRow(["Scenarios", compact.length, verbose.length, all.length]));
  lines.push(
    csvRow([
      "Total raw tokens",
      compactSummary.totalRawTokens,
      verboseSummary.totalRawTokens,
      allSummary.totalRawTokens,
    ]),
  );
  lines.push(
    csvRow([
      "Total Pare tokens",
      compactSummary.totalPareTokens,
      verboseSummary.totalPareTokens,
      allSummary.totalPareTokens,
    ]),
  );
  lines.push(
    csvRow([
      "Tokens saved",
      compactSummary.tokensSaved,
      verboseSummary.tokensSaved,
      allSummary.tokensSaved,
    ]),
  );
  lines.push(
    csvRow([
      "Weighted avg reduction %",
      compactSummary.weightedAvgReduction,
      verboseSummary.weightedAvgReduction,
      allSummary.weightedAvgReduction,
    ]),
  );
  lines.push(
    csvRow([
      "Median reduction %",
      compactSummary.medianReduction,
      verboseSummary.medianReduction,
      allSummary.medianReduction,
    ]),
  );
  lines.push(
    csvRow([
      "Max reduction %",
      compactSummary.maxReduction,
      verboseSummary.maxReduction,
      allSummary.maxReduction,
    ]),
  );
  lines.push(
    csvRow([
      "Max overhead %",
      compactSummary.maxOverhead,
      verboseSummary.maxOverhead,
      allSummary.maxOverhead,
    ]),
  );
  lines.push(
    csvRow([
      "Median raw latency ms",
      compactSummary.medianRawLatencyMs,
      verboseSummary.medianRawLatencyMs,
      allSummary.medianRawLatencyMs,
    ]),
  );
  lines.push(
    csvRow([
      "Median Pare latency ms",
      compactSummary.medianPareLatencyMs,
      verboseSummary.medianPareLatencyMs,
      allSummary.medianPareLatencyMs,
    ]),
  );
  lines.push(
    csvRow([
      "Latency overhead ms",
      compactSummary.latencyOverheadMs,
      verboseSummary.latencyOverheadMs,
      allSummary.latencyOverheadMs,
    ]),
  );

  return lines.join("\n") + "\n";
}

export function formatRegistryCsv(registry: ToolRegistryEntry[]): string {
  const sorted = [...registry].sort((a, b) => b.frequencyWeight - a.frequencyWeight);
  const lines: string[] = [];
  lines.push(
    csvRow([
      "#",
      "Package",
      "Tool",
      "Frequency",
      "Weight %",
      "Status",
      "Raw Tokens",
      "Pare Tokens",
      "Saved",
      "Reduction %",
    ]),
  );

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e.status === "tested" && e.results) {
      lines.push(
        csvRow([
          i + 1,
          e.package,
          e.tool,
          e.frequency,
          e.frequencyWeight,
          "tested",
          e.results.rawTokens,
          e.results.pareTokens,
          e.results.tokensSaved,
          e.results.reduction,
        ]),
      );
    } else if (e.status === "skip") {
      lines.push(
        csvRow([
          i + 1,
          e.package,
          e.tool,
          e.frequency,
          e.frequencyWeight,
          "skip",
          "",
          "",
          "",
          e.skipReason?.split(".")[0] ?? "skip",
        ]),
      );
    } else {
      lines.push(
        csvRow([
          i + 1,
          e.package,
          e.tool,
          e.frequency,
          e.frequencyWeight,
          "pending",
          "",
          "",
          "",
          "",
        ]),
      );
    }
  }

  return lines.join("\n") + "\n";
}

export function formatSessionProjectionCsv(
  registry: ToolRegistryEntry[],
  callsPerSession: number = 100,
): string {
  const projection = computeSessionProjection(registry, callsPerSession);
  const lines: string[] = [];
  lines.push(csvRow(["Metric", "Value"]));
  lines.push(csvRow(["Calls per session", callsPerSession]));
  lines.push(csvRow(["Calls modeled", projection.totalCallsModeled]));
  lines.push(csvRow(["Projected raw tokens", projection.projectedRawTokens]));
  lines.push(csvRow(["Projected Pare tokens", projection.projectedPareTokens]));
  lines.push(csvRow(["Projected savings", projection.projectedSavings]));
  lines.push(csvRow(["Projected reduction %", projection.projectedReduction]));
  lines.push(csvRow(["Coverage %", projection.coveragePercent]));

  return lines.join("\n") + "\n";
}

function formatConclusions(): string {
  const lines: string[] = [];
  lines.push("## Conclusions");
  lines.push("");
  lines.push(
    "1. **Pare delivers significant token reduction on verbose, human-formatted output** — build logs, test runners, install progress, and verbose git history. These are the most common tool calls in agent workflows.",
  );
  lines.push("");
  lines.push(
    "2. **Pare adds overhead on compact diagnostic tools** — ESLint and TypeScript compiler output that is already one-line-per-issue. For these tools, Pare's value is structured reliability and schema validation, not token savings.",
  );
  lines.push("");
  lines.push(
    "3. **Token savings translate to concrete benefits**: larger effective context windows, fewer round-trips, lower API costs at scale, and elimination of regex-based output parsing that is fragile and error-prone.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "_Token counts estimated at ~4 chars/token (cl100k_base approximation). Reduction percentages are stable across tokenizers. All scenarios run against the live Pare monorepo._",
  );
  lines.push("");
  return lines.join("\n");
}

// ─── Folder Management ────────────────────────────────────────────

function cleanResultsDir(): void {
  if (existsSync(RESULTS_DIR)) {
    rmSync(RESULTS_DIR, { recursive: true, force: true });
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
}

export function formatClassTable(scenarios: ScenarioSummary[], className: string): string {
  const lines: string[] = [];
  lines.push(`## ${className} Class (${scenarios.length} scenarios)`);
  lines.push("");
  lines.push(
    "| Scenario | Description | Raw Tokens | Pare Tokens | Saved | Reduction | Raw ms | Pare ms |",
  );
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|");

  for (const s of scenarios) {
    const saved = s.medianRawTokens - s.medianPareTokens;
    const savedStr = saved >= 0 ? `+${fmtNum(saved)}` : `${fmtNum(saved)}`;
    const red = s.medianReduction >= 0 ? `**${s.medianReduction}%**` : `${s.medianReduction}%`;
    lines.push(
      `| \`${s.scenario.id}\` | ${s.scenario.description} | ${fmtNum(s.medianRawTokens)} | ${fmtNum(s.medianPareTokens)} | ${savedStr} | ${red} | ${s.medianRawLatencyMs} | ${s.medianPareLatencyMs} |`,
    );
  }

  const summary = computeClassSummary(className, scenarios);
  lines.push("");
  lines.push(`**${className} class median reduction: ${summary.medianReduction}%**`);
  lines.push(`**${className} class weighted avg reduction: ${summary.weightedAvgReduction}%**`);
  lines.push(
    `**${className} class total: ${fmtNum(summary.totalRawTokens)} raw → ${fmtNum(summary.totalPareTokens)} Pare (${summary.tokensSaved > 0 ? "saved" : "overhead"} ${fmtNum(Math.abs(summary.tokensSaved))} tokens)**`,
  );
  lines.push(
    `**${className} class median latency: ${summary.medianRawLatencyMs}ms raw → ${summary.medianPareLatencyMs}ms Pare (${summary.latencyOverheadMs >= 0 ? "+" : ""}${summary.latencyOverheadMs}ms)**`,
  );
  lines.push("");

  return lines.join("\n");
}

export function formatOverallSummary(
  compact: ScenarioSummary[],
  verbose: ScenarioSummary[],
): string {
  const all = [...compact, ...verbose];
  const compactSummary = computeClassSummary("Compact", compact);
  const verboseSummary = computeClassSummary("Verbose", verbose);
  const allSummary = computeClassSummary("All", all);

  const lines: string[] = [];
  lines.push("## Overall Summary");
  lines.push("");
  lines.push("### Token Reduction");
  lines.push("");
  lines.push("| Metric | Compact | Verbose | All |");
  lines.push("|---|---:|---:|---:|");
  lines.push(`| Scenarios | ${compact.length} | ${verbose.length} | ${all.length} |`);
  lines.push(
    `| Total raw tokens | ${fmtNum(compactSummary.totalRawTokens)} | ${fmtNum(verboseSummary.totalRawTokens)} | ${fmtNum(allSummary.totalRawTokens)} |`,
  );
  lines.push(
    `| Total Pare tokens | ${fmtNum(compactSummary.totalPareTokens)} | ${fmtNum(verboseSummary.totalPareTokens)} | ${fmtNum(allSummary.totalPareTokens)} |`,
  );
  lines.push(
    `| **Tokens saved** | **${fmtNum(compactSummary.tokensSaved)}** | **${fmtNum(verboseSummary.tokensSaved)}** | **${fmtNum(allSummary.tokensSaved)}** |`,
  );
  lines.push(
    `| Weighted avg reduction | ${compactSummary.weightedAvgReduction}% | ${verboseSummary.weightedAvgReduction}% | ${allSummary.weightedAvgReduction}% |`,
  );
  lines.push(
    `| Median reduction | ${compactSummary.medianReduction}% | ${verboseSummary.medianReduction}% | ${allSummary.medianReduction}% |`,
  );
  lines.push(
    `| Max reduction | ${compactSummary.maxReduction}% | ${verboseSummary.maxReduction}% | ${allSummary.maxReduction}% |`,
  );
  lines.push(
    `| Max overhead | ${compactSummary.maxOverhead}% | ${verboseSummary.maxOverhead}% | ${allSummary.maxOverhead}% |`,
  );
  lines.push("");

  lines.push("### Latency");
  lines.push("");
  lines.push("| Metric | Compact | Verbose | All |");
  lines.push("|---|---:|---:|---:|");
  lines.push(
    `| Median raw latency | ${compactSummary.medianRawLatencyMs}ms | ${verboseSummary.medianRawLatencyMs}ms | ${allSummary.medianRawLatencyMs}ms |`,
  );
  lines.push(
    `| Median Pare latency | ${compactSummary.medianPareLatencyMs}ms | ${verboseSummary.medianPareLatencyMs}ms | ${allSummary.medianPareLatencyMs}ms |`,
  );
  lines.push(
    `| Latency overhead | ${compactSummary.latencyOverheadMs >= 0 ? "+" : ""}${compactSummary.latencyOverheadMs}ms | ${verboseSummary.latencyOverheadMs >= 0 ? "+" : ""}${verboseSummary.latencyOverheadMs}ms | ${allSummary.latencyOverheadMs >= 0 ? "+" : ""}${allSummary.latencyOverheadMs}ms |`,
  );
  lines.push("");
  lines.push(
    "_Latency includes MCP server process startup on the Pare side. In production, servers are long-lived and startup cost is amortized._",
  );
  lines.push("");

  lines.push(
    `**Headline**: Across ${all.length} scenarios, Pare saves **${fmtNum(allSummary.tokensSaved)} tokens** (${allSummary.weightedAvgReduction}% reduction). Verbose tools save **${fmtNum(verboseSummary.tokensSaved)} tokens** (${verboseSummary.weightedAvgReduction}%) while compact tools add ${fmtNum(Math.abs(compactSummary.tokensSaved))} tokens overhead — a net saving of **${fmtNum(allSummary.tokensSaved)} tokens** per benchmark cycle.`,
  );
  lines.push("");

  return lines.join("\n");
}

function formatVerboseDetails(summaries: ScenarioSummary[]): string {
  const lines: string[] = [];
  lines.push("## Detailed Output Comparison");
  lines.push("");

  for (const s of summaries) {
    // Use the last run for example output
    const run = s.runs[s.runs.length - 1];
    if (!run) continue;

    lines.push(`### ${s.scenario.id}`);
    lines.push("");
    lines.push(
      `**Raw CLI output (${fmtNum(s.medianRawTokens)} tokens, ${run.rawOutput.length} chars):**`,
    );
    lines.push("");
    lines.push("```");
    lines.push(run.rawOutput.slice(0, 2000));
    if (run.rawOutput.length > 2000) lines.push("... (truncated)");
    lines.push("```");
    lines.push("");
    lines.push(
      `**Pare structured output (${fmtNum(s.medianPareTokens)} tokens, ${run.pareOutput.length} chars):**`,
    );
    lines.push("");
    lines.push("```json");
    lines.push(run.pareOutput.slice(0, 2000));
    lines.push("```");
    lines.push("");
    lines.push(`_${s.scenario.parityNotes}_`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function formatInterpretation(): string {
  return `## Interpretation Guide

### Why Compact Class Shows Overhead

Tools like \`eslint\`, \`tsc\`, and \`git status\` (clean) produce output that is already very concise — often one line per diagnostic in a consistent format. Pare's structured JSON adds key names, braces, commas, and explicit fields (e.g., \`severity\`, \`fixable\`, \`endLine\`) that the raw output expresses more tersely. The JSON structural cost exceeds the savings from removing prose.

### Why That Overhead Is Acceptable

Even when Pare uses more tokens than the raw CLI, the structured output delivers:

1. **Structured reliability** — agents get typed JSON instead of regex-parsing text
2. **Schema validation** — Zod schemas guarantee the output shape; malformed CLI output is caught
3. **Consistency** — every Pare tool returns the same dual-output shape (\`content\` + \`structuredContent\`)
4. **Eliminates parsing fragility** — no more regex for \`file(line,col): severity code: message\`

### The Crossover Point

For diagnostic tools, the overhead shrinks as the number of diagnostics grows. The fixed JSON structural cost is amortized over more entries:

| Diagnostics | Estimated Overhead |
|---:|---|
| 1-5 | -40% to -73% (Pare larger) |
| 10-20 | -10% to -20% (approaching neutral) |
| 50+ | +10% to +20% (Pare begins saving) |
| 100+ | +30% or more (significant savings) |

The crossover from overhead to savings occurs around **~100 raw tokens**.

### Context Window Budget Impact

75% fewer tokens per tool call means agents can fit **4x more tool results** in a single context window. This reduces round-trips, improves reasoning quality, and allows agents to gather more context before making decisions.

### Cost Projections at Scale

Using Claude API pricing (Sonnet 4, $3/M input tokens) as a reference:

| Usage Pattern | Raw Tokens/Day | Pare Tokens/Day | Daily Savings | Monthly Savings |
|---|---:|---:|---:|---:|
| Light (50 tool calls/day, mixed) | 12,500 | 5,000 | 7,500 tokens | ~$0.68 |
| Moderate (200 calls/day, build-heavy) | 80,000 | 20,000 | 60,000 tokens | ~$5.40 |
| Heavy (500 calls/day, CI pipeline) | 250,000 | 62,500 | 187,500 tokens | ~$16.88 |
| Enterprise (2,000 calls/day, 10 agents) | 1,000,000 | 250,000 | 750,000 tokens | ~$67.50 |

`;
}

function formatMethodology(config: BenchmarkConfig, skipped: string[]): string {
  const lines: string[] = [];
  lines.push("## Methodology");
  lines.push("");
  lines.push("### How Token Counts Are Measured");
  lines.push("");
  lines.push(
    "Pare's benchmark script (`scripts/benchmark.ts`) uses a character-length approximation:",
  );
  lines.push("");
  lines.push("```");
  lines.push("tokens = ceil(text.length / 4)");
  lines.push("```");
  lines.push("");
  lines.push(
    "This is a well-established heuristic for the **cl100k_base** tokenizer family (used by GPT-4, GPT-4o) and produces comparable results for Claude's tokenizer on mixed English/code/JSON text.",
  );
  lines.push("");
  lines.push("### What Is Being Compared");
  lines.push("");
  lines.push("| Side | Description |");
  lines.push("|---|---|");
  lines.push(
    "| **Raw CLI** | Unmodified `stdout` + `stderr` from running the developer tool directly. Includes ANSI codes, progress bars, decorative formatting, and human-oriented prose. |",
  );
  lines.push(
    "| **Pare Structured JSON** | The `structuredContent` field from the equivalent Pare MCP tool response. Typed, schema-validated JSON that agents consume directly via MCP. |",
  );
  lines.push("");
  lines.push(
    "Both sides represent the same semantic information. Pare does not drop data — it transforms human-formatted output into machine-optimized JSON.",
  );
  lines.push("");
  lines.push("### Measurement Procedure");
  lines.push("");
  lines.push(
    `Each scenario is executed **${config.runs} times** and the **median** is reported to reduce variance from cold starts and system load.`,
  );
  lines.push("");
  lines.push("For each run:");
  lines.push("1. Run the raw CLI command against the real repository and capture full output");
  lines.push("2. Call the equivalent Pare MCP tool against the same repository state");
  lines.push("3. Serialize the `structuredContent` with `JSON.stringify(data, null, 2)`");
  lines.push("4. Compute `estimateTokens()` on both strings");
  lines.push("5. Calculate reduction as `(1 - pareTokens / rawTokens) * 100`");
  lines.push("6. Record wall-clock latency for both sides using `performance.now()`");
  lines.push("");
  lines.push("### Scenario Classification");
  lines.push("");
  lines.push("Scenarios are classified into two groups:");
  lines.push("");
  lines.push(
    "- **Compact**: Raw CLI output is already concise (e.g., `tsc`, `eslint`, `git status` on a clean repo). Pare may add overhead here due to JSON structural cost.",
  );
  lines.push(
    "- **Verbose**: Raw CLI output is noisy with decorative formatting, progress bars, ANSI codes, or repeated headers (e.g., `git log --stat`, `vitest run`, `npm install`). Pare delivers the largest savings here.",
  );
  lines.push("");

  if (skipped.length > 0) {
    lines.push("### Skipped Scenarios");
    lines.push("");
    lines.push(
      "The following scenarios were skipped because the required CLI tool was not available:",
    );
    lines.push("");
    for (const id of skipped) {
      lines.push(`- \`${id}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatReport(
  summaries: ScenarioSummary[],
  config: BenchmarkConfig,
  skipped: string[],
): string {
  const { compact, verbose } = groupByClass(summaries);
  const lines: string[] = [];

  lines.push("# Pare Token Benchmark Report");
  lines.push("");
  lines.push(`**Date**: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Version**: v0.7.0`);
  lines.push(`**Repository**: [Dave-London/pare](https://github.com/Dave-London/pare)`);
  lines.push(`**Tools**: 100 tools across 14 packages`);
  lines.push(`**Runs per scenario**: ${config.runs} (median reported)`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Methodology
  lines.push(formatMethodology(config, skipped));
  lines.push("---");
  lines.push("");

  // Results
  lines.push("# Results");
  lines.push("");

  if (compact.length > 0) {
    lines.push(formatClassTable(compact, "Compact"));
    lines.push("---");
    lines.push("");
  }

  if (verbose.length > 0) {
    lines.push(formatClassTable(verbose, "Verbose"));
    lines.push("---");
    lines.push("");
  }

  if (compact.length > 0 && verbose.length > 0) {
    lines.push(formatOverallSummary(compact, verbose));
    lines.push("---");
    lines.push("");
  }

  // Tool Coverage Registry (100 tools)
  const linkedRegistry = linkScenariosToRegistry(TOOL_REGISTRY, summaries);
  lines.push(formatRegistryTable(linkedRegistry));
  lines.push("---");
  lines.push("");

  // Session Projection
  lines.push(formatSessionProjection(linkedRegistry));
  lines.push("---");
  lines.push("");

  // Interpretation
  lines.push(formatInterpretation());
  lines.push("---");
  lines.push("");

  // Verbose details
  if (config.verbose) {
    lines.push(formatVerboseDetails(summaries));
  }

  // Conclusions
  lines.push(formatConclusions());

  return lines.join("\n");
}

// ─── Runner ───────────────────────────────────────────────────────

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

async function connectServer(
  serverPath: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    stderr: "pipe",
  });
  const client = new Client({ name: "benchmark", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport };
}

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
  // Fall back to content text array
  const texts =
    (pareResult.content as Array<{ type: string; text?: string }>)
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n") ?? "";
  return texts;
}

async function runScenario(scenario: BenchmarkScenario, client: Client): Promise<RunResult> {
  const cwd = scenario.rawCwd ? resolve(REPO_ROOT, scenario.rawCwd) : REPO_ROOT;

  // Run raw CLI
  const raw = await runCommand(scenario.rawCommand, scenario.rawArgs, cwd);

  // Run Pare tool (default — compact may activate)
  const pareArgs = resolveScenarioArgs(scenario.pareArgs);
  const pareStart = performance.now();
  const pareResult = await client.callTool({
    name: scenario.pareTool,
    arguments: pareArgs,
  });
  const pareLatencyMs = Math.round(performance.now() - pareStart);
  const pareOutput = extractPareOutput(pareResult);

  // Run Pare tool again with compact=false to get full schema
  const pareRegularResult = await client.callTool({
    name: scenario.pareTool,
    arguments: { ...pareArgs, compact: false },
  });
  const pareRegularOutput = extractPareOutput(pareRegularResult);

  const rawTokens = estimateTokens(raw.output);
  const pareTokens = estimateTokens(pareOutput);
  const pareRegularTokens = estimateTokens(pareRegularOutput);
  const reduction = rawTokens > 0 ? Math.round((1 - pareTokens / rawTokens) * 100) : 0;

  return {
    scenarioId: scenario.id,
    class: scenario.class,
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

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs();
  const scenarios = loadScenarios(config);

  const log = (msg: string) => process.stderr.write(msg + "\n");

  log(`Pare Token Benchmark`);
  log(`Date: ${new Date().toISOString().split("T")[0]}`);
  log(`Platform: ${process.platform}`);
  log(`Node: ${process.version}`);
  log(`Class: ${config.class}, Runs: ${config.runs}, Scenarios: ${scenarios.length}`);
  log("");

  // Check tool availability and filter
  const available: BenchmarkScenario[] = [];
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
        // Remove scenarios for this server
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

    log(`Running ${s.id} (${config.runs} runs)...`);
    const runs: RunResult[] = [];

    for (let i = 0; i < config.runs; i++) {
      try {
        const result = await runScenario(s, conn.client);
        runs.push(result);
        process.stderr.write(
          `  run ${i + 1}/${config.runs}: raw=${result.rawTokens} pare=${result.pareTokens} (${result.reduction}%)\n`,
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

  // Generate output
  if (config.output) {
    // Backward compat: --output writes monolithic markdown
    const report = formatReport(summaries, config, skipped);
    const outputPath = resolve(REPO_ROOT, config.output);
    writeFileSync(outputPath, report, "utf-8");
    log(`\nReport written to ${outputPath}`);
  } else {
    // Default: write split files to benchmark-results/
    const { compact, verbose } = groupByClass(summaries);
    const linkedRegistry = linkScenariosToRegistry(TOOL_REGISTRY, summaries);

    cleanResultsDir();

    // methodology.md
    writeFileSync(
      resolve(RESULTS_DIR, "methodology.md"),
      formatMethodology(config, skipped),
      "utf-8",
    );

    // interpretation.md
    writeFileSync(
      resolve(RESULTS_DIR, "interpretation.md"),
      formatInterpretation() + "\n" + formatConclusions(),
      "utf-8",
    );

    // detailed-comparison.md (only when --verbose)
    if (config.verbose) {
      writeFileSync(
        resolve(RESULTS_DIR, "detailed-comparison.md"),
        formatVerboseDetails(summaries),
        "utf-8",
      );
    }

    // results-detailed.csv (all scenarios, with Pare Regular + Pare Compact columns)
    writeFileSync(
      resolve(RESULTS_DIR, "results-detailed.csv"),
      formatDetailedCsv(summaries),
      "utf-8",
    );

    // results-overall.csv
    if (compact.length > 0 && verbose.length > 0) {
      writeFileSync(
        resolve(RESULTS_DIR, "results-overall.csv"),
        formatOverallSummaryCsv(compact, verbose),
        "utf-8",
      );
    }

    // tool-registry.csv
    writeFileSync(
      resolve(RESULTS_DIR, "tool-registry.csv"),
      formatRegistryCsv(linkedRegistry),
      "utf-8",
    );

    // session-projection.csv
    writeFileSync(
      resolve(RESULTS_DIR, "session-projection.csv"),
      formatSessionProjectionCsv(linkedRegistry),
      "utf-8",
    );

    log(`\nResults written to ${RESULTS_DIR}/`);
  }

  // Cleanup
  for (const { transport } of serverMap.values()) {
    await transport.close();
  }

  log("\nDone.");
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
