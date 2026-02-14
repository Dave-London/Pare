/**
 * 100-Tool Benchmark Registry with Frequency-Weighted Projections
 *
 * Every Pare tool is registered here with usage frequency data derived from
 * publicly available empirical sources. Results populate incrementally as
 * benchmark scenarios are added and run.
 *
 * Frequency Sources:
 *   1. Jerry Ng — Shell History Analysis (2024): git=59%, npm=6.5%, docker=6.1%
 *   2. Anthropic — "How People Prompt" (2025): 21 tool calls/transcript, git 10-15%
 *   3. GitClear — Developer Activity (2024-2025): 2.7 commits/day median
 *   4. Kevin Magnan — MCP Tool Usage (2025): ~120 calls/day over 83 days
 *   5. SWE-bench Agent Traces (2024-2025): heavy git status/diff/log usage
 */

import type { ScenarioSummary } from "./benchmark.js";

// ─── Types ────────────────────────────────────────────────────────

export type FrequencyCategory = "very-high" | "high" | "medium" | "low";
export type BenchmarkStatus = "tested" | "pending" | "skip";

export interface ToolResults {
  rawTokens: number;
  pareTokens: number;
  reduction: number;
  tokensSaved: number;
}

export interface ToolRegistryEntry {
  /** Unique key: "package:tool", e.g. "git:status" */
  id: string;
  /** Package name without server- prefix */
  package: string;
  /** Tool name as registered in MCP */
  tool: string;
  /** Usage frequency category */
  frequency: FrequencyCategory;
  /** Estimated % of all tool calls in a typical session (sums to 100) */
  frequencyWeight: number;
  /** Frequency data source/rationale */
  frequencySource: string;
  /** Benchmark status */
  status: BenchmarkStatus;
  /** Reason for skip status */
  skipReason?: string;
  /** ID of linked scenario in benchmark-scenarios.ts (null if pending/skip) */
  scenarioId: string | null;
  /** Populated after benchmark run */
  results: ToolResults | null;
}

export interface SessionProjection {
  totalCallsModeled: number;
  callsPerSession: number;
  projectedRawTokens: number;
  projectedPareTokens: number;
  projectedSavings: number;
  projectedReduction: number;
  coveragePercent: number;
}

// ─── Registry Data ────────────────────────────────────────────────

/**
 * Mapping from scenario IDs in benchmark-scenarios.ts to registry tool IDs.
 * Used by linkScenariosToRegistry() to connect results.
 */
export const SCENARIO_TO_TOOL: Record<string, string> = {
  "git-status-clean": "git:status",
  "git-branch": "git:branch",
  "git-remote": "git:remote",
  "git-log-oneline": "git:log",
  "git-log-stat": "git:log", // second scenario for log — uses stat variant
  "git-blame": "git:blame",
  "git-show": "git:show",
  "git-tag": "git:tag",
  "git-diff-files": "git:diff",
  "npm-outdated": "npm:outdated",
  "npm-list": "npm:list",
  "npm-audit": "npm:audit",
  "npm-test": "npm:test",
  "npm-info": "npm:info",
  "npm-run-script": "npm:run",
  "build-generic": "build:build",
  "tsc-errors": "build:tsc",
  "eslint-diag": "lint:lint",
  "format-check": "lint:format-check",
  "vitest-run": "test:run",
  "pip-list": "python:pip-list",
  "docker-images": "docker:images",
  "docker-ps": "docker:ps",
};

