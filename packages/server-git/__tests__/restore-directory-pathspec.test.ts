/**
 * Regression tests for #1068 — directory pathspecs.
 *
 * Two halves:
 *   1. `restore` / `reset` / `diff` / `blame` must hand a directory pathspec to git
 *      intact (the `resolveFilePath` rewrite from #1071 — verified here end to end).
 *   2. `restore`'s post-restore verification must be honest about a directory
 *      pathspec. It compared `git status` lines by exact filename, so a directory
 *      never matched and `verified: true` came back no matter what.
 *
 * These run against real temp repos (no git mocking) because the bug lives in the
 * interaction between the pathspec we hand to git and what git actually expands.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normalizeRepoPath,
  pathIsUnderPathspec,
  toRepoRelativePathspec,
} from "../src/lib/parsers.js";
import { registerRestoreTool } from "../src/tools/restore.js";
import { registerResetTool } from "../src/tools/reset.js";
import { registerDiffTool } from "../src/tools/diff.js";
import { registerBlameTool } from "../src/tools/blame.js";

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

function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

/** Working-tree-modified paths per `git status --porcelain`. */
function dirtyPaths(cwd: string): string[] {
  return run(["status", "--porcelain=v1"], cwd)
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .sort();
}

// ── Pure helpers ─────────────────────────────────────────────────────

describe("normalizeRepoPath", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizeRepoPath("src\\lib\\a.ts")).toBe("src/lib/a.ts");
  });

  it("strips trailing slashes", () => {
    expect(normalizeRepoPath("src/lib/")).toBe("src/lib");
    expect(normalizeRepoPath("src/lib//")).toBe("src/lib");
  });

  it("strips a leading ./", () => {
    expect(normalizeRepoPath("./src")).toBe("src");
    expect(normalizeRepoPath("././src")).toBe("src");
  });
});

describe("pathIsUnderPathspec (#1068)", () => {
  it("matches the exact file", () => {
    expect(pathIsUnderPathspec("src/a.ts", "src/a.ts")).toBe(true);
  });

  it("matches files under a directory pathspec", () => {
    expect(pathIsUnderPathspec("src/lib/a.ts", "src")).toBe(true);
    expect(pathIsUnderPathspec("src/lib/a.ts", "src/lib")).toBe(true);
  });

  it("tolerates trailing slashes and backslashes on either side", () => {
    expect(pathIsUnderPathspec("src/lib/a.ts", "src/")).toBe(true);
    expect(pathIsUnderPathspec("src\\lib\\a.ts", "src")).toBe(true);
    expect(pathIsUnderPathspec("src/lib/a.ts", "src\\lib\\")).toBe(true);
  });

  it("does not match a sibling with a shared name prefix", () => {
    expect(pathIsUnderPathspec("src-gen/a.ts", "src")).toBe(false);
    expect(pathIsUnderPathspec("srcfile.ts", "src")).toBe(false);
  });

  it("does not match a parent of the pathspec", () => {
    expect(pathIsUnderPathspec("src/a.ts", "src/lib")).toBe(false);
  });

  it("treats . and the empty pathspec as the whole repo", () => {
    expect(pathIsUnderPathspec("anything/at/all.ts", ".")).toBe(true);
    expect(pathIsUnderPathspec("anything/at/all.ts", "")).toBe(true);
  });
});

describe("toRepoRelativePathspec (#1068)", () => {
  it("passes relative paths through at the repo root", () => {
    expect(toRepoRelativePathspec("src/lib", "/repo", "")).toBe("src/lib");
  });

  it("prepends the cwd prefix when running in a subdirectory", () => {
    expect(toRepoRelativePathspec("lib", "/repo", "src/")).toBe("src/lib");
    expect(toRepoRelativePathspec(".", "/repo", "src/")).toBe("src");
  });

  it("maps . to the repo root at the top level", () => {
    expect(toRepoRelativePathspec(".", "/repo", "")).toBe(".");
  });

  it("strips the repo root from an absolute path", () => {
    expect(toRepoRelativePathspec("/repo/src/lib", "/repo", "")).toBe("src/lib");
    expect(toRepoRelativePathspec("C:\\repo\\src\\lib", "C:/repo", "")).toBe("src/lib");
    expect(toRepoRelativePathspec("/repo", "/repo", "")).toBe(".");
  });

  it("leaves an absolute path outside the repo alone", () => {
    expect(toRepoRelativePathspec("/elsewhere/src", "/repo", "")).toBe("/elsewhere/src");
  });
});

