/**
 * Smoke tests: github PR tools (Phase 2) — pr-merge, pr-review, pr-update, pr-view
 *
 * Tests these 4 tools end-to-end with mocked gh runner, validating argument
 * construction, output schema compliance, error classification, flag injection
 * protection, and edge case handling.
 *
 * Total: 83 scenarios (pr-merge: 22, pr-review: 17, pr-update: 27, pr-view: 17)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PrMergeResultSchema,
  PrReviewResultSchema,
  EditResultSchema,
  PrViewResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerPrMergeTool } from "../../../packages/server-github/src/tools/pr-merge.js";
import { registerPrReviewTool } from "../../../packages/server-github/src/tools/pr-review.js";
import { registerPrUpdateTool } from "../../../packages/server-github/src/tools/pr-update.js";
import { registerPrViewTool } from "../../../packages/server-github/src/tools/pr-view.js";

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pr-merge (22 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Smoke: github.pr-merge", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrMergeTool(server as never);
    handler = server.tools.get("pr-merge")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrMergeResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] squash merge happy path", async () => {
    mockGh("✓ Squashed and merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(true);
    expect(parsed.method).toBe("squash");
    expect(parsed.url).toContain("/pull/123");
    expect(parsed.state).toBe("merged");
  });

  it("S2 [P0] merge method: merge", async () => {
    mockGh("Merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({ number: "123", method: "merge" });
    expect(parsed.method).toBe("merge");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--merge");
  });

  it("S3 [P0] merge method: rebase", async () => {
    mockGh("Rebased and merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({ number: "123", method: "rebase" });
    expect(parsed.method).toBe("rebase");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--rebase");
  });

  it("S4 [P0] already merged PR", async () => {
    mockGh("", "Pull request #123 is already merged", 1);
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(false);
    expect(parsed.errorType).toBe("already-merged");
  });

  it("S5 [P0] merge conflict", async () => {
    mockGh("", "Merge conflict detected. Resolve conflicts before merging.", 1);
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(false);
    expect(parsed.errorType).toBe("merge-conflict");
  });

  it("S6 [P0] blocked by checks", async () => {
    mockGh("", "Checks have not passed yet. Required status check: CI", 1);
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(false);
    expect(parsed.errorType).toBe("blocked-checks");
  });

  it("S7 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on subject", async () => {
    await expect(callAndValidate({ number: "123", subject: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on authorEmail", async () => {
    await expect(callAndValidate({ number: "123", authorEmail: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] flag injection on matchHeadCommit", async () => {
    await expect(
      callAndValidate({ number: "123", matchHeadCommit: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S11 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S12 [P0] permission denied", async () => {
    mockGh("", "Forbidden: resource not accessible", 1);
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(false);
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S13 [P1] delete branch after merge", async () => {
    mockGh(
      "Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123\nDeleted branch fix-bug",
    );
    const { parsed } = await callAndValidate({
      number: "123",
      method: "squash",
      deleteBranch: true,
    });
    expect(parsed.branchDeleted).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--delete-branch");
  });

  it("S14 [P1] admin merge bypass", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", method: "squash", admin: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--admin");
  });

  it("S15 [P1] auto-merge enable", async () => {
    mockGh("Auto-merge enabled for pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({ number: "123", method: "squash", auto: true });
    expect(parsed.state).toBe("auto-merge-enabled");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--auto");
  });

  it("S16 [P1] disable auto-merge", async () => {
    mockGh("Auto-merge disabled for pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      method: "squash",
      disableAuto: true,
    });
    expect(parsed.state).toBe("auto-merge-disabled");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--disable-auto");
  });

  it("S17 [P1] custom merge subject", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", method: "squash", subject: "release: v1.0" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--subject");
    expect(args).toContain("release: v1.0");
  });

  it("S18 [P1] custom commit body", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", method: "squash", commitBody: "Detailed merge info" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { stdin?: string };
    expect(opts.stdin).toBe("Detailed merge info");
  });

  it("S19 [P1] match head commit (race safety)", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", method: "squash", matchHeadCommit: "abc123def456" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--match-head-commit");
    expect(args).toContain("abc123def456");
  });

  it("S20 [P1] cross-repo merge", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", method: "squash", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S21 [P2] merge commit SHA in output", async () => {
    mockGh(
      "Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123\nMerge commit: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    );
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.mergeCommitSha).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");
  });

  it("S22 [P2] PR number as URL", async () => {
    mockGh("Squash-merged pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({
      number: "https://github.com/owner/repo/pull/123",
      method: "squash",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args[2]).toBe("https://github.com/owner/repo/pull/123");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pr-review (17 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Smoke: github.pr-review", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrReviewTool(server as never);
    handler = server.tools.get("pr-review")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrReviewResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] approve PR happy path", async () => {
    mockGh("Approved pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({ number: "123", event: "approve" });
    expect(parsed.event).toBe("APPROVE");
    expect(parsed.url).toContain("/pull/123");
  });

  it("S2 [P0] request changes with body", async () => {
    mockGh("Requested changes on pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      event: "request-changes",
      body: "Fix this",
    });
    expect(parsed.event).toBe("REQUEST_CHANGES");
    expect(parsed.body).toBe("Fix this");
  });

  it("S3 [P0] comment review", async () => {
    mockGh("Reviewed pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      event: "comment",
      body: "Looks interesting",
    });
    expect(parsed.event).toBe("COMMENT");
    expect(parsed.body).toBe("Looks interesting");
  });

  it("S4 [P0] request changes without body throws", async () => {
    await expect(callAndValidate({ number: "123", event: "request-changes" })).rejects.toThrow(
      /body is required/i,
    );
  });

  it("S5 [P0] comment without body throws", async () => {
    await expect(callAndValidate({ number: "123", event: "comment" })).rejects.toThrow(
      /body is required/i,
    );
  });

  it("S6 [P0] PR not found", async () => {
    mockGh("", "Could not resolve to a PullRequest. No pull request found", 1);
    const { parsed } = await callAndValidate({ number: "999999", event: "approve" });
    expect(parsed.errorType).toBe("not-found");
  });

  it("S7 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil", event: "approve" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on body", async () => {
    await expect(
      callAndValidate({ number: "123", event: "comment", body: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S9 [P0] flag injection on repo", async () => {
    await expect(
      callAndValidate({ number: "123", event: "approve", repo: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection on bodyFile", async () => {
    await expect(
      callAndValidate({
        number: "123",
        event: "comment",
        bodyFile: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  it("S11 [P0] shell escaping in body (#530 pattern)", async () => {
    const bodyWithShellChars = "Use `cmd | grep` and $(var)";
    mockGh("Reviewed pull request #123\nhttps://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      event: "comment",
      body: bodyWithShellChars,
    });
    // Verify body is passed via stdin (--body-file -)
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    // Verify stdin was set
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { stdin?: string };
    expect(opts.stdin).toBe(bodyWithShellChars);
    expect(parsed.body).toBe(bodyWithShellChars);
  });

  it("S12 [P0] permission denied", async () => {
    mockGh("", "Forbidden: permission denied (403)", 1);
    const { parsed } = await callAndValidate({ number: "123", event: "approve" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S13 [P1] cross-repo review", async () => {
    mockGh("Approved pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({
      number: "123",
      event: "approve",
      repo: "owner/repo",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S14 [P1] body from file", async () => {
    mockGh("Reviewed pull request #123\nhttps://github.com/owner/repo/pull/123");
    await callAndValidate({
      number: "123",
      event: "comment",
      bodyFile: "review.md",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--body-file");
    expect(args).toContain("review.md");
  });

  it("S15 [P1] review on draft PR", async () => {
    mockGh("", "Pull request #123 is a draft", 1);
    const { parsed } = await callAndValidate({ number: "123", event: "approve" });
    expect(parsed.errorType).toBe("draft-pr");
  });

  it("S16 [P1] already reviewed error", async () => {
    mockGh("", "You have already reviewed this pull request. Already approved.", 1);
    const { parsed } = await callAndValidate({ number: "123", event: "approve" });
    expect(parsed.errorType).toBe("already-reviewed");
  });

  it("S17 [P2] PR number as branch name", async () => {
    mockGh("Approved pull request\nhttps://github.com/owner/repo/pull/456");
    await callAndValidate({ number: "feature-branch", event: "approve" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args[2]).toBe("feature-branch");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pr-update (27 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("Smoke: github.pr-update", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrUpdateTool(server as never);
    handler = server.tools.get("pr-update")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = EditResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] update title happy path", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      title: "New title",
    });
    expect(parsed.updatedFields).toContain("title");
    expect(parsed.url).toContain("/pull/123");
  });

  it("S2 [P0] update body", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      body: "New body",
    });
    expect(parsed.updatedFields).toContain("body");
    // Verify body sent via stdin
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { stdin?: string };
    expect(opts.stdin).toBe("New body");
  });

  it("S3 [P0] PR not found", async () => {
    mockGh("", "not found: no pull request found for 999999", 1);
    const { parsed } = await callAndValidate({
      number: "999999",
      title: "x",
    });
    expect(parsed.errorType).toBe("not-found");
  });

  it("S4 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil", title: "x" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on title", async () => {
    await expect(callAndValidate({ number: "123", title: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on base", async () => {
    await expect(callAndValidate({ number: "123", base: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on milestone", async () => {
    await expect(callAndValidate({ number: "123", milestone: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on addLabels entry", async () => {
    await expect(callAndValidate({ number: "123", addLabels: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S10 [P0] flag injection on removeLabels entry", async () => {
    await expect(
      callAndValidate({ number: "123", removeLabels: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S11 [P0] flag injection on addAssignees entry", async () => {
    await expect(
      callAndValidate({ number: "123", addAssignees: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S12 [P0] flag injection on removeAssignees entry", async () => {
    await expect(
      callAndValidate({ number: "123", removeAssignees: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S13 [P0] flag injection on addProjects entry", async () => {
    await expect(
      callAndValidate({ number: "123", addProjects: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S14 [P0] flag injection on removeProjects entry", async () => {
    await expect(
      callAndValidate({ number: "123", removeProjects: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S15 [P0] flag injection on addReviewers entry", async () => {
    await expect(
      callAndValidate({ number: "123", addReviewers: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S16 [P0] flag injection on removeReviewers entry", async () => {
    await expect(
      callAndValidate({ number: "123", removeReviewers: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S17 [P0] shell escaping in body (#530 pattern)", async () => {
    const bodyWithShellChars = "Use `cmd | grep` and $(var)";
    mockGh("https://github.com/owner/repo/pull/123");
    await callAndValidate({ number: "123", body: bodyWithShellChars });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--body-file");
    expect(args).toContain("-");
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { stdin?: string };
    expect(opts.stdin).toBe(bodyWithShellChars);
  });

  it("S18 [P1] add labels", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      addLabels: ["bug", "p0"],
    });
    expect(parsed.operations).toContain("add-label");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args.filter((a: string) => a === "--add-label").length).toBe(2);
  });

  it("S19 [P1] remove labels", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      removeLabels: ["wontfix"],
    });
    expect(parsed.operations).toContain("remove-label");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--remove-label");
    expect(args).toContain("wontfix");
  });

  it("S20 [P1] add reviewers", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      addReviewers: ["user1", "org/team"],
    });
    expect(parsed.operations).toContain("add-reviewer");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--add-reviewer");
    expect(args).toContain("user1");
    expect(args).toContain("org/team");
  });

  it("S21 [P1] remove reviewers", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      removeReviewers: ["user1"],
    });
    expect(parsed.operations).toContain("remove-reviewer");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--remove-reviewer");
    expect(args).toContain("user1");
  });

  it("S22 [P1] change base branch", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      base: "develop",
    });
    expect(parsed.operations).toContain("set-base");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--base");
    expect(args).toContain("develop");
  });

  it("S23 [P1] set milestone", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      milestone: "v1.0",
    });
    expect(parsed.operations).toContain("set-milestone");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--milestone");
    expect(args).toContain("v1.0");
  });

  it("S24 [P1] remove milestone", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      removeMilestone: true,
    });
    expect(parsed.operations).toContain("remove-milestone");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--remove-milestone");
  });

  it("S25 [P1] permission denied", async () => {
    mockGh("", "Forbidden: you do not have permission (403)", 1);
    const { parsed } = await callAndValidate({
      number: "123",
      title: "x",
    });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S26 [P1] cross-repo update", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    await callAndValidate({
      number: "123",
      title: "x",
      repo: "owner/repo",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S27 [P2] multiple operations at once", async () => {
    mockGh("https://github.com/owner/repo/pull/123");
    const { parsed } = await callAndValidate({
      number: "123",
      title: "New",
      addLabels: ["bug"],
      addReviewers: ["user"],
    });
    expect(parsed.updatedFields).toContain("title");
    expect(parsed.updatedFields).toContain("labels");
    expect(parsed.updatedFields).toContain("reviewers");
    expect(parsed.operations).toContain("add-label");
    expect(parsed.operations).toContain("add-reviewer");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// pr-view (17 scenarios)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Realistic PR view JSON for happy path tests (gh --json returns flat arrays) */
