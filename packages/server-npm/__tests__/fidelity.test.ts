/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw npm CLI output.
 *
 * These tests use realistic fixture data representing actual npm CLI output,
 * run Pare's parsers on the fixtures, then assert every piece of data from
 * the raw output appears in the structured result.
 */
import { describe, it, expect } from "vitest";
import {
  parseInstallOutput,
  parseAuditJson,
  parseOutdatedJson,
  parseListJson,
  parseRunOutput,
  parseTestOutput,
  parseInitOutput,
} from "../src/lib/parsers.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const INSTALL_BASIC =
  "added 42 packages, removed 3 packages, changed 5 packages in 12s\n" +
  "8 packages are looking for funding\n" +
  "  run `npm fund` for details";

const INSTALL_WITH_VULNS =
  "added 150 packages in 8s\n" +
  "12 packages are looking for funding\n" +
  "  run `npm fund` for details\n" +
  "\n" +
  "3 vulnerabilities (2 moderate, 1 high)\n" +
  "\n" +
  "To address all issues, run:\n" +
  "  npm audit fix";

const INSTALL_CLEAN = "added 87 packages in 4s\n" + "\n" + "found 0 vulnerabilities";

const INSTALL_FUNDING_ONLY =
  "added 200 packages, changed 1 package in 15s\n" +
  "25 packages are looking for funding\n" +
  "  run `npm fund` for details";

const INSTALL_ALL_SEVERITIES =
  "added 300 packages in 20s\n" +
  "10 vulnerabilities (1 info, 2 low, 3 moderate, 2 high, 2 critical)";

const AUDIT_MULTIPLE_VULNS = JSON.stringify({
  vulnerabilities: {
    lodash: {
      name: "lodash",
      severity: "critical",
      title: "Prototype Pollution",
      via: [
        { title: "Prototype Pollution", url: "https://github.com/advisories/GHSA-jf85-cpcp-j695" },
      ],
      range: "<4.17.21",
      fixAvailable: true,
    },
    "node-fetch": {
      name: "node-fetch",
      severity: "high",
      title: "Exposure of Sensitive Information",
      via: [
        {
          title: "Exposure of Sensitive Information to an Unauthorized Actor",
          url: "https://github.com/advisories/GHSA-r683-j2x4-v87g",
        },
      ],
      range: "<2.6.7",
      fixAvailable: true,
    },
    minimist: {
      name: "minimist",
      severity: "moderate",
      title: "Prototype Pollution",
      via: [
        {
          title: "Prototype Pollution in minimist",
          url: "https://github.com/advisories/GHSA-xvch-5gv4-984h",
        },
      ],
      range: "<1.2.6",
      fixAvailable: false,
    },
    glob: {
      name: "glob",
      severity: "low",
      title: "Regular Expression Denial of Service",
      via: [{ title: "ReDoS in glob" }],
      range: "<7.2.0",
      fixAvailable: true,
    },
  },
  metadata: {
    vulnerabilities: {
      total: 4,
      critical: 1,
      high: 1,
      moderate: 1,
      low: 1,
      info: 0,
    },
  },
});

const AUDIT_ZERO_VULNS = JSON.stringify({
  vulnerabilities: {},
  metadata: {
    vulnerabilities: {
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
    },
  },
});

const AUDIT_NO_FIX = JSON.stringify({
  vulnerabilities: {
    "tough-cookie": {
      name: "tough-cookie",
      severity: "moderate",
      title: "Prototype Pollution",
      via: [
        {
          title: "Prototype Pollution in tough-cookie",
          url: "https://github.com/advisories/GHSA-72xf-g2v4-qvf3",
        },
      ],
      range: "<4.1.3",
      fixAvailable: false,
    },
  },
  metadata: {
    vulnerabilities: {
      total: 1,
      critical: 0,
      high: 0,
      moderate: 1,
      low: 0,
      info: 0,
    },
  },
});

const OUTDATED_MULTIPLE = JSON.stringify({
  typescript: {
    current: "5.3.3",
    wanted: "5.4.5",
    latest: "5.5.2",
    dependent: "my-app",
    location: "node_modules/typescript",
    type: "devDependencies",
  },
  express: {
    current: "4.18.2",
    wanted: "4.19.2",
    latest: "5.0.0",
    dependent: "my-app",
    location: "node_modules/express",
    type: "dependencies",
  },
  zod: {
    current: "3.22.0",
    wanted: "3.23.8",
    latest: "4.0.0",
    dependent: "my-app",
    location: "node_modules/zod",
    type: "dependencies",
  },
});

