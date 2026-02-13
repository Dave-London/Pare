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

  it("parses nested dependencies (depth > 0)", () => {
    const json = JSON.stringify({
      name: "my-project",
      version: "1.0.0",
      dependencies: {
        express: {
          version: "4.18.2",
          dependencies: {
            "body-parser": {
              version: "1.20.1",
              dependencies: {
                bytes: { version: "3.1.2" },
              },
            },
            cookie: { version: "0.5.0" },
          },
        },
        zod: { version: "3.25.0" },
      },
    });

    const result = parseListJson(json);

    expect(result.name).toBe("my-project");
    expect(result.total).toBe(5); // express + body-parser + bytes + cookie + zod
    expect(result.dependencies.express.version).toBe("4.18.2");
    expect(result.dependencies.express.dependencies!["body-parser"].version).toBe("1.20.1");
    expect(
      result.dependencies.express.dependencies!["body-parser"].dependencies!.bytes.version,
    ).toBe("3.1.2");
    expect(result.dependencies.express.dependencies!.cookie.version).toBe("0.5.0");
    expect(result.dependencies.zod.version).toBe("3.25.0");
    expect(result.dependencies.zod.dependencies).toBeUndefined();
  });
});

// ─── Branch coverage ────────────────────────────────────────────────────────

describe("parseInstallOutput branch coverage", () => {
  it("parses 0 vulnerabilities text", () => {
    const output = "added 87 packages in 4s\n\nfound 0 vulnerabilities";
    const result = parseInstallOutput(output, 4.0);

    expect(result.added).toBe(87);
    // "0 vulnerabilities" matches the regex, so vulnerabilities object is created with total=0
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities!.total).toBe(0);
    expect(result.vulnerabilities!.critical).toBe(0);
    expect(result.vulnerabilities!.high).toBe(0);
    expect(result.vulnerabilities!.moderate).toBe(0);
    expect(result.vulnerabilities!.low).toBe(0);
    expect(result.vulnerabilities!.info).toBe(0);
  });

  it("omits funding when no funding message is present", () => {
    const output = "added 10 packages in 1s";
    const result = parseInstallOutput(output, 1.0);

    expect(result.added).toBe(10);
    expect(result.funding).toBeUndefined();
  });

  it("omits vulnerabilities when no vulnerability text is present", () => {
    const output = "added 5 packages in 2s\n3 packages are looking for funding";
    const result = parseInstallOutput(output, 2.0);

    expect(result.added).toBe(5);
    expect(result.vulnerabilities).toBeUndefined();
    expect(result.funding).toBe(3);
  });

  it("handles completely empty output", () => {
    const result = parseInstallOutput("", 0);

    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(0);
    expect(result.packages).toBe(0);
    expect(result.vulnerabilities).toBeUndefined();
    expect(result.funding).toBeUndefined();
  });
});

