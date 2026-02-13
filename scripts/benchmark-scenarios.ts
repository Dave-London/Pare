/**
 * Benchmark scenario manifest for Pare.
 *
 * Each scenario pairs a raw CLI command with its equivalent Pare MCP tool.
 * Scenarios are classified as "compact" (raw CLI is already concise) or
 * "verbose" (raw CLI is noisy — Pare saves the most here).
 *
 * Classification is based on empirical results: scenarios where the raw CLI
 * output is already terse (one-line-per-item, tables, short prose) are
 * "compact", while scenarios with decorative formatting, ANSI codes, progress
 * bars, or repeated headers are "verbose".
 */

export type ScenarioClass = "compact" | "verbose";

export interface BenchmarkScenario {
  /** Unique identifier, e.g. "git-status-clean" */
  id: string;
  /** compact = raw CLI is terse; verbose = raw CLI is noisy */
  class: ScenarioClass;
  /** Human-readable description for the report table */
  description: string;
  /** Raw CLI executable, e.g. "git" */
  rawCommand: string;
  /** Raw CLI arguments, e.g. ["status"] */
  rawArgs: string[];
  /** Working directory override (defaults to REPO_ROOT) */
  rawCwd?: string;
  /** Pare server package name, e.g. "server-git" */
  pareServer: string;
  /** Pare tool name, e.g. "status" */
  pareTool: string;
  /** Arguments passed to callTool */
  pareArgs: Record<string, unknown>;
  /** Note explaining parity between raw and Pare outputs */
  parityNotes: string;
}

/**
 * The full scenario matrix. Tuned for scenarios that run cleanly on
 * Windows and Linux CI without requiring Docker, Go, Cargo, pip, or make.
 *
 * Scenarios that require optional tooling are included but the runner
 * skips them with a warning when the CLI isn't available.
 */