// For scenarios that map to the same tool (e.g. git-log-oneline and git-log-stat),
// prefer the one that better represents typical usage
const PREFERRED_SCENARIO: Record<string, string> = {
  "git:log": "git-log-oneline",
};

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  // ─── Git (15 tools) ────────────────────────────────────────────
  // Source 1: git = 59% of all CLI commands
  // Git subcommand distribution from Source 1 (% of git commands):
  //   commit 56%, status 16%, add 9%, push 5.2%, checkout 3.2%,
  //   branch 2.5%, log 2.3%, pull 1.8%, diff 1.5%
  // Normalized to overall tool frequency across all 100 tools:

  {
    id: "git:status",
    package: "git",
    tool: "status",
    frequency: "very-high",
    frequencyWeight: 12.0,
    frequencySource:
      "Source 1: 16% of git commands (59% of all CLI). Source 2: agents check status frequently.",
    status: "tested",
    scenarioId: "git-status-clean",
    results: null,
  },
  {
    id: "git:diff",
    package: "git",
    tool: "diff",
    frequency: "very-high",
    frequencyWeight: 10.0,
    frequencySource:
      "Source 1: 1.5% of git cmds, but Source 5: agents use diff heavily for context. Elevated for agent workflows.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:log",
    package: "git",
    tool: "log",
    frequency: "very-high",
    frequencyWeight: 6.0,
    frequencySource:
      "Source 1: 2.3% of git commands. Source 5: agents rely on log for context gathering.",
    status: "tested",
    scenarioId: "git-log-oneline",
    results: null,
  },
  {
    id: "git:commit",
    package: "git",
    tool: "commit",
    frequency: "very-high",
    frequencyWeight: 10.0,
    frequencySource: "Source 1: 56% of git commands. Source 3: median 2.7 commits/day.",
    status: "skip",
    skipReason: "Mutating: creates commits. Cannot safely benchmark in read-only mode.",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:add",
    package: "git",
    tool: "add",
    frequency: "very-high",
    frequencyWeight: 7.0,
    frequencySource: "Source 1: 9% of git commands. Always precedes commit.",
    status: "skip",
    skipReason: "Mutating: stages files. Cannot safely benchmark in read-only mode.",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:push",
    package: "git",
    tool: "push",
    frequency: "very-high",
    frequencyWeight: 5.0,
    frequencySource: "Source 1: 5.2% of git commands. Source 3: follows every commit session.",
    status: "skip",
    skipReason: "Mutating: pushes to remote. Cannot safely benchmark.",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:checkout",
    package: "git",
    tool: "checkout",
    frequency: "high",
    frequencyWeight: 3.0,
    frequencySource:
      "Source 1: 3.2% of git commands. Branch switching is frequent in multi-task workflows.",
    status: "skip",
    skipReason: "Mutating: switches branches. Could disrupt repo state during benchmark.",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:branch",
    package: "git",
    tool: "branch",
    frequency: "high",
    frequencyWeight: 1.5,
    frequencySource: "Source 1: 2.5% of git commands. Listing branches is read-only and safe.",
    status: "tested",
    scenarioId: "git-branch",
    results: null,
  },
  {
    id: "git:show",
    package: "git",
    tool: "show",
    frequency: "high",
    frequencyWeight: 1.5,
    frequencySource: "Source 5: agents use show to inspect specific commits for context.",
    status: "tested",
    scenarioId: "git-show",
    results: null,
  },
  {
    id: "git:pull",
    package: "git",
    tool: "pull",
    frequency: "high",
    frequencyWeight: 2.5,
    frequencySource: "Source 1: 1.8% of git commands. Source 3: regular sync operation.",
    status: "skip",
    skipReason: "Mutating: pulls from remote. Could change repo state during benchmark.",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:blame",
    package: "git",
    tool: "blame",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Used for attribution and debugging. Not in daily loop for most devs.",
    status: "tested",
    scenarioId: "git-blame",
    results: null,
  },
  {
    id: "git:tag",
    package: "git",
    tool: "tag",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Release-related. Used periodically, not daily.",
    status: "tested",
    scenarioId: "git-tag",
    results: null,
  },
  {
    id: "git:remote",
    package: "git",
    tool: "remote",
    frequency: "medium",
    frequencyWeight: 0.3,
    frequencySource: "Configuration check. Infrequent once set up.",
    status: "tested",
    scenarioId: "git-remote",
    results: null,
  },
  {
    id: "git:stash-list",
    package: "git",
    tool: "stash-list",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Stash usage is infrequent in agent workflows.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "git:stash",
    package: "git",
    tool: "stash",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Mutating stash operations are rare in agent workflows.",
    status: "skip",
    skipReason: "Mutating: modifies working tree and stash stack.",
    scenarioId: null,
    results: null,
  },

  // ─── npm (9 tools) ─────────────────────────────────────────────
  // Source 1: npm = 6.5% of all CLI commands

  {
    id: "npm:run",
    package: "npm",
    tool: "run",
    frequency: "high",
    frequencyWeight: 3.0,
    frequencySource: "Source 1: npm=6.5%. 'npm run' is the most common npm subcommand for scripts.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "npm:install",
    package: "npm",
    tool: "install",
    frequency: "high",
    frequencyWeight: 2.0,
    frequencySource: "Source 1: npm=6.5%. Install is frequent during setup and dependency changes.",
    status: "skip",
    skipReason: "Mutating: modifies node_modules. Slow and changes lockfile.",
    scenarioId: null,
    results: null,
  },
  {
    id: "npm:test",
    package: "npm",
    tool: "test",
    frequency: "high",
    frequencyWeight: 1.8,
    frequencySource:
      "Source 2: agents run tests for validation. Source 5: SWE-bench agents test heavily.",
    status: "tested",
    scenarioId: "npm-test",
    results: null,
  },
  {
    id: "npm:audit",
    package: "npm",
    tool: "audit",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Security checks, run periodically not daily.",
    status: "tested",
    scenarioId: "npm-audit",
    results: null,
  },
  {
    id: "npm:outdated",
    package: "npm",
    tool: "outdated",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Dependency maintenance, periodic check.",
    status: "tested",
    scenarioId: "npm-outdated",
    results: null,
  },
  {
    id: "npm:list",
    package: "npm",
    tool: "list",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Dependency inspection, used during debugging.",
    status: "tested",
    scenarioId: "npm-list",
    results: null,
  },
  {
    id: "npm:info",
    package: "npm",
    tool: "info",
    frequency: "medium",
    frequencyWeight: 0.3,
    frequencySource: "Package research, used when evaluating dependencies.",
    status: "tested",
    scenarioId: "npm-info",
    results: null,
  },
  {
    id: "npm:search",
    package: "npm",
    tool: "search",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Package discovery, infrequent.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "npm:init",
    package: "npm",
    tool: "init",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Project initialization, rare (once per project).",
    status: "skip",
    skipReason: "Mutating: creates package.json. One-time operation.",
    scenarioId: null,
    results: null,
  },

  // ─── Test (2 tools) ────────────────────────────────────────────
  // Source 2: tests are 5-8% of agent tool calls
  // Source 5: SWE-bench agents run tests for validation

  {
    id: "test:run",
    package: "test",
    tool: "run",
    frequency: "high",
    frequencyWeight: 4.0,
    frequencySource: "Source 2: 5-8% of agent calls. Source 5: critical for SWE-bench validation.",
    status: "tested",
    scenarioId: "vitest-run",
    results: null,
  },
  {
    id: "test:coverage",
    package: "test",
    tool: "coverage",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Coverage checks are periodic, not every test run.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Build (5 tools) ───────────────────────────────────────────
  // Source 2: build/compile tools are part of the dev loop

  {
    id: "build:tsc",
    package: "build",
    tool: "tsc",
    frequency: "high",
    frequencyWeight: 2.0,
    frequencySource:
      "Source 2: agents verify types after changes. TypeScript is dominant in JS ecosystem.",
    status: "tested",
    scenarioId: "tsc-errors",
    results: null,
  },
  {
    id: "build:build",
    package: "build",
    tool: "build",
    frequency: "high",
    frequencyWeight: 1.5,
    frequencySource: "Generic build command, used to verify compilation after changes.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "build:esbuild",
    package: "build",
    tool: "esbuild",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Bundler-specific. Used in esbuild-based projects.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "build:vite-build",
    package: "build",
    tool: "vite-build",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Bundler-specific. Used in Vite-based projects.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "build:webpack",
    package: "build",
    tool: "webpack",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Legacy bundler. Declining usage but still widespread.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Lint (7 tools) ────────────────────────────────────────────
  // Source 2: lint/format = 3-5% of agent calls

  {
    id: "lint:lint",
    package: "lint",
    tool: "lint",
    frequency: "high",
    frequencyWeight: 1.5,
    frequencySource: "Source 2: 3-5% of agent calls. ESLint is the standard JS/TS linter.",
    status: "tested",
    scenarioId: "eslint-diag",
    results: null,
  },
  {
    id: "lint:format-check",
    package: "lint",
    tool: "format-check",
    frequency: "medium",
    frequencyWeight: 0.6,
    frequencySource: "Formatting verification, often run in CI or before commit.",
    status: "tested",
    scenarioId: "format-check",
    results: null,
  },
  {
    id: "lint:prettier-format",
    package: "lint",
    tool: "prettier-format",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Auto-formatting, used after code changes.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "lint:biome-check",
    package: "lint",
    tool: "biome-check",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Biome is newer, lower adoption than ESLint+Prettier.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "lint:biome-format",
    package: "lint",
    tool: "biome-format",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Biome formatting, complementary to biome-check.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "lint:stylelint",
    package: "lint",
    tool: "stylelint",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "CSS-specific linter, niche usage.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "lint:oxlint",
    package: "lint",
    tool: "oxlint",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Oxlint is very new, early adoption phase.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Docker (13 tools) ─────────────────────────────────────────
  // Source 1: docker = 6.1% of all CLI commands

  {
    id: "docker:ps",
    package: "docker",
    tool: "ps",
    frequency: "medium",
    frequencyWeight: 0.8,
    frequencySource: "Source 1: docker=6.1%. ps is the most common docker subcommand.",
    status: "tested",
    scenarioId: "docker-ps",
    results: null,
  },
  {
    id: "docker:images",
    package: "docker",
    tool: "images",
    frequency: "medium",
    frequencyWeight: 0.7,
    frequencySource: "Source 1: docker=6.1%. Image listing is frequent during development.",
    status: "tested",
    scenarioId: "docker-images",
    results: null,
  },
  {
    id: "docker:build",
    package: "docker",
    tool: "build",
    frequency: "medium",
    frequencyWeight: 0.6,
    frequencySource: "Source 1: docker=6.1%. Build is common but slower, less frequent than ps.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:logs",
    package: "docker",
    tool: "logs",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Debugging container output, moderate frequency.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:run",
    package: "docker",
    tool: "run",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Running containers, common docker operation.",
    status: "skip",
    skipReason: "Mutating: creates and runs containers.",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:exec",
    package: "docker",
    tool: "exec",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Executing commands in running containers.",
    status: "skip",
    skipReason: "Mutating: executes in running containers. Requires running container.",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:compose-up",
    package: "docker",
    tool: "compose-up",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Starting compose stacks, common in multi-service projects.",
    status: "skip",
    skipReason: "Mutating: starts containers and services.",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:compose-down",
    package: "docker",
    tool: "compose-down",
    frequency: "medium",
    frequencyWeight: 0.3,
    frequencySource: "Stopping compose stacks, paired with compose-up.",
    status: "skip",
    skipReason: "Mutating: stops and removes containers.",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:pull",
    package: "docker",
    tool: "pull",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Pulling images, occasional operation.",
    status: "skip",
    skipReason: "Mutating: downloads images. Network-dependent.",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:inspect",
    package: "docker",
    tool: "inspect",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Detailed container/image inspection, debugging tool.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:network-ls",
    package: "docker",
    tool: "network-ls",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Network listing, infrequent configuration check.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:volume-ls",
    package: "docker",
    tool: "volume-ls",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Volume listing, infrequent configuration check.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "docker:compose-ps",
    package: "docker",
    tool: "compose-ps",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Compose service status, used with compose workflows.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── GitHub (8 tools) ──────────────────────────────────────────
  // Source 2: GitHub operations are part of agent workflows

  {
    id: "github:pr-view",
    package: "github",
    tool: "pr-view",
    frequency: "medium",
    frequencyWeight: 0.6,
    frequencySource: "Source 2: PR review is common in agent coding workflows.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:pr-list",
    package: "github",
    tool: "pr-list",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Listing PRs for review/triage.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:pr-create",
    package: "github",
    tool: "pr-create",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Creating PRs, end of coding workflow. Source 5: SWE-bench agents create PRs.",
    status: "skip",
    skipReason: "Mutating: creates pull requests on GitHub.",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:issue-view",
    package: "github",
    tool: "issue-view",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Reading issue details for context.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:issue-list",
    package: "github",
    tool: "issue-list",
    frequency: "medium",
    frequencyWeight: 0.3,
    frequencySource: "Listing issues for triage.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:issue-create",
    package: "github",
    tool: "issue-create",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Creating issues, less frequent than viewing.",
    status: "skip",
    skipReason: "Mutating: creates issues on GitHub.",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:run-view",
    package: "github",
    tool: "run-view",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "CI run inspection, used for debugging failures.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "github:run-list",
    package: "github",
    tool: "run-list",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "CI run listing, periodic check.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Search (3 tools) ──────────────────────────────────────────

  {
    id: "search:search",
    package: "search",
    tool: "search",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Code search via ripgrep, useful for agent exploration.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "search:find",
    package: "search",
    tool: "find",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "File finding via glob patterns.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "search:count",
    package: "search",
    tool: "count",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Match counting, less common than search itself.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── HTTP (4 tools) ────────────────────────────────────────────

  {
    id: "http:request",
    package: "http",
    tool: "request",
    frequency: "low",
    frequencyWeight: 0.3,
    frequencySource: "Generic HTTP requests, specialized usage.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "http:get",
    package: "http",
    tool: "get",
    frequency: "low",
    frequencyWeight: 0.25,
    frequencySource: "HTTP GET, most common HTTP verb.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "http:post",
    package: "http",
    tool: "post",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "HTTP POST, used for API interactions.",
    status: "skip",
    skipReason: "Mutating: sends POST requests to external services.",
    scenarioId: null,
    results: null,
  },
  {
    id: "http:head",
    package: "http",
    tool: "head",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "HTTP HEAD, checking resource existence/headers.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Make (2 tools) ────────────────────────────────────────────
  // Source 1: make = 2.7% of all CLI commands

  {
    id: "make:run",
    package: "make",
    tool: "run",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Source 1: make=2.7%. Running make targets.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "make:list",
    package: "make",
    tool: "list",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Listing available make targets.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Python (11 tools) ─────────────────────────────────────────

  {
    id: "python:pytest",
    package: "python",
    tool: "pytest",
    frequency: "medium",
    frequencyWeight: 0.8,
    frequencySource: "Source 5: SWE-bench agents run pytest heavily. Primary Python test runner.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:pip-install",
    package: "python",
    tool: "pip-install",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Python dependency installation.",
    status: "skip",
    skipReason: "Mutating: installs packages into the Python environment.",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:mypy",
    package: "python",
    tool: "mypy",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Python type checking, used in typed Python projects.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:ruff-check",
    package: "python",
    tool: "ruff-check",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Fast Python linter, growing adoption.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:ruff-format",
    package: "python",
    tool: "ruff-format",
    frequency: "low",
    frequencyWeight: 0.25,
    frequencySource: "Python formatting via ruff.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:pip-list",
    package: "python",
    tool: "pip-list",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Listing installed Python packages.",
    status: "tested",
    scenarioId: "pip-list",
    results: null,
  },
  {
    id: "python:pip-show",
    package: "python",
    tool: "pip-show",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Package detail inspection.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:pip-audit",
    package: "python",
    tool: "pip-audit",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Python dependency security audit.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:uv-install",
    package: "python",
    tool: "uv-install",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "UV package manager installation.",
    status: "skip",
    skipReason: "Mutating: installs packages via uv.",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:uv-run",
    package: "python",
    tool: "uv-run",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Running commands via uv.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "python:black",
    package: "python",
    tool: "black",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Python formatting via Black. Being supplanted by ruff-format.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Cargo (11 tools) ──────────────────────────────────────────

  {
    id: "cargo:build",
    package: "cargo",
    tool: "build",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Primary Rust build command. Used in every Rust dev session.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:test",
    package: "cargo",
    tool: "test",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Rust test runner. Core dev loop for Rust projects.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:clippy",
    package: "cargo",
    tool: "clippy",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Rust linter. Standard in Rust development.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:check",
    package: "cargo",
    tool: "check",
    frequency: "medium",
    frequencyWeight: 0.4,
    frequencySource: "Fast type/borrow check without full build.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:run",
    package: "cargo",
    tool: "run",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Running Rust binaries during development.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:fmt",
    package: "cargo",
    tool: "fmt",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Rust formatting via rustfmt.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:add",
    package: "cargo",
    tool: "add",
    frequency: "low",
    frequencyWeight: 0.15,
    frequencySource: "Adding dependencies to Cargo.toml.",
    status: "skip",
    skipReason: "Mutating: modifies Cargo.toml.",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:remove",
    package: "cargo",
    tool: "remove",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Removing dependencies from Cargo.toml.",
    status: "skip",
    skipReason: "Mutating: modifies Cargo.toml.",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:doc",
    package: "cargo",
    tool: "doc",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Generating Rust documentation.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:update",
    package: "cargo",
    tool: "update",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Updating dependencies in Cargo.lock.",
    status: "skip",
    skipReason: "Mutating: modifies Cargo.lock.",
    scenarioId: null,
    results: null,
  },
  {
    id: "cargo:tree",
    package: "cargo",
    tool: "tree",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Dependency tree visualization.",
    status: "pending",
    scenarioId: null,
    results: null,
  },

  // ─── Go (10 tools) ─────────────────────────────────────────────
  // Source 1: go = 3.8% of all CLI commands

  {
    id: "go:build",
    package: "go",
    tool: "build",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Source 1: go=3.8%. Primary Go build command.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:test",
    package: "go",
    tool: "test",
    frequency: "medium",
    frequencyWeight: 0.5,
    frequencySource: "Source 1: go=3.8%. Go test runner.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:vet",
    package: "go",
    tool: "vet",
    frequency: "medium",
    frequencyWeight: 0.3,
    frequencySource: "Go static analysis, standard in dev loop.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:fmt",
    package: "go",
    tool: "fmt",
    frequency: "low",
    frequencyWeight: 0.25,
    frequencySource: "Go formatting, often run automatically.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:run",
    package: "go",
    tool: "run",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Running Go programs during development.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:mod-tidy",
    package: "go",
    tool: "mod-tidy",
    frequency: "low",
    frequencyWeight: 0.2,
    frequencySource: "Module cleanup, run after dependency changes.",
    status: "skip",
    skipReason: "Mutating: modifies go.mod and go.sum.",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:generate",
    package: "go",
    tool: "generate",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Code generation, specialized usage.",
    status: "skip",
    skipReason: "Mutating: generates code files.",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:env",
    package: "go",
    tool: "env",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Go environment inspection.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:list",
    package: "go",
    tool: "list",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Listing Go packages/modules.",
    status: "pending",
    scenarioId: null,
    results: null,
  },
  {
    id: "go:get",
    package: "go",
    tool: "get",
    frequency: "low",
    frequencyWeight: 0.1,
    frequencySource: "Adding/updating Go dependencies.",
    status: "skip",
    skipReason: "Mutating: modifies go.mod and downloads packages.",
    scenarioId: null,
    results: null,
  },
];

// ─── Functions ────────────────────────────────────────────────────

/**
 * Link existing scenario results to registry entries.
 * For tools with multiple scenarios (e.g. git:log has git-log-oneline and git-log-stat),
 * the preferred scenario is used.
 */
export function linkScenariosToRegistry(
  registry: ToolRegistryEntry[],
  summaries: ScenarioSummary[],
): ToolRegistryEntry[] {
  const summaryMap = new Map<string, ScenarioSummary>();
  for (const s of summaries) {
    summaryMap.set(s.scenario.id, s);
  }

  return registry.map((entry) => {
    // Find which scenario maps to this tool
    let matchedSummary: ScenarioSummary | undefined;

    for (const [scenarioId, toolId] of Object.entries(SCENARIO_TO_TOOL)) {
      if (toolId === entry.id) {
        const summary = summaryMap.get(scenarioId);
        if (summary) {
          // If there's a preferred scenario for this tool, use it
          const preferred = PREFERRED_SCENARIO[entry.id];
          if (preferred && preferred === scenarioId) {
            matchedSummary = summary;
            break;
          }
          // Otherwise use the first match (or override if no preference set)
          if (!matchedSummary || !preferred) {
            matchedSummary = summary;
          }
        }
      }
    }

    if (matchedSummary) {
      const rawTokens = matchedSummary.medianRawTokens;
      const pareTokens = matchedSummary.medianPareTokens;
      return {
        ...entry,
        status: "tested" as BenchmarkStatus,
        scenarioId: matchedSummary.scenario.id,
        results: {
          rawTokens,
          pareTokens,
          reduction: matchedSummary.medianReduction,
          tokensSaved: rawTokens - pareTokens,
        },
      };
    }

    return { ...entry };
  });
}

/**
 * Compute projected session savings using frequency-weighted projections.
 *
 * For "skip" tools (mutating), uses the average reduction of tested tools
 * in the same package as an estimate.
 */
export function computeSessionProjection(
  registry: ToolRegistryEntry[],
  callsPerSession: number = 100,
): SessionProjection {
  // Compute per-package average reduction from tested tools
  const packageReductions = new Map<string, { totalReduction: number; count: number }>();
  for (const entry of registry) {
    if (entry.status === "tested" && entry.results) {
      const existing = packageReductions.get(entry.package) ?? { totalReduction: 0, count: 0 };
      existing.totalReduction += entry.results.reduction;
      existing.count++;
      packageReductions.set(entry.package, existing);
    }
  }

  // Global average reduction as fallback
  let globalTotalReduction = 0;
  let globalCount = 0;
  for (const { totalReduction, count } of packageReductions.values()) {
    globalTotalReduction += totalReduction;
    globalCount += count;
  }
  const globalAvgReduction = globalCount > 0 ? globalTotalReduction / globalCount : 0;

  // Compute per-package average
  const pkgAvgReduction = new Map<string, number>();
  for (const [pkg, { totalReduction, count }] of packageReductions) {
    pkgAvgReduction.set(pkg, totalReduction / count);
  }

  let projectedRawTokens = 0;
  let projectedPareTokens = 0;
  let modeledWeight = 0;

  const totalWeight = registry.reduce((sum, e) => sum + e.frequencyWeight, 0);

  for (const entry of registry) {
    const normalizedWeight = entry.frequencyWeight / totalWeight;
    const calls = callsPerSession * normalizedWeight;

    if (entry.status === "tested" && entry.results) {
      // Use actual measured data
      const rawPerCall = entry.results.rawTokens;
      const parePerCall = entry.results.pareTokens;
      projectedRawTokens += calls * rawPerCall;
      projectedPareTokens += calls * parePerCall;
      modeledWeight += entry.frequencyWeight;
    } else if (entry.status === "skip") {
      // Use package average or global average
      const avgReduction = pkgAvgReduction.get(entry.package) ?? globalAvgReduction;
      // Estimate using the global average raw tokens per call
      const testedInPackage = registry.filter(
        (e) => e.package === entry.package && e.status === "tested" && e.results,
      );
      if (testedInPackage.length > 0) {
        const avgRaw =
          testedInPackage.reduce((s, e) => s + (e.results?.rawTokens ?? 0), 0) /
          testedInPackage.length;
        projectedRawTokens += calls * avgRaw;
        projectedPareTokens += calls * avgRaw * (1 - avgReduction / 100);
        modeledWeight += entry.frequencyWeight;
      }
      // If no tested tools in package, skip from projection
    }
    // "pending" tools are not modeled
  }

  const projectedSavings = projectedRawTokens - projectedPareTokens;
  const projectedReduction =
    projectedRawTokens > 0 ? Math.round((1 - projectedPareTokens / projectedRawTokens) * 100) : 0;
  const coveragePercent = totalWeight > 0 ? Math.round((modeledWeight / totalWeight) * 100) : 0;

  return {
    totalCallsModeled: Math.round((modeledWeight / totalWeight) * callsPerSession),
    callsPerSession,
    projectedRawTokens: Math.round(projectedRawTokens),
    projectedPareTokens: Math.round(projectedPareTokens),
    projectedSavings: Math.round(projectedSavings),
    projectedReduction,
    coveragePercent,
  };
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Format the 100-row registry table as markdown.
 * Sorted by frequency weight descending.
 */
export function formatRegistryTable(registry: ToolRegistryEntry[]): string {
  const sorted = [...registry].sort((a, b) => b.frequencyWeight - a.frequencyWeight);
  const lines: string[] = [];

  lines.push("## Tool Coverage Registry (100 tools)");
  lines.push("");

  const tested = registry.filter((e) => e.status === "tested").length;
  const skipped = registry.filter((e) => e.status === "skip").length;
  const pending = registry.filter((e) => e.status === "pending").length;

  lines.push(`**Coverage**: ${tested} tested, ${skipped} skipped (mutating), ${pending} pending`);
  lines.push("");
  lines.push(
    "| # | Package | Tool | Frequency | Weight | Status | Raw Tokens | Pare Tokens | Saved | Reduction |",
  );
  lines.push("|---:|---|---|---|---:|---|---:|---:|---:|---:|");

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const num = i + 1;
    const freq = e.frequency;
    const weight = `${e.frequencyWeight}%`;

    let status: string;
    let rawTokens: string;
    let pareTokens: string;
    let saved: string;
    let reduction: string;

    if (e.status === "tested" && e.results) {
      status = "tested";
      rawTokens = fmtNum(e.results.rawTokens);
      pareTokens = fmtNum(e.results.pareTokens);
      const s = e.results.tokensSaved;
      saved = s >= 0 ? `+${fmtNum(s)}` : fmtNum(s);
      reduction =
        e.results.reduction >= 0 ? `**${e.results.reduction}%**` : `${e.results.reduction}%`;
    } else if (e.status === "skip") {
      status = "skip";
      rawTokens = "—";
      pareTokens = "—";
      saved = "—";
      reduction = `_${e.skipReason?.split(".")[0] ?? "skip"}_`;
    } else {
      status = "pending";
      rawTokens = "—";
      pareTokens = "—";
      saved = "—";
      reduction = "—";
    }

    lines.push(
      `| ${num} | ${e.package} | ${e.tool} | ${freq} | ${weight} | ${status} | ${rawTokens} | ${pareTokens} | ${saved} | ${reduction} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Format session projection section as markdown.
 */
export function formatSessionProjection(
  registry: ToolRegistryEntry[],
  callsPerSession: number = 100,
): string {
  const projection = computeSessionProjection(registry, callsPerSession);
  const lines: string[] = [];

  lines.push("## Session Projection");
  lines.push("");
  lines.push(
    `_Projected savings for a typical ${callsPerSession}-call session, weighted by real-world tool usage frequency._`,
  );
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|---|---:|");
  lines.push(
    `| Calls modeled (tested + estimated) | ${projection.totalCallsModeled} of ${callsPerSession} |`,
  );
  lines.push(`| Projected raw tokens | ${fmtNum(projection.projectedRawTokens)} |`);
  lines.push(`| Projected Pare tokens | ${fmtNum(projection.projectedPareTokens)} |`);
  lines.push(
    `| **Projected savings** | **${fmtNum(projection.projectedSavings)} (${projection.projectedReduction}%)** |`,
  );
  lines.push(`| Coverage (by frequency weight) | ${projection.coveragePercent}% |`);
  lines.push("");

  // Add frequency source citations
  lines.push("### Frequency Data Sources");
  lines.push("");
  lines.push(
    "1. **Jerry Ng — Shell History Analysis (2024)**: git=59%, npm=6.5%, docker=6.1%, go=3.8%, make=2.7%",
  );
  lines.push(
    '2. **Anthropic — "How People Prompt" (2025)**: ~21 tool calls/transcript; File Read 35-45%, Terminal 15-25%, Git 10-15%',
  );
  lines.push(
    "3. **GitClear — Developer Activity (2024-2025)**: Median 2.7 commits/day; commit, push, pull most frequent",
  );
  lines.push("4. **Kevin Magnan — MCP Tool Usage (2025)**: ~120 MCP calls/day over 83 days");
  lines.push(
    "5. **SWE-bench Agent Traces (2024-2025)**: Heavy git status/diff/log for context, test:run for validation",
  );
  lines.push("");

  return lines.join("\n");
}
