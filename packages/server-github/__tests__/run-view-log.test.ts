/**
 * #1257: run-view log output is bounded and says when it was cut.
 *
 * Fixtures (fixtures/gh-run-log) are real gh 2.79.0 output captured on
 * 2026-11-17 from https://github.com/Dave-London/Pare/actions/runs/40657265863
 * (attempt 2, a failed CI run): `gh run view 40657265863 --log` (2,362 lines,
 * 291 KB) and the same with `--log-failed` (72 lines). The Windows job fails at
 * line 1,139, far from the end of the log, so a plain tail misses it.
 * run-40657265863.view.stdout is `gh run view --json <run-view fields>` for the same run.
 */
import { beforeEach, describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@paretools/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@paretools/shared")>()),
  run: vi.fn(),
}));

import { run } from "@paretools/shared";
import { windowLog, DEFAULT_LOG_MAX_CHARS, DEFAULT_LOG_TAIL_LINES } from "../src/lib/log-window.js";
import { formatRunViewLog } from "../src/lib/formatters.js";
import { parseRunView } from "../src/lib/parsers.js";
import { registerRunViewTool } from "../src/tools/run-view.js";
import type { RunViewResult } from "../src/schemas/index.js";

const FIXTURES = join(import.meta.dirname, "fixtures", "gh-run-log");
const FULL_LOG = readFileSync(join(FIXTURES, "run-40657265863.log"), "utf-8");
const FAILED_LOG = readFileSync(join(FIXTURES, "run-40657265863.log-failed.log"), "utf-8");
const FULL_LINES = FULL_LOG.replace(/\n$/, "").split("\n");

describe("windowLog on a real 2,362-line run log", () => {
  it("fixture is the whole captured log", () => {
    expect(FULL_LINES).toHaveLength(2362);
    expect(FULL_LINES[1138]).toContain("##[error]Process completed with exit code 1.");
  });

  it("cuts the log by default and reports the full length", () => {
    const win = windowLog(FULL_LOG);

    expect(win.totalLines).toBe(2362);
    expect(win.truncated).toBe(true);
    expect(win.returnedLines).toBeLessThanOrEqual(DEFAULT_LOG_TAIL_LINES);
    expect(win.returnedLines).toBeGreaterThan(0);
    expect(win.logs.length).toBeLessThanOrEqual(DEFAULT_LOG_MAX_CHARS);
    expect(win.logs.split("\n")).toHaveLength(win.returnedLines);
    // It is the tail: the last real line is last.
    expect(win.logs.endsWith(FULL_LINES.at(-1)!)).toBe(true);
    // The default tail misses the Windows failure — which is why truncation must be explicit.
    expect(win.logs).not.toContain("12:01:05.9069757Z ##[error]");
  });

  it("grep finds every failure, wherever it is in the log", () => {
    const win = windowLog(FULL_LOG, { grep: "##\\[error\\]" });

    expect(win.totalLines).toBe(2362);
    expect(win.matchedLines).toBe(3);
    expect(win.returnedLines).toBe(3);
    expect(win.truncated).toBe(false);
    const lines = win.logs.split("\n");
    expect(lines[0]).toMatch(/^build-and-test-windows\tRun pnpm format:check\t/);
    expect(lines[1]).toMatch(/^build-and-test-ubuntu\tRun pnpm format:check\t/);
    expect(lines[2]).toMatch(/^ci-gate\tCheck required jobs\t/);
  });

  it("grep is case-insensitive and composes with tailLines", () => {
    const win = windowLog(FULL_LOG, { grep: "code style issues", tailLines: 1 });

    expect(win.matchedLines).toBe(2);
    expect(win.returnedLines).toBe(1);
    expect(win.truncated).toBe(true);
    expect(win.logs).toMatch(/^build-and-test-ubuntu\t/);
  });

  it("an explicit tailLines returns exactly that many lines", () => {
    const win = windowLog(FULL_LOG, { tailLines: 5 });

    expect(win.logs).toBe(FULL_LINES.slice(-5).join("\n"));
    expect(win.returnedLines).toBe(5);
    expect(win.totalLines).toBe(2362);
    expect(win.truncated).toBe(true);
  });

  it("an explicit tailLines above the length returns the whole log, not truncated", () => {
    const win = windowLog(FULL_LOG, { tailLines: 100_000 });

    expect(win.logs).toBe(FULL_LINES.join("\n"));
    expect(win.truncated).toBe(false);
  });

  it("a short --log-failed log comes back whole", () => {
    const win = windowLog(FAILED_LOG);

    expect(win.totalLines).toBe(72);
    expect(win.returnedLines).toBe(72);
    expect(win.truncated).toBe(false);
    expect(win.logs).toBe(FAILED_LOG.replace(/\n$/, ""));
  });
});

