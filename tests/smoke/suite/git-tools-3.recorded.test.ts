/**
 * Smoke tests: git tools batch 3 — Phase 3 (recorded)
 * Tools: merge, rebase, cherry-pick, tag, remote, push, pull
 *
 * Feeds REAL git CLI output captured from actual repos through
 * the tool handler. Validates the parser→formatter→schema chain
 * works with genuine data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  GitMergeSchema,
  GitRebaseSchema,
  GitCherryPickSchema,
  GitTagSchema,
  GitRemoteSchema,
  GitPushSchema,
  GitPullSchema,
} from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerMergeTool } from "../../../packages/server-git/src/tools/merge.js";
import { registerRebaseTool } from "../../../packages/server-git/src/tools/rebase.js";
import { registerCherryPickTool } from "../../../packages/server-git/src/tools/cherry-pick.js";
import { registerTagTool } from "../../../packages/server-git/src/tools/tag.js";
import { registerRemoteTool } from "../../../packages/server-git/src/tools/remote.js";
import { registerPushTool } from "../../../packages/server-git/src/tools/push.js";
import { registerPullTool } from "../../../packages/server-git/src/tools/pull.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

const FIXTURE_BASE = resolve(__dirname, "../fixtures/git");

function loadFixture(tool: string, name: string): string {
  return readFileSync(resolve(FIXTURE_BASE, tool, name), "utf-8");
}

function mockGit(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(git).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool: merge
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.merge", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerMergeTool(server as never);
    handler = server.tools.get("merge")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitMergeSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] fast-forward merge", async () => {
    // Call 1: merge-base HEAD feature
    mockGit("abc1234567890123456789012345678901234abcd");
    // Call 2: git merge feature (real output)
    mockGit(loadFixture("merge", "s01-fast-forward.txt"));
    const { parsed } = await callAndValidate({ branch: "feature" });
    expect(parsed.merged).toBe(true);
    expect(parsed.state).toBe("fast-forward");
    expect(parsed.fastForward).toBe(true);
  });

  it("S2 [recorded] merge with conflict", async () => {
    // Call 1: merge-base
    mockGit("abc1234567890123456789012345678901234abcd");
    // Call 2: git merge conflicting (real output, exit code 1)
    mockGit(loadFixture("merge", "s02-conflict.txt"), "", 1);
    const { parsed } = await callAndValidate({ branch: "conflicting" });
    expect(parsed.merged).toBe(false);
    expect(parsed.state).toBe("conflict");
    expect(parsed.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(parsed.conflicts).toContain("src/merge-file.ts");
  });

  it("S3 [recorded] already up to date", async () => {
    // Call 1: merge-base
    mockGit("abc1234567890123456789012345678901234abcd");
    // Call 2: git merge main
    mockGit(loadFixture("merge", "s03-already-up-to-date.txt"));
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.state).toBe("already-up-to-date");
  });

  it("S5 [recorded] abort merge", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ branch: "x", abort: true });
    expect(parsed.merged).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: rebase
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.rebase", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRebaseTool(server as never);
    handler = server.tools.get("rebase")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRebaseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] simple rebase onto branch", async () => {
    // Call 1: rev-parse --abbrev-ref HEAD
    mockGit("feature-branch");
    // Call 2: log --oneline main..HEAD (count commits)
    mockGit("abc1234 feat: one commit\n");
    // Call 3: git rebase main (real output)
    mockGit(loadFixture("rebase", "s01-simple.txt"));
    // Call 4: merge-base --is-ancestor main HEAD (verify)
    mockGit("");
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
  });

  it("S2 [recorded] rebase with conflict", async () => {
    // Call 1: rev-parse --abbrev-ref HEAD
    mockGit("feature-branch");
    // Call 2: log --oneline (count commits)
    mockGit("abc1234 conflicting change\n");
    // Call 3: git rebase (conflict output, exit code 1)
    mockGit("", loadFixture("rebase", "s02-conflict.txt"), 1);
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.success).toBe(false);
    expect(parsed.state).toBe("conflict");
    expect(parsed.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it("S5 [recorded] abort rebase", async () => {
    // Call 1: rev-parse --abbrev-ref HEAD
    mockGit("feature-branch");
    // Call 2: git rebase --abort
    mockGit("");
    const { parsed } = await callAndValidate({ abort: true });
    expect(parsed.state).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: cherry-pick
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.cherry-pick", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerCherryPickTool(server as never);
    handler = server.tools.get("cherry-pick")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitCherryPickSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] cherry-pick single commit", async () => {
    mockGit(loadFixture("cherry-pick", "s01-single.txt"));
    const { parsed } = await callAndValidate({ commits: ["abc123"] });
    expect(parsed.success).toBe(true);
    expect(parsed.applied.length).toBeGreaterThanOrEqual(1);
    expect(parsed.conflicts).toEqual([]);
  });

  it("S2 [recorded] cherry-pick with conflict", async () => {
    const conflictOutput =
      "Auto-merging src/index.ts\nCONFLICT (content): Merge conflict in src/index.ts\n";
    mockGit("", conflictOutput, 1);
    const { parsed } = await callAndValidate({ commits: ["conflicting"] });
    expect(parsed.success).toBe(false);
    expect(parsed.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it("S5 [recorded] abort cherry-pick", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ abort: true });
    expect(parsed.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: tag
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.tag", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerTagTool(server as never);
    handler = server.tools.get("tag")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitTagSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list tags", async () => {
    mockGit(loadFixture("tag", "s01-list.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.tags!.length).toBeGreaterThanOrEqual(4);
    // Verify tag structure (full mode returns objects)
    const tags = parsed.tags as Array<Record<string, unknown>>;
    const v100 = tags.find((t) => t.name === "v1.0.0");
    expect(v100).toBeDefined();
    expect(v100!.date).toBeDefined();
  });

  it("S2 [recorded] create lightweight tag", async () => {
    // Call 1: git tag v1.0
    mockGit("");
    const { parsed } = await callAndValidate({ action: "create", name: "v1.0" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("create");
    expect(parsed.annotated).toBe(false);
  });

  it("S3 [recorded] create annotated tag", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({
      action: "create",
      name: "v2.0",
      message: "Release 2.0",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.annotated).toBe(true);
  });

  it("S4 [recorded] delete tag", async () => {
    mockGit("Deleted tag 'v1.0' (was abc1234)\n");
    const { parsed } = await callAndValidate({ action: "delete", name: "v1.0" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("delete");
  });

  it("S7 [recorded] no tags in repo", async () => {
    mockGit(loadFixture("tag", "s07-empty.txt"));
    const { parsed } = await callAndValidate({});
    expect(parsed.tags).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: remote
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.remote", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRemoteTool(server as never);
    handler = server.tools.get("remote")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRemoteSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list remotes", async () => {
    // Call 1: git remote -v (list)
    mockGit(loadFixture("remote", "s01-list.txt"));
    // Call 2: git remote show origin (per-remote details)
    mockGit(loadFixture("remote", "s06-show.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.remotes!.length).toBeGreaterThanOrEqual(1);
    // Verify remote data (full mode returns objects)
    const remotes = parsed.remotes as Array<Record<string, unknown>>;
    const origin = remotes.find((r) => r.name === "origin");
    expect(origin).toBeDefined();
    expect(origin!.fetchUrl).toBeDefined();
  });

  it("S2 [recorded] add remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({
      action: "add",
      name: "upstream",
      url: "https://github.com/upstream/repo.git",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("add");
  });

  it("S3 [recorded] remove remote", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ action: "remove", name: "upstream" });
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("remove");
  });

  it("S6 [recorded] show remote details", async () => {
    // Call 1: git remote show origin (real output)
    mockGit(loadFixture("remote", "s06-show.txt"));
    const { parsed } = await callAndValidate({ action: "show", name: "origin" });
    expect(parsed.showDetails).toBeDefined();
    expect(parsed.showDetails!.headBranch).toBe("main");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: push
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.push", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerPushTool(server as never);
    handler = server.tools.get("push")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitPushSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] push to remote", async () => {
    // Push output goes to stderr
    mockGit("", loadFixture("push", "s01-push.txt"));
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
  });

  it("S2 [recorded] push rejected (non-fast-forward)", async () => {
    const stderr =
      "To https://github.com/user/repo.git\n ! [rejected]        main -> main (non-fast-forward)\n" +
      "error: failed to push some refs to 'https://github.com/user/repo.git'\n";
    mockGit("", stderr, 1);
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: pull
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.pull", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerPullTool(server as never);
    handler = server.tools.get("pull")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitPullSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] pull with changes available", async () => {
    mockGit(loadFixture("pull", "s01-with-changes.txt"));
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThanOrEqual(1);
  });

  it("S2 [recorded] already up to date", async () => {
    mockGit(loadFixture("pull", "s02-up-to-date.txt"));
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.upToDate).toBe(true);
  });

  it("S3 [recorded] pull with conflict", async () => {
    mockGit(loadFixture("pull", "s03-conflict.txt"), "", 1);
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(false);
    expect(parsed.conflicts.length).toBeGreaterThanOrEqual(1);
  });
});
