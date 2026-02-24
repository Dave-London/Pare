/**
 * Smoke tests: github issue tools — Phase 2 (mocked)
 *
 * Tests all 6 issue tools end-to-end with mocked gh runner,
 * validating argument construction, output schema compliance,
 * and edge case handling.
 *
 * Tools covered:
 *   issue-close   (13 scenarios)
 *   issue-comment  (13 scenarios)
 *   issue-create   (19 scenarios)
 *   issue-list     (21 scenarios)
 *   issue-update   (23 scenarios)
 *   issue-view     (13 scenarios)
 *   Total: 102 scenarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  IssueCloseResultSchema,
  CommentResultSchema,
  IssueCreateResultSchema,
  IssueListResultSchema,
  EditResultSchema,
  IssueViewResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

// Mock the gh runner
vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerIssueCloseTool } from "../../../packages/server-github/src/tools/issue-close.js";
import { registerIssueCommentTool } from "../../../packages/server-github/src/tools/issue-comment.js";
import { registerIssueCreateTool } from "../../../packages/server-github/src/tools/issue-create.js";
import { registerIssueListTool } from "../../../packages/server-github/src/tools/issue-list.js";
import { registerIssueUpdateTool } from "../../../packages/server-github/src/tools/issue-update.js";
import { registerIssueViewTool } from "../../../packages/server-github/src/tools/issue-view.js";

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

// ═════════════════════════════════════════════════════════════════════
// 1. issue-close (13 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-close", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueCloseTool(server as never);
    handler = server.tools.get("issue-close")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = IssueCloseResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] close issue happy path", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.state).toBe("closed");
    expect(parsed.url).toContain("/issues/42");
  });

  it("S2 [P0] close with comment", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/repo/issues/42#issuecomment-12345");
    const { parsed } = await callAndValidate({ number: "42", comment: "Fixed in PR #50" });
    expect(parsed.commentUrl).toContain("issuecomment-12345");
  });

  it("S3 [P0] close with reason 'not planned'", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", reason: "not planned" });
    expect(parsed.reason).toBe("not planned");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--reason");
    expect(args).toContain("not planned");
  });

  it("S4 [P0] issue not found", async () => {
    mockGh("", "Could not resolve to an Issue with the number of 999999", 1);
    const { parsed } = await callAndValidate({ number: "999999" });
    expect(parsed.errorType).toBe("not-found");
    expect(parsed.errorMessage).toBeDefined();
  });

  it("S5 [P0] already closed issue", async () => {
    mockGh("Issue #42 is already closed", "", 1);
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.errorType).toBe("already-closed");
  });

  it("S6 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on comment", async () => {
    await expect(callAndValidate({ number: "42", comment: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "42", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] shell escaping in comment (#530 pattern)", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/repo/issues/42");
    await callAndValidate({ number: "42", comment: "Fixed: use `foo|bar` (see docs)" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--comment");
    expect(args).toContain("Fixed: use `foo|bar` (see docs)");
  });

  it("S10 [P1] cross-repo close", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/other-repo/issues/42");
    await callAndValidate({ number: "42", repo: "owner/other-repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/other-repo");
  });

  it("S11 [P1] close with reason 'completed'", async () => {
    mockGh("Closing issue #42\nhttps://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", reason: "completed" });
    expect(parsed.reason).toBe("completed");
  });

  it("S12 [P1] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S13 [P2] issue number as URL", async () => {
    mockGh("Closing issue\nhttps://github.com/owner/repo/issues/42");
    await callAndValidate({ number: "https://github.com/owner/repo/issues/42" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("https://github.com/owner/repo/issues/42");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. issue-comment (13 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-comment", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueCommentTool(server as never);
    handler = server.tools.get("issue-comment")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CommentResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] create comment happy path", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-12345");
    const { parsed } = await callAndValidate({ number: "42", body: "Looks good!" });
    expect(parsed.operation).toBe("create");
    expect(parsed.url).toContain("issuecomment-12345");
  });

  it("S2 [P0] issue not found", async () => {
    mockGh("", "Could not resolve to an Issue with the number of 999999", 1);
    const { parsed } = await callAndValidate({ number: "999999", body: "test" });
    expect(parsed.errorType).toBe("not-found");
  });

  it("S3 [P0] flag injection on body", async () => {
    await expect(callAndValidate({ number: "42", body: "--exec=evil" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil", body: "test" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on repo", async () => {
    await expect(
      callAndValidate({ number: "42", body: "test", repo: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S6 [P0] shell escaping in body (#530 pattern)", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-111");
    await callAndValidate({ number: "42", body: "Use `cmd|grep` and $(var)" });
    // body is sent via stdin, not as a flag argument
    const callArgs = vi.mocked(ghCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--body-file");
    expect(callArgs[0]).toContain("-");
    expect(callArgs[1]).toEqual(expect.objectContaining({ stdin: "Use `cmd|grep` and $(var)" }));
  });

  it("S7 [P0] body with markdown special chars", async () => {
    const markdownBody = "## Header\n- item\n```code```";
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-222");
    const { parsed } = await callAndValidate({ number: "42", body: markdownBody });
    expect(parsed.operation).toBe("create");
  });

  it("S8 [P1] edit last comment", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-333");
    const { parsed } = await callAndValidate({
      number: "42",
      body: "Updated",
      editLast: true,
    });
    expect(parsed.operation).toBe("edit");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--edit-last");
  });

  it("S9 [P1] delete last comment", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-444");
    const { parsed } = await callAndValidate({
      number: "42",
      body: "",
      deleteLast: true,
    });
    expect(parsed.operation).toBe("delete");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--delete-last");
  });

  it("S10 [P1] edit with createIfNone", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-555");
    await callAndValidate({
      number: "42",
      body: "New",
      editLast: true,
      createIfNone: true,
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--edit-last");
    expect(args).toContain("--create-if-none");
  });

  it("S11 [P1] cross-repo comment", async () => {
    mockGh("https://github.com/owner/repo/issues/42#issuecomment-666");
    await callAndValidate({ number: "42", body: "test", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S12 [P1] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "42", body: "test" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S13 [P2] validation error (empty body edge)", async () => {
    mockGh("", "body cannot be blank", 1);
    const { parsed } = await callAndValidate({ number: "42", body: "" });
    expect(parsed.errorType).toBe("validation");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. issue-create (19 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueCreateTool(server as never);
    handler = server.tools.get("issue-create")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = IssueCreateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] create issue happy path", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({
      title: "Bug report",
      body: "Steps to reproduce...",
    });
    expect(parsed.number).toBe(42);
    expect(parsed.url).toContain("/issues/42");
  });

  it("S2 [P0] create with labels", async () => {
    mockGh("https://github.com/owner/repo/issues/43");
    const { parsed } = await callAndValidate({
      title: "Bug",
      body: "desc",
      labels: ["bug", "p0"],
    });
    expect(parsed.number).toBe(43);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--label");
    expect(args).toContain("bug");
  });

  it("S3 [P0] flag injection on title", async () => {
    await expect(callAndValidate({ title: "--exec=evil", body: "test" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on labels entry", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", labels: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S5 [P0] flag injection on assignees entry", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", assignees: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S6 [P0] flag injection on milestone", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", milestone: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S7 [P0] flag injection on project", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", project: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S8 [P0] flag injection on template", async () => {
    await expect(
      callAndValidate({ title: "t", body: "b", template: "--exec=evil" }),
    ).rejects.toThrow();
  });

  it("S9 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ title: "t", body: "b", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] shell escaping in body (#530 pattern)", async () => {
    mockGh("https://github.com/owner/repo/issues/44");
    await callAndValidate({ title: "t", body: "Use `cmd|grep` and $(var)" });
    const callArgs = vi.mocked(ghCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--body-file");
    expect(callArgs[0]).toContain("-");
    expect(callArgs[1]).toEqual(expect.objectContaining({ stdin: "Use `cmd|grep` and $(var)" }));
  });

  it("S11 [P0] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ title: "t", body: "b" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S12 [P0] validation error", async () => {
    mockGh("", "Validation Failed: unprocessable entity", 1);
    const { parsed } = await callAndValidate({ title: "t", body: "b" });
    expect(parsed.errorType).toBe("validation");
  });

  it("S13 [P1] create with assignees", async () => {
    mockGh("https://github.com/owner/repo/issues/45");
    await callAndValidate({ title: "t", body: "b", assignees: ["user1"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--assignee");
    expect(args).toContain("user1");
  });

  it("S14 [P1] create with milestone", async () => {
    mockGh("https://github.com/owner/repo/issues/46");
    await callAndValidate({ title: "t", body: "b", milestone: "v1.0" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--milestone");
    expect(args).toContain("v1.0");
  });

  it("S15 [P1] create with project", async () => {
    mockGh("https://github.com/owner/repo/issues/47");
    await callAndValidate({ title: "t", body: "b", project: "Board" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--project");
    expect(args).toContain("Board");
  });

  it("S16 [P1] create with template", async () => {
    mockGh("https://github.com/owner/repo/issues/48");
    await callAndValidate({ title: "t", body: "b", template: "bug_report.md" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--template");
    expect(args).toContain("bug_report.md");
  });

  it("S17 [P1] cross-repo create", async () => {
    mockGh("https://github.com/owner/repo/issues/49");
    await callAndValidate({ title: "t", body: "b", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S18 [P1] partial creation (issue created but metadata failed)", async () => {
    mockGh("https://github.com/owner/repo/issues/50", "label 'nonexistent' not found", 1);
    const { parsed } = await callAndValidate({
      title: "t",
      body: "b",
      labels: ["nonexistent"],
    });
    expect(parsed.partial).toBe(true);
    expect(parsed.errorType).toBe("partial-created");
    expect(parsed.number).toBeGreaterThan(0);
  });

  it("S19 [P2] body with long markdown content", async () => {
    const longBody = "# Title\n\n" + "Lorem ipsum dolor sit amet. ".repeat(200);
    mockGh("https://github.com/owner/repo/issues/51");
    await callAndValidate({ title: "t", body: longBody });
    const callArgs = vi.mocked(ghCmd).mock.calls[0];
    expect(callArgs[1]).toEqual(expect.objectContaining({ stdin: longBody }));
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. issue-list (21 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueListTool(server as never);
    handler = server.tools.get("issue-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = IssueListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  /** Helper: create a sample gh issue list JSON item */
  function sampleIssue(n: number, state = "OPEN") {
    return {
      number: n,
      state,
      title: `Issue #${n}`,
      url: `https://github.com/owner/repo/issues/${n}`,
      labels: [{ name: "bug" }],
      assignees: [{ login: "octocat" }],
      author: { login: "creator" },
      createdAt: "2026-02-17T10:00:00Z",
      milestone: { title: "v1.0" },
    };
  }

  it("S1 [P0] list open issues (default)", async () => {
    const issues = [sampleIssue(1), sampleIssue(2)];
    mockGh(JSON.stringify(issues));
    const { parsed } = await callAndValidate({});
    expect(parsed.issues.length).toBe(2);
    expect(parsed.issues[0].number).toBe(1);
    expect(parsed.issues[0].state).toBe("OPEN");
  });

  it("S2 [P0] empty issue list", async () => {
    mockGh("[]");
    const { parsed } = await callAndValidate({ label: "nonexistent-label-xyz" });
    expect(parsed.issues).toEqual([]);
  });

  it("S3 [P0] flag injection on label", async () => {
    await expect(callAndValidate({ label: "--exec=evil" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on labels entry", async () => {
    await expect(callAndValidate({ labels: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on assignee", async () => {
    await expect(callAndValidate({ assignee: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on search", async () => {
    await expect(callAndValidate({ search: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on author", async () => {
    await expect(callAndValidate({ author: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on milestone", async () => {
    await expect(callAndValidate({ milestone: "--exec=evil" })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S10 [P0] flag injection on mention", async () => {
    await expect(callAndValidate({ mention: "--exec=evil" })).rejects.toThrow();
  });

  it("S11 [P0] flag injection on app", async () => {
    await expect(callAndValidate({ app: "--exec=evil" })).rejects.toThrow();
  });

  it("S12 [P1] filter by state closed", async () => {
    const closedIssues = [sampleIssue(10, "CLOSED"), sampleIssue(11, "CLOSED")];
    mockGh(JSON.stringify(closedIssues));
    const { parsed } = await callAndValidate({ state: "closed" });
    for (const issue of parsed.issues) {
      expect(issue.state).toBe("CLOSED");
    }
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--state");
    expect(args).toContain("closed");
  });

  it("S13 [P1] filter by label", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ label: "bug" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--label");
    expect(args).toContain("bug");
  });

  it("S14 [P1] filter by assignee", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ assignee: "octocat" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--assignee");
    expect(args).toContain("octocat");
  });

  it("S15 [P1] limit parameter constrains result count", async () => {
    const twoIssues = [sampleIssue(1), sampleIssue(2)];
    mockGh(JSON.stringify(twoIssues));
    const { parsed } = await callAndValidate({ limit: 2 });
    expect(parsed.issues.length).toBe(2);
  });

  it("S16 [P1] paginate all", async () => {
    const issues = Array.from({ length: 5 }, (_, i) => sampleIssue(i + 1));
    mockGh(JSON.stringify(issues));
    const { parsed } = await callAndValidate({ paginate: true });
    expect(parsed.issues.length).toBe(5);
  });

  it("S17 [P1] compact vs full output", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.issues).toBeDefined();
  });

  it("S18 [P1] cross-repo listing", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S19 [P1] search filter", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ search: "is:open label:bug" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--search");
    expect(args).toContain("is:open label:bug");
  });

  it("S20 [P2] multiple labels filter", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ labels: ["bug", "enhancement"] });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    // Should have two --label flags
    const labelIndices = args.reduce<number[]>((acc, a, i) => {
      if (a === "--label") acc.push(i);
      return acc;
    }, []);
    expect(labelIndices.length).toBe(2);
  });

  it("S21 [P2] author + milestone combo", async () => {
    const issues = [sampleIssue(1)];
    mockGh(JSON.stringify(issues));
    await callAndValidate({ author: "user", milestone: "v1.0" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--author");
    expect(args).toContain("user");
    expect(args).toContain("--milestone");
    expect(args).toContain("v1.0");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. issue-update (23 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-update", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueUpdateTool(server as never);
    handler = server.tools.get("issue-update")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = EditResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [P0] update title happy path", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", title: "New title" });
    expect(parsed.updatedFields).toContain("title");
    expect(parsed.url).toContain("/issues/42");
  });

  it("S2 [P0] update body", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", body: "New body text" });
    expect(parsed.updatedFields).toContain("body");
    // Body is sent via stdin
    const callArgs = vi.mocked(ghCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--body-file");
    expect(callArgs[1]).toEqual(expect.objectContaining({ stdin: "New body text" }));
  });

  it("S3 [P0] issue not found", async () => {
    mockGh("", "Could not resolve to an Issue", 1);
    const { parsed } = await callAndValidate({ number: "999999", title: "x" });
    expect(parsed.errorType).toBe("not-found");
  });

  it("S4 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil", title: "x" })).rejects.toThrow();
  });

  it("S5 [P0] flag injection on title", async () => {
    await expect(callAndValidate({ number: "42", title: "--exec=evil" })).rejects.toThrow();
  });

  it("S6 [P0] flag injection on milestone", async () => {
    await expect(callAndValidate({ number: "42", milestone: "--exec=evil" })).rejects.toThrow();
  });

  it("S7 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "42", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S8 [P0] flag injection on addLabels entry", async () => {
    await expect(callAndValidate({ number: "42", addLabels: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S9 [P0] flag injection on removeLabels entry", async () => {
    await expect(
      callAndValidate({ number: "42", removeLabels: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S10 [P0] flag injection on addAssignees entry", async () => {
    await expect(
      callAndValidate({ number: "42", addAssignees: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S11 [P0] flag injection on removeAssignees entry", async () => {
    await expect(
      callAndValidate({ number: "42", removeAssignees: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S12 [P0] flag injection on addProjects entry", async () => {
    await expect(callAndValidate({ number: "42", addProjects: ["--exec=evil"] })).rejects.toThrow();
  });

  it("S13 [P0] flag injection on removeProjects entry", async () => {
    await expect(
      callAndValidate({ number: "42", removeProjects: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  it("S14 [P0] shell escaping in body (#530 pattern)", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    await callAndValidate({ number: "42", body: "Use `cmd|grep` and $(var)" });
    const callArgs = vi.mocked(ghCmd).mock.calls[0];
    expect(callArgs[0]).toContain("--body-file");
    expect(callArgs[1]).toEqual(expect.objectContaining({ stdin: "Use `cmd|grep` and $(var)" }));
  });

  it("S15 [P1] add labels", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", addLabels: ["bug", "p0"] });
    expect(parsed.operations).toContain("add-label");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--add-label");
    expect(args).toContain("bug");
    expect(args).toContain("p0");
  });

  it("S16 [P1] remove labels", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", removeLabels: ["wontfix"] });
    expect(parsed.operations).toContain("remove-label");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--remove-label");
    expect(args).toContain("wontfix");
  });

  it("S17 [P1] add and remove assignees", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({
      number: "42",
      addAssignees: ["user1"],
      removeAssignees: ["user2"],
    });
    expect(parsed.operations).toContain("add-assignee");
    expect(parsed.operations).toContain("remove-assignee");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--add-assignee");
    expect(args).toContain("user1");
    expect(args).toContain("--remove-assignee");
    expect(args).toContain("user2");
  });

  it("S18 [P1] set milestone", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", milestone: "v1.0" });
    expect(parsed.operations).toContain("set-milestone");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--milestone");
    expect(args).toContain("v1.0");
  });

  it("S19 [P1] remove milestone", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", removeMilestone: true });
    expect(parsed.operations).toContain("remove-milestone");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--remove-milestone");
  });

  it("S20 [P1] add project", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({ number: "42", addProjects: ["Board"] });
    expect(parsed.operations).toContain("add-project");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--add-project");
    expect(args).toContain("Board");
  });

  it("S21 [P1] cross-repo update", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    await callAndValidate({ number: "42", title: "x", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S22 [P1] permission denied", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "42", title: "x" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  it("S23 [P2] multiple operations at once", async () => {
    mockGh("https://github.com/owner/repo/issues/42");
    const { parsed } = await callAndValidate({
      number: "42",
      title: "New",
      addLabels: ["bug"],
      addAssignees: ["user"],
    });
    expect(parsed.updatedFields).toContain("title");
    expect(parsed.updatedFields).toContain("labels");
    expect(parsed.updatedFields).toContain("assignees");
    expect(parsed.operations).toContain("add-label");
    expect(parsed.operations).toContain("add-assignee");
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. issue-view (13 scenarios)
// ═════════════════════════════════════════════════════════════════════

describe("Smoke: github.issue-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerIssueViewTool(server as never);
    handler = server.tools.get("issue-view")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = IssueViewResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  /** Helper: create a sample gh issue view JSON response */
  function sampleIssueJson(overrides: Record<string, unknown> = {}) {
    return JSON.stringify({
      number: 42,
      state: "OPEN",
      title: "Test issue",
      body: "Issue body text",
      labels: [{ name: "bug" }],
      assignees: [{ login: "octocat" }],
      url: "https://github.com/owner/repo/issues/42",
      createdAt: "2026-02-17T10:00:00Z",
      stateReason: null,
      author: { login: "creator" },
      milestone: { title: "v1.0" },
      updatedAt: "2026-02-17T12:00:00Z",
      closedAt: null,
      isPinned: false,
      projectItems: [{ title: "Board" }],
      ...overrides,
    });
  }

  it("S1 [P0] view issue happy path", async () => {
    mockGh(sampleIssueJson());
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.number).toBe(42);
    expect(parsed.state).toBe("OPEN");
    expect(parsed.title).toBe("Test issue");
    expect(parsed.labels).toEqual(["bug"]);
    expect(parsed.assignees).toEqual(["octocat"]);
    expect(parsed.url).toContain("/issues/42");
    expect(parsed.createdAt).toBeDefined();
  });

  it("S2 [P0] issue not found", async () => {
    mockGh("", "Could not resolve to an Issue with the number of 999999", 1);
    await expect(callAndValidate({ number: "999999" })).rejects.toThrow("gh issue view failed");
  });

  it("S3 [P0] flag injection on number", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  it("S4 [P0] flag injection on repo", async () => {
    await expect(callAndValidate({ number: "42", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S5 [P0] closed issue with stateReason", async () => {
    mockGh(
      sampleIssueJson({
        state: "CLOSED",
        stateReason: "completed",
        closedAt: "2026-02-17T14:00:00Z",
      }),
    );
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.state).toBe("CLOSED");
    expect(parsed.stateReason).toBe("completed");
  });

  it("S6 [P0] issue with body containing special chars", async () => {
    const specialBody = "Use `cmd|grep` and $(var) with backticks";
    mockGh(sampleIssueJson({ body: specialBody }));
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.body).toBe(specialBody);
  });

  it("S7 [P1] include comments", async () => {
    mockGh(sampleIssueJson());
    await callAndValidate({ number: "42", comments: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--comments");
  });

  it("S8 [P1] compact vs full output", async () => {
    mockGh(sampleIssueJson());
    const { parsed } = await callAndValidate({ number: "42", compact: false });
    // Full output still validates against schema
    expect(parsed.number).toBe(42);
    expect(parsed.title).toBeDefined();
  });

  it("S9 [P1] cross-repo view", async () => {
    mockGh(sampleIssueJson());
    await callAndValidate({ number: "42", repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  it("S10 [P1] issue with all metadata", async () => {
    mockGh(sampleIssueJson());
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.author).toBe("creator");
    expect(parsed.milestone).toBe("v1.0");
    expect(parsed.isPinned).toBe(false);
    expect(parsed.projectItems).toEqual(["Board"]);
  });

  it("S11 [P1] issue with null body", async () => {
    mockGh(sampleIssueJson({ body: null }));
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.body).toBeNull();
  });

  it("S12 [P2] issue number as URL", async () => {
    mockGh(sampleIssueJson());
    await callAndValidate({ number: "https://github.com/owner/repo/issues/42" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("https://github.com/owner/repo/issues/42");
  });

  it("S13 [P2] issue with empty labels and assignees", async () => {
    mockGh(sampleIssueJson({ labels: [], assignees: [] }));
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.labels).toEqual([]);
    expect(parsed.assignees).toEqual([]);
  });
});
