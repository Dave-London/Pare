/**
 * Smoke tests: test server tools (run, coverage, playwright) — Phase 2 (mocked)
 *
 * Tests all 3 tools end-to-end with mocked runner and filesystem,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TestRunSchema,
  CoverageSchema,
  PlaywrightResultSchema,
} from "../../../packages/server-test/src/schemas/index.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the shared runner module so that `run` is intercepted.
// The @paretools/shared exports field points to dist/, so we mock the dist runner
// to intercept transitive imports from tool source files.
vi.mock("../../../packages/shared/dist/runner.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    run: vi.fn(),
  };
});

// Mock detect to control framework detection
vi.mock("../../../packages/server-test/src/lib/detect.js", () => ({
  detectFramework: vi.fn(),
}));

// Mock node:fs/promises for temp file reads
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readFile: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

import { run } from "../../../packages/shared/dist/runner.js";
import { detectFramework } from "../../../packages/server-test/src/lib/detect.js";
import { readFile } from "node:fs/promises";
import { registerRunTool } from "../../../packages/server-test/src/tools/run.js";
import { registerCoverageTool } from "../../../packages/server-test/src/tools/coverage.js";
import { registerPlaywrightTool } from "../../../packages/server-test/src/tools/playwright.js";

// ---------------------------------------------------------------------------
// FakeServer & helpers
// ---------------------------------------------------------------------------

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function mockRun(stdout: string, stderr = "", exitCode = 0) {
  vi.mocked(run).mockResolvedValueOnce({ stdout, stderr, exitCode });
}

function mockDetect(framework: "vitest" | "jest" | "pytest" | "mocha") {
  vi.mocked(detectFramework).mockResolvedValueOnce(framework);
}

function mockDetectFail() {
  vi.mocked(detectFramework).mockRejectedValueOnce(
    new Error("No supported test framework detected."),
  );
}

function mockReadFile(content: string) {
  vi.mocked(readFile).mockResolvedValueOnce(content);
}

function mockReadFileFail() {
  vi.mocked(readFile).mockRejectedValueOnce(new Error("ENOENT"));
}

// ---------------------------------------------------------------------------
// Sample data builders
// ---------------------------------------------------------------------------

/** Vitest JSON reporter output (all pass) */
function vitestAllPass(count = 3) {
  return JSON.stringify({
    numTotalTests: count,
    numPassedTests: count,
    numFailedTests: 0,
    numPendingTests: 0,
    startTime: Date.now() - 1000,
    success: true,
    testResults: [
      {
        name: "src/lib/parsers.test.ts",
        assertionResults: Array.from({ length: count }, (_, i) => ({
          fullName: `should parse case ${i}`,
          status: "passed",
          failureMessages: [],
          duration: 10,
        })),
      },
    ],
  });
}

/** Vitest JSON reporter output (some fail) */
function vitestWithFailures(passed = 2, failed = 1) {
  return JSON.stringify({
    numTotalTests: passed + failed,
    numPassedTests: passed,
    numFailedTests: failed,
    numPendingTests: 0,
    startTime: Date.now() - 2000,
    success: false,
    testResults: [
      {
        name: "src/lib/parsers.test.ts",
        assertionResults: [
          ...Array.from({ length: passed }, (_, i) => ({
            fullName: `should pass case ${i}`,
            status: "passed" as const,
            failureMessages: [],
            duration: 10,
          })),
          ...Array.from({ length: failed }, (_, i) => ({
            fullName: `should fail case ${i}`,
            status: "failed" as const,
            failureMessages: [
              `Expected: "hello"\nReceived: "world"\n    at Object.<anonymous> (src/lib/parsers.test.ts:${10 + i}:5)`,
            ],
            duration: 15,
            location: { line: 10 + i, column: 5 },
          })),
        ],
      },
    ],
  });
}

