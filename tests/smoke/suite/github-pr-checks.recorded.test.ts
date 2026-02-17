/**
 * Smoke tests: github.pr-checks — Phase 3 (recorded)
 *
 * Feeds REAL `gh pr checks --json ...` output captured from actual PRs
 * through the tool handler. Validates that the parser, formatter, and
 * schema chain works with genuine CLI output.
 *
 * Fixtures sourced from:
 * - s01: Real PR #528 (Dave-London/Pare) — 9 passing checks
 * - s02–s23: Derived from real output format with modified values
 * - s06: Empty array (simulates PR with no CI configured)
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

function mockGhWithFixture(name: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({
    stdout: loadFixture(name),
    stderr,
    exitCode,
  });
}

function mockGhRaw(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
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

  // ═══════════════════════════════════════════════════════════════════
  // Happy path / core (S1–S5)
  // ═══════════════════════════════════════════════════════════════════

  it("S1 [recorded] all checks passing (PR #528)", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528" });
    expect(parsed.checks!.length).toBe(9);
    expect(parsed.summary!.passed).toBe(9);
    expect(parsed.summary!.total).toBe(9);
    expect(parsed.summary!.failed).toBe(0);
    expect(parsed.errorType).toBeUndefined();
  });

  it("S2 [recorded] mixed pass/fail/pending", async () => {
    mockGhWithFixture("s02-mixed.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(3);
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
    expect(parsed.summary!.pending).toBe(1);
  });

  it("S3 [recorded] all checks pending", async () => {
    mockGhWithFixture("s03-all-pending.txt", "", 8);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.summary!.pending).toBe(2);
    expect(parsed.summary!.passed).toBe(0);
  });

  it("S4 [recorded] single check only", async () => {
    mockGhWithFixture("s04-single.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.summary!.total).toBe(1);
  });

  it("S5 [recorded] many checks (9 real checks from PR #528)", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528" });
    const names = parsed.checks!.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(9);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Empty / no checks — #529 (S6–S8)
  // ═══════════════════════════════════════════════════════════════════

  it("S6 [recorded] empty checks returns valid schema (#529)", async () => {
    mockGhWithFixture("s06-empty-checks.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks).toEqual([]);
    expect(parsed.summary!.total).toBe(0);
  });

  it("S7 [recorded] empty JSON array from gh", async () => {
    mockGhWithFixture("s06-empty-checks.txt");
    const { parsed } = await callAndValidate({ number: "456" });
    expect(parsed.checks).toBeDefined();
    expect(parsed.checks!.length).toBe(0);
  });

  it("S8 [recorded] empty string stdout", async () => {
    mockGhRaw("");
    try {
      const { parsed } = await callAndValidate({ number: "789" });
      expect(parsed.checks?.length ?? 0).toBe(0);
    } catch (e) {
      expect(String(e)).not.toContain("Output validation error");
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // Exit code handling (S9–S12)
  // ═══════════════════════════════════════════════════════════════════

  it("S9 [recorded] exit code 0 returns normal response", async () => {
    mockGhWithFixture("s01-all-passing.txt", "", 0);
    const { parsed } = await callAndValidate({ number: "528" });
    expect(parsed.errorType).toBeUndefined();
  });

  it("S10 [recorded] exit code 8 returns valid pending response", async () => {
    mockGhWithFixture("s03-all-pending.txt", "", 8);
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(2);
    expect(parsed.summary!.pending).toBe(2);
    expect(parsed.errorType).toBeUndefined();
  });

  it("S11 [recorded] exit code 1 PR not found", async () => {
    mockGhRaw("", "Could not resolve to a PullRequest with the number of 999999", 1);
    const { parsed } = await callAndValidate({ number: "999999" });
    expect(parsed.errorType).toBe("not-found");
    expect(parsed.errorMessage).toBeDefined();
    expect(parsed.checks).toEqual([]);
  });

  it("S12 [recorded] permission denied", async () => {
    mockGhRaw("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "123", repo: "private/repo" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Deduplication (S13–S14)
  // ═══════════════════════════════════════════════════════════════════

  it("S13 [recorded] duplicate check names are deduplicated", async () => {
    mockGhWithFixture("s13-duplicates.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
  });

  it("S14 [recorded] duplicate names — later completedAt wins", async () => {
    mockGhWithFixture("s13-duplicates.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.checks![0].completedAt).toBe("2026-02-17T12:00:00Z");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Optional params (S15–S18) — arg construction with real output
  // ═══════════════════════════════════════════════════════════════════

  it("S15 [recorded] required: true passes --required flag", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    await callAndValidate({ number: "528", required: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--required");
  });

  it("S16 [recorded] compact: false returns full output", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    const { parsed } = await callAndValidate({ number: "528", compact: false });
    expect(parsed.checks!.length).toBe(9);
  });

  it("S17 [recorded] compact: true (default) returns valid schema", async () => {
    mockGhWithFixture("s02-mixed.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks).toBeDefined();
    expect(parsed.summary).toBeDefined();
  });

  it("S18 [recorded] repo passes --repo flag", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    await callAndValidate({ number: "528", repo: "Dave-London/Pare" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("Dave-London/Pare");
  });

  // ═══════════════════════════════════════════════════════════════════
  // Security (S19–S20)
  // ═══════════════════════════════════════════════════════════════════

  it("S19 [recorded] repo flag injection is blocked", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  it("S20 [recorded] number flag injection is blocked", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  // ═══════════════════════════════════════════════════════════════════
  // Data fidelity (S21–S23)
  // ═══════════════════════════════════════════════════════════════════

  it("S21 [recorded] all check fields populated from real output", async () => {
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

  it("S22 [recorded] check with missing fields defaults safely", async () => {
    mockGhRaw(JSON.stringify([{ name: "build" }]));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.checks![0].name).toBe("build");
    expect(parsed.checks![0].state).toBe("");
  });

  it("S23 [recorded] all bucket values map to summary correctly", async () => {
    mockGhWithFixture("s23-all-buckets.txt");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
    expect(parsed.summary!.pending).toBe(1);
    expect(parsed.summary!.skipped).toBe(1);
    expect(parsed.summary!.cancelled).toBe(1);
    expect(parsed.summary!.total).toBe(5);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Compact output (S24–S25)
  // ═══════════════════════════════════════════════════════════════════

  it("S24 [recorded] compact output with checks preserves summary", async () => {
    mockGhWithFixture("s02-mixed.txt");
    const { parsed } = await callAndValidate({ number: "123", compact: true });
    expect(parsed.summary!.total).toBe(3);
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
  });

  it("S25 [recorded] compact output with empty checks (#529)", async () => {
    mockGhWithFixture("s06-empty-checks.txt");
    const { parsed } = await callAndValidate({ number: "123", compact: true });
    expect(parsed.checks).toEqual([]);
    expect(parsed.summary!.total).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════════
  // Edge cases (S27–S29)
  // ═══════════════════════════════════════════════════════════════════

  it("S27 [recorded] PR number as URL string", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    await callAndValidate({ number: "https://github.com/owner/repo/pull/123" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("https://github.com/owner/repo/pull/123");
  });

  it("S28 [recorded] PR number as branch name", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    await callAndValidate({ number: "feature-branch" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("feature-branch");
  });

  it("S29 [recorded] watch: true passes --watch flag", async () => {
    mockGhWithFixture("s01-all-passing.txt");
    await callAndValidate({ number: "123", watch: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--watch");
  });
});
