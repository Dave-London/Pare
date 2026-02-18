/**
 * Smoke tests: git tools batch 1 — Phase 3 (recorded)
 * Tools: log, diff, show, blame, branch
 *
 * Feeds REAL git CLI output captured from actual repos through
 * the tool handler. Validates the parser→formatter→schema chain
 * works with genuine data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  GitLogSchema,
  GitDiffSchema,
  GitShowSchema,
  GitBlameSchema,
  GitBranchSchema,
} from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerLogTool } from "../../../packages/server-git/src/tools/log.js";
import { registerDiffTool } from "../../../packages/server-git/src/tools/diff.js";
import { registerShowTool } from "../../../packages/server-git/src/tools/show.js";
import { registerBlameTool } from "../../../packages/server-git/src/tools/blame.js";
import { registerBranchTool } from "../../../packages/server-git/src/tools/branch.js";

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
// Tool: log
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.log", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerLogTool(server as never);
    handler = server.tools.get("log")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitLogSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] default log (10 commits)", async () => {
    mockGit(loadFixture("log", "s01-default.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.commits.length).toBe(10);
    expect(parsed.total).toBe(10);
    // Verify first commit has expected fields (full mode returns objects)
    const commit = parsed.commits[0] as Record<string, unknown>;
    expect(commit.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(commit.hashShort).toMatch(/^[0-9a-f]{7,}$/);
    expect(commit.author).toContain("Test User");
    expect(commit.message).toBe("chore: iteration 7 of refactoring");
  });

  it("S2 [recorded] custom maxCount=3", async () => {
    mockGit(loadFixture("log", "s02-maxcount3.txt"));
    const { parsed } = await callAndValidate({ maxCount: 3 });
    expect(parsed.commits.length).toBe(3);
    expect(parsed.total).toBe(3);
  });

  it("S3 [recorded] empty repo (no commits)", async () => {
    mockGit(loadFixture("log", "s03-empty.txt"));
    const { parsed } = await callAndValidate({});
    expect(parsed.commits).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it("S7 [recorded] filter by author", async () => {
    mockGit(loadFixture("log", "s07-author-filter.txt"));
    const { parsed } = await callAndValidate({ author: "Test User", compact: false });
    expect(parsed.commits.length).toBeGreaterThan(0);
    for (const commit of parsed.commits) {
      const c = commit as Record<string, unknown>;
      expect(c.author).toContain("Test User");
    }
  });

  it("S8 [recorded] filter by ref", async () => {
    mockGit(loadFixture("log", "s08-ref-main.txt"));
    const { parsed } = await callAndValidate({ ref: "main" });
    expect(parsed.commits.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: diff
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.diff", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerDiffTool(server as never);
    handler = server.tools.get("diff")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitDiffSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] unstaged changes in working tree", async () => {
    mockGit(loadFixture("diff", "s01-unstaged.txt"));
    const { parsed } = await callAndValidate({});
    expect(parsed.files.length).toBeGreaterThanOrEqual(1);
    expect(parsed.totalFiles).toBeGreaterThanOrEqual(1);
    expect(parsed.files[0].file).toBe("src/index.ts");
    expect(parsed.files[0].additions).toBeGreaterThanOrEqual(1);
  });

  it("S2 [recorded] staged changes", async () => {
    mockGit(loadFixture("diff", "s02-staged.txt"));
    const { parsed } = await callAndValidate({ staged: true });
    expect(parsed.files.length).toBeGreaterThanOrEqual(1);
    expect(parsed.totalFiles).toBeGreaterThanOrEqual(1);
  });

  it("S3 [recorded] no changes (clean)", async () => {
    mockGit(loadFixture("diff", "s03-clean.txt"));
    const { parsed } = await callAndValidate({});
    expect(parsed.files).toEqual([]);
    expect(parsed.totalFiles).toBe(0);
  });

  it("S7 [recorded] diff against ref", async () => {
    mockGit(loadFixture("diff", "s07-against-ref.txt"));
    const { parsed } = await callAndValidate({ ref: "HEAD" });
    expect(parsed.files.length).toBeGreaterThanOrEqual(1);
  });

  it("S8 [recorded] single file diff", async () => {
    mockGit(loadFixture("diff", "s08-single-file.txt"));
    const { parsed } = await callAndValidate({ file: "src/helper.ts" });
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].file).toBe("src/helper.ts");
  });

  it("S10 [recorded] full patch mode (atomic)", async () => {
    mockGit(loadFixture("diff", "s10-full-patch.txt"));
    const { parsed } = await callAndValidate({ full: true, atomicFull: true, staged: true });
    // atomicFull mode: numstat lines extracted from full patch output
    expect(parsed).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: show
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.show", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerShowTool(server as never);
    handler = server.tools.get("show")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitShowSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] show HEAD commit", async () => {
    // Call 1: cat-file -t → commit
    mockGit("commit");
    // Call 2: show --no-patch --format=... HEAD → info
    mockGit(loadFixture("show", "s01-head-info.txt"));
    // Call 3: show --numstat --format= HEAD → diff stats
    mockGit(loadFixture("show", "s01-head-numstat.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(parsed.author).toContain("Test User");
    expect(parsed.message).toBeDefined();
    expect(parsed.diff).toBeDefined();
    expect(parsed.diff!.files.length).toBeGreaterThanOrEqual(1);
  });

  it("S2 [recorded] show specific commit", async () => {
    mockGit("commit");
    mockGit(loadFixture("show", "s02-specific-info.txt"));
    mockGit(loadFixture("show", "s02-specific-numstat.txt"));
    const { parsed } = await callAndValidate({ ref: "abc123", compact: false });
    expect(parsed.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(parsed.message).toContain("initial project setup");
    expect(parsed.diff!.files.length).toBeGreaterThanOrEqual(1);
  });

  it("S3 [recorded] invalid ref throws error", async () => {
    mockGit("", "fatal: bad object nonexistent", 128);
    mockGit("", "fatal: bad object nonexistent", 128);
    await expect(callAndValidate({ ref: "nonexistent" })).rejects.toThrow();
  });

  it("S5 [recorded] show tag object", async () => {
    // Annotated tag: cat-file -t returns "tag", then cat-file -p returns tag content
    mockGit("tag");
    mockGit(loadFixture("show", "s05-tag-info.txt"));
    mockGit("120");
    const { parsed } = await callAndValidate({ ref: "v1.0.0", compact: false });
    // Tag objects return objectType and content, not commit hash
    expect(parsed.objectType).toBe("tag");
    expect(parsed.message).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: blame
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.blame", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerBlameTool(server as never);
    handler = server.tools.get("blame")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitBlameSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] blame entire file", async () => {
    mockGit(loadFixture("blame", "s01-full-file.txt"));
    const { parsed } = await callAndValidate({ file: "src/index.ts" });
    expect(parsed.commits.length).toBeGreaterThan(0);
    expect(parsed.file).toBe("src/index.ts");
    expect(parsed.totalLines).toBeGreaterThanOrEqual(1);
    // Each commit group should have author info
    for (const group of parsed.commits) {
      expect(group.hash).toMatch(/^[0-9a-f]+$/);
      expect(group.author).toBeDefined();
    }
  });

  it("S4 [recorded] line range blame", async () => {
    mockGit(loadFixture("blame", "s04-line-range.txt"));
    const { parsed } = await callAndValidate({ file: "src/index.ts", startLine: 1, endLine: 3 });
    expect(parsed.totalLines).toBeLessThanOrEqual(3);
    expect(parsed.commits.length).toBeGreaterThan(0);
  });

  it("S5 [recorded] blame different file", async () => {
    mockGit(loadFixture("blame", "s05-math-file.txt"));
    const { parsed } = await callAndValidate({ file: "src/math.ts" });
    expect(parsed.commits.length).toBeGreaterThan(0);
    expect(parsed.totalLines).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: branch
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.branch", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerBranchTool(server as never);
    handler = server.tools.get("branch")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitBranchSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list branches", async () => {
    // branch -vv (list call)
    mockGit(loadFixture("branch", "s01-list.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.branches.length).toBeGreaterThanOrEqual(2);
    expect(parsed.current).toBe("main");
    // Verify branch data (full mode returns objects)
    const branches = parsed.branches as Array<Record<string, unknown>>;
    const main = branches.find((b) => b.name === "main");
    expect(main).toBeDefined();
    expect(main!.lastCommit).toMatch(/^[0-9a-f]{7,}$/);
  });

  it("S2 [recorded] create branch (then list)", async () => {
    // Call 1: git branch <name> (create)
    mockGit("");
    // Call 2: git branch -vv (list)
    mockGit(loadFixture("branch", "s02-after-create.txt"));
    const { parsed } = await callAndValidate({ create: "test-branch", compact: false });
    expect(parsed.branches.length).toBeGreaterThanOrEqual(3);
    const branches = parsed.branches as Array<Record<string, unknown>>;
    const created = branches.find((b) => b.name === "test-branch");
    expect(created).toBeDefined();
  });

  it("S9 [recorded] all branches including remotes", async () => {
    // branch -vv -a (list all)
    mockGit(loadFixture("branch", "s09-all.txt"));
    const { parsed } = await callAndValidate({ all: true, compact: false });
    expect(parsed.branches.length).toBeGreaterThanOrEqual(2);
    // Should include remote branches (full mode returns objects)
    const branches = parsed.branches as Array<Record<string, unknown>>;
    const remotes = branches.filter((b) => (b.name as string).startsWith("remotes/"));
    expect(remotes.length).toBeGreaterThanOrEqual(1);
  });
});
