/**
 * Smoke tests: github api, gist-create, label-list, label-create — Phase 2 (mocked)
 *
 * Tests these 4 tools end-to-end with mocked gh runner, validating argument
 * construction, output schema compliance, and edge case handling.
 *
 * Scenario counts:
 *   api:           26 scenarios (from github-tools.md)
 *   gist-create:   14 scenarios (from github-tools.md, note: S13 = file path validation)
 *   label-list:    10 scenarios (custom — no scenarios file yet)
 *   label-create:  12 scenarios (custom — no scenarios file yet)
 *   Total:         62 scenarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiResultSchema,
  GistCreateResultSchema,
  LabelListResultSchema,
  LabelCreateResultSchema,
} from "../../../packages/server-github/src/schemas/index.js";

// Mock the gh runner before importing tools
vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

// Mock fs/os for gist-create temp file handling and assertSafeFilePath
vi.mock("node:fs", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    mkdtempSync: vi.fn(() => "/tmp/pare-gist-mock123"),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
    lstatSync: vi.fn(() => {
      const err = new Error("ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }),
  };
});

vi.mock("node:os", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, tmpdir: vi.fn(() => "/tmp") };
});

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerApiTool } from "../../../packages/server-github/src/tools/api.js";
import { registerGistCreateTool } from "../../../packages/server-github/src/tools/gist-create.js";
import { registerLabelListTool } from "../../../packages/server-github/src/tools/label-list.js";
import { registerLabelCreateTool } from "../../../packages/server-github/src/tools/label-create.js";

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

// ── HTTP response helpers ─────────────────────────────────────────────

const HTTP_200_JSON = (body: string) =>
  `HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n${body}`;

const HTTP_204 = () => `HTTP/2.0 204 No Content\r\n\r\n`;

const HTTP_200_WITH_LINK = (body: string, next: string) =>
  `HTTP/2.0 200 OK\r\nContent-Type: application/json\r\nLink: <${next}>; rel="next"\r\n\r\n${body}`;

// =====================================================================
// 1. API TOOL — 26 scenarios
// =====================================================================
describe("Smoke: github.api", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: GET endpoint happy path ─────────────────────────────────────
  it("S1 [P0] GET endpoint happy path", async () => {
    mockGh(HTTP_200_JSON('{"name":"repo","full_name":"owner/repo"}'));
    const { parsed } = await callAndValidate({
      endpoint: "repos/owner/repo",
      method: "GET",
    });
    expect(parsed.status).toBe(200);
    expect(parsed.statusCode).toBe(200);
    expect(parsed.method).toBe("GET");
    expect(parsed.endpoint).toBe("repos/owner/repo");
    expect(parsed.body).toEqual({ name: "repo", full_name: "owner/repo" });
  });

  // ── S2: POST with body ──────────────────────────────────────────────
  it("S2 [P0] POST with body sends via stdin", async () => {
    mockGh(HTTP_200_JSON('{"number":1,"title":"Test"}'));
    const { parsed } = await callAndValidate({
      endpoint: "repos/owner/repo/issues",
      method: "POST",
      body: { title: "Test" },
    });
    expect(parsed.statusCode).toBe(200);
    expect(parsed.method).toBe("POST");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--input");
    expect(args).toContain("-");
    // Verify stdin was passed
    const opts = vi.mocked(ghCmd).mock.calls[0][1] as { cwd: string; stdin?: string };
    expect(opts.stdin).toBe('{"title":"Test"}');
  });

  // ── S3: Non-existent endpoint (404) ─────────────────────────────────
  it("S3 [P0] non-existent endpoint returns 404 status", async () => {
    mockGh("", "HTTP 404: Not Found", 1);
    const { parsed } = await callAndValidate({
      endpoint: "repos/nonexistent/repo",
      method: "GET",
    });
    expect(parsed.statusCode).not.toBe(200);
    expect(parsed.errorBody).toBeDefined();
  });

  // ── S4: Flag injection on endpoint ──────────────────────────────────
  it("S4 [P0] flag injection on endpoint is blocked", async () => {
    await expect(callAndValidate({ endpoint: "--exec=evil", method: "GET" })).rejects.toThrow();
  });

  // ── S5: Flag injection on jq ────────────────────────────────────────
  it("S5 [P0] flag injection on jq is blocked", async () => {
    await expect(
      callAndValidate({ endpoint: "repos/o/r", method: "GET", jq: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S6: Flag injection on hostname ──────────────────────────────────
  it("S6 [P0] flag injection on hostname is blocked", async () => {
    await expect(
      callAndValidate({ endpoint: "repos/o/r", method: "GET", hostname: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S7: Flag injection on cache ─────────────────────────────────────
  it("S7 [P0] flag injection on cache is blocked", async () => {
    await expect(
      callAndValidate({ endpoint: "repos/o/r", method: "GET", cache: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S8: Flag injection on preview ───────────────────────────────────
  it("S8 [P0] flag injection on preview is blocked", async () => {
    await expect(
      callAndValidate({ endpoint: "repos/o/r", method: "GET", preview: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S9: Flag injection on inputFile ─────────────────────────────────
  it("S9 [P0] flag injection on inputFile is blocked", async () => {
    await expect(
      callAndValidate({ endpoint: "repos/o/r", method: "GET", inputFile: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S10: Empty response body (DELETE 204) ───────────────────────────
  it("S10 [P0] empty response body is handled gracefully", async () => {
    mockGh(HTTP_204());
    const { parsed } = await callAndValidate({ endpoint: "repos/o/r", method: "DELETE" });
    expect(parsed.statusCode).toBe(204);
    expect(parsed.method).toBe("DELETE");
  });

  // ── S11: GraphQL query ──────────────────────────────────────────────
  it("S11 [P1] GraphQL query uses graphql endpoint", async () => {
    mockGh(HTTP_200_JSON('{"data":{"viewer":{"login":"testuser"}}}'));
    const { parsed } = await callAndValidate({
      endpoint: "graphql",
      method: "GET",
      query: "{ viewer { login } }",
    });
    expect(parsed.method).toBe("POST");
    expect(parsed.endpoint).toBe("graphql");
    expect(parsed.body).toEqual({ data: { viewer: { login: "testuser" } } });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[0]).toBe("api");
    expect(args[1]).toBe("graphql");
    expect(args).toContain("-f");
    expect(args).toContain("query={ viewer { login } }");
  });

  // ── S12: GraphQL with variables ─────────────────────────────────────
  it("S12 [P1] GraphQL with variables passes as -f flags", async () => {
    mockGh(HTTP_200_JSON('{"data":{"repository":{"name":"test"}}}'));
    await callAndValidate({
      endpoint: "graphql",
      method: "GET",
      query: "query($owner:String!){repository(owner:$owner){name}}",
      variables: { owner: "test" },
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    // Should have the query -f and the variable -f
    const fIndices = args.reduce<number[]>((acc, a, i) => (a === "-f" ? [...acc, i] : acc), []);
    expect(fIndices.length).toBeGreaterThanOrEqual(2);
    expect(args).toContain("owner=test");
  });

  // ── S13: Pagination with slurp ──────────────────────────────────────
  it("S13 [P1] pagination with slurp passes --paginate and --slurp flags", async () => {
    mockGh(HTTP_200_JSON('[{"number":1},{"number":2}]'));
    const { parsed } = await callAndValidate({
      endpoint: "repos/o/r/issues",
      method: "GET",
      paginate: true,
      slurp: true,
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--paginate");
    expect(args).toContain("--slurp");
    expect(Array.isArray(parsed.body)).toBe(true);
  });

  // ── S14: jq filter ──────────────────────────────────────────────────
  it("S14 [P1] jq filter passes --jq flag", async () => {
    mockGh(HTTP_200_JSON('"my-repo"'));
    const { parsed } = await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      jq: ".name",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--jq");
    expect(args).toContain(".name");
    expect(parsed.body).toBe("my-repo");
  });

  // ── S15: Custom headers ─────────────────────────────────────────────
  it("S15 [P1] custom headers are passed as -H flags", async () => {
    mockGh(HTTP_200_JSON("{}"));
    await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      headers: { Accept: "application/vnd.github.raw" },
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("-H");
    expect(args).toContain("Accept:application/vnd.github.raw");
  });

  // ── S16: Fields (raw-field) ─────────────────────────────────────────
  it("S16 [P1] fields sent as --raw-field pairs", async () => {
    mockGh(HTTP_200_JSON('{"name":"bug","color":"ff0000"}'));
    await callAndValidate({
      endpoint: "repos/o/r/labels",
      method: "POST",
      fields: { name: "bug", color: "ff0000" },
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--raw-field");
    expect(args).toContain("name=bug");
    expect(args).toContain("color=ff0000");
  });

  // ── S17: Typed fields ───────────────────────────────────────────────
  it("S17 [P1] typed fields sent as --field pairs", async () => {
    mockGh(HTTP_200_JSON("[]"));
    await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      typedFields: { per_page: "100" },
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--field");
    expect(args).toContain("per_page=100");
  });

  // ── S18: PATCH method ───────────────────────────────────────────────
  it("S18 [P1] PATCH method with body", async () => {
    mockGh(HTTP_200_JSON('{"description":"updated"}'));
    const { parsed } = await callAndValidate({
      endpoint: "repos/o/r",
      method: "PATCH",
      body: { description: "updated" },
    });
    expect(parsed.method).toBe("PATCH");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--method");
    expect(args).toContain("PATCH");
    expect(args).toContain("--input");
  });

  // ── S19: Response headers parsing ───────────────────────────────────
  it("S19 [P1] response headers are parsed and statusCode extracted", async () => {
    mockGh(
      `HTTP/2.0 200 OK\r\nContent-Type: application/json\r\nX-RateLimit-Remaining: 59\r\n\r\n{"ok":true}`,
    );
    const { parsed } = await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      include: true,
    });
    expect(parsed.statusCode).toBe(200);
    expect(parsed.responseHeaders).toBeDefined();
    expect(parsed.responseHeaders!["content-type"]).toBe("application/json");
  });

  // ── S20: GraphQL errors in 200 response ─────────────────────────────
  it("S20 [P1] GraphQL errors in 200 response populate graphqlErrors", async () => {
    mockGh(
      HTTP_200_JSON('{"data":null,"errors":[{"message":"Field \'invalid\' doesn\'t exist"}]}'),
    );
    const { parsed } = await callAndValidate({
      endpoint: "graphql",
      method: "GET",
      query: "{ invalid }",
    });
    expect(parsed.graphqlErrors).toBeDefined();
    expect(parsed.graphqlErrors!.length).toBeGreaterThan(0);
  });

  // ── S21: Pagination metadata ────────────────────────────────────────
  it("S21 [P1] pagination metadata includes hasNext", async () => {
    mockGh(HTTP_200_WITH_LINK('[{"number":1}]', "https://api.github.com/repos/o/r/issues?page=2"));
    const { parsed } = await callAndValidate({
      endpoint: "repos/o/r/issues",
      method: "GET",
      paginate: false,
    });
    expect(parsed.pagination).toBeDefined();
    expect(parsed.pagination!.hasNext).toBe(true);
    expect(parsed.pagination!.next).toContain("page=2");
  });

  // ── S22: Silent mode ────────────────────────────────────────────────
  it("S22 [P2] silent mode passes --silent flag", async () => {
    mockGh(HTTP_200_JSON(""));
    await callAndValidate({ endpoint: "repos/o/r", method: "GET", silent: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--silent");
  });

  // ── S23: Verbose mode ───────────────────────────────────────────────
  it("S23 [P2] verbose mode passes --verbose flag", async () => {
    mockGh(HTTP_200_JSON("{}"));
    await callAndValidate({ endpoint: "repos/o/r", method: "GET", verbose: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--verbose");
  });

  // ── S24: Cache TTL ──────────────────────────────────────────────────
  it("S24 [P2] cache TTL passes --cache flag", async () => {
    mockGh(HTTP_200_JSON("{}"));
    await callAndValidate({ endpoint: "repos/o/r", method: "GET", cache: "5m" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--cache");
    expect(args).toContain("5m");
  });

  // ── S25: Body from inputFile ────────────────────────────────────────
  it("S25 [P2] inputFile passes --input flag with file path", async () => {
    mockGh(HTTP_200_JSON("{}"));
    await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      inputFile: "/tmp/body.json",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--input");
    expect(args).toContain("/tmp/body.json");
  });

  // ── S26: Hostname for GHE ──────────────────────────────────────────
  it("S26 [P2] hostname passes --hostname flag for GHE", async () => {
    mockGh(HTTP_200_JSON("{}"));
    await callAndValidate({
      endpoint: "repos/o/r",
      method: "GET",
      hostname: "github.example.com",
    });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--hostname");
    expect(args).toContain("github.example.com");
  });
});

// =====================================================================
// 2. GIST-CREATE TOOL — 14 scenarios
// =====================================================================
describe("Smoke: github.gist-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
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

  // ── S1: Single file happy path ──────────────────────────────────────
  it("S1 [P0] single file happy path returns gist URL and ID", async () => {
    mockGh("https://gist.github.com/abc123def456");
    const { parsed } = await callAndValidate({ files: ["test.py"] });
    expect(parsed.id).toBe("abc123def456");
    expect(parsed.url).toContain("gist.github.com");
    expect(parsed.public).toBe(false);
    expect(parsed.files).toEqual(["test.py"]);
    expect(parsed.fileCount).toBe(1);
  });

  // ── S2: Inline content happy path ───────────────────────────────────
  it("S2 [P0] inline content creates gist from temp files", async () => {
    mockGh("https://gist.github.com/user/deadbeef1234");
    const { parsed } = await callAndValidate({
      content: { "script.py": "print(1)" },
    });
    expect(parsed.id).toBe("deadbeef1234");
    expect(parsed.url).toContain("gist.github.com");
    expect(parsed.files).toEqual(["script.py"]);
    expect(parsed.fileCount).toBe(1);
  });

  // ── S3: Neither files nor content provided ──────────────────────────
  it("S3 [P0] neither files nor content throws validation error", async () => {
    await expect(callAndValidate({})).rejects.toThrow(
      /either.*files.*or.*content.*must be provided/i,
    );
  });

  // ── S4: Flag injection on description ───────────────────────────────
  it("S4 [P0] flag injection on description is blocked", async () => {
    await expect(
      callAndValidate({ files: ["f.txt"], description: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S5: Flag injection on files entry ───────────────────────────────
  it("S5 [P0] flag injection on files entry is blocked", async () => {
    await expect(callAndValidate({ files: ["--exec=evil"] })).rejects.toThrow();
  });

  // ── S6: Flag injection on content filename ──────────────────────────
  it("S6 [P0] flag injection on content filename is blocked", async () => {
    await expect(callAndValidate({ content: { "--exec=evil": "data" } })).rejects.toThrow();
  });

  // ── S7: Permission denied error ─────────────────────────────────────
  it("S7 [P0] permission denied returns errorType", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ files: ["f.txt"] });
    expect(parsed.errorType).toBe("permission-denied");
    expect(parsed.errorMessage).toBeDefined();
    expect(parsed.id).toBe("");
  });

  // ── S8: Public gist ─────────────────────────────────────────────────
  it("S8 [P1] public gist passes --public flag", async () => {
    mockGh("https://gist.github.com/abc123def456");
    const { parsed } = await callAndValidate({ files: ["f.txt"], public: true });
    expect(parsed.public).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--public");
  });

  // ── S9: Multi-file gist ─────────────────────────────────────────────
  it("S9 [P1] multi-file gist includes all files", async () => {
    mockGh("https://gist.github.com/abc123def456");
    const { parsed } = await callAndValidate({ files: ["a.py", "b.py", "c.py"] });
    expect(parsed.fileCount).toBe(3);
    expect(parsed.files).toEqual(["a.py", "b.py", "c.py"]);
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("a.py");
    expect(args).toContain("b.py");
    expect(args).toContain("c.py");
  });

  // ── S10: Multi-file inline content ──────────────────────────────────
  it("S10 [P1] multi-file inline content creates temp files for each", async () => {
    mockGh("https://gist.github.com/abc123def456");
    const { parsed } = await callAndValidate({
      content: { "a.py": "x", "b.py": "y" },
    });
    expect(parsed.files).toEqual(["a.py", "b.py"]);
    expect(parsed.fileCount).toBe(2);
  });

  // ── S11: Description echo in output ─────────────────────────────────
  it("S11 [P1] description is echoed in output and passed to CLI", async () => {
    mockGh("https://gist.github.com/abc123def456");
    const { parsed } = await callAndValidate({
      files: ["f.txt"],
      description: "My gist",
    });
    expect(parsed.description).toBe("My gist");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--desc");
    expect(args).toContain("My gist");
  });

  // ── S12: Rate limit error ───────────────────────────────────────────
  it("S12 [P1] rate limit error returns errorType rate-limit", async () => {
    mockGh("", "secondary rate limit exceeded", 1);
    const { parsed } = await callAndValidate({ files: ["f.txt"] });
    expect(parsed.errorType).toBe("rate-limit");
  });

  // ── S13: File path validation (path traversal) ──────────────────────
  it("S13 [P0] path traversal in files is blocked by assertSafeFilePath", async () => {
    await expect(callAndValidate({ files: ["../../etc/passwd"] })).rejects.toThrow(
      /unsafe file path|path traversal/i,
    );
  });

  // ── S14: Temp file cleanup on error ─────────────────────────────────
  it("S14 [P2] temp directory is cleaned up even on gh failure", async () => {
    const { rmSync: rmSyncMock } = await import("node:fs");
    mockGh("", "internal error", 1);
    const { parsed } = await callAndValidate({ content: { "f.py": "data" } });
    // Should still return error result (not throw)
    expect(parsed.id).toBe("");
    expect(parsed.errorType).toBeDefined();
    // rmSync should have been called for cleanup
    expect(rmSyncMock).toHaveBeenCalled();
  });
});

// =====================================================================
// 3. LABEL-LIST TOOL — 10 scenarios (no scenarios file — custom)
// =====================================================================
describe("Smoke: github.label-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerLabelListTool(server as never);
    handler = server.tools.get("label-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LabelListResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Happy path with multiple labels ─────────────────────────────
  it("S1 [P0] happy path returns labels with correct fields", async () => {
    const labels = [
      { name: "bug", description: "Something is broken", color: "d73a4a", isDefault: true },
      { name: "enhancement", description: "New feature", color: "a2eeef", isDefault: false },
    ];
    mockGh(JSON.stringify(labels));
    const { parsed } = await callAndValidate({});
    expect(parsed.labels.length).toBe(2);
    expect(parsed.total).toBe(2);
    expect(parsed.labels[0].name).toBe("bug");
    expect(parsed.labels[0].isDefault).toBe(true);
    expect(parsed.labels[1].color).toBe("a2eeef");
  });

  // ── S2: Empty label list ────────────────────────────────────────────
  it("S2 [P0] empty label list returns empty array", async () => {
    mockGh("[]");
    const { parsed } = await callAndValidate({});
    expect(parsed.labels).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // ── S3: Repo not found ──────────────────────────────────────────────
  it("S3 [P0] repo not found returns not-found error type", async () => {
    mockGh("", "no repository could not resolve to a Repository", 1);
    const { parsed } = await callAndValidate({ repo: "nonexistent/repo" });
    expect(parsed.errorType).toBe("not-found");
    expect(parsed.errorMessage).toBeDefined();
    expect(parsed.labels).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  // ── S4: Permission denied ───────────────────────────────────────────
  it("S4 [P0] permission denied returns permission-denied error type", async () => {
    mockGh("", "HTTP 403: forbidden", 1);
    const { parsed } = await callAndValidate({ repo: "private/repo" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // ── S5: Flag injection on search ────────────────────────────────────
  it("S5 [P0] flag injection on search is blocked", async () => {
    await expect(callAndValidate({ search: "--exec=evil" })).rejects.toThrow();
  });

  // ── S6: Flag injection on repo ──────────────────────────────────────
  it("S6 [P0] flag injection on repo is blocked", async () => {
    await expect(callAndValidate({ repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── S7: Search parameter passes --search flag ───────────────────────
  it("S7 [P1] search parameter passes --search flag", async () => {
    mockGh(JSON.stringify([{ name: "bug", description: "", color: "d73a4a", isDefault: false }]));
    await callAndValidate({ search: "bug" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--search");
    expect(args).toContain("bug");
  });

  // ── S8: Limit parameter passes --limit flag ─────────────────────────
  it("S8 [P1] limit parameter passes --limit flag", async () => {
    mockGh("[]");
    await callAndValidate({ limit: 10 });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--limit");
    expect(args).toContain("10");
  });

  // ── S9: Repo parameter passes --repo flag ───────────────────────────
  it("S9 [P1] repo parameter passes --repo flag", async () => {
    mockGh("[]");
    await callAndValidate({ repo: "owner/repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/repo");
  });

  // ── S10: Default args include --json and --limit 30 ─────────────────
  it("S10 [P1] default args include --json fields and --limit 30", async () => {
    mockGh("[]");
    await callAndValidate({});
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[0]).toBe("label");
    expect(args[1]).toBe("list");
    expect(args).toContain("--json");
    expect(args).toContain("name,description,color,isDefault");
    expect(args).toContain("--limit");
    expect(args).toContain("30");
  });
});

// =====================================================================
// 4. LABEL-CREATE TOOL — 12 scenarios (no scenarios file — custom)
// =====================================================================
describe("Smoke: github.label-create", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerLabelCreateTool(server as never);
    handler = server.tools.get("label-create")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LabelCreateResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Happy path — create label with name only ────────────────────
  it("S1 [P0] create label with name only", async () => {
    mockGh("", '✓ Label "bug" created in owner/repo');
    const { parsed } = await callAndValidate({ name: "bug" });
    expect(parsed.name).toBe("bug");
    expect(parsed.errorType).toBeUndefined();
    expect(parsed.errorMessage).toBeUndefined();
  });

  // ── S2: Create with all options ─────────────────────────────────────
  it("S2 [P0] create with description and color", async () => {
    mockGh("", '✓ Label "priority" created in owner/repo');
    const { parsed } = await callAndValidate({
      name: "priority",
      description: "High priority issues",
      color: "ff0000",
    });
    expect(parsed.name).toBe("priority");
    expect(parsed.description).toBe("High priority issues");
    expect(parsed.color).toBe("ff0000");
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--description");
    expect(args).toContain("High priority issues");
    expect(args).toContain("--color");
    expect(args).toContain("ff0000");
  });

  // ── S3: Label already exists ────────────────────────────────────────
  it("S3 [P0] label already exists returns already-exists error type", async () => {
    mockGh("", 'label "bug" already exists in owner/repo', 1);
    const { parsed } = await callAndValidate({ name: "bug" });
    expect(parsed.errorType).toBe("already-exists");
    expect(parsed.errorMessage).toBeDefined();
    expect(parsed.name).toBe("bug");
  });

  // ── S4: Permission denied ───────────────────────────────────────────
  it("S4 [P0] permission denied returns permission-denied error type", async () => {
    mockGh("", "HTTP 403: forbidden", 1);
    const { parsed } = await callAndValidate({ name: "bug" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // ── S5: Flag injection on name ──────────────────────────────────────
  it("S5 [P0] flag injection on name is blocked", async () => {
    await expect(callAndValidate({ name: "--exec=evil" })).rejects.toThrow();
  });

  // ── S6: Flag injection on description ───────────────────────────────
  it("S6 [P0] flag injection on description is blocked", async () => {
    await expect(callAndValidate({ name: "bug", description: "--exec=evil" })).rejects.toThrow();
  });

  // ── S7: Flag injection on color ─────────────────────────────────────
  it("S7 [P0] flag injection on color is blocked", async () => {
    await expect(callAndValidate({ name: "bug", color: "--exec=evil" })).rejects.toThrow();
  });

  // ── S8: Flag injection on repo ──────────────────────────────────────
  it("S8 [P0] flag injection on repo is blocked", async () => {
    await expect(callAndValidate({ name: "bug", repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── S9: Validation error ────────────────────────────────────────────
  it("S9 [P0] validation error returns validation error type", async () => {
    mockGh("", "Validation Failed: unprocessable", 1);
    const { parsed } = await callAndValidate({ name: "invalid label!!!" });
    expect(parsed.errorType).toBe("validation");
    expect(parsed.errorMessage).toBeDefined();
  });

  // ── S10: Repo parameter passes --repo flag ──────────────────────────
  it("S10 [P1] repo parameter passes --repo flag", async () => {
    mockGh("", '✓ Label "bug" created in owner/other-repo');
    await callAndValidate({ name: "bug", repo: "owner/other-repo" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("owner/other-repo");
  });

  // ── S11: Default arg construction ───────────────────────────────────
  it("S11 [P1] default arg construction is correct", async () => {
    mockGh("", '✓ Label "feat" created in owner/repo');
    await callAndValidate({ name: "feat" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[0]).toBe("label");
    expect(args[1]).toBe("create");
    expect(args[2]).toBe("feat");
    // Should NOT contain --description, --color, or --repo when not provided
    expect(args).not.toContain("--description");
    expect(args).not.toContain("--color");
    expect(args).not.toContain("--repo");
  });

  // ── S12: URL extraction from output ─────────────────────────────────
  it("S12 [P1] URL is extracted from gh output when present", async () => {
    mockGh("", '✓ Label "bug" created in owner/repo\nhttps://github.com/owner/repo/labels/bug');
    const { parsed } = await callAndValidate({ name: "bug" });
    expect(parsed.url).toBe("https://github.com/owner/repo/labels/bug");
  });
});
