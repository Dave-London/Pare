/**
 * Regression tests for #1073 — `worktree` removal must never report a failure it
 * has already half-committed to.
 *
 * `git worktree remove` deletes the admin entry (`.git/worktrees/<id>`) even when
 * the recursive delete of the working directory fails first. On Windows a large
 * `node_modules` tree trips that routinely ("Filename too long"), so the command
 * exits non-zero while the worktree is already unregistered — `prune-merged`
 * reported `remove-failed` and left an orphaned directory that later `remove`
 * calls rejected with "is not a working tree".
 *
 * These run against real temp repos. The half-done removal is reproduced by
 * intercepting the single `worktree remove` call and reproducing git's own end
 * state (admin entry gone, directory intact) so the recovery path is covered on
 * every platform, not only Windows.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Temp dir with the path git will report. On Windows the runner's TEMP is a short
 * 8.3 alias (`C:\Users\RUNNER~1\...`) while git stores the resolved long path.
 */
function mkTempRepo(prefix: string): string {
  return realpathSync.native(mkdtempSync(join(tmpdir(), prefix)));
}

vi.mock("../src/lib/git-runner.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/git-runner.js")>();
  return { ...actual, git: vi.fn(actual.git) };
});

import { git } from "../src/lib/git-runner.js";
import { removeWorktree } from "../src/lib/worktree-remove.js";
import { registerWorktreeTool } from "../src/tools/worktree.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown;
  structuredContent: Record<string, unknown>;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function run(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function registeredPaths(cwd: string): string[] {
  return run(["worktree", "list", "--porcelain"], cwd)
    .split("\n")
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice("worktree ".length).replace(/\\/g, "/").toLowerCase());
}

function isRegistered(cwd: string, wtPath: string): boolean {
  return registeredPaths(cwd).includes(wtPath.replace(/\\/g, "/").toLowerCase());
}

/** The unmocked runner, captured before any test swaps the implementation. */
const realGit = vi.mocked(git).getMockImplementation()!;

/** Hands the first `worktree remove` call to `onRemove`; everything else runs for real. */
function interceptNextRemove(onRemove: () => Promise<{ stderr: string }>) {
  let used = false;
  vi.mocked(git).mockImplementation(async (args, cwd, opts) => {
    if (!used && args[0] === "worktree" && args[1] === "remove") {
      used = true;
      const { stderr } = await onRemove();
      return { stdout: "", stderr, exitCode: 255 };
    }
    return realGit(args, cwd, opts);
  });
}

/**
 * Replays git's own half-done removal: drop the worktree's `.git` link and prune
 * the admin entry (so the worktree is unregistered), then report the failure git
 * reports when the directory delete is what blew up.
 */
function failNextRemoveAfterUnregistering(mainRepo: string, wtPath: string, stderr: string) {
  interceptNextRemove(async () => {
    rmSync(join(wtPath, ".git"), { force: true, recursive: true });
    await realGit(["worktree", "prune"], mainRepo);
    return { stderr };
  });
}

/** A genuine failure: git refuses the removal and changes nothing. */
function failNextRemoveKeepingRegistration(stderr: string) {
  interceptNextRemove(async () => ({ stderr }));
}

