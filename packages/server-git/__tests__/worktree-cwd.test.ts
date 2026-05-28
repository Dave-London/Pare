import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const PKG_DIR = resolve(__dirname, "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 180_000;

let built = false;
function ensureBuiltArtifacts() {
  if (built) return;
  execFileSync("pnpm", ["build"], {
    cwd: PKG_DIR,
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  built = true;
}

function gitIn(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8" });
}

/**
 * Regression coverage for #876.
 *
 * pare-git is a long-lived MCP server: its `process.cwd()` is its launch dir,
 * NOT the calling client's directory. The reported symptoms were:
 *   - `status` reported clean on a dirty worktree (it actually read the launch dir)
 *   - `checkout` created/moved branches in the parent worktree (data-corruption risk)
 *
 * Because an MCP server cannot know the client's cwd, the contract is that `path`
 * is authoritative. These tests assert:
 *   1. With explicit `path`, tools operate on THAT worktree (status sees the
 *      dirty worktree; checkout creates the branch in the worktree, leaving the
 *      main repo's HEAD untouched).
 *   2. With `path` omitted, tools operate on the server's launch dir — which is
 *      why callers in worktrees MUST pass `path`.
 */
describe("@paretools/git worktree cwd resolution (#876)", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let mainRepo: string;
  let worktree: string;

  beforeAll(async () => {
    ensureBuiltArtifacts();

    // Build a main repo with one commit on a known branch.
    mainRepo = mkdtempSync(join(tmpdir(), "pare-git-876-main-"));
    gitIn(mainRepo, ["init", "-b", "main-branch"]);
    gitIn(mainRepo, ["config", "user.email", "test@test.com"]);
    gitIn(mainRepo, ["config", "user.name", "Test"]);
    writeFileSync(join(mainRepo, "file.txt"), "initial\n");
    gitIn(mainRepo, ["add", "-A"]);
    gitIn(mainRepo, ["commit", "-m", "init"]);

    // Add a nested worktree checked out on its own branch.
    worktree = join(mainRepo, "..", `pare-git-876-wt-${process.pid}`);
    gitIn(mainRepo, ["worktree", "add", "-b", "wt-branch", worktree]);

    // Launch the server with cwd = the MAIN repo (simulating: server launched
    // in the main checkout, while the agent client lives in the worktree).
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
      cwd: mainRepo,
    });
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 180_000);

  afterAll(async () => {
    await transport?.close();
    try {
      gitIn(mainRepo, ["worktree", "remove", "--force", worktree]);
    } catch {
      /* best-effort */
    }
    rmSync(mainRepo, { recursive: true, force: true });
    rmSync(worktree, { recursive: true, force: true });
  }, 30_000);

  it("status with explicit path reports the worktree's dirty state, not the clean main repo", async () => {
    // Dirty ONLY the worktree.
    writeFileSync(join(worktree, "dirty.txt"), "uncommitted\n");

    const result = await client.callTool(
      { name: "status", arguments: { path: worktree } },
      undefined,
      { timeout: CALL_TIMEOUT },
    );
    const sc = result.structuredContent as Record<string, unknown>;

    expect(sc.branch).toBe("wt-branch");
    expect(sc.clean).toBe(false);
    expect(sc.untracked).toContain("dirty.txt");
  });

  it("status without path operates on the server's launch dir (main repo), proving path is authoritative", async () => {
    // The main repo has no uncommitted changes — only the worktree is dirty.
    const result = await client.callTool({ name: "status", arguments: {} }, undefined, {
      timeout: CALL_TIMEOUT,
    });
    const sc = result.structuredContent as Record<string, unknown>;

    // It reads the launch dir (main repo), NOT the dirty worktree. This is the
    // documented behavior callers must account for by passing `path`.
    expect(sc.branch).toBe("main-branch");
    expect(sc.untracked).not.toContain("dirty.txt");
  });

  it("checkout with explicit path creates the branch in the worktree and leaves the main repo untouched", async () => {
    const mainHeadBefore = gitIn(mainRepo, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    expect(mainHeadBefore).toBe("main-branch");

    const result = await client.callTool(
      {
        name: "checkout",
        arguments: { path: worktree, branch: "feature-876", create: true },
      },
      undefined,
      { timeout: CALL_TIMEOUT },
    );
    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc.success).toBe(true);

    // The worktree moved to the new branch...
    const wtHead = gitIn(worktree, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    expect(wtHead).toBe("feature-876");

    // ...and the MAIN repo's HEAD is unchanged (no parent-worktree corruption).
    const mainHeadAfter = gitIn(mainRepo, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    expect(mainHeadAfter).toBe("main-branch");
  });
});
