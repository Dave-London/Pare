/**
 * Smoke tests: github.pr-checks — Phase 2 (mocked)
 *
 * Tests the pr-checks tool end-to-end with mocked gh runner,
 * validating argument construction, output schema compliance,
 * and edge case handling. Specifically targets bug #529
 * (empty checks crash).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
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

function mockGh(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(ghCmd).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

/** Sample check data for reuse across tests */
const SAMPLE_CHECK = {
  name: "build-and-test",
  state: "SUCCESS",
  bucket: "pass",
  description: "",
  event: "pull_request",
  workflow: "CI",
  link: "https://github.com/owner/repo/actions/runs/123",
  startedAt: "2026-02-17T10:00:00Z",
  completedAt: "2026-02-17T10:05:00Z",
};

const PENDING_CHECK = {
  ...SAMPLE_CHECK,
  name: "lint",
  state: "PENDING",
  bucket: "pending",
  completedAt: "",
};

const FAILED_CHECK = {
  ...SAMPLE_CHECK,
  name: "test-windows",
  state: "FAILURE",
  bucket: "fail",
};

describe("Smoke: github.pr-checks", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPrChecksTool(server as never);
    handler = server.tools.get("pr-checks")!.handler;
  });

  /** Helper: call handler and validate output schema */
  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    // Validate against Zod schema
    const parsed = PrChecksResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── Scenario 1: All checks passing ─────────────────────────────────
  it("S1 [P0] all checks passing", async () => {
    const checks = [SAMPLE_CHECK, { ...SAMPLE_CHECK, name: "lint" }];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(2);
    expect(parsed.summary!.passed).toBe(2);
    expect(parsed.summary!.total).toBe(2);
    expect(parsed.summary!.failed).toBe(0);
  });

  // ── Scenario 2: Mixed pass/fail/pending ────────────────────────────
  it("S2 [P0] mixed pass/fail/pending checks", async () => {
    const checks = [SAMPLE_CHECK, FAILED_CHECK, PENDING_CHECK];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(3);
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
    expect(parsed.summary!.pending).toBe(1);
  });

  // ── Scenario 3: All checks pending ─────────────────────────────────
  it("S3 [P0] all checks pending", async () => {
    const checks = [PENDING_CHECK, { ...PENDING_CHECK, name: "build" }];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.summary!.pending).toBe(2);
    expect(parsed.summary!.passed).toBe(0);
  });

  // ── Scenario 6: PR with no CI checks (BUG #529) ───────────────────
  it("S6 [P0] PR with no checks returns empty array, not crash (#529)", async () => {
    mockGh("[]");
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks).toEqual([]);
    expect(parsed.summary!.total).toBe(0);
  });

  // ── Scenario 7: Empty JSON array from gh ───────────────────────────
  it("S7 [P0] empty JSON array stdout", async () => {
    mockGh("[]");
    const { parsed } = await callAndValidate({ number: "456" });
    expect(parsed.checks).toBeDefined();
    expect(parsed.checks!.length).toBe(0);
  });

  // ── Scenario 8: Empty string stdout ────────────────────────────────
  it("S8 [P0] empty string stdout", async () => {
    // gh returns empty string when no checks — parser must handle this
    mockGh("");
    // This may throw or return error — either is acceptable, but it must NOT
    // be a Zod validation crash. It should be a handled error.
    try {
      const { parsed } = await callAndValidate({ number: "789" });
      // If it succeeds, checks should be empty
      expect(parsed.checks?.length ?? 0).toBe(0);
    } catch (e) {
      // If it throws, it should be a meaningful error, not a Zod crash
      expect(String(e)).not.toContain("Output validation error");
      expect(String(e)).not.toContain("invalid_type");
    }
  });

  // ── Scenario 9: Exit code 0 ────────────────────────────────────────
  it("S9 [P0] exit code 0 returns normal response", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.errorType).toBeUndefined();
    expect(parsed.errorMessage).toBeUndefined();
  });

  // ── Scenario 10: Exit code 8 (pending) ─────────────────────────────
  it("S10 [P0] exit code 8 returns valid pending response, not error", async () => {
    mockGh(JSON.stringify([PENDING_CHECK]), "", 8);
    const { parsed } = await callAndValidate({ number: "123" });
    // Exit code 8 should NOT throw — it means checks are pending
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.summary!.pending).toBe(1);
    expect(parsed.errorType).toBeUndefined();
  });

  // ── Scenario 11: Exit code 1 (not found) ───────────────────────────
  it("S11 [P0] exit code 1 PR not found returns error type", async () => {
    mockGh("", "Could not resolve to a PullRequest", 1);
    const { parsed } = await callAndValidate({ number: "999999" });
    expect(parsed.errorType).toBe("not-found");
    expect(parsed.errorMessage).toBeDefined();
    expect(parsed.checks).toEqual([]);
  });

  // ── Scenario 12: Permission denied ─────────────────────────────────
  it("S12 [P1] permission denied returns error type", async () => {
    mockGh("", "HTTP 403: Forbidden", 1);
    const { parsed } = await callAndValidate({ number: "123", repo: "private/repo" });
    expect(parsed.errorType).toBe("permission-denied");
  });

  // ── Scenario 13: Duplicate check names (dedup) ─────────────────────
  it("S13 [P1] duplicate check names are deduplicated", async () => {
    const checks = [
      { ...SAMPLE_CHECK, completedAt: "2026-02-17T10:00:00Z" },
      { ...SAMPLE_CHECK, completedAt: "2026-02-17T10:10:00Z" }, // later = kept
    ];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1); // deduplicated
  });

  // ── Scenario 15: required flag ─────────────────────────────────────
  it("S15 [P1] required: true passes --required flag", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "123", required: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--required");
  });

  // ── Scenario 16: compact: false ────────────────────────────────────
  it("S16 [P1] compact: false returns full output", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    const { parsed } = await callAndValidate({ number: "123", compact: false });
    // Should still validate against schema
    expect(parsed.checks!.length).toBe(1);
  });

  // ── Scenario 18: repo flag ─────────────────────────────────────────
  it("S18 [P1] repo passes --repo flag", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "123", repo: "Dave-London/Pare" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--repo");
    expect(args).toContain("Dave-London/Pare");
  });

  // ── Scenario 19: repo flag injection ───────────────────────────────
  it("S19 [P0] repo flag injection is blocked", async () => {
    await expect(callAndValidate({ number: "123", repo: "--exec=evil" })).rejects.toThrow();
  });

  // ── Scenario 20: number flag injection ─────────────────────────────
  it("S20 [P0] number flag injection is blocked", async () => {
    await expect(callAndValidate({ number: "--exec=evil" })).rejects.toThrow();
  });

  // ── Scenario 22: Check with empty/null fields ──────────────────────
  it("S22 [P1] check with missing fields defaults to empty strings", async () => {
    const sparseCheck = { name: "build" }; // all other fields missing
    mockGh(JSON.stringify([sparseCheck]));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.checks![0].name).toBe("build");
    expect(parsed.checks![0].state).toBe("");
  });

  // ── Scenario 25: Compact output empty checks (#529 variant) ────────
  it("S25 [P0] compact output with empty checks does not crash", async () => {
    mockGh("[]");
    // compact: true is default — this is the exact scenario from bug #529
    const { parsed } = await callAndValidate({ number: "123", compact: true });
    expect(parsed.checks).toEqual([]);
  });

  // ── Scenario 26: Schema validation on all scenarios ────────────────
  it("S26 [P0] argument construction is correct for default call", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "123" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[0]).toBe("pr");
    expect(args[1]).toBe("checks");
    expect(args[2]).toBe("123");
    expect(args).toContain("--json");
  });

  // ── Scenario 4: Single check only ───────────────────────────────────
  it("S4 [P1] single check only", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.summary!.total).toBe(1);
    expect(parsed.summary!.passed).toBe(1);
  });

  // ── Scenario 5: Many checks (10+) ──────────────────────────────────
  it("S5 [P1] many checks (10+) all parsed correctly", async () => {
    const checks = Array.from({ length: 12 }, (_, i) => ({
      ...SAMPLE_CHECK,
      name: `check-${i}`,
    }));
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(12);
    expect(parsed.summary!.total).toBe(12);
    expect(parsed.summary!.passed).toBe(12);
  });

  // ── Scenario 14: Duplicate names, different completedAt ─────────────
  it("S14 [P1] duplicate names — later completedAt wins", async () => {
    const checks = [
      { ...SAMPLE_CHECK, name: "build", completedAt: "2026-02-17T10:00:00Z" },
      { ...SAMPLE_CHECK, name: "build", completedAt: "2026-02-17T12:00:00Z" },
    ];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.checks!.length).toBe(1);
    expect(parsed.checks![0].completedAt).toBe("2026-02-17T12:00:00Z");
  });

  // ── Scenario 17: compact: true (default) ────────────────────────────
  it("S17 [P1] compact: true (default) returns schema-valid output", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK, FAILED_CHECK]));
    const { parsed } = await callAndValidate({ number: "123" });
    // Default compact=true — verify schema compliance
    expect(parsed.checks).toBeDefined();
    expect(parsed.summary).toBeDefined();
  });

  // ── Scenario 21: All check fields populated ─────────────────────────
  it("S21 [P1] all check fields are preserved", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    const { parsed } = await callAndValidate({ number: "123" });
    const check = parsed.checks![0];
    expect(check.name).toBe("build-and-test");
    expect(check.state).toBe("SUCCESS");
    expect(check.bucket).toBe("pass");
    expect(check.workflow).toBe("CI");
    expect(check.link).toContain("https://");
    expect(check.startedAt).toBeDefined();
    expect(check.completedAt).toBeDefined();
  });

  // ── Scenario 23: Bucket values map to summary ──────────────────────
  it("S23 [P1] bucket values map correctly to summary counts", async () => {
    const SKIPPED_CHECK = {
      ...SAMPLE_CHECK,
      name: "optional",
      state: "NEUTRAL",
      bucket: "skipping",
    };
    const CANCELLED_CHECK = {
      ...SAMPLE_CHECK,
      name: "cancelled",
      state: "CANCELLED",
      bucket: "cancel",
    };
    const checks = [SAMPLE_CHECK, FAILED_CHECK, PENDING_CHECK, SKIPPED_CHECK, CANCELLED_CHECK];
    mockGh(JSON.stringify(checks));
    const { parsed } = await callAndValidate({ number: "123" });
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
    expect(parsed.summary!.pending).toBe(1);
    expect(parsed.summary!.skipped).toBe(1);
    expect(parsed.summary!.cancelled).toBe(1);
    expect(parsed.summary!.total).toBe(5);
  });

  // ── Scenario 24: Compact output with checks ─────────────────────────
  it("S24 [P2] compact output with checks preserves summary", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK, FAILED_CHECK]));
    const { parsed } = await callAndValidate({ number: "123", compact: true });
    expect(parsed.summary!.total).toBe(2);
    expect(parsed.summary!.passed).toBe(1);
    expect(parsed.summary!.failed).toBe(1);
  });

  // ── Scenario 27: PR number as URL string ────────────────────────────
  it("S27 [P2] PR number as URL string passes to gh correctly", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "https://github.com/owner/repo/pull/123" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("https://github.com/owner/repo/pull/123");
  });

  // ── Scenario 28: PR number as branch name ───────────────────────────
  it("S28 [P2] PR number as branch name passes to gh correctly", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "feature-branch" });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args[2]).toBe("feature-branch");
  });

  // ── Scenario 29: watch: true ────────────────────────────────────────
  it("S29 [P2] watch: true passes --watch flag", async () => {
    mockGh(JSON.stringify([SAMPLE_CHECK]));
    await callAndValidate({ number: "123", watch: true });
    const args = vi.mocked(ghCmd).mock.calls[0][0];
    expect(args).toContain("--watch");
  });
});
