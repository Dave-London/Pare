/**
 * Unit tests for helper functions exported from src/tools/.
 * These cover getRunCommand, getCoverageCommand, readJsonOutput,
 * buildRunExtraArgs, buildCoverageExtraArgs, buildPlaywrightExtraArgs,
 * and extractJson edge cases not covered by extract-json.test.ts.
 */
import { describe, it, expect, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getRunCommand, readJsonOutput, buildRunExtraArgs } from "../src/tools/run.js";
import { getCoverageCommand, buildCoverageExtraArgs } from "../src/tools/coverage.js";
import { buildPlaywrightExtraArgs } from "../src/tools/playwright.js";

// ---------------------------------------------------------------------------
// getRunCommand
// ---------------------------------------------------------------------------
describe("getRunCommand", () => {
  it("returns python -m pytest -v for pytest framework", () => {
    const { cmd, cmdArgs } = getRunCommand("pytest", []);
    expect(cmd).toBe("python");
    expect(cmdArgs).toEqual(["-m", "pytest", "-v"]);
  });

  it("returns npx jest --json for jest framework", () => {
    const { cmd, cmdArgs } = getRunCommand("jest", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs).toEqual(["jest", "--json"]);
  });

  it("returns npx vitest run --reporter=json for vitest framework", () => {
    const { cmd, cmdArgs } = getRunCommand("vitest", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs).toEqual(["vitest", "run", "--reporter=json"]);
  });

  it("returns npx mocha --reporter json for mocha framework", () => {
    const { cmd, cmdArgs } = getRunCommand("mocha", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs).toEqual(["mocha", "--reporter", "json"]);
  });

  it("appends extra args for pytest", () => {
    const { cmdArgs } = getRunCommand("pytest", ["-k", "test_foo"]);
    expect(cmdArgs).toEqual(["-m", "pytest", "-v", "-k", "test_foo"]);
  });

  it("appends extra args for jest", () => {
    const { cmdArgs } = getRunCommand("jest", ["--testPathPattern", "login"]);
    expect(cmdArgs).toEqual(["jest", "--json", "--testPathPattern", "login"]);
  });

  it("appends extra args for vitest", () => {
    const { cmdArgs } = getRunCommand("vitest", ["src/utils"]);
    expect(cmdArgs).toEqual(["vitest", "run", "--reporter=json", "src/utils"]);
  });

  it("appends extra args for mocha", () => {
    const { cmdArgs } = getRunCommand("mocha", ["--grep", "auth"]);
    expect(cmdArgs).toEqual(["mocha", "--reporter", "json", "--grep", "auth"]);
  });
});

// ---------------------------------------------------------------------------
// getCoverageCommand
// ---------------------------------------------------------------------------
describe("getCoverageCommand", () => {
  it("returns python -m pytest --cov for pytest", () => {
    const { cmd, cmdArgs } = getCoverageCommand("pytest", []);
    expect(cmd).toBe("python");
    expect(cmdArgs).toContain("--cov");
    expect(cmdArgs).toContain("--cov-report=term-missing");
  });

  it("returns npx jest --coverage for jest", () => {
    const { cmd, cmdArgs } = getCoverageCommand("jest", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs).toContain("jest");
    expect(cmdArgs).toContain("--coverage");
  });

  it("returns npx vitest run --coverage for vitest", () => {
    const { cmd, cmdArgs } = getCoverageCommand("vitest", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs).toContain("vitest");
    expect(cmdArgs).toContain("--coverage");
  });

  it("returns npx nyc mocha for mocha", () => {
    const { cmd, cmdArgs } = getCoverageCommand("mocha", []);
    expect(cmd).toBe("npx");
    expect(cmdArgs[0]).toBe("nyc");
    expect(cmdArgs).toContain("mocha");
  });
});

