#!/usr/bin/env npx tsx
/**
 * Pare Token Benchmark v2 — Mutating Tools (One-Shot)
 *
 * Tests tools that modify state (git commit, npm install, docker run, etc.)
 * Each scenario runs once in an isolated throwaway environment.
 *
 * Setup → Run raw CLI + Pare MCP → Capture tokens → Teardown
 *
 * Results are written to benchmarks/latest-mutating-results.csv
 * in the same format as results-detailed.csv.
 *
 * Usage:
 *   npx tsx scripts/benchmark-v2-mutating.ts
 *   npx tsx scripts/benchmark-v2-mutating.ts --scenario git-add
 *   npx tsx scripts/benchmark-v2-mutating.ts --verbose
 */

import { execFile } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { UseFrequency } from "./benchmark-v2-scenarios.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmarks");
const TEMP_ROOT = resolve(process.env.TEMP ?? process.env.TMP ?? "/tmp", "pare-benchmark-mutating");

// Extend PATH for user-local tool installs
if (process.platform === "win32") {
  const home = process.env.USERPROFILE ?? "";
  const extraPaths = [
    resolve(home, ".local", "bin"),
    resolve(home, "AppData", "Roaming", "Python", "Python313", "Scripts"),
  ];
  process.env.PATH = extraPaths.join(";") + ";" + (process.env.PATH ?? "");
}

// ─── Types ────────────────────────────────────────────────────────

interface MutatingScenario {
  id: string;
  registryNum: number;
  variant: string;
  useFrequency: UseFrequency;
  description: string;
  group: string;
  /** Setup function — creates necessary preconditions, returns cwd for raw command */
  setup: () => Promise<string>;
  /** Raw CLI command and args */
  rawCommand: string;
  rawArgs: string[];
  /** Pare server and tool */
  pareServer: string;
  pareTool: string;
  /** Pare args — may reference __CWD__ which is replaced with setup cwd */
  pareArgs: Record<string, unknown>;
  /** Optional teardown */
  teardown?: () => Promise<void>;
}

interface RunResult {
  scenarioId: string;
  registryNum: number;
  variant: string;
  description: string;
  useFrequency: UseFrequency;
  rawTokens: number;
  pareTokens: number;
  pareRegularTokens: number;
  reduction: number;
  rawLatencyMs: number;
  pareLatencyMs: number;
}

// ─── CLI parsing ──────────────────────────────────────────────────

function parseArgs(): { filter: string[]; verbose: boolean } {
  const argv = process.argv.slice(2);
  const filter: string[] = [];
  let verbose = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--scenario" && argv[i + 1]) {
      filter.push(...argv[++i].split(","));
    }
    if (argv[i] === "--verbose") verbose = true;
  }
  return { filter, verbose };
}

// ─── Utilities ────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function csvEscape(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(vals: (string | number)[]): string {
  return vals.map(csvEscape).join(",");
}

function shell(
  cmd: string,
  args: string[],
  cwd: string,
  timeout = 60_000,
): Promise<{ output: string; latencyMs: number; exitCode: number }> {
  const start = performance.now();
  return new Promise((res) => {
    execFile(
      cmd,
      args,
      {
        cwd,
        timeout,
        shell: process.platform === "win32",
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const latencyMs = Math.round(performance.now() - start);
        res({
          output: stdout + stderr,
          latencyMs,
          exitCode: error ? (typeof error.code === "number" ? error.code : 1) : 0,
        });
      },
    );
  });
}

/** Silent shell — run command, ignore output */
async function run(cmd: string, args: string[], cwd: string): Promise<void> {
  await shell(cmd, args, cwd);
}

// ─── MCP Server pool ─────────────────────────────────────────────

const serverPool = new Map<string, { client: Client; transport: StdioClientTransport }>();

async function getServer(
  serverName: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  if (serverPool.has(serverName)) return serverPool.get(serverName)!;

  const serverPath = resolve(REPO_ROOT, "packages", serverName, "dist", "index.js");
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    stderr: "pipe",
    env: Object.fromEntries(
      Object.entries(process.env).filter((e): e is [string, string] => e[1] != null),
    ),
  });
  const client = new Client({ name: "benchmark-mutating", version: "1.0.0" });
  await client.connect(transport);
  console.log(`  Connected to ${serverName}`);
  serverPool.set(serverName, { client, transport });
  return { client, transport };
}

async function closeAllServers(): Promise<void> {
  for (const [, { transport }] of serverPool) {
    try {
      await transport.close();
    } catch {
      /* ignore */
    }
  }
  serverPool.clear();
}