/** Vitest JSON reporter output (no tests) */
function vitestEmpty() {
  return JSON.stringify({
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    numPendingTests: 0,
    startTime: Date.now() - 100,
    success: true,
    testResults: [],
  });
}

/** Jest JSON reporter output (all pass) */
function jestAllPass(count = 3) {
  return JSON.stringify({
    success: true,
    numTotalTests: count,
    numPassedTests: count,
    numFailedTests: 0,
    numPendingTests: 0,
    startTime: Date.now() - 1000,
    testResults: [
      {
        testFilePath: "/src/lib/parsers.test.ts",
        testResults: Array.from({ length: count }, (_, i) => ({
          fullName: `should pass case ${i}`,
          status: "passed",
          failureMessages: [],
          duration: 10,
        })),
      },
    ],
  });
}

/** Mocha JSON reporter output (all pass) */
function mochaAllPass(count = 3) {
  return JSON.stringify({
    stats: {
      suites: 1,
      tests: count,
      passes: count,
      failures: 0,
      pending: 0,
      duration: 500,
    },
    passes: Array.from({ length: count }, (_, i) => ({
      title: `should pass case ${i}`,
      fullTitle: `Suite should pass case ${i}`,
      file: "test/parsers.test.js",
      duration: 10,
    })),
    failures: [],
    pending: [],
  });
}

/** Pytest verbose output (all pass) */
function pytestAllPassOutput(count = 3) {
  const lines = Array.from({ length: count }, (_, i) => `tests/test_foo.py::test_case_${i} PASSED`);
  lines.push(`===== ${count} passed in 0.42s =====`);
  return lines.join("\n");
}

/** Vitest coverage JSON summary */
function vitestCoverageJson(linePct = 85) {
  return JSON.stringify({
    total: {
      statements: { pct: linePct + 2 },
      branches: { pct: linePct - 5 },
      functions: { pct: linePct + 1 },
      lines: { pct: linePct },
    },
    "src/lib/parsers.ts": {
      statements: { pct: 90 },
      branches: { pct: 80 },
      functions: { pct: 85 },
      lines: { pct: 88 },
    },
    "src/lib/formatters.ts": {
      statements: { pct: 75 },
      branches: { pct: 60 },
      functions: { pct: 70 },
      lines: { pct: 72 },
    },
  });
}

/** Jest coverage JSON summary */
function jestCoverageJson(linePct = 85) {
  return JSON.stringify({
    total: {
      statements: { pct: linePct + 2 },
      branches: { pct: linePct - 5 },
      functions: { pct: linePct + 1 },
      lines: { pct: linePct },
    },
    "src/lib/parsers.ts": {
      statements: { pct: 90 },
      branches: { pct: 80 },
      functions: { pct: 85 },
      lines: { pct: 88 },
    },
  });
}

/** Playwright JSON reporter output (all pass) */
function playwrightAllPass(count = 3) {
  return JSON.stringify({
    config: { rootDir: "/project" },
    suites: [
      {
        title: "login.spec.ts",
        file: "tests/login.spec.ts",
        specs: Array.from({ length: count }, (_, i) => ({
          title: `should login case ${i}`,
          file: "tests/login.spec.ts",
          line: 10 + i,
          tests: [
            {
              projectName: "chromium",
              results: [{ status: "passed", duration: 200, retry: 0 }],
            },
          ],
        })),
      },
    ],
    stats: { duration: 3000, expected: count, unexpected: 0, flaky: 0, skipped: 0 },
  });
}

