import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseBisect,
  parseBranch,
  parseCherryPick,
  parseCommit,
  parseLog,
  parseLogGraph,
  parseMerge,
  parsePush,
  parseReflogOutput,
  parseTagOutput,
} from "../src/lib/parsers.js";
import { registerBisectTool } from "../src/tools/bisect.js";
import { registerBranchTool } from "../src/tools/branch.js";
import { registerCheckoutTool } from "../src/tools/checkout.js";
import { registerDiffTool } from "../src/tools/diff.js";
import { registerMergeTool } from "../src/tools/merge.js";
import { registerRebaseTool } from "../src/tools/rebase.js";
import { registerRemoteTool } from "../src/tools/remote.js";
import { registerResetTool } from "../src/tools/reset.js";
import { registerRestoreTool } from "../src/tools/restore.js";
import { registerShowTool } from "../src/tools/show.js";
import { registerStashTool } from "../src/tools/stash.js";
import { registerStatusTool } from "../src/tools/status.js";
import { registerWorktreeTool } from "../src/tools/worktree.js";

vi.mock("../src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../src/lib/git-runner.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

describe("Git P2 gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("#242 adds bisect replay action", async () => {
    const server = new FakeServer();
    registerBisectTool(server as never);
    const handler = server.tools.get("bisect")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({
        stdout: "abc1234def5678901234567890abcdef12345678 is the first bad commit",
        stderr: "",
        exitCode: 0,
      })
      .mockResolvedValueOnce({ stdout: "src/a.ts\nsrc/b.ts\n", stderr: "", exitCode: 0 });

    await handler({ action: "replay", replayFile: "bisect.log" });
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["bisect", "replay", "bisect.log"]);
  });

  it("#243 enriches bisect culprit with filesChanged", async () => {
    const server = new FakeServer();
    registerBisectTool(server as never);
    const handler = server.tools.get("bisect")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({
        stdout: "abc1234def5678901234567890abcdef12345678 is the first bad commit",
        stderr: "",
        exitCode: 0,
      })
      .mockResolvedValueOnce({ stdout: "src/a.ts\nsrc/b.ts\n", stderr: "", exitCode: 0 });

    const out = (await handler({
      action: "replay",
      replayFile: "bisect.log",
    })) as { structuredContent: { result?: { filesChanged?: string[] } } };
    expect(out.structuredContent.result?.filesChanged).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("#244 improves remaining estimate when rough steps are missing", () => {
    const result = parseBisect(
      "Bisecting: 31 revisions left to test after this\n[abc1234] commit message",
      "",
      "good",
    );
    expect(result.remaining).toBe(5);
  });

  it("#245 separates branch creation from switching", async () => {
    const server = new FakeServer();
    registerBranchTool(server as never);
    const handler = server.tools.get("branch")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "* main", stderr: "", exitCode: 0 });

    await handler({ create: "feature/new" });
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["branch", "feature/new"]);
    expect(vi.mocked(git).mock.calls.some((c) => c[0][0] === "switch")).toBe(false);
  });

  it("#246 parses lastCommit in branch listings", () => {
    const out = parseBranch("  dev abc1234 [origin/dev] msg\n* main def5678 [origin/main] msg");
    expect(out.branches[0].lastCommit).toBe("abc1234");
    expect(out.branches[1].lastCommit).toBe("def5678");
  });

  it("#247 adds modifiedFiles on successful checkout", async () => {
    const server = new FakeServer();
    registerCheckoutTool(server as never);
    const handler = server.tools.get("checkout")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "main\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "", stderr: "Switched to branch 'dev'", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "dev\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "a.ts\nb.ts\n", stderr: "", exitCode: 0 });

    const out = (await handler({ ref: "dev" })) as {
      structuredContent: { modifiedFiles?: string[] };
    };
    expect(out.structuredContent.modifiedFiles).toEqual(["a.ts", "b.ts"]);
  });

  it("#248 aligns branch switching with git switch", async () => {
    const server = new FakeServer();
    registerCheckoutTool(server as never);
    const handler = server.tools.get("checkout")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "main\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "", stderr: "Switched to branch 'dev'", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "dev\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ ref: "dev" });
    expect(vi.mocked(git).mock.calls[1][0][0]).toBe("switch");
  });

  it("#249 returns newCommitHash from cherry-pick output", () => {
    const out = parseCherryPick("[main abc1234] pick commit", "", 0, ["deadbeef"]);
    expect(out.newCommitHash).toBe("abc1234");
  });

  it("#250 returns conflict file details for cherry-pick conflicts", () => {
    const out = parseCherryPick("", "CONFLICT (content): Merge conflict in src/main.ts", 1, []);
    expect(out.conflicts).toEqual(["src/main.ts"]);
  });

  it("#251 keeps commit parsing robust for special branch names", () => {
    const out = parseCommit(
      "[feature/@scope+hotfix abc1234] message\n 1 file changed, 1 insertion(+)",
    );
    expect(out.hash).toBe("abc1234");
  });

  it("#252 supports atomic full diff mode", async () => {
    const server = new FakeServer();
    registerDiffTool(server as never);
    const handler = server.tools.get("diff")!.handler;
    vi.mocked(git).mockResolvedValueOnce({
      stdout: "1\t0\tsrc/a.ts\n" + "diff --git a/src/a.ts b/src/a.ts\n@@ -1 +1 @@\n-old\n+new\n",
      stderr: "",
      exitCode: 0,
    });

    await handler({ full: true, atomicFull: true, compact: false });
    expect(vi.mocked(git).mock.calls).toHaveLength(1);
    expect(vi.mocked(git).mock.calls[0][0]).toContain("--numstat");
    expect(vi.mocked(git).mock.calls[0][0]).toContain("--patch");
  });

  it("#608 diff full=true returns patch chunks in structuredContent", async () => {
    const server = new FakeServer();
    registerDiffTool(server as never);
    const handler = server.tools.get("diff")!.handler;

    // First call: git diff --numstat (returns file stats)
    vi.mocked(git).mockResolvedValueOnce({
      stdout: "3\t1\tsrc/index.ts",
      stderr: "",
      exitCode: 0,
    });
    // Second call: git diff (returns patch content)
    vi.mocked(git).mockResolvedValueOnce({
      stdout:
        "diff --git a/src/index.ts b/src/index.ts\n" +
        "--- a/src/index.ts\n" +
        "+++ b/src/index.ts\n" +
        "@@ -1,4 +1,6 @@\n" +
        " line1\n" +
        "-old line\n" +
        "+new line\n" +
        "+added line\n" +
        "+another line\n" +
        " line4\n",
      stderr: "",
      exitCode: 0,
    });

    const result = (await handler({ full: true })) as {
      structuredContent: {
        files: Array<{
          file: string;
          chunks?: Array<{ header: string; lines: string }>;
        }>;
      };
    };

    // Verify chunks are present in the structured output
    expect(result.structuredContent.files).toHaveLength(1);
    expect(result.structuredContent.files[0].file).toBe("src/index.ts");
    expect(result.structuredContent.files[0].chunks).toBeDefined();
    expect(result.structuredContent.files[0].chunks!.length).toBeGreaterThan(0);
    expect(result.structuredContent.files[0].chunks![0].header).toContain("@@");
    expect(result.structuredContent.files[0].chunks![0].lines).toContain("+new line");
  });

  it("#608 diff full=true with atomicFull returns patch chunks", async () => {
    const server = new FakeServer();
    registerDiffTool(server as never);
    const handler = server.tools.get("diff")!.handler;

    // Single call: git diff --numstat --patch (returns both stats and patch)
    vi.mocked(git).mockResolvedValueOnce({
      stdout:
        "3\t1\tsrc/index.ts\n" +
        "\n" +
        "diff --git a/src/index.ts b/src/index.ts\n" +
        "--- a/src/index.ts\n" +
        "+++ b/src/index.ts\n" +
        "@@ -1,4 +1,6 @@\n" +
        " line1\n" +
        "-old line\n" +
        "+new line\n" +
        "+added line\n" +
        "+another line\n" +
        " line4\n",
      stderr: "",
      exitCode: 0,
    });

    const result = (await handler({ full: true, atomicFull: true })) as {
      structuredContent: {
        files: Array<{
          file: string;
          chunks?: Array<{ header: string; lines: string }>;
        }>;
      };
    };

    // Verify chunks are present even without compact=false
    expect(result.structuredContent.files).toHaveLength(1);
    expect(result.structuredContent.files[0].file).toBe("src/index.ts");
    expect(result.structuredContent.files[0].chunks).toBeDefined();
    expect(result.structuredContent.files[0].chunks!.length).toBeGreaterThan(0);
    expect(result.structuredContent.files[0].chunks![0].header).toContain("@@");
  });

  it("#253 keeps log parsing safe with @@ in messages", () => {
    const stdout =
      "abc\x00123\x00Author <a@b.com>\x00today\x00\x00subject with @@ marker\x00body\x01";
    const out = parseLog(stdout);
    expect(out.commits[0].message).toContain("@@");
  });

  it("#254 adds parent hashes in log-graph parsing", () => {
    const out = parseLogGraph("* abc1234 def5678  (HEAD -> main) commit message");
    expect(out.commits[0].parents).toEqual(["def5678"]);
  });

  it("#255 flags merge commits in log-graph output", () => {
    const out = parseLogGraph("* abc1234 def5678 fedcba9  Merge branch 'feature'");
    expect(out.commits[0].isMerge).toBe(true);
  });

  it("#256 adds structured merge error typing", () => {
    const out = parseMerge("", "fatal: refusing to merge unrelated histories", "feature");
    expect(out.state).toBe("failed");
    expect(out.errorType).toBe("unrelated-histories");
  });

  it("#257 includes mergeBase in merge results", async () => {
    const server = new FakeServer();
    registerMergeTool(server as never);
    const handler = server.tools.get("merge")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "aaa111bbb222\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "Already up to date.", stderr: "", exitCode: 0 });

    const out = (await handler({ branch: "feature" })) as {
      structuredContent: { mergeBase?: string };
    };
    expect(out.structuredContent.mergeBase).toBe("aaa111bbb222");
  });

  it("#258 parses push object transfer stats", () => {
    const out = parsePush(
      "",
      "Total 10 (delta 3), reused 2 (delta 1), pack-reused 4",
      "origin",
      "main",
    );
    expect(out.objectStats?.total).toBe(10);
    expect(out.objectStats?.delta).toBe(3);
  });

  it("#259 verifies successful rebase results", async () => {
    const server = new FakeServer();
    registerRebaseTool(server as never);
    const handler = server.tools.get("rebase")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "main\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "a\nb\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({
        stdout: "Successfully rebased and updated refs/heads/main.",
        stderr: "",
        exitCode: 0,
      })
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = (await handler({ branch: "origin/main" })) as {
      structuredContent: { verified?: boolean };
    };
    expect(out.structuredContent.verified).toBe(true);
  });

  it("#260 enriches reflog entries with selector/move metadata", () => {
    const out = parseReflogOutput(
      "abc123\tabc1234\tHEAD@{7}\tcheckout: moving from main to feature\t2024-01-01 00:00:00 +0000",
    );
    expect(out.entries[0].selectorIndex).toBe(7);
    expect(out.entries[0].fromRef).toBe("main");
    expect(out.entries[0].toRef).toBe("feature");
  });

  it("#261 adds trackedBranches to remote list output", async () => {
    const server = new FakeServer();
    registerRemoteTool(server as never);
    const handler = server.tools.get("remote")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({
        stdout:
          "origin\tgit@github.com:org/repo.git (fetch)\norigin\tgit@github.com:org/repo.git (push)",
        stderr: "",
        exitCode: 0,
      })
      .mockResolvedValueOnce({
        stdout:
          "* remote origin\n" +
          "  Fetch URL: git@github.com:org/repo.git\n" +
          "  Push  URL: git@github.com:org/repo.git\n" +
          "  Local branch configured for 'git pull':\n" +
          "    main merges with remote main\n",
        stderr: "",
        exitCode: 0,
      });

    const out = (await handler({ action: "list", compact: false })) as {
      structuredContent: { remotes: Array<{ trackedBranches?: string[] }> };
    };
    expect(out.structuredContent.remotes[0].trackedBranches).toContain("main");
  });

  it("#262 adds remote update action", async () => {
    const server = new FakeServer();
    registerRemoteTool(server as never);
    const handler = server.tools.get("remote")!.handler;
    vi.mocked(git).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ action: "update" });
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["remote", "update"]);
  });

  it("#263 returns typed reset errors instead of throwing", async () => {
    const server = new FakeServer();
    registerResetTool(server as never);
    const handler = server.tools.get("reset")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "abc123\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "fatal: ambiguous argument 'badref': unknown revision",
        exitCode: 1,
      });

    const out = (await handler({ ref: "badref" })) as {
      structuredContent: { success?: boolean; errorType?: string };
    };
    expect(out.structuredContent.success).toBe(false);
    expect(out.structuredContent.errorType).toBe("invalid-ref");
  });

  it("#264 returns typed restore errors instead of throwing", async () => {
    const server = new FakeServer();
    registerRestoreTool(server as never);
    const handler = server.tools.get("restore")!.handler;
    vi.mocked(git).mockResolvedValueOnce({
      stdout: "",
      stderr: "error: pathspec 'missing.ts' did not match any file(s) known to git",
      exitCode: 1,
    });

    const out = (await handler({ files: ["missing.ts"] })) as {
      structuredContent: { success?: boolean; errorType?: string };
    };
    expect(out.structuredContent.success).toBe(false);
    expect(out.structuredContent.errorType).toBe("pathspec");
  });

  it("#265 supports non-commit objects in show", async () => {
    const server = new FakeServer();
    registerShowTool(server as never);
    const handler = server.tools.get("show")!.handler;
    vi.mocked(git)
      .mockResolvedValueOnce({ stdout: "blob\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "hello\n", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({ stdout: "5\n", stderr: "", exitCode: 0 });

    const out = (await handler({ ref: "README.md", compact: false })) as {
      structuredContent: { objectType?: string; objectSize?: number };
    };
    expect(out.structuredContent.objectType).toBe("blob");
    expect(out.structuredContent.objectSize).toBe(5);
  });

  it("#266 adds stash branch action", async () => {
    const server = new FakeServer();
    registerStashTool(server as never);
    const handler = server.tools.get("stash")!.handler;
    vi.mocked(git).mockResolvedValueOnce({
      stdout: "Switched to a new branch 'fixes'\nDropped refs/stash@{0}",
      stderr: "",
      exitCode: 0,
    });

    const out = (await handler({
      action: "branch",
      branchName: "fixes",
      index: 0,
    })) as { structuredContent: { branchName?: string } };
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["stash", "branch", "fixes", "stash@{0}"]);
    expect(out.structuredContent.branchName).toBe("fixes");
  });

  it("#267 supports status porcelain=v2", async () => {
    const server = new FakeServer();
    registerStatusTool(server as never);
    const handler = server.tools.get("status")!.handler;
    vi.mocked(git).mockResolvedValueOnce({
      stdout:
        "# branch.head main\n" +
        "# branch.upstream origin/main\n" +
        "# branch.ab +1 -2\n" +
        "1 M. N... 100644 100644 100644 abc abc src/a.ts\n" +
        "? src/new.ts\n",
      stderr: "",
      exitCode: 0,
    });

    const out = (await handler({ porcelainVersion: "v2" })) as {
      structuredContent: { porcelainVersion?: string; branch?: string };
    };
    expect(out.structuredContent.porcelainVersion).toBe("v2");
    expect(out.structuredContent.branch).toBe("main");
  });

  it("#268 parses tagType from tag output", () => {
    const out = parseTagOutput(
      "v2.0.0\t2024-01-01T00:00:00Z\trelease\tcommit\nv1.0.0\t2023-01-01T00:00:00Z\tfirst\t",
    );
    expect(out.tags[0].tagType).toBe("annotated");
    expect(out.tags[1].tagType).toBe("lightweight");
  });

  it("#269 adds worktree move action", async () => {
    const server = new FakeServer();
    registerWorktreeTool(server as never);
    const handler = server.tools.get("worktree")!.handler;
    vi.mocked(git).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ action: "move", worktreePath: "/tmp/a", newPath: "/tmp/b" });
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["worktree", "move", "/tmp/a", "/tmp/b"]);
  });

  it("#270 adds worktree repair action", async () => {
    const server = new FakeServer();
    registerWorktreeTool(server as never);
    const handler = server.tools.get("worktree")!.handler;
    vi.mocked(git).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ action: "repair", repairPaths: ["/tmp/a", "/tmp/b"] });
    expect(vi.mocked(git).mock.calls[0][0]).toEqual(["worktree", "repair", "/tmp/a", "/tmp/b"]);
  });
});
