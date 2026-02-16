import { describe, it, expect } from "vitest";
import { parsePrChecks } from "../src/lib/parsers.js";
import {
  formatPrChecks,
  compactPrChecksMap,
  formatPrChecksCompact,
} from "../src/lib/formatters.js";
import type { PrChecksResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrChecks (exit code 8 — pending checks)", () => {
  it("parses all-pending checks JSON (exit code 8 scenario)", () => {
    // gh pr checks returns exit code 8 when checks are pending, but still
    // outputs valid JSON. The parser must handle this gracefully.
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/100/job/200",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "",
      },
      {
        name: "CI / test",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/100/job/201",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "",
      },
    ]);

    const result = parsePrChecks(json, 77);

    expect(result.pr).toBe(77);
    expect(result.checks).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.pending).toBe(2);
    expect(result.summary.passed).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.cancelled).toBe(0);
  });

  it("parses mixed pending and passed checks (exit code 8 scenario)", () => {
    const json = JSON.stringify([
      {
        name: "lint",
        state: "SUCCESS",
        bucket: "pass",
        description: "Linting passed",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "2024-06-01T12:01:00Z",
      },
      {
        name: "deploy",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "Deploy",
        link: "",
        startedAt: "2024-06-01T12:01:00Z",
        completedAt: "",
      },
    ]);

    const result = parsePrChecks(json, 88);

    expect(result.pr).toBe(88);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  it("includes required and conclusion fields when present", () => {
    const json = JSON.stringify([
      {
        name: "required-check",
        state: "PENDING",
        bucket: "pending",
        description: "",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "",
        completedAt: "",
        isRequired: true,
        conclusion: null,
      },
    ]);

    const result = parsePrChecks(json, 1);

    expect(result.checks[0].required).toBe(true);
    // null conclusion maps to undefined via the ?? operator in the parser
    expect(result.checks[0].conclusion).toBeUndefined();
  });

  it("deduplicates checks by name, keeping the most recent run", () => {
    const json = JSON.stringify([
      {
        name: "CI / build",
        state: "FAILURE",
        bucket: "fail",
        description: "Build failed",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/100/job/200",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "2024-06-01T12:05:00Z",
      },
      {
        name: "CI / build",
        state: "SUCCESS",
        bucket: "pass",
        description: "Build succeeded",
        event: "pull_request",
        workflow: "CI",
        link: "https://github.com/owner/repo/actions/runs/101/job/201",
        startedAt: "2024-06-01T13:00:00Z",
        completedAt: "2024-06-01T13:05:00Z",
      },
      {
        name: "CI / test",
        state: "SUCCESS",
        bucket: "pass",
        description: "Tests passed",
        event: "pull_request",
        workflow: "CI",
        link: "",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "2024-06-01T12:03:00Z",
      },
    ]);

    const result = parsePrChecks(json, 99);

    expect(result.checks).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.failed).toBe(0);
    // The "CI / build" entry should be the later (successful) one
    const buildCheck = result.checks.find((c) => c.name === "CI / build");
    expect(buildCheck?.state).toBe("SUCCESS");
    expect(buildCheck?.bucket).toBe("pass");
  });

  it("deduplicates checks with equal timestamps, keeping later entry", () => {
    const json = JSON.stringify([
      {
        name: "lint",
        state: "FAILURE",
        bucket: "fail",
        description: "",
        event: "",
        workflow: "",
        link: "",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "2024-06-01T12:01:00Z",
      },
      {
        name: "lint",
        state: "SUCCESS",
        bucket: "pass",
        description: "",
        event: "",
        workflow: "",
        link: "",
        startedAt: "2024-06-01T12:00:00Z",
        completedAt: "2024-06-01T12:01:00Z",
      },
    ]);

    const result = parsePrChecks(json, 1);

    expect(result.checks).toHaveLength(1);
    // Same timestamps → later entry wins (SUCCESS)
    expect(result.checks[0].state).toBe("SUCCESS");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrChecks (pending checks)", () => {
  it("formats pending checks summary correctly", () => {
    const data: PrChecksResult = {
      pr: 42,
      checks: [
        {
          name: "CI / build",
          state: "PENDING",
          bucket: "pending",
          description: "",
          event: "pull_request",
          workflow: "CI",
          link: "",
          startedAt: "",
          completedAt: "",
        },
      ],
      summary: { total: 1, passed: 0, failed: 0, pending: 1, skipped: 0, cancelled: 0 },
    };

    const output = formatPrChecks(data);
    expect(output).toContain("PR #42: 1 checks (0 passed, 0 failed, 1 pending)");
    expect(output).toContain("CI / build: PENDING (pending) [CI]");
  });
});

describe("compactPrChecks (pending checks)", () => {
  it("maps pending checks to compact format", () => {
    const data: PrChecksResult = {
      pr: 50,
      checks: [
        {
          name: "a",
          state: "PENDING",
          bucket: "pending",
          description: "",
          event: "",
          workflow: "",
          link: "",
          startedAt: "",
          completedAt: "",
        },
        {
          name: "b",
          state: "SUCCESS",
          bucket: "pass",
          description: "",
          event: "",
          workflow: "",
          link: "",
          startedAt: "",
          completedAt: "",
        },
      ],
      summary: { total: 2, passed: 1, failed: 0, pending: 1, skipped: 0, cancelled: 0 },
    };

    const compact = compactPrChecksMap(data);
    expect(compact.pr).toBe(50);
    expect(compact.total).toBe(2);
    expect(compact.passed).toBe(1);
    expect(compact.pending).toBe(1);
    expect(compact.failed).toBe(0);

    const text = formatPrChecksCompact(compact);
    expect(text).toContain("PR #50: 2 checks (1 passed, 0 failed, 1 pending)");
  });
});