/** Playwright JSON reporter output (some fail) */
function playwrightWithFailures(passed = 2, failed = 1) {
  return JSON.stringify({
    config: { rootDir: "/project" },
    suites: [
      {
        title: "login.spec.ts",
        file: "tests/login.spec.ts",
        specs: [
          ...Array.from({ length: passed }, (_, i) => ({
            title: `should pass ${i}`,
            file: "tests/login.spec.ts",
            line: 10 + i,
            tests: [
              {
                projectName: "chromium",
                results: [{ status: "passed", duration: 200, retry: 0 }],
              },
            ],
          })),
          ...Array.from({ length: failed }, (_, i) => ({
            title: `should fail ${i}`,
            file: "tests/login.spec.ts",
            line: 50 + i,
            tests: [
              {
                projectName: "chromium",
                results: [
                  {
                    status: "failed",
                    duration: 500,
                    retry: 0,
                    error: { message: `Timeout waiting for element ${i}` },
                  },
                ],
              },
            ],
          })),
        ],
      },
    ],
    stats: {
      duration: 5000,
      expected: passed,
      unexpected: failed,
      flaky: 0,
      skipped: 0,
    },
  });
}

/** Playwright JSON reporter output (no tests) */
function playwrightEmpty() {
  return JSON.stringify({
    config: { rootDir: "/project" },
    suites: [],
    stats: { duration: 100, expected: 0, unexpected: 0, flaky: 0, skipped: 0, interrupted: 0 },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: run
// ═══════════════════════════════════════════════════════════════════════════

describe("Smoke: test.run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerRunTool(server as never);
    handler = server.tools.get("run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = TestRunSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: All tests pass (vitest) ─────────────────────────────────────
  it("S1 [P0] all tests pass (vitest)", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(5));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary.passed).toBe(5);
    expect(parsed.summary.failed).toBe(0);
  });

  // ── S2: Some tests fail (vitest) ────────────────────────────────────
  it("S2 [P0] some tests fail (vitest)", async () => {
    mockRun("", "", 1);
    mockReadFile(vitestWithFailures(3, 2));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    expect(parsed.summary.failed).toBeGreaterThan(0);
    expect(parsed.failures.length).toBeGreaterThan(0);
  });

  // ── S3: No tests found ──────────────────────────────────────────────
  it("S3 [P0] no tests found returns total 0", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestEmpty());
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      filter: "nonexistent",
    });
    expect(parsed.summary.total).toBe(0);
  });

  // ── S4: Framework auto-detection ────────────────────────────────────
  it("S4 [P0] framework auto-detection uses detectFramework", async () => {
    mockDetect("vitest");
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(2));
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.framework).toBe("vitest");
    expect(detectFramework).toHaveBeenCalledWith("/project");
  });

  // ── S5: No framework detected ──────────────────────────────────────
  it("S5 [P0] no framework detected throws error", async () => {
    mockDetectFail();
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow(
      "No supported test framework detected",
    );
  });

  // ── S6: Flag injection via args ─────────────────────────────────────
  it("S6 [P0] flag injection via args is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", args: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S7: Flag injection via filter ───────────────────────────────────
  it("S7 [P0] flag injection via filter is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", filter: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S8: Flag injection via shard ────────────────────────────────────
  it("S8 [P0] flag injection via shard is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", shard: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S9: Flag injection via config ───────────────────────────────────
  it("S9 [P0] flag injection via config is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", config: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S10: Flag injection via testNamePattern ─────────────────────────
  it("S10 [P0] flag injection via testNamePattern is blocked", async () => {
    await expect(
      callAndValidate({
        path: "/project",
        framework: "vitest",
        testNamePattern: "--exec=evil",
      }),
    ).rejects.toThrow();
  });

  // ── S11: Failure details have name/message ──────────────────────────
  it("S11 [P1] failure details have name and message", async () => {
    mockRun("", "", 1);
    mockReadFile(vitestWithFailures(1, 2));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    for (const failure of parsed.failures) {
      expect(failure.name).toBeDefined();
      expect(failure.message).toBeDefined();
    }
  });

  // ── S12: filter specific test file ──────────────────────────────────
  it("S12 [P1] filter passes test pattern to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", filter: "parsers" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("parsers");
  });

  // ── S13: exitFirst: true ────────────────────────────────────────────
  it("S13 [P1] exitFirst passes --bail=1 to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", exitFirst: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--bail=1");
  });

  // ── S14: bail: 3 ───────────────────────────────────────────────────
  it("S14 [P1] bail: 3 passes --bail=3 to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", bail: 3 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--bail=3");
  });

  // ── S15: testNamePattern: "should parse" ────────────────────────────
  it("S15 [P1] testNamePattern passes --grep to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({
      path: "/project",
      framework: "vitest",
      testNamePattern: "should parse",
    });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--grep=should parse");
  });

  // ── S16: workers: 1 ────────────────────────────────────────────────
  it("S16 [P1] workers: 1 passes thread config to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", workers: 1 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--pool.threads.maxThreads=1");
  });

  // ── S17: All tests pass (jest) ──────────────────────────────────────
  it("S17 [P1] all tests pass (jest)", async () => {
    mockRun("", "", 0);
    mockReadFile(jestAllPass(4));
    const { parsed } = await callAndValidate({ path: "/project", framework: "jest" });
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.passed).toBeGreaterThan(0);
  });

  // ── S18: All tests pass (pytest) ────────────────────────────────────
  it("S18 [P1] all tests pass (pytest)", async () => {
    mockRun(pytestAllPassOutput(4), "", 0);
    const { parsed } = await callAndValidate({ path: "/project", framework: "pytest" });
    expect(parsed.framework).toBe("pytest");
    expect(parsed.summary.passed).toBeGreaterThan(0);
  });

  // ── S19: All tests pass (mocha) ─────────────────────────────────────
  it("S19 [P1] all tests pass (mocha)", async () => {
    mockRun(mochaAllPass(4), "", 0);
    const { parsed } = await callAndValidate({ path: "/project", framework: "mocha" });
    expect(parsed.framework).toBe("mocha");
    expect(parsed.summary.passed).toBeGreaterThan(0);
  });

  // ── S20: shard: "1/3" (vitest) ──────────────────────────────────────
  it('S20 [P2] shard "1/3" passes --shard to vitest', async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", shard: "1/3" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--shard");
    expect(args).toContain("1/3");
  });

  // ── S21: updateSnapshots: true ──────────────────────────────────────
  it("S21 [P2] updateSnapshots passes -u flag to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({
      path: "/project",
      framework: "vitest",
      updateSnapshots: true,
    });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("-u");
  });

  // ── S22: passWithNoTests: true ──────────────────────────────────────
  it("S22 [P2] passWithNoTests passes --passWithNoTests to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestEmpty());
    await callAndValidate({
      path: "/project",
      framework: "vitest",
      filter: "nonexistent",
      passWithNoTests: true,
    });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--passWithNoTests");
  });

  // ── S23: timeout: 5000 ─────────────────────────────────────────────
  it("S23 [P2] timeout passes --testTimeout to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(1));
    await callAndValidate({ path: "/project", framework: "vitest", timeout: 5000 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--testTimeout=5000");
  });

  // ── S24: compact: false ─────────────────────────────────────────────
  it("S24 [P2] compact: false returns full output with test list", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(3));
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      compact: false,
    });
    // Full output includes tests array
    expect(parsed.tests).toBeDefined();
    expect(parsed.tests!.length).toBe(3);
  });

  // ── S25: Schema validation ──────────────────────────────────────────
  it("S25 [P0] schema validation passes on all pass output", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestAllPass(2));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    // If we get here, Zod parse succeeded
    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary).toBeDefined();
    expect(parsed.failures).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: coverage
