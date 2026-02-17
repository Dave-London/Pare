/**
 * Smoke tests: github.pr-checks — Phase 3 (recorded)
 *
 * Feeds REAL `gh pr checks --json ...` output captured from actual PRs
 * through the tool handler. Validates that the parser, formatter, and
 * schema chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrChecksResultSchema } from "../../../packages/server-github/src/schemas/index.js";

// Mock the gh runner
vi.mock("../../../packages/server-github/src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../../../packages/server-github/src/lib/gh-runner.js";
import { registerPrChecksTool } from "../../../packages/server-github/src/tools/pr-checks.js";

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

const FIXTURE_DIR = resolve(__dirname, "../fixtures/github/pr-checks");

function loadFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
}

function mockGhWithFixture(name: string, exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({
    stdout: loadFixture(name),
    stderr: "",
    exitCode,
  });
}

describe("Recorded: github.pr-checks", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrChecksTool(server as never);
    handler = server.tools.get("pr-checks")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PrChecksResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: All checks passing — real PR #528 output (recorded) ───────
  it("S1 [recorded] all checks passing (PR #528)", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528" });
    expect(parsed.checks!.length).toBe(9);
    expect(parsed.summary!.passed).toBe(9);
    expect(parsed.summary!.total).toBe(9);
    expect(parsed.summary!.failed).toBe(0);
    expect(parsed.summary!.pending).toBe(0);
    expect(parsed.errorType).toBeUndefined();
  });

  // ── S1b: Verify real check field data ─────────────────────────────
  it("S1b [recorded] check fields are populated from real output", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528" });
    const check = parsed.checks![0];
    expect(check.name).toBeDefined();
    expect(check.name.length).toBeGreaterThan(0);
    expect(check.state).toBe("SUCCESS");
    expect(check.bucket).toBe("pass");
    expect(check.workflow).toBe("CI");
    expect(check.link).toContain("https://github.com/");
    expect(check.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(check.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ── S5: Many checks — real PR #528 has 9 checks ──────────────────
  it("S5 [recorded] many checks parsed correctly (9 real checks)", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528" });
    // Verify dedup: all 9 have unique names
    const names = parsed.checks!.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // ── S6: Empty checks — #529 bug scenario (recorded) ──────────────
  it("S6 [recorded] empty checks returns valid schema, not crash (#529)", async () => {
    mockGhWithFixture("s06-empty-checks.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks).toEqual([]);
    expect(parsed.summary!.total).toBe(0);
  });

  // ── S25: Compact output with empty checks (recorded) ─────────────
  it("S25 [recorded] compact output with empty checks (#529)", async () => {
    mockGhWithFixture("s06-empty-checks.txt");
    const { parsed } = await callAndValidate({ number: "123", compact: true });
    expect(parsed.checks).toEqual([]);
    expect(parsed.summary!.total).toBe(0);
  });
});