// ---------------------------------------------------------------------------
// readJsonOutput
// ---------------------------------------------------------------------------
describe("readJsonOutput", () => {
  const tempDir = join(tmpdir(), `pare-test-helpers-${randomUUID()}`);

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("reads JSON from a temp file when the file exists", async () => {
    await mkdir(tempDir, { recursive: true });
    const tempFile = join(tempDir, "output.json");
    const jsonContent = '{"numTotalTests": 5, "numPassedTests": 5}';
    await writeFile(tempFile, jsonContent, "utf-8");

    const result = await readJsonOutput(tempFile, "some stdout noise");
    expect(result).toBe(jsonContent);
  });

  it("falls back to extractJson from output when temp file does not exist", async () => {
    const nonexistentPath = join(tempDir, "missing.json");
    const output = 'debug line\n{"total": 10, "passed": 10}\nfinished';

    const result = await readJsonOutput(nonexistentPath, output);
    expect(JSON.parse(result)).toEqual({ total: 10, passed: 10 });
  });

  it("throws when temp file does not exist and output has no JSON", async () => {
    const nonexistentPath = join(tempDir, "missing.json");
    const output = "no json here at all";

    await expect(readJsonOutput(nonexistentPath, output)).rejects.toThrow(/No JSON output found/);
  });

  it("cleans up the temp file after reading", async () => {
    await mkdir(tempDir, { recursive: true });
    const tempFile = join(tempDir, "cleanup-test.json");
    await writeFile(tempFile, '{"ok": true}', "utf-8");

    await readJsonOutput(tempFile, "");

    // File should be deleted
    const { access } = await import("node:fs/promises");
    await expect(access(tempFile)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildRunExtraArgs
// ---------------------------------------------------------------------------
describe("buildRunExtraArgs", () => {
  it("returns empty array when no options are set", () => {
    expect(buildRunExtraArgs("vitest", {})).toEqual([]);
  });

  it("passes through base args", () => {
    expect(buildRunExtraArgs("vitest", { args: ["src/utils"] })).toEqual(["src/utils"]);
  });

  // --- filter ---
  describe("filter", () => {
    it("adds -k for pytest", () => {
      const result = buildRunExtraArgs("pytest", { filter: "test_login" });
      expect(result).toEqual(["-k", "test_login"]);
    });

    it("adds --testPathPattern for jest", () => {
      const result = buildRunExtraArgs("jest", { filter: "login" });
      expect(result).toEqual(["--testPathPattern", "login"]);
    });

    it("adds filter directly for vitest", () => {
      const result = buildRunExtraArgs("vitest", { filter: "login" });
      expect(result).toEqual(["login"]);
    });

    it("adds --grep for mocha", () => {
      const result = buildRunExtraArgs("mocha", { filter: "auth" });
      expect(result).toEqual(["--grep", "auth"]);
    });
  });

  // --- updateSnapshots ---
  describe("updateSnapshots", () => {
    it("adds -u for vitest", () => {
      const result = buildRunExtraArgs("vitest", { updateSnapshots: true });
      expect(result).toContain("-u");
    });

    it("adds -u for jest", () => {
      const result = buildRunExtraArgs("jest", { updateSnapshots: true });
      expect(result).toContain("-u");
    });

    it("does not add -u for pytest", () => {
      const result = buildRunExtraArgs("pytest", { updateSnapshots: true });
      expect(result).not.toContain("-u");
    });

    it("does not add -u for mocha", () => {
      const result = buildRunExtraArgs("mocha", { updateSnapshots: true });
      expect(result).not.toContain("-u");
    });
  });

  // --- coverage ---
  describe("coverage", () => {
    it("adds --coverage for vitest", () => {
      const result = buildRunExtraArgs("vitest", { coverage: true });
      expect(result).toContain("--coverage");
    });

    it("adds --coverage for jest", () => {
      const result = buildRunExtraArgs("jest", { coverage: true });
      expect(result).toContain("--coverage");
    });

    it("adds --cov for pytest", () => {
      const result = buildRunExtraArgs("pytest", { coverage: true });
      expect(result).toContain("--cov");
    });

    it("does not add coverage flag for mocha", () => {
      const result = buildRunExtraArgs("mocha", { coverage: true });
      expect(result).toEqual([]);
    });
  });

  // --- onlyChanged ---
  describe("onlyChanged", () => {
    it("adds --lf for pytest", () => {
      const result = buildRunExtraArgs("pytest", { onlyChanged: true });
      expect(result).toContain("--lf");
    });

    it("adds --onlyChanged for jest", () => {
      const result = buildRunExtraArgs("jest", { onlyChanged: true });
      expect(result).toContain("--onlyChanged");
    });

    it("adds --changed for vitest", () => {
      const result = buildRunExtraArgs("vitest", { onlyChanged: true });
      expect(result).toContain("--changed");
    });

    it("does not add flag for mocha (unsupported)", () => {
      const result = buildRunExtraArgs("mocha", { onlyChanged: true });
      expect(result).toEqual([]);
    });
  });

  // --- exitFirst ---
  describe("exitFirst", () => {
    it("adds -x for pytest", () => {
      const result = buildRunExtraArgs("pytest", { exitFirst: true });
      expect(result).toContain("-x");
    });

    it("adds --bail=1 for jest", () => {
      const result = buildRunExtraArgs("jest", { exitFirst: true });
      expect(result).toContain("--bail=1");
    });

    it("adds --bail=1 for vitest", () => {
      const result = buildRunExtraArgs("vitest", { exitFirst: true });
      expect(result).toContain("--bail=1");
    });

    it("adds -b for mocha", () => {
      const result = buildRunExtraArgs("mocha", { exitFirst: true });
      expect(result).toContain("-b");
    });
  });

  // --- passWithNoTests ---
  describe("passWithNoTests", () => {
    it("adds --passWithNoTests for jest", () => {
      const result = buildRunExtraArgs("jest", { passWithNoTests: true });
      expect(result).toContain("--passWithNoTests");
    });

    it("adds --passWithNoTests for vitest", () => {
      const result = buildRunExtraArgs("vitest", { passWithNoTests: true });
      expect(result).toContain("--passWithNoTests");
    });

    it("does not add flag for pytest (unsupported)", () => {
      const result = buildRunExtraArgs("pytest", { passWithNoTests: true });
      expect(result).toEqual([]);
    });

    it("does not add flag for mocha (unsupported)", () => {
      const result = buildRunExtraArgs("mocha", { passWithNoTests: true });
      expect(result).toEqual([]);
    });
  });

  // --- combined options ---
  it("combines multiple options correctly", () => {
    const result = buildRunExtraArgs("vitest", {
      filter: "login",
      onlyChanged: true,
      exitFirst: true,
      passWithNoTests: true,
      args: ["src/"],
    });
    expect(result).toContain("src/");
    expect(result).toContain("login");
    expect(result).toContain("--changed");
    expect(result).toContain("--bail=1");
    expect(result).toContain("--passWithNoTests");
  });
});

// ---------------------------------------------------------------------------
// buildCoverageExtraArgs
// ---------------------------------------------------------------------------
describe("buildCoverageExtraArgs", () => {
  it("returns empty array when no options are set", () => {
    expect(buildCoverageExtraArgs("vitest", {})).toEqual([]);
  });

  // --- branch ---
  describe("branch", () => {
    it("adds --cov-branch for pytest", () => {
      const result = buildCoverageExtraArgs("pytest", { branch: true });
      expect(result).toContain("--cov-branch");
    });

    it("does not add --cov-branch for vitest", () => {
      const result = buildCoverageExtraArgs("vitest", { branch: true });
      expect(result).not.toContain("--cov-branch");
    });

    it("does not add --cov-branch for jest", () => {
      const result = buildCoverageExtraArgs("jest", { branch: true });
      expect(result).not.toContain("--cov-branch");
    });

    it("does not add --cov-branch for mocha", () => {
      const result = buildCoverageExtraArgs("mocha", { branch: true });
      expect(result).not.toContain("--cov-branch");
    });
  });

  // --- all ---
  describe("all", () => {
    it("adds --coverage.all for vitest", () => {
      const result = buildCoverageExtraArgs("vitest", { all: true });
      expect(result).toContain("--coverage.all");
    });

    it("adds --all for mocha", () => {
      const result = buildCoverageExtraArgs("mocha", { all: true });
      expect(result).toContain("--all");
    });

    it("adds --collectCoverageFrom for jest", () => {
      const result = buildCoverageExtraArgs("jest", { all: true });
      expect(result).toContain("--collectCoverageFrom=**/*.{js,jsx,ts,tsx}");
    });

    it("does not add flag for pytest (unsupported)", () => {
      const result = buildCoverageExtraArgs("pytest", { all: true });
      expect(result).toEqual([]);
    });
  });

  // --- combined ---
  it("combines branch and all for pytest (only branch applies)", () => {
    const result = buildCoverageExtraArgs("pytest", { branch: true, all: true });
    expect(result).toEqual(["--cov-branch"]);
  });

  it("combines branch and all for vitest (only all applies)", () => {
    const result = buildCoverageExtraArgs("vitest", { branch: true, all: true });
    expect(result).toEqual(["--coverage.all"]);
  });
});

// ---------------------------------------------------------------------------
// buildPlaywrightExtraArgs
// ---------------------------------------------------------------------------
describe("buildPlaywrightExtraArgs", () => {
  it("returns empty array when no options are set", () => {
    expect(buildPlaywrightExtraArgs({})).toEqual([]);
  });

  it("passes through base args", () => {
    expect(buildPlaywrightExtraArgs({ args: ["tests/e2e"] })).toEqual(["tests/e2e"]);
  });

  it("adds filter directly", () => {
    const result = buildPlaywrightExtraArgs({ filter: "login.spec.ts" });
    expect(result).toEqual(["login.spec.ts"]);
  });

  it("adds --project with value", () => {
    const result = buildPlaywrightExtraArgs({ project: "chromium" });
    expect(result).toEqual(["--project", "chromium"]);
  });

  it("adds --headed", () => {
    const result = buildPlaywrightExtraArgs({ headed: true });
    expect(result).toContain("--headed");
  });

  it("adds --update-snapshots", () => {
    const result = buildPlaywrightExtraArgs({ updateSnapshots: true });
    expect(result).toContain("--update-snapshots");
  });

  it("adds --workers with value", () => {
    const result = buildPlaywrightExtraArgs({ workers: 4 });
    expect(result).toContain("--workers=4");
  });

  it("adds --workers=0 when set to zero", () => {
    const result = buildPlaywrightExtraArgs({ workers: 0 });
    expect(result).toContain("--workers=0");
  });

  it("adds --retries with value", () => {
    const result = buildPlaywrightExtraArgs({ retries: 3 });
    expect(result).toContain("--retries=3");
  });

  it("adds --retries=0 when set to zero", () => {
    const result = buildPlaywrightExtraArgs({ retries: 0 });
    expect(result).toContain("--retries=0");
  });

  it("adds --max-failures with value", () => {
    const result = buildPlaywrightExtraArgs({ maxFailures: 5 });
    expect(result).toContain("--max-failures=5");
  });

  it("adds --timeout with value", () => {
    const result = buildPlaywrightExtraArgs({ timeout: 30000 });
    expect(result).toContain("--timeout=30000");
  });

  it("adds --timeout=0 when set to zero", () => {
    const result = buildPlaywrightExtraArgs({ timeout: 0 });
    expect(result).toContain("--timeout=0");
  });

  it("adds --last-failed", () => {
    const result = buildPlaywrightExtraArgs({ lastFailed: true });
    expect(result).toContain("--last-failed");
  });

  it("adds --only-changed", () => {
    const result = buildPlaywrightExtraArgs({ onlyChanged: true });
    expect(result).toContain("--only-changed");
  });

  it("adds --forbid-only", () => {
    const result = buildPlaywrightExtraArgs({ forbidOnly: true });
    expect(result).toContain("--forbid-only");
  });

  it("adds --pass-with-no-tests", () => {
    const result = buildPlaywrightExtraArgs({ passWithNoTests: true });
    expect(result).toContain("--pass-with-no-tests");
  });

  it("does not add flags for falsy boolean options", () => {
    const result = buildPlaywrightExtraArgs({
      headed: false,
      updateSnapshots: false,
      lastFailed: false,
      onlyChanged: false,
      forbidOnly: false,
      passWithNoTests: false,
    });
    expect(result).toEqual([]);
  });

  it("does not add numeric flags when undefined", () => {
    const result = buildPlaywrightExtraArgs({
      workers: undefined,
      retries: undefined,
      maxFailures: undefined,
      timeout: undefined,
    });
    expect(result).toEqual([]);
  });

  it("combines multiple options correctly", () => {
    const result = buildPlaywrightExtraArgs({
      filter: "auth.spec.ts",
      project: "firefox",
      headed: true,
      workers: 2,
      retries: 1,
      maxFailures: 3,
      timeout: 60000,
      lastFailed: true,
      onlyChanged: true,
      forbidOnly: true,
      passWithNoTests: true,
      args: ["tests/"],
    });
    expect(result).toContain("tests/");
    expect(result).toContain("auth.spec.ts");
    expect(result).toContain("--project");
    expect(result).toContain("firefox");
    expect(result).toContain("--headed");
    expect(result).toContain("--workers=2");
    expect(result).toContain("--retries=1");
    expect(result).toContain("--max-failures=3");
    expect(result).toContain("--timeout=60000");
    expect(result).toContain("--last-failed");
    expect(result).toContain("--only-changed");
    expect(result).toContain("--forbid-only");
    expect(result).toContain("--pass-with-no-tests");
  });
});
