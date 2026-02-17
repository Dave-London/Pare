/**
 * Smoke tests: git tools batch 1 (add, bisect, blame, branch, checkout, cherry-pick)
 * Phase 2 (mocked)
 *
 * Tests each tool end-to-end with mocked git runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitAddSchema,
  GitBisectSchema,
  GitBlameSchema,
  GitBranchSchema,
  GitCheckoutSchema,
  GitCherryPickSchema,
} from "../../../packages/server-git/src/schemas/index.js";

// Mock the git runner (NOT gh-runner)
vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerAddTool } from "../../../packages/server-git/src/tools/add.js";
import { registerBisectTool } from "../../../packages/server-git/src/tools/bisect.js";
import { registerBlameTool } from "../../../packages/server-git/src/tools/blame.js";
import { registerBranchTool } from "../../../packages/server-git/src/tools/branch.js";
import { registerCheckoutTool } from "../../../packages/server-git/src/tools/checkout.js";
import { registerCherryPickTool } from "../../../packages/server-git/src/tools/cherry-pick.js";

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

function mockGit(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(git).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// Tool: add
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.add", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // S1: Stage specific files
  it("S1 [P0] stage specific files", async () => {
    // Before-status: nothing staged
    mockGit("");
    // git add -- a.ts
    mockGit("");
    // After-status: a.ts staged as added
    mockGit("A  a.ts\n");
    const { parsed } = await callAndValidate({ files: ["a.ts"], all: false });
    expect(parsed.staged).toBeGreaterThanOrEqual(1);
    expect(parsed.files.some((f) => f.file === "a.ts")).toBe(true);
  });

  // S2: Stage all changes
  it("S2 [P0] stage all changes", async () => {
    // Before-status
    mockGit("?? new.ts\n M mod.ts\n");
    // git add -A
    mockGit("");
    // After-status: all staged
    mockGit("A  new.ts\nM  mod.ts\n");
    const { parsed } = await callAndValidate({ all: true });
    expect(parsed.staged).toBe(2);
    expect(parsed.files.length).toBe(2);
  });

  // S3: No files and no all throws error
  it("S3 [P0] no files and no all throws error", async () => {
    await expect(callAndValidate({ all: false })).rejects.toThrow(
      "Either 'files' must be provided",
    );
  });

  // S4: Flag injection in file path
  it("S4 [P0] flag injection in file path is blocked", async () => {
    // Before-status call happens before flag validation for files
    mockGit("");
    await expect(callAndValidate({ files: ["--exec=evil"], all: false })).rejects.toThrow();
  });

  // S5: Stage multiple files
  it("S5 [P0] stage multiple files", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  a.ts\nA  b.ts\n");
    const { parsed } = await callAndValidate({ files: ["a.ts", "b.ts"], all: false });
    expect(parsed.staged).toBeGreaterThanOrEqual(2);
    expect(parsed.files.some((f) => f.file === "a.ts")).toBe(true);
    expect(parsed.files.some((f) => f.file === "b.ts")).toBe(true);
  });

  // S6: Not a git repo
  it("S6 [P0] not a git repo throws error", async () => {
    // Before-status fails
    mockGit("", "fatal: not a git repository", 128);
    // git add fails
    mockGit("", "fatal: not a git repository", 128);
    await expect(
      callAndValidate({ path: "/tmp/not-a-repo", files: ["x"], all: false }),
    ).rejects.toThrow("git add failed");
  });

  // S7: Stage with update (tracked only)
  it("S7 [P1] stage with update (tracked only)", async () => {
    mockGit("");
    mockGit("");
    mockGit("M  tracked.ts\n");
    const { parsed } = await callAndValidate({ update: true, all: false });
    expect(parsed.staged).toBe(1);
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("-u");
  });

  // S8: Dry run
  it("S8 [P1] dry run passes --dry-run flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  a.ts\n");
    await callAndValidate({ files: ["a.ts"], dryRun: true, all: false });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--dry-run");
  });

  // S9: Force staging ignored file
  it("S9 [P1] force staging passes --force flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  .env\n");
    await callAndValidate({ files: [".env"], force: true, all: false });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--force");
  });

  // S10: Intent to add
  it("S10 [P1] intent to add passes --intent-to-add flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  new.ts\n");
    await callAndValidate({ files: ["new.ts"], intentToAdd: true, all: false });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--intent-to-add");
  });

  // S11: newlyStaged tracking
  it("S11 [P1] newlyStaged tracking reflects pre-staged state", async () => {
    // Before-status: a.ts already staged
    mockGit("A  a.ts\n");
    // git add
    mockGit("");
    // After-status: same
    mockGit("A  a.ts\n");
    const { parsed } = await callAndValidate({ files: ["a.ts"], all: false });
    expect(parsed.newlyStaged).toBe(0);
  });

  // S12: pathspecFromFile
  it("S12 [P2] pathspecFromFile passes --pathspec-from-file flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  x.ts\n");
    await callAndValidate({ pathspecFromFile: "filelist.txt", all: false });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args.some((a: string) => a.includes("--pathspec-from-file=filelist.txt"))).toBe(true);
  });

  // S13: chmod +x
  it("S13 [P2] chmod +x passes --chmod=+x flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  script.sh\n");
    await callAndValidate({ files: ["script.sh"], chmod: "+x", all: false });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--chmod=+x");
  });

  // S14: ignoreRemoval
  it("S14 [P2] ignoreRemoval passes --ignore-removal flag", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  new.ts\n");
    await callAndValidate({ all: true, ignoreRemoval: true });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--ignore-removal");
  });

  // S15: Schema validation (implicit in all tests above via callAndValidate)
  it("S15 [P0] schema validation on all outputs", async () => {
    mockGit("");
    mockGit("");
    mockGit("A  x.ts\nM  y.ts\nD  z.ts\n");
    const { parsed } = await callAndValidate({ all: true });
    expect(parsed.staged).toBe(3);
    expect(parsed.files[0].status).toMatch(/^(added|modified|deleted)$/);
    expect(parsed.files[1].status).toMatch(/^(added|modified|deleted)$/);
    expect(parsed.files[2].status).toMatch(/^(added|modified|deleted)$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: bisect
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.bisect", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // S1: Start bisect with bad and good
  it("S1 [P0] start bisect with bad and good", async () => {
    // git bisect start
    mockGit("");
    // git bisect bad HEAD
    mockGit("");
    // git bisect good abc123 — triggers first bisect step
    mockGit(
      "Bisecting: 5 revisions left to test after this (roughly 3 steps)\n[def4567] some commit message",
    );
    // git show --pretty=format: --name-only def4567
    mockGit("src/index.ts\n");
    const { parsed } = await callAndValidate({
      action: "start",
      bad: "HEAD",
      good: "abc123",
    });
    expect(parsed.action).toBe("start");
    expect(parsed.current).toBe("def4567");
    expect(parsed.remaining).toBe(3);
  });

  // S2: Mark commit as good
  it("S2 [P0] mark commit as good", async () => {
    // git bisect good
    mockGit(
      "Bisecting: 2 revisions left to test after this (roughly 1 steps)\n[aaa1111] next commit",
    );
    // git show for enrichFilesChanged
    mockGit("file.ts\n");
    const { parsed } = await callAndValidate({ action: "good" });
    expect(parsed.action).toBe("good");
    expect(parsed.current).toBe("aaa1111");
  });

  // S3: Mark commit as bad
  it("S3 [P0] mark commit as bad", async () => {
    mockGit(
      "Bisecting: 1 revisions left to test after this (roughly 1 steps)\n[bbb2222] bad commit",
    );
    mockGit("file.ts\n");
    const { parsed } = await callAndValidate({ action: "bad" });
    expect(parsed.action).toBe("bad");
    expect(parsed.current).toBe("bbb2222");
  });

  // S4: Reset bisect session
  it("S4 [P0] reset bisect session", async () => {
    mockGit("Previous HEAD position was abc123\nSwitched to branch 'main'");
    const { parsed } = await callAndValidate({ action: "reset" });
    expect(parsed.action).toBe("reset");
    expect(parsed.message).toBeDefined();
  });

  // S5: Start without bad/good throws
  it("S5 [P0] start without bad/good throws error", async () => {
    await expect(callAndValidate({ action: "start" })).rejects.toThrow(
      "Both 'bad' and 'good' commit refs are required",
    );
  });

  // S6: Flag injection in bad ref
  it("S6 [P0] flag injection in bad ref is blocked", async () => {
    await expect(
      callAndValidate({ action: "start", bad: "--exec=evil", good: "abc" }),
    ).rejects.toThrow();
  });

  // S7: Bisect run with command
  it("S7 [P1] bisect run with command", async () => {
    const hash = "a".repeat(40);
    mockGit(
      `running npm test\nBisecting: 0 revisions left\n${hash} is the first bad commit\ncommit ${hash}\nAuthor: Test User\nDate:   Mon Jan 1 00:00:00 2024\n\n    broke things\n`,
    );
    // git show for enrichFilesChanged
    mockGit("src/bug.ts\n");
    const { parsed } = await callAndValidate({ action: "run", command: "npm test" });
    expect(parsed.action).toBe("run");
    expect(parsed.result).toBeDefined();
    expect(parsed.result!.hash).toBe(hash);
    expect(parsed.command).toBe("npm test");
    expect(parsed.stepsRun).toBeGreaterThanOrEqual(1);
  });

  // S8: Run without command throws
  it("S8 [P1] run without command throws error", async () => {
    await expect(callAndValidate({ action: "run" })).rejects.toThrow(
      "'command' parameter is required",
    );
  });

  // S9: Bisect status
  it("S9 [P1] bisect status returns session info", async () => {
    // status action calls git bisect log
    mockGit(
      "# status: waiting for both good and bad commits\ngit bisect bad abc\ngit bisect good def\n",
    );
    const { parsed } = await callAndValidate({ action: "status" });
    expect(parsed.action).toBe("status");
    expect(parsed.message).toBeDefined();
  });

  // S10: Skip current commit
  it("S10 [P1] skip current commit", async () => {
    mockGit(
      "Bisecting: 3 revisions left to test after this (roughly 2 steps)\n[ccc3333] skipped to here",
    );
    mockGit("file.ts\n");
    const { parsed } = await callAndValidate({ action: "skip" });
    expect(parsed.action).toBe("skip");
    expect(parsed.current).toBe("ccc3333");
  });

  // S11: Replay from file
  it("S11 [P2] replay from bisect log file", async () => {
    mockGit(
      "Bisecting: 4 revisions left to test after this (roughly 2 steps)\n[ddd4444] replayed commit",
    );
    mockGit("file.ts\n");
    const { parsed } = await callAndValidate({
      action: "replay",
      replayFile: "bisect.log",
    });
    expect(parsed.action).toBe("replay");
    expect(parsed.current).toBe("ddd4444");
  });

  // S12: Paths restriction
  it("S12 [P2] paths restriction passes -- src/", async () => {
    // git bisect start -- src/
    mockGit("");
    // git bisect bad HEAD
    mockGit("");
    // git bisect good abc
    mockGit("Bisecting: 3 revisions left to test after this (roughly 2 steps)\n[eee5555] commit");
    // enrichFilesChanged
    mockGit("src/a.ts\n");
    await callAndValidate({
      action: "start",
      bad: "HEAD",
      good: "abc",
      paths: ["src/"],
    });
    const startArgs = vi.mocked(git).mock.calls[0][0];
    expect(startArgs).toContain("--");
    expect(startArgs).toContain("src/");
  });

  // S13: Custom terms
  it("S13 [P2] custom terms applied", async () => {
    mockGit("");
    mockGit("");
    mockGit("Bisecting: 2 revisions left to test after this (roughly 1 steps)\n[fff6666] commit");
    mockGit("file.ts\n");
    await callAndValidate({
      action: "start",
      bad: "HEAD",
      good: "abc",
      termOld: "fixed",
      termNew: "broken",
    });
    const startArgs = vi.mocked(git).mock.calls[0][0];
    expect(startArgs).toContain("--term-old=fixed");
    expect(startArgs).toContain("--term-new=broken");
  });

  // S14: Schema validation (implicit)
  it("S14 [P0] all outputs validate against GitBisectSchema", async () => {
    mockGit("Previous HEAD position was abc\nSwitched to branch 'main'");
    const { parsed } = await callAndValidate({ action: "reset" });
    expect(parsed.action).toBe("reset");
    expect(typeof parsed.message).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: blame
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.blame", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // 40-char hex hash for porcelain format
  const HASH = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

  const PORCELAIN_BLAME =
    `${HASH} 1 1 1\n` +
    "author Test User\n" +
    "author-mail <test@example.com>\n" +
    "author-time 1700000000\n" +
    "author-tz +0000\n" +
    "committer Test User\n" +
    "committer-mail <test@example.com>\n" +
    "committer-time 1700000000\n" +
    "committer-tz +0000\n" +
    "summary Initial commit\n" +
    "filename src/index.ts\n" +
    "\tconst x = 1;\n" +
    `${HASH} 2 2\n` +
    "filename src/index.ts\n" +
    "\tconst y = 2;\n";

  // S1: Blame entire file
  it("S1 [P0] blame entire file returns commits grouped by commit", async () => {
    mockGit(PORCELAIN_BLAME);
    const { parsed } = await callAndValidate({ file: "src/index.ts", compact: true });
    expect(parsed.file).toBe("src/index.ts");
    expect(parsed.totalLines).toBeGreaterThanOrEqual(1);
    expect(parsed.commits.length).toBeGreaterThanOrEqual(1);
  });

  // S2: File not found
  it("S2 [P0] file not found throws error", async () => {
    mockGit("", "fatal: no such path 'nonexistent.ts' in HEAD", 128);
    await expect(callAndValidate({ file: "nonexistent.ts", compact: true })).rejects.toThrow(
      "git blame failed",
    );
  });

  // S3: Flag injection in file param
  it("S3 [P0] flag injection in file param is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil", compact: true })).rejects.toThrow();
  });

  // S4: Line range blame
  it("S4 [P1] line range blame passes -L flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "src/index.ts", startLine: 1, endLine: 10, compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args.some((a: string) => a.includes("-L1,10"))).toBe(true);
  });

  // S5: Blame at specific rev
  it("S5 [P1] blame at specific rev passes rev argument", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "src/index.ts", rev: "HEAD~5", compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("HEAD~5");
  });

  // S6: Flag injection in rev
  it("S6 [P0] flag injection in rev is blocked", async () => {
    await expect(
      callAndValidate({ file: "x.ts", rev: "--exec=evil", compact: true }),
    ).rejects.toThrow();
  });

  // S7: Compact vs full output
  it("S7 [P1] compact: false returns full blame data", async () => {
    mockGit(PORCELAIN_BLAME);
    const { parsed } = await callAndValidate({ file: "x.ts", compact: false });
    expect(parsed.commits.length).toBeGreaterThanOrEqual(1);
    expect(parsed.file).toBeDefined();
  });

  // S8: Ignore whitespace
  it("S8 [P2] ignoreWhitespace passes -w flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "x.ts", ignoreWhitespace: true, compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-w");
  });

  // S9: Detect moves
  it("S9 [P2] detectMoves passes -M flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "x.ts", detectMoves: true, compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-M");
  });

  // S10: Function name blame
  it("S10 [P2] funcname passes -L:<funcname> flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "x.ts", funcname: "myFunction", compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args.some((a: string) => a.includes("-L:myFunction"))).toBe(true);
  });

  // S11: Schema validation
  it("S11 [P0] all outputs validate against GitBlameSchema", async () => {
    mockGit(PORCELAIN_BLAME);
    const { parsed } = await callAndValidate({ file: "src/index.ts", compact: true });
    expect(parsed.file).toBe("src/index.ts");
    expect(typeof parsed.totalLines).toBe("number");
    expect(Array.isArray(parsed.commits)).toBe(true);
  });

  // S12: Detect copies
  it("S12 [P2] detectCopies passes -C flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "x.ts", detectCopies: true, compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-C");
  });

  // S13: ignoreRevsFile
  it("S13 [P2] ignoreRevsFile passes --ignore-revs-file flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({
      file: "x.ts",
      ignoreRevsFile: ".git-blame-ignore-revs",
      compact: true,
    });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args.some((a: string) => a.includes("--ignore-revs-file=.git-blame-ignore-revs"))).toBe(
      true,
    );
  });

  // S14: since parameter
  it("S14 [P2] since passes --since flag", async () => {
    mockGit(PORCELAIN_BLAME);
    await callAndValidate({ file: "x.ts", since: "2024-01-01", compact: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args.some((a: string) => a.includes("--since=2024-01-01"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: branch
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.branch", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // Default params for branch (FakeServer doesn't apply Zod defaults)
  const DEFAULTS = { all: false, switchAfterCreate: false, compact: true };

  const BRANCH_LIST =
    "* main       abc1234 [origin/main] latest commit\n" +
    "  feature-x  def5678 [origin/feature-x] feature work\n";

  // S1: List branches
  it("S1 [P0] list branches returns branches array and current", async () => {
    mockGit(BRANCH_LIST);
    const { parsed } = await callAndValidate({ ...DEFAULTS });
    expect(parsed.current).toBe("main");
    expect(Array.isArray(parsed.branches)).toBe(true);
  });

  // S2: Create branch
  it("S2 [P0] create branch", async () => {
    // git branch feature-x
    mockGit("");
    // git branch -vv (listing after create)
    mockGit("* main       abc1234 latest commit\n  feature-x  def5678 new branch\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, create: "feature-x" });
    expect(parsed.current).toBe("main");
  });

  // S3: Delete branch
  it("S3 [P0] delete branch", async () => {
    // git branch -d feature-x
    mockGit("Deleted branch feature-x (was def5678).");
    // git branch -vv
    mockGit("* main       abc1234 latest commit\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, delete: "feature-x" });
    expect(parsed.current).toBe("main");
  });

  // S4: Flag injection in create
  it("S4 [P0] flag injection in create is blocked", async () => {
    await expect(callAndValidate({ ...DEFAULTS, create: "--exec=evil" })).rejects.toThrow();
  });

  // S5: Not a git repo
  it("S5 [P0] not a git repo throws error", async () => {
    // git branch -vv fails
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ ...DEFAULTS, path: "/tmp/not-a-repo" })).rejects.toThrow(
      "git branch failed",
    );
  });

  // S6: Create and switch
  it("S6 [P1] create and switch to branch", async () => {
    // git branch feat
    mockGit("");
    // git switch feat
    mockGit("Switched to branch 'feat'");
    // git branch -vv
    mockGit("  main  abc1234 latest commit\n* feat  def5678 new branch\n");
    const { parsed } = await callAndValidate({
      ...DEFAULTS,
      create: "feat",
      switchAfterCreate: true,
    });
    expect(parsed.current).toBe("feat");
  });

  // S7: Create with start point
  it("S7 [P1] create with start point", async () => {
    // git branch feat HEAD~3
    mockGit("");
    // git branch -vv
    mockGit("* main  abc1234 latest\n  feat  1112222 older commit\n");
    await callAndValidate({ ...DEFAULTS, create: "feat", startPoint: "HEAD~3" });
    const createArgs = vi.mocked(git).mock.calls[0][0];
    expect(createArgs).toContain("feat");
    expect(createArgs).toContain("HEAD~3");
  });

  // S8: Rename current branch
  it("S8 [P1] rename current branch", async () => {
    // git branch -m new-name
    mockGit("");
    // git branch -vv
    mockGit("* new-name  abc1234 latest commit\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, rename: "new-name" });
    expect(parsed.current).toBe("new-name");
  });

  // S9: List all (including remotes)
  it("S9 [P1] list all including remote branches", async () => {
    mockGit("* main                abc1234 latest\n  remotes/origin/main abc1234 latest\n");
    await callAndValidate({ ...DEFAULTS, all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-a");
  });

  // S10: Filter merged branches
  it("S10 [P1] filter merged branches", async () => {
    mockGit("* main  abc1234 latest\n");
    await callAndValidate({ ...DEFAULTS, merged: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--merged");
  });

  // S11: Set upstream
  it("S11 [P1] set upstream tracking", async () => {
    // git branch --set-upstream-to=origin/main
    mockGit("Branch 'main' set up to track 'origin/main'.");
    // git branch -vv
    mockGit("* main  abc1234 [origin/main] latest\n");
    await callAndValidate({ ...DEFAULTS, setUpstream: "origin/main" });
    const upstreamArgs = vi.mocked(git).mock.calls[0][0];
    expect(upstreamArgs.some((a: string) => a.includes("--set-upstream-to=origin/main"))).toBe(
      true,
    );
  });

  // S12: Force delete unmerged
  it("S12 [P2] force delete unmerged branch", async () => {
    // git branch -D feat
    mockGit("Deleted branch feat (was abc1234).");
    // git branch -vv
    mockGit("* main  abc1234 latest\n");
    await callAndValidate({ ...DEFAULTS, delete: "feat", forceDelete: true });
    const deleteArgs = vi.mocked(git).mock.calls[0][0];
    expect(deleteArgs).toContain("-D");
  });

  // S13: Sort by date (note: assertNoFlagInjection blocks leading "-")
  it("S13 [P2] sort by committerdate passes --sort flag", async () => {
    mockGit("* main  abc1234 latest\n");
    await callAndValidate({ ...DEFAULTS, sort: "committerdate" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--sort=committerdate");
  });

  // S14: Contains filter
  it("S14 [P2] contains filter passes --contains flag", async () => {
    mockGit("* main  abc1234 latest\n");
    await callAndValidate({ ...DEFAULTS, contains: "abc123" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--contains=abc123");
  });

  // S15: Compact vs full output
  it("S15 [P2] compact: false returns full branch data", async () => {
    mockGit(BRANCH_LIST);
    const { parsed } = await callAndValidate({ ...DEFAULTS, compact: false });
    expect(parsed.branches.length).toBeGreaterThanOrEqual(1);
  });

  // S16: Schema validation
  it("S16 [P0] all outputs validate against GitBranchSchema", async () => {
    mockGit(BRANCH_LIST);
    const { parsed } = await callAndValidate({ ...DEFAULTS });
    expect(typeof parsed.current).toBe("string");
    expect(Array.isArray(parsed.branches)).toBe(true);
  });

  // S17: Flag injection in delete
  it("S17 [P0] flag injection in delete is blocked", async () => {
    await expect(callAndValidate({ ...DEFAULTS, delete: "--exec=evil" })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: checkout
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.checkout", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // Default params for checkout (FakeServer doesn't apply Zod defaults)
  const DEFAULTS = { create: false, useSwitch: true };

  // S1: Switch to existing branch
  it("S1 [P0] switch to existing branch", async () => {
    // git rev-parse --abbrev-ref HEAD (previous)
    mockGit("feature\n");
    // git switch main
    mockGit("", "Switched to branch 'main'");
    // git rev-parse --abbrev-ref HEAD (current)
    mockGit("main\n");
    // git diff --name-only feature..main
    mockGit("src/index.ts\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "main" });
    expect(parsed.success).toBe(true);
    expect(parsed.ref).toBe("main");
    expect(parsed.previousRef).toBe("feature");
  });

  // S2: Create and switch to new branch
  it("S2 [P0] create and switch to new branch", async () => {
    mockGit("main\n");
    mockGit("", "Switched to a new branch 'feat'");
    mockGit("feat\n");
    // diff: no files differing on new branch from same point
    mockGit("");
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "feat", create: true });
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
    expect(parsed.ref).toBe("feat");
  });

  // S3: Checkout nonexistent ref — returns success: false with errorType
  it("S3 [P0] checkout nonexistent ref returns error", async () => {
    mockGit("main\n");
    mockGit("", "fatal: invalid reference: nonexistent", 1);
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "nonexistent" });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBeDefined();
  });

  // S4: Flag injection in ref
  it("S4 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ...DEFAULTS, ref: "--exec=evil" })).rejects.toThrow();
  });

  // S5: Detach HEAD at commit
  it("S5 [P1] detach HEAD at commit", async () => {
    mockGit("main\n");
    mockGit("", "HEAD is now at abc1234 some commit");
    mockGit("HEAD\n");
    // diff: HEAD vs main — different refs so diff runs
    mockGit("file.ts\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "abc1234", detach: true });
    expect(parsed.success).toBe(true);
    expect(parsed.detached).toBe(true);
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--detach");
  });

  // S6: Orphan branch creation
  it("S6 [P1] orphan branch creation", async () => {
    mockGit("main\n");
    mockGit("", "Switched to a new branch 'orphan-branch'");
    const { parsed } = await callAndValidate({
      ...DEFAULTS,
      ref: "x",
      orphan: "orphan-branch",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
    expect(parsed.ref).toBe("orphan-branch");
  });

  // S7: Force checkout
  it("S7 [P1] force checkout passes --force flag", async () => {
    mockGit("feature\n");
    mockGit("", "Switched to branch 'main'");
    mockGit("main\n");
    mockGit("src/index.ts\n");
    await callAndValidate({ ...DEFAULTS, ref: "main", force: true });
    const switchArgs = vi.mocked(git).mock.calls[1][0];
    expect(switchArgs).toContain("--force");
  });

  // S8: Create with start point
  it("S8 [P1] create with start point", async () => {
    mockGit("main\n");
    mockGit("", "Switched to a new branch 'feat'");
    mockGit("feat\n");
    mockGit("");
    await callAndValidate({
      ...DEFAULTS,
      ref: "feat",
      create: true,
      startPoint: "HEAD~3",
    });
    const switchArgs = vi.mocked(git).mock.calls[1][0];
    expect(switchArgs).toContain("HEAD~3");
  });

  // S9: Force create existing branch
  it("S9 [P1] forceCreate resets and checks out branch", async () => {
    mockGit("main\n");
    mockGit("", "Switched to branch 'existing'");
    mockGit("existing\n");
    mockGit("file.ts\n");
    await callAndValidate({ ...DEFAULTS, ref: "existing", forceCreate: true });
    const switchArgs = vi.mocked(git).mock.calls[1][0];
    // With useSwitch=true (default), forceCreate uses -C
    expect(switchArgs).toContain("-C");
  });

  // S10: modifiedFiles populated
  it("S10 [P2] modifiedFiles lists files differing between branches", async () => {
    mockGit("main\n");
    mockGit("", "Switched to branch 'other-branch'");
    mockGit("other-branch\n");
    mockGit("src/a.ts\nsrc/b.ts\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "other-branch" });
    expect(parsed.success).toBe(true);
    expect(parsed.modifiedFiles).toContain("src/a.ts");
    expect(parsed.modifiedFiles).toContain("src/b.ts");
  });

  // S11: useSwitch: false uses git checkout
  it("S11 [P2] useSwitch: false uses git checkout command", async () => {
    mockGit("feature\n");
    mockGit("", "Switched to branch 'main'");
    mockGit("main\n");
    mockGit("file.ts\n");
    await callAndValidate({ ...DEFAULTS, ref: "main", useSwitch: false });
    const checkoutArgs = vi.mocked(git).mock.calls[1][0];
    expect(checkoutArgs[0]).toBe("checkout");
  });

  // S12: Schema validation
  it("S12 [P0] all outputs validate against GitCheckoutSchema", async () => {
    mockGit("main\n");
    mockGit("", "Switched to branch 'develop'");
    mockGit("develop\n");
    mockGit("");
    const { parsed } = await callAndValidate({ ...DEFAULTS, ref: "develop" });
    expect(typeof parsed.success).toBe("boolean");
    expect(typeof parsed.ref).toBe("string");
    expect(typeof parsed.previousRef).toBe("string");
    expect(typeof parsed.created).toBe("boolean");
  });

  // S13: Flag injection in startPoint
  it("S13 [P0] flag injection in startPoint is blocked", async () => {
    await expect(
      callAndValidate({ ...DEFAULTS, ref: "feat", create: true, startPoint: "--exec=evil" }),
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool: cherry-pick
// ═══════════════════════════════════════════════════════════════════════════
describe("Smoke: git.cherry-pick", () => {
  let handler: ToolHandler;

  beforeEach(() => {
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

  // Default params (FakeServer doesn't apply Zod defaults)
  const DEFAULTS = {
    commits: [] as string[],
    abort: false,
    continue: false,
    skip: false,
    quit: false,
    noCommit: false,
  };

  // S1: Cherry-pick single commit
  it("S1 [P0] cherry-pick single commit succeeds", async () => {
    mockGit("[main abc1234] Applied commit message\n 1 file changed, 5 insertions(+)");
    const { parsed } = await callAndValidate({ ...DEFAULTS, commits: ["abc123"] });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
    expect(parsed.applied).toContain("abc123");
    expect(parsed.conflicts).toEqual([]);
  });

  // S2: Cherry-pick with conflict
  it("S2 [P0] cherry-pick with conflict returns conflicts", async () => {
    mockGit(
      "CONFLICT (content): Merge conflict in src/index.ts\n",
      "error: could not apply abc123",
      1,
    );
    const { parsed } = await callAndValidate({ ...DEFAULTS, commits: ["conflicting"] });
    expect(parsed.success).toBe(false);
    expect(parsed.state).toBe("conflict");
    expect(parsed.conflicts.length).toBeGreaterThan(0);
    expect(parsed.conflicts).toContain("src/index.ts");
  });

  // S3: No commits and no action flags
  it("S3 [P0] no commits and no action flags throws error", async () => {
    await expect(callAndValidate({ ...DEFAULTS })).rejects.toThrow("commits array is required");
  });

  // S4: Flag injection in commits
  it("S4 [P0] flag injection in commits is blocked", async () => {
    await expect(callAndValidate({ ...DEFAULTS, commits: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5: Abort cherry-pick
  it("S5 [P0] abort cherry-pick", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ ...DEFAULTS, abort: true });
    expect(parsed.success).toBe(true);
    expect(parsed.state).toBe("completed");
    expect(parsed.conflicts).toEqual([]);
  });

  // S6: Continue after conflict
  it("S6 [P1] continue after conflict resolution", async () => {
    mockGit("[main def5678] Continued cherry-pick\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, continue: true });
    expect(parsed.success).toBe(true);
  });

  // S7: Skip current commit
  it("S7 [P1] skip current commit", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ ...DEFAULTS, skip: true });
    expect(parsed.success).toBe(true);
  });

  // S8: No-commit mode
  it("S8 [P1] no-commit mode passes -n flag", async () => {
    mockGit("");
    await callAndValidate({ ...DEFAULTS, commits: ["abc"], noCommit: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-n");
  });

  // S9: Cherry-pick multiple commits
  it("S9 [P1] cherry-pick multiple commits", async () => {
    mockGit("[main abc1234] First\n[main def5678] Second\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, commits: ["abc", "def"] });
    expect(parsed.success).toBe(true);
    expect(parsed.applied).toContain("abc");
    expect(parsed.applied).toContain("def");
  });

  // S10: Cherry-pick merge commit with mainline
  it("S10 [P2] cherry-pick merge commit with mainline", async () => {
    mockGit("[main aaa1111] Merge applied\n");
    await callAndValidate({ ...DEFAULTS, commits: ["merge123"], mainline: 1 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-m");
    expect(args).toContain("1");
  });

  // S11: Strategy option
  it("S11 [P2] strategy option passes --strategy flag", async () => {
    mockGit("[main bbb2222] Applied with ort\n");
    await callAndValidate({ ...DEFAULTS, commits: ["abc"], strategy: "ort" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--strategy=ort");
  });

  // S12: Schema validation
  it("S12 [P0] all outputs validate against GitCherryPickSchema", async () => {
    mockGit("[main ccc3333] Test commit\n");
    const { parsed } = await callAndValidate({ ...DEFAULTS, commits: ["abc"] });
    expect(typeof parsed.success).toBe("boolean");
    expect(Array.isArray(parsed.applied)).toBe(true);
    expect(Array.isArray(parsed.conflicts)).toBe(true);
    expect(typeof parsed.state).toBe("string");
  });

  // S13: Quit cherry-pick
  it("S13 [P1] quit cherry-pick without reverting", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({ ...DEFAULTS, quit: true });
    expect(parsed.success).toBe(true);
  });

  // S14: appendCherryPickLine (-x)
  it("S14 [P2] appendCherryPickLine passes -x flag", async () => {
    mockGit("[main ddd4444] Applied\n");
    await callAndValidate({ ...DEFAULTS, commits: ["abc"], appendCherryPickLine: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-x");
  });

  // S15: strategyOption
  it("S15 [P2] strategyOption passes -X flag", async () => {
    mockGit("[main eee5555] Applied with theirs\n");
    await callAndValidate({ ...DEFAULTS, commits: ["abc"], strategyOption: "theirs" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-Xtheirs");
  });
});
