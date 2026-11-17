import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerAddTool } from "../src/tools/add.js";
import { GitAddSchema } from "../src/schemas/index.js";

const addHelp = spawnSync("git", ["add", "-h"], { encoding: "utf8" });
if (addHelp.error) throw addHelp.error;
const supportsResolved = /--(?:\[no-\])?resolved\b/.test(`${addHelp.stdout}${addHelp.stderr}`);
if (!supportsResolved) {
  console.warn(
    "Skipping native add --resolved integration tests: installed Git lacks --resolved (Git 2.56+ required).",
  );
}

type Handler = (params: Record<string, unknown>) => Promise<{
  structuredContent: unknown;
}>;

describe.skipIf(!supportsResolved)("native add --resolved semantics (Git 2.56+, #1250)", () => {
  let repo: string;
  let handler: Handler;

  function git(...args: string[]): string {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: "pipe" });
  }

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "pare-add-resolved-"));
    git("init", "--initial-branch=main");
    git("config", "user.name", "Pare test");
    git("config", "user.email", "test@example.com");
    git("config", "commit.gpgsign", "false");
    git("config", "core.autocrlf", "false");
    git("config", "core.hooksPath", join(repo, ".git", "hooks"));
    for (const name of ["one.txt", "two.txt", "unrelated.txt"]) {
      writeFileSync(join(repo, name), "base\n");
    }
    writeFileSync(join(repo, "binary.dat"), Buffer.from([0, 1]));
    git("add", "--all");
    git("commit", "-m", "base");
    git("checkout", "-b", "topic");
    for (const name of ["one.txt", "two.txt"]) writeFileSync(join(repo, name), "topic\n");
    writeFileSync(join(repo, "binary.dat"), Buffer.from([0, 2]));
    git("commit", "-am", "topic");
    git("checkout", "main");
    for (const name of ["one.txt", "two.txt"]) writeFileSync(join(repo, name), "main\n");
    writeFileSync(join(repo, "binary.dat"), Buffer.from([0, 3]));
    git("commit", "-am", "main");
    const merge = spawnSync("git", ["merge", "topic"], { cwd: repo, encoding: "utf8" });
    expect(merge.status).toBe(1);
    expect(git("ls-files", "--unmerged")).toContain("one.txt");
    writeFileSync(join(repo, "unrelated.txt"), "unstaged\n");
    writeFileSync(join(repo, "untracked.txt"), "untracked\n");

    registerAddTool({
      registerTool(_name: string, _config: unknown, callback: Handler) {
        handler = callback;
      },
    } as never);
  });

  afterEach(() => {
    if (repo) rmSync(repo, { recursive: true, force: true });
  });

  it("stages only matching resolved conflicts, leaving other work and conflicts untouched", async () => {
    writeFileSync(join(repo, "one.txt"), "resolved\n");
    const result = await handler({
      path: repo,
      files: ["one.txt", "unrelated.txt"],
      resolved: true,
    });
    expect(GitAddSchema.parse(result.structuredContent).files).toEqual([
      { file: "one.txt", status: "modified" },
    ]);
    expect(git("diff", "--cached", "--name-only", "--diff-filter=M")).toBe("one.txt\n");
    expect(git("ls-files", "--unmerged")).toContain("two.txt");
    expect(git("diff", "--", "unrelated.txt")).toContain("unstaged");
    expect(git("ls-files", "--", "untracked.txt")).toBe("");
  });

  it("refuses the complete request when one requested file still contains conflict markers", async () => {
    writeFileSync(join(repo, "one.txt"), "resolved\n");
    expect(readFileSync(join(repo, "two.txt"), "utf8")).toContain("<<<<<<<");
    const before = git("ls-files", "--stage");
    await expect(
      handler({ path: repo, files: ["one.txt", "two.txt"], resolved: true }),
    ).rejects.toThrow(/git add failed:/);
    expect(git("ls-files", "--stage")).toBe(before);
  });

  it("supports a dry run without changing the index", async () => {
    writeFileSync(join(repo, "one.txt"), "resolved\n");
    const before = git("ls-files", "--stage");
    await handler({ path: repo, files: ["one.txt"], resolved: true, dryRun: true });
    expect(git("ls-files", "--stage")).toBe(before);
  });

  it("stages a conflict resolved by deleting the file", async () => {
    rmSync(join(repo, "one.txt"));
    const result = await handler({ path: repo, files: ["one.txt"], resolved: true });
    expect(GitAddSchema.parse(result.structuredContent).files).toContainEqual({
      file: "one.txt",
      status: "deleted",
    });
    expect(git("ls-files", "--stage", "--", "one.txt")).toBe("");
    expect(git("diff", "--cached", "--name-only", "--diff-filter=D")).toBe("one.txt\n");
  });

  it("stages a binary conflict resolution using Git's native handling", async () => {
    const resolution = Buffer.from([0, 4, 255]);
    writeFileSync(join(repo, "binary.dat"), resolution);
    await handler({ path: repo, files: ["binary.dat"], resolved: true });
    expect(git("ls-files", "--unmerged", "--", "binary.dat")).toBe("");
    expect(execFileSync("git", ["show", ":binary.dat"], { cwd: repo })).toEqual(resolution);
  });

  it("lets Git expand pathspecs without staging unrelated matching files", async () => {
    for (const name of ["one.txt", "two.txt"]) writeFileSync(join(repo, name), "resolved\n");
    await handler({ path: repo, files: ["*.txt"], resolved: true });
    expect(git("diff", "--cached", "--name-only", "--diff-filter=M").trim().split("\n")).toEqual([
      "one.txt",
      "two.txt",
    ]);
    expect(git("ls-files", "--unmerged")).toContain("binary.dat");
    expect(git("diff", "--", "unrelated.txt")).toContain("unstaged");
    expect(git("ls-files", "--", "untracked.txt")).toBe("");
  });
});
