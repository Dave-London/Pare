import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
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
 * End-to-end coverage for the #921 safe-worktree-cleanup capabilities:
 *   Part 1 — branch `mergedInto`: per-branch merged/unmerged ancestry.
 *   Part 2 — worktree list `withStatus` / `mergedInto` enrichment.
 *   Part 3 — worktree `prune-merged`: removes merged-clean worktrees, skips
 *            dirty and unmerged ones, and refuses the main/current worktree.
 */
describe("@paretools/git worktree safe cleanup (#921)", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let mainRepo: string;
  let wtMerged: string;
  let wtUnmerged: string;
  let wtDirty: string;

  beforeAll(async () => {
    ensureBuiltArtifacts();

    // Main repo on branch `trunk` with one commit.
    mainRepo = mkdtempSync(join(tmpdir(), "pare-git-921-main-"));
    gitIn(mainRepo, ["init", "-b", "trunk"]);
    gitIn(mainRepo, ["config", "user.email", "test@test.com"]);
    gitIn(mainRepo, ["config", "user.name", "Test"]);
    writeFileSync(join(mainRepo, "file.txt"), "initial\n");
    gitIn(mainRepo, ["add", "-A"]);
    gitIn(mainRepo, ["commit", "-m", "init"]);

    // wt-merged: HEAD == trunk ⇒ fully merged into trunk. Left clean.
    wtMerged = join(mainRepo, "..", `pare-git-921-merged-${process.pid}`);
    gitIn(mainRepo, ["worktree", "add", "-b", "wt-merged", wtMerged, "trunk"]);

    // wt-unmerged: adds a commit not in trunk ⇒ NOT an ancestor of trunk.
    wtUnmerged = join(mainRepo, "..", `pare-git-921-unmerged-${process.pid}`);
    gitIn(mainRepo, ["worktree", "add", "-b", "wt-unmerged", wtUnmerged, "trunk"]);
    writeFileSync(join(wtUnmerged, "extra.txt"), "wip\n");
    gitIn(wtUnmerged, ["add", "-A"]);
    gitIn(wtUnmerged, ["commit", "-m", "wip commit"]);

    // wt-dirty: HEAD == trunk (merged) but has an uncommitted file ⇒ dirty.
    wtDirty = join(mainRepo, "..", `pare-git-921-dirty-${process.pid}`);
    gitIn(mainRepo, ["worktree", "add", "-b", "wt-dirty", wtDirty, "trunk"]);
    writeFileSync(join(wtDirty, "uncommitted.txt"), "dirty\n");

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
    for (const wt of [wtMerged, wtUnmerged, wtDirty]) {
      try {
        gitIn(mainRepo, ["worktree", "remove", "--force", wt]);
      } catch {
        /* best-effort */
      }
      rmSync(wt, { recursive: true, force: true });
    }
    rmSync(mainRepo, { recursive: true, force: true });
  }, 30_000);

  it("Part 1: branch mergedInto flags merged vs unmerged branches", async () => {
    const result = await client.callTool(
      { name: "branch", arguments: { path: mainRepo, mergedInto: "trunk" } },
      undefined,
      { timeout: CALL_TIMEOUT },
    );
    const sc = result.structuredContent as { branches: Array<Record<string, unknown>> };
    const byName = new Map(sc.branches.map((b) => [b.name as string, b]));

    expect(byName.get("wt-merged")?.merged).toBe(true);
    expect(byName.get("wt-merged")?.unmerged).toBe(0);
    expect(byName.get("wt-unmerged")?.merged).toBe(false);
    expect(byName.get("wt-unmerged")?.unmerged).toBe(1);
    expect(byName.get("trunk")?.merged).toBe(true);
  });

  it("Part 2: worktree list withStatus reports dirty + unpushed per worktree", async () => {
    const result = await client.callTool(
      { name: "worktree", arguments: { path: mainRepo, withStatus: true, mergedInto: "trunk" } },
      undefined,
      { timeout: CALL_TIMEOUT },
    );
    const sc = result.structuredContent as { worktrees: Array<Record<string, unknown>> };
    const byBranch = new Map(sc.worktrees.map((w) => [w.branch as string, w]));

    // Dirty flag is present for every worktree and correct for the dirty one.
    expect(byBranch.get("wt-dirty")?.dirty).toBe(true);
    expect(byBranch.get("wt-merged")?.dirty).toBe(false);

    // merged flag reflects ancestry into trunk.
    expect(byBranch.get("wt-merged")?.merged).toBe(true);
    expect(byBranch.get("wt-unmerged")?.merged).toBe(false);

    // unpushed is a number (no remotes ⇒ all local commits count as unpushed).
    expect(typeof byBranch.get("wt-unmerged")?.unpushed).toBe("number");
  });

  it("Part 3: prune-merged removes merged-clean, skips dirty/unmerged, refuses main", async () => {
    const result = await client.callTool(
      {
        name: "worktree",
        arguments: { path: mainRepo, action: "prune-merged", base: "trunk" },
      },
      undefined,
      { timeout: CALL_TIMEOUT },
    );
    const sc = result.structuredContent as {
      action: string;
      base: string;
      results: Array<{ path: string; branch?: string; removed: boolean; reason?: string }>;
    };
    expect(sc.action).toBe("prune-merged");

    const byBranch = new Map(sc.results.map((r) => [r.branch, r]));

    // Merged + clean ⇒ removed.
    expect(byBranch.get("wt-merged")?.removed).toBe(true);
    expect(existsSync(wtMerged)).toBe(false);

    // Unmerged ⇒ never removed.
    expect(byBranch.get("wt-unmerged")?.removed).toBe(false);
    expect(byBranch.get("wt-unmerged")?.reason).toBe("not-merged");
    expect(existsSync(wtUnmerged)).toBe(true);

    // Dirty ⇒ skipped under the default requireClean guard.
    expect(byBranch.get("wt-dirty")?.removed).toBe(false);
    expect(byBranch.get("wt-dirty")?.reason).toBe("dirty");
    expect(existsSync(wtDirty)).toBe(true);

    // The main/current worktree is refused outright.
    const mainResult = sc.results.find((r) => r.branch === "trunk");
    expect(mainResult?.removed).toBe(false);
    expect(["main", "current"]).toContain(mainResult?.reason);
    expect(existsSync(mainRepo)).toBe(true);
  });
});
