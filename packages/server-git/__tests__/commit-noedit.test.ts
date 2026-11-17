/**
 * Regression tests for #1255 — `commit` with `amend` + `noEdit` must keep the
 * existing message.
 *
 * The tool always piped `message` through `--file -`, and git lets `-F` win over
 * `--no-edit`, so `amend: true, noEdit: true, message: "x"` silently replaced the
 * amended commit's message with "x". `message` is now optional, only sent when
 * given, and rejected together with `noEdit` / `reuseMessage` / `fixup` (each of
 * which supplies the message itself).
 *
 * These run REAL git in temp repos through the registered tool handler.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerCommitTool, validateCommitMessageArgs } from "../src/tools/commit.js";

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

function getHandler(): ToolHandler {
  const server = new FakeServer();
  registerCommitTool(server as never);
  return server.tools.get("commit")!.handler;
}

describe("commit message sources against real git (#1255)", () => {
  let repo: string;
  let commit: ToolHandler;

  function run(args: string[]): string {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  }
  const headMessage = () => run(["log", "-1", "--format=%B"]).trim();
  const headHash = () => run(["rev-parse", "HEAD"]).trim();
  const commitCount = () => Number(run(["rev-list", "--count", "HEAD"]).trim());
  const stageChange = (line: string) => {
    appendFileSync(join(repo, "file.txt"), `${line}\n`);
    run(["add", "file.txt"]);
  };

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "pare-commit-noedit-"));
    run(["init", "-q", "-b", "main"]);
    run(["config", "user.email", "test@pare.dev"]);
    run(["config", "user.name", "Pare Test"]);
    run(["config", "commit.gpgsign", "false"]);
    writeFileSync(join(repo, "file.txt"), "one\n");
    run(["add", "file.txt"]);
    run(["commit", "-q", "-m", "feat: original subject", "-m", "Original body line."]);
    commit = getHandler();
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("rejects amend + noEdit + message and leaves the commit untouched", async () => {
    stageChange("two");
    const before = headHash();

    await expect(
      commit({ path: repo, amend: true, noEdit: true, message: "WRONG: replacement" }),
    ).rejects.toThrow(/'message' cannot be combined with 'noEdit'/);

    expect(headHash()).toBe(before);
    expect(headMessage()).toBe("feat: original subject\n\nOriginal body line.");
  });

  it("amend + noEdit without message keeps the full existing message", async () => {
    stageChange("two");
    const before = headHash();

    const result = await commit({ path: repo, amend: true, noEdit: true });

    expect(headHash()).not.toBe(before);
    expect(commitCount()).toBe(1);
    expect(headMessage()).toBe("feat: original subject\n\nOriginal body line.");
    expect(run(["show", "HEAD:file.txt"])).toBe("one\ntwo\n");
    // Structured output and formatter report the kept subject, not a caller value.
    expect(result.structuredContent.message).toBe("feat: original subject");
    expect(result.structuredContent.hashShort).toBe(headHash().slice(0, 7));
    const text = (result.content as { text: string }[])[0].text;
    expect(text).toContain("feat: original subject");
  });

  it("treats an empty message as absent alongside noEdit", async () => {
    stageChange("two");
    await commit({ path: repo, amend: true, noEdit: true, message: "" });
    expect(headMessage()).toBe("feat: original subject\n\nOriginal body line.");
  });

  it("amend with a message (no noEdit) still rewrites the message", async () => {
    stageChange("two");
    const result = await commit({ path: repo, amend: true, message: "feat: reworded" });
    expect(commitCount()).toBe(1);
    expect(headMessage()).toBe("feat: reworded");
    expect(result.structuredContent.message).toBe("feat: reworded");
  });

  it("noEdit without amend uses a prepared MERGE_MSG", async () => {
    run(["checkout", "-q", "-b", "feature"]);
    writeFileSync(join(repo, "feature.txt"), "feature\n");
    run(["add", "feature.txt"]);
    run(["commit", "-q", "-m", "feat: feature work"]);
    run(["checkout", "-q", "main"]);
    run(["merge", "--no-ff", "--no-commit", "feature"]);

    const result = await commit({ path: repo, noEdit: true });

    expect(headMessage()).toBe("Merge branch 'feature'");
    expect(result.structuredContent.message).toBe("Merge branch 'feature'");
  });

  it("noEdit without amend and no prepared message surfaces git's error", async () => {
    stageChange("two");
    await expect(commit({ path: repo, noEdit: true })).rejects.toThrow(/git commit failed/);
    expect(commitCount()).toBe(1);
  });

  it("reuseMessage works without message (previously failed: -C with -F)", async () => {
    stageChange("two");
    await commit({ path: repo, reuseMessage: "HEAD" });
    expect(commitCount()).toBe(2);
    expect(headMessage()).toBe("feat: original subject\n\nOriginal body line.");
  });

  it("fixup works without message (previously failed: --fixup with -F)", async () => {
    stageChange("two");
    await commit({ path: repo, fixup: "HEAD" });
    expect(headMessage()).toBe("fixup! feat: original subject");
  });

  it("fixup=amend: does not open an editor without a message", async () => {
    stageChange("two");
    await commit({ path: repo, fixup: "amend:HEAD" });
    expect(headMessage()).toBe(
      "amend! feat: original subject\n\nfeat: original subject\n\nOriginal body line.",
    );
  }, 20_000);

  it("rejects a commit with no message source", async () => {
    stageChange("two");
    await expect(commit({ path: repo })).rejects.toThrow(/'message' is required/);
    expect(commitCount()).toBe(1);
  });
});

describe("validateCommitMessageArgs", () => {
  it("accepts exactly one message source", () => {
    expect(validateCommitMessageArgs({ message: "feat: x" })).toBeUndefined();
    expect(validateCommitMessageArgs({ noEdit: true })).toBeUndefined();
    expect(validateCommitMessageArgs({ reuseMessage: "HEAD" })).toBeUndefined();
    expect(validateCommitMessageArgs({ fixup: "HEAD" })).toBeUndefined();
    expect(validateCommitMessageArgs({ message: "  ", noEdit: true })).toBeUndefined();
  });

  it("rejects message combined with another source", () => {
    expect(validateCommitMessageArgs({ message: "x", noEdit: true })).toMatch(/'noEdit'/);
    expect(validateCommitMessageArgs({ message: "x", reuseMessage: "HEAD" })).toMatch(
      /'reuseMessage'/,
    );
    expect(validateCommitMessageArgs({ message: "x", fixup: "HEAD" })).toMatch(/'fixup'/);
  });

  it("requires a message source", () => {
    expect(validateCommitMessageArgs({})).toMatch(/'message' is required/);
    expect(validateCommitMessageArgs({ message: "" })).toMatch(/'message' is required/);
    expect(validateCommitMessageArgs({ noEdit: false })).toMatch(/'message' is required/);
  });
});