export const SCENARIOS: BenchmarkScenario[] = [
  // ─── Compact class ──────────────────────────────────────────────
  // Raw CLI output is already concise. Pare may add overhead here
  // due to JSON structural cost, but provides structured reliability.

  {
    id: "git-status-clean",
    class: "compact",
    description: "Clean working tree",
    rawCommand: "git",
    rawArgs: ["status"],
    pareServer: "server-git",
    pareTool: "status",
    pareArgs: {},
    parityNotes: "Same semantic info, JSON vs prose",
  },
  {
    id: "git-branch",
    class: "compact",
    description: "All branches",
    rawCommand: "git",
    rawArgs: ["branch", "-a"],
    pareServer: "server-git",
    pareTool: "branch",
    pareArgs: { all: true },
    parityNotes: "One line per branch vs structured array",
  },
  {
    id: "git-remote",
    class: "compact",
    description: "Remote URLs",
    rawCommand: "git",
    rawArgs: ["remote", "-v"],
    pareServer: "server-git",
    pareTool: "remote",
    pareArgs: {},
    parityNotes: "2-4 lines vs structured JSON",
  },
  {
    id: "git-log-oneline",
    class: "compact",
    description: "10 commits --oneline",
    rawCommand: "git",
    rawArgs: ["log", "--oneline", "-10"],
    pareServer: "server-git",
    pareTool: "log",
    pareArgs: { maxCount: 10 },
    parityNotes: "Oneline is already concise; Pare adds structured fields",
  },
  {
    id: "git-blame",
    class: "compact",
    description: "Blame on shared/src/output.ts",
    rawCommand: "git",
    rawArgs: ["blame", "--porcelain", "packages/shared/src/output.ts"],
    pareServer: "server-git",
    pareTool: "blame",
    pareArgs: { file: "packages/shared/src/output.ts" },
    parityNotes: "Porcelain blame vs structured JSON — same data source",
  },
  {
    id: "npm-outdated",
    class: "compact",
    description: "npm outdated (on repo)",
    rawCommand: "npm",
    rawArgs: ["outdated"],
    pareServer: "server-npm",
    pareTool: "outdated",
    pareArgs: {},
    parityNotes: "Table output vs structured JSON",
  },
  {
    id: "npm-list",
    class: "compact",
    description: "npm list --depth=0",
    rawCommand: "npm",
    rawArgs: ["list", "--depth=0"],
    pareServer: "server-npm",
    pareTool: "list",
    pareArgs: { depth: 0 },
    parityNotes: "Tree-formatted output vs structured JSON",
  },
  {
    id: "pip-list",
    class: "compact",
    description: "pip list --format json",
    rawCommand: "pip",
    rawArgs: ["list", "--format", "json"],
    pareServer: "server-python",
    pareTool: "pip-list",
    pareArgs: {},
    parityNotes: "Raw JSON array vs structured JSON — same data source",
  },

  // ─── Verbose class ──────────────────────────────────────────────
  // Raw CLI output is noisy with formatting, ANSI codes, progress bars,
  // or repeated headers. Pare delivers the largest savings here.

  {
    id: "git-log-stat",
    class: "verbose",
    description: "5 commits with --stat",
    rawCommand: "git",
    rawArgs: ["log", "-5", "--stat"],
    pareServer: "server-git",
    pareTool: "log",
    pareArgs: { maxCount: 5 },
    parityNotes: "ASCII bar charts + headers vs compact JSON",
  },
  {
    id: "git-show",
    class: "verbose",
    description: "Latest commit details",
    rawCommand: "git",
    rawArgs: ["show", "--stat", "HEAD"],
    pareServer: "server-git",
    pareTool: "show",
    pareArgs: { ref: "HEAD" },
    parityNotes: "Full commit + stat block vs structured JSON",
  },
  {
    id: "git-tag",
    class: "verbose",
    description: "Tag list",
    rawCommand: "git",
    rawArgs: ["tag", "-l"],
    pareServer: "server-git",
    pareTool: "tag",
    pareArgs: {},
    parityNotes: "One per line with annotations vs structured array",
  },
  {
    id: "tsc-errors",
    class: "verbose",
    description: "TypeScript type-check (on repo)",
    rawCommand: "npx",
    rawArgs: ["tsc", "--noEmit"],
    pareServer: "server-build",
    pareTool: "tsc",
    pareArgs: {},
    parityNotes: "Multi-line diagnostics with context vs structured JSON",
  },
  {
    id: "eslint-diag",
    class: "verbose",
    description: "ESLint diagnostics (on server-git)",
    rawCommand: "npx",
    rawArgs: ["eslint", "packages/server-git/src/"],
    pareServer: "server-lint",
    pareTool: "lint",
    pareArgs: { patterns: ["packages/server-git/src/"] },
    parityNotes: "File-grouped diagnostics with context vs flat JSON",
  },
  {
    id: "npm-audit",
    class: "verbose",
    description: "npm audit (on repo)",
    rawCommand: "npm",
    rawArgs: ["audit"],
    pareServer: "server-npm",
    pareTool: "audit",
    pareArgs: {},
    parityNotes: "Multi-line vulnerability blocks vs typed JSON",
  },
  {
    id: "format-check",
    class: "verbose",
    description: "Prettier format check (on shared)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--check", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "format-check",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Decorative output with checkmarks vs structured JSON",
  },
  {
    id: "vitest-run",
    class: "verbose",
    description: "Vitest run (server-git tests)",
    rawCommand: "npx",
    rawArgs: ["vitest", "run"],
    rawCwd: "packages/server-git",
    pareServer: "server-test",
    pareTool: "run",
    pareArgs: { path: "__PACKAGE_PATH__/packages/server-git", framework: "vitest" },
    parityNotes: "ANSI, checkmarks, timing breakdown vs summary JSON",
  },
  {
    id: "npm-test",
    class: "verbose",
    description: "npm test (server-git)",
    rawCommand: "npm",
    rawArgs: ["test"],
    rawCwd: "packages/server-git",
    pareServer: "server-npm",
    pareTool: "test",
    pareArgs: { path: "__PACKAGE_PATH__/packages/server-git" },
    parityNotes: "Test runner noise vs structured summary",
  },
  {
    id: "npm-info",
    class: "verbose",
    description: "npm info @paretools/git",
    rawCommand: "npm",
    rawArgs: ["info", "@paretools/git"],
    pareServer: "server-npm",
    pareTool: "info",
    pareArgs: { package: "@paretools/git" },
    parityNotes: "Verbose package metadata vs structured JSON",
  },
  {
    id: "git-diff-files",
    class: "compact",
    description: "Diff numstat (HEAD~1)",
    rawCommand: "git",
    rawArgs: ["diff", "--numstat", "HEAD~1"],
    pareServer: "server-git",
    pareTool: "diff",
    pareArgs: { ref: "HEAD~1" },
    parityNotes: "Numstat lines vs structured diff stats — same data source",
  },
  {
    id: "npm-run-script",
    class: "verbose",
    description: "npm run build (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "-w", "packages/shared"],
    rawCwd: undefined,
    pareServer: "server-npm",
    pareTool: "run",
    pareArgs: { script: "build", path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "Build output with lifecycle scripts vs structured exit/stdout JSON",
  },
  {
    id: "build-generic",
    class: "verbose",
    description: "Generic build (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "-w", "packages/shared"],
    rawCwd: undefined,
    pareServer: "server-build",
    pareTool: "build",
    pareArgs: { command: "npm", args: ["run", "build"], path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "Build output with noise vs structured JSON with exit code",
  },

  {
    id: "docker-images",
    class: "compact",
    description: "Docker images list",
    rawCommand: "docker",
    rawArgs: ["images"],
    pareServer: "server-docker",
    pareTool: "images",
    pareArgs: {},
    parityNotes: "Table format — compact with few images, verbose at scale",
  },
  {
    id: "docker-ps",
    class: "compact",
    description: "Docker ps -a",
    rawCommand: "docker",
    rawArgs: ["ps", "-a"],
    pareServer: "server-docker",
    pareTool: "ps",
    pareArgs: {},
    parityNotes: "Table format — compact with few containers, verbose at scale",
  },
];