describe("parseAuditJson branch coverage", () => {
  it("handles missing metadata.vulnerabilities structure", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        lodash: {
          severity: "high",
          title: "Prototype Pollution",
          via: [{ title: "Prototype Pollution" }],
          range: "<4.17.21",
          fixAvailable: true,
        },
      },
      metadata: {},
    });

    const result = parseAuditJson(json);

    // Should fall back to counting vulnerabilities array length for total
    expect(result.summary.total).toBe(1);
    expect(result.summary.critical).toBe(0);
    expect(result.summary.high).toBe(0);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("lodash");
  });

  it("handles missing via array (uses title fallback)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        "bad-pkg": {
          severity: "moderate",
          title: "XSS Vulnerability",
          range: "<2.0.0",
          fixAvailable: false,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 0, moderate: 1, low: 0, info: 0 },
      },
    });

    const result = parseAuditJson(json);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].title).toBe("XSS Vulnerability");
    expect(result.vulnerabilities[0].url).toBeUndefined();
  });

  it("handles via array with no url", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        glob: {
          severity: "low",
          title: "ReDoS",
          via: [{ title: "ReDoS in glob" }],
          range: "<7.2.0",
          fixAvailable: true,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 0, moderate: 0, low: 1, info: 0 },
      },
    });

    const result = parseAuditJson(json);

    expect(result.vulnerabilities[0].title).toBe("ReDoS");
    expect(result.vulnerabilities[0].url).toBeUndefined();
  });

  it("handles missing severity (defaults to info)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        "unknown-pkg": {
          via: [{ title: "Some Issue" }],
          range: "*",
          fixAvailable: false,
        },
      },
      metadata: {
        vulnerabilities: { total: 1, critical: 0, high: 0, moderate: 0, low: 0, info: 1 },
      },
    });

    const result = parseAuditJson(json);

    expect(result.vulnerabilities[0].severity).toBe("info");
    expect(result.vulnerabilities[0].title).toBe("Some Issue");
  });

  it("handles completely missing metadata key", () => {
    const json = JSON.stringify({
      vulnerabilities: {},
    });

    const result = parseAuditJson(json);

    expect(result.summary.total).toBe(0);
    expect(result.vulnerabilities).toHaveLength(0);
  });

  it("throws on invalid JSON string", () => {
    expect(() => parseAuditJson("not valid json")).toThrow();
  });
});

describe("parseOutdatedJson branch coverage", () => {
  it("handles packages missing optional location and type fields", () => {
    const json = JSON.stringify({
      "some-pkg": {
        current: "1.0.0",
        wanted: "1.1.0",
        latest: "2.0.0",
      },
    });

    const result = parseOutdatedJson(json);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("some-pkg");
    expect(result.packages[0].current).toBe("1.0.0");
    expect(result.packages[0].wanted).toBe("1.1.0");
    expect(result.packages[0].latest).toBe("2.0.0");
    expect(result.packages[0].location).toBeUndefined();
    expect(result.packages[0].type).toBeUndefined();
  });

  it("handles packages missing version fields (defaults to N/A)", () => {
    const json = JSON.stringify({
      "broken-pkg": {},
    });

    const result = parseOutdatedJson(json);

    expect(result.packages[0].current).toBe("N/A");
    expect(result.packages[0].wanted).toBe("N/A");
    expect(result.packages[0].latest).toBe("N/A");
  });

  it("throws on invalid JSON string", () => {
    expect(() => parseOutdatedJson("{invalid")).toThrow();
  });
});

describe("parseListJson branch coverage", () => {
  it("defaults name to 'unknown' when missing from JSON", () => {
    const json = JSON.stringify({
      version: "1.0.0",
      dependencies: { a: { version: "1.0.0" } },
    });

    const result = parseListJson(json);

    expect(result.name).toBe("unknown");
    expect(result.version).toBe("1.0.0");
    expect(result.total).toBe(1);
  });

  it("defaults version to '0.0.0' when missing from JSON", () => {
    const json = JSON.stringify({
      name: "my-pkg",
      dependencies: {},
    });

    const result = parseListJson(json);

    expect(result.name).toBe("my-pkg");
    expect(result.version).toBe("0.0.0");
  });

  it("defaults both name and version when missing", () => {
    const json = JSON.stringify({
      dependencies: { a: { version: "1.0.0" } },
    });

    const result = parseListJson(json);

    expect(result.name).toBe("unknown");
    expect(result.version).toBe("0.0.0");
  });

  it("handles missing dependencies key entirely", () => {
    const json = JSON.stringify({ name: "bare", version: "0.1.0" });

    const result = parseListJson(json);

    expect(result.name).toBe("bare");
    expect(result.dependencies).toEqual({});
    expect(result.total).toBe(0);
  });

  it("defaults dependency version to 'unknown' when missing", () => {
    const json = JSON.stringify({
      name: "test",
      version: "1.0.0",
      dependencies: { "no-version": {} },
    });

    const result = parseListJson(json);

    expect(result.dependencies["no-version"].version).toBe("unknown");
  });

  it("throws on invalid JSON string", () => {
    expect(() => parseListJson("<<<not json>>>")).toThrow();
  });
});