// ─── Throwaway environment helpers ────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Create a git repo with a bare remote and some initial content */
async function setupGitRepo(): Promise<string> {
  const base = join(TEMP_ROOT, "git-workspace");
  const bare = join(TEMP_ROOT, "git-remote.git");
  const repo = join(base, "repo");

  // Clean previous
  if (existsSync(base)) rmSync(base, { recursive: true, force: true });
  if (existsSync(bare)) rmSync(bare, { recursive: true, force: true });
  ensureDir(repo);

  // Create bare remote
  await run("git", ["init", "--bare", bare], TEMP_ROOT);

  // Create working repo
  await run("git", ["init", "-b", "main"], repo);
  await run("git", ["config", "user.name", "Benchmark"], repo);
  await run("git", ["config", "user.email", "bench@test.local"], repo);

  // Initial commit
  writeFileSync(join(repo, "README.md"), "# Test Repo\n");
  await run("git", ["add", "README.md"], repo);
  await run("git", ["commit", "-m", "initial commit"], repo);

  // Add remote and push
  await run("git", ["remote", "add", "origin", bare], repo);
  await run("git", ["push", "-u", "origin", "main"], repo);

  // Create a feature branch
  await run("git", ["checkout", "-b", "feature-1"], repo);
  writeFileSync(join(repo, "feature.ts"), "export const x = 1;\n");
  await run("git", ["add", "feature.ts"], repo);
  await run("git", ["commit", "-m", "feat: add feature"], repo);
  await run("git", ["checkout", "main"], repo);

  return repo;
}

async function setupNpmProject(): Promise<string> {
  const dir = join(TEMP_ROOT, "npm-project");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "bench-test", version: "1.0.0", private: true }, null, 2),
  );
  return dir;
}

async function setupCargoProject(): Promise<string> {
  const dir = join(TEMP_ROOT, "cargo-project");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  await run("cargo", ["new", "bench-test", "--name", "bench-test"], TEMP_ROOT);
  // cargo new creates TEMP_ROOT/bench-test
  const created = join(TEMP_ROOT, "bench-test");
  // Rename to our expected path
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  await run(
    process.platform === "win32" ? "cmd" : "mv",
    process.platform === "win32" ? ["/c", "move", created, dir] : [created, dir],
    TEMP_ROOT,
  );
  return dir;
}

async function setupGoModule(): Promise<string> {
  const dir = join(TEMP_ROOT, "go-module");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);

  writeFileSync(join(dir, "go.mod"), `module example.com/bench-test\n\ngo 1.21\n`);
  writeFileSync(
    join(dir, "main.go"),
    `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello")\n}\n`,
  );
  return dir;
}

async function setupPythonVenv(): Promise<string> {
  const dir = join(TEMP_ROOT, "python-venv");
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  await run("python", ["-m", "venv", join(dir, ".venv")], dir);
  return dir;
}

// ─── Scenario definitions ─────────────────────────────────────────

let _gitRepo: string | null = null;
async function gitRepo(): Promise<string> {
  if (!_gitRepo) _gitRepo = await setupGitRepo();
  return _gitRepo;
}

let _npmDir: string | null = null;
async function npmDir(): Promise<string> {
  if (!_npmDir) _npmDir = await setupNpmProject();
  return _npmDir;
}

let _cargoDir: string | null = null;
async function cargoDir(): Promise<string> {
  if (!_cargoDir) _cargoDir = await setupCargoProject();
  return _cargoDir;
}

let _goDir: string | null = null;
async function goDir(): Promise<string> {
  if (!_goDir) _goDir = await setupGoModule();
  return _goDir;
}

let _pyDir: string | null = null;
async function pyDir(): Promise<string> {
  if (!_pyDir) _pyDir = await setupPythonVenv();
  return _pyDir;
}

