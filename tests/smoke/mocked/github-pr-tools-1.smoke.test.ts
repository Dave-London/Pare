/**
 * Smoke tests: github pr-comment, pr-create, pr-diff, pr-list — Phase 2 (mocked)
 *
 * Tests 4 PR tools end-to-end with mocked gh runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 *
 * 76 scenarios total:
 *   pr-comment: 13
 *   pr-create:  25
 *   pr-diff:    17
 *   pr-list:    21
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CommentResultSchema,
  PrCreateResultSchema,
  PrDiffResultSchema,
  PrListResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerPrCommentTool } from "../../../packages/server-github/src/tools/pr-comment.js";
import { registerPrCreateTool } from "../../../packages/server-github/src/tools/pr-create.js";
import { registerPrDiffTool } from "../../../packages/server-github/src/tools/pr-diff.js";
import { registerPrListTool } from "../../../packages/server-github/src/tools/pr-list.js";

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

function mockGh(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 9: pr-comment (13 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Smoke: github.pr-comment", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrCommentTool(server as never);
    handler = server.tools.get("pr-comment")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CommentResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Create comment happy path ─────────────────────────────────
  it("S1 [P0] create comment happy path", async () => {
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-456789");
    const { parsed } = await callAndValidate({ number: "123", body: "LGTM" });
    expect(parsed.operation).toBe("create");
    expect(parsed.url).toContain("https://github.com/");
    expect(parsed.commentId).toBe("456789");
  });

  // ── S2: PR not found ──────────────────────────────────────────────
  it("S2 [P0] PR not found returns error type", async () => {
    mockGh("", "Could not resolve to a PullRequest with the number of 999999", 1);
    const { parsed } = await callAndValidate({ number: "999999", body: "test" });
    expect(parsed.errorType).toBe("not-found");
    expect(parsed.errorMessage).toBeDefined();
  });

  // ── S3: Flag injection on body ────────────────────────────────────
  it("S3 [P0] flag injection on body is blocked", async () => {
    await expect(callAndValidate({ number: "123", body: "--exec=evil" })).rejects.toThrow();
  });

  // ── S4: Flag injection on number ──────────────────────────────────
  it("S4 [P0] flag injection on number is blocked", async () => {
    await expect(callAndValidate({ number: "--exec=evil", body: "test" })).rejects.toThrow();
  });

  // ── S5: Flag injection on repo ────────────────────────────────────
  it("S5 [P0] flag injection on repo is blocked", async () => {
    await expect(
      callAndValidate({ number: "123", body: "test", repo: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S6: Shell escaping in body (#530 pattern) ─────────────────────
  it("S6 [P0] shell escaping in body — body delivered via stdin", async () => {
    const shellBody = "Run `npm test | grep fail` and $(echo hi)";
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-100");
    await callAndValidate({ number: "123", body: shellBody });
    const callOpts = vi.mocked(ghCmd).mock.calls[0][1];
    expect(callOpts).toHaveProperty("stdin", shellBody);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
  });

  // ── S7: Body with backticks and pipes ─────────────────────────────
  it("S7 [P0] body with backticks and pipes preserved intact", async () => {
    const body = "```\ncode | filter\n```";
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-200");
    const { parsed } = await callAndValidate({ number: "123", body });
    expect(parsed.operation).toBe("create");
  });

  // ── S8: Edit last comment ─────────────────────────────────────────
  it("S8 [P1] edit last comment passes --edit-last flag", async () => {
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-300");
    const { parsed } = await callAndValidate({
      number: "123",
      body: "Updated",
      editLast: true,
    });
    expect(parsed.operation).toBe("edit");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--edit-last");
  });

  // ── S9: Delete last comment ───────────────────────────────────────
  it("S9 [P1] delete last comment passes --delete-last flag", async () => {
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-400");
    const { parsed } = await callAndValidate({
      number: "123",
      body: "",
      deleteLast: true,
    });
    expect(parsed.operation).toBe("delete");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--delete-last");
  });

  // ── S10: Edit with createIfNone ───────────────────────────────────
  it("S10 [P1] editLast with createIfNone passes --create-if-none flag", async () => {
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-500");
    await callAndValidate({
      number: "123",
      body: "New",
      editLast: true,
      createIfNone: true,
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--edit-last");
    expect(args).toContain("--create-if-none");
  });

  // ── S11: Cross-repo comment ───────────────────────────────────────
  it("S11 [P1] cross-repo comment passes --repo flag", async () => {
    mockGh("https://github.com/owner/repo/pull/123#issuecomment-600");
    await callAndValidate({ number: "123", body: "test", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // ── S12: Permission denied ────────────────────────────────────────
  it("S12 [P1] permission denied returns error type", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "123", body: "test" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // ── S13: PR number as branch name ─────────────────────────────────
  it("S13 [P2] PR number as branch name passes to gh CLI", async () => {
    mockGh("https://github.com/owner/repo/pull/42#issuecomment-700");
    await callAndValidate({ number: "feature-branch", body: "test" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("feature-branch");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 10: pr-create (25 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Smoke: github.pr-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrCreateTool(server as never);
    handler = server.tools.get("pr-create")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrCreateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Create PR happy path ──────────────────────────────────────
  it("S1 [P0] create PR happy path", async () => {
    mockGh("https://github.com/owner/repo/pull/42\n");
    const { parsed } = await callAndValidate({ title: "Fix bug", body: "Fixes #123" });
    expect(parsed.number).toBe(42);
    expect(parsed.url).toContain("/pull/42");
  });

  // ── S2: Create draft PR ───────────────────────────────────────────
  it("S2 [P0] create draft PR", async () => {
    mockGh("https://github.com/owner/repo/pull/43\n");
    const { parsed } = await callAndValidate({
      title: "WIP",
      body: "In progress",
      draft: true,
    });
    expect(parsed.draft).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--draft");
  });

  // ── S3: No commits between base/head ──────────────────────────────
  it("S3 [P0] no commits returns error type", async () => {
    mockGh("", "No commits between main and feature\n", 1);
    const { parsed } = await callAndValidate({ title: "t", body: "b" });
    expect(parsed.errorType).toBe("no-commits");
    expect(parsed.number).toBe(0);
  });

  // ── S4: Base branch missing ───────────────────────────────────────
  it("S4 [P0] base branch missing returns error type", async () => {
    mockGh("", "base branch 'nonexistent' does not exist\n", 1);
    const { parsed } = await callAndValidate({ title: "t", body: "b", base: "nonexistent" });
    expect(parsed.errorType).toBe("base-branch-missing");
  });

  // ── S5: Flag injection on title ───────────────────────────────────
  it("S5 [P0] flag injection on title is blocked", async () => {
    await expect(callAndValidate({ title: "--exec=evil", body: "b" })).rejects.toThrow();
  });

  // ── S6: Flag injection on base ────────────────────────────────────
  it("S6 [P0] flag injection on base is blocked", async () => {
    await expect(callAndValidate({ title: "t", body: "b", base: "--exec=evil" })).rejects.toThrow();
  });

  // ── S7: Flag injection on head ────────────────────────────────────
  it("S7 [P0] flag injection on head is blocked", async () => {
    await expect(callAndValidate({ title: "t", body: "b", head: "--exec=evil" })).rejects.toThrow();
  });

  // ── S8: Flag injection on milestone ───────────────────────────────
  it("S8 [P0] flag injection on milestone is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", milestone: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S9: Flag injection on project ─────────────────────────────────
  it("S9 [P0] flag injection on project is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", project: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S10: Flag injection on repo ───────────────────────────────────
  it("S10 [P0] flag injection on repo is blocked", async () => {
    await expect(callAndValidate({ title: "t", body: "b", repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── S11: Flag injection on template ───────────────────────────────
  it("S11 [P0] flag injection on template is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", template: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S12: Flag injection on reviewer entry ─────────────────────────
  it("S12 [P0] flag injection on reviewer entry is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", reviewer: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S13: Flag injection on label entry ────────────────────────────
  it("S13 [P0] flag injection on label entry is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", label: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S14: Flag injection on assignee entry ─────────────────────────
  it("S14 [P0] flag injection on assignee entry is blocked", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", assignee: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S15: Shell escaping in body (#530 pattern) ────────────────────
  it("S15 [P0] shell escaping in body — body delivered via stdin", async () => {
    const shellBody = "Use `cmd | grep` and $(var)";
    mockGh("https://github.com/owner/repo/pull/44\n");
    await callAndValidate({ title: "t", body: shellBody });
    const callOpts = vi.mocked(ghCmd).mock.calls[0][1];
    expect(callOpts).toHaveProperty("stdin", shellBody);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
  });

  // ── S16: Permission denied ────────────────────────────────────────
  it("S16 [P0] permission denied returns error type", async () => {
    mockGh("", "HTTP 403: Forbidden\n", 1);
    const { parsed } = await callAndValidate({ title: "t", body: "b" });
    expect(parsed.errorType).toBe("permission-denied");
    expect(parsed.number).toBe(0);
  });

  // ── S17: Create with reviewers ────────────────────────────────────
  it("S17 [P1] create with reviewers passes --reviewer flags", async () => {
    mockGh("https://github.com/owner/repo/pull/45\n");
    await callAndValidate({ title: "t", body: "b", reviewer: ["user1", "org/team"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    const reviewerIndices = args.reduce<number[]>((acc, val, i) => {
      if (val === "--reviewer") acc.push(i);
      return acc;
    }, []);
    expect(reviewerIndices.length).toBe(2);
    expect(args[reviewerIndices[0] + 1]).toBe("user1");
    expect(args[reviewerIndices[1] + 1]).toBe("org/team");
  });

  // ── S18: Create with labels ───────────────────────────────────────
  it("S18 [P1] create with labels passes --label flags", async () => {
    mockGh("https://github.com/owner/repo/pull/46\n");
    await callAndValidate({ title: "t", body: "b", label: ["bug", "p0"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    const labelIndices = args.reduce<number[]>((acc, val, i) => {
      if (val === "--label") acc.push(i);
      return acc;
    }, []);
    expect(labelIndices.length).toBe(2);
    expect(args[labelIndices[0] + 1]).toBe("bug");
    expect(args[labelIndices[1] + 1]).toBe("p0");
  });

  // ── S19: Create with assignees ────────────────────────────────────
  it("S19 [P1] create with assignees passes --assignee flag", async () => {
    mockGh("https://github.com/owner/repo/pull/47\n");
    await callAndValidate({ title: "t", body: "b", assignee: ["user1"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--assignee");
    expect(args).toContain("user1");
  });

  // ── S20: Fill from commits ────────────────────────────────────────
  it("S20 [P1] fill from commits passes --fill flag", async () => {
    mockGh("https://github.com/owner/repo/pull/48\n");
    await callAndValidate({ title: "t", body: "b", fill: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--fill");
  });

  // ── S21: Fill first commit ────────────────────────────────────────
  it("S21 [P1] fill first commit passes --fill-first flag", async () => {
    mockGh("https://github.com/owner/repo/pull/49\n");
    await callAndValidate({ title: "t", body: "b", fillFirst: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--fill-first");
  });

  // ── S22: Dry run ──────────────────────────────────────────────────
  it("S22 [P1] dry run passes --dry-run flag", async () => {
    mockGh("https://github.com/owner/repo/pull/50\n");
    await callAndValidate({ title: "t", body: "b", dryRun: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--dry-run");
  });

  // ── S23: Cross-repo create ────────────────────────────────────────
  it("S23 [P1] cross-repo create passes --repo flag", async () => {
    mockGh("https://github.com/owner/repo/pull/51\n");
    await callAndValidate({ title: "t", body: "b", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // ── S24: No maintainer edit ───────────────────────────────────────
  it("S24 [P2] no maintainer edit passes --no-maintainer-edit flag", async () => {
    mockGh("https://github.com/owner/repo/pull/52\n");
    await callAndValidate({ title: "t", body: "b", noMaintainerEdit: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--no-maintainer-edit");
  });

  // ── S25: Template usage ───────────────────────────────────────────
  it("S25 [P2] template passes --template flag", async () => {
    mockGh("https://github.com/owner/repo/pull/53\n");
    await callAndValidate({ title: "t", body: "b", template: "bug_report.md" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--template");
    expect(args).toContain("bug_report.md");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 11: pr-diff (17 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Minimal unified diff for a single modified file */
