import { describe, it, expect } from "vitest";
import {
  parseYarnAuditJson,
  parseYarnListJson,
  parseYarnOutdatedJson,
  parseInstallOutput,
} from "../src/lib/parsers.js";

describe("parseYarnAuditJson", () => {
  it("parses Yarn Classic NDJSON audit output", () => {
    const lines = [
      JSON.stringify({
        type: "auditAdvisory",
        data: {
          advisory: {
            id: 1234,
            module_name: "lodash",
            severity: "high",
            title: "Prototype Pollution",
            url: "https://npmjs.com/advisories/1234",
            vulnerable_versions: "<4.17.21",
            patched_versions: ">=4.17.21",
          },
        },
      }),
      JSON.stringify({
        type: "auditSummary",
        data: {
          vulnerabilities: { critical: 0, high: 1, moderate: 0, low: 0, info: 0 },
        },
      }),
    ].join("\n");

    const result = parseYarnAuditJson(lines);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("lodash");
    expect(result.vulnerabilities[0].severity).toBe("high");
    expect(result.vulnerabilities[0].title).toBe("Prototype Pollution");
    expect(result.vulnerabilities[0].fixAvailable).toBe(true);
    expect(result.summary.total).toBe(1);
    expect(result.summary.high).toBe(1);
  });

  it("deduplicates advisories by id", () => {
    const advisory = {
      type: "auditAdvisory",
      data: {
        advisory: {
          id: 1234,
          module_name: "lodash",
          severity: "high",
          title: "Prototype Pollution",
          patched_versions: ">=4.17.21",
        },
      },
    };
    const lines = [
      JSON.stringify(advisory),
      JSON.stringify(advisory), // duplicate
      JSON.stringify({
        type: "auditSummary",
        data: { vulnerabilities: { critical: 0, high: 1, moderate: 0, low: 0, info: 0 } },
      }),
    ].join("\n");

    const result = parseYarnAuditJson(lines);
    expect(result.vulnerabilities).toHaveLength(1);
  });

  it("handles npm-compatible format (Yarn Berry)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        express: {
          severity: "moderate",
          title: "Open Redirect",
          via: [{ title: "Open Redirect", url: "https://npmjs.com/advisories/5678" }],
          range: "<4.19.0",
          fixAvailable: true,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 0, moderate: 1, low: 0, info: 0 },
      },
    });

    const result = parseYarnAuditJson(json);
    expect(result.summary.total).toBe(1);
    expect(result.vulnerabilities[0].name).toBe("express");
  });

  it("handles empty NDJSON output", () => {
    const result = parseYarnAuditJson("");
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it("handles advisory with no fix available", () => {
    const lines = [
      JSON.stringify({
        type: "auditAdvisory",
        data: {
          advisory: {
            id: 999,
            module_name: "no-fix-pkg",
            severity: "low",
            title: "Info Leak",
            patched_versions: "<0.0.0",
          },
        },
      }),
    ].join("\n");

    const result = parseYarnAuditJson(lines);
    expect(result.vulnerabilities[0].fixAvailable).toBe(false);
  });
});

describe("parseYarnListJson", () => {
  it("parses Yarn Classic tree format", () => {
    const json = JSON.stringify({
      type: "tree",
      data: {
        type: "list",
        trees: [
          { name: "express@4.18.2", children: [] },
          {
            name: "lodash@4.17.21",
            children: [{ name: "lodash.merge@4.6.2", children: [] }],
          },
        ],
      },
    });

    const result = parseYarnListJson(json);
    expect(result.dependencies["express"]).toEqual({ version: "4.18.2" });
    expect(result.dependencies["lodash"].version).toBe("4.17.21");
    expect(result.dependencies["lodash"].dependencies?.["lodash.merge"].version).toBe("4.6.2");
    expect(result.total).toBe(3);
  });

  it("handles empty tree", () => {
    const json = JSON.stringify({
      type: "tree",
      data: { type: "list", trees: [] },
    });

    const result = parseYarnListJson(json);
    expect(result.total).toBe(0);
    expect(result.dependencies).toEqual({});
  });

  it("handles npm-compatible format (Yarn Berry)", () => {
    const json = JSON.stringify({
      name: "my-project",
      version: "1.0.0",
      dependencies: {
        express: { version: "4.18.2" },
      },
    });

    const result = parseYarnListJson(json);
    expect(result.name).toBe("my-project");
    expect(result.dependencies["express"].version).toBe("4.18.2");
  });

  it("handles scoped packages with @ in name", () => {
    const json = JSON.stringify({
      type: "tree",
      data: {
        type: "list",
        trees: [{ name: "@types/node@20.11.0", children: [] }],
      },
    });

    const result = parseYarnListJson(json);
    expect(result.dependencies["@types/node"]).toEqual({ version: "20.11.0" });
  });

  it("returns empty result for invalid input", () => {
    const result = parseYarnListJson("not valid json at all");
    expect(result.total).toBe(0);
    expect(result.dependencies).toEqual({});
  });
});

describe("parseYarnOutdatedJson", () => {
  it("parses Yarn Classic table format", () => {
    const json = JSON.stringify({
      type: "table",
      data: {
        head: ["Package", "Current", "Wanted", "Latest", "Package Type", "URL"],
        body: [
          ["express", "4.17.0", "4.18.2", "5.0.0", "dependencies", "https://expressjs.com"],
          ["lodash", "4.17.0", "4.17.21", "4.17.21", "devDependencies", "https://lodash.com"],
        ],
      },
    });

    const result = parseYarnOutdatedJson(json);
    expect(result.total).toBe(2);
    expect(result.packages[0].name).toBe("express");
    expect(result.packages[0].current).toBe("4.17.0");
    expect(result.packages[0].wanted).toBe("4.18.2");
    expect(result.packages[0].latest).toBe("5.0.0");
    expect(result.packages[0].type).toBe("dependencies");
    expect(result.packages[1].name).toBe("lodash");
    expect(result.packages[1].type).toBe("devDependencies");
  });

  it("handles empty table", () => {
    const json = JSON.stringify({
      type: "table",
      data: { head: [], body: [] },
    });

    const result = parseYarnOutdatedJson(json);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles npm-compatible format", () => {
    const json = JSON.stringify({
      express: { current: "4.17.0", wanted: "4.18.2", latest: "5.0.0", type: "dependencies" },
    });

    const result = parseYarnOutdatedJson(json);
    expect(result.total).toBe(1);
    expect(result.packages[0].name).toBe("express");
  });

  it("handles empty NDJSON output", () => {
    const result = parseYarnOutdatedJson("");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });
});

describe("parseInstallOutput with yarn-style output", () => {
  it("parses yarn install output with success message", () => {
    const output = "success Saved lockfile.\nadded 42 packages in 3.5s\n42 packages in 3s";
    const result = parseInstallOutput(output, 3.5);

    expect(result.added).toBe(42);
    expect(result.packages).toBe(42);
    expect(result.duration).toBe(3.5);
  });

  it("parses yarn install output with no changes", () => {
    const output = "success Already up-to-date.\n0 packages in 0s";
    const result = parseInstallOutput(output, 0.5);

    expect(result.added).toBe(0);
    expect(result.duration).toBe(0.5);
  });
});