const SCENARIOS: MutatingScenario[] = [
  // ─── Git group ──────────────────────────────────────────────────

  {
    id: "git-add",
    registryNum: 4,
    variant: "A",
    useFrequency: "Very High",
    description: "git add (stage single file)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      writeFileSync(join(repo, "new-file.ts"), "export const y = 2;\n");
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["add", "new-file.ts"],
    pareServer: "server-git",
    pareTool: "add",
    pareArgs: { files: ["new-file.ts"], path: "__CWD__" },
    teardown: async () => {
      const repo = await gitRepo();
      await run("git", ["reset", "HEAD", "new-file.ts"], repo);
    },
  },
  {
    id: "git-commit",
    registryNum: 3,
    variant: "A",
    useFrequency: "Very High",
    description: "git commit (single file, short msg)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      writeFileSync(join(repo, "commit-test.ts"), "export const z = 3;\n");
      await run("git", ["add", "commit-test.ts"], repo);
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["commit", "-m", "test: add commit-test file"],
    pareServer: "server-git",
    pareTool: "commit",
    pareArgs: {
      message: "test: add commit-test file (pare)",
      path: "__CWD__",
    },
    teardown: async () => {
      // Reset the Pare commit (the raw one already happened, Pare makes a second)
      const repo = await gitRepo();
      await run("git", ["reset", "--soft", "HEAD~1"], repo);
      await run("git", ["reset", "HEAD", "commit-test.ts"], repo);
    },
  },
  {
    id: "git-checkout",
    registryNum: 8,
    variant: "A",
    useFrequency: "High",
    description: "git checkout (switch branch)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      // Make sure we're on main
      await run("git", ["checkout", "main"], repo);
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["checkout", "feature-1"],
    pareServer: "server-git",
    pareTool: "checkout",
    pareArgs: { ref: "main", path: "__CWD__" },
    teardown: async () => {
      const repo = await gitRepo();
      await run("git", ["checkout", "main"], repo);
    },
  },
  {
    id: "git-stash",
    registryNum: 76,
    variant: "A",
    useFrequency: "Very Low",
    description: "git stash (push dirty tree)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      await run("git", ["checkout", "main"], repo);
      writeFileSync(join(repo, "stash-test.ts"), "export const s = 99;\n");
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["stash", "push", "-m", "benchmark stash"],
    pareServer: "server-git",
    pareTool: "stash",
    pareArgs: { action: "push", message: "benchmark stash (pare)", path: "__CWD__" },
    teardown: async () => {
      const repo = await gitRepo();
      // Drop any stashes created
      await run("git", ["stash", "drop"], repo).catch(() => {});
      await run("git", ["stash", "drop"], repo).catch(() => {});
    },
  },
  {
    id: "git-push",
    registryNum: 6,
    variant: "A",
    useFrequency: "High",
    description: "git push (fast-forward to bare remote)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      await run("git", ["checkout", "main"], repo);
      writeFileSync(join(repo, "push-test.ts"), "export const p = 42;\n");
      await run("git", ["add", "push-test.ts"], repo);
      await run("git", ["commit", "-m", "feat: push test"], repo);
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["push"],
    pareServer: "server-git",
    pareTool: "push",
    pareArgs: { path: "__CWD__" },
  },
  {
    id: "git-pull",
    registryNum: 10,
    variant: "A",
    useFrequency: "Average",
    description: "git pull (already up to date)",
    group: "git",
    setup: async () => {
      const repo = await gitRepo();
      await run("git", ["checkout", "main"], repo);
      return repo;
    },
    rawCommand: "git",
    rawArgs: ["pull"],
    pareServer: "server-git",
    pareTool: "pull",
    pareArgs: { path: "__CWD__" },
  },

  // ─── npm group ──────────────────────────────────────────────────

  {
    id: "npm-init",
    registryNum: 89,
    variant: "A",
    useFrequency: "Very Low",
    description: "npm init (default, -y)",
    group: "npm",
    setup: async () => {
      const dir = join(TEMP_ROOT, "npm-init-test");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      return dir;
    },
    rawCommand: "npm",
    rawArgs: ["init", "-y"],
    pareServer: "server-npm",
    pareTool: "init",
    pareArgs: { path: "__CWD__" },
  },
  {
    id: "npm-install",
    registryNum: 11,
    variant: "A",
    useFrequency: "Average",
    description: "npm install (add single package)",
    group: "npm",
    setup: async () => {
      const dir = await npmDir();
      // Remove node_modules if present
      const nm = join(dir, "node_modules");
      if (existsSync(nm)) rmSync(nm, { recursive: true, force: true });
      return dir;
    },
    rawCommand: "npm",
    rawArgs: ["install", "is-odd"],
    pareServer: "server-npm",
    pareTool: "install",
    pareArgs: { args: ["is-odd"], path: "__CWD__" },
  },

  // ─── Docker group ───────────────────────────────────────────────

  {
    id: "docker-run",
    registryNum: 29,
    variant: "A",
    useFrequency: "Low",
    description: "docker run (alpine echo hello)",
    group: "docker",
    setup: async () => TEMP_ROOT,
    rawCommand: "docker",
    rawArgs: ["run", "--rm", "alpine", "echo", "hello from benchmark"],
    pareServer: "server-docker",
    pareTool: "run",
    pareArgs: {
      image: "alpine",
      command: ["echo", "hello from benchmark (pare)"],
      remove: true,
    },
  },
  {
    id: "docker-pull",
    registryNum: 64,
    variant: "A",
    useFrequency: "Very Low",
    description: "docker pull (already up-to-date)",
    group: "docker",
    setup: async () => {
      // Pre-pull so the actual benchmark measures "already exists"
      await shell("docker", ["pull", "alpine:latest"], TEMP_ROOT, 120_000);
      return TEMP_ROOT;
    },
    rawCommand: "docker",
    rawArgs: ["pull", "alpine:latest"],
    pareServer: "server-docker",
    pareTool: "pull",
    pareArgs: { image: "alpine:latest" },
  },
  {
    id: "docker-exec",
    registryNum: 43,
    variant: "A",
    useFrequency: "Very Low",
    description: "docker exec (ls in running container)",
    group: "docker",
    setup: async () => {
      // Start a container to exec into
      await shell(
        "docker",
        ["run", "-d", "--name", "bench-exec-target", "alpine", "sleep", "300"],
        TEMP_ROOT,
      );
      return TEMP_ROOT;
    },
    rawCommand: "docker",
    rawArgs: ["exec", "bench-exec-target", "ls", "/"],
    pareServer: "server-docker",
    pareTool: "exec",
    pareArgs: { container: "bench-exec-target", command: ["ls", "/"] },
    teardown: async () => {
      await shell("docker", ["rm", "-f", "bench-exec-target"], TEMP_ROOT);
    },
  },
  {
    id: "docker-compose-up",
    registryNum: 44,
    variant: "A",
    useFrequency: "Very Low",
    description: "docker compose up (single service)",
    group: "docker",
    setup: async () => {
      const dir = join(TEMP_ROOT, "compose-test");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "compose.yaml"),
        `services:\n  web:\n    image: alpine\n    command: sleep 300\n`,
      );
      return dir;
    },
    rawCommand: "docker",
    rawArgs: ["compose", "up", "-d"],
    pareServer: "server-docker",
    pareTool: "compose-up",
    pareArgs: { path: "__CWD__", detach: true },
    teardown: async () => {
      const dir = join(TEMP_ROOT, "compose-test");
      await shell("docker", ["compose", "down"], dir);
    },
  },
  {
    id: "docker-compose-down",
    registryNum: 54,
    variant: "A",
    useFrequency: "Very Low",
    description: "docker compose down (stop service)",
    group: "docker",
    setup: async () => {
      const dir = join(TEMP_ROOT, "compose-down-test");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "compose.yaml"),
        `services:\n  web:\n    image: alpine\n    command: sleep 300\n`,
      );
      await shell("docker", ["compose", "up", "-d"], dir, 60_000);
      return dir;
    },
    rawCommand: "docker",
    rawArgs: ["compose", "down"],
    pareServer: "server-docker",
    pareTool: "compose-down",
    pareArgs: { path: "__CWD__" },
  },

  // ─── HTTP group ─────────────────────────────────────────────────

  {
    id: "http-post",
    registryNum: 82,
    variant: "A",
    useFrequency: "Very Low",
    description: "HTTP POST JSON (httpbin)",
    group: "http",
    setup: async () => TEMP_ROOT,
    rawCommand: "curl",
    rawArgs: [
      "-s",
      "-X",
      "POST",
      "https://httpbin.org/post",
      "-H",
      "Content-Type: application/json",
      "-d",
      '{"key":"value"}',
    ],
    pareServer: "server-http",
    pareTool: "post",
    pareArgs: {
      url: "https://httpbin.org/post",
      body: { key: "value" },
      headers: { "Content-Type": "application/json" },
    },
  },

  // ─── GitHub group ───────────────────────────────────────────────
  // pr-create and issue-create require a real GitHub repo.
  // We use the Pare repo's own API — create then immediately delete.

  {
    id: "github-issue-create",
    registryNum: 66,
    variant: "A",
    useFrequency: "Very Low",
    description: "GitHub issue create (then delete)",
    group: "github",
    setup: async () => REPO_ROOT,
    rawCommand: "gh",
    rawArgs: [
      "issue",
      "create",
      "--repo",
      "Dave-London/pare",
      "--title",
      "[benchmark] test issue — auto-delete",
      "--body",
      "Auto-created by benchmark. Will be deleted immediately.",
    ],
    pareServer: "server-github",
    pareTool: "issue-create",
    pareArgs: {
      repo: "Dave-London/pare",
      title: "[benchmark] test issue (pare) — auto-delete",
      body: "Auto-created by benchmark (Pare). Will be deleted immediately.",
    },
    teardown: async () => {
      // Close both issues we just created
      const result = await shell(
        "gh",
        [
          "issue",
          "list",
          "--repo",
          "Dave-London/pare",
          "--search",
          "[benchmark] test issue",
          "--json",
          "number",
          "--limit",
          "5",
        ],
        REPO_ROOT,
      );
      try {
        const issues = JSON.parse(result.output);
        for (const issue of issues) {
          await shell(
            "gh",
            [
              "issue",
              "close",
              String(issue.number),
              "--repo",
              "Dave-London/pare",
              "--reason",
              "not planned",
            ],
            REPO_ROOT,
          );
          await shell(
            "gh",
            ["issue", "delete", String(issue.number), "--repo", "Dave-London/pare", "--yes"],
            REPO_ROOT,
          );
        }
      } catch {
        console.log("  ⚠ Could not auto-delete benchmark issues");
      }
    },
  },

  // ─── Python group ───────────────────────────────────────────────

  {
    id: "pip-install",
    registryNum: 33,
    variant: "A",
    useFrequency: "Low",
    description: "pip install (single package)",
    group: "python",
    setup: async () => {
      const dir = await pyDir();
      return dir;
    },
    rawCommand:
      process.platform === "win32"
        ? join(TEMP_ROOT, "python-venv", ".venv", "Scripts", "pip.exe")
        : join(TEMP_ROOT, "python-venv", ".venv", "bin", "pip"),
    rawArgs: ["install", "six"],
    pareServer: "server-python",
    pareTool: "pip-install",
    pareArgs: { packages: ["six"], path: "__CWD__" },
  },
  {
    id: "uv-install",
    registryNum: 85,
    variant: "A",
    useFrequency: "Very Low",
    description: "uv pip install (single package)",
    group: "python",
    setup: async () => {
      const dir = await pyDir();
      return dir;
    },
    rawCommand: "uv",
    rawArgs: [
      "pip",
      "install",
      "requests",
      "--python",
      process.platform === "win32"
        ? join(TEMP_ROOT, "python-venv", ".venv", "Scripts", "python.exe")
        : join(TEMP_ROOT, "python-venv", ".venv", "bin", "python"),
    ],
    pareServer: "server-python",
    pareTool: "uv-install",
    pareArgs: { packages: ["requests"], path: "__CWD__" },
  },

  // ─── Python tool error scenarios ──────────────────────────────

  {
    id: "mypy-violations",
    registryNum: 48,
    variant: "B",
    useFrequency: "Very Low",
    description: "mypy (file with ~8 type errors)",
    group: "python",
    setup: async () => {
      const dir = join(TEMP_ROOT, "mypy-violations");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "violations.py"),
        [
          "import os",
          "import sys",
          "import json",
          "import re",
          "",
          "def bad_return(x: int) -> str:",
          "    return x + 1",
          "",
          "def no_return_type(a, b):",
          "    result: str = a + b",
          "    return result",
          "",
          "class Foo:",
          "    def method(self) -> int:",
          '        return "hello"',
          "",
          'x: int = "not an int"',
          'y = bad_return("string")',
          "",
        ].join("\n"),
      );
      return dir;
    },
    rawCommand: "mypy",
    rawArgs: ["violations.py"],
    pareServer: "server-python",
    pareTool: "mypy",
    pareArgs: { path: "__CWD__", targets: ["violations.py"] },
  },
  {
    id: "ruff-violations",
    registryNum: 49,
    variant: "B",
    useFrequency: "Very Low",
    description: "ruff check (file with ~10 violations)",
    group: "python",
    setup: async () => {
      const dir = join(TEMP_ROOT, "ruff-violations");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "violations.py"),
        [
          "import os",
          "import sys",
          "import json",
          "import re",
          "import collections",
          "",
          "x=1",
          "y =    2",
          "z = x+y",
          "",
          "try:",
          "    pass",
          "except:",
          "    pass",
          "",
          "if type(x) == int:",
          "    print(x)",
          "",
        ].join("\n"),
      );
      return dir;
    },
    rawCommand: "ruff",
    rawArgs: ["check", "--output-format", "json", "violations.py"],
    pareServer: "server-python",
    pareTool: "ruff-check",
    pareArgs: { path: "__CWD__", targets: ["violations.py"] },
  },
  {
    id: "black-violations",
    registryNum: 87,
    variant: "B",
    useFrequency: "Very Low",
    description: "black check (file with bad formatting)",
    group: "python",
    setup: async () => {
      const dir = join(TEMP_ROOT, "black-violations");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "violations.py"),
        [
          "import   os",
          "x=1",
          "y=     2",
          "z =x+y",
          "def    foo(  a,b ,c   ):",
          "    return a+b+c",
          "class   Bar:",
          "    def   method(  self  ,x,  y):",
          "            return    x+y",
          "if x==1:",
          '    print(   "hello"    )',
          "",
        ].join("\n"),
      );
      return dir;
    },
    rawCommand: "black",
    rawArgs: ["--check", "violations.py"],
    pareServer: "server-python",
    pareTool: "black",
    pareArgs: { path: "__CWD__", targets: ["violations.py"], check: true },
  },
  {
    id: "pip-audit-vulns",
    registryNum: 84,
    variant: "B",
    useFrequency: "Very Low",
    description: "pip-audit (requirements with known vulns)",
    group: "python",
    setup: async () => {
      const dir = join(TEMP_ROOT, "pip-audit-vulns");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      // Pin old versions with known CVEs
      writeFileSync(
        join(dir, "requirements.txt"),
        ["urllib3==1.26.5", "certifi==2023.7.22", "requests==2.25.1", ""].join("\n"),
      );
      return dir;
    },
    rawCommand: "pip-audit",
    rawArgs: ["--format", "json", "-r", "requirements.txt"],
    pareServer: "server-python",
    pareTool: "pip-audit",
    pareArgs: { path: "__CWD__", requirements: "requirements.txt" },
  },

  // ─── Cargo group ────────────────────────────────────────────────

  {
    id: "cargo-add",
    registryNum: 88,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo add (single crate)",
    group: "cargo",
    setup: async () => cargoDir(),
    rawCommand: "cargo",
    rawArgs: ["add", "serde"],
    pareServer: "server-cargo",
    pareTool: "add",
    pareArgs: { crate: "serde", path: "__CWD__" },
  },
  {
    id: "cargo-remove",
    registryNum: 93,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo remove (single crate)",
    group: "cargo",
    setup: async () => {
      const dir = await cargoDir();
      // Ensure serde is added
      await run("cargo", ["add", "serde"], dir);
      return dir;
    },
    rawCommand: "cargo",
    rawArgs: ["remove", "serde"],
    pareServer: "server-cargo",
    pareTool: "remove",
    pareArgs: { crate: "serde", path: "__CWD__" },
  },
  {
    id: "cargo-update",
    registryNum: 95,
    variant: "A",
    useFrequency: "Very Low",
    description: "cargo update (all deps)",
    group: "cargo",
    setup: async () => {
      const dir = await cargoDir();
      // Ensure there's a dependency
      await run("cargo", ["add", "serde"], dir);
      return dir;
    },
    rawCommand: "cargo",
    rawArgs: ["update"],
    pareServer: "server-cargo",
    pareTool: "update",
    pareArgs: { path: "__CWD__" },
  },
  {
    id: "cargo-clippy-warnings",
    registryNum: 50,
    variant: "B",
    useFrequency: "Very Low",
    description: "cargo clippy (code with ~5 warnings)",
    group: "cargo",
    setup: async () => {
      const dir = await cargoDir();
      // Overwrite main.rs with code that triggers clippy warnings
      writeFileSync(
        join(dir, "src", "main.rs"),
        [
          "fn main() {",
          "    let v: Vec<i32> = vec![1, 2, 3];",
          "    // clippy::len_zero — use is_empty()",
          "    if v.len() == 0 {",
          '        println!("empty");',
          "    }",
          "    // clippy::needless_return",
          "    let _s = needless_return_fn();",
          "    // clippy::redundant_clone",
          '    let s1 = String::from("hello");',
          "    let _s2 = s1.clone();",
          "    // clippy::manual_is_ascii_check",
          "    let _b = ('a'..='z').contains(&'x');",
          "}",
          "",
          "fn needless_return_fn() -> i32 {",
          "    return 42;",
          "}",
          "",
        ].join("\n"),
      );
      return dir;
    },
    rawCommand: "cargo",
    rawArgs: ["clippy", "--message-format=json"],
    pareServer: "server-cargo",
    pareTool: "clippy",
    pareArgs: { path: "__CWD__" },
    teardown: async () => {
      // Restore clean main.rs for subsequent cargo scenarios
      const dir = await cargoDir();
      writeFileSync(
        join(dir, "src", "main.rs"),
        'fn main() {\n    println!("Hello, world!");\n}\n',
      );
    },
  },

  // ─── Go group ───────────────────────────────────────────────────

  {
    id: "go-get",
    registryNum: 100,
    variant: "A",
    useFrequency: "Very Low",
    description: "go get (single package)",
    group: "go",
    setup: async () => goDir(),
    rawCommand: "go",
    rawArgs: ["get", "golang.org/x/text"],
    pareServer: "server-go",
    pareTool: "get",
    pareArgs: { packages: ["golang.org/x/text"], path: "__CWD__" },
  },
  {
    id: "go-mod-tidy",
    registryNum: 75,
    variant: "A",
    useFrequency: "Very Low",
    description: "go mod tidy",
    group: "go",
    setup: async () => goDir(),
    rawCommand: "go",
    rawArgs: ["mod", "tidy"],
    pareServer: "server-go",
    pareTool: "mod-tidy",
    pareArgs: { path: "__CWD__" },
  },
  {
    id: "go-generate",
    registryNum: 97,
    variant: "A",
    useFrequency: "Very Low",
    description: "go generate (no directives)",
    group: "go",
    setup: async () => goDir(),
    rawCommand: "go",
    rawArgs: ["generate", "./..."],
    pareServer: "server-go",
    pareTool: "generate",
    pareArgs: { path: "__CWD__" },
  },

  // ─── Lint group ──────────────────────────────────────────────────

  {
    id: "lint-violations",
    registryNum: 17,
    variant: "D",
    useFrequency: "Average",
    description: "ESLint (file with ~15 deliberate violations)",
    group: "lint",
    setup: async () => {
      // Write a temp file into packages/shared/src/ so eslint.config.mjs picks it up.
      // Violations: 5× no-unused-vars (error), 5× no-explicit-any (warn), 5× no-console (warn)
      const targetDir = resolve(REPO_ROOT, "packages", "shared", "src");
      writeFileSync(
        join(targetDir, "__bench_lint_violations__.ts"),
        [
          "// Deliberate lint violations for benchmark — auto-deleted after run",
          "",
          "// 5× @typescript-eslint/no-unused-vars (error)",
          "const unusedAlpha = 1;",
          "const unusedBravo = 2;",
          "const unusedCharlie = 3;",
          "const unusedDelta = 4;",
          "const unusedEcho = 5;",
          "",
          "// 5× @typescript-eslint/no-explicit-any (warn)",
          "export function fnOne(x: any): any { return x; }",
          "export function fnTwo(a: any, b: any): any { return a + b; }",
          "",
          "// 5× no-console (warn)",
          "console.log('bench1');",
          "console.log('bench2');",
          "console.log('bench3');",
          "console.log('bench4');",
          "console.log('bench5');",
          "",
        ].join("\n"),
      );
      return REPO_ROOT;
    },
    rawCommand: "npx",
    rawArgs: ["eslint", "--format", "json", "packages/shared/src/__bench_lint_violations__.ts"],
    pareServer: "server-lint",
    pareTool: "lint",
    pareArgs: {
      path: "__CWD__",
      patterns: ["packages/shared/src/__bench_lint_violations__.ts"],
    },
    teardown: async () => {
      const f = resolve(REPO_ROOT, "packages", "shared", "src", "__bench_lint_violations__.ts");
      if (existsSync(f)) rmSync(f);
    },
  },
  {
    id: "biome-violations",
    registryNum: 63,
    variant: "B",
    useFrequency: "Very Low",
    description: "Biome check (file with ~13 deliberate violations)",
    group: "lint",
    setup: async () => {
      // Create a temp subdirectory inside the repo so npx can find @biomejs/biome
      // from node_modules, and a local biome.json enables recommended rules.
      const dir = resolve(REPO_ROOT, "__bench_biome__");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      ensureDir(dir);
      writeFileSync(
        join(dir, "biome.json"),
        JSON.stringify(
          {
            $schema: "https://biomejs.dev/schemas/2.0.0/schema.json",
            linter: { enabled: true, rules: { recommended: true } },
          },
          null,
          2,
        ),
      );
      writeFileSync(
        join(dir, "violations.ts"),
        [
          "// Deliberate biome violations for benchmark",
          "var alpha = 1;",
          "var bravo = 2;",
          "var charlie = 3;",
          "if (alpha == bravo) { debugger; }",
          "if (charlie == 0) { debugger; }",
          'let unused1 = "hello";',
          'let unused2 = "world";',
          'let unused3 = "test";',
          "function fn(x: any) { eval('alert(1)'); return x; }",
          "console.log(alpha, fn(bravo));",
          "",
        ].join("\n"),
      );
      return dir;
    },
    rawCommand: "npx",
    rawArgs: ["@biomejs/biome", "check", "--reporter=json", "violations.ts"],
    pareServer: "server-lint",
    pareTool: "biome-check",
    pareArgs: { path: "__CWD__", patterns: ["violations.ts"] },
    teardown: async () => {
      const dir = resolve(REPO_ROOT, "__bench_biome__");
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    },
  },
];

