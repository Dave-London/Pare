import { describe, it, expect } from "vitest";
import {
  parseInstallOutput,
  parseAuditJson,
  parseOutdatedJson,
  parseListJson,
} from "../src/lib/parsers.js";

describe("parseInstallOutput", () => {
  it("parses install with additions", () => {
    const output =
      "added 52 packages, and audited 235 packages in 3s\n\n25 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities";
    const result = parseInstallOutput(output, 3.0);

    expect(result.added).toBe(52);
    expect(result.packages).toBe(235);
    expect(result.duration).toBe(3.0);
    expect(result.funding).toBe(25);
  });

  it("parses install with vulnerabilities", () => {
    const output =
      "added 10 packages, and audited 100 packages in 2s\n\n3 vulnerabilities (1 high, 2 moderate)\n";
    const result = parseInstallOutput(output, 2.0);

    expect(result.added).toBe(10);
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities!.total).toBe(3);
    expect(result.vulnerabilities!.high).toBe(1);
    expect(result.vulnerabilities!.moderate).toBe(2);
  });

  it("parses up-to-date install", () => {
    const output = "up to date, audited 235 packages in 1s";
    const result = parseInstallOutput(output, 1.0);

    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.packages).toBe(235);
  });

  it("parses install with removals and changes", () => {
    const output =
      "added 3 packages, removed 5 packages, changed 2 packages, and audited 200 packages in 4s";
    const result = parseInstallOutput(output, 4.0);

    expect(result.added).toBe(3);
    expect(result.removed).toBe(5);
    expect(result.changed).toBe(2);
    expect(result.packages).toBe(200);
  });
});

describe("parseAuditJson", () => {
  it("parses audit with vulnerabilities", () => {
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

    const result = parseAuditJson(json);

    expect(result.summary.total).toBe(1);
    expect(result.summary.high).toBe(1);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("lodash");
    expect(result.vulnerabilities[0].severity).toBe("high");
    expect(result.vulnerabilities[0].fixAvailable).toBe(true);
  });

  it("parses clean audit", () => {
    const json = JSON.stringify({
      vulnerabilities: {},
      metadata: {
        vulnerabilities: { total: 0, critical: 0, high: 0, moderate: 0, low: 0, info: 0 },
      },
    });

    const result = parseAuditJson(json);
    expect(result.summary.total).toBe(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });
});

describe("parseOutdatedJson", () => {
  it("parses outdated packages", () => {
    const json = JSON.stringify({
      typescript: {
        current: "5.3.0",
        wanted: "5.7.0",
        latest: "5.7.0",
        location: "node_modules/typescript",
        type: "devDependencies",
      },
      zod: { current: "3.22.0", wanted: "3.25.0", latest: "3.25.0" },
    });

    const result = parseOutdatedJson(json);

    expect(result.total).toBe(2);
    expect(result.packages[0].name).toBe("typescript");
    expect(result.packages[0].current).toBe("5.3.0");
    expect(result.packages[0].wanted).toBe("5.7.0");
    expect(result.packages[1].name).toBe("zod");
  });

  it("parses empty outdated", () => {
    const result = parseOutdatedJson("{}");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });
});

describe("parseListJson", () => {
  it("parses dependency list", () => {
    const json = JSON.stringify({
      name: "my-project",
      version: "1.0.0",
      dependencies: {
        express: {
          version: "4.18.2",
          resolved: "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
        },
        zod: { version: "3.25.0" },
      },
    });

    const result = parseListJson(json);

    expect(result.name).toBe("my-project");
    expect(result.version).toBe("1.0.0");
    expect(result.total).toBe(2);
    expect(result.dependencies.express.version).toBe("4.18.2");
    expect(result.dependencies.zod.version).toBe("3.25.0");
  });

  it("handles empty dependencies", () => {
    const json = JSON.stringify({ name: "empty", version: "0.0.0", dependencies: {} });
    const result = parseListJson(json);
    expect(result.total).toBe(0);
  });
});
