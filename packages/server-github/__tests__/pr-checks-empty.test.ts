/**
 * Issue #1077 — `pr-checks` must never report `conclusion: "passed"` for a PR
 * with zero reported checks, and `watch: true` must survive the race between
 * pushing and GitHub registering the check runs.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { deriveConclusion, registerPrChecksTool, watchPrChecks } from "../src/tools/pr-checks.js";
import { PrChecksResultSchema, type PrChecksResult } from "../src/schemas/index.js";

interface CheckEntry {
  name: string;
  state: string;
  bucket: string;
}

function checksJson(checks: CheckEntry[]): string {
  return JSON.stringify(
    checks.map((c) => ({
      ...c,
      description: "",
      event: "pull_request",
      workflow: "CI",
      link: "",
      startedAt: "",
      completedAt: "",
    })),
  );
}

function snapshot(checks: CheckEntry[]): PrChecksResult {
  const full = checks.map((c) => ({
    ...c,
    description: "",
    event: "",
    workflow: "",
    link: "",
    startedAt: "",
    completedAt: "",
  }));
  return {
    pr: 1,
    checks: full,
    summary: {
      total: full.length,
      passed: full.filter((c) => c.bucket === "pass").length,
      failed: full.filter((c) => c.bucket === "fail").length,
      pending: full.filter((c) => c.bucket === "pending" || c.bucket === "queued").length,
      skipped: full.filter((c) => c.bucket === "skipping").length,
      cancelled: full.filter((c) => c.bucket === "cancel").length,
    },
  };
}

/** gh's response when GitHub has not registered any check runs yet. */
const NO_CHECKS_RESPONSE = {
  stdout: "",
  stderr: "no checks reported on the 'fix/some-branch' branch",
  exitCode: 1,
};

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent: Record<string, unknown>;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function makeHandler(): ToolHandler {
  const server = new FakeServer();
  registerPrChecksTool(server as never);
  return server.tools.get("pr-checks")!.handler;
}

// ── conclusion derivation ────────────────────────────────────────────

describe("deriveConclusion (#1077)", () => {
  it("returns 'none' — never 'passed' — for zero checks", () => {
    expect(deriveConclusion(snapshot([]))).toBe("none");
  });

  it("returns 'none' when the summary is missing entirely", () => {
    expect(deriveConclusion({ pr: 1 })).toBe("none");
  });

  it("returns 'passed' only when checks exist and all succeeded", () => {
    expect(
      deriveConclusion(
        snapshot([
          { name: "a", state: "SUCCESS", bucket: "pass" },
          { name: "b", state: "SUCCESS", bucket: "pass" },
        ]),
      ),
    ).toBe("passed");
  });

  it("returns 'pending' when any check is still running", () => {
    expect(
      deriveConclusion(
        snapshot([
          { name: "a", state: "SUCCESS", bucket: "pass" },
          { name: "b", state: "PENDING", bucket: "pending" },
        ]),
      ),
    ).toBe("pending");
  });

  it("returns 'failed' when a check failed, even alongside pending ones", () => {
    expect(
      deriveConclusion(
        snapshot([
          { name: "a", state: "FAILURE", bucket: "fail" },
          { name: "b", state: "PENDING", bucket: "pending" },
        ]),
      ),
    ).toBe("failed");
  });

  it("returns 'failed' for a cancelled check", () => {
    expect(deriveConclusion(snapshot([{ name: "a", state: "CANCELLED", bucket: "cancel" }]))).toBe(
      "failed",
    );
  });

  it("upholds the invariant: 'passed' implies at least one check", () => {
    const cases: PrChecksResult[] = [
      snapshot([]),
      snapshot([{ name: "a", state: "PENDING", bucket: "pending" }]),
      snapshot([{ name: "a", state: "FAILURE", bucket: "fail" }]),
      snapshot([{ name: "a", state: "SUCCESS", bucket: "pass" }]),
    ];
    for (const data of cases) {
      if (deriveConclusion(data) === "passed") {
        expect((data.checks ?? []).length).toBeGreaterThan(0);
        expect(data.summary!.failed + data.summary!.pending + data.summary!.cancelled).toBe(0);
      }
    }
  });
});

// ── one-shot (no watch) ──────────────────────────────────────────────

describe("pr-checks one-shot with zero checks (#1077)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports conclusion 'none' for an empty checks array", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "[]", stderr: "", exitCode: 0 });
    const out = await makeHandler()({ number: "12", compact: false });
    const parsed = PrChecksResultSchema.parse(out.structuredContent);

    expect(parsed.conclusion).toBe("none");
    expect(parsed.checks).toEqual([]);
  });

  it("reports conclusion 'none' + errorType 'no-checks' when gh says none are reported", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce(NO_CHECKS_RESPONSE);
    const out = await makeHandler()({ number: "12", compact: false });
    const parsed = PrChecksResultSchema.parse(out.structuredContent);

    expect(parsed.conclusion).toBe("none");
    expect(parsed.conclusion).not.toBe("passed");
    expect(parsed.errorType).toBe("no-checks");
    expect(parsed.summary!.total).toBe(0);
  });

  it("says so in the human-readable text rather than implying success", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({ stdout: "[]", stderr: "", exitCode: 0 });
    const out = await makeHandler()({ number: "12", compact: false });
    expect(out.content[0].text).toContain("NOT a passing state");
  });

  it("still reports 'passed' when checks exist and pass", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });
    const out = await makeHandler()({ number: "12", compact: false });
    expect(out.structuredContent.conclusion).toBe("passed");
  });
});