const PR_VIEW_JSON = {
  number: 123,
  state: "OPEN",
  title: "Fix bug",
  body: "Description",
  mergeable: "MERGEABLE",
  reviewDecision: "APPROVED",
  statusCheckRollup: [],
  url: "https://github.com/owner/repo/pull/123",
  headRefName: "fix-bug",
  baseRefName: "main",
  additions: 10,
  deletions: 5,
  changedFiles: 3,
  author: { login: "user" },
  labels: [] as { name: string }[],
  isDraft: false,
  assignees: [] as { login: string }[],
  createdAt: "2026-02-17T10:00:00Z",
  updatedAt: "2026-02-17T10:00:00Z",
  milestone: null,
  projectItems: [] as { title: string }[],
  reviews: [] as {
    author: { login: string };
    state: string;
    body?: string;
    submittedAt?: string;
  }[],
  commits: [{ commit: { oid: "abc123" } }],
};

describe("Smoke: github.pr-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrViewTool(server as never);
    handler = server.tools.get("pr-view")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrViewResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] view PR happy path", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.number).toBe(123);
    expect(parsed.state).toBe("OPEN");
    expect(parsed.title).toBe("Fix bug");
    expect(parsed.url).toContain("/pull/123");
    expect(parsed.headBranch).toBe("fix-bug");
    expect(parsed.baseBranch).toBe("main");
    expect(parsed.additions).toBe(10);
    expect(parsed.deletions).toBe(5);
    expect(parsed.changedFiles).toBe(3);
    expect(parsed.author).toBe("user");
  });

  it("S2 [P0] PR not found", async () => {
    mockGh("", "gh pr view failed: no pull request found", 1);
    await expect(callAndValidate({ number: "999999" })).rejects.toThrow(/gh pr view failed/);
  });

  it("S3 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] merged PR", async () => {
    const mergedPr = {
      ...PR_VIEW_JSON,
      state: "MERGED",
      mergeable: "UNKNOWN",
    };
    mockGh(JSON.stringify(mergedPr));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.state).toBe("MERGED");
    expect(parsed.mergeable).toBe("UNKNOWN");
  });

  it("S6 [P0] draft PR", async () => {
    const draftPr = { ...PR_VIEW_JSON, isDraft: true };
    mockGh(JSON.stringify(draftPr));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.isDraft).toBe(true);
  });

  it("S7 [P1] include comments", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    await callAndValidate({ number: "123", comments: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--comments");
  });

  it("S8 [P1] PR with checks", async () => {
    const prWithChecks = {
      ...PR_VIEW_JSON,
      statusCheckRollup: [
        {
          name: "CI",
          status: "COMPLETED",
          conclusion: "SUCCESS",
        },
        {
          name: "lint",
          status: "COMPLETED",
          conclusion: "FAILURE",
        },
      ],
    };
    mockGh(JSON.stringify(prWithChecks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks).toHaveLength(2);
    expect(parsed.checks![0].name).toBe("CI");
    expect(parsed.checks![1].conclusion).toBe("FAILURE");
  });

  it("S9 [P1] PR with reviews", async () => {
    const prWithReviews = {
      ...PR_VIEW_JSON,
      reviews: [
        {
          author: { login: "reviewer1" },
          state: "APPROVED",
          body: "LGTM",
          submittedAt: "2026-02-17T11:00:00Z",
        },
        {
          author: { login: "reviewer2" },
          state: "CHANGES_REQUESTED",
          body: "Needs fix",
          submittedAt: "2026-02-17T11:30:00Z",
        },
      ] as { author: { login: string }; state: string; body?: string; submittedAt?: string }[],
    };
    mockGh(JSON.stringify(prWithReviews));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.reviews).toHaveLength(2);
    expect(parsed.reviews![0].author).toBe("reviewer1");
    expect(parsed.reviews![0].state).toBe("APPROVED");
    expect(parsed.reviews![1].state).toBe("CHANGES_REQUESTED");
  });

  it("S10 [P1] PR with labels and assignees", async () => {
    const prWithMeta = {
      ...PR_VIEW_JSON,
      labels: [{ name: "bug" }, { name: "p0" }],
      assignees: [{ login: "dev1" }, { login: "dev2" }],
    };
    mockGh(JSON.stringify(prWithMeta));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.labels).toEqual(["bug", "p0"]);
    expect(parsed.assignees).toEqual(["dev1", "dev2"]);
  });

  it("S11 [P1] PR with null body", async () => {
    const prNullBody = { ...PR_VIEW_JSON, body: null };
    mockGh(JSON.stringify(prNullBody));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.body).toBeNull();
  });

  it("S12 [P1] compact vs full output", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    const { parsed } = await callAndValidate({
      number: "123",
      compact: false,
    });
    // Full output should still have all fields
    expect(parsed.number).toBe(123);
    expect(parsed.title).toBe("Fix bug");
  });

  it("S13 [P1] cross-repo view", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    await callAndValidate({ number: "123", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S14 [P1] diff stats (additions/deletions)", async () => {
    const prWithStats = {
      ...PR_VIEW_JSON,
      additions: 42,
      deletions: 18,
      changedFiles: 7,
    };
    mockGh(JSON.stringify(prWithStats));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.additions).toBe(42);
    expect(parsed.deletions).toBe(18);
    expect(parsed.changedFiles).toBe(7);
  });

  it("S15 [P1] commit info", async () => {
    const prWithCommits = {
      ...PR_VIEW_JSON,
      commits: [
        { commit: { oid: "aaa111" } },
        { commit: { oid: "bbb222" } },
        { commit: { oid: "ccc333" } },
      ],
    };
    mockGh(JSON.stringify(prWithCommits));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.commitCount).toBe(3);
    expect(parsed.latestCommitSha).toBe("ccc333");
  });

  it("S16 [P2] PR number as URL", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    await callAndValidate({
      number: "https://github.com/owner/repo/pull/123",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args[2]).toBe("https://github.com/owner/repo/pull/123");
  });

  it("S17 [P2] PR number as branch name", async () => {
    mockGh(JSON.stringify(PR_VIEW_JSON));
    await callAndValidate({ number: "feature-branch" });
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args[2]).toBe("feature-branch");
  });
});
