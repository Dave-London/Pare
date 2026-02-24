import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseApi,
  parseComment,
  parseGistCreate,
  parsePrCreate,
  parsePrMerge,
  parsePrView,
  parseRunRerun,
  parseRunView,
} from "../src/lib/parsers.js";
import { registerGistCreateTool } from "../src/tools/gist-create.js";
import { registerIssueCloseTool } from "../src/tools/issue-close.js";
import { registerIssueCommentTool } from "../src/tools/issue-comment.js";
import { registerIssueCreateTool } from "../src/tools/issue-create.js";
import { registerIssueListTool } from "../src/tools/issue-list.js";
import { registerIssueUpdateTool } from "../src/tools/issue-update.js";
import { registerPrChecksTool } from "../src/tools/pr-checks.js";
import { registerPrCommentTool } from "../src/tools/pr-comment.js";
import { registerPrCreateTool } from "../src/tools/pr-create.js";
import { registerPrDiffTool } from "../src/tools/pr-diff.js";
import { registerPrListTool } from "../src/tools/pr-list.js";
import { registerPrMergeTool } from "../src/tools/pr-merge.js";
import { registerPrUpdateTool } from "../src/tools/pr-update.js";
import { registerReleaseCreateTool } from "../src/tools/release-create.js";
import { registerReleaseListTool } from "../src/tools/release-list.js";
import { registerRunListTool } from "../src/tools/run-list.js";
import { registerRunRerunTool } from "../src/tools/run-rerun.js";
import { registerRunViewTool } from "../src/tools/run-view.js";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: Record<string, unknown> }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

