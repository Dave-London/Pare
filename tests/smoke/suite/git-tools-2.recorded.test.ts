/**
 * Smoke tests: git tools batch 2 — Phase 3 (recorded)
 * Tools: add, commit, checkout, restore, reset, stash, stash-list
 *
 * Feeds REAL git CLI output captured from actual repos through
 * the tool handler. Validates the parser→formatter→schema chain
 * works with genuine data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  GitAddSchema,
  GitCommitSchema,
  GitCheckoutSchema,
  GitRestoreSchema,
  GitResetSchema,
  GitStashSchema,
  GitStashListSchema,
} from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerAddTool } from "../../../packages/server-git/src/tools/add.js";
import { registerCommitTool } from "../../../packages/server-git/src/tools/commit.js";
import { registerCheckoutTool } from "../../../packages/server-git/src/tools/checkout.js";
import { registerRestoreTool } from "../../../packages/server-git/src/tools/restore.js";
import { registerResetTool } from "../../../packages/server-git/src/tools/reset.js";
import { registerStashTool } from "../../../packages/server-git/src/tools/stash.js";
import { registerStashListTool } from "../../../packages/server-git/src/tools/stash-list.js";

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
// Tool: add
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.add", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerAddTool(server as never);
    handler = server.tools.get("add")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitAddSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] stage specific files", async () => {
    // Call 1: git add -- files
    mockGit("");
    // Call 2: after-status (real fixture)
    mockGit(loadFixture("add", "s01-after-add.txt"));
    const { parsed } = await callAndValidate({
      files: ["src/index.ts", "src/new-file.ts"],
      all: false,
    });
    expect(parsed.files.length).toBeGreaterThanOrEqual(2);
    expect(parsed.files.some((f) => f.file === "src/index.ts")).toBe(true);
    expect(parsed.files.some((f) => f.file === "src/new-file.ts")).toBe(true);
  });

  it("S2 [recorded] stage all changes", async () => {
    // Call 1: git add -A
    mockGit("");
    // Call 2: after-status (real fixture)
    mockGit(loadFixture("add", "s01-after-add.txt"));
    const { parsed } = await callAndValidate({ all: true });
    expect(parsed.files.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: commit
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.commit", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerCommitTool(server as never);
    handler = server.tools.get("commit")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitCommitSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] basic commit with staged changes", async () => {
    mockGit(loadFixture("commit", "s01-basic.txt"));
    const { parsed } = await callAndValidate({ message: "feat: add commit test" });
    expect(parsed.hash).toBeDefined();
    expect(parsed.hashShort).toMatch(/^[0-9a-f]{7,}$/);
    expect(parsed.message).toContain("feat: add commit test");
    expect(parsed.filesChanged).toBeGreaterThanOrEqual(1);
  });

  it("S4 [recorded] allow empty commit", async () => {
    mockGit(loadFixture("commit", "s04-allow-empty.txt"));
    const { parsed } = await callAndValidate({ message: "chore: empty commit", allowEmpty: true });
    expect(parsed.hash).toBeDefined();
    expect(parsed.hashShort).toMatch(/^[0-9a-f]{7,}$/);
  });

  it("S2 [recorded] commit with nothing staged throws", async () => {
    mockGit("", "nothing to commit, working tree clean", 1);
    await expect(callAndValidate({ message: "empty" })).rejects.toThrow("git commit failed");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: checkout
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.checkout", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerCheckoutTool(server as never);
    handler = server.tools.get("checkout")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitCheckoutSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] switch to existing branch", async () => {
    // Call 1: rev-parse --abbrev-ref HEAD (get previous ref)
    mockGit("main");
    // Call 2: git switch feature-branch
    mockGit("", "Switched to branch 'feature-branch'");
    // Call 3: rev-parse --abbrev-ref HEAD (get current ref)
    mockGit("feature-branch");
    // Call 4: diff --name-only main..feature-branch
    mockGit("src/feature.ts\n");
    const { parsed } = await callAndValidate({ ref: "feature-branch", create: false });
    expect(parsed.success).toBe(true);
    expect(parsed.previousRef).toBe("main");
  });

  it("S2 [recorded] create and switch to new branch", async () => {
    // Call 1: rev-parse --abbrev-ref HEAD
    mockGit("main");
    // Call 2: git switch -c new-branch
    mockGit("", "Switched to a new branch 'new-branch'");
    // Call 3: rev-parse --abbrev-ref HEAD
    mockGit("new-branch");
    // Call 4: diff (same commit so no diff)
    mockGit("");
    const { parsed } = await callAndValidate({ ref: "new-branch", create: true });
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
  });

  it("S3 [recorded] checkout nonexistent ref", async () => {
    mockGit("main");
    mockGit("", "error: pathspec 'nonexistent' did not match any file(s) known to git", 1);
    const { parsed } = await callAndValidate({ ref: "nonexistent" });
    expect(parsed.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: restore
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.restore", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerRestoreTool(server as never);
    handler = server.tools.get("restore")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitRestoreSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] restore working tree file", async () => {
    // Call 1: git restore -- modified.ts
    mockGit("");
    // Call 2: git status --porcelain=v1 (verify file is no longer modified)
    mockGit("");
    const { parsed } = await callAndValidate({ files: ["modified.ts"], staged: false });
    expect(parsed.restored).toContain("modified.ts");
  });

  it("S2 [recorded] restore staged file", async () => {
    // Call 1: git restore --staged -- staged.ts
    mockGit("");
    // Call 2: git status --porcelain=v1
    mockGit(" M staged.ts\n");
    const { parsed } = await callAndValidate({ files: ["staged.ts"], staged: true });
    expect(parsed.restored).toContain("staged.ts");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: reset
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.reset", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerResetTool(server as never);
    handler = server.tools.get("reset")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitResetSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] unstage files (mixed reset HEAD)", async () => {
    // Call 1: rev-parse HEAD (before)
    mockGit("abc1234567890123456789012345678901234abcd");
    // Call 2: git reset HEAD -- src/index.ts (real output)
    mockGit(loadFixture("reset", "s01-unstage.txt"));
    // Call 3: rev-parse HEAD (after — same commit)
    mockGit("abc1234567890123456789012345678901234abcd");
    const { parsed } = await callAndValidate({ files: ["src/index.ts"], ref: "HEAD" });
    expect(parsed.ref).toBe("HEAD");
  });

  it("S2 [recorded] soft reset", async () => {
    const beforeHash = "abc1234567890123456789012345678901234abcd";
    const afterHash = "def5678901234567890123456789012345678abcd";
    // Call 1: rev-parse HEAD (before)
    mockGit(beforeHash);
    // Call 2: git reset --soft HEAD~1
    mockGit("");
    // Call 3: rev-parse HEAD (after — different commit)
    mockGit(afterHash);
    const { parsed } = await callAndValidate({ ref: "HEAD~1", mode: "soft" });
    expect(parsed.ref).toBe("HEAD~1");
    expect(parsed.mode).toBe("soft");
  });

  it("S3 [recorded] hard reset without confirm throws", async () => {
    await expect(callAndValidate({ ref: "HEAD~1", mode: "hard" })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: stash
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.stash", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerStashTool(server as never);
    handler = server.tools.get("stash")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStashSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] push (stash changes)", async () => {
    mockGit(loadFixture("stash", "s01-push.txt"));
    const { parsed } = await callAndValidate({ action: "push" });
    expect(parsed.success).toBe(true);
    expect(parsed.stashRef).toBe("stash@{0}");
  });

  it("S2 [recorded] pop stash", async () => {
    mockGit(loadFixture("stash", "s02-pop.txt"));
    const { parsed } = await callAndValidate({ action: "pop" });
    expect(parsed.success).toBe(true);
  });

  it("S3 [recorded] push with no changes", async () => {
    mockGit("", loadFixture("stash", "s03-no-changes.txt"), 1);
    const { parsed } = await callAndValidate({ action: "push" });
    expect(parsed.success).toBe(false);
  });

  it("S5 [recorded] apply stash", async () => {
    mockGit(loadFixture("stash", "s05-apply.txt"));
    const { parsed } = await callAndValidate({ action: "apply" });
    expect(parsed.success).toBe(true);
  });

  it("S8 [recorded] show stash", async () => {
    // show action goes through a different path
    mockGit(loadFixture("stash", "s08-show.txt"));
    const { parsed } = await callAndValidate({ action: "show", index: 0 });
    expect(parsed.diffStat).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: stash-list
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: git.stash-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git).mockReset();
    const server = new FakeServer();
    registerStashListTool(server as never);
    handler = server.tools.get("stash-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GitStashListSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] list stashes", async () => {
    mockGit(loadFixture("stash-list", "s01-list.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.stashes.length).toBeGreaterThanOrEqual(1);
    // The message should contain branch info (full mode returns objects)
    const stash = parsed.stashes[0] as Record<string, unknown>;
    expect(stash.message).toContain("main");
  });

  it("S2 [recorded] empty stash list", async () => {
    mockGit(loadFixture("stash-list", "s02-empty.txt"));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.stashes).toEqual([]);
  });
});