describe("worktree removal consistency (#1073)", () => {
  let mainRepo: string;
  let wtPath: string;
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockImplementation(realGit);

    mainRepo = mkTempRepo("pare-git-1073-main-");
    run(["init", "-b", "trunk"], mainRepo);
    run(["config", "user.email", "test@test.com"], mainRepo);
    run(["config", "user.name", "Test"], mainRepo);
    writeFileSync(join(mainRepo, "file.txt"), "initial\n");
    run(["add", "-A"], mainRepo);
    run(["commit", "-m", "init"], mainRepo);

    // Merged worktree (HEAD == trunk) with an untracked node_modules-like tree.
    wtPath = join(mainRepo, "..", `pare-git-1073-wt-${process.pid}`);
    run(["worktree", "add", "-b", "wt-merged", wtPath, "trunk"], mainRepo);
    const deep = join(wtPath, "node_modules", "pkg", "node_modules", "nested");
    mkdirSync(deep, { recursive: true });
    for (let i = 0; i < 20; i++) writeFileSync(join(deep, `f${i}.js`), "module.exports={};\n");

    const server = new FakeServer();
    registerWorktreeTool(server as never);
    handler = server.tools.get("worktree")!.handler;
  });

  afterEach(() => {
    rmSync(wtPath, { recursive: true, force: true });
    rmSync(mainRepo, { recursive: true, force: true });
  });

  // ── removeWorktree helper ──────────────────────────────────────────

  it("reports removed on a clean removal", async () => {
    const outcome = await removeWorktree(mainRepo, wtPath, { force: true });

    expect(outcome).toEqual({ removed: true });
    expect(existsSync(wtPath)).toBe(false);
    expect(isRegistered(mainRepo, wtPath)).toBe(false);
  });

  it("finishes the job when git unregistered the worktree but left the directory", async () => {
    failNextRemoveAfterUnregistering(
      mainRepo,
      wtPath,
      `error: failed to delete '${wtPath}': Filename too long`,
    );

    const outcome = await removeWorktree(mainRepo, wtPath, { force: true });

    expect(outcome.removed).toBe(true);
    expect(outcome.cleanedUp).toBe(true);
    expect(outcome.error).toBeUndefined();
    // No orphan left behind: gone from disk and gone from the worktree list.
    expect(existsSync(wtPath)).toBe(false);
    expect(isRegistered(mainRepo, wtPath)).toBe(false);
  });

  it("recognises the worktree through a non-canonical path", async () => {
    // Callers pass whatever they typed — a `.` segment here, a Windows 8.3 alias
    // like C:\Users\RUNNER~1\... in the wild — while git reports the resolved path.
    const messy = join(wtPath, ".") + "/./";
    failNextRemoveAfterUnregistering(
      mainRepo,
      wtPath,
      `error: failed to delete '${wtPath}': Filename too long`,
    );

    const outcome = await removeWorktree(mainRepo, messy, { force: true });

    expect(outcome.removed).toBe(true);
    expect(outcome.cleanedUp).toBe(true);
    expect(existsSync(wtPath)).toBe(false);
  });

  it("surfaces git stderr and leaves the worktree alone on a genuine failure", async () => {
    run(["worktree", "lock", wtPath], mainRepo);

    const outcome = await removeWorktree(mainRepo, wtPath);

    expect(outcome.removed).toBe(false);
    expect(outcome.error).toMatch(/locked/i);
    // "remove-failed" must mean still registered, still on disk.
    expect(existsSync(wtPath)).toBe(true);
    expect(isRegistered(mainRepo, wtPath)).toBe(true);

    run(["worktree", "unlock", wtPath], mainRepo);
  });

  it("never deletes a directory that was not a registered worktree", async () => {
    const stranger = mkTempRepo("pare-git-1073-stranger-");
    writeFileSync(join(stranger, "precious.txt"), "do not delete\n");

    const outcome = await removeWorktree(mainRepo, stranger, { force: true });

    expect(outcome.removed).toBe(false);
    expect(outcome.error).toMatch(/not a working tree/i);
    expect(existsSync(join(stranger, "precious.txt"))).toBe(true);

    rmSync(stranger, { recursive: true, force: true });
  });

  // ── action: prune-merged ───────────────────────────────────────────

  it("prune-merged reports removed and cleans up after a half-done git removal", async () => {
    failNextRemoveAfterUnregistering(
      mainRepo,
      wtPath,
      `error: failed to delete '${wtPath}': Filename too long`,
    );

    const result = await handler({
      path: mainRepo,
      action: "prune-merged",
      base: "trunk",
      requireClean: false,
    });
    const results = result.structuredContent.results as Array<{
      path: string;
      branch?: string;
      removed: boolean;
      reason?: string;
      error?: string;
      cleanedUp?: boolean;
    }>;
    const entry = results.find((r) => r.branch === "wt-merged")!;

    expect(entry.removed).toBe(true);
    expect(entry.cleanedUp).toBe(true);
    expect(entry.reason).toBeUndefined();
    expect(existsSync(wtPath)).toBe(false);
    expect(isRegistered(mainRepo, wtPath)).toBe(false);
  });

  it("prune-merged carries git stderr on remove-failed and leaves it registered", async () => {
    failNextRemoveKeepingRegistration("fatal: validation failed, cannot remove working tree");

    const result = await handler({
      path: mainRepo,
      action: "prune-merged",
      base: "trunk",
      requireClean: false,
    });
    const results = result.structuredContent.results as Array<{
      branch?: string;
      removed: boolean;
      reason?: string;
      error?: string;
    }>;
    const entry = results.find((r) => r.branch === "wt-merged")!;

    expect(entry.removed).toBe(false);
    expect(entry.reason).toBe("remove-failed");
    expect(entry.error).toBe("fatal: validation failed, cannot remove working tree");
    // The contract: remove-failed ⇒ still registered, still on disk.
    expect(existsSync(wtPath)).toBe(true);
    expect(isRegistered(mainRepo, wtPath)).toBe(true);
  });

  // ── action: remove ─────────────────────────────────────────────────

  it("remove recovers from a half-done git removal instead of throwing", async () => {
    failNextRemoveAfterUnregistering(
      mainRepo,
      wtPath,
      `error: failed to delete '${wtPath}': Filename too long`,
    );

    const result = await handler({
      path: mainRepo,
      action: "remove",
      worktreePath: wtPath,
      force: true,
    });

    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.cleanedUp).toBe(true);
    expect(existsSync(wtPath)).toBe(false);
    expect(isRegistered(mainRepo, wtPath)).toBe(false);
  });

  it("remove surfaces git stderr in the thrown error", async () => {
    run(["worktree", "lock", wtPath], mainRepo);

    await expect(
      handler({ path: mainRepo, action: "remove", worktreePath: wtPath, force: true }),
    ).rejects.toThrow(/locked working tree/i);

    expect(existsSync(wtPath)).toBe(true);
    expect(isRegistered(mainRepo, wtPath)).toBe(true);
    run(["worktree", "unlock", wtPath], mainRepo);
  });
});

