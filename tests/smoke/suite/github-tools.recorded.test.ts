/**
 * Smoke tests: GitHub tools — Phase 3 (recorded)
 *
 * Feeds REAL `gh` CLI output captured from actual repos through the tool
 * handlers. Validates that the parser, formatter, and schema chain works
 * with genuine CLI output.
 *
 * Covers: issue-view, issue-list, issue-create, issue-close, issue-comment,
 *         pr-view, pr-list, pr-create, pr-merge, pr-diff, run-list, run-view,
 *         release-list, api, gist-create
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  IssueViewResultSchema,
  IssueListResultSchema,
  IssueCreateResultSchema,
  IssueCloseResultSchema,
  CommentResultSchema,
  PrViewResultSchema,
  PrListResultSchema,
  PrCreateResultSchema,
  PrMergeResultSchema,
  PrDiffResultSchema,
  RunListResultSchema,
  RunViewResultSchema,
  ReleaseListResultSchema,
  ApiResultSchema,
  GistCreateResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

// Mock the gh runner
vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

// Mock path-validation used by gist-create
vi.mock("../../../packages/server-github/src/lib/path-validation.js", () => ({
  assertSafeFilePath: vi.fn(),
}));

// Mock node:fs used by gist-create for temp file creation
vi.mock("node:fs", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    mkdtempSync: vi.fn().mockReturnValue("/tmp/pare-gist-mock"),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";

import { registerIssueViewTool } from "../../../packages/server-github/src/tools/issue-view.js";
import { registerIssueListTool } from "../../../packages/server-github/src/tools/issue-list.js";
import { registerIssueCreateTool } from "../../../packages/server-github/src/tools/issue-create.js";
import { registerIssueCloseTool } from "../../../packages/server-github/src/tools/issue-close.js";
import { registerIssueCommentTool } from "../../../packages/server-github/src/tools/issue-comment.js";
import { registerPrViewTool } from "../../../packages/server-github/src/tools/pr-view.js";
import { registerPrListTool } from "../../../packages/server-github/src/tools/pr-list.js";
import { registerPrCreateTool } from "../../../packages/server-github/src/tools/pr-create.js";
import { registerPrMergeTool } from "../../../packages/server-github/src/tools/pr-merge.js";
import { registerPrDiffTool } from "../../../packages/server-github/src/tools/pr-diff.js";
import { registerRunListTool } from "../../../packages/server-github/src/tools/run-list.js";
import { registerRunViewTool } from "../../../packages/server-github/src/tools/run-view.js";
import { registerReleaseListTool } from "../../../packages/server-github/src/tools/release-list.js";
import { registerApiTool } from "../../../packages/server-github/src/tools/api.js";
import { registerGistCreateTool } from "../../../packages/server-github/src/tools/gist-create.js";

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

const FIXTURE_BASE = resolve(__dirname, "../fixtures/github");

function loadFixture(subpath: string): string {
  return readFileSync(resolve(FIXTURE_BASE, subpath), "utf-8");
}

function mockGh(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// ═══════════════════════════════════════════════════════════════════════════
// issue-view
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.issue-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] open issue", async () => {
    mockGh(loadFixture("issue-view/s01-open.txt"));
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.number).toBe(42);
    expect(parsed.state).toBe("OPEN");
    expect(parsed.title).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// issue-list
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.issue-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] multiple issues", async () => {
    const fixture = loadFixture("issue-list/s01-multiple.txt");
    // issue-list makes two ghCmd calls: main list + probe for hasMore
    mockGh(fixture);
    mockGh(fixture);
    const { parsed } = await callAndValidate({});
    expect(parsed.issues.length).toBeGreaterThanOrEqual(1);
  });

  it("S2 [recorded] empty list", async () => {
    const fixture = loadFixture("issue-list/s02-empty.txt");
    // issue-list makes two ghCmd calls: main list + probe for hasMore
    mockGh(fixture);
    mockGh(fixture);
    const { parsed } = await callAndValidate({});
    expect(parsed.issues).toEqual([]);
    expect(parsed.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// issue-create
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.issue-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] create basic issue", async () => {
    mockGh(loadFixture("issue-create/s01-basic.txt"));
    const { parsed } = await callAndValidate({ title: "Test issue", body: "Test body" });
    expect(parsed.url).toBeDefined();
    expect(parsed.number).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// issue-close
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.issue-close", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] close issue", async () => {
    mockGh(loadFixture("issue-close/s01-close.txt"));
    const { parsed } = await callAndValidate({ number: "42" });
    expect(parsed.state).toBeDefined();
    expect(parsed.number).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// issue-comment
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.issue-comment", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] add comment", async () => {
    mockGh(loadFixture("issue-comment/s01-add-comment.txt"));
    const { parsed } = await callAndValidate({ number: "42", body: "Test comment" });
    expect(parsed.url).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pr-view
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.pr-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] open PR", async () => {
    mockGh(loadFixture("pr-view/s01-open.txt"));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.number).toBe(123);
    expect(parsed.state).toBe("OPEN");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pr-list
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.pr-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerPrListTool(server as never);
    handler = server.tools.get("pr-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] multiple PRs", async () => {
    const fixture = loadFixture("pr-list/s01-multiple.txt");
    // pr-list makes two ghCmd calls: main list + count for totalAvailable
    mockGh(fixture);
    mockGh(fixture);
    const { parsed } = await callAndValidate({});
    expect(parsed.prs.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pr-create
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.pr-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] basic create", async () => {
    mockGh(loadFixture("pr-create/s01-basic.txt"));
    const { parsed } = await callAndValidate({ title: "Test PR", body: "Test body", base: "main" });
    expect(parsed.url).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pr-merge
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.pr-merge", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
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

  it("S1 [recorded] squash merge", async () => {
    mockGh(loadFixture("pr-merge/s01-squash.txt"));
    const { parsed } = await callAndValidate({ number: "123", method: "squash" });
    expect(parsed.merged).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pr-diff
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.pr-diff", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerPrDiffTool(server as never);
    handler = server.tools.get("pr-diff")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrDiffResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] with changes", async () => {
    mockGh(loadFixture("pr-diff/s01-with-changes.txt"));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.files.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// run-list
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.run-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerRunListTool(server as never);
    handler = server.tools.get("run-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RunListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] multiple runs", async () => {
    const fixture = loadFixture("run-list/s01-multiple.txt");
    // run-list makes two ghCmd calls: main list + count for totalAvailable
    mockGh(fixture);
    mockGh(fixture);
    const { parsed } = await callAndValidate({});
    expect(parsed.runs.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// run-view
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.run-view", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerRunViewTool(server as never);
    handler = server.tools.get("run-view")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RunViewResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] success run", async () => {
    mockGh(loadFixture("run-view/s01-success.txt"));
    const { parsed } = await callAndValidate({ id: 12345678 });
    expect(parsed.conclusion).toBe("success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// release-list
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.release-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerReleaseListTool(server as never);
    handler = server.tools.get("release-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ReleaseListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] with releases", async () => {
    const fixture = loadFixture("release-list/s01-releases.txt");
    // release-list makes two ghCmd calls: main list + count for totalAvailable
    mockGh(fixture);
    mockGh(fixture);
    const { parsed } = await callAndValidate({});
    expect(parsed.releases.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// api
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.api", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerApiTool(server as never);
    handler = server.tools.get("api")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ApiResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] JSON response", async () => {
    // The api tool always passes --include, so stdout contains HTTP headers + body.
    // Build a fixture with headers prepended to simulate real gh api output.
    const bodyJson = loadFixture("api/s01-json-response.txt");
    const httpResponse = `HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n${bodyJson}`;
    mockGh(httpResponse);
    const { parsed } = await callAndValidate({ endpoint: "/user", method: "GET" });
    expect(parsed.body).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// gist-create
// ═══════════════════════════════════════════════════════════════════════════

describe("Recorded: github.gist-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(ghCmd).mockReset();
    const server = new FakeServer();
    registerGistCreateTool(server as never);
    handler = server.tools.get("gist-create")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = GistCreateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  it("S1 [recorded] basic gist", async () => {
    mockGh(loadFixture("gist-create/s01-basic.txt"));
    const { parsed } = await callAndValidate({
      content: { "test.txt": "hello" },
    });
    expect(parsed.url).toBeDefined();
  });
});