const OUTDATED_EMPTY = JSON.stringify({});

const LIST_BASIC = JSON.stringify({
  name: "my-app",
  version: "1.2.3",
  dependencies: {
    express: {
      version: "4.18.2",
      resolved: "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
    },
    zod: { version: "3.22.4", resolved: "https://registry.npmjs.org/zod/-/zod-3.22.4.tgz" },
    typescript: { version: "5.3.3" },
  },
});

const LIST_NESTED = JSON.stringify({
  name: "@paretools/npm",
  version: "0.3.0",
  dependencies: {
    "@modelcontextprotocol/sdk": {
      version: "1.26.0",
      resolved: "https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.26.0.tgz",
    },
    zod: {
      version: "4.3.6",
      resolved: "https://registry.npmjs.org/zod/-/zod-4.3.6.tgz",
    },
    vitest: {
      version: "4.0.18",
    },
    "strip-ansi": {
      version: "7.1.0",
    },
    chalk: {
      version: "5.3.0",
    },
  },
});

const LIST_EMPTY = JSON.stringify({
  name: "empty-project",
  version: "0.0.1",
  dependencies: {},
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("fidelity: npm install", () => {
  it("preserves package counts from install output", () => {
    const result = parseInstallOutput(INSTALL_BASIC);

    expect(result.added).toBe(42);
    expect(result.removed).toBe(3);
    expect(result.changed).toBe(5);
    // duration was removed from schema — now only in formatter
  });

  it("preserves vulnerability summary extraction", () => {
    const result = parseInstallOutput(INSTALL_WITH_VULNS);

    expect(result.added).toBe(150);
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities!.total).toBe(3);
    expect(result.vulnerabilities!.moderate).toBe(2);
    expect(result.vulnerabilities!.high).toBe(1);
    expect(result.vulnerabilities!.critical).toBe(0);
    expect(result.vulnerabilities!.low).toBe(0);
    expect(result.vulnerabilities!.info).toBe(0);
  });

  it("handles clean install with no vulnerabilities", () => {
    const result = parseInstallOutput(INSTALL_CLEAN);

    expect(result.added).toBe(87);
    expect(result.removed).toBe(0);
    expect(result.changed).toBe(0);
    // "found 0 vulnerabilities" should NOT produce a vulnerabilities object
    // because the regex looks for "X vulnerabilit" which matches "0 vulnerabilities"
    // The parser sets total = 0 and all severity counts = 0
    // duration was removed from schema — now only in formatter
  });

  it("preserves funding count", () => {
    const result = parseInstallOutput(INSTALL_FUNDING_ONLY);

    expect(result.added).toBe(200);
    expect(result.changed).toBe(1);
    expect(result.funding).toBe(25);
  });

  it("preserves funding count from detailed install output", () => {
    const result = parseInstallOutput(INSTALL_BASIC);

    expect(result.funding).toBe(8);
  });

  it("preserves all severity levels when present", () => {
    const result = parseInstallOutput(INSTALL_ALL_SEVERITIES);

    expect(result.added).toBe(300);
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities!.total).toBe(10);
    expect(result.vulnerabilities!.info).toBe(1);
    expect(result.vulnerabilities!.low).toBe(2);
    expect(result.vulnerabilities!.moderate).toBe(3);
    expect(result.vulnerabilities!.high).toBe(2);
    expect(result.vulnerabilities!.critical).toBe(2);
  });
});

