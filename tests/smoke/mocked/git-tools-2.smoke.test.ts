/**
 * Smoke tests: git tools Phase 2 (mocked)
 *
 * Covers: commit (16), diff (18), log (18), log-graph (14), merge (16), pull (14)
 * Total: ~96 scenarios
 *
 * Tests each tool end-to-end with mocked git runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitCommitSchema,
  GitDiffSchema,
  GitLogSchema,
  GitLogGraphSchema,
  GitMergeSchema,
  GitPullSchema,
} from "../../../packages/server-git/src/schemas/index.js";

vi.mock("../../../packages/server-git/src/lib/git-runner.js", () => ({
  git: vi.fn(),
  resolveFilePath: vi.fn(async (file: string) => file),
  resolveFilePaths: vi.fn(async (files: string[]) => files),
}));

import { git } from "../../../packages/server-git/src/lib/git-runner.js";
import { registerCommitTool } from "../../../packages/server-git/src/tools/commit.js";
import { registerDiffTool } from "../../../packages/server-git/src/tools/diff.js";
import { registerLogTool } from "../../../packages/server-git/src/tools/log.js";
import { registerLogGraphTool } from "../../../packages/server-git/src/tools/log-graph.js";
import { registerMergeTool } from "../../../packages/server-git/src/tools/merge.js";
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

function mockGit(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(git).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ════════════════════════════════════════════════════════════════════════════
// COMMIT (16 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.commit", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Basic commit with staged changes ────────────────────────────
  it("S1 [P0] basic commit with staged changes", async () => {
    mockGit("[main abc1234] feat: add feature\n 1 file changed, 2 insertions(+), 1 deletion(-)");
    const { parsed } = await callAndValidate({ message: "feat: add feature" });
    expect(parsed.hash).toBe("abc1234");
    expect(parsed.hashShort).toBe("abc1234");
    expect(parsed.message).toBe("feat: add feature");
    expect(parsed.filesChanged).toBe(1);
    expect(parsed.insertions).toBe(2);
    expect(parsed.deletions).toBe(1);
  });

  // ── S2: Commit with nothing staged ──────────────────────────────────
  it("S2 [P0] commit with nothing staged throws error", async () => {
    mockGit("", "nothing to commit, working tree clean", 1);
    await expect(callAndValidate({ message: "empty" })).rejects.toThrow("git commit failed");
  });

  // ── S3: Flag injection in message ───────────────────────────────────
  it("S3 [P0] flag injection in message is blocked", async () => {
    await expect(callAndValidate({ message: "--exec=evil" })).rejects.toThrow();
  });

  // ── S4: Allow empty commit ──────────────────────────────────────────
  it("S4 [P0] allow empty commit", async () => {
    mockGit("[main def5678] empty\n 0 files changed");
    const { parsed } = await callAndValidate({ message: "empty", allowEmpty: true });
    expect(parsed.hash).toBe("def5678");
    expect(parsed.filesChanged).toBe(0);
  });

  // ── S5: Not a git repo ─────────────────────────────────────────────
  it("S5 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ path: "/tmp/not-a-repo", message: "x" })).rejects.toThrow(
      "git commit failed",
    );
  });

  // ── S6: Amend commit ───────────────────────────────────────────────
  it("S6 [P1] amend commit passes --amend flag", async () => {
    mockGit("[main aaa1111] amended\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "amended", amend: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--amend");
  });

  // ── S7: Commit all tracked changes ─────────────────────────────────
  it("S7 [P1] commit all tracked changes passes --all flag", async () => {
    mockGit("[main bbb2222] all changes\n 3 files changed, 10 insertions(+)");
    await callAndValidate({ message: "all", all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--all");
  });

  // ── S8: With trailers ──────────────────────────────────────────────
  it("S8 [P1] commit with trailers passes --trailer flags", async () => {
    mockGit("[main ccc3333] feat\n 1 file changed, 1 insertion(+)");
    await callAndValidate({
      message: "feat",
      trailer: ["Co-authored-by: X <x@x>"],
    });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--trailer");
    expect(args).toContain("Co-authored-by: X <x@x>");
  });

  // ── S9: Signoff ────────────────────────────────────────────────────
  it("S9 [P1] signoff passes --signoff flag", async () => {
    mockGit("[main ddd4444] feat\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "feat", signoff: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--signoff");
  });

  // ── S10: Custom author ─────────────────────────────────────────────
  it("S10 [P2] custom author passes --author flag", async () => {
    mockGit("[main eee5555] feat\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "feat", author: "Test <test@test.com>" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--author=Test <test@test.com>");
  });

  // ── S11: Dry run ───────────────────────────────────────────────────
  it("S11 [P2] dry run passes --dry-run flag", async () => {
    mockGit("[main fff6666] feat\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "feat", dryRun: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--dry-run");
  });

  // ── S12: Fixup commit ──────────────────────────────────────────────
  it("S12 [P2] fixup commit passes --fixup flag", async () => {
    mockGit("[main 1112222] fixup! x\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "x", fixup: "HEAD~1" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--fixup=HEAD~1");
  });

  // ── S13: Flag injection in author ──────────────────────────────────
  it("S13 [P0] flag injection in author is blocked", async () => {
    await expect(callAndValidate({ message: "feat", author: "--exec=evil" })).rejects.toThrow();
  });

  // ── S14: Uses stdin for message ────────────────────────────────────
  it("S14 [P0] uses --file - and stdin for commit message", async () => {
    mockGit("[main aab1122] my message\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "my message" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--file");
    expect(args).toContain("-");
    // Verify stdin was passed
    const opts = vi.mocked(git).mock.calls[0][2];
    expect(opts).toHaveProperty("stdin", "my message");
  });

  // ── S15: noVerify flag ─────────────────────────────────────────────
  it("S15 [P1] noVerify passes --no-verify flag", async () => {
    mockGit("[main abc9999] feat\n 1 file changed, 1 insertion(+)");
    await callAndValidate({ message: "feat", noVerify: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-verify");
  });

  // ── S16: Schema validation on multi-file commit ────────────────────
  it("S16 [P0] schema validation on multi-file commit", async () => {
    mockGit("[main 9876543] big commit\n 5 files changed, 20 insertions(+), 10 deletions(-)");
    const { parsed } = await callAndValidate({ message: "big commit" });
    expect(parsed.filesChanged).toBe(5);
    expect(parsed.insertions).toBe(20);
    expect(parsed.deletions).toBe(10);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DIFF (18 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.diff", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Unstaged changes in working tree ────────────────────────────
  it("S1 [P0] unstaged changes in working tree", async () => {
    mockGit("5\t2\tsrc/index.ts\n3\t0\tsrc/utils.ts\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.files.length).toBe(2);
    expect(parsed.files[0].file).toBe("src/index.ts");
    expect(parsed.files[0].additions).toBe(5);
    expect(parsed.files[0].deletions).toBe(2);
  });

  // ── S2: Staged changes ─────────────────────────────────────────────
  it("S2 [P0] staged changes passes --cached flag", async () => {
    mockGit("1\t0\tnew-file.ts\n");
    await callAndValidate({ staged: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--cached");
  });

  // ── S3: No changes (clean) ─────────────────────────────────────────
  it("S3 [P0] no changes returns empty files and totalFiles 0", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({});
    expect(parsed.files).toEqual([]);
  });

  // ── S4: Flag injection in ref ──────────────────────────────────────
  it("S4 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ref: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: Flag injection in file ─────────────────────────────────────
  it("S5 [P0] flag injection in file is blocked", async () => {
    await expect(callAndValidate({ file: "--exec=evil" })).rejects.toThrow();
  });

  // ── S6: Not a git repo ─────────────────────────────────────────────
  it("S6 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow("git diff failed");
  });

  // ── S7: Diff against ref ───────────────────────────────────────────
  it("S7 [P1] diff against ref passes ref argument", async () => {
    mockGit("2\t1\tsrc/index.ts\n");
    await callAndValidate({ ref: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("main");
  });

  // ── S8: Single file diff ───────────────────────────────────────────
  it("S8 [P1] single file diff passes file after --", async () => {
    mockGit("1\t1\tsrc/index.ts\n");
    await callAndValidate({ file: "src/index.ts" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--");
    expect(args).toContain("src/index.ts");
  });

  // ── S9: Multiple file diff ─────────────────────────────────────────
  it("S9 [P1] multiple files diff passes all files after --", async () => {
    mockGit("1\t0\ta.ts\n2\t0\tb.ts\n");
    await callAndValidate({ files: ["a.ts", "b.ts"] });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--");
    expect(args).toContain("a.ts");
    expect(args).toContain("b.ts");
  });

  // ── S10: Full patch mode ───────────────────────────────────────────
  it("S10 [P1] full patch mode makes second git call for patch", async () => {
    mockGit("1\t1\tsrc/index.ts\n"); // numstat call
    mockGit("diff --git a/src/index.ts b/src/index.ts\n@@ -1,3 +1,3 @@\n-old\n+new\n"); // patch call
    const { parsed } = await callAndValidate({ full: true });
    expect(parsed.files.length).toBe(1);
    // Two git calls: numstat + patch
    expect(vi.mocked(git).mock.calls.length).toBe(2);
  });

  // ── S11: Atomic full mode ──────────────────────────────────────────
  it("S11 [P1] atomic full mode uses single git call with --patch", async () => {
    mockGit(
      "1\t1\tsrc/index.ts\ndiff --git a/src/index.ts b/src/index.ts\n@@ -1,3 +1,3 @@\n-old\n+new\n",
    );
    await callAndValidate({ full: true, atomicFull: true });
    // Only one git call for atomic mode
    expect(vi.mocked(git).mock.calls.length).toBe(1);
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--patch");
  });

  // ── S12: Ignore whitespace ─────────────────────────────────────────
  it("S12 [P1] ignore whitespace passes -w flag", async () => {
    mockGit("");
    await callAndValidate({ ignoreWhitespace: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-w");
  });

  // ── S13: Diff filter (added only) ──────────────────────────────────
  it("S13 [P1] diff filter passes --diff-filter flag", async () => {
    mockGit("5\t0\tnew-file.ts\n");
    await callAndValidate({ ref: "main", diffFilter: "A" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--diff-filter=A");
  });

  // ── S14: Binary file handling ──────────────────────────────────────
  it("S14 [P1] binary file shows additions 0 and deletions 0 with binary flag", async () => {
    // With compact: false, the full output is returned including binary field.
    // parseDiffStat sets binary: true when numstat shows "-\t-\t".
    mockGit("-\t-\timage.png\n");
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.files[0].file).toBe("image.png");
    expect(parsed.files[0].additions).toBe(0);
    expect(parsed.files[0].deletions).toBe(0);
    expect(parsed.files[0].binary).toBe(true);
  });

  // ── S15: Context lines ─────────────────────────────────────────────
  it("S15 [P2] context lines passes -U flag", async () => {
    mockGit("");
    await callAndValidate({ full: true, contextLines: 0 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-U0");
  });

  // ── S16: Rename detection threshold ────────────────────────────────
  it("S16 [P2] rename detection passes -M flag", async () => {
    mockGit("");
    await callAndValidate({ findRenames: 50 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-M50%");
  });

  // ── S17: Algorithm selection ───────────────────────────────────────
  it("S17 [P2] algorithm selection passes --diff-algorithm flag", async () => {
    mockGit("");
    await callAndValidate({ algorithm: "histogram" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--diff-algorithm=histogram");
  });

  // ── S18: Flag injection in files array ─────────────────────────────
  it("S18 [P0] flag injection in files array is blocked", async () => {
    await expect(callAndValidate({ files: ["--exec=evil"] })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LOG (18 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.log", () => {
  let handler: ToolHandler;

  // NUL-delimited log format matching what the tool produces
  const NUL = "\x00";
  const SOH = "\x01";

  function makeLogEntry(
    hash: string,
    hashShort: string,
    author: string,
    date: string,
    refs: string,
    subject: string,
    body = "",
  ) {
    return `${hash}${NUL}${hashShort}${NUL}${author}${NUL}${date}${NUL}${refs}${NUL}${subject}${NUL}${body}${SOH}`;
  }

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Default log (10 commits) ───────────────────────────────────
  it("S1 [P0] default log returns commits with total", async () => {
    const entries = [
      makeLogEntry(
        "aaa111",
        "aaa111",
        "Alice <a@a.com>",
        "2 hours ago",
        "HEAD -> main",
        "feat: first",
      ),
      makeLogEntry("bbb222", "bbb222", "Bob <b@b.com>", "3 hours ago", "", "fix: second"),
    ];
    mockGit(entries.join("\n"));
    const { parsed } = await callAndValidate({});
    expect(parsed.commits.length).toBe(2);
    expect(parsed.commits[0].hashShort).toBe("aaa111");
    expect(parsed.commits[0].message).toBe("feat: first");
  });

  // ── S2: Custom maxCount ────────────────────────────────────────────
  it("S2 [P0] custom maxCount passes --max-count flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ maxCount: 3 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--max-count=3");
  });

  // ── S3: Empty repo or no commits ───────────────────────────────────
  it("S3 [P0] empty repo returns empty commits and total 0", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({});
    expect(parsed.commits).toEqual([]);
  });

  // ── S4: Flag injection in ref ──────────────────────────────────────
  it("S4 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ref: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: Flag injection in author ───────────────────────────────────
  it("S5 [P0] flag injection in author is blocked", async () => {
    await expect(callAndValidate({ author: "--exec=evil" })).rejects.toThrow();
  });

  // ── S6: Not a git repo ─────────────────────────────────────────────
  it("S6 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow("git log failed");
  });

  // ── S7: Filter by author ───────────────────────────────────────────
  it("S7 [P1] filter by author passes --author flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "dave", "1h", "", "msg"));
    await callAndValidate({ author: "dave" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--author=dave");
  });

  // ── S8: Filter by ref ──────────────────────────────────────────────
  it("S8 [P1] filter by ref passes ref argument", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ ref: "main" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("main");
  });

  // ── S9: Since/until date range ─────────────────────────────────────
  it("S9 [P1] since/until passes date flags", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ since: "2024-01-01", until: "2024-12-31" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--since=2024-01-01");
    expect(args).toContain("--until=2024-12-31");
  });

  // ── S10: Grep message pattern ──────────────────────────────────────
  it("S10 [P1] grep pattern passes --grep flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "fix: bug"));
    await callAndValidate({ grep: "fix:" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--grep=fix:");
  });

  // ── S11: File path filter ──────────────────────────────────────────
  it("S11 [P1] filePath passes -- <path> argument", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ filePath: "src/index.ts" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--");
    expect(args).toContain("src/index.ts");
  });

  // ── S12: No merges ─────────────────────────────────────────────────
  it("S12 [P1] noMerges passes --no-merges flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ noMerges: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-merges");
  });

  // ── S13: Skip for pagination ───────────────────────────────────────
  it("S13 [P1] skip passes --skip flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ skip: 5, maxCount: 5 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--skip=5");
    expect(args).toContain("--max-count=5");
  });

  // ── S14: First parent only ─────────────────────────────────────────
  it("S14 [P2] firstParent passes --first-parent flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ firstParent: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--first-parent");
  });

  // ── S15: All refs ──────────────────────────────────────────────────
  it("S15 [P2] all passes --all flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--all");
  });

  // ── S16: Custom date format ────────────────────────────────────────
  it("S16 [P2] dateFormat passes --date flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "2024-01-01", "", "msg"));
    await callAndValidate({ dateFormat: "iso" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--date=iso");
  });

  // ── S17: Pickaxe search ────────────────────────────────────────────
  it("S17 [P2] pickaxe passes -S flag", async () => {
    mockGit(makeLogEntry("abc", "abc", "A", "1h", "", "msg"));
    await callAndValidate({ pickaxe: "function" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("-Sfunction");
  });

  // ── S18: Flag injection in grep ────────────────────────────────────
  it("S18 [P0] flag injection in grep is blocked", async () => {
    await expect(callAndValidate({ grep: "--exec=evil" })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LOG-GRAPH (14 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.log-graph", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Default graph ──────────────────────────────────────────────
  it("S1 [P0] default graph returns commits with graph, hashShort, message", async () => {
    mockGit("* abc1234 (HEAD -> main) initial commit\n* def5678 second commit\n");
    const { parsed } = await callAndValidate({});
    expect(parsed.commits.length).toBeGreaterThanOrEqual(2);
  });

  // ── S2: Empty repo ─────────────────────────────────────────────────
  it("S2 [P0] empty repo returns empty commits and total 0", async () => {
    mockGit("");
    const { parsed } = await callAndValidate({});
    expect(parsed.commits).toEqual([]);
  });

  // ── S3: Flag injection in ref ──────────────────────────────────────
  it("S3 [P0] flag injection in ref is blocked", async () => {
    await expect(callAndValidate({ ref: "--exec=evil" })).rejects.toThrow();
  });

  // ── S4: Not a git repo ─────────────────────────────────────────────
  it("S4 [P0] not a git repo throws error", async () => {
    mockGit("", "fatal: not a git repository", 128);
    await expect(callAndValidate({ path: "/tmp/not-a-repo" })).rejects.toThrow(
      "git log --graph failed",
    );
  });

  // ── S5: All branches ──────────────────────────────────────────────
  it("S5 [P1] all passes --all flag", async () => {
    mockGit("* abc1234 (HEAD -> main) msg\n");
    await callAndValidate({ all: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--all");
  });

  // ── S6: Merge commit detection ─────────────────────────────────────
  it("S6 [P1] merge commit detection with multiple parents", async () => {
    // log-graph uses --pretty=format:%h %p %d %s
    // A merge commit has 2 parent hashes after the short hash
    mockGit(
      "*   abc1234 def5678 aaa1111 (HEAD -> main) Merge branch 'feature'\n| * bbb2222 ccc3333 feature commit\n",
    );
    const { parsed } = await callAndValidate({ compact: false });
    // The first commit should be detected as a merge (2 parents)
    const mergeCommit = parsed.commits.find((c) => "isMerge" in c && c.isMerge);
    expect(mergeCommit).toBeDefined();
  });

  // ── S7: Since filter ───────────────────────────────────────────────
  it("S7 [P1] since passes --since flag", async () => {
    mockGit("* abc1234 msg\n");
    await callAndValidate({ since: "2024-01-01" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--since=2024-01-01");
  });

  // ── S8: First parent only ──────────────────────────────────────────
  it("S8 [P2] firstParent passes --first-parent flag", async () => {
    mockGit("* abc1234 msg\n");
    await callAndValidate({ firstParent: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--first-parent");
  });

  // ── S9: Simplify by decoration ─────────────────────────────────────
  it("S9 [P2] simplifyByDecoration passes --simplify-by-decoration flag", async () => {
    mockGit("* abc1234 (tag: v1.0) msg\n");
    await callAndValidate({ simplifyByDecoration: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--simplify-by-decoration");
  });

  // ── S10: Compact vs full output ────────────────────────────────────
  it("S10 [P2] compact false returns full entries", async () => {
    mockGit("* abc1234 def5678 (HEAD -> main) initial commit\n");
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.commits.length).toBeGreaterThan(0);
  });

  // ── S11: Schema validation ─────────────────────────────────────────
  it("S11 [P0] output validates against GitLogGraphSchema", async () => {
    mockGit("* abc1234 (HEAD -> main) initial commit\n| * def5678 feature branch\n");
    const { parsed } = await callAndValidate({});
    // Schema validation already done in callAndValidate
    expect(parsed.commits.length).toBeGreaterThanOrEqual(1);
  });

  // ── S12: Flag injection in author ──────────────────────────────────
  it("S12 [P0] flag injection in author is blocked", async () => {
    await expect(callAndValidate({ author: "--exec=evil" })).rejects.toThrow();
  });

  // ── S13: noMerges flag ─────────────────────────────────────────────
  it("S13 [P1] noMerges passes --no-merges flag", async () => {
    mockGit("* abc1234 msg\n");
    await callAndValidate({ noMerges: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--no-merges");
  });

  // ── S14: Default maxCount is 20 ────────────────────────────────────
  it("S14 [P0] default maxCount is 20", async () => {
    mockGit("* abc1234 msg\n");
    await callAndValidate({});
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--max-count=20");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MERGE (16 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.merge", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Fast-forward merge ─────────────────────────────────────────
  it("S1 [P0] fast-forward merge", async () => {
    // First call: merge-base
    mockGit("abc123def456", "", 0);
    // Second call: merge
    mockGit(
      "Updating abc1234..def5678\nFast-forward\n src/index.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)\n",
    );
    const { parsed } = await callAndValidate({ branch: "feature" });
    expect(parsed.merged).toBe(true);
    expect(parsed.state).toBe("fast-forward");
    expect(parsed.fastForward).toBe(true);
    expect(parsed.branch).toBe("feature");
  });

  // ── S2: Merge with conflict ────────────────────────────────────────
  it("S2 [P0] merge with conflict", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit(
      "Auto-merging src/index.ts\nCONFLICT (content): Merge conflict in src/index.ts\nAutomatic merge failed; fix conflicts and then commit the result.",
      "",
      1,
    );
    const { parsed } = await callAndValidate({ branch: "conflicting" });
    expect(parsed.merged).toBe(false);
    expect(parsed.state).toBe("conflict");
    expect(parsed.conflicts).toContain("src/index.ts");
  });

  // ── S3: Already up to date ─────────────────────────────────────────
  it("S3 [P0] already up to date", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Already up to date.\n");
    const { parsed } = await callAndValidate({ branch: "main" });
    expect(parsed.state).toBe("already-up-to-date");
    expect(parsed.merged).toBe(true);
  });

  // ── S4: Flag injection in branch ───────────────────────────────────
  it("S4 [P0] flag injection in branch is blocked", async () => {
    await expect(callAndValidate({ branch: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: Abort merge ────────────────────────────────────────────────
  it("S5 [P0] abort merge passes --abort", async () => {
    mockGit(""); // merge --abort
    const { parsed } = await callAndValidate({ branch: "x", abort: true });
    expect(parsed.merged).toBe(false);
    expect(parsed.conflicts).toEqual([]);
    // Verify the --abort arg
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--abort");
  });

  // ── S6: No-ff merge ────────────────────────────────────────────────
  it("S6 [P1] no-ff merge passes --no-ff flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Merge made by the 'ort' strategy.\n 1 file changed, 1 insertion(+)\n");
    await callAndValidate({ branch: "feature", noFf: true });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--no-ff");
  });

  // ── S7: Squash merge ──────────────────────────────────────────────
  it("S7 [P1] squash merge passes --squash flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Squash commit -- not updating HEAD\n");
    await callAndValidate({ branch: "feature", squash: true });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--squash");
  });

  // ── S8: ff-only with non-ff branch ────────────────────────────────
  it("S8 [P1] ff-only with non-ff branch throws error", async () => {
    mockGit("abc123", "", 0); // merge-base
    // The stderr "Not possible to fast-forward" contains "fast-forward" which
    // causes parseMerge to set merged: true (exclusion pattern matches).
    // Combined with exitCode !== 0, this triggers the error throw.
    mockGit("", "fatal: Not possible to fast-forward, aborting.", 128);
    await expect(callAndValidate({ branch: "diverged", ffOnly: true })).rejects.toThrow(
      "git merge failed",
    );
  });

  // ── S9: Custom merge message ───────────────────────────────────────
  it("S9 [P1] custom merge message passes -m flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Merge made by the 'ort' strategy.\n");
    await callAndValidate({ branch: "feat", message: "Merge feat" });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("-m");
    expect(args).toContain("Merge feat");
  });

  // ── S10: Continue after conflict ───────────────────────────────────
  it("S10 [P1] continue after conflict passes --continue", async () => {
    mockGit("[main abc1234] Merge branch 'feature'\n");
    const { parsed } = await callAndValidate({ branch: "feature", continue: true });
    // Verify --continue arg
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--continue");
    expect(parsed.branch).toBe("feature");
  });

  // ── S11: Allow unrelated histories ─────────────────────────────────
  it("S11 [P2] allow unrelated histories passes flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Merge made by the 'ort' strategy.\n");
    await callAndValidate({ branch: "orphan", allowUnrelatedHistories: true });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--allow-unrelated-histories");
  });

  // ── S12: Strategy option ───────────────────────────────────────────
  it("S12 [P2] strategy option passes --strategy flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Merge made by the 'ort' strategy.\n");
    await callAndValidate({ branch: "feat", strategy: "ort" });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--strategy=ort");
  });

  // ── S13: No-commit merge ───────────────────────────────────────────
  it("S13 [P2] no-commit merge passes --no-commit flag", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Automatic merge went well; stopped before committing as requested\n");
    await callAndValidate({ branch: "feat", noCommit: true });
    const args = vi.mocked(git).mock.calls[1][0];
    expect(args).toContain("--no-commit");
  });

  // ── S14: Schema validation ─────────────────────────────────────────
  it("S14 [P0] schema validation on completed merge", async () => {
    mockGit("abc123", "", 0); // merge-base
    mockGit("Updating abc1234..def5678\nFast-forward\n 2 files changed\n");
    const { parsed } = await callAndValidate({ branch: "feature" });
    // Schema validation already done in callAndValidate
    expect(parsed.branch).toBe("feature");
    expect(parsed.conflicts).toEqual([]);
  });

  // ── S15: Quit merge ────────────────────────────────────────────────
  it("S15 [P1] quit merge passes --quit", async () => {
    mockGit("");
    await callAndValidate({ branch: "x", quit: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--quit");
  });

  // ── S16: Flag injection in message ─────────────────────────────────
  it("S16 [P0] flag injection in merge message is blocked", async () => {
    await expect(callAndValidate({ branch: "feat", message: "--exec=evil" })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PULL (14 scenarios)
// ════════════════════════════════════════════════════════════════════════════
describe("Smoke: git.pull", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Pull with changes available ────────────────────────────────
  it("S1 [P0] pull with changes available", async () => {
    mockGit(
      "Updating abc1234..def5678\nFast-forward\n src/index.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)\n",
    );
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(1);
    expect(parsed.insertions).toBe(1);
    expect(parsed.deletions).toBe(1);
    expect(parsed.fastForward).toBe(true);
  });

  // ── S2: Already up to date ─────────────────────────────────────────
  it("S2 [P0] already up to date", async () => {
    mockGit("Already up to date.\n");
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.upToDate).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  // ── S3: Pull with conflict ─────────────────────────────────────────
  it("S3 [P0] pull with conflict", async () => {
    mockGit(
      "Auto-merging src/index.ts\nCONFLICT (content): Merge conflict in src/index.ts\nAutomatic merge failed; fix conflicts and then commit the result.",
      "CONFLICT (content): Merge conflict in src/index.ts",
      1,
    );
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(false);
    expect(parsed.conflicts.length).toBeGreaterThan(0);
    expect(parsed.conflicts).toContain("src/index.ts");
  });

  // ── S4: Flag injection in remote ───────────────────────────────────
  it("S4 [P0] flag injection in remote is blocked", async () => {
    await expect(callAndValidate({ remote: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: No remote configured ──────────────────────────────────────
  it("S5 [P0] no remote configured throws error", async () => {
    mockGit("", "fatal: No remote repository specified.", 128);
    await expect(callAndValidate({ remote: "origin" })).rejects.toThrow("git pull failed");
  });

  // ── S6: Pull with rebase ──────────────────────────────────────────
  it("S6 [P1] pull with rebase passes --rebase flag", async () => {
    mockGit("Successfully rebased and updated refs/heads/main.\n");
    await callAndValidate({ remote: "origin", rebase: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--rebase");
  });

  // ── S7: Fast-forward only ─────────────────────────────────────────
  it("S7 [P1] ffOnly passes --ff-only flag", async () => {
    mockGit("Already up to date.\n");
    await callAndValidate({ remote: "origin", ffOnly: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--ff-only");
  });

  // ── S8: Specific branch ───────────────────────────────────────────
  it("S8 [P1] specific branch passes branch argument", async () => {
    mockGit("Already up to date.\n");
    await callAndValidate({ remote: "origin", branch: "develop" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("develop");
  });

  // ── S9: Autostash ─────────────────────────────────────────────────
  it("S9 [P1] autostash passes --autostash flag", async () => {
    mockGit("Already up to date.\n");
    await callAndValidate({ remote: "origin", autostash: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--autostash");
  });

  // ── S10: Shallow depth ─────────────────────────────────────────────
  it("S10 [P2] shallow depth passes --depth flag", async () => {
    mockGit("Already up to date.\n");
    await callAndValidate({ remote: "origin", depth: 1 });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--depth=1");
  });

  // ── S11: Squash pull ──────────────────────────────────────────────
  it("S11 [P2] squash passes --squash flag", async () => {
    mockGit("Squash commit -- not updating HEAD\n");
    await callAndValidate({ remote: "origin", squash: true });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args).toContain("--squash");
  });

  // ── S12: Schema validation ─────────────────────────────────────────
  it("S12 [P0] schema validation on successful pull", async () => {
    mockGit(
      "Updating abc1234..def5678\nFast-forward\n 3 files changed, 20 insertions(+), 5 deletions(-)\n",
    );
    const { parsed } = await callAndValidate({ remote: "origin" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(3);
    expect(parsed.insertions).toBe(20);
    expect(parsed.deletions).toBe(5);
  });

  // ── S13: Flag injection in branch ──────────────────────────────────
  it("S13 [P0] flag injection in branch is blocked", async () => {
    await expect(callAndValidate({ remote: "origin", branch: "--exec=evil" })).rejects.toThrow();
  });

  // ── S14: Default remote is origin with --no-rebase ────────────────
  it("S14 [P0] default args construct correct command", async () => {
    mockGit("Already up to date.\n");
    await callAndValidate({ remote: "origin" });
    const args = vi.mocked(git).mock.calls[0][0];
    expect(args[0]).toBe("pull");
    expect(args).toContain("--no-rebase");
    expect(args).toContain("origin");
  });
});
