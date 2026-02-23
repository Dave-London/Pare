import { describe, it, expect } from "vitest";
import { formatReport } from "../../src/lib/doctor/report.js";
import type { HealthResult } from "../../src/lib/doctor/health-check.js";

describe("formatReport", () => {
  it("formats passing results", () => {
    const results: HealthResult[] = [
      { serverId: "pare-git", status: "pass", toolCount: 24, latencyMs: 1200 },
      { serverId: "pare-test", status: "pass", toolCount: 3, latencyMs: 800 },
    ];

    const report = formatReport(results);
    expect(report).toContain("PASS");
    expect(report).toContain("pare-git");
    expect(report).toContain("24 tools");
    expect(report).toContain("2 passed, 0 failed");
  });

  it("formats failing results with error", () => {
    const results: HealthResult[] = [
      { serverId: "pare-git", status: "fail", latencyMs: 15000, error: "Connection timeout" },
    ];

    const report = formatReport(results);
    expect(report).toContain("FAIL");
    expect(report).toContain("Connection timeout");
    expect(report).toContain("0 passed, 1 failed");
  });

  it("formats mixed results", () => {
    const results: HealthResult[] = [
      { serverId: "pare-git", status: "pass", toolCount: 24, latencyMs: 1000 },
      { serverId: "pare-npm", status: "fail", error: "ENOENT" },
    ];

    const report = formatReport(results);
    expect(report).toContain("1 passed, 1 failed, 2 total");
  });
});
