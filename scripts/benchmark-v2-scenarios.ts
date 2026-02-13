/**
 * Benchmark v2 scenario manifest — 10 tools × 3 scenarios each = 30 scenarios.
 *
 * Each tool has three variant scenarios (A / B / C) spanning the output-size spectrum:
 *   A = minimal / small output
 *   B = typical / moderate output
 *   C = large / complex output
 *
 * `registryNum` maps to the tool's row in the 100-tool registry
 * (see `C:\pare docs\benchmark-design\tool-registry.csv`).
 */

export interface V2Scenario {
  /** Unique identifier, e.g. "log-5" */
  id: string;
  /** Tool row number from the 100-tool registry */
  registryNum: number;
  /** Variant within the tool: A (small), B (typical), C (large) */
  variant: "A" | "B" | "C";
  /** Use Frequency category from the tool registry */
  useFrequency: "Very High" | "High" | "Average" | "Low" | "Very Low";
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

export const V2_SCENARIOS: V2Scenario[] = [
  // ─── #5 git log (vary commit count) ───────────────────────────

  {
    id: "log-5",
    registryNum: 5,
    variant: "A",
    useFrequency: "Very High",
    description: "5 commits oneline",
    rawCommand: "git",
    rawArgs: ["log", "--oneline", "-5"],
    pareServer: "server-git",
    pareTool: "log",
    pareArgs: { maxCount: 5 },
    parityNotes:
      "Oneline (hash+message) vs structured JSON (adds author, date, refs) — Pare trades tokens for richer data",
  },
  {
    id: "log-20",
    registryNum: 5,
    variant: "B",
    useFrequency: "Very High",
    description: "20 commits oneline",
    rawCommand: "git",
    rawArgs: ["log", "--oneline", "-20"],
    pareServer: "server-git",
    pareTool: "log",
    pareArgs: { maxCount: 20 },
    parityNotes:
      "Oneline (hash+message) vs structured JSON — tests scaling of richer-data overhead",
  },
  {
    id: "log-50",
    registryNum: 5,
    variant: "C",
    useFrequency: "Very High",
    description: "50 commits oneline",
    rawCommand: "git",
    rawArgs: ["log", "--oneline", "-50"],
    pareServer: "server-git",
    pareTool: "log",
    pareArgs: { maxCount: 50 },
    parityNotes:
      "Oneline vs structured JSON at scale — tests where structured overhead breaks even",
  },

  // ─── #2 git diff (vary ref range and full mode) ───────────────

  {
    id: "diff-small",
    registryNum: 2,
    variant: "A",
    useFrequency: "Very High",
    description: "Small diff (HEAD~1)",
    rawCommand: "git",
    rawArgs: ["diff", "--numstat", "HEAD~1"],
    pareServer: "server-git",
    pareTool: "diff",
    pareArgs: { ref: "HEAD~1" },
    parityNotes: "Numstat lines vs structured diff stats",
  },
  {
    id: "diff-large",
    registryNum: 2,
    variant: "B",
    useFrequency: "Very High",
    description: "Large diff (HEAD~5)",
    rawCommand: "git",
    rawArgs: ["diff", "--numstat", "HEAD~5"],
    pareServer: "server-git",
    pareTool: "diff",
    pareArgs: { ref: "HEAD~5" },
    parityNotes: "Multi-commit numstat vs structured diff — tests larger file lists",
  },
  {
    id: "diff-full-patch",
    registryNum: 2,
    variant: "C",
    useFrequency: "Very High",
    description: "Full patch with chunks (HEAD~1)",
    rawCommand: "git",
    rawArgs: ["diff", "HEAD~1"],
    pareServer: "server-git",
    pareTool: "diff",
    pareArgs: { ref: "HEAD~1", full: true },
    parityNotes: "Full unified diff vs structured chunks — highest detail level",
  },

  // ─── #15 git show (vary which commit) ─────────────────────────

  {
    id: "show-head",
    registryNum: 15,
    variant: "A",
    useFrequency: "Average",
    description: "Show HEAD (latest commit)",
    rawCommand: "git",
    rawArgs: ["show", "--stat", "HEAD"],
    pareServer: "server-git",
    pareTool: "show",
    pareArgs: { ref: "HEAD" },
    parityNotes: "Full commit + stat block vs structured JSON",
  },
  {
    id: "show-mid",
    registryNum: 15,
    variant: "B",
    useFrequency: "Average",
    description: "Show HEAD~3 (recent commit)",
    rawCommand: "git",
    rawArgs: ["show", "--stat", "HEAD~3"],
    pareServer: "server-git",
    pareTool: "show",
    pareArgs: { ref: "HEAD~3" },
    parityNotes: "Different commit — may have different diff size",
  },
  {
    id: "show-deep",
    registryNum: 15,
    variant: "C",
    useFrequency: "Average",
    description: "Show HEAD~8 (older commit)",
    rawCommand: "git",
    rawArgs: ["show", "--stat", "HEAD~8"],
    pareServer: "server-git",
    pareTool: "show",
    pareArgs: { ref: "HEAD~8" },
    parityNotes: "Deeper commit — exercises same code path with different data",
  },

  // ─── #24 git blame (vary file size) ───────────────────────────

  {
    id: "blame-small",
    registryNum: 24,
    variant: "A",
    useFrequency: "Low",
    description: "Blame small file (62 lines)",
    rawCommand: "git",
    rawArgs: ["blame", "--porcelain", "packages/shared/src/output.ts"],
    pareServer: "server-git",
    pareTool: "blame",
    pareArgs: { file: "packages/shared/src/output.ts" },
    parityNotes:
      "Porcelain blame (hash, author, date, line, content) vs structured JSON — compact drops author/date",
  },
  {
    id: "blame-medium",
    registryNum: 24,
    variant: "B",
    useFrequency: "Low",
    description: "Blame medium file (130 lines)",
    rawCommand: "git",
    rawArgs: ["blame", "--porcelain", "packages/shared/src/runner.ts"],
    pareServer: "server-git",
    pareTool: "blame",
    pareArgs: { file: "packages/shared/src/runner.ts" },
    parityNotes: "Porcelain blame vs structured JSON on medium file",
  },
  {
    id: "blame-large",
    registryNum: 24,
    variant: "C",
    useFrequency: "Low",
    description: "Blame large file (470 lines)",
    rawCommand: "git",
    rawArgs: ["blame", "--porcelain", "packages/server-git/src/lib/parsers.ts"],
    pareServer: "server-git",
    pareTool: "blame",
    pareArgs: { file: "packages/server-git/src/lib/parsers.ts" },
    parityNotes: "Porcelain blame vs structured JSON on large file",
  },

  // ─── #12 build tsc (vary project scope) ───────────────────────

  {
    id: "tsc-shared",
    registryNum: 12,
    variant: "A",
    useFrequency: "Average",
    description: "TypeScript check (shared pkg)",
    rawCommand: "npx",
    rawArgs: ["tsc", "--noEmit", "-p", "packages/shared/tsconfig.json"],
    pareServer: "server-build",
    pareTool: "tsc",
    pareArgs: { project: "packages/shared/tsconfig.json" },
    parityNotes: "tsc diagnostics vs structured JSON — single small package",
  },
  {
    id: "tsc-server-git",
    registryNum: 12,
    variant: "B",
    useFrequency: "Average",
    description: "TypeScript check (server-git pkg)",
    rawCommand: "npx",
    rawArgs: ["tsc", "--noEmit", "-p", "packages/server-git/tsconfig.json"],
    pareServer: "server-build",
    pareTool: "tsc",
    pareArgs: { project: "packages/server-git/tsconfig.json" },
    parityNotes: "tsc diagnostics vs structured JSON — medium package",
  },
  {
    id: "tsc-repo",
    registryNum: 12,
    variant: "C",
    useFrequency: "Average",
    description: "TypeScript check (whole repo)",
    rawCommand: "npx",
    rawArgs: ["tsc", "--noEmit"],
    pareServer: "server-build",
    pareTool: "tsc",
    pareArgs: {},
    parityNotes: "tsc diagnostics vs structured JSON — full monorepo",
  },

  // ─── #17 lint (vary target directory) ─────────────────────────

  {
    id: "lint-shared",
    registryNum: 17,
    variant: "A",
    useFrequency: "Average",
    description: "ESLint (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["eslint", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "lint",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "ESLint file-grouped diagnostics vs flat JSON",
  },
  {
    id: "lint-server-git",
    registryNum: 17,
    variant: "B",
    useFrequency: "Average",
    description: "ESLint (server-git pkg src)",
    rawCommand: "npx",
    rawArgs: ["eslint", "packages/server-git/src/"],
    pareServer: "server-lint",
    pareTool: "lint",
    pareArgs: { patterns: ["packages/server-git/src/"] },
    parityNotes: "ESLint diagnostics on a larger package",
  },
  {
    id: "lint-server-npm",
    registryNum: 17,
    variant: "C",
    useFrequency: "Average",
    description: "ESLint (server-npm pkg src)",
    rawCommand: "npx",
    rawArgs: ["eslint", "packages/server-npm/src/"],
    pareServer: "server-lint",
    pareTool: "lint",
    pareArgs: { patterns: ["packages/server-npm/src/"] },
    parityNotes: "ESLint diagnostics on another package for variety",
  },

  // ─── #21 format-check (vary target directory) ─────────────────

  {
    id: "format-shared",
    registryNum: 21,
    variant: "A",
    useFrequency: "Low",
    description: "Prettier check (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--check", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "format-check",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Decorative Prettier output vs structured JSON",
  },
  {
    id: "format-server-git",
    registryNum: 21,
    variant: "B",
    useFrequency: "Low",
    description: "Prettier check (server-git pkg src)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--check", "packages/server-git/src/"],
    pareServer: "server-lint",
    pareTool: "format-check",
    pareArgs: { patterns: ["packages/server-git/src/"] },
    parityNotes: "Format check on a larger package",
  },
  {
    id: "format-server-npm",
    registryNum: 21,
    variant: "C",
    useFrequency: "Low",
    description: "Prettier check (server-npm pkg src)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--check", "packages/server-npm/src/"],
    pareServer: "server-lint",
    pareTool: "format-check",
    pareArgs: { patterns: ["packages/server-npm/src/"] },
    parityNotes: "Format check on another package for variety",
  },

  // ─── #7 test run (vary test suite / package) ──────────────────

  {
    id: "test-server-git",
    registryNum: 7,
    variant: "A",
    useFrequency: "High",
    description: "Vitest run (server-git tests)",
    rawCommand: "npx",
    rawArgs: ["vitest", "run"],
    rawCwd: "packages/server-git",
    pareServer: "server-test",
    pareTool: "run",
    pareArgs: { path: "__PACKAGE_PATH__/packages/server-git", framework: "vitest" },
    parityNotes: "ANSI + checkmarks vs summary JSON — large test suite",
  },
  {
    id: "test-shared",
    registryNum: 7,
    variant: "B",
    useFrequency: "High",
    description: "Vitest run (shared tests)",
    rawCommand: "npx",
    rawArgs: ["vitest", "run"],
    rawCwd: "packages/shared",
    pareServer: "server-test",
    pareTool: "run",
    pareArgs: { path: "__PACKAGE_PATH__/packages/shared", framework: "vitest" },
    parityNotes: "ANSI + checkmarks vs summary JSON — smaller test suite",
  },
  {
    id: "test-server-lint",
    registryNum: 7,
    variant: "C",
    useFrequency: "High",
    description: "Vitest run (server-lint tests)",
    rawCommand: "npx",
    rawArgs: ["vitest", "run"],
    rawCwd: "packages/server-lint",
    pareServer: "server-test",
    pareTool: "run",
    pareArgs: { path: "__PACKAGE_PATH__/packages/server-lint", framework: "vitest" },
    parityNotes: "ANSI + checkmarks vs summary JSON — large test suite (161 tests)",
  },

  // ─── #40 npm list (vary depth) ────────────────────────────────

  {
    id: "npm-list-d0",
    registryNum: 40,
    variant: "A",
    useFrequency: "Very Low",
    description: "npm list depth=0",
    rawCommand: "npm",
    rawArgs: ["list", "--depth=0"],
    pareServer: "server-npm",
    pareTool: "list",
    pareArgs: { depth: 0 },
    parityNotes: "Tree-formatted output vs structured JSON — top level only",
  },
  {
    id: "npm-list-d1",
    registryNum: 40,
    variant: "B",
    useFrequency: "Very Low",
    description: "npm list depth=1",
    rawCommand: "npm",
    rawArgs: ["list", "--depth=1"],
    pareServer: "server-npm",
    pareTool: "list",
    pareArgs: { depth: 1 },
    parityNotes: "Tree-formatted output vs structured JSON — one nesting level",
  },
  {
    id: "npm-list-d2",
    registryNum: 40,
    variant: "C",
    useFrequency: "Very Low",
    description: "npm list depth=2",
    rawCommand: "npm",
    rawArgs: ["list", "--depth=2"],
    pareServer: "server-npm",
    pareTool: "list",
    pareArgs: { depth: 2 },
    parityNotes: "Tree-formatted output vs structured JSON — deep nesting",
  },

  // ─── #53 npm info (vary queried package) ──────────────────────

  {
    id: "npm-info-small",
    registryNum: 53,
    variant: "A",
    useFrequency: "Very Low",
    description: "npm info (small package)",
    rawCommand: "npm",
    rawArgs: ["info", "@paretools/shared"],
    pareServer: "server-npm",
    pareTool: "info",
    pareArgs: { package: "@paretools/shared" },
    parityNotes: "Verbose npm metadata vs structured JSON — small package",
  },
  {
    id: "npm-info-medium",
    registryNum: 53,
    variant: "B",
    useFrequency: "Very Low",
    description: "npm info (medium package)",
    rawCommand: "npm",
    rawArgs: ["info", "@paretools/git"],
    pareServer: "server-npm",
    pareTool: "info",
    pareArgs: { package: "@paretools/git" },
    parityNotes: "Verbose npm metadata vs structured JSON — medium package",
  },
  {
    id: "npm-info-popular",
    registryNum: 53,
    variant: "C",
    useFrequency: "Very Low",
    description: "npm info (popular package)",
    rawCommand: "npm",
    rawArgs: ["info", "express"],
    pareServer: "server-npm",
    pareTool: "info",
    pareArgs: { package: "express" },
    parityNotes: "Verbose npm metadata vs structured JSON — popular, many versions",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 2 — remaining git + npm tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #1 git status (state-dependent — 1 scenario) ──────────────

  {
    id: "status",
    registryNum: 1,
    variant: "A",
    useFrequency: "Very High",
    description: "Repo status (current state)",
    rawCommand: "git",
    rawArgs: ["status"],
    pareServer: "server-git",
    pareTool: "status",
    pareArgs: {},
    parityNotes:
      "Verbose status text vs structured JSON (branch, staged, modified, untracked, conflicts)",
  },

  // ─── #14 git branch (vary all flag) ────────────────────────────

  {
    id: "branch-local",
    registryNum: 14,
    variant: "A",
    useFrequency: "Average",
    description: "Local branches only",
    rawCommand: "git",
    rawArgs: ["branch"],
    pareServer: "server-git",
    pareTool: "branch",
    pareArgs: {},
    parityNotes: "Branch list with current marker vs structured JSON",
  },
  {
    id: "branch-all",
    registryNum: 14,
    variant: "B",
    useFrequency: "Average",
    description: "All branches including remotes",
    rawCommand: "git",
    rawArgs: ["branch", "-a"],
    pareServer: "server-git",
    pareTool: "branch",
    pareArgs: { all: true },
    parityNotes: "Full branch list with remotes vs structured JSON — more entries",
  },

  // ─── #38 git tag (state-dependent — 1 scenario) ────────────────

  {
    id: "tag-list",
    registryNum: 38,
    variant: "A",
    useFrequency: "Very Low",
    description: "List all tags",
    rawCommand: "git",
    rawArgs: ["tag"],
    pareServer: "server-git",
    pareTool: "tag",
    pareArgs: {},
    parityNotes: "Plain tag names vs structured JSON with dates and messages",
  },

  // ─── #52 git remote (state-dependent — 1 scenario) ─────────────

  {
    id: "remote-list",
    registryNum: 52,
    variant: "A",
    useFrequency: "Very Low",
    description: "List remotes with URLs",
    rawCommand: "git",
    rawArgs: ["remote", "-v"],
    pareServer: "server-git",
    pareTool: "remote",
    pareArgs: {},
    parityNotes: "Verbose remote output (fetch+push lines) vs structured JSON",
  },

  // ─── #61 git stash-list (state-dependent — 1 scenario) ─────────

  {
    id: "stash-list",
    registryNum: 61,
    variant: "A",
    useFrequency: "Very Low",
    description: "List stashes",
    rawCommand: "git",
    rawArgs: ["stash", "list"],
    pareServer: "server-git",
    pareTool: "stash-list",
    pareArgs: {},
    parityNotes: "Stash list entries vs structured JSON — may be empty",
  },

  // ─── #9 npm run (vary script) ──────────────────────────────────

  {
    id: "npm-run-build",
    registryNum: 9,
    variant: "A",
    useFrequency: "High",
    description: "npm run build (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "--prefix", "packages/shared"],
    pareServer: "server-npm",
    pareTool: "run",
    pareArgs: { script: "build", path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes:
      "Build output with npm lifecycle headers vs structured JSON (exitCode, stdout, stderr, duration)",
  },
  {
    id: "npm-run-lint",
    registryNum: 9,
    variant: "B",
    useFrequency: "High",
    description: "npm run lint (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "lint", "--prefix", "packages/shared"],
    pareServer: "server-npm",
    pareTool: "run",
    pareArgs: { script: "lint", path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "Lint output with npm lifecycle headers vs structured JSON",
  },
  {
    id: "npm-run-test",
    registryNum: 9,
    variant: "C",
    useFrequency: "High",
    description: "npm run test (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "test", "--prefix", "packages/shared"],
    pareServer: "server-npm",
    pareTool: "run",
    pareArgs: { script: "test", path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "Test output with npm lifecycle headers vs structured JSON — larger output",
  },

  // ─── #13 npm test (vary package) ───────────────────────────────

  {
    id: "npm-test-shared",
    registryNum: 13,
    variant: "A",
    useFrequency: "Average",
    description: "npm test (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["test", "--prefix", "packages/shared"],
    pareServer: "server-npm",
    pareTool: "test",
    pareArgs: { path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes:
      "Vitest ANSI output wrapped in npm headers vs structured JSON (exitCode, stdout, stderr, duration)",
  },
  {
    id: "npm-test-server-git",
    registryNum: 13,
    variant: "B",
    useFrequency: "Average",
    description: "npm test (server-git pkg)",
    rawCommand: "npm",
    rawArgs: ["test", "--prefix", "packages/server-git"],
    pareServer: "server-npm",
    pareTool: "test",
    pareArgs: { path: "__PACKAGE_PATH__/packages/server-git" },
    parityNotes: "Larger test suite — npm test wraps vitest output",
  },

  // ─── #25 npm audit (state-dependent — 1 scenario) ──────────────

  {
    id: "npm-audit",
    registryNum: 25,
    variant: "A",
    useFrequency: "Low",
    description: "npm audit",
    rawCommand: "npm",
    rawArgs: ["audit"],
    pareServer: "server-npm",
    pareTool: "audit",
    pareArgs: {},
    parityNotes: "Verbose audit report with table vs structured JSON severity breakdown",
  },

  // ─── #39 npm outdated (state-dependent — 1 scenario) ───────────

  {
    id: "npm-outdated",
    registryNum: 39,
    variant: "A",
    useFrequency: "Very Low",
    description: "Check outdated packages",
    rawCommand: "npm",
    rawArgs: ["outdated"],
    pareServer: "server-npm",
    pareTool: "outdated",
    pareArgs: {},
    parityNotes: "Table-formatted outdated list vs structured JSON with current/wanted/latest",
  },

  // ─── #77 npm search (vary query) ───────────────────────────────

  {
    id: "npm-search-narrow",
    registryNum: 77,
    variant: "A",
    useFrequency: "Very Low",
    description: "npm search (narrow query)",
    rawCommand: "npm",
    rawArgs: ["search", "@paretools/git"],
    pareServer: "server-npm",
    pareTool: "search",
    pareArgs: { query: "@paretools/git" },
    parityNotes: "npm search table output vs structured JSON — few results",
  },
  {
    id: "npm-search-broad",
    registryNum: 77,
    variant: "B",
    useFrequency: "Very Low",
    description: "npm search (broad query)",
    rawCommand: "npm",
    rawArgs: ["search", "mcp server tools"],
    pareServer: "server-npm",
    pareTool: "search",
    pareArgs: { query: "mcp server tools" },
    parityNotes: "npm search table output vs structured JSON — more results",
  },
  {
    id: "npm-search-popular",
    registryNum: 77,
    variant: "C",
    useFrequency: "Very Low",
    description: "npm search (popular query)",
    rawCommand: "npm",
    rawArgs: ["search", "express middleware"],
    pareServer: "server-npm",
    pareTool: "search",
    pareArgs: { query: "express middleware" },
    parityNotes: "npm search table output vs structured JSON — popular packages",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 3 — build + lint + test coverage tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #16 build (vary package/command) ──────────────────────────

  {
    id: "build-shared",
    registryNum: 16,
    variant: "A",
    useFrequency: "Average",
    description: "Build (shared pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "--prefix", "packages/shared"],
    pareServer: "server-build",
    pareTool: "build",
    pareArgs: { command: "npm", args: ["run", "build"], path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "npm build output vs structured JSON (success, errors, warnings, duration)",
  },
  {
    id: "build-server-git",
    registryNum: 16,
    variant: "B",
    useFrequency: "Average",
    description: "Build (server-git pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "--prefix", "packages/server-git"],
    pareServer: "server-build",
    pareTool: "build",
    pareArgs: {
      command: "npm",
      args: ["run", "build"],
      path: "__PACKAGE_PATH__/packages/server-git",
    },
    parityNotes: "Build output for a larger package vs structured JSON",
  },
  {
    id: "build-server-npm",
    registryNum: 16,
    variant: "C",
    useFrequency: "Average",
    description: "Build (server-npm pkg)",
    rawCommand: "npm",
    rawArgs: ["run", "build", "--prefix", "packages/server-npm"],
    pareServer: "server-build",
    pareTool: "build",
    pareArgs: {
      command: "npm",
      args: ["run", "build"],
      path: "__PACKAGE_PATH__/packages/server-npm",
    },
    parityNotes: "Build output for another package vs structured JSON",
  },

  // ─── #41 esbuild (vary entry point) ────────────────────────────

  {
    id: "esbuild-shared",
    registryNum: 41,
    variant: "A",
    useFrequency: "Very Low",
    description: "esbuild bundle (shared pkg)",
    rawCommand: "npx",
    rawArgs: [
      "esbuild",
      "packages/shared/src/index.ts",
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--outfile=/dev/null",
    ],
    pareServer: "server-build",
    pareTool: "esbuild",
    pareArgs: {
      entryPoints: ["packages/shared/src/index.ts"],
      platform: "node",
      format: "esm",
      outfile: "dist/bench-tmp.js",
    },
    parityNotes: "esbuild CLI output vs structured JSON (output files, errors, warnings)",
  },

  // ─── #42 vite-build (vary package) ─────────────────────────────

  {
    id: "vite-build",
    registryNum: 42,
    variant: "A",
    useFrequency: "Very Low",
    description: "Vite build (shared pkg)",
    rawCommand: "npx",
    rawArgs: ["vite", "build"],
    rawCwd: "packages/shared",
    pareServer: "server-build",
    pareTool: "vite-build",
    pareArgs: { path: "__PACKAGE_PATH__/packages/shared" },
    parityNotes: "Vite build output vs structured JSON — may fail without vite config",
  },

  // ─── #62 webpack (vary config) ─────────────────────────────────

  {
    id: "webpack-build",
    registryNum: 62,
    variant: "A",
    useFrequency: "Very Low",
    description: "Webpack build",
    rawCommand: "npx",
    rawArgs: ["webpack", "--mode", "production"],
    pareServer: "server-build",
    pareTool: "webpack",
    pareArgs: { mode: "production" },
    parityNotes: "Webpack CLI output vs structured JSON — may fail without config",
  },

  // ─── #26 test coverage (vary package) ──────────────────────────

  {
    id: "coverage-shared",
    registryNum: 26,
    variant: "A",
    useFrequency: "Low",
    description: "Test coverage (shared pkg)",
    rawCommand: "npx",
    rawArgs: ["vitest", "run", "--coverage"],
    rawCwd: "packages/shared",
    pareServer: "server-test",
    pareTool: "coverage",
    pareArgs: { path: "__PACKAGE_PATH__/packages/shared", framework: "vitest" },
    parityNotes: "Vitest coverage table with ANSI vs structured JSON per-file coverage",
  },

  // ─── #27 prettier-format (vary target) ─────────────────────────

  {
    id: "prettier-format-shared",
    registryNum: 27,
    variant: "A",
    useFrequency: "Low",
    description: "Prettier format (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--write", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "prettier-format",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Prettier write output vs structured JSON list of changed files",
  },
  {
    id: "prettier-format-server-git",
    registryNum: 27,
    variant: "B",
    useFrequency: "Low",
    description: "Prettier format (server-git pkg src)",
    rawCommand: "npx",
    rawArgs: ["prettier", "--write", "packages/server-git/src/"],
    pareServer: "server-lint",
    pareTool: "prettier-format",
    pareArgs: { patterns: ["packages/server-git/src/"] },
    parityNotes: "Prettier write output on larger package vs structured JSON",
  },

  // ─── #63 lint biome-check (vary target) ────────────────────────

  {
    id: "biome-check-shared",
    registryNum: 63,
    variant: "A",
    useFrequency: "Very Low",
    description: "Biome check (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["biome", "check", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "biome-check",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Biome lint+format output vs structured JSON diagnostics",
  },

  // ─── #78 lint biome-format (vary target) ───────────────────────

  {
    id: "biome-format-shared",
    registryNum: 78,
    variant: "A",
    useFrequency: "Very Low",
    description: "Biome format (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["biome", "format", "--write", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "biome-format",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Biome format output vs structured JSON changed files list",
  },

  // ─── #90 lint stylelint (vary target) ──────────────────────────

  {
    id: "stylelint-check",
    registryNum: 90,
    variant: "A",
    useFrequency: "Very Low",
    description: "Stylelint check",
    rawCommand: "npx",
    rawArgs: ["stylelint", "**/*.css"],
    pareServer: "server-lint",
    pareTool: "stylelint",
    pareArgs: { patterns: ["**/*.css"] },
    parityNotes: "Stylelint output vs structured JSON diagnostics",
  },

  // ─── #91 lint oxlint (vary target) ─────────────────────────────

  {
    id: "oxlint-check",
    registryNum: 91,
    variant: "A",
    useFrequency: "Very Low",
    description: "Oxlint check (shared pkg src)",
    rawCommand: "npx",
    rawArgs: ["oxlint", "packages/shared/src/"],
    pareServer: "server-lint",
    pareTool: "oxlint",
    pareArgs: { patterns: ["packages/shared/src/"] },
    parityNotes: "Oxlint output vs structured JSON diagnostics",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 4 — search + HTTP + make tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #31 search (vary pattern breadth) ─────────────────────────

  {
    id: "search-narrow",
    registryNum: 31,
    variant: "A",
    useFrequency: "Low",
    description: "Search narrow pattern (5 matches)",
    rawCommand: "rg",
    rawArgs: ["compactDualOutput", "packages/shared/src/"],
    pareServer: "server-search",
    pareTool: "search",
    pareArgs: { pattern: "compactDualOutput", path: "__PACKAGE_PATH__/packages/shared/src/" },
    parityNotes: "Both search for pattern in shared/src — few results",
  },
  {
    id: "search-broad",
    registryNum: 31,
    variant: "B",
    useFrequency: "Low",
    description: "Search broad pattern (50+ matches)",
    rawCommand: "rg",
    rawArgs: ["import", "packages/shared/src/"],
    pareServer: "server-search",
    pareTool: "search",
    pareArgs: { pattern: "import", path: "__PACKAGE_PATH__/packages/shared/src/" },
    parityNotes: "Both search for 'import' in shared/src — many results",
  },
  {
    id: "search-regex",
    registryNum: 31,
    variant: "C",
    useFrequency: "Low",
    description: "Search regex pattern across files",
    rawCommand: "rg",
    rawArgs: ["function\\s+\\w+", "packages/shared/src/"],
    pareServer: "server-search",
    pareTool: "search",
    pareArgs: { pattern: "function\\s+\\w+", path: "__PACKAGE_PATH__/packages/shared/src/" },
    parityNotes: "Both run regex search — tests regex handling across files",
  },

  // ─── #47 find (vary pattern/extension) ─────────────────────────

  {
    id: "find-ts",
    registryNum: 47,
    variant: "A",
    useFrequency: "Very Low",
    description: "Find *.ts files (shared pkg)",
    rawCommand: "rg",
    rawArgs: ["--files", "--glob", "*.ts", "packages/shared/src/"],
    pareServer: "server-search",
    pareTool: "find",
    pareArgs: { extension: "ts", path: "__PACKAGE_PATH__/packages/shared/src/" },
    parityNotes: "rg --files list vs structured JSON file list — small directory",
  },
  {
    id: "find-test-files",
    registryNum: 47,
    variant: "B",
    useFrequency: "Very Low",
    description: "Find test files (whole repo)",
    rawCommand: "rg",
    rawArgs: ["--files", "--glob", "*.test.*", "packages/"],
    pareServer: "server-search",
    pareTool: "find",
    pareArgs: { pattern: "*.test.*", path: "__PACKAGE_PATH__/packages/" },
    parityNotes: "rg --files with glob vs structured JSON — many test files across repo",
  },
  {
    id: "find-all-ts",
    registryNum: 47,
    variant: "C",
    useFrequency: "Very Low",
    description: "Find all *.ts files (whole repo)",
    rawCommand: "rg",
    rawArgs: ["--files", "--glob", "*.ts", "packages/"],
    pareServer: "server-search",
    pareTool: "find",
    pareArgs: { extension: "ts", path: "__PACKAGE_PATH__/packages/" },
    parityNotes: "rg --files vs structured JSON — large file list across packages",
  },

  // ─── #69 count (vary pattern) ──────────────────────────────────

  {
    id: "count-rare",
    registryNum: 69,
    variant: "A",
    useFrequency: "Very Low",
    description: "Count rare pattern matches",
    rawCommand: "rg",
    rawArgs: ["--count", "compactDualOutput", "packages/shared/src/"],
    pareServer: "server-search",
    pareTool: "count",
    pareArgs: { pattern: "compactDualOutput", path: "__PACKAGE_PATH__/packages/shared/src/" },
    parityNotes: "rg --count per-file counts vs structured JSON breakdown",
  },
  {
    id: "count-common",
    registryNum: 69,
    variant: "B",
    useFrequency: "Very Low",
    description: "Count common pattern matches",
    rawCommand: "rg",
    rawArgs: ["--count", "import", "packages/"],
    pareServer: "server-search",
    pareTool: "count",
    pareArgs: { pattern: "import", path: "__PACKAGE_PATH__/packages/" },
    parityNotes: "rg --count per-file counts vs structured JSON — many files",
  },

  // ─── #56 http request (vary method/URL) ────────────────────────

  {
    id: "http-request-get",
    registryNum: 56,
    variant: "A",
    useFrequency: "Very Low",
    description: "HTTP GET small JSON",
    rawCommand: "curl",
    rawArgs: ["-s", "-i", "https://httpbin.org/json"],
    pareServer: "server-http",
    pareTool: "request",
    pareArgs: { url: "https://httpbin.org/json", method: "GET" },
    parityNotes: "curl headers+body vs structured JSON (status, headers, body, duration)",
  },
  {
    id: "http-request-post",
    registryNum: 56,
    variant: "B",
    useFrequency: "Very Low",
    description: "HTTP POST with JSON body",
    rawCommand: "curl",
    rawArgs: [
      "-s",
      "-i",
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-d",
      '{"key":"value"}',
      "https://httpbin.org/post",
    ],
    pareServer: "server-http",
    pareTool: "request",
    pareArgs: {
      url: "https://httpbin.org/post",
      method: "POST",
      body: '{"key":"value"}',
      headers: { "Content-Type": "application/json" },
    },
    parityNotes: "curl POST output vs structured JSON response",
  },

  // ─── #58 http get (vary response size) ─────────────────────────

  {
    id: "http-get-small",
    registryNum: 58,
    variant: "A",
    useFrequency: "Very Low",
    description: "HTTP GET small response",
    rawCommand: "curl",
    rawArgs: ["-s", "-i", "https://httpbin.org/ip"],
    pareServer: "server-http",
    pareTool: "get",
    pareArgs: { url: "https://httpbin.org/ip" },
    parityNotes: "curl headers+body vs structured JSON — small response",
  },
  {
    id: "http-get-headers",
    registryNum: 58,
    variant: "B",
    useFrequency: "Very Low",
    description: "HTTP GET with many headers",
    rawCommand: "curl",
    rawArgs: ["-s", "-i", "https://httpbin.org/headers"],
    pareServer: "server-http",
    pareTool: "get",
    pareArgs: { url: "https://httpbin.org/headers" },
    parityNotes: "curl output vs structured JSON — tests header parsing",
  },

  // ─── #92 http head (vary URL) ──────────────────────────────────

  {
    id: "http-head-200",
    registryNum: 92,
    variant: "A",
    useFrequency: "Very Low",
    description: "HTTP HEAD 200 response",
    rawCommand: "curl",
    rawArgs: ["-s", "-I", "https://httpbin.org/status/200"],
    pareServer: "server-http",
    pareTool: "head",
    pareArgs: { url: "https://httpbin.org/status/200" },
    parityNotes: "curl HEAD output vs structured JSON — headers only",
  },

  // ─── #32 make run (vary target) ────────────────────────────────

  {
    id: "make-run",
    registryNum: 32,
    variant: "A",
    useFrequency: "Low",
    description: "Make run target",
    rawCommand: "make",
    rawArgs: ["help"],
    pareServer: "server-make",
    pareTool: "run",
    pareArgs: { target: "help" },
    parityNotes: "Both run `make help` — will error without Makefile (parity preserved)",
  },

  // ─── #70 make list (list targets) ──────────────────────────────

  {
    id: "make-list",
    registryNum: 70,
    variant: "A",
    useFrequency: "Very Low",
    description: "Make list targets",
    rawCommand: "make",
    rawArgs: ["-pRrq"],
    pareServer: "server-make",
    pareTool: "list",
    pareArgs: {},
    parityNotes: "make database dump vs structured JSON target list — may be skipped",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 5 — Docker tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #18 docker ps (vary all flag) ─────────────────────────────

  {
    id: "docker-ps",
    registryNum: 18,
    variant: "A",
    useFrequency: "Low",
    description: "Docker ps (running)",
    rawCommand: "docker",
    rawArgs: ["ps"],
    pareServer: "server-docker",
    pareTool: "ps",
    pareArgs: { all: false },
    parityNotes: "docker ps table output vs structured JSON — running containers only",
  },
  {
    id: "docker-ps-all",
    registryNum: 18,
    variant: "B",
    useFrequency: "Low",
    description: "Docker ps (all containers)",
    rawCommand: "docker",
    rawArgs: ["ps", "-a"],
    pareServer: "server-docker",
    pareTool: "ps",
    pareArgs: { all: true },
    parityNotes: "docker ps -a table vs structured JSON — includes stopped containers",
  },

  // ─── #20 docker images (vary all flag) ─────────────────────────

  {
    id: "docker-images",
    registryNum: 20,
    variant: "A",
    useFrequency: "Low",
    description: "Docker images",
    rawCommand: "docker",
    rawArgs: ["images"],
    pareServer: "server-docker",
    pareTool: "images",
    pareArgs: {},
    parityNotes: "docker images table vs structured JSON — repository, tag, size",
  },
  {
    id: "docker-images-all",
    registryNum: 20,
    variant: "B",
    useFrequency: "Low",
    description: "Docker images (all including intermediate)",
    rawCommand: "docker",
    rawArgs: ["images", "-a"],
    pareServer: "server-docker",
    pareTool: "images",
    pareArgs: { all: true },
    parityNotes: "docker images -a vs structured JSON — includes intermediate layers",
  },

  // ─── #22 docker build (would need Dockerfile — 1 scenario) ─────

  {
    id: "docker-build",
    registryNum: 22,
    variant: "A",
    useFrequency: "Low",
    description: "Docker build (no Dockerfile)",
    rawCommand: "docker",
    rawArgs: ["build", "."],
    pareServer: "server-docker",
    pareTool: "build",
    pareArgs: { path: "__PACKAGE_PATH__" },
    parityNotes: "Both attempt `docker build .` — will fail without Dockerfile (parity preserved)",
  },

  // ─── #28 docker logs (needs running container) ─────────────────

  {
    id: "docker-logs",
    registryNum: 28,
    variant: "A",
    useFrequency: "Low",
    description: "Docker logs (tail 10)",
    rawCommand: "docker",
    rawArgs: ["logs", "--tail", "10", "nonexistent"],
    pareServer: "server-docker",
    pareTool: "logs",
    pareArgs: { container: "nonexistent", tail: 10 },
    parityNotes: "docker logs output vs structured JSON — will fail if no container running",
  },

  // ─── #65 docker inspect (needs container/image) ────────────────

  {
    id: "docker-inspect",
    registryNum: 65,
    variant: "A",
    useFrequency: "Very Low",
    description: "Docker inspect",
    rawCommand: "docker",
    rawArgs: ["inspect", "nonexistent"],
    pareServer: "server-docker",
    pareTool: "inspect",
    pareArgs: { target: "nonexistent" },
    parityNotes: "docker inspect JSON blob vs structured JSON — will fail if target doesn't exist",
  },

  // ─── #79 docker network ls (state-dependent) ──────────────────

  {
    id: "docker-network-ls",
    registryNum: 79,
    variant: "A",
    useFrequency: "Very Low",
    description: "Docker network ls",
    rawCommand: "docker",
    rawArgs: ["network", "ls"],
    pareServer: "server-docker",
    pareTool: "network-ls",
    pareArgs: {},
    parityNotes: "docker network table vs structured JSON — at minimum bridge/host/none",
  },

  // ─── #80 docker volume ls (state-dependent) ────────────────────

  {
    id: "docker-volume-ls",
    registryNum: 80,
    variant: "A",
    useFrequency: "Very Low",
    description: "Docker volume ls",
    rawCommand: "docker",
    rawArgs: ["volume", "ls"],
    pareServer: "server-docker",
    pareTool: "volume-ls",
    pareArgs: {},
    parityNotes: "docker volume table vs structured JSON",
  },

  // ─── #81 docker compose ps (state-dependent) ───────────────────

  {
    id: "docker-compose-ps",
    registryNum: 81,
    variant: "A",
    useFrequency: "Very Low",
    description: "Docker compose ps",
    rawCommand: "docker",
    rawArgs: ["compose", "ps"],
    pareServer: "server-docker",
    pareTool: "compose-ps",
    pareArgs: {},
    parityNotes: "docker compose ps table vs structured JSON — may be empty",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 6 — GitHub tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #23 github pr-view (vary PR) ──────────────────────────────

  {
    id: "pr-view",
    registryNum: 23,
    variant: "A",
    useFrequency: "Low",
    description: "View PR #198",
    rawCommand: "gh",
    rawArgs: ["pr", "view", "198"],
    pareServer: "server-github",
    pareTool: "pr-view",
    pareArgs: { number: 198 },
    parityNotes:
      "gh pr view text output vs structured JSON (title, body, author, state, labels, etc.)",
  },

  // ─── #30 github pr-list (vary state/limit) ────────────────────

  {
    id: "pr-list-open",
    registryNum: 30,
    variant: "A",
    useFrequency: "Low",
    description: "List open PRs",
    rawCommand: "gh",
    rawArgs: ["pr", "list", "--state", "open"],
    pareServer: "server-github",
    pareTool: "pr-list",
    pareArgs: { state: "open" },
    parityNotes: "gh pr list table vs structured JSON — open PRs",
  },
  {
    id: "pr-list-closed",
    registryNum: 30,
    variant: "B",
    useFrequency: "Low",
    description: "List closed PRs",
    rawCommand: "gh",
    rawArgs: ["pr", "list", "--state", "closed", "--limit", "20"],
    pareServer: "server-github",
    pareTool: "pr-list",
    pareArgs: { state: "closed", limit: 20 },
    parityNotes: "gh pr list table vs structured JSON — more history",
  },

  // ─── #46 github issue-view (vary issue) ────────────────────────

  {
    id: "issue-view",
    registryNum: 46,
    variant: "A",
    useFrequency: "Very Low",
    description: "View issue #123",
    rawCommand: "gh",
    rawArgs: ["issue", "view", "123"],
    pareServer: "server-github",
    pareTool: "issue-view",
    pareArgs: { number: 123 },
    parityNotes: "gh issue view text output vs structured JSON",
  },

  // ─── #55 github issue-list (vary state) ────────────────────────

  {
    id: "issue-list-open",
    registryNum: 55,
    variant: "A",
    useFrequency: "Very Low",
    description: "List open issues",
    rawCommand: "gh",
    rawArgs: ["issue", "list", "--state", "open"],
    pareServer: "server-github",
    pareTool: "issue-list",
    pareArgs: { state: "open" },
    parityNotes: "gh issue list table vs structured JSON — open issues",
  },
  {
    id: "issue-list-all",
    registryNum: 55,
    variant: "B",
    useFrequency: "Very Low",
    description: "List all issues (open+closed)",
    rawCommand: "gh",
    rawArgs: ["issue", "list", "--state", "all", "--limit", "30"],
    pareServer: "server-github",
    pareTool: "issue-list",
    pareArgs: { state: "all", limit: 30 },
    parityNotes: "gh issue list table vs structured JSON — full history",
  },

  // ─── #67 github run-view (specific run) ────────────────────────

  {
    id: "run-view",
    registryNum: 67,
    variant: "A",
    useFrequency: "Very Low",
    description: "View workflow run",
    rawCommand: "gh",
    rawArgs: ["run", "view", "21958530089"],
    pareServer: "server-github",
    pareTool: "run-view",
    pareArgs: { id: 21958530089 },
    parityNotes: "gh run view text output vs structured JSON (status, jobs, duration)",
  },

  // ─── #68 github run-list (vary limit) ──────────────────────────

  {
    id: "run-list",
    registryNum: 68,
    variant: "A",
    useFrequency: "Very Low",
    description: "List recent workflow runs",
    rawCommand: "gh",
    rawArgs: ["run", "list", "--limit", "10"],
    pareServer: "server-github",
    pareTool: "run-list",
    pareArgs: { limit: 10 },
    parityNotes: "gh run list table vs structured JSON — recent CI runs",
  },
  {
    id: "run-list-20",
    registryNum: 68,
    variant: "B",
    useFrequency: "Very Low",
    description: "List 20 workflow runs",
    rawCommand: "gh",
    rawArgs: ["run", "list", "--limit", "20"],
    pareServer: "server-github",
    pareTool: "run-list",
    pareArgs: { limit: 20 },
    parityNotes: "gh run list table vs structured JSON — more history",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 7 — Python tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #71 pip list (state-dependent — 1 scenario) ───────────────

  {
    id: "pip-list",
    registryNum: 71,
    variant: "A",
    useFrequency: "Very Low",
    description: "pip list installed packages",
    rawCommand: "pip",
    rawArgs: ["list"],
    pareServer: "server-python",
    pareTool: "pip-list",
    pareArgs: {},
    parityNotes: "pip list table vs structured JSON — all installed packages",
  },

  // ─── #83 pip show (vary package) ───────────────────────────────

  {
    id: "pip-show-pip",
    registryNum: 83,
    variant: "A",
    useFrequency: "Very Low",
    description: "pip show (pip itself)",
    rawCommand: "pip",
    rawArgs: ["show", "pip"],
    pareServer: "server-python",
    pareTool: "pip-show",
    pareArgs: { package: "pip" },
    parityNotes: "pip show metadata vs structured JSON",
  },

  // ─── #84 pip audit (state-dependent — 1 scenario) ──────────────

  {
    id: "pip-audit",
    registryNum: 84,
    variant: "A",
    useFrequency: "Very Low",
    description: "pip audit",
    rawCommand: "pip",
    rawArgs: ["audit"],
    pareServer: "server-python",
    pareTool: "pip-audit",
    pareArgs: {},
    parityNotes: "pip audit output vs structured JSON — may skip if pip-audit not installed",
  },

  // ─── #19 pytest (needs Python test project) ────────────────────

  {
    id: "pytest",
    registryNum: 19,
    variant: "A",
    useFrequency: "Low",
    description: "pytest run",
    rawCommand: "python",
    rawArgs: ["-m", "pytest"],
    pareServer: "server-python",
    pareTool: "pytest",
    pareArgs: {},
    parityNotes: "Both run pytest — no Python tests in repo so output is minimal",
  },

  // ─── #48 mypy (needs Python project) ───────────────────────────

  {
    id: "mypy-check",
    registryNum: 48,
    variant: "A",
    useFrequency: "Very Low",
    description: "mypy type check",
    rawCommand: "mypy",
    rawArgs: ["."],
    pareServer: "server-python",
    pareTool: "mypy",
    pareArgs: {},
    parityNotes: "Both run mypy on cwd — no Python files in repo so output is minimal",
  },

  // ─── #49 ruff check (needs Python project) ────────────────────

  {
    id: "ruff-check",
    registryNum: 49,
    variant: "A",
    useFrequency: "Very Low",
    description: "ruff check",
    rawCommand: "ruff",
    rawArgs: ["check", "."],
    pareServer: "server-python",
    pareTool: "ruff-check",
    pareArgs: {},
    parityNotes:
      "ruff check output vs structured JSON diagnostics — may skip if ruff not installed",
  },

  // ─── #59 ruff format (needs Python project) ───────────────────

  {
    id: "ruff-format",
    registryNum: 59,
    variant: "A",
    useFrequency: "Very Low",
    description: "ruff format check",
    rawCommand: "ruff",
    rawArgs: ["format", "--check", "."],
    pareServer: "server-python",
    pareTool: "ruff-format",
    pareArgs: {},
    parityNotes: "ruff format output vs structured JSON — may skip if ruff not installed",
  },

  // ─── #86 uv run (needs Python script) ─────────────────────────

  {
    id: "uv-run",
    registryNum: 86,
    variant: "A",
    useFrequency: "Very Low",
    description: "uv run (python version)",
    rawCommand: "uv",
    rawArgs: ["run", "python", "--version"],
    pareServer: "server-python",
    pareTool: "uv-run",
    pareArgs: { command: "python", args: ["--version"] },
    parityNotes: "uv run output vs structured JSON (exitCode, stdout, stderr, duration)",
  },

  // ─── #87 black (needs Python project) ──────────────────────────

  {
    id: "black-check",
    registryNum: 87,
    variant: "A",
    useFrequency: "Very Low",
    description: "black format check",
    rawCommand: "black",
    rawArgs: ["--check", "."],
    pareServer: "server-python",
    pareTool: "black",
    pareArgs: {},
    parityNotes: "black output vs structured JSON — may skip if black not installed",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 8 — Cargo tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #34 cargo build (needs Rust project) ──────────────────────

  {
    id: "cargo-build",
    registryNum: 34,
    variant: "A",
    useFrequency: "Low",
    description: "cargo build",
    rawCommand: "cargo",
    rawArgs: ["build"],
    pareServer: "server-cargo",
    pareTool: "build",
    pareArgs: {},
    parityNotes: "cargo build output vs structured JSON — will fail without Cargo.toml",
  },

  // ─── #35 cargo test (needs Rust project) ───────────────────────

  {
    id: "cargo-test",
    registryNum: 35,
    variant: "A",
    useFrequency: "Low",
    description: "cargo test",
    rawCommand: "cargo",
    rawArgs: ["test"],
    pareServer: "server-cargo",
    pareTool: "test",
    pareArgs: {},
    parityNotes: "cargo test output vs structured JSON — will fail without Cargo.toml",
  },

  // ─── #50 cargo clippy (needs Rust project) ────────────────────

  {
    id: "cargo-clippy",
    registryNum: 50,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo clippy",
    rawCommand: "cargo",
    rawArgs: ["clippy"],
    pareServer: "server-cargo",
    pareTool: "clippy",
    pareArgs: {},
    parityNotes: "cargo clippy output vs structured JSON diagnostics — needs Cargo.toml",
  },

  // ─── #51 cargo check (needs Rust project) ─────────────────────

  {
    id: "cargo-check",
    registryNum: 51,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo check",
    rawCommand: "cargo",
    rawArgs: ["check"],
    pareServer: "server-cargo",
    pareTool: "check",
    pareArgs: {},
    parityNotes: "cargo check output vs structured JSON — needs Cargo.toml",
  },

  // ─── #73 cargo fmt (needs Rust project) ────────────────────────

  {
    id: "cargo-fmt",
    registryNum: 73,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo fmt check",
    rawCommand: "cargo",
    rawArgs: ["fmt", "--check"],
    pareServer: "server-cargo",
    pareTool: "fmt",
    pareArgs: {},
    parityNotes: "cargo fmt output vs structured JSON — needs Cargo.toml",
  },

  // ─── #96 cargo tree (needs Rust project) ───────────────────────

  {
    id: "cargo-tree",
    registryNum: 96,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo tree",
    rawCommand: "cargo",
    rawArgs: ["tree"],
    pareServer: "server-cargo",
    pareTool: "tree",
    pareArgs: {},
    parityNotes: "cargo tree ASCII output vs structured JSON — needs Cargo.toml",
  },

  // ─── #94 cargo doc (needs Rust project) ────────────────────────

  {
    id: "cargo-doc",
    registryNum: 94,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo doc",
    rawCommand: "cargo",
    rawArgs: ["doc", "--no-deps"],
    pareServer: "server-cargo",
    pareTool: "doc",
    pareArgs: {},
    parityNotes: "cargo doc output vs structured JSON — needs Cargo.toml",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Batch 9 — Go tools
  // ═══════════════════════════════════════════════════════════════════

  // ─── #36 go build (needs Go project) ───────────────────────────

  {
    id: "go-build",
    registryNum: 36,
    variant: "A",
    useFrequency: "Low",
    description: "go build",
    rawCommand: "go",
    rawArgs: ["build", "./..."],
    pareServer: "server-go",
    pareTool: "build",
    pareArgs: {},
    parityNotes: "go build output vs structured JSON — will fail without go.mod",
  },

  // ─── #37 go test (needs Go project) ────────────────────────────

  {
    id: "go-test",
    registryNum: 37,
    variant: "A",
    useFrequency: "Low",
    description: "go test",
    rawCommand: "go",
    rawArgs: ["test", "./..."],
    pareServer: "server-go",
    pareTool: "test",
    pareArgs: {},
    parityNotes: "go test output vs structured JSON — will fail without go.mod",
  },

  // ─── #57 go vet (needs Go project) ────────────────────────────

  {
    id: "go-vet",
    registryNum: 57,
    variant: "A",
    useFrequency: "Very Low",
    description: "go vet",
    rawCommand: "go",
    rawArgs: ["vet", "./..."],
    pareServer: "server-go",
    pareTool: "vet",
    pareArgs: {},
    parityNotes: "go vet output vs structured JSON — will fail without go.mod",
  },

  // ─── #60 go fmt (needs Go project) ────────────────────────────

  {
    id: "go-fmt",
    registryNum: 60,
    variant: "A",
    useFrequency: "Very Low",
    description: "go fmt",
    rawCommand: "go",
    rawArgs: ["fmt", "./..."],
    pareServer: "server-go",
    pareTool: "fmt",
    pareArgs: {},
    parityNotes: "go fmt output vs structured JSON — will fail without go.mod",
  },

  // ─── #98 go env (always works) ─────────────────────────────────

  {
    id: "go-env",
    registryNum: 98,
    variant: "A",
    useFrequency: "Very Low",
    description: "go env",
    rawCommand: "go",
    rawArgs: ["env"],
    pareServer: "server-go",
    pareTool: "env",
    pareArgs: {},
    parityNotes: "go env key=value dump vs structured JSON — works without project",
  },

  // ─── #99 go list (needs Go project) ────────────────────────────

  {
    id: "go-list",
    registryNum: 99,
    variant: "A",
    useFrequency: "Very Low",
    description: "go list",
    rawCommand: "go",
    rawArgs: ["list", "./..."],
    pareServer: "server-go",
    pareTool: "list",
    pareArgs: {},
    parityNotes: "go list output vs structured JSON — will fail without go.mod",
  },

  // ─── #72 cargo run (needs Rust project with binary) ───────────

  {
    id: "cargo-run",
    registryNum: 72,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo run (version flag)",
    rawCommand: "cargo",
    rawArgs: ["run", "--", "--version"],
    pareServer: "server-cargo",
    pareTool: "run",
    pareArgs: { args: ["--", "--version"] },
    parityNotes: "Passthrough: output depends on executed binary, not the tool",
  },

  // ─── #74 go run (needs Go project with main) ─────────────────

  {
    id: "go-run",
    registryNum: 74,
    variant: "A",
    useFrequency: "Very Low",
    description: "go run (main package)",
    rawCommand: "go",
    rawArgs: ["run", "."],
    pareServer: "server-go",
    pareTool: "run",
    pareArgs: { args: ["."] },
    parityNotes: "Passthrough: output depends on executed program, not the tool",
  },
];
