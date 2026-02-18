/**
 * Smoke tests: build.tsc — Phase 3 (recorded)
 *
 * Feeds REAL `tsc` output captured from actual TypeScript projects through
 * the tool handler. Validates that the parser, formatter, and schema
 * chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TscResultSchema } from "../../../packages/server-build/src/schemas/index.js";

// Mock the build runner module used by all build tools
vi.mock("../../../packages/server-build/src/lib/build-runner.js", () => ({
  runBuildCommand: vi.fn(),
  esbuildCmd: vi.fn(),
  tsc: vi.fn(),
  turboCmd: vi.fn(),
  viteCmd: vi.fn(),
  webpackCmd: vi.fn(),
  nxCmd: vi.fn(),
}));

// Mock fs for esbuild metafile and turbo summary
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

import { tsc } from "../../../packages/server-build/src/lib/build-runner.js";
import { registerTscTool } from "../../../packages/server-build/src/tools/tsc.js";

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

const FIXTURE_DIR = resolve(__dirname, "../fixtures/build/tsc");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

function mockTscWithFixture(name: string, stderr = "", exitCode = 0) {
  vi.mocked(tsc).mockResolvedValueOnce({
    stdout: loadFixture(name),
    stderr,
    exitCode,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// tsc tool (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: build.tsc", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(tsc).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerTscTool(server as never);
    handler = server.tools.get("tsc")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = TscResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [recorded] clean compilation — tsc exits 0 with empty output
  it("S1 [recorded] clean compilation", async () => {
    mockTscWithFixture("s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project", noEmit: true });
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });

  // S2 [recorded] compilation with errors — tsc exits non-zero with diagnostics
  it("S2 [recorded] compilation with errors", async () => {
    mockTscWithFixture("s02-errors.txt", "", 2);
    const { parsed } = await callAndValidate({ path: "/tmp/project", noEmit: true });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics.length).toBeGreaterThanOrEqual(1);
    expect(parsed.errors).toBeGreaterThan(0);
  });

  // S3 [recorded] empty output — empty stdout, exit 0 (same as clean)
  it("S3 [recorded] empty output", async () => {
    vi.mocked(tsc).mockResolvedValueOnce({
      stdout: "",
      stderr: "",
      exitCode: 0,
    });
    const { parsed } = await callAndValidate({ path: "/tmp/project", noEmit: true });
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });
});