// ─── Scenario runner ──────────────────────────────────────────────

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

async function runScenario(scenario: MutatingScenario): Promise<RunResult> {
  // Setup
  const cwd = await scenario.setup();

  // Resolve Pare args — replace __CWD__
  const pareArgs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scenario.pareArgs)) {
    if (value === "__CWD__") {
      pareArgs[key] = cwd;
    } else {
      pareArgs[key] = value;
    }
  }

  // Get MCP server
  const { client } = await getServer(scenario.pareServer);

  // Run raw CLI
  const raw = await shell(scenario.rawCommand, scenario.rawArgs, cwd, 120_000);

  // Run Pare tool (compact)
  const pareStart = performance.now();
  const pareResult = await client.callTool(
    { name: scenario.pareTool, arguments: pareArgs },
    undefined,
    { timeout: 120_000 },
  );
  const pareLatencyMs = Math.round(performance.now() - pareStart);
  const pareOutput = extractPareOutput(pareResult);

  // Run Pare tool (regular / non-compact)
  const pareRegularResult = await client.callTool(
    { name: scenario.pareTool, arguments: { ...pareArgs, compact: false } },
    undefined,
    { timeout: 120_000 },
  );
  const pareRegularOutput = extractPareOutput(pareRegularResult);

  // Teardown
  if (scenario.teardown) await scenario.teardown();

  const rawTokens = estimateTokens(raw.output);
  const pareTokens = estimateTokens(pareOutput);
  const pareRegularTokens = estimateTokens(pareRegularOutput);
  const reduction = rawTokens > 0 ? Math.round((1 - pareTokens / rawTokens) * 100) : 0;

  return {
    scenarioId: scenario.id,
    registryNum: scenario.registryNum,
    variant: scenario.variant,
    description: scenario.description,
    useFrequency: scenario.useFrequency,
    rawTokens,
    pareTokens,
    pareRegularTokens,
    reduction,
    rawLatencyMs: raw.latencyMs,
    pareLatencyMs,
  };
}

