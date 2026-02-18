/**
 * Smoke tests: test.run — Phase 3 (recorded)
 *
 * Feeds REAL vitest JSON reporter output captured from actual test runs through
 * the tool handler. Validates that the parser, formatter, and schema
 * chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TestRunSchema } from "../../../packages/server-test/src/schemas/index.js";

// Mock the shared runner
vi.mock("../../../packages/shared/dist/runner.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    run: vi.fn(),
  };
});

// Mock framework detection
vi.mock("../../../packages/server-test/src/lib/detect.js", () => ({
  detectFramework: vi.fn(),
}));

// Mock node:fs/promises (vitest tool reads JSON from a temp file, then cleans up)
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readFile: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

import { run } from "../../../packages/shared/dist/runner.js";
import { detectFramework } from "../../../packages/server-test/src/lib/detect.js";
import { readFile, unlink, mkdir, rm } from "node:fs/promises";
import { registerRunTool } from "../../../packages/server-test/src/tools/run.js";

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

// =============================================================================
// test.run tool (recorded)
// =============================================================================
describe("Recorded: test.run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(run).mockReset();
    vi.mocked(detectFramework).mockReset();
    vi.mocked(readFile).mockReset();

    // Re-set defaults after mockReset
    vi.mocked(unlink).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(rm).mockResolvedValue(undefined);

    const server = new FakeServer();
    registerRunTool(server as never);
    handler = server.tools.get("run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = TestRunSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [recorded] all tests pass — s01-all-pass.json, exit 0
  it("S1 [recorded] all tests pass", async () => {
    vi.mocked(detectFramework).mockResolvedValueOnce("vitest");
    vi.mocked(run).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    vi.mocked(readFile).mockResolvedValueOnce(loadFixture("test/vitest", "s01-all-pass.json"));

    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      framework: "vitest",
    });

    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary.passed).toBe(12);
    expect(parsed.summary.failed).toBe(0);
    expect(parsed.summary.total).toBe(12);
    expect(parsed.failures).toEqual([]);
  });

  // S2 [recorded] some tests fail — s02-with-failures.json, exit 1
  it("S2 [recorded] some tests fail", async () => {
    vi.mocked(detectFramework).mockResolvedValueOnce("vitest");
    vi.mocked(run).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 1 });
    vi.mocked(readFile).mockResolvedValueOnce(loadFixture("test/vitest", "s02-with-failures.json"));

    const { parsed } = await callAndValidate({
      path: "/tmp/project",
      framework: "vitest",
    });

    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary.passed).toBe(4);
    expect(parsed.summary.failed).toBe(2);
    expect(parsed.summary.total).toBe(6);
    expect(parsed.failures.length).toBeGreaterThanOrEqual(1);
  });
});
