import { describe, it, expect } from "vitest";
import { formatReport } from "../../src/lib/doctor/report.js";
import { validateServerPackage, PARETOOLS_PACKAGES } from "../../src/lib/doctor/health-check.js";
import type { HealthResult } from "../../src/lib/doctor/health-check.js";

describe("validateServerPackage", () => {
  it("accepts known @paretools packages", () => {
    const result = validateServerPackage(["-y", "@paretools/git"]);
    expect(result.valid).toBe(true);
  });

  it("accepts all registered @paretools packages", () => {
    for (const pkg of PARETOOLS_PACKAGES) {
      const result = validateServerPackage(["-y", pkg]);
      expect(result.valid).toBe(true);
    }
  });

  it("rejects unknown @paretools packages with warning", () => {
    const result = validateServerPackage(["-y", "@paretools/malicious-typo"]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.warning).toContain("@paretools/malicious-typo");
      expect(result.warning).toContain("typosquatting");
    }
  });

  it("allows non-paretools packages without warning", () => {
    const result = validateServerPackage(["-y", "some-other-server"]);
    expect(result.valid).toBe(true);
  });

  it("allows empty args", () => {
    const result = validateServerPackage([]);
    expect(result.valid).toBe(true);
  });

  it("detects @paretools package anywhere in args", () => {
    const result = validateServerPackage(["--some-flag", "value", "@paretools/fake-pkg"]);
    expect(result.valid).toBe(false);
  });
});

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

  it("includes warning in report when present", () => {
    const results: HealthResult[] = [
      {
        serverId: "pare-fake",
        status: "pass",
        toolCount: 5,
        latencyMs: 500,
        warning: 'Unknown @paretools package "@paretools/fake"',
      },
    ];

    const report = formatReport(results);
    expect(report).toContain("Warning:");
    expect(report).toContain("@paretools/fake");
  });
});