// ── watch loop ───────────────────────────────────────────────────────

describe("watchPrChecks with zero checks (#1077)", () => {
  beforeEach(() => vi.clearAllMocks());

  function fakeClock() {
    let nowMs = 0;
    return {
      now: () => nowMs,
      sleep: async (ms: number) => {
        nowMs += ms;
      },
    };
  }

  it("keeps polling while gh reports 'no checks reported', then finishes once they appear", async () => {
    vi.mocked(ghCmd)
      .mockResolvedValueOnce(NO_CHECKS_RESPONSE)
      .mockResolvedValueOnce(NO_CHECKS_RESPONSE)
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "build", state: "PENDING", bucket: "pending" }]),
        stderr: "",
        exitCode: 8,
      })
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "build", state: "SUCCESS", bucket: "pass" }]),
        stderr: "",
        exitCode: 0,
      });

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 600_000,
      settleGraceMs: 0,
      ...clock,
    });

    expect(result.pollCount).toBe(4);
    expect(result.timedOut).toBe(false);
    expect(result.neverSawChecks).toBe(false);
    expect(result.data.summary!.passed).toBe(1);
    expect(result.data.errorType).toBeUndefined();
  });

  it("keeps polling on an empty checks array rather than concluding immediately", async () => {
    vi.mocked(ghCmd)
      .mockResolvedValueOnce({ stdout: "[]", stderr: "", exitCode: 0 })
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "build", state: "SUCCESS", bucket: "pass" }]),
        stderr: "",
        exitCode: 0,
      });

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 600_000,
      settleGraceMs: 0,
      ...clock,
    });

    expect(result.pollCount).toBe(2);
    expect(result.timedOut).toBe(false);
  });

  it("times out with neverSawChecks when no check ever appears", async () => {
    vi.mocked(ghCmd).mockResolvedValue(NO_CHECKS_RESPONSE);

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 3000,
      settleGraceMs: 0,
      ...clock,
    });

    expect(result.timedOut).toBe(true);
    expect(result.neverSawChecks).toBe(true);
    expect(result.data.errorType).toBe("no-checks");
  });

  it("still bails out immediately on a real gh failure", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "could not resolve to a pull request",
      exitCode: 1,
    });

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 600_000,
      ...clock,
    });

    expect(result.pollCount).toBe(1);
    expect(result.data.errorType).toBe("not-found");
  });

  it("keeps watching inside the settle grace while gh still exits 8", async () => {
    // Every poll looks terminal, but gh's exit code 8 says otherwise. Inside
    // the grace window the exit code wins; after it, the checks do.
    vi.mocked(ghCmd)
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "build", state: "SUCCESS", bucket: "pass" }]),
        stderr: "",
        exitCode: 8,
      })
      .mockResolvedValueOnce({
        stdout: checksJson([
          { name: "build", state: "SUCCESS", bucket: "pass" },
          { name: "test", state: "SUCCESS", bucket: "pass" },
        ]),
        stderr: "",
        exitCode: 0,
      });

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 600_000,
      settleGraceMs: 30_000,
      ...clock,
    });

    expect(result.pollCount).toBe(2);
    expect(result.data.summary!.total).toBe(2);
  });

  it("trusts terminal checks once the settle grace has elapsed", async () => {
    vi.mocked(ghCmd).mockResolvedValue({
      stdout: checksJson([{ name: "build", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 8,
    });

    const clock = fakeClock();
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 5000,
      timeoutMs: 600_000,
      settleGraceMs: 10_000,
      ...clock,
    });

    // polls at t=0 (settling), t=5000 (settling), t=10000 (grace elapsed → done)
    expect(result.pollCount).toBe(3);
    expect(result.timedOut).toBe(false);
  });
});

// ── watch, through the tool handler ──────────────────────────────────

describe("pr-checks tool handler, watch with zero checks (#1077)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns timed_out — never passed — when no checks ever appear", async () => {
    vi.mocked(ghCmd).mockResolvedValue(NO_CHECKS_RESPONSE);

    // interval floor is 5s and watchTimeout 1s, so the deadline trips on the
    // first iteration without ever sleeping.
    const out = await makeHandler()({
      number: "12",
      watch: true,
      interval: 5,
      watchTimeout: 1,
      compact: false,
    });
    const parsed = PrChecksResultSchema.parse(out.structuredContent);

    expect(parsed.conclusion).toBe("timed_out");
    expect(parsed.conclusion).not.toBe("passed");
    expect(parsed.timedOut).toBe(true);
    expect(parsed.errorType).toBe("watch-timeout");
    expect(parsed.errorMessage).toContain("no checks were ever reported");
    expect(parsed.summary!.total).toBe(0);
  });

  it("returns timed_out for a persistently empty checks array too", async () => {
    vi.mocked(ghCmd).mockResolvedValue({ stdout: "[]", stderr: "", exitCode: 0 });

    const out = await makeHandler()({
      number: "12",
      watch: true,
      interval: 5,
      watchTimeout: 1,
      compact: false,
    });
    const parsed = PrChecksResultSchema.parse(out.structuredContent);

    expect(parsed.conclusion).toBe("timed_out");
    expect(parsed.timedOut).toBe(true);
  });
});
