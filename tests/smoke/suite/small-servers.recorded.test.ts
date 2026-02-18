/**
 * Smoke tests: small servers (search, http, process) — Phase 3 (recorded)
 *
 * Feeds REAL CLI output captured from actual tool invocations through the tool
 * handlers. Validates that the parser, formatter, and schema chain works with
 * genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  SearchResultSchema,
  FindResultSchema,
} from "../../../packages/server-search/src/schemas/index.js";
import { HttpResponseSchema } from "../../../packages/server-http/src/schemas/index.js";
import { ProcessRunResultSchema } from "../../../packages/server-process/src/schemas/index.js";

// ── Mock @paretools/shared for process (uses `run` directly from shared) ────
vi.mock("@paretools/shared", async () => {
  const actual = await vi.importActual<typeof import("@paretools/shared")>("@paretools/shared");
  return { ...actual, run: vi.fn() };
});
vi.mock("../../../packages/shared/dist/runner.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, run: vi.fn() };
});

// ── Mock search runner ──────────────────────────────────────────────────────
vi.mock("../../../packages/server-search/src/lib/search-runner.js", () => ({
  rgCmd: vi.fn(),
  fdCmd: vi.fn(),
  jqCmd: vi.fn(),
}));

// ── Mock curl runner ────────────────────────────────────────────────────────
vi.mock("../../../packages/server-http/src/lib/curl-runner.js", () => ({
  curlCmd: vi.fn(),
}));

import { run } from "../../../packages/shared/dist/runner.js";
import { rgCmd, fdCmd } from "../../../packages/server-search/src/lib/search-runner.js";
import { curlCmd } from "../../../packages/server-http/src/lib/curl-runner.js";

import { registerSearchTool } from "../../../packages/server-search/src/tools/search.js";
import { registerFindTool } from "../../../packages/server-search/src/tools/find.js";
import { registerGetTool as registerHttpGetTool } from "../../../packages/server-http/src/tools/get.js";
import { registerRunTool as registerProcessRunTool } from "../../../packages/server-process/src/tools/run.js";

// ── Types & Helpers ─────────────────────────────────────────────────────────

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

const FIXTURE_BASE = resolve(__dirname, "../fixtures");

function loadFixture(dir: string, name: string): string {
  return readFileSync(resolve(FIXTURE_BASE, dir, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// search (ripgrep) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: search (ripgrep)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(rgCmd).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerSearchTool(server as never);
    handler = server.tools.get("search")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = SearchResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockRgWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(rgCmd).mockResolvedValueOnce({
      stdout: loadFixture("search/ripgrep", name),
      stderr,
      exitCode,
    });
  }

  // S1 [recorded] with matches
  it("S1 [recorded] with matches", async () => {
    mockRgWithFixture("s01-matches.txt", "", 0);
    const { parsed } = await callAndValidate({
      pattern: "dualOutput",
      path: "src/",
      compact: false,
    });
    expect(parsed.totalMatches).toBeGreaterThanOrEqual(1);
  });

  // S2 [recorded] no matches — rg exits 1 for no match
  it("S2 [recorded] no matches", async () => {
    mockRgWithFixture("s02-no-matches.txt", "", 1);
    const { parsed } = await callAndValidate({
      pattern: "nonexistentPattern123",
      path: "src/",
      compact: false,
    });
    expect(parsed.totalMatches).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// find (fd) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: find (fd)", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(fdCmd).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerFindTool(server as never);
    handler = server.tools.get("find")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = FindResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockFdWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(fdCmd).mockResolvedValueOnce({
      stdout: loadFixture("search/fd", name),
      stderr,
      exitCode,
    });
  }

  // S1 [recorded] find files
  it("S1 [recorded] find files", async () => {
    mockFdWithFixture("s01-find-files.txt", "", 0);
    const { parsed } = await callAndValidate({
      pattern: "*.ts",
      path: "src/tools/",
      compact: false,
    });
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// http get — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: http get", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(curlCmd).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerHttpGetTool(server as never);
    handler = server.tools.get("get")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = HttpResponseSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockCurlWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(curlCmd).mockResolvedValueOnce({
      stdout: loadFixture("http/get", name),
      stderr,
      exitCode,
    });
  }

  // S1 [recorded] JSON response
  it("S1 [recorded] JSON response", async () => {
    mockCurlWithFixture("s01-json-response.txt", "", 0);
    const { parsed } = await callAndValidate({ url: "https://httpbin.org/get", compact: false });
    expect(parsed.status).toBe(200);
    expect(parsed.body).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// process run — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: process run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(run).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerProcessRunTool(server as never);
    handler = server.tools.get("run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = ProcessRunResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockRunWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(run).mockResolvedValueOnce({
      stdout: loadFixture("process/run", name),
      stderr,
      exitCode,
    });
  }

  // S1 [recorded] simple command
  it("S1 [recorded] simple command", async () => {
    mockRunWithFixture("s01-simple.txt", "", 0);
    const { parsed } = await callAndValidate({
      command: "echo",
      args: ["Hello, World!"],
      compact: false,
    });
    expect(parsed.exitCode).toBe(0);
    expect(parsed.stdout).toBeDefined();
    expect(parsed.stdout).toContain("Hello");
  });
});
