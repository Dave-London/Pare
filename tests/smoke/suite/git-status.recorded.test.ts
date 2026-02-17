/**
 * Smoke tests: git.status — Phase 3 (recorded)
 *
 * Feeds REAL `git status --porcelain=v1 --branch` output captured from
 * actual git repos through the tool handler. Validates that the parser,
 * formatter, and schema chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { GitStatusSchema } from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerStatusTool } from "../../../packages/server-git/src/tools/status.js";

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

const FIXTURE_DIR = resolve(__dirname, "../fixtures/git/status");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

function mockGitWithFixture(name: string) {
  vi.mocked(git).mockResolvedValueOnce({
    stdout: loadFixture(name),
    stderr: "",
    exitCode: 0,
  });
}

describe("Recorded: git.status", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerStatusTool(server as never);
    handler = server.tools.get("status")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStatusSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Clean repo (recorded) ──────────────────────────────────────
  it("S1 [recorded] clean repo", async () => {
    mockGitWithFixture("s01-clean.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.clean).toBe(true);
    expect(parsed.staged).toEqual([]);
    expect(parsed.modified).toEqual([]);
    expect(parsed.untracked).toEqual([]);
    expect(parsed.branch).toBe("main");
  });

  // ── S2: Staged added (recorded) ───────────────────────────────────
  it("S2 [recorded] staged added file", async () => {
    mockGitWithFixture("s02-staged-added.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("added");
    expect(parsed.staged[0].file).toBe("new-file.ts");
    expect(parsed.clean).toBe(false);
  });

  // ── S3: Staged modified (recorded) ────────────────────────────────
  it("S3 [recorded] staged modified file", async () => {
    mockGitWithFixture("s03-staged-modified.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("modified");
    expect(parsed.staged[0].file).toBe("src-index.ts");
  });

  // ── S4: Staged deleted (recorded) ─────────────────────────────────
  it("S4 [recorded] staged deleted file", async () => {
    mockGitWithFixture("s04-staged-deleted.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("deleted");
    expect(parsed.staged[0].file).toBe("old-file.ts");
  });

  // ── S5: Staged rename (recorded) ──────────────────────────────────
  it("S5 [recorded] staged rename with oldFile", async () => {
    mockGitWithFixture("s05-staged-rename.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].status).toBe("renamed");
    expect(parsed.staged[0].file).toBe("new-name.ts");
    expect(parsed.staged[0].oldFile).toBe("old-name.ts");
  });

  // ── S6: Worktree modified (recorded) ──────────────────────────────
  it("S6 [recorded] worktree modified", async () => {
    mockGitWithFixture("s06-wt-modified.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.modified).toEqual(["src-index.ts"]);
    expect(parsed.staged).toEqual([]);
  });

  // ── S7: Worktree deleted (recorded) ───────────────────────────────
  it("S7 [recorded] worktree deleted", async () => {
    mockGitWithFixture("s07-wt-deleted.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.deleted).toEqual(["removed.ts"]);
  });

  // ── S8: Untracked (recorded) ──────────────────────────────────────
  it("S8 [recorded] untracked files", async () => {
    mockGitWithFixture("s08-untracked.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.untracked).toContain("new-file.txt");
    expect(parsed.untracked).toContain("another.txt");
    expect(parsed.untracked.length).toBe(2);
  });

  // ── S9: Mixed state (recorded) ────────────────────────────────────
  it("S9 [recorded] mixed state", async () => {
    mockGitWithFixture("s09-mixed.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.modified).toContain("modified.ts");
    expect(parsed.untracked).toContain("untracked.txt");
    expect(parsed.clean).toBe(false);
  });

  // ── S10: MM — both staged and worktree modified (recorded) ────────
  it("S10 [recorded] both staged and worktree modified (MM)", async () => {
    mockGitWithFixture("s10-mm.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.staged.length).toBe(1);
    expect(parsed.staged[0].file).toBe("src-index.ts");
    expect(parsed.modified).toContain("src-index.ts");
  });

  // ── S18: Merge conflict UU (recorded) ─────────────────────────────
  it("S18 [recorded] merge conflict UU", async () => {
    mockGitWithFixture("s18-conflict-uu.txt");
    const { parsed } = await callAndValidate({});
    expect(parsed.conflicts).toContain("conflicted.ts");
  });
});
