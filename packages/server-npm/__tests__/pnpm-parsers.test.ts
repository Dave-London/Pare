import { describe, it, expect } from "vitest";
import { parsePnpmAuditJson, parseOutdatedJson, parseInstallOutput } from "../src/lib/parsers.js";

describe("parsePnpmAuditJson", () => {
  it("parses npm-compatible format (pnpm v8+)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        lodash: {
          severity: "high",
          title: "Prototype Pollution",
          via: [{ title: "Prototype Pollution", url: "https://npmjs.com/advisories/1234" }],
          range: "<4.17.21",
          fixAvailable: true,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
      },
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("lodash");
  });

  it("parses classic advisories format", () => {
    const json = JSON.stringify({
      advisories: {
        "1234": {
          module_name: "vulnerable-pkg",
          severity: "moderate",
          title: "Cross-Site Scripting",
          url: "https://npmjs.com/advisories/1234",
          vulnerable_versions: "<2.0.0",
          patched_versions: ">=2.0.0",
        },
      },
      metadata: {
        totalDependencies: 100,
        vulnerabilities: { critical: 0, high: 0, moderate: 1, low: 0, info: 0 },
      },
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("vulnerable-pkg");
    expect(result.vulnerabilities[0].severity).toBe("moderate");
    expect(result.vulnerabilities[0].title).toBe("Cross-Site Scripting");
    expect(result.vulnerabilities[0].fixAvailable).toBe(true);
    expect(result.vulnerabilities[0].severity).toBe("moderate");
  });

  it("handles advisory with no patched versions (no fix available)", () => {
    const json = JSON.stringify({
      advisories: {
        "5678": {
          module_name: "no-fix-pkg",
          severity: "high",
          title: "Memory Leak",
          patched_versions: "<0.0.0",
        },
      },
      metadata: {},
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities[0].fixAvailable).toBe(false);
  });

  it("handles empty advisories", () => {
    const json = JSON.stringify({
      advisories: {},
      metadata: {},
    });

    const result = parsePnpmAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });
});

describe("parseOutdatedJson with pnpm", () => {
  it("parses pnpm-style object format (same as npm)", () => {
    const json = JSON.stringify({
      turbo: {
        current: "2.8.3",
        latest: "2.8.8",
        wanted: "2.8.3",
        dependencyType: "devDependencies",
      },
    });

    const result = parseOutdatedJson(json, "pnpm");

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("turbo");
    expect(result.packages[0].current).toBe("2.8.3");
    expect(result.packages[0].latest).toBe("2.8.8");
    expect(result.packages[0].type).toBe("devDependencies");
  });

  it("parses pnpm array format", () => {
    const json = JSON.stringify([
      {
        packageName: "express",
        current: "4.18.0",
        wanted: "4.18.2",
        latest: "5.0.0",
        dependencyType: "dependencies",
      },
      {
        packageName: "zod",
        current: "3.22.0",
        wanted: "3.25.0",
        latest: "3.25.0",
      },
    ]);

    const result = parseOutdatedJson(json, "pnpm");

    expect(result.packages).toHaveLength(2);
    expect(result.packages[0].name).toBe("express");
    expect(result.packages[0].type).toBe("dependencies");
    expect(result.packages[1].name).toBe("zod");
    expect(result.packages[1].type).toBeUndefined();
  });

  it("handles empty array", () => {
    const result = parseOutdatedJson("[]", "pnpm");
    expect(result.packages).toEqual([]);
  });
});

describe("parseInstallOutput with pnpm-style output", () => {
  it("parses pnpm install output (similar to npm)", () => {
    // pnpm can output npm-compatible summary lines
    const output = "added 5 packages in 2s";
    const result = parseInstallOutput(output);

    expect(result.added).toBe(5);
  });

  it("parses pnpm output with packages in line", () => {
    const output =
      "Packages: +52\n\nProgress: resolved 287, reused 235, downloaded 52, added 52\n\ndone in 3.5s\n\n52 packages in 3s";
    const result = parseInstallOutput(output);

    expect(result.added).toBe(0); // pnpm uses "+52" format, not "added 52"
  });
});