describe("fidelity: npm audit", () => {
  it("preserves every vulnerability from raw JSON", () => {
    const result = parseAuditJson(AUDIT_MULTIPLE_VULNS);

    expect(result.vulnerabilities).toHaveLength(4);

    const names = result.vulnerabilities.map((v) => v.name);
    expect(names).toContain("lodash");
    expect(names).toContain("node-fetch");
    expect(names).toContain("minimist");
    expect(names).toContain("glob");
  });

  it("preserves severity mapping for each vulnerability", () => {
    const result = parseAuditJson(AUDIT_MULTIPLE_VULNS);

    const bySeverity = Object.fromEntries(result.vulnerabilities.map((v) => [v.name, v.severity]));

    expect(bySeverity["lodash"]).toBe("critical");
    expect(bySeverity["node-fetch"]).toBe("high");
    expect(bySeverity["minimist"]).toBe("moderate");
    expect(bySeverity["glob"]).toBe("low");
  });

  it("preserves fixAvailable flag for each vulnerability", () => {
    const result = parseAuditJson(AUDIT_MULTIPLE_VULNS);

    const byFix = Object.fromEntries(result.vulnerabilities.map((v) => [v.name, v.fixAvailable]));

    expect(byFix["lodash"]).toBe(true);
    expect(byFix["node-fetch"]).toBe(true);
    expect(byFix["minimist"]).toBe(false);
    expect(byFix["glob"]).toBe(true);
  });

  it("handles zero vulnerabilities case", () => {
    const result = parseAuditJson(AUDIT_ZERO_VULNS);

    expect(result.vulnerabilities).toHaveLength(0);
    // summary was removed from schema — derivable from vulnerabilities array
  });

  it("preserves vulnerability counts derivable from array", () => {
    const result = parseAuditJson(AUDIT_MULTIPLE_VULNS);

    // summary was removed from schema — verify counts via array
    expect(result.vulnerabilities).toHaveLength(4);
    const bySeverity = result.vulnerabilities.reduce(
      (acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    expect(bySeverity["critical"]).toBe(1);
    expect(bySeverity["high"]).toBe(1);
    expect(bySeverity["moderate"]).toBe(1);
    expect(bySeverity["low"]).toBe(1);
  });

  it("preserves title and URL from via array", () => {
    const result = parseAuditJson(AUDIT_MULTIPLE_VULNS);

    const lodash = result.vulnerabilities.find((v) => v.name === "lodash")!;
    expect(lodash.title).toBe("Prototype Pollution");
    expect(lodash.url).toBe("https://github.com/advisories/GHSA-jf85-cpcp-j695");
    expect(lodash.range).toBe("<4.17.21");
  });

  it("preserves fixAvailable=false when no fix is available", () => {
    const result = parseAuditJson(AUDIT_NO_FIX);

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].name).toBe("tough-cookie");
    expect(result.vulnerabilities[0].fixAvailable).toBe(false);
    expect(result.vulnerabilities[0].severity).toBe("moderate");
  });
});

describe("fidelity: npm outdated", () => {
  it("preserves every outdated package with correct versions", () => {
    const result = parseOutdatedJson(OUTDATED_MULTIPLE);

    expect(result.packages).toHaveLength(3);

    const ts = result.packages.find((p) => p.name === "typescript")!;
    expect(ts.current).toBe("5.3.3");
    expect(ts.wanted).toBe("5.4.5");
    expect(ts.latest).toBe("5.5.2");

    const express = result.packages.find((p) => p.name === "express")!;
    expect(express.current).toBe("4.18.2");
    expect(express.wanted).toBe("4.19.2");
    expect(express.latest).toBe("5.0.0");

    const zod = result.packages.find((p) => p.name === "zod")!;
    expect(zod.current).toBe("3.22.0");
    expect(zod.wanted).toBe("3.23.8");
    expect(zod.latest).toBe("4.0.0");
  });

  it("preserves location and type fields", () => {
    const result = parseOutdatedJson(OUTDATED_MULTIPLE);

    const ts = result.packages.find((p) => p.name === "typescript")!;
    expect(ts.location).toBe("node_modules/typescript");
    expect(ts.type).toBe("devDependencies");

    const express = result.packages.find((p) => p.name === "express")!;
    expect(express.location).toBe("node_modules/express");
    expect(express.type).toBe("dependencies");
  });

  it("handles empty case (all packages up to date)", () => {
    const result = parseOutdatedJson(OUTDATED_EMPTY);

    expect(result.packages).toHaveLength(0);
    // total was removed from schema — derivable from packages.length
  });
});

