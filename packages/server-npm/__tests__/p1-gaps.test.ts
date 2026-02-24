import { describe, it, expect } from "vitest";
import {
  parseInstallOutput,
  parseInstallPackageDetails,
  parseListJson,
  parsePnpmListJson,
  parseRunOutput,
  parseTestOutput,
  parseTestResults,
  parseNvmOutput,
  parseNvmLsRemoteOutput,
  parseNvmExecOutput,
} from "../src/lib/parsers.js";
import {
  formatInstall,
  formatList,
  formatRun,
  formatTest,
  formatNvmExec,
} from "../src/lib/formatters.js";
import type { NpmInstall, NpmRun, NpmTest } from "../src/schemas/index.js";
import {
  NpmInstallSchema,
  NpmListSchema,
  NpmRunSchema,
  NpmTestSchema,
  NvmResultSchema,
  NvmLsRemoteSchema,
  NvmExecSchema,
} from "../src/schemas/index.js";

// ── Gap #175: Install package details ────────────────────────────────

describe("Gap #175: parseInstallPackageDetails", () => {
  it("parses npm verbose add lines", () => {
    const output = ["add express 4.18.2", "add body-parser 1.20.1", "added 52 packages in 3s"].join(
      "\n",
    );

    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    expect(details).toHaveLength(2);
    expect(details![0]).toEqual({ name: "express", version: "4.18.2", action: "added" });
    expect(details![1]).toEqual({ name: "body-parser", version: "1.20.1", action: "added" });
  });

  it("parses npm verbose remove lines", () => {
    const output = "remove old-pkg 1.0.0\nadded 10 packages in 1s";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    expect(details![0]).toEqual({ name: "old-pkg", version: "1.0.0", action: "removed" });
  });

  it("parses npm verbose change lines", () => {
    const output = "change lodash 4.17.21\nchanged 1 package in 1s";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    expect(details![0]).toEqual({ name: "lodash", version: "4.17.21", action: "updated" });
  });

  it("parses pnpm + format", () => {
    const output = "+ express 4.18.2\n+ zod 3.25.0\n";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    expect(details).toHaveLength(2);
    expect(details![0].action).toBe("added");
    expect(details![1].name).toBe("zod");
  });

  it("parses pnpm - format", () => {
    const output = "- old-pkg 1.0.0\n";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    expect(details![0]).toEqual({ name: "old-pkg", version: "1.0.0", action: "removed" });
  });

  it("returns undefined for output with no package details", () => {
    const output = "added 52 packages in 3s\n25 packages are looking for funding";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeUndefined();
  });

  it("avoids duplicates between npm and pnpm patterns", () => {
    // If a line matches both patterns, shouldn't be duplicated
    const output = "add express 4.18.2\n+ express 4.18.2\n";
    const details = parseInstallPackageDetails(output);
    expect(details).toBeDefined();
    // Should have express only once (npm 'add' pattern matches first)
    const expressEntries = details!.filter((d) => d.name === "express");
    expect(expressEntries).toHaveLength(1);
  });

  it("integrates with parseInstallOutput", () => {
    const output =
      "add express 4.18.2\nadd zod 3.25.0\nadded 52 packages, and audited 235 packages in 3s";
    const result = parseInstallOutput(output, 3.0);
    expect(result.packageDetails).toBeDefined();
    expect(result.packageDetails).toHaveLength(2);
    expect(result.added).toBe(52);

    // Validate against schema
    const parsed = NpmInstallSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("Gap #175: formatInstall with package details", () => {
  it("shows package details in formatted output", () => {
    const data: NpmInstall = {
      added: 2,
      removed: 0,
      changed: 0,
      packageDetails: [
        { name: "express", version: "4.18.2", action: "added" },
        { name: "zod", version: "3.25.0", action: "added" },
      ],
    };
    const output = formatInstall(data);
    expect(output).toContain("added: express@4.18.2");
    expect(output).toContain("added: zod@3.25.0");
  });

  it("limits displayed packages to 10", () => {
    const details = Array.from({ length: 15 }, (_, i) => ({
      name: `pkg-${i}`,
      version: "1.0.0",
      action: "added" as const,
    }));
    const data: NpmInstall = {
      added: 15,
      removed: 0,
      changed: 0,
      packageDetails: details,
    };
    const output = formatInstall(data);
    expect(output).toContain("pkg-9");
    expect(output).toContain("... and 5 more");
    expect(output).not.toContain("pkg-10");
  });
});

// ── Gap #176: pnpm workspace list handling ───────────────────────────

describe("Gap #176: parsePnpmListJson", () => {
  it("handles single workspace project", () => {
    const json = JSON.stringify([
      {
        name: "root",
        version: "1.0.0",
        dependencies: { express: { version: "4.18.2" } },
      },
    ]);
    const result = parsePnpmListJson(json);
    expect(result.name).toBe("root");
    expect(result.dependencies!.express.version).toBe("4.18.2");
    // total was removed from schema — derivable from Object.keys(dependencies).length
  });

  it("merges dependencies from multiple workspace projects", () => {
    const json = JSON.stringify([
      {
        name: "root",
        version: "1.0.0",
        dependencies: { express: { version: "4.18.2" } },
      },
      {
        name: "packages/api",
        version: "0.1.0",
        dependencies: { fastify: { version: "4.25.0" } },
      },
      {
        name: "packages/web",
        version: "0.2.0",
        dependencies: { react: { version: "18.2.0" } },
      },
    ]);

    const result = parsePnpmListJson(json);

    // Should merge deps from all three workspace projects
    expect(result.name).toBe("root"); // Uses first project's name
    expect(result.dependencies!.express.version).toBe("4.18.2");
    expect(result.dependencies!.fastify.version).toBe("4.25.0");
    expect(result.dependencies!.react.version).toBe("18.2.0");
    // total was removed from schema — derivable from Object.keys(dependencies).length
  });

  it("handles workspace projects with devDependencies", () => {
    const json = JSON.stringify([
      {
        name: "root",
        version: "1.0.0",
        dependencies: { express: { version: "4.18.2" } },
        devDependencies: { typescript: { version: "5.3.0" } },
      },
      {
        name: "packages/api",
        version: "0.1.0",
        devDependencies: { vitest: { version: "1.0.0" } },
      },
    ]);

    const result = parsePnpmListJson(json);

    // Main deps
    expect(result.dependencies!.express).toBeDefined();
    // Dev deps should be merged and typed
    expect(result.dependencies!.typescript).toBeDefined();
    expect(result.dependencies!.typescript.type).toBe("devDependency");
    expect(result.dependencies!.vitest).toBeDefined();
    expect(result.dependencies!.vitest.type).toBe("devDependency");
  });

  it("handles empty array", () => {
    const result = parsePnpmListJson("[]");
    expect(result.name).toBe("unknown");
    // total was removed from schema — derivable from Object.keys(dependencies).length
  });

  it("handles non-array (single object)", () => {
    const json = JSON.stringify({
      name: "single",
      version: "1.0.0",
      dependencies: { zod: { version: "3.25.0" } },
    });
    const result = parsePnpmListJson(json);
    expect(result.name).toBe("single");
    expect(result.dependencies!.zod.version).toBe("3.25.0");
  });

  it("deduplicates: first workspace wins for same package", () => {
    const json = JSON.stringify([
      {
        name: "root",
        version: "1.0.0",
        dependencies: { lodash: { version: "4.17.21" } },
      },
      {
        name: "packages/api",
        version: "0.1.0",
        dependencies: { lodash: { version: "4.17.20" } },
      },
    ]);

    const result = parsePnpmListJson(json);
    // First workspace's version wins (lodash is not overwritten)
    expect(result.dependencies!.lodash.version).toBe("4.17.21");
  });

  it("validates against NpmListSchema", () => {
    const json = JSON.stringify([
      {
        name: "root",
        version: "1.0.0",
        dependencies: { express: { version: "4.18.2" } },
      },
      {
        name: "packages/api",
        version: "0.1.0",
        dependencies: { fastify: { version: "4.25.0" } },
      },
    ]);

    const result = parsePnpmListJson(json);
    const parsed = NpmListSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

// ── Gap #177: Dependency type field in list ──────────────────────────

describe("Gap #177: parseListJson with dependency types", () => {
  it("tags dependencies when devDependencies are separate", () => {
    const json = JSON.stringify({
      name: "typed-project",
      version: "1.0.0",
      dependencies: { express: { version: "4.18.2" } },
      devDependencies: { typescript: { version: "5.3.0" } },
    });

    const result = parseListJson(json);

    expect(result.dependencies!.express.type).toBe("dependency");
    expect(result.dependencies!.typescript.type).toBe("devDependency");
  });

  it("tags optionalDependencies", () => {
    const json = JSON.stringify({
      name: "typed-project",
      version: "1.0.0",
      dependencies: { express: { version: "4.18.2" } },
      optionalDependencies: { fsevents: { version: "2.3.3" } },
    });

    const result = parseListJson(json);

    expect(result.dependencies!.express.type).toBe("dependency");
    expect(result.dependencies!.fsevents.type).toBe("optionalDependency");
  });

  it("does not tag when only dependencies key exists", () => {
    const json = JSON.stringify({
      name: "untyped-project",
      version: "1.0.0",
      dependencies: { express: { version: "4.18.2" }, lodash: { version: "4.17.21" } },
    });

    const result = parseListJson(json);

    // Without separate devDependencies/optionalDependencies, type is undefined
    expect(result.dependencies!.express.type).toBeUndefined();
    expect(result.dependencies!.lodash.type).toBeUndefined();
  });

  it("validates typed dependencies against schema", () => {
    const json = JSON.stringify({
      name: "test",
      version: "1.0.0",
      dependencies: { express: { version: "4.18.2" } },
      devDependencies: { vitest: { version: "1.0.0" } },
    });

    const result = parseListJson(json);
    const parsed = NpmListSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("Gap #177: formatList with types", () => {
  it("shows type tags in formatted output", () => {
    const data = {
      name: "test",
      version: "1.0.0",
      dependencies: {
        express: { version: "4.18.2", type: "dependency" as const },
        vitest: { version: "1.0.0", type: "devDependency" as const },
      },
    };
    const output = formatList(data);
    expect(output).toContain("express@4.18.2 [dependency]");
    expect(output).toContain("vitest@1.0.0 [devDependency]");
  });
});

// ── Gap #178: nvm ls-remote ──────────────────────────────────────────

describe("Gap #178: parseNvmLsRemoteOutput", () => {
  it("parses versions with and without LTS", () => {
    const output = [
      "        v20.0.0",
      "        v20.11.1   (Latest LTS: Iron)",
      "        v21.0.0",
      "        v21.7.0",
    ].join("\n");

    const result = parseNvmLsRemoteOutput(output, 10);

    expect(result.versions).toHaveLength(4);
    expect(result.versions[0]).toEqual({ version: "v20.0.0" });
    expect(result.versions[1]).toEqual({ version: "v20.11.1", lts: "iron" });
    expect(result.versions[2]).toEqual({ version: "v21.0.0" });
    expect(result.versions[3]).toEqual({ version: "v21.7.0" });
  });

  it("filters to last N major versions", () => {
    const output = [
      "        v14.0.0",
      "        v16.0.0",
      "        v18.0.0",
      "        v20.0.0",
      "        v22.0.0",
    ].join("\n");

    const result = parseNvmLsRemoteOutput(output, 2);

    // Only v22 and v20
    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].version).toBe("v20.0.0");
    expect(result.versions[1].version).toBe("v22.0.0");
  });

  it("handles LTS: format (non-Latest)", () => {
    const output = "        v18.19.0   (LTS: Hydrogen)\n";
    const result = parseNvmLsRemoteOutput(output, 10);
    expect(result.versions[0].lts).toBe("hydrogen");
  });

  it("validates against schema", () => {
    const output = "        v20.11.1   (Latest LTS: Iron)\n        v22.0.0\n";
    const result = parseNvmLsRemoteOutput(output, 10);
    const parsed = NvmLsRemoteSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

// ── Gap #179: LTS tagging in nvm list ────────────────────────────────

describe("Gap #179: LTS tagging in nvm list", () => {
  it("tags LTS versions from alias lines", () => {
    const listOutput = [
      "->     v20.11.1",
      "       v18.19.0",
      "       v16.20.2",
      "lts/gallium -> v16.20.2",
      "lts/hydrogen -> v18.19.0",
      "lts/iron -> v20.11.1",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.versions[0]).toEqual({ version: "v20.11.1", lts: "iron" });
    expect(result.versions[1]).toEqual({ version: "v18.19.0", lts: "hydrogen" });
    expect(result.versions[2]).toEqual({ version: "v16.20.2", lts: "gallium" });
  });

  it("non-LTS versions have no lts field", () => {
    const listOutput = ["->     v21.7.0", "       v20.11.1", "lts/iron -> v20.11.1"].join("\n");

    const result = parseNvmOutput(listOutput, "");

    expect(result.versions[0]).toEqual({ version: "v21.7.0" });
    expect(result.versions[1]).toEqual({ version: "v20.11.1", lts: "iron" });
  });

  it("validates against NvmResultSchema", () => {
    const listOutput = [
      "->     v20.11.1",
      "       v18.19.0",
      "lts/hydrogen -> v18.19.0",
      "lts/iron -> v20.11.1",
    ].join("\n");

    const result = parseNvmOutput(listOutput, "");
    const parsed = NvmResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

// ── Gap #180: nvm exec ───────────────────────────────────────────────

describe("Gap #180: parseNvmExecOutput", () => {
  it("parses successful execution", () => {
    const result = parseNvmExecOutput("20.11.1", 0, "v20.11.1\n", "");

    expect(result.version).toBe("v20.11.1");
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
    expect(result.stdout).toBe("v20.11.1");
    expect(result.stderr).toBe("");
  });

  it("parses failed execution", () => {
    const result = parseNvmExecOutput("18.19.0", 1, "", "Error: Cannot find module\n");

    expect(result.version).toBe("v18.19.0");
    expect(result.exitCode).toBe(1);
    expect(result.success).toBe(false);
    expect(result.stderr).toContain("Cannot find module");
  });

  it("normalizes version prefix", () => {
    const result1 = parseNvmExecOutput("20.11.1", 0, "", "");
    expect(result1.version).toBe("v20.11.1");

    const result2 = parseNvmExecOutput("v20.11.1", 0, "", "");
    expect(result2.version).toBe("v20.11.1");
  });

  it("validates against NvmExecSchema", () => {
    const result = parseNvmExecOutput("20.11.1", 0, "hello", "");
    const parsed = NvmExecSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("Gap #180: formatNvmExec", () => {
  it("formats successful execution", () => {
    const output = formatNvmExec({
      version: "v20.11.1",
      exitCode: 0,
      stdout: "hello world",
      stderr: "",
      success: true,
    });
    expect(output).toContain("Command completed successfully using Node.js v20.11.1");
    expect(output).toContain("hello world");
  });

  it("formats failed execution with stderr", () => {
    const output = formatNvmExec({
      version: "v18.19.0",
      exitCode: 1,
      stdout: "",
      stderr: "SyntaxError: Unexpected token",
      success: false,
    });
    expect(output).toContain("Command failed (exit code 1) using Node.js v18.19.0");
    expect(output).toContain("SyntaxError");
  });
});

// ── Gap #181: timedOut in run tool ───────────────────────────────────

describe("Gap #181: timedOut in run output", () => {
  it("returns timedOut: false for normal execution", () => {
    const result = parseRunOutput("build", 0, "done", "", 2.0);
    expect(result.timedOut).toBe(false);
    expect(result.success).toBe(true);
  });

  it("returns timedOut: true when timed out", () => {
    const result = parseRunOutput("long-task", 124, "", "timed out", 300.0, true);
    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(124);
  });

  it("success is false when timed out even with exit code 0", () => {
    // Edge case: shouldn't happen in practice, but test the logic
    const result = parseRunOutput("task", 0, "partial output", "", 60.0, true);
    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
  });

  it("validates against NpmRunSchema", () => {
    const result = parseRunOutput("build", 0, "done", "", 2.0);
    const parsed = NpmRunSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.timedOut).toBe(false);
  });

  it("validates timed out result against schema", () => {
    const result = parseRunOutput("task", 124, "", "timeout", 300.0, true);
    const parsed = NpmRunSchema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.timedOut).toBe(true);
  });
});

describe("Gap #181: formatRun with timeout", () => {
  it("formats timed out script", () => {
    const data: NpmRun = {
      exitCode: 124,
      stdout: "",
      stderr: "Command timed out",
      success: false,
      timedOut: true,
    };
    const output = formatRun(data, "long-task", 300.0);
    expect(output).toContain('Script "long-task" timed out');
    expect(output).toContain("300s");
  });

  it("formats normal success without timeout indication", () => {
    const data: NpmRun = {
      exitCode: 0,
      stdout: "done",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatRun(data, "build", 2.0);
    expect(output).toContain("completed successfully");
    expect(output).not.toContain("timed out");
  });
});

// ── Gap #182: Test result parsing ────────────────────────────────────

describe("Gap #182: parseTestResults", () => {
  it("parses Jest output", () => {
    const stdout = "Tests:  3 failed, 42 passed, 2 skipped, 47 total\nTime: 5.2s";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 3, skipped: 2, total: 47 });
  });

  it("parses Jest output with all passing", () => {
    const stdout = "Tests:  42 passed, 42 total\nTime: 3.5s";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 0, skipped: 0, total: 42 });
  });

  it("parses Vitest v2 summary output", () => {
    const stdout = "Tests  42 passed | 3 failed (45)";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 3, skipped: 0, total: 45 });
  });

  it("parses Vitest v2 with skipped", () => {
    const stdout = "Tests  40 passed | 3 failed | 2 skipped (45)";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 40, failed: 3, skipped: 2, total: 45 });
  });

  it("parses Mocha output", () => {
    const stdout = "  42 passing (3s)\n  3 failing\n  2 pending";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 3, skipped: 2, total: 47 });
  });

  it("parses Mocha output with only passing", () => {
    const stdout = "  42 passing (3s)";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 0, skipped: 0, total: 42 });
  });

  it("parses TAP output", () => {
    const stdout = "# tests 47\n# pass 42\n# fail 3\n# skip 2";
    const result = parseTestResults(stdout, "");
    expect(result).toEqual({ passed: 42, failed: 3, skipped: 2, total: 47 });
  });

  it("parses test results from stderr too", () => {
    // Some frameworks output to stderr
    const result = parseTestResults("", "Tests:  5 failed, 10 passed, 15 total");
    expect(result).toEqual({ passed: 10, failed: 5, skipped: 0, total: 15 });
  });

  it("returns undefined for unrecognized output", () => {
    const result = parseTestResults("All good!", "");
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty output", () => {
    const result = parseTestResults("", "");
    expect(result).toBeUndefined();
  });
});

describe("Gap #182: parseTestOutput integration", () => {
  it("includes testResults when framework output is detected", () => {
    const result = parseTestOutput(0, "Tests:  42 passed, 42 total\nTime: 3.5s", "", 3.5);

    expect(result.testResults).toBeDefined();
    expect(result.testResults!.passed).toBe(42);
    expect(result.testResults!.total).toBe(42);
    expect(result.success).toBe(true);

    // Validate against schema
    const parsed = NpmTestSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("omits testResults when framework output is not detected", () => {
    const result = parseTestOutput(0, "OK", "", 1.0);

    expect(result.testResults).toBeUndefined();
  });

  it("includes testResults even for failed tests", () => {
    const result = parseTestOutput(
      1,
      "Tests:  3 failed, 39 passed, 42 total",
      "FAIL src/index.test.ts",
      4.2,
    );

    expect(result.testResults).toBeDefined();
    expect(result.testResults!.failed).toBe(3);
    expect(result.testResults!.passed).toBe(39);
    expect(result.success).toBe(false);
  });
});

describe("Gap #182: formatTest with testResults", () => {
  it("shows test results in formatted output", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "All tests passed",
      stderr: "",
      success: true,
      timedOut: false,
      testResults: { passed: 42, failed: 0, skipped: 2, total: 44 },
    };
    const output = formatTest(data, 3.5);
    expect(output).toContain("Results: 42 passed, 0 failed, 2 skipped (44 total)");
  });

  it("does not show results line when no testResults", () => {
    const data: NpmTest = {
      exitCode: 0,
      stdout: "OK",
      stderr: "",
      success: true,
      timedOut: false,
    };
    const output = formatTest(data, 1.0);
    expect(output).not.toContain("Results:");
  });
});
