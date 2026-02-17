import { describe, it, expect } from "vitest";
import { parseRunRerun } from "../src/lib/parsers.js";
import { formatRunRerun } from "../src/lib/formatters.js";
import type { RunRerunResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseRunRerun", () => {
  it("parses rerun output for all jobs", () => {
    const result = parseRunRerun("", "✓ Requested rerun of run 12345\n", 12345, false);

    expect(result.runId).toBe(12345);
    expect(result.status).toBe("requested-full");
    expect(result.failedOnly).toBe(false);
    expect(result.url).toBe("");
  });

  it("parses rerun output for failed jobs only", () => {
    const result = parseRunRerun("", "✓ Requested rerun (failed jobs) of run 99\n", 99, true);

    expect(result.runId).toBe(99);
    expect(result.status).toBe("requested-failed");
    expect(result.failedOnly).toBe(true);
    expect(result.url).toBe("");
  });

  it("extracts URL from output when present", () => {
    const result = parseRunRerun(
      "https://github.com/owner/repo/actions/runs/12345\n",
      "",
      12345,
      false,
    );

    expect(result.runId).toBe(12345);
    expect(result.url).toBe("https://github.com/owner/repo/actions/runs/12345");
  });

  it("extracts URL from stderr when present", () => {
    const result = parseRunRerun(
      "",
      "✓ Requested rerun of run 42\nhttps://github.com/owner/repo/actions/runs/42\n",
      42,
      false,
    );

    expect(result.url).toBe("https://github.com/owner/repo/actions/runs/42");
  });

  it("handles empty output", () => {
    const result = parseRunRerun("", "", 1, false);

    expect(result.runId).toBe(1);
    expect(result.status).toBe("requested-full");
    expect(result.failedOnly).toBe(false);
    expect(result.url).toBe("");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatRunRerun", () => {
  it("formats rerun result for all jobs", () => {
    const data: RunRerunResult = {
      runId: 12345,
      status: "requested-full",
      failedOnly: false,
      url: "https://github.com/owner/repo/actions/runs/12345",
    };
    expect(formatRunRerun(data)).toBe(
      "Rerun requested for run #12345 (all jobs): https://github.com/owner/repo/actions/runs/12345",
    );
  });

  it("formats rerun result for failed jobs only", () => {
    const data: RunRerunResult = {
      runId: 99,
      status: "requested-failed",
      failedOnly: true,
      url: "https://github.com/owner/repo/actions/runs/99",
    };
    expect(formatRunRerun(data)).toBe(
      "Rerun requested for run #99 (failed jobs only): https://github.com/owner/repo/actions/runs/99",
    );
  });

  it("formats rerun result without URL", () => {
    const data: RunRerunResult = {
      runId: 1,
      status: "requested-full",
      failedOnly: false,
      url: "",
    };
    expect(formatRunRerun(data)).toBe("Rerun requested for run #1 (all jobs)");
  });
});
