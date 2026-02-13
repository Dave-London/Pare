#!/usr/bin/env npx tsx
/**
 * Pare Token Benchmark v2 — Mutating Tools (One-Shot)
 *
 * Tests tools that modify state (git commit, npm install, docker run, etc.)
 * Each scenario runs once in an isolated throwaway environment.
 *
 * Setup → Run raw CLI + Pare MCP → Capture tokens → Teardown
 *
 * Results are written to benchmark-results/results-mutating.csv
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
import { writeFileSync, mkdirSync, rmSync, existsSync, appendFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const REPO_ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmark-results");
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
  variant: "A";
  weight: number;
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
  weight: number;
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
    weight: 7,
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
    weight: 10,
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
    weight: 3,
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
    weight: 0.15,
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
    weight: 5,
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
    weight: 2.5,
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
    weight: 0.1,
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
    weight: 2,
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
    weight: 0.5,
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
    weight: 0.2,
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
    weight: 0.4,
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
    weight: 0.4,
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
    weight: 0.3,
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
    weight: 0.15,
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
    weight: 0.2,
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
    weight: 0.5,
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
    weight: 0.15,
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

  // ─── Cargo group ────────────────────────────────────────────────

  {
    id: "cargo-add",
    registryNum: 88,
    variant: "A",
    weight: 0.15,
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
    weight: 0.1,
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
    weight: 0.1,
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

  // ─── Go group ───────────────────────────────────────────────────

  {
    id: "go-get",
    registryNum: 100,
    variant: "A",
    weight: 0.1,
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
    weight: 0.2,
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
    weight: 0.1,
    description: "go generate (no directives)",
    group: "go",
    setup: async () => goDir(),
    rawCommand: "go",
    rawArgs: ["generate", "./..."],
    pareServer: "server-go",
    pareTool: "generate",
    pareArgs: { path: "__CWD__" },
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
    weight: scenario.weight,
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
    console.log(`Running ${scenario.registryNum}A ${scenario.id}...`);
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
        r.weight,
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

  writeFileSync(join(RESULTS_DIR, "results-mutating.csv"), lines.join("\n") + "\n");

  // Write overall summary
  const totalRaw = results.reduce((s, r) => s + r.rawTokens, 0);
  const totalPare = results.reduce((s, r) => s + r.pareTokens, 0);
  const saved = totalRaw - totalPare;
  const pct = totalRaw > 0 ? Math.round((1 - totalPare / totalRaw) * 100) : 0;

  const overallLines = [
    csvRow(["Scenarios", "Total Raw", "Total Pare", "Saved", "Reduction %"]),
    csvRow([results.length, totalRaw, totalPare, saved, pct]),
  ];
  writeFileSync(join(RESULTS_DIR, "results-mutating-overall.csv"), overallLines.join("\n") + "\n");

  // Write methodology
  const methodology = `# Mutating Tools Benchmark — Methodology

## Overview
These ${results.length} scenarios test tools that modify state (git commit, npm install, etc.).
Each was run **once** in an isolated throwaway environment.

## Environment
- Date: ${new Date().toISOString().slice(0, 10)}
- Platform: ${process.platform} (${process.arch})
- Node: ${process.version}
- Temp directory: \`${TEMP_ROOT}\` (created at start, destroyed at end)

## Setup
Each tool group uses an isolated throwaway workspace:
- **Git**: Fresh repo with bare remote at \`${TEMP_ROOT}/git-remote.git\`
- **npm**: Minimal \`package.json\` project
- **Docker**: Uses system Docker daemon; containers removed after each test
- **Cargo**: Fresh \`cargo new\` project
- **Go**: Minimal \`go.mod\` module
- **Python**: Fresh venv at \`${TEMP_ROOT}/python-venv/.venv\`
- **HTTP**: Public httpbin.org endpoint
- **GitHub**: Real API calls to Dave-London/pare; issues created then deleted

## Measurement
- **Raw CLI**: \`execFile(cmd, args, {shell: true})\` — captures stdout + stderr
- **Pare MCP**: \`client.callTool()\` — captures structuredContent JSON or text content
- **Token estimate**: \`Math.ceil(text.length / 4)\` (cl100k_base heuristic)
- **Single run** per scenario (no median — these are one-shot mutating operations)

## Why One-Shot?
Mutating tools change system state on each run. Running them multiple times would require
full setup/teardown cycles and produce different outputs each time (e.g., different commit
hashes, different download progress). A single controlled run captures the representative
token comparison.

## Skipped Scenarios
${skipped.length > 0 ? skipped.map((s) => `- ${s}`).join("\n") : "None — all scenarios completed successfully."}

## Results
See \`results-mutating.csv\` for detailed per-scenario comparison.
See \`results-mutating-overall.csv\` for aggregate summary.
`;

  writeFileSync(join(RESULTS_DIR, "methodology-mutating.md"), methodology);

  // Summary
  console.log(`\nResults written to ${RESULTS_DIR}/`);
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
