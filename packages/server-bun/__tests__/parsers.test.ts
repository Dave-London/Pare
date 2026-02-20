import { describe, it, expect } from "vitest";
import {
  parseRunOutput,
  parseTestOutput,
  parseBuildOutput,
  parseInstallOutput,
  parseAddOutput,
  parseRemoveOutput,
  parseOutdatedOutput,
  parsePmLsOutput,
} from "../src/lib/parsers.js";

// ── Run ─────────────────────────────────────────────────────────────

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("dev", "Server started\n", "", 0, 1234);

    expect(result.script).toBe("dev");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Server started");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(1234);
    expect(result.timedOut).toBe(false);
  });

  it("parses failed run", () => {
    const result = parseRunOutput("build", "", "Error: module not found\n", 1, 567);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("Error: module not found");
    expect(result.timedOut).toBe(false);
  });

  it("parses timed-out run", () => {
    const result = parseRunOutput("serve", "", "timed out", 124, 300000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseRunOutput("test", "output here", "warning here", 0, 100);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("output here");
    expect(result.stderr).toBe("warning here");
  });

  it("returns undefined for empty stdout/stderr", () => {
    const result = parseRunOutput("clean", "", "", 0, 50);

    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

// ── Test ────────────────────────────────────────────────────────────

describe("parseTestOutput", () => {
  it("parses test summary with pass/fail/skip counts", () => {
    const stdout = `bun test v1.0.0

src/index.test.ts:
✓ should work [0.12ms]
✗ should fail [0.05ms]
  Expected 1 to be 2

 5 pass
 1 fail
 1 skip
 7 expect() calls
Ran 7 tests across 2 files. [52.00ms]`;

    const result = parseTestOutput(stdout, "", 1, 500);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(7);
  });

  it("parses individual passing test results", () => {
    const stdout = `✓ adds two numbers [0.12ms]
✓ subtracts two numbers [0.08ms]

 2 pass
Ran 2 tests across 1 files. [10.00ms]`;

    const result = parseTestOutput(stdout, "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.tests).toHaveLength(2);
    expect(result.tests![0].name).toBe("adds two numbers");
    expect(result.tests![0].passed).toBe(true);
    expect(result.tests![0].duration).toBe(0.12);
    expect(result.tests![1].name).toBe("subtracts two numbers");
  });

  it("parses individual failing test results with error", () => {
    const stdout = `✗ should validate input [0.05ms]
  error: Expected true to be false

 0 pass
 1 fail
Ran 1 tests across 1 files. [5.00ms]`;

    const result = parseTestOutput(stdout, "", 1, 50);

    expect(result.tests).toHaveLength(1);
    expect(result.tests![0].name).toBe("should validate input");
    expect(result.tests![0].passed).toBe(false);
    expect(result.tests![0].error).toBe("error: Expected true to be false");
  });

  it("handles all-passing output", () => {
    const stdout = ` 10 pass
Ran 10 tests across 3 files. [100.00ms]`;

    const result = parseTestOutput(stdout, "", 0, 200);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(10);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(10);
  });

  it("handles empty output gracefully", () => {
    const result = parseTestOutput("", "", 0, 0);

    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(0);
    expect(result.tests).toBeUndefined();
  });
});

// ── Build ───────────────────────────────────────────────────────────

describe("parseBuildOutput", () => {
  it("parses successful build with artifacts", () => {
    const stdout = `  ./out/index.js  1.50 KB

[8ms] bundle 1 modules`;

    const result = parseBuildOutput(["src/index.ts"], stdout, "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.entrypoints).toEqual(["src/index.ts"]);
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts![0].path).toBe("./out/index.js");
    expect(result.artifacts![0].size).toBe("1.50 KB");
  });

  it("parses failed build", () => {
    const result = parseBuildOutput(["src/index.ts"], "", "error: Could not resolve", 1, 50);

    expect(result.success).toBe(false);
    expect(result.artifacts).toBeUndefined();
    expect(result.stderr).toBe("error: Could not resolve");
  });

  it("handles multiple artifacts", () => {
    const stdout = `  ./out/index.js  2.30 KB
  ./out/utils.js  0.80 KB

[12ms] bundle 2 modules`;

    const result = parseBuildOutput(["src/index.ts", "src/utils.ts"], stdout, "", 0, 200);

    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts![0].path).toBe("./out/index.js");
    expect(result.artifacts![1].path).toBe("./out/utils.js");
  });

  it("returns entrypoints even on empty output", () => {
    const result = parseBuildOutput(["app.ts"], "", "", 0, 10);

    expect(result.entrypoints).toEqual(["app.ts"]);
    expect(result.artifacts).toBeUndefined();
  });
});

// ── Install ─────────────────────────────────────────────────────────

describe("parseInstallOutput", () => {
  it("parses successful install with package count", () => {
    const stdout = `bun install v1.0.0

 + @types/node@20.11.0
 + typescript@5.3.3

 128 packages installed [1.23s]`;

    const result = parseInstallOutput(stdout, "", 0, 1500);

    expect(result.success).toBe(true);
    expect(result.installedCount).toBe(128);
  });

  it("parses install with singular package", () => {
    const stdout = ` 1 package installed [0.05s]`;

    const result = parseInstallOutput(stdout, "", 0, 100);

    expect(result.installedCount).toBe(1);
  });

  it("handles failed install", () => {
    const result = parseInstallOutput("", "error: lockfile not found", 1, 50);

    expect(result.success).toBe(false);
    expect(result.installedCount).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseInstallOutput("", "", 0, 10);

    expect(result.success).toBe(true);
    expect(result.installedCount).toBe(0);
  });
});

// ── Add ─────────────────────────────────────────────────────────────

describe("parseAddOutput", () => {
  it("parses successful add", () => {
    const result = parseAddOutput(["zod"], false, "installed zod@3.22.4", "", 0, 200);

    expect(result.success).toBe(true);
    expect(result.packages).toEqual(["zod"]);
    expect(result.dev).toBe(false);
  });

  it("parses dev add", () => {
    const result = parseAddOutput(["vitest"], true, "installed vitest@1.2.0", "", 0, 300);

    expect(result.success).toBe(true);
    expect(result.dev).toBe(true);
  });

  it("parses multiple packages", () => {
    const result = parseAddOutput(["a", "b", "c"], false, "installed", "", 0, 500);

    expect(result.packages).toEqual(["a", "b", "c"]);
  });

  it("handles failed add", () => {
    const result = parseAddOutput(["nonexistent"], false, "", "error: package not found", 1, 100);

    expect(result.success).toBe(false);
  });
});

// ── Remove ──────────────────────────────────────────────────────────

describe("parseRemoveOutput", () => {
  it("parses successful remove", () => {
    const result = parseRemoveOutput(["zod"], "removed zod", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.packages).toEqual(["zod"]);
  });

  it("handles failed remove", () => {
    const result = parseRemoveOutput(["nonexistent"], "", "error", 1, 50);

    expect(result.success).toBe(false);
  });
});

// ── Outdated ────────────────────────────────────────────────────────

describe("parseOutdatedOutput", () => {
  it("parses outdated table output", () => {
    const stdout = `┌──────────────┬─────────┬────────┬────────┐
│ Package      │ Current │ Update │ Latest │
├──────────────┼─────────┼────────┼────────┤
│ typescript   │ 5.3.3   │ 5.4.0  │ 5.4.0  │
│ vitest       │ 1.2.0   │ 1.3.0  │ 1.4.0  │
└──────────────┴─────────┴────────┴────────┘`;

    const result = parseOutdatedOutput(stdout, "", 0, 200);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.packages[0].name).toBe("typescript");
    expect(result.packages[0].current).toBe("5.3.3");
    expect(result.packages[0].latest).toBe("5.4.0");
    expect(result.packages[0].wanted).toBeUndefined(); // wanted === latest
  });

  it("parses outdated with wanted != latest", () => {
    const stdout = `┌──────────┬─────────┬────────┬────────┐
│ Package  │ Current │ Update │ Latest │
├──────────┼─────────┼────────┼────────┤
│ vitest   │ 1.2.0   │ 1.3.0  │ 1.4.0  │
└──────────┴─────────┴────────┴────────┘`;

    const result = parseOutdatedOutput(stdout, "", 0, 100);

    expect(result.packages[0].wanted).toBe("1.3.0");
    expect(result.packages[0].latest).toBe("1.4.0");
  });

  it("handles no outdated packages", () => {
    const result = parseOutdatedOutput("", "", 0, 50);

    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });
});

// ── Pm Ls ───────────────────────────────────────────────────────────

describe("parsePmLsOutput", () => {
  it("parses package tree output", () => {
    const stdout = `/path/to/project node_modules (3)
├── typescript@5.3.3
├── vitest@1.2.0
└── zod@3.22.4`;

    const result = parsePmLsOutput(stdout, "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.packages[0].name).toBe("typescript");
    expect(result.packages[0].version).toBe("5.3.3");
    expect(result.packages[2].name).toBe("zod");
    expect(result.packages[2].version).toBe("3.22.4");
  });

  it("handles empty output", () => {
    const result = parsePmLsOutput("", "", 0, 10);

    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles scoped packages", () => {
    const stdout = `/path node_modules (1)
├── @types/node@20.11.0`;

    const result = parsePmLsOutput(stdout, "", 0, 50);

    expect(result.packages[0].name).toBe("@types/node");
    expect(result.packages[0].version).toBe("20.11.0");
  });
});
