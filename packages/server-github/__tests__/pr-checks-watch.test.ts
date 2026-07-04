import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { watchPrChecks, registerPrChecksTool } from "../src/tools/pr-checks.js";

interface CheckEntry {
  name: string;
  state: string;
  bucket: string;
  description?: string;
  event?: string;
  workflow?: string;
  link?: string;
  startedAt?: string;
  completedAt?: string;
}

function checksJson(checks: CheckEntry[]): string {
  return JSON.stringify(
    checks.map((c) => ({
      name: c.name,
      state: c.state,
      bucket: c.bucket,
      description: c.description ?? "",
      event: c.event ?? "pull_request",
      workflow: c.workflow ?? "CI",
      link: c.link ?? "",
      startedAt: c.startedAt ?? "",
      completedAt: c.completedAt ?? "",
    })),
  );
}

describe("watchPrChecks (#844 — watch via internal polling)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately on the first poll when all checks are non-pending", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });

    const sleepCalls: number[] = [];
    let nowMs = 0;
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 60_000,
      sleep: async (ms) => {
        sleepCalls.push(ms);
        nowMs += ms;
      },
      now: () => nowMs,
    });

    expect(result.timedOut).toBe(false);
    expect(result.pollCount).toBe(1);
    expect(sleepCalls).toEqual([]); // never slept — completed on first poll
    expect(result.data.summary?.passed).toBe(1);
    expect(result.data.summary?.pending).toBe(0);
  });

  it("polls until all pending checks complete", async () => {
    // First poll: one pending. Second poll: also pending (queued). Third: complete.
    vi.mocked(ghCmd)
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "deploy", state: "PENDING", bucket: "pending" }]),
        stderr: "",
        exitCode: 8,
      })
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "deploy", state: "QUEUED", bucket: "queued" }]),
        stderr: "",
        exitCode: 8,
      })
      .mockResolvedValueOnce({
        stdout: checksJson([{ name: "deploy", state: "SUCCESS", bucket: "pass" }]),
        stderr: "",
        exitCode: 0,
      });

    let nowMs = 0;
    const sleepCalls: number[] = [];
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 60_000,
      sleep: async (ms) => {
        sleepCalls.push(ms);
        nowMs += ms;
      },
      now: () => nowMs,
    });

    expect(result.timedOut).toBe(false);
    expect(result.pollCount).toBe(3);
    expect(sleepCalls).toEqual([1000, 1000]);
    expect(result.data.summary?.passed).toBe(1);
    expect(result.data.summary?.pending).toBe(0);
    expect(vi.mocked(ghCmd)).toHaveBeenCalledTimes(3);
  });

  it("honours timeout and reports pending check names", async () => {
    // Always returns pending — should hit timeout.
    vi.mocked(ghCmd).mockResolvedValue({
      stdout: checksJson([
        { name: "build", state: "PENDING", bucket: "pending" },
        { name: "test", state: "PENDING", bucket: "pending" },
      ]),
      stderr: "",
      exitCode: 8,
    });

    let nowMs = 0;
    const result = await watchPrChecks([], undefined, 42, {
      intervalMs: 1000,
      timeoutMs: 2500,
      sleep: async (ms) => {
        nowMs += ms;
      },
      now: () => nowMs,
    });

    expect(result.timedOut).toBe(true);
    expect(result.pending).toContain("build");
    expect(result.pending).toContain("test");
    // Loop should stop before exceeding timeoutMs
    expect(nowMs).toBeLessThanOrEqual(2500);
  });

  it("stops polling and returns errorType on a non-8 gh failure", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "could not resolve to a pull request",
      exitCode: 1,
    });

    const result = await watchPrChecks([], undefined, 7, {
      intervalMs: 1000,
      timeoutMs: 60_000,
      sleep: async () => {},
      now: () => 0,
    });

    expect(result.timedOut).toBe(false);
    expect(result.pollCount).toBe(1);
    expect(result.data.errorType).toBe("not-found");
  });

  it("treats malformed JSON as a fatal parse error", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "not-json",
      stderr: "",
      exitCode: 0,
    });

    const result = await watchPrChecks([], undefined, 7, {
      intervalMs: 1000,
      timeoutMs: 60_000,
      sleep: async () => {},
      now: () => 0,
    });

    expect(result.timedOut).toBe(false);
    expect(result.data.errorType).toBe("unknown");
  });
});

// ── Tool-handler-level tests ───────────────────────────────────────

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: Record<string, unknown> }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

describe("pr-checks tool handler — watch path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never passes --watch to gh (gh rejects --watch + --json)", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    await handler({ number: "12", watch: true, interval: 5 });

    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).not.toContain("--watch");
    expect(args).toContain("--json");
  });

  it("populates pollCount and waitedSeconds when watch=true", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    const out = await handler({ number: "12", watch: true, interval: 5 });
    expect(out.structuredContent.pollCount).toBe(1);
    expect(typeof out.structuredContent.waitedSeconds).toBe("number");
  });

  it("sets conclusion=passed and timedOut=false when all checks pass (watch)", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    const out = await handler({ number: "12", watch: true, interval: 5 });
    expect(out.structuredContent.conclusion).toBe("passed");
    expect(out.structuredContent.timedOut).toBe(false);
  });

  it("sets conclusion=failed when a check is failing (watch)", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([
        { name: "lint", state: "SUCCESS", bucket: "pass" },
        { name: "test", state: "FAILURE", bucket: "fail" },
      ]),
      stderr: "",
      exitCode: 0,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    const out = await handler({ number: "12", watch: true, interval: 5 });
    expect(out.structuredContent.conclusion).toBe("failed");
    expect(out.structuredContent.timedOut).toBe(false);
  });

  it("returns a structured timed_out snapshot instead of throwing on timeout", async () => {
    // Always pending → the watch loop hits its deadline.
    vi.mocked(ghCmd).mockResolvedValue({
      stdout: checksJson([{ name: "build", state: "PENDING", bucket: "pending" }]),
      stderr: "",
      exitCode: 8,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    // interval floor is 5s, watchTimeout 1s → the deadline check trips on the
    // first iteration (0 + 5000 > 1000), so the loop never actually sleeps.
    const out = await handler({ number: "12", watch: true, interval: 5, watchTimeout: 1 });
    expect(out.structuredContent.timedOut).toBe(true);
    expect(out.structuredContent.conclusion).toBe("timed_out");
    expect(out.structuredContent.errorType).toBe("watch-timeout");
  });

  it("sets conclusion on a one-shot (non-watch) snapshot", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: checksJson([{ name: "lint", state: "SUCCESS", bucket: "pass" }]),
      stderr: "",
      exitCode: 0,
    });

    const server = new FakeServer();
    registerPrChecksTool(server as never);
    const handler = server.tools.get("pr-checks")!.handler;

    const out = await handler({ number: "12" });
    expect(out.structuredContent.conclusion).toBe("passed");
  });
});