// ── The real Windows trigger ─────────────────────────────────────────

describe.skipIf(process.platform !== "win32")("worktree removal over MAX_PATH (#1073)", () => {
  let mainRepo: string;
  let wtPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockImplementation(realGit);

    mainRepo = mkTempRepo("pare-git-1073-long-");
    run(["init", "-b", "trunk"], mainRepo);
    run(["config", "user.email", "test@test.com"], mainRepo);
    run(["config", "user.name", "Test"], mainRepo);
    writeFileSync(join(mainRepo, "file.txt"), "initial\n");
    run(["add", "-A"], mainRepo);
    run(["commit", "-m", "init"], mainRepo);

    wtPath = join(mainRepo, "..", `pare-git-1073-longwt-${process.pid}`);
    run(["worktree", "add", "-b", "wt-long", wtPath, "trunk"], mainRepo);

    // A node_modules-style tree whose leaves sit well past Windows' MAX_PATH,
    // which is what makes git's own recursive delete fail.
    let deep = join(wtPath, "node_modules");
    const segment = `nested-package-directory-${"x".repeat(40)}`;
    for (let i = 0; i < 10; i++) deep = join(deep, `${segment}${i}`);
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, "index.js"), "module.exports={};\n");
  });

  afterEach(() => {
    rmSync(wtPath, { recursive: true, force: true });
    rmSync(mainRepo, { recursive: true, force: true });
  });

  it("removes a worktree holding a deeper-than-MAX_PATH tree", async () => {
    const outcome = await removeWorktree(mainRepo, wtPath, { force: true });

    expect(outcome.removed).toBe(true);
    expect(outcome.error).toBeUndefined();
    expect(existsSync(wtPath)).toBe(false);
    expect(isRegistered(mainRepo, wtPath)).toBe(false);
  });
});