const SIMPLE_DIFF = `diff --git a/src/index.ts b/src/index.ts
index abc1234..def5678 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 import { foo } from "bar";
+import { baz } from "qux";

 export function main() {
-  return foo();
+  return baz(foo());
 }
`;

/** Diff with a new file */
const NEW_FILE_DIFF = `diff --git a/src/new-file.ts b/src/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,3 @@
+export function newThing() {
+  return 42;
+}
`;

/** Diff with a deleted file */
const DELETED_FILE_DIFF = `diff --git a/src/old-file.ts b/src/old-file.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old-file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export function oldThing() {
-  return 0;
-}
`;

/** Diff with a renamed file */
const RENAMED_FILE_DIFF = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 90%
rename from src/old-name.ts
rename to src/new-name.ts
index abc1234..def5678 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,2 +1,2 @@
-export const name = "old";
+export const name = "new";
`;

/** Diff with a binary file */
const BINARY_FILE_DIFF = `diff --git a/assets/logo.png b/assets/logo.png
new file mode 100644
index 0000000..abc1234
Binary files /dev/null and b/assets/logo.png differ
`;

/** Diff with quoted file paths (spaces) */
const QUOTED_PATH_DIFF = `diff --git "a/src/my file.ts" "b/src/my file.ts"
index abc1234..def5678 100644
--- "a/src/my file.ts"
+++ "b/src/my file.ts"
@@ -1,2 +1,3 @@
 export function hello() {
+  console.log("world");
   return true;
 }