describe("windowLog edge cases", () => {
  it("empty output", () => {
    expect(windowLog("")).toEqual({
      logs: "",
      totalLines: 0,
      returnedLines: 0,
      truncated: false,
    });
  });

  it("a single line over the character budget keeps its end and is marked truncated", () => {
    const line = "a".repeat(DEFAULT_LOG_MAX_CHARS) + "THE END";
    const win = windowLog(line);

    expect(win.logs.length).toBe(DEFAULT_LOG_MAX_CHARS);
    expect(win.logs.endsWith("THE END")).toBe(true);
    expect(win.truncated).toBe(true);
  });

  it("rejects an invalid grep pattern with a clear message", () => {
    expect(() => windowLog("x", { grep: "(" })).toThrow(/grep is not a valid regular expression/);
  });
});

describe("parseRunView job ids (for the job filter)", () => {
  it("exposes each job's id from real `gh run view --json` output", () => {
    const view = parseRunView(readFileSync(join(FIXTURES, "run-40657265863.view.stdout"), "utf-8"));
    const windows = view.jobs?.find((j) => j.name === "build-and-test-windows");

    expect(windows).toMatchObject({ id: 134023945020, conclusion: "failure" });
    expect(view.jobs?.every((j) => typeof j.id === "number")).toBe(true);
  });
});

describe("formatRunViewLog line counts", () => {
  it("says how much of the log is shown and how to narrow it", () => {
    const win = windowLog(FULL_LOG);
    const data: RunViewResult = {
      id: 40657265863,
      status: "completed",
      conclusion: null,
      workflowName: "",
      headBranch: "",
      url: "",
      logs: win.logs,
      logsTotalLines: win.totalLines,
      logsReturnedLines: win.returnedLines,
      logsTruncated: win.truncated,
    };
    const text = formatRunViewLog(data);

    expect(text).toContain(`Log: ${win.returnedLines} of 2362 lines (truncated: narrow with job`);
  });
});

// ── Tool handler ────────────────────────────────────────────────────

type ToolHandler = (input: Record<string, unknown>) => Promise<{
  structuredContent: RunViewResult;
  content: { text: string }[];
}>;

class FakeServer {
  handler?: ToolHandler;
  registerTool(_name: string, _config: unknown, handler: ToolHandler) {
    this.handler = handler;
  }
}

function handler(): ToolHandler {
  const server = new FakeServer();
  registerRunViewTool(server as never);
  return server.handler!;
}

describe("run-view tool with log output", () => {
  beforeEach(() => {
    vi.mocked(run).mockReset();
    vi.mocked(run).mockResolvedValue({ stdout: FULL_LOG, stderr: "", exitCode: 0 });
  });

  it("bounds the structured result instead of returning 291 KB", async () => {
    const out = await handler()({ id: 40657265863, log: true });
    const sc = out.structuredContent;

    expect(vi.mocked(run).mock.calls[0][1]).toEqual(["run", "view", "40657265863", "--log"]);
    expect(sc.logsTotalLines).toBe(2362);
    expect(sc.logsTruncated).toBe(true);
    expect(sc.logsReturnedLines).toBeLessThanOrEqual(DEFAULT_LOG_TAIL_LINES);
    expect(JSON.stringify(sc).length).toBeLessThan(DEFAULT_LOG_MAX_CHARS * 1.5);
  });

  it("passes grep through to the window and reports matches", async () => {
    const out = await handler()({ id: 40657265863, log: true, grep: "##\\[error\\]" });

    expect(out.structuredContent.logsMatchedLines).toBe(3);
    expect(out.structuredContent.logsTruncated).toBe(false);
  });

  it("refuses grep without log or logFailed", async () => {
    await expect(handler()({ id: 40657265863, grep: "error" })).rejects.toThrow(
      /set log or logFailed/,
    );
    expect(run).not.toHaveBeenCalled();
  });
});
