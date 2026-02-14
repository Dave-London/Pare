/**
 * Unit tests for helper functions exported from src/tools/.
 * These cover getRunCommand, getCoverageCommand, readJsonOutput,
 * and extractJson edge cases not covered by extract-json.test.ts.
 */
import { describe, it, expect, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { getRunCommand, readJsonOutput } from "../src/tools/run.js";
import { getCoverageCommand } from "../src/tools/coverage.js";

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
    const { cmd, cmdArgs } = getCoverageCommand("pytest");
    expect(cmd).toBe("python");
    expect(cmdArgs).toContain("--cov");
    expect(cmdArgs).toContain("--cov-report=term-missing");
  });

  it("returns npx jest --coverage for jest", () => {
    const { cmd, cmdArgs } = getCoverageCommand("jest");
    expect(cmd).toBe("npx");
    expect(cmdArgs).toContain("jest");
    expect(cmdArgs).toContain("--coverage");
  });

  it("returns npx vitest run --coverage for vitest", () => {
    const { cmd, cmdArgs } = getCoverageCommand("vitest");
    expect(cmd).toBe("npx");
    expect(cmdArgs).toContain("vitest");
    expect(cmdArgs).toContain("--coverage");
  });

  it("returns npx nyc mocha for mocha", () => {
    const { cmd, cmdArgs } = getCoverageCommand("mocha");
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