describe("GitHub P2 gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("#271 includes API response metadata (headers + pagination)", () => {
    const out = parseApi(
      [
        "HTTP/2.0 200 OK",
        'link: <https://api.github.com/resource?page=2>; rel="next", <https://api.github.com/resource?page=5>; rel="last"',
        "x-test: value",
        "",
        "[]",
      ].join("\r\n"),
      0,
      "/resource",
      "GET",
    );
    expect(out.responseHeaders?.["x-test"]).toBe("value");
    expect(out.pagination?.hasNext).toBe(true);
    expect(out.pagination?.next).toBe("https://api.github.com/resource?page=2");
    expect(out.pagination?.last).toBe("https://api.github.com/resource?page=5");
  });

  it("#272 detects GraphQL errors in API responses", () => {
    const out = parseApi(
      JSON.stringify({ data: null, errors: [{ message: "Validation failed" }] }),
      0,
      "graphql",
      "POST",
    );
    expect(out.graphqlErrors).toEqual([{ message: "Validation failed" }]);
  });

  it("#273 improves gist ID extraction robustness", () => {
    const out = parseGistCreate(
      "https://gist.github.com/octocat/abcdef1234567890?file=main.ts\n",
      true,
    );
    expect(out.id).toBe("abcdef1234567890");
  });

  it("#274 returns typed gist-create errors", async () => {
    const server = new FakeServer();
    registerGistCreateTool(server as never);
    const handler = server.tools.get("gist-create")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "HTTP 403 Forbidden",
      exitCode: 1,
    });

    const out = await handler({ content: { "main.ts": "console.log(1);" } });
    expect(out.structuredContent.errorType).toBe("permission-denied");
  });

  it("#275 returns typed issue-close errors", async () => {
    const server = new FakeServer();
    registerIssueCloseTool(server as never);
    const handler = server.tools.get("issue-close")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "", stderr: "forbidden", exitCode: 1 });

    const out = await handler({ number: "12" });
    expect(out.structuredContent.errorType).toBe("permission-denied");
  });

  it("#276 returns typed issue-comment errors", async () => {
    const server = new FakeServer();
    registerIssueCommentTool(server as never);
    const handler = server.tools.get("issue-comment")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "body cannot be blank",
      exitCode: 1,
    });

    const out = await handler({ number: "12", body: "x" });
    expect(out.structuredContent.errorType).toBe("validation");
  });

  it("#277 models issue-comment operations distinctly", () => {
    const out = parseComment("https://github.com/o/r/issues/1#issuecomment-42", {
      operation: "edit",
      issueNumber: 1,
    });
    expect(out.operation).toBe("edit");
    expect(out.issueNumber).toBe(1);
    expect(out.commentId).toBe("42");
  });

  it("#278 returns typed issue-create errors", async () => {
    const server = new FakeServer();
    registerIssueCreateTool(server as never);
    const handler = server.tools.get("issue-create")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "Validation Failed",
      exitCode: 1,
    });

    const out = await handler({ title: "Bug", body: "Details" });
    expect(out.structuredContent.errorType).toBe("validation");
  });

  it("#279 supports partial recovery for issue-create failures", async () => {
    const server = new FakeServer();
    registerIssueCreateTool(server as never);
    const handler = server.tools.get("issue-create")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/o/r/issues/77\n",
      stderr: "post-create hook failed",
      exitCode: 1,
    });

    const out = await handler({ title: "Bug", body: "Details" });
    expect(out.structuredContent.partial).toBe(true);
    expect(out.structuredContent.errorType).toBe("partial-created");
    expect(out.structuredContent.number).toBe(77);
  });

  it("#280 issue-list returns correct results", async () => {
    const server = new FakeServer();
    registerIssueListTool(server as never);
    const handler = server.tools.get("issue-list")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([
        { number: 1, state: "open", title: "A", url: "u1" },
        { number: 2, state: "open", title: "B", url: "u2" },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ limit: 2, paginate: false, compact: false });
    expect(vi.mocked(ghCmd).mock.calls).toHaveLength(1);
    expect((out.structuredContent.issues as unknown[]).length).toBe(2);
  });

  it("#281 enriches issue-update response with updated fields", async () => {
    const server = new FakeServer();
    registerIssueUpdateTool(server as never);
    const handler = server.tools.get("issue-update")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/o/r/issues/5\n",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ number: "5", title: "New title", addLabels: ["bug"] });
    expect(out.structuredContent.updatedFields).toContain("title");
    expect(out.structuredContent.updatedFields).toContain("labels");
  });

  it("#282 returns typed issue-update errors", async () => {
    const server = new FakeServer();
    registerIssueUpdateTool(server as never);
    const handler = server.tools.get("issue-update")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "forbidden",
      exitCode: 1,
    });

    const out = await handler({ number: "5", title: "X" });
    expect(out.structuredContent.errorType).toBe("permission-denied");
  });

  it("#283 returns typed pr-checks errors", async () => {
    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "forbidden",
      exitCode: 1,
    });

    const out = await handler({ number: "9", compact: false });
    expect(out.structuredContent.errorType).toBe("permission-denied");
  });

  it("#284 returns typed pr-comment errors", async () => {
    const server = new FakeServer();
    registerPrCommentTool(server as never);
    const handler = server.tools.get("pr-comment")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "no pull request found",
      exitCode: 1,
    });

    const out = await handler({ number: "9", body: "x" });
    expect(out.structuredContent.errorType).toBe("not-found");
  });

  it("#285 enriches pr-create output with request metadata", () => {
    const out = parsePrCreate("https://github.com/o/r/pull/100\n", {
      draft: true,
    });
    expect(out.draft).toBe(true);
    expect(out.number).toBe(100);
    expect(out.url).toBe("https://github.com/o/r/pull/100");
  });

  it("#286 returns typed pr-create errors", async () => {
    const server = new FakeServer();
    registerPrCreateTool(server as never);
    const handler = server.tools.get("pr-create")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "No commits between base and head",
      exitCode: 1,
    });

    const out = await handler({ title: "X", body: "Y" });
    expect(out.structuredContent.errorType).toBe("no-commits");
  });

  it("#287 hardens rename parsing in pr-diff", async () => {
    const server = new FakeServer();
    registerPrDiffTool(server as never);
    const handler = server.tools.get("pr-diff")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: [
        'diff --git "a/src/old name.ts" "b/src/new name.ts"',
        "similarity index 98%",
        "rename from src/old name.ts",
        "rename to src/new name.ts",
        "index 1c002dd..23d30df 100644",
        '--- "a/src/old name.ts"',
        '+++ "b/src/new name.ts"',
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ number: "14", compact: false });
    const file = (out.structuredContent.files as Array<Record<string, unknown>>)[0];
    expect(file.file).toBe("src/new name.ts");
    expect(file.oldFile).toBe("src/old name.ts");
    expect(file.status).toBe("renamed");
  });

  it("#288 pr-list returns correct results", async () => {
    const server = new FakeServer();
    registerPrListTool(server as never);
    const handler = server.tools.get("pr-list")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          number: 1,
          state: "open",
          title: "A",
          url: "u",
          headRefName: "a",
          author: { login: "x" },
        },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ limit: 1, compact: false });
    expect((out.structuredContent.prs as unknown[]).length).toBe(1);
  });

  it("#289 returns typed pr-merge errors", async () => {
    const server = new FakeServer();
    registerPrMergeTool(server as never);
    const handler = server.tools.get("pr-merge")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "merge conflict in src/index.ts",
      exitCode: 1,
    });

    const out = await handler({ number: "22", method: "squash" });
    expect(out.structuredContent.errorType).toBe("merge-conflict");
  });

  it("#290 parses actual merge method from output", () => {
    const out = parsePrMerge(
      "Squashed and merged pull request #22 in o/r\nhttps://github.com/o/r/pull/22",
      22,
      "merge",
    );
    expect(out.method).toBe("squash");
  });

  it("#291 enriches pr-update response with updated fields", async () => {
    const server = new FakeServer();
    registerPrUpdateTool(server as never);
    const handler = server.tools.get("pr-update")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/o/r/pull/22\n",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ number: "22", base: "main", addReviewers: ["octocat"] });
    expect(out.structuredContent.updatedFields).toContain("base");
    expect(out.structuredContent.updatedFields).toContain("reviewers");
  });

  it("#292 tracks operation-level pr-update intent", async () => {
    const server = new FakeServer();
    registerPrUpdateTool(server as never);
    const handler = server.tools.get("pr-update")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/o/r/pull/22\n",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ number: "22", base: "main", addReviewers: ["octocat"] });
    expect(out.structuredContent.operations).toContain("set-base");
    expect(out.structuredContent.operations).toContain("add-reviewer");
  });

  it("#293 adds commit summary to pr-view output", () => {
    const out = parsePrView(
      JSON.stringify({
        number: 12,
        state: "OPEN",
        title: "Update API",
        body: "Body",
        mergeable: "MERGEABLE",
        reviewDecision: "APPROVED",
        statusCheckRollup: [],
        url: "https://github.com/o/r/pull/12",
        headRefName: "feature",
        baseRefName: "main",
        additions: 10,
        deletions: 2,
        changedFiles: 1,
        commits: [{ oid: "abc" }, { oid: "def" }],
      }),
    );
    expect(out.commitCount).toBe(2);
    expect(out.latestCommitSha).toBe("def");
  });

  it("#294 returns typed release-create errors", async () => {
    const server = new FakeServer();
    registerReleaseCreateTool(server as never);
    const handler = server.tools.get("release-create")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "tag already exists",
      exitCode: 1,
    });

    const out = await handler({ tag: "v1.0.0" });
    expect(out.structuredContent.errorType).toBe("tag-conflict");
  });

  it("#295 release-list returns correct results", async () => {
    const server = new FakeServer();
    registerReleaseListTool(server as never);
    const handler = server.tools.get("release-list")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          tagName: "v1.0.0",
          name: "v1.0.0",
          isDraft: false,
          isPrerelease: false,
          publishedAt: "2025-01-01T00:00:00Z",
          url: "u1",
        },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ limit: 1, compact: false });
    expect((out.structuredContent.releases as unknown[]).length).toBe(1);
  });

  it("#296 run-list returns correct results", async () => {
    const server = new FakeServer();
    registerRunListTool(server as never);
    const handler = server.tools.get("run-list")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          databaseId: 10,
          status: "completed",
          conclusion: "success",
          name: "build",
          workflowName: "CI",
          headBranch: "main",
          url: "u1",
          createdAt: "2025-01-01T00:00:00Z",
        },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ limit: 1, compact: false });
    expect((out.structuredContent.runs as unknown[]).length).toBe(1);
  });

  it("#297 distinguishes run-rerun request mode in status field", () => {
    const out = parseRunRerun("", "", 33, false, "123456");
    expect(out.status).toBe("requested-job");
    expect(out.job).toBe("123456");
  });

  it("#298 returns typed run-rerun errors", async () => {
    const server = new FakeServer();
    registerRunRerunTool(server as never);
    const handler = server.tools.get("run-rerun")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "workflow run is in progress",
      exitCode: 1,
    });

    const out = await handler({ runId: 33 });
    expect(out.structuredContent.status).toBe("error");
    expect(out.structuredContent.errorType).toBe("in-progress");
  });

  it("#299 includes run-view extended fields (including updatedAt)", async () => {
    const server = new FakeServer();
    registerRunViewTool(server as never);
    const handler = server.tools.get("run-view")!.handler;
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: JSON.stringify({
        databaseId: 99,
        status: "completed",
        conclusion: "success",
        name: "build",
        workflowName: "CI",
        headBranch: "main",
        jobs: [],
        url: "https://github.com/o/r/actions/runs/99",
        createdAt: "2025-01-01T00:00:00Z",
        headSha: "abc123",
        event: "push",
        startedAt: "2025-01-01T00:00:10Z",
        updatedAt: "2025-01-01T00:01:10Z",
        attempt: 2,
      }),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ id: 99, compact: false });
    const args = vi.mocked(ghCmd).mock.calls[0][0].join(",");
    expect(args).toContain("updatedAt");
    expect(out.structuredContent.updatedAt).toBe("2025-01-01T00:01:10Z");
  });

  it("#300 parses run-view timestamps correctly", () => {
    const out = parseRunView(
      JSON.stringify({
        databaseId: 1,
        status: "completed",
        conclusion: "success",
        name: "build",
        workflowName: "CI",
        headBranch: "main",
        jobs: [],
        url: "u",
        createdAt: "2025-01-01T00:00:00Z",
        startedAt: "2025-01-01T00:00:10Z",
        updatedAt: "2025-01-01T00:01:10Z",
      }),
    );
    expect(out.startedAt).toBe("2025-01-01T00:00:10Z");
    expect(out.updatedAt).toBe("2025-01-01T00:01:10Z");
  });
});