// ── Real-repo behaviour ──────────────────────────────────────────────

describe("directory pathspecs against a real repo (#1068)", () => {
  let repoDir: string;
  let restore: ToolHandler;
  let reset: ToolHandler;
  let diff: ToolHandler;
  let blame: ToolHandler;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "pare-git-dir-pathspec-"));
    run(["init"], repoDir);
    run(["config", "user.email", "test@test.com"], repoDir);
    run(["config", "user.name", "Test"], repoDir);
    run(["config", "core.autocrlf", "false"], repoDir);

    mkdirSync(join(repoDir, "site", "lib"), { recursive: true });
    writeFileSync(join(repoDir, "README.md"), "# readme\n");
    writeFileSync(join(repoDir, "site", "index.html"), "<p>v1</p>\n");
    writeFileSync(join(repoDir, "site", "about.html"), "<p>v1</p>\n");
    writeFileSync(join(repoDir, "site", "lib", "app.js"), "// v1\n");
    run(["add", "-A"], repoDir);
    run(["commit", "-m", "v1"], repoDir);

    // Second commit so `source: HEAD~1` is available for the negative case.
    writeFileSync(join(repoDir, "site", "index.html"), "<p>v2</p>\n");
    writeFileSync(join(repoDir, "site", "about.html"), "<p>v2</p>\n");
    writeFileSync(join(repoDir, "site", "lib", "app.js"), "// v2\n");
    run(["add", "-A"], repoDir);
    run(["commit", "-m", "v2"], repoDir);

    const server = new FakeServer();
    registerRestoreTool(server as never);
    registerResetTool(server as never);
    registerDiffTool(server as never);
    registerBlameTool(server as never);
    restore = server.tools.get("restore")!.handler;
    reset = server.tools.get("reset")!.handler;
    diff = server.tools.get("diff")!.handler;
    blame = server.tools.get("blame")!.handler;
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  function dirtySite() {
    writeFileSync(join(repoDir, "site", "index.html"), "<p>dirty</p>\n");
    writeFileSync(join(repoDir, "site", "about.html"), "<p>dirty</p>\n");
    writeFileSync(join(repoDir, "site", "lib", "app.js"), "// dirty\n");
  }

  it("restore with a directory pathspec restores every file underneath it", async () => {
    dirtySite();
    expect(dirtyPaths(repoDir)).toEqual(["site/about.html", "site/index.html", "site/lib/app.js"]);

    const result = await restore({ path: repoDir, files: ["site"], staged: false });

    expect(readText(join(repoDir, "site", "index.html"))).toBe("<p>v2</p>\n");
    expect(readText(join(repoDir, "site", "about.html"))).toBe("<p>v2</p>\n");
    expect(readText(join(repoDir, "site", "lib", "app.js"))).toBe("// v2\n");
    expect(dirtyPaths(repoDir)).toEqual([]);

    expect(result.structuredContent.verified).toBe(true);
    expect(result.structuredContent.verifiedFiles).toEqual([{ file: "site", restored: true }]);
  });

  it("restore accepts a trailing slash on the directory pathspec", async () => {
    dirtySite();

    const result = await restore({ path: repoDir, files: ["site/"], staged: false });

    expect(dirtyPaths(repoDir)).toEqual([]);
    expect(result.structuredContent.verified).toBe(true);
  });

  it('restore with files: ["."] restores the whole tree', async () => {
    dirtySite();
    writeFileSync(join(repoDir, "README.md"), "# dirty\n");

    const result = await restore({ path: repoDir, files: ["."], staged: false });

    expect(dirtyPaths(repoDir)).toEqual([]);
    expect(result.structuredContent.verified).toBe(true);
  });

  it("reports verified: false when the path is still dirty afterwards", async () => {
    // Restoring from HEAD~1 puts the v1 content back, so every file under `site`
    // is modified relative to HEAD. Verification must say so instead of claiming
    // success because the directory name never appears in `git status`.
    const result = await restore({
      path: repoDir,
      files: ["site"],
      staged: false,
      source: "HEAD~1",
    });

    expect(readText(join(repoDir, "site", "index.html"))).toBe("<p>v1</p>\n");
    expect(dirtyPaths(repoDir)).toEqual(["site/about.html", "site/index.html", "site/lib/app.js"]);

    expect(result.structuredContent.verified).toBe(false);
    expect(result.structuredContent.verifiedFiles).toEqual([{ file: "site", restored: false }]);
  });

  it("scopes verification to the requested directory only", async () => {
    dirtySite();
    writeFileSync(join(repoDir, "README.md"), "# dirty\n");

    // README.md is left dirty on purpose — it is not under `site`, so it must not
    // drag the `site` verification down.
    const result = await restore({ path: repoDir, files: ["site"], staged: false });

    expect(dirtyPaths(repoDir)).toEqual(["README.md"]);
    expect(result.structuredContent.verified).toBe(true);
  });

  it("verifies a nested directory pathspec independently of its siblings", async () => {
    dirtySite();

    const result = await restore({ path: repoDir, files: ["site/lib"], staged: false });

    expect(readText(join(repoDir, "site", "lib", "app.js"))).toBe("// v2\n");
    // Siblings outside site/lib stay dirty but must not affect this verification.
    expect(dirtyPaths(repoDir)).toEqual(["site/about.html", "site/index.html"]);
    expect(result.structuredContent.verified).toBe(true);
  });

  it("restore --staged with a directory pathspec unstages every file underneath", async () => {
    dirtySite();
    run(["add", "-A"], repoDir);

    const result = await restore({ path: repoDir, files: ["site"], staged: true });

    const staged = run(["status", "--porcelain=v1"], repoDir)
      .split("\n")
      .filter(Boolean)
      .filter((line) => line[0] !== " " && line[0] !== "?");
    expect(staged).toEqual([]);
    expect(result.structuredContent.verified).toBe(true);
  });

  it("reset with a directory pathspec unstages every file underneath", async () => {
    dirtySite();
    run(["add", "-A"], repoDir);

    await reset({ path: repoDir, ref: "HEAD", files: ["site"] });

    const stillStaged = run(["status", "--porcelain=v1"], repoDir)
      .split("\n")
      .filter(Boolean)
      .filter((line) => line[0] !== " " && line[0] !== "?")
      .map((line) => line.slice(3).trim());
    expect(stillStaged).toEqual([]);
  });

  it("diff with a directory pathspec reports every changed file underneath", async () => {
    dirtySite();

    const result = await diff({ path: repoDir, files: ["site"] });
    const files = (result.structuredContent.files as Array<{ file: string }>).map((f) => f.file);

    expect(files.sort()).toEqual(["site/about.html", "site/index.html", "site/lib/app.js"]);
  });

  it("blame surfaces git's error for a directory instead of blaming one child", async () => {
    // `git blame` has no directory mode. Silently substituting the first tracked
    // child produced confident, wrong output — an error is the honest answer.
    await expect(blame({ path: repoDir, file: "site" })).rejects.toThrow(/blame failed/i);
  });

  it("blame still resolves a plain file path", async () => {
    const result = await blame({ path: repoDir, file: "site/index.html" });
    expect(result.structuredContent.file).toBe("site/index.html");
  });
});