describe("fidelity: npm list", () => {
  it("preserves every dependency with version", () => {
    const result = parseListJson(LIST_BASIC);

    expect(result.name).toBe("my-app");
    expect(result.version).toBe("1.2.3");
    // total was removed from schema — derivable from Object.keys(dependencies).length

    expect(result.dependencies["express"]).toBeDefined();
    expect(result.dependencies["express"].version).toBe("4.18.2");

    expect(result.dependencies["zod"]).toBeDefined();
    expect(result.dependencies["zod"].version).toBe("3.22.4");

    expect(result.dependencies["typescript"]).toBeDefined();
    expect(result.dependencies["typescript"].version).toBe("5.3.3");
  });

  it("strips resolved URLs from output", () => {
    const result = parseListJson(LIST_BASIC);

    // resolved URLs are intentionally omitted to save tokens
    expect(result.dependencies["express"]).not.toHaveProperty("resolved");
    expect(result.dependencies["zod"]).not.toHaveProperty("resolved");
    expect(result.dependencies["typescript"]).not.toHaveProperty("resolved");
  });

  it("preserves package name and version for scoped packages", () => {
    const result = parseListJson(LIST_NESTED);

    expect(result.name).toBe("@paretools/npm");
    expect(result.version).toBe("0.3.0");
    // total was removed from schema — derivable from Object.keys(dependencies).length

    expect(result.dependencies["@modelcontextprotocol/sdk"]).toBeDefined();
    expect(result.dependencies["@modelcontextprotocol/sdk"].version).toBe("1.26.0");

    expect(result.dependencies["zod"]).toBeDefined();
    expect(result.dependencies["zod"].version).toBe("4.3.6");

    expect(result.dependencies["vitest"]).toBeDefined();
    expect(result.dependencies["vitest"].version).toBe("4.0.18");

    expect(result.dependencies["strip-ansi"]).toBeDefined();
    expect(result.dependencies["strip-ansi"].version).toBe("7.1.0");

    expect(result.dependencies["chalk"]).toBeDefined();
    expect(result.dependencies["chalk"].version).toBe("5.3.0");
  });

  it("handles project with no dependencies", () => {
    const result = parseListJson(LIST_EMPTY);

    expect(result.name).toBe("empty-project");
    expect(result.version).toBe("0.0.1");
    expect(result.dependencies).toEqual({});
    // total was removed from schema — derivable from Object.keys(dependencies).length
  });
});

// ─── Run Fixtures ─────────────────────────────────────────────────────────────

const RUN_BUILD_SUCCESS_STDOUT =
  "> my-app@1.0.0 build\n> tsc && node esbuild.config.js\n\nBuild complete.\nOutput: dist/index.js (42 KB)";

const RUN_BUILD_FAILURE_STDERR =
  "> my-app@1.0.0 build\n> tsc\n\nsrc/index.ts(15,3): error TS2322: Type 'string' is not assignable to type 'number'.\nsrc/lib/utils.ts(8,1): error TS2345: Argument of type 'null' is not assignable.\nnpm error code ELIFECYCLE\nnpm error errno 2";

const RUN_MISSING_SCRIPT_STDERR =
  'npm error Missing script: "deploy"\nnpm error\nnpm error To see a list of scripts, run:\nnpm error   npm run\nnpm error A complete list of scripts is available when running `npm run --json`.';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const TEST_PASSING_STDOUT =
  "> my-app@1.0.0 test\n> vitest run\n\n ✓ src/index.test.ts (5 tests) 120ms\n ✓ src/lib/utils.test.ts (12 tests) 85ms\n\nTest Files  2 passed (2)\n     Tests  17 passed (17)\n  Start at  10:30:00\n  Duration  1.23s";

const TEST_FAILING_STDOUT =
  "> my-app@1.0.0 test\n> vitest run\n\n ✓ src/index.test.ts (5 tests) 120ms\n ✗ src/lib/utils.test.ts (2 failed | 10 passed)\n\nTest Files  1 failed | 1 passed (2)\n     Tests  2 failed | 15 passed (17)";

const TEST_FAILING_STDERR =
  "FAIL src/lib/utils.test.ts > parseInput > handles null\nAssertionError: expected null to be 'default'\n  at src/lib/utils.test.ts:25:10";

const TEST_NO_SCRIPT_STDERR =
  'npm error Missing script: "test"\nnpm error\nnpm error To see a list of scripts, run:\nnpm error   npm run';

// ─── Fidelity: npm run ───────────────────────────────────────────────────────

