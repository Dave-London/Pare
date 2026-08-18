/**
 * Regression tests for #1057 — `add` with `files: ["."]` staged nothing and a
 * directory pathspec staged only one file.
 *
 * These run against real temp repos (no git mocking) because the bug lived in the
 * interaction between the pathspec we hand to git and what git actually expands.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerAddTool } from "../src/tools/add.js";
import { resolveFilePath } from "../src/lib/git-runner.js";
import { GitAddSchema } from "../src/schemas/index.js";

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

/** Staged paths per `git status --porcelain` (index column is not " " or "?"). */
function stagedPaths(cwd: string): string[] {
  return run(["status", "--porcelain=v1"], cwd)
    .split("\n")
    .filter(Boolean)
    .filter((line) => line[0] !== " " && line[0] !== "?")
    .map((line) => line.slice(3).trim())
    .sort();
}

describe("add pathspec expansion (#1057)", () => {
  let repoDir: string;
  let handler: ToolHandler;

  const DEFAULTS = { all: false };

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "pare-git-add-pathspec-"));
    run(["init"], repoDir);
    run(["config", "user.email", "test@test.com"], repoDir);
    run(["config", "user.name", "Test"], repoDir);
    run(["config", "core.autocrlf", "false"], repoDir);

    // Nested tree with tracked files at several depths.
    mkdirSync(join(repoDir, "site", "public", "assets"), { recursive: true });
    mkdirSync(join(repoDir, "docs"), { recursive: true });
    writeFileSync(join(repoDir, "README.md"), "# readme\n");
    writeFileSync(join(repoDir, "docs", "hub-design.md"), "# hub\n");
    writeFileSync(join(repoDir, "site", "public", "building.html"), "<p>a</p>\n");
    writeFileSync(join(repoDir, "site", "public", "index.html"), "<p>b</p>\n");
    writeFileSync(join(repoDir, "site", "public", "assets", "app.css"), "a{}\n");
    run(["add", "-A"], repoDir);
    run(["commit", "-m", "init"], repoDir);

    // Dirty the tree: modifications at several depths plus untracked files.
    writeFileSync(join(repoDir, "README.md"), "# readme changed\n");
    writeFileSync(join(repoDir, "docs", "hub-design.md"), "# hub changed\n");
    writeFileSync(join(repoDir, "site", "public", "building.html"), "<p>a changed</p>\n");
    writeFileSync(join(repoDir, "site", "public", "index.html"), "<p>b changed</p>\n");
    writeFileSync(join(repoDir, "site", "public", "assets", "app.css"), "a{color:red}\n");
    writeFileSync(join(repoDir, "site", "public", "new-page.html"), "<p>new</p>\n");
    writeFileSync(join(repoDir, "site", "public", "assets", "new.css"), "b{}\n");
    writeFileSync(join(repoDir, "untracked-root.txt"), "root\n");

    const server = new FakeServer();
    registerAddTool(server as never);
    handler = server.tools.get("add")!.handler;
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('files: ["."] stages every modified and untracked file in the repo', async () => {
    const result = await handler({ ...DEFAULTS, path: repoDir, files: ["."] });
    const parsed = GitAddSchema.parse(result.structuredContent);

    const expected = [
      "README.md",
      "docs/hub-design.md",
      "site/public/assets/app.css",
      "site/public/assets/new.css",
      "site/public/building.html",
      "site/public/index.html",
      "site/public/new-page.html",
      "untracked-root.txt",
    ].sort();

    expect(stagedPaths(repoDir)).toEqual(expected);
    // The returned list must reflect everything that got staged, not just the input.
    expect(parsed.files.map((f) => f.file).sort()).toEqual(expected);
    expect(parsed.files.find((f) => f.file === "untracked-root.txt")?.status).toBe("added");
    expect(parsed.files.find((f) => f.file === "README.md")?.status).toBe("modified");
  });

  it("a directory pathspec stages everything under that directory", async () => {
    const result = await handler({
      ...DEFAULTS,
      path: repoDir,
      files: ["site/public", "docs/hub-design.md"],
    });
    const parsed = GitAddSchema.parse(result.structuredContent);

    const expected = [
      "docs/hub-design.md",
      "site/public/assets/app.css",
      "site/public/assets/new.css",
      "site/public/building.html",
      "site/public/index.html",
      "site/public/new-page.html",
    ].sort();

    expect(stagedPaths(repoDir)).toEqual(expected);
    expect(parsed.files.map((f) => f.file).sort()).toEqual(expected);
    // Files outside the pathspec stay unstaged.
    expect(stagedPaths(repoDir)).not.toContain("README.md");
    expect(stagedPaths(repoDir)).not.toContain("untracked-root.txt");
  });

  it("a directory pathspec with Windows backslashes stages the whole directory", async () => {
    await handler({ ...DEFAULTS, path: repoDir, files: ["site\\public\\assets"] });

    expect(stagedPaths(repoDir)).toEqual(
      ["site/public/assets/app.css", "site/public/assets/new.css"].sort(),
    );
  });

  it("a trailing-slash directory pathspec stages the whole directory", async () => {
    await handler({ ...DEFAULTS, path: repoDir, files: ["site/public/assets/"] });

    expect(stagedPaths(repoDir)).toEqual(
      ["site/public/assets/app.css", "site/public/assets/new.css"].sort(),
    );
  });

  it("a glob pathspec reaches git verbatim", async () => {
    await handler({ ...DEFAULTS, path: repoDir, files: ["site/public/*.html"] });

    expect(stagedPaths(repoDir)).toEqual(
      ["site/public/building.html", "site/public/index.html", "site/public/new-page.html"].sort(),
    );
  });

  it("single-file pathspecs still get their casing canonicalised", async () => {
    // The reason resolveFilePath exists — must survive the #1057 fix.
    const resolved = await resolveFilePath("readme.md", repoDir);
    expect(resolved.toLowerCase()).toBe("readme.md");
    if (process.platform === "win32" || process.platform === "darwin") {
      expect(resolved).toBe("README.md");
    }
  });

  it("resolveFilePath leaves directory and dot pathspecs untouched", async () => {
    expect(await resolveFilePath(".", repoDir)).toBe(".");
    expect(await resolveFilePath("site/public", repoDir)).toBe("site/public");
    expect(await resolveFilePath("site\\public", repoDir)).toBe("site/public");
    expect(await resolveFilePath("site/public/*.html", repoDir)).toBe("site/public/*.html");
  });
});