// ─── Main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { filter, verbose } = parseArgs();

  console.log("Pare Token Benchmark v2 — Mutating Tools (One-Shot)");
  console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Temp dir: ${TEMP_ROOT}`);

  // Clean and create temp root
  if (existsSync(TEMP_ROOT)) rmSync(TEMP_ROOT, { recursive: true, force: true });
  ensureDir(TEMP_ROOT);

  // Filter scenarios
  let scenarios = SCENARIOS;
  if (filter.length > 0) {
    scenarios = scenarios.filter((s) => filter.some((f) => s.id === f || s.id.includes(f)));
  }
  console.log(`Scenarios: ${scenarios.length}\n`);

  const results: RunResult[] = [];
  const skipped: string[] = [];

  for (const scenario of scenarios) {
    console.log(`Running ${scenario.registryNum}${scenario.variant} ${scenario.id}...`);
    try {
      const result = await runScenario(scenario);
      results.push(result);
      const pct = result.reduction;
      console.log(
        `  raw=${result.rawTokens} pare=${result.pareTokens} regular=${result.pareRegularTokens} (${pct >= 0 ? "" : ""}${pct}%)`,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ✗ FAILED: ${msg.substring(0, 120)}`);
      skipped.push(scenario.id);
    }
  }

  // Write results CSV
  ensureDir(RESULTS_DIR);
  const lines: string[] = [
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
  ];

  for (const r of results) {
    const ref = `${r.registryNum}${r.variant}`;
    const compacted = r.pareTokens !== r.pareRegularTokens;
    const saved = r.rawTokens - r.pareTokens;
    const addedMs = r.pareLatencyMs - r.rawLatencyMs;
    lines.push(
      csvRow([
        ref,
        r.scenarioId,
        r.description,
        r.useFrequency,
        r.rawTokens,
        r.pareRegularTokens,
        compacted ? r.pareTokens : "",
        saved,
        r.reduction,
        r.rawLatencyMs,
        r.pareLatencyMs,
        addedMs,
      ]),
    );
  }

  writeFileSync(join(RESULTS_DIR, "latest-mutating-results.csv"), lines.join("\n") + "\n");

  // Summary
  const totalRaw = results.reduce((s, r) => s + r.rawTokens, 0);
  const totalPare = results.reduce((s, r) => s + r.pareTokens, 0);
  const pct = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;

  console.log(`\nResults written to ${RESULTS_DIR}/latest-mutating-results.csv`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.join(", ")}`);
  }
  console.log(
    `\nOverall: ${results.length} scenarios, ${totalRaw} raw → ${totalPare} pare (${pct}% reduction)`,
  );

  // Cleanup
  await closeAllServers();

  console.log(`\nCleaning up temp dir: ${TEMP_ROOT}`);
  try {
    // Docker cleanup — ensure no leftover containers
    await shell("docker", ["rm", "-f", "bench-exec-target"], TEMP_ROOT).catch(() => {});
    rmSync(TEMP_ROOT, { recursive: true, force: true });
    console.log("Cleanup complete.");
  } catch (e) {
    console.log(`⚠ Partial cleanup — manually remove: ${TEMP_ROOT}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  closeAllServers().finally(() => process.exit(1));
});