describe("fidelity: npm run", () => {
  it("preserves stdout from successful build script", () => {
    const result = parseRunOutput("build", 0, RUN_BUILD_SUCCESS_STDOUT, "", 3.2);

    // script and duration were removed from schema — now only in formatter
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("Build complete");
    expect(result.stdout).toContain("dist/index.js");
    expect(result.stdout).toContain("42 KB");
    expect(result.stderr).toBe("");
  });

  it("preserves stderr from failed build script", () => {
    const result = parseRunOutput("build", 2, "", RUN_BUILD_FAILURE_STDERR, 1.8);

    // script and duration were removed from schema — now only in formatter
    expect(result.exitCode).toBe(2);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("error TS2322");
    expect(result.stderr).toContain("error TS2345");
    expect(result.stderr).toContain("ELIFECYCLE");
    expect(result.stdout).toBe("");
  });

  it("preserves error details for missing script", () => {
    const result = parseRunOutput("deploy", 1, "", RUN_MISSING_SCRIPT_STDERR, 0.1);

    // script was removed from schema — now only in formatter
    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Missing script: "deploy"');
    expect(result.stderr).toContain("npm run");
    expect(result.stdout).toBe("");
  });

  it("preserves both stdout and stderr when script emits both", () => {
    const stdout = "Compiling 15 files...\nDone.";
    const stderr = "Warning: deprecated API usage in lib/compat.ts";
    const result = parseRunOutput("build", 0, stdout, stderr, 2.5);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("Compiling 15 files");
    expect(result.stdout).toContain("Done.");
    expect(result.stderr).toContain("deprecated API usage");
  });
});

// ─── Fidelity: npm test ──────────────────────────────────────────────────────

describe("fidelity: npm test", () => {
  it("preserves output from passing test run", () => {
    const result = parseTestOutput(0, TEST_PASSING_STDOUT, "", 1.23);

    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toContain("17 passed");
    expect(result.stdout).toContain("2 passed (2)");
    expect(result.stderr).toBe("");
    // duration was removed from schema — now only in formatter
  });

  it("preserves output from failing test run", () => {
    const result = parseTestOutput(1, TEST_FAILING_STDOUT, TEST_FAILING_STDERR, 2.1);

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stdout).toContain("2 failed");
    expect(result.stdout).toContain("15 passed");
    expect(result.stderr).toContain("FAIL src/lib/utils.test.ts");
    expect(result.stderr).toContain("AssertionError");
    expect(result.stderr).toContain("expected null to be 'default'");
    // duration was removed from schema — now only in formatter
  });

  it("preserves error when no test script defined", () => {
    const result = parseTestOutput(1, "", TEST_NO_SCRIPT_STDERR, 0.2);

    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain('Missing script: "test"');
  });
});

// ─── Fidelity: npm init ──────────────────────────────────────────────────────

describe("fidelity: npm init", () => {
  it("preserves package.json metadata from successful init", () => {
    const result = parseInitOutput(
      true,
      "my-new-app",
      "1.0.0",
      "/home/user/projects/my-new-app/package.json",
    );

    expect(result.success).toBe(true);
    expect(result.packageName).toBe("my-new-app");
    expect(result.version).toBe("1.0.0");
    expect(result.path).toBe("/home/user/projects/my-new-app/package.json");
  });

  it("preserves scoped package name from init", () => {
    const result = parseInitOutput(
      true,
      "@company/shared-utils",
      "0.1.0",
      "/workspace/shared-utils/package.json",
    );

    expect(result.success).toBe(true);
    expect(result.packageName).toBe("@company/shared-utils");
    expect(result.version).toBe("0.1.0");
  });

  it("preserves failure state when init fails", () => {
    const result = parseInitOutput(false, "unknown", "0.0.0", "/readonly-dir/package.json");

    expect(result.success).toBe(false);
    expect(result.packageName).toBe("unknown");
    expect(result.version).toBe("0.0.0");
    expect(result.path).toBe("/readonly-dir/package.json");
  });

  it("preserves default version from npm init -y", () => {
    const result = parseInitOutput(true, "test-project", "1.0.0", "/tmp/test-project/package.json");

    expect(result.success).toBe(true);
    expect(result.version).toBe("1.0.0");
  });
});