// ═══════════════════════════════════════════════════════════════════════════

describe("Smoke: test.coverage", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerCoverageTool(server as never);
    handler = server.tools.get("coverage")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = CoverageSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: Coverage report (vitest) ────────────────────────────────────
  it("S1 [P0] coverage report vitest returns structured data", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      compact: false,
    });
    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary.lines).toBeGreaterThan(0);
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThan(0);
  });

  // ── S2: Coverage report (jest) ──────────────────────────────────────
  it("S2 [P0] coverage report jest returns structured data", async () => {
    mockRun("", "", 0);
    mockReadFile(jestCoverageJson(82));
    const { parsed } = await callAndValidate({ path: "/project", framework: "jest" });
    expect(parsed.framework).toBe("jest");
    expect(parsed.summary.lines).toBeGreaterThan(0);
  });

  // ── S3: No tests/coverage provider ──────────────────────────────────
  it("S3 [P0] no framework detected throws error", async () => {
    mockDetectFail();
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow(
      "No supported test framework detected",
    );
  });

  // ── S4: Flag injection via args ─────────────────────────────────────
  it("S4 [P0] flag injection via args is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", args: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S5: Flag injection via source ───────────────────────────────────
  it("S5 [P0] flag injection via source is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", source: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S6: Flag injection via exclude ──────────────────────────────────
  it("S6 [P0] flag injection via exclude is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", exclude: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // ── S7: Flag injection via filter ───────────────────────────────────
  it("S7 [P0] flag injection via filter is blocked", async () => {
    await expect(
      callAndValidate({ path: "/project", framework: "vitest", filter: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // ── S8: Per-file coverage data ──────────────────────────────────────
  it("S8 [P1] per-file coverage data has file and lines", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    for (const file of parsed.files ?? []) {
      expect(file.file).toBeDefined();
      expect(typeof file.lines).toBe("number");
    }
  });

  // ── S9: failUnder: 80 (passes) ─────────────────────────────────────
  it("S9 [P1] failUnder: 80 passes when coverage is sufficient", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      failUnder: 80,
    });
    expect(parsed.meetsThreshold).toBe(true);
  });

  // ── S10: failUnder: 99 (fails) ─────────────────────────────────────
  it("S10 [P1] failUnder: 99 fails when coverage is insufficient", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      failUnder: 99,
    });
    expect(parsed.meetsThreshold).toBe(false);
  });

  // ── S11: all: true includes untested files ──────────────────────────
  it("S11 [P1] all: true passes --coverage.all to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(70));
    await callAndValidate({ path: "/project", framework: "vitest", all: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--coverage.all");
  });

  // ── S12: source scoping ─────────────────────────────────────────────
  it("S12 [P1] source scoping passes --coverage.include to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    await callAndValidate({
      path: "/project",
      framework: "vitest",
      source: ["src/lib"],
    });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--coverage.include=src/lib");
  });

  // ── S13: Coverage report (pytest) ───────────────────────────────────
  it("S13 [P1] coverage report pytest returns structured data", async () => {
    const pytestCovJson = JSON.stringify({
      totals: { percent_covered: 78.5, covered_lines: 100, num_statements: 127 },
      files: {
        "src/foo.py": {
          summary: {
            percent_covered: 80,
            covered_lines: 40,
            num_statements: 50,
            missing_lines: 10,
          },
          missing_lines: [10, 20, 30],
        },
      },
    });
    mockRun("", "", 0);
    mockReadFile(pytestCovJson);
    const { parsed } = await callAndValidate({ path: "/project", framework: "pytest" });
    expect(parsed.framework).toBe("pytest");
  });

  // ── S14: Coverage report (mocha) ────────────────────────────────────
  it("S14 [P1] coverage report mocha returns structured data", async () => {
    const mochaCovJson = JSON.stringify({
      total: {
        statements: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 75 },
        lines: { pct: 78 },
      },
      "src/lib.js": {
        statements: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 75 },
        lines: { pct: 78 },
      },
    });
    mockRun("", "", 0);
    mockReadFile(mochaCovJson);
    const { parsed } = await callAndValidate({ path: "/project", framework: "mocha" });
    expect(parsed.framework).toBe("mocha");
  });

  // ── S15: branch: true (pytest) ──────────────────────────────────────
  it("S15 [P2] branch: true passes --cov-branch to pytest", async () => {
    const pytestCovJson = JSON.stringify({
      totals: { percent_covered: 78.5, covered_lines: 100, num_statements: 127 },
      files: {},
    });
    mockRun("", "", 0);
    mockReadFile(pytestCovJson);
    await callAndValidate({ path: "/project", framework: "pytest", branch: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--cov-branch");
  });

  // ── S16: exclude patterns ───────────────────────────────────────────
  it("S16 [P2] exclude passes --coverage.exclude to vitest", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    await callAndValidate({
      path: "/project",
      framework: "vitest",
      exclude: ["**/*.test.ts"],
    });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--coverage.exclude=**/*.test.ts");
  });

  // ── S17: compact: false ─────────────────────────────────────────────
  it("S17 [P2] compact: false returns full per-file details", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({
      path: "/project",
      framework: "vitest",
      compact: false,
    });
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThan(0);
  });

  // ── S18: Schema validation ──────────────────────────────────────────
  it("S18 [P0] schema validation passes on coverage output", async () => {
    mockRun("", "", 0);
    mockReadFile(vitestCoverageJson(85));
    const { parsed } = await callAndValidate({ path: "/project", framework: "vitest" });
    // If we get here, Zod parse succeeded
    expect(parsed.framework).toBe("vitest");
    expect(parsed.summary).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL: playwright
// ═══════════════════════════════════════════════════════════════════════════

describe("Smoke: test.playwright", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    const server = new FakeServer();
    registerPlaywrightTool(server as never);
    handler = server.tools.get("playwright")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PlaywrightResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // ── S1: All tests pass ──────────────────────────────────────────────
  it("S1 [P0] all tests pass", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(5));
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.summary.passed).toBeGreaterThan(0);
    expect(parsed.summary.failed).toBe(0);
  });

  // ── S2: Some tests fail ─────────────────────────────────────────────
  it("S2 [P0] some tests fail", async () => {
    mockRun("", "", 1);
    mockReadFile(playwrightWithFailures(3, 2));
    const { parsed } = await callAndValidate({ path: "/project" });
    expect(parsed.summary.failed).toBeGreaterThan(0);
    expect(parsed.failures.length).toBeGreaterThan(0);
  });

  // ── S3: Playwright not installed ────────────────────────────────────
  it("S3 [P0] playwright not installed throws error", async () => {
    mockRun("", "", 1);
    mockReadFileFail();
    await expect(callAndValidate({ path: "/tmp/empty" })).rejects.toThrow();
  });

  // ── S4: No tests found ─────────────────────────────────────────────
  it("S4 [P0] no tests found returns total 0", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightEmpty());
    const { parsed } = await callAndValidate({ path: "/project", filter: "nonexistent" });
    expect(parsed.summary.total).toBe(0);
  });

  // ── S5: Flag injection via args ─────────────────────────────────────
  it("S5 [P0] flag injection via args is blocked", async () => {
    await expect(callAndValidate({ path: "/project", args: ["--exec=evil"] })).rejects.toThrow();
  });

  // ── S6: Flag injection via filter ───────────────────────────────────
  it("S6 [P0] flag injection via filter is blocked", async () => {
    await expect(callAndValidate({ path: "/project", filter: "--exec=evil" })).rejects.toThrow();
  });

  // ── S7: Flag injection via project ──────────────────────────────────
  it("S7 [P0] flag injection via project is blocked", async () => {
    await expect(callAndValidate({ path: "/project", project: "--exec=evil" })).rejects.toThrow();
  });

  // ── S8: Flag injection via grep ─────────────────────────────────────
  it("S8 [P0] flag injection via grep is blocked", async () => {
    await expect(callAndValidate({ path: "/project", grep: "--exec=evil" })).rejects.toThrow();
  });

  // ── S9: Flag injection via browser ──────────────────────────────────
  it("S9 [P0] flag injection via browser is blocked", async () => {
    await expect(callAndValidate({ path: "/project", browser: "--exec=evil" })).rejects.toThrow();
  });

  // ── S10: Flag injection via shard ───────────────────────────────────
  it("S10 [P0] flag injection via shard is blocked", async () => {
    await expect(callAndValidate({ path: "/project", shard: "--exec=evil" })).rejects.toThrow();
  });

  // ── S11: Flag injection via config ──────────────────────────────────
  it("S11 [P0] flag injection via config is blocked", async () => {
    await expect(callAndValidate({ path: "/project", config: "--exec=evil" })).rejects.toThrow();
  });

  // ── S12: Failure details have title/error ───────────────────────────
  it("S12 [P1] failure details have title and error", async () => {
    mockRun("", "", 1);
    mockReadFile(playwrightWithFailures(1, 2));
    const { parsed } = await callAndValidate({ path: "/project" });
    for (const failure of parsed.failures) {
      expect(failure.title).toBeDefined();
      expect(failure.error).toBeDefined();
    }
  });

  // ── S13: project: "chromium" ────────────────────────────────────────
  it('S13 [P1] project "chromium" passes --project to runner', async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(2));
    await callAndValidate({ path: "/project", project: "chromium" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--project");
    expect(args).toContain("chromium");
  });

  // ── S14: grep: "login" ─────────────────────────────────────────────
  it('S14 [P1] grep "login" passes --grep to runner', async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(2));
    await callAndValidate({ path: "/project", grep: "login" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--grep");
    expect(args).toContain("login");
  });

  // ── S15: workers: 1 ────────────────────────────────────────────────
  it("S15 [P1] workers: 1 passes --workers to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", workers: 1 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--workers=1");
  });

  // ── S16: retries: 2 ────────────────────────────────────────────────
  it("S16 [P1] retries: 2 passes --retries to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", retries: 2 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--retries=2");
  });

  // ── S17: maxFailures: 1 ────────────────────────────────────────────
  it("S17 [P1] maxFailures: 1 passes --max-failures to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", maxFailures: 1 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--max-failures=1");
  });

  // ── S18: forbidOnly: true ───────────────────────────────────────────
  it("S18 [P1] forbidOnly: true passes --forbid-only to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", forbidOnly: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--forbid-only");
  });

  // ── S19: shard: "1/3" ──────────────────────────────────────────────
  it('S19 [P2] shard "1/3" passes --shard to runner', async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", shard: "1/3" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--shard");
    expect(args).toContain("1/3");
  });

  // ── S20: trace: "on" ───────────────────────────────────────────────
  it('S20 [P2] trace "on" passes --trace to runner', async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", trace: "on" });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--trace");
    expect(args).toContain("on");
  });

  // ── S21: lastFailed: true ───────────────────────────────────────────
  it("S21 [P2] lastFailed passes --last-failed to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", lastFailed: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--last-failed");
  });

  // ── S22: passWithNoTests: true ──────────────────────────────────────
  it("S22 [P2] passWithNoTests passes --pass-with-no-tests to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightEmpty());
    await callAndValidate({ path: "/project", filter: "nonexistent", passWithNoTests: true });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--pass-with-no-tests");
  });

  // ── S23: timeout: 10000 ─────────────────────────────────────────────
  it("S23 [P2] timeout passes --timeout to runner", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(1));
    await callAndValidate({ path: "/project", timeout: 10000 });
    const args = vi.mocked(run).mock.calls[0][1];
    expect(args).toContain("--timeout=10000");
  });

  // ── S24: Schema validation ──────────────────────────────────────────
  it("S24 [P0] schema validation passes on all pass output", async () => {
    mockRun("", "", 0);
    mockReadFile(playwrightAllPass(3));
    const { parsed } = await callAndValidate({ path: "/project" });
    // If we get here, Zod parse succeeded
    expect(parsed.summary).toBeDefined();
    expect(parsed.failures).toBeDefined();
  });
});
