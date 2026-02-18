/**
 * Smoke tests: git tools batch 4 — Phase 3 (recorded)
 * Tools: reflog, log-graph, bisect, worktree
 *
 * Feeds REAL git CLI output captured from actual repos through
 * the tool handler. Validates the parser→formatter→schema chain
 * works with genuine data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  GitReflogSchema,
  GitLogGraphSchema,
  GitBisectSchema,
  GitWorktreeOutputSchema,
} from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerReflogTool } from "../../../packages/server-git/src/tools/reflog.js";
import { registerLogGraphTool } from "../../../packages/server-git/src/tools/log-graph.js";
import { registerBisectTool } from "../../../packages/server-git/src/tools/bisect.js";
import { registerWorktreeTool } from "../../../packages/server-git/src/tools/worktree.js";

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
// Tool: reflog
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.reflog", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerReflogTool(server as never);
    handler = server.tools.get("reflog")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitReflogSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] default reflog (HEAD)", async () => {
    // Call 1: reflog show --format=... --max-count=20
    mockGit(loadFixture("reflog", "s01-default.txt"));
    // Call 2: reflog show --format=%H (count total)
    mockGit(loadFixture("reflog", "s01-default.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.entries.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
    // Verify entry structure (full mode returns objects)
    const entry = parsed.entries[0] as Record<string, unknown>;
    expect(entry.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(entry.shortHash).toMatch(/^[0-9a-f]{7,}$/);
    expect(entry.action).toBeDefined();
    expect(entry.date).toBeDefined();
  });

  it("S2 [recorded] empty reflog", async () => {
    mockGit("");
    mockGit("");
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.entries).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it("S6 [recorded] custom maxCount=5", async () => {
    mockGit(loadFixture("reflog", "s06-maxcount5.txt"));
    mockGit(loadFixture("reflog", "s01-default.txt"));
    const { parsed } = await callAndValidate({ maxCount: 5, compact: false });
    expect(parsed.entries.length).toBeLessThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: log-graph
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.log-graph", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerLogGraphTool(server as never);
    handler = server.tools.get("log-graph")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitLogGraphSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] default graph", async () => {
    mockGit(loadFixture("log-graph", "s01-default.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.commits.length).toBeGreaterThan(0);
    expect(parsed.total).toBeGreaterThan(0);
    // Verify graph entry structure (full mode returns objects)
    const commit = parsed.commits[0] as Record<string, unknown>;
    expect(commit.hashShort).toMatch(/^[0-9a-f]{7,}$/);
    expect(commit.message).toBeDefined();
    expect(commit.graph).toBeDefined();
  });

  it("S2 [recorded] empty repo", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.commits).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it("S5 [recorded] all branches", async () => {
    mockGit(loadFixture("log-graph", "s05-all-branches.txt"));
    const { parsed } = await callAndValidate({ all: true, compact: false });
    expect(parsed.commits.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: bisect
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.bisect", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerBisectTool(server as never);
    handler = server.tools.get("bisect")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitBisectSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] start bisect with bad and good", async () => {
    // Call 1: git bisect start
    mockGit("");
    // Call 2: git bisect bad HEAD
    mockGit("");
    // Call 3: git bisect good abc123 — triggers first bisect step
    mockGit(
      "Bisecting: 6 revisions left to test after this (roughly 3 steps)\n" +
        "[72f80a40f891fd87354cc2f28075ca9d81ae417d] chore: iteration 4 of refactoring",
    );
    // Call 4: git show --pretty=format: --name-only (for enrichFilesChanged)
    mockGit("src/index.ts\n");
    const { parsed } = await callAndValidate({
      action: "start",
      bad: "HEAD",
      good: "abc123",
    });
    expect(parsed.action).toBe("start");
    expect(parsed.current).toBe("72f80a40f891fd87354cc2f28075ca9d81ae417d");
    expect(parsed.remaining).toBe(3);
  });

  it("S4 [recorded] reset bisect session", async () => {
    mockGit("Previous HEAD position was abc123\nSwitched to branch 'main'");
    const { parsed } = await callAndValidate({ action: "reset" });
    expect(parsed.action).toBe("reset");
    expect(parsed.message).toBeDefined();
  });

  it("S5 [recorded] start without bad/good throws", async () => {
    await expect(callAndValidate({ action: "start" })).rejects.toThrow(
      "Both 'bad' and 'good' commit refs are required",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: worktree
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.worktree", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerWorktreeTool(server as never);
    handler = server.tools.get("worktree")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitWorktreeOutputSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list worktrees", async () => {
    mockGit(loadFixture("worktree", "s01-list.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.worktrees!.length).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBeGreaterThanOrEqual(1);
    // Verify worktree structure (full mode returns objects)
    const wt = parsed.worktrees![0] as Record<string, unknown>;
    expect(wt.path).toBeDefined();
    expect(wt.head).toMatch(/^[0-9a-f]{40}$/);
    expect(wt.branch).toBeDefined();
  });

  it("S2 [recorded] list after adding worktree", async () => {
    mockGit(loadFixture("worktree", "s02-list-after-add.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.worktrees!.length).toBeGreaterThanOrEqual(2);
    expect(parsed.total).toBeGreaterThanOrEqual(2);
    // Second worktree should be on a different branch
    const worktrees = parsed.worktrees! as Array<Record<string, unknown>>;
    const branches = worktrees.map((wt) => wt.branch);
    expect(new Set(branches).size).toBeGreaterThan(1);
  });

  it("S4 [recorded] add without path throws", async () => {
    await expect(callAndValidate({ action: "add" })).rejects.toThrow();
  });
});