`;

describe("Smoke: github.pr-diff", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrDiffTool(server as never);
    handler = server.tools.get("pr-diff")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    // Force compact: false to get full schema output for validation,
    // unless explicitly testing compact mode
    const result = await handler({ compact: false, ...params });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Diff happy path ───────────────────────────────────────────
  it("S1 [P0] diff happy path with modified file", async () => {
    mockGh(SIMPLE_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].file).toBe("src/index.ts");
    expect(parsed.files[0].status).toBe("modified");
    expect(parsed.files[0].additions).toBe(2);
    expect(parsed.files[0].deletions).toBe(1);
  });

  // ── S2: Empty diff (no changes) ──────────────────────────────────
  it("S2 [P0] empty diff returns zero counts", async () => {
    mockGh("");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files).toEqual([]);
  });

  // ── S3: PR not found ─────────────────────────────────────────────
  it("S3 [P0] PR not found throws error", async () => {
    mockGh("", "Could not resolve to a PullRequest with the number of 999999", 1);
    await expect(callAndValidate({ number: "999999" })).rejects.toThrow("gh pr diff failed");
  });

  // ── S4: Flag injection on number ──────────────────────────────────
  it("S4 [P0] flag injection on number is blocked", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: Flag injection on repo ────────────────────────────────────
  it("S5 [P0] flag injection on repo is blocked", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── S6: Full patch content ────────────────────────────────────────
  it("S6 [P1] full: true includes chunks with headers and lines", async () => {
    mockGh(SIMPLE_DIFF);
    const { parsed } = await callAndValidate({ number: "123", full: true });
    expect(parsed.files[0].chunks).toBeDefined();
    expect(parsed.files[0].chunks!.length).toBeGreaterThan(0);
    expect(parsed.files[0].chunks![0].header).toMatch(/^@@/);
    expect(parsed.files[0].chunks![0].lines).toBeDefined();
  });

  // ── S7: Name only mode ────────────────────────────────────────────
  it("S7 [P1] nameOnly passes --name-only flag", async () => {
    mockGh("src/index.ts\nsrc/utils.ts\n");
    await callAndValidate({ number: "123", nameOnly: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--name-only");
  });

  // ── S8: File status detection (added) ─────────────────────────────
  it("S8 [P1] detects added file status from new file mode", async () => {
    mockGh(NEW_FILE_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files[0].status).toBe("added");
    expect(parsed.files[0].file).toBe("src/new-file.ts");
    expect(parsed.files[0].additions).toBe(3);
  });

  // ── S9: File status detection (deleted) ───────────────────────────
  it("S9 [P1] detects deleted file status", async () => {
    mockGh(DELETED_FILE_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files[0].status).toBe("deleted");
    expect(parsed.files[0].file).toBe("src/old-file.ts");
    expect(parsed.files[0].deletions).toBeGreaterThan(0);
  });

  // ── S10: File status detection (renamed) ──────────────────────────
  it("S10 [P1] detects renamed file with oldFile populated", async () => {
    mockGh(RENAMED_FILE_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files[0].status).toBe("renamed");
    expect(parsed.files[0].file).toBe("src/new-name.ts");
    expect(parsed.files[0].oldFile).toBe("src/old-name.ts");
  });

  // ── S11: Binary file detection ────────────────────────────────────
  it("S11 [P1] detects binary file", async () => {
    mockGh(BINARY_FILE_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files[0].binary).toBe(true);
    expect(parsed.files[0].file).toBe("assets/logo.png");
  });

  // ── S12: File mode detection ──────────────────────────────────────
  it("S12 [P1] full: true populates mode field for new files", async () => {
    mockGh(NEW_FILE_DIFF);
    const { parsed } = await callAndValidate({ number: "123", full: true });
    expect(parsed.files[0].mode).toBe("100644");
  });

  // ── S13: Large diff truncation ────────────────────────────────────
  it("S13 [P1] large diff sets truncated flag", async () => {
    // Create a diff that exceeds 256KB
    const largeDiff = SIMPLE_DIFF + "+".repeat(256 * 1024);
    mockGh(largeDiff);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.truncated).toBe(true);
  });

  // ── S14: Compact vs full output ───────────────────────────────────
  it("S14 [P1] compact: false returns full schema with all fields", async () => {
    mockGh(SIMPLE_DIFF);
    const { parsed } = await callAndValidate({ number: "123", compact: false });
    expect(parsed.files.length).toBe(1);
  });

  // ── S15: Cross-repo diff ──────────────────────────────────────────
  it("S15 [P1] cross-repo diff passes --repo flag", async () => {
    mockGh(SIMPLE_DIFF);
    await callAndValidate({ number: "123", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // ── S16: Quoted file paths (spaces) ───────────────────────────────
  it("S16 [P2] file paths with spaces parsed correctly", async () => {
    mockGh(QUOTED_PATH_DIFF);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files[0].file).toBe("src/my file.ts");
  });

  // ── S17: PR number as branch name ─────────────────────────────────
  it("S17 [P2] branch name passes to gh CLI correctly", async () => {
    mockGh(SIMPLE_DIFF);
    await callAndValidate({ number: "feature-branch" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("feature-branch");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Section 12: pr-list (21 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Sample PR list JSON as returned by gh pr list --json */
const SAMPLE_PR_LIST = JSON.stringify([
  {
    number: 42,
    state: "OPEN",
    title: "Add feature X",
    url: "https://github.com/owner/repo/pull/42",
    headRefName: "feature-x",
    baseRefName: "main",
    author: { login: "octocat" },
    labels: [{ name: "enhancement" }],
    isDraft: false,
    reviewDecision: "APPROVED",
    mergeable: "MERGEABLE",
  },
  {
    number: 43,
    state: "OPEN",
    title: "Fix bug Y",
    url: "https://github.com/owner/repo/pull/43",
    headRefName: "fix-bug-y",
    baseRefName: "main",
    author: { login: "developer" },
    labels: [{ name: "bug" }],
    isDraft: true,
    reviewDecision: "",
    mergeable: "UNKNOWN",
  },
]);

const EMPTY_PR_LIST = JSON.stringify([]);

const MERGED_PR_LIST = JSON.stringify([
  {
    number: 40,
    state: "MERGED",
    title: "Release v1.0",
    url: "https://github.com/owner/repo/pull/40",
    headRefName: "release-1.0",
    baseRefName: "main",
    author: { login: "releaser" },
    labels: [{ name: "release" }],
    isDraft: false,
    reviewDecision: "APPROVED",
    mergeable: "UNKNOWN",
  },
]);

describe("Smoke: github.pr-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrListTool(server as never);
    handler = server.tools.get("pr-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    // Apply defaults that would normally be set by Zod schema
    // when calling through MCP server. Direct handler calls skip Zod defaults.
    const withDefaults = { state: "open", limit: 30, compact: true, ...params };
    const result = await handler(withDefaults);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  /** Helper: mock the list query. */
  function mockGhPrList(mainStdout: string, _countStdout?: string) {
    mockGh(mainStdout);
  }

  // ── S1: List open PRs (default) ───────────────────────────────────
  it("S1 [P0] list open PRs with defaults", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    const { parsed } = await callAndValidate({});
    expect(parsed.prs.length).toBe(2);
    expect(parsed.prs[0].number).toBe(42);
    expect(parsed.prs[0].state).toBe("OPEN");
    expect(parsed.prs[0].title).toBe("Add feature X");
    expect(parsed.prs[0].author).toBe("octocat");
  });

  // ── S2: Empty PR list ─────────────────────────────────────────────
  it("S2 [P0] empty PR list returns zero total", async () => {
    mockGhPrList(EMPTY_PR_LIST);
    const { parsed } = await callAndValidate({ label: "nonexistent-label-xyz" });
    expect(parsed.prs).toEqual([]);
  });

  // ── S3: Flag injection on author ──────────────────────────────────
  it("S3 [P0] flag injection on author is blocked", async () => {
    await expect(callAndValidate({ author: "--exec=evil" })).rejects.toThrow();
  });

  // ── S4: Flag injection on label ───────────────────────────────────
  it("S4 [P0] flag injection on label is blocked", async () => {
    await expect(callAndValidate({ label: "--exec=evil" })).rejects.toThrow();
  });

  // ── S5: Flag injection on labels entry ────────────────────────────
  it("S5 [P0] flag injection on labels entry is blocked", async () => {
    await expect(callAndValidate({ labels: ["--exec=evil"] })).rejects.toThrow();
  });

  // ── S6: Flag injection on base ────────────────────────────────────
  it("S6 [P0] flag injection on base is blocked", async () => {
    await expect(callAndValidate({ base: "--exec=evil" })).rejects.toThrow();
  });

  // ── S7: Flag injection on head ────────────────────────────────────
  it("S7 [P0] flag injection on head is blocked", async () => {
    await expect(callAndValidate({ head: "--exec=evil" })).rejects.toThrow();
  });

  // ── S8: Flag injection on assignee ────────────────────────────────
  it("S8 [P0] flag injection on assignee is blocked", async () => {
    await expect(callAndValidate({ assignee: "--exec=evil" })).rejects.toThrow();
  });

  // ── S9: Flag injection on search ──────────────────────────────────
  it("S9 [P0] flag injection on search is blocked", async () => {
    await expect(callAndValidate({ search: "--exec=evil" })).rejects.toThrow();
  });

  // ── S10: Flag injection on repo ───────────────────────────────────
  it("S10 [P0] flag injection on repo is blocked", async () => {
    await expect(callAndValidate({ repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── S11: Flag injection on app ────────────────────────────────────
  it("S11 [P0] flag injection on app is blocked", async () => {
    await expect(callAndValidate({ app: "--exec=evil" })).rejects.toThrow();
  });

  // ── S12: Filter by state merged ───────────────────────────────────
  it("S12 [P1] filter by state merged", async () => {
    mockGhPrList(MERGED_PR_LIST);
    const { parsed } = await callAndValidate({ state: "merged" });
    expect(parsed.prs[0].state).toBe("MERGED");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--state");
    expect(args).toContain("merged");
  });

  // ── S13: Filter by author ─────────────────────────────────────────
  it("S13 [P1] filter by author passes --author flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ author: "octocat" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--author");
    expect(args).toContain("octocat");
  });

  // ── S14: Filter by base branch ────────────────────────────────────
  it("S14 [P1] filter by base branch passes --base flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ base: "main" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--base");
    expect(args).toContain("main");
  });

  // ── S15: Filter by draft ──────────────────────────────────────────
  it("S15 [P1] filter by draft passes --draft flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ draft: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--draft");
  });

  // ── S16: limit parameter ─────────────────────────────────────────
  it("S16 [P1] limit parameter constrains result count", async () => {
    const fivePrs = JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({
        number: i + 1,
        state: "OPEN",
        title: `PR ${i + 1}`,
        url: `https://github.com/owner/repo/pull/${i + 1}`,
        headRefName: `branch-${i + 1}`,
        baseRefName: "main",
        author: { login: "user" },
      })),
    );
    mockGhPrList(fivePrs);
    const { parsed } = await callAndValidate({ limit: 5 });
    expect(parsed.prs.length).toBe(5);
  });

  // ── S17: Compact vs full output ───────────────────────────────────
  it("S17 [P1] compact: false returns full schema output", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.prs.length).toBe(2);
  });

  // ── S18: Cross-repo listing ───────────────────────────────────────
  it("S18 [P1] cross-repo listing passes --repo flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // ── S19: Search filter ────────────────────────────────────────────
  it("S19 [P1] search filter passes --search flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ search: "is:open review:required" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--search");
    expect(args).toContain("is:open review:required");
  });

  // ── S20: Multiple labels filter ───────────────────────────────────
  it("S20 [P2] multiple labels passes multiple --label flags", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ labels: ["bug", "p0"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    const labelIndices = args.reduce<number[]>((acc, val, i) => {
      if (val === "--label") acc.push(i);
      return acc;
    }, []);
    expect(labelIndices.length).toBe(2);
    expect(args[labelIndices[0] + 1]).toBe("bug");
    expect(args[labelIndices[1] + 1]).toBe("p0");
  });

  // ── S21: Head branch filter ───────────────────────────────────────
  it("S21 [P2] head branch filter passes --head flag", async () => {
    mockGhPrList(SAMPLE_PR_LIST);
    await callAndValidate({ head: "feature" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--head");
    expect(args).toContain("feature");
  });
});
