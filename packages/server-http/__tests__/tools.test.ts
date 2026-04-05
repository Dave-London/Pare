/**
 * Tests for HTTP tool handler functions.
 * Mocks curlCmd to avoid real HTTP calls while covering the tool handler logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/curl-runner.js", () => ({
  curlCmd: vi.fn(),
}));

import { curlCmd } from "../src/lib/curl-runner.js";
import { PARE_META_SEPARATOR } from "../src/lib/parsers.js";
import { registerRequestTool } from "../src/tools/request.js";
import { registerGetTool } from "../src/tools/get.js";
import { registerPostTool } from "../src/tools/post.js";
import { registerHeadTool } from "../src/tools/head.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<Record<string, unknown>>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

/** Build a mock curl stdout that the parser can handle. */
function mockCurlOutput(status: number, body: string, headers: Record<string, string> = {}) {
  const headerLines = [
    `HTTP/1.1 ${status} OK`,
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    "",
  ];
  const meta = [
    "0.123", // time_total
    "42", // size_download
    "0", // size_upload
    "0.001", // time_namelookup
    "0.010", // time_connect
    "0.000", // time_appconnect
    "0.011", // time_pretransfer
    "0.050", // time_starttransfer
    "1.1", // http_version
    "0", // num_redirects
    "https://example.com", // url_effective
    "HTTPS", // scheme
    "0", // ssl_verify_result
  ].join(" ");

  return headerLines.join("\r\n") + body + `\n${PARE_META_SEPARATOR}\n` + meta;
}

function mockCurl(status: number, body = "", headers: Record<string, string> = {}) {
  vi.mocked(curlCmd).mockResolvedValueOnce({
    stdout: mockCurlOutput(status, body, headers),
    stderr: "",
    exitCode: 0,
  });
}

beforeEach(() => {
  vi.mocked(curlCmd).mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════
// request tool
// ═══════════════════════════════════════════════════════════════════════════
describe("request tool handler", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    const server = new FakeServer();
    registerRequestTool(server as never);
    handler = server.tools.get("request")!.handler;
  });

  it("returns structured output for GET", async () => {
    mockCurl(200, '{"ok":true}', { "content-type": "application/json" });
    const result = await handler({ url: "https://example.com", method: "GET" });
    expect(result).toHaveProperty("structuredContent");
    expect((result.structuredContent as Record<string, unknown>).status).toBe(200);
  });

  it("passes correct args to curlCmd", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com", method: "POST", body: '{"a":1}' });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args).toContain("--data-raw");
    expect(args).toContain('{"a":1}');
    expect(args[args.length - 1]).toBe("https://example.com");
  });

  it("validates form values", async () => {
    await expect(
      handler({ url: "https://example.com", method: "POST", form: { file: "--evil" } }),
    ).rejects.toThrow(/form value/);
  });

  it("uses provided cwd", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com", method: "GET", path: "/tmp/work" });
    expect(vi.mocked(curlCmd).mock.calls[0][1]).toBe("/tmp/work");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// get tool
// ═══════════════════════════════════════════════════════════════════════════
describe("get tool handler", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    const server = new FakeServer();
    registerGetTool(server as never);
    handler = server.tools.get("get")!.handler;
  });

  it("returns structured output", async () => {
    mockCurl(200, "hello");
    const result = await handler({ url: "https://example.com" });
    expect(result).toHaveProperty("structuredContent");
    expect((result.structuredContent as Record<string, unknown>).status).toBe(200);
  });

  it("appends query params to URL", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com", queryParams: { q: "test", page: "1" } });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args[args.length - 1]).toContain("q=test");
    expect(args[args.length - 1]).toContain("page=1");
  });

  it("appends query params with & when URL already has ?", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com?existing=1", queryParams: { q: "test" } });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args[args.length - 1]).toContain("existing=1&q=test");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// post tool
// ═══════════════════════════════════════════════════════════════════════════
describe("post tool handler", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    const server = new FakeServer();
    registerPostTool(server as never);
    handler = server.tools.get("post")!.handler;
  });

  it("returns structured output for POST", async () => {
    mockCurl(201, '{"id":1}', { "content-type": "application/json" });
    const result = await handler({ url: "https://example.com/api", body: '{"name":"test"}' });
    expect(result).toHaveProperty("structuredContent");
    expect((result.structuredContent as Record<string, unknown>).status).toBe(201);
  });

  it("includes content-type header", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com", body: "data", contentType: "text/plain" });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args).toContain("-H");
    const headerIdx = args.indexOf("-H");
    expect(args[headerIdx + 1]).toContain("Content-Type: text/plain");
  });

  it("sends form data with -F flags", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com", form: { name: "test", file: "data.txt" } });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args).toContain("-F");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// head tool
// ═══════════════════════════════════════════════════════════════════════════
describe("head tool handler", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    const server = new FakeServer();
    registerHeadTool(server as never);
    handler = server.tools.get("head")!.handler;
  });

  it("returns structured output for HEAD", async () => {
    mockCurl(200, "", { "content-type": "text/html", "content-length": "5000" });
    const result = await handler({ url: "https://example.com" });
    expect(result).toHaveProperty("structuredContent");
    expect((result.structuredContent as Record<string, unknown>).status).toBe(200);
  });

  it("uses -I flag instead of -X HEAD", async () => {
    mockCurl(200);
    await handler({ url: "https://example.com" });
    const args = vi.mocked(curlCmd).mock.calls[0][0];
    expect(args).toContain("-I");
    expect(args).not.toContain("-X");
  });
});
