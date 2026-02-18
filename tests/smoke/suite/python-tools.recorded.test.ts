/**
 * Smoke tests: python tools (recorded)
 *
 * Feeds REAL CLI output captured from actual Python tools through
 * the tool handlers. Validates that the parser, formatter, and schema
 * chain works with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  PipListSchema,
  PipShowSchema,
  MypyResultSchema,
  RuffResultSchema,
  PytestResultSchema,
  BlackResultSchema,
} from "../../../packages/server-python/src/schemas/index.js";

// Mock the python runner module used by all python tools
vi.mock("../../../packages/server-python/src/lib/python-runner.js", () => ({
  pip: vi.fn(),
  mypy: vi.fn(),
  ruff: vi.fn(),
  pytest: vi.fn(),
  black: vi.fn(),
  conda: vi.fn(),
  pyenv: vi.fn(),
  poetry: vi.fn(),
  pipAudit: vi.fn(),
  uv: vi.fn(),
}));

import {
  pip,
  mypy,
  ruff,
  pytest as pytestRunner,
  black,
} from "../../../packages/server-python/src/lib/python-runner.js";
import { registerPipListTool } from "../../../packages/server-python/src/tools/pip-list.js";
import { registerPipShowTool } from "../../../packages/server-python/src/tools/pip-show.js";
import { registerMypyTool } from "../../../packages/server-python/src/tools/mypy.js";
import { registerRuffTool } from "../../../packages/server-python/src/tools/ruff.js";
import { registerPytestTool } from "../../../packages/server-python/src/tools/pytest.js";
import { registerBlackTool } from "../../../packages/server-python/src/tools/black.js";

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

const FIXTURE_BASE = resolve(__dirname, "../fixtures/python");

function loadFixture(tool: string, name: string): string {
  return readFileSync(resolve(FIXTURE_BASE, tool, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// pip-list (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.pip-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerPipListTool(server as never);
    handler = server.tools.get("pip-list")!.handler;
  });

  it("S1 [recorded] lists installed packages", async () => {
    const stdout = loadFixture("pip-list", "s01-packages.txt");
    vi.mocked(pip).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      local: false,
      user: false,
      notRequired: false,
      editable: false,
      excludeEditable: false,
      outdated: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipListSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(5);
    expect(parsed.packages).toHaveLength(5);
    expect(parsed.packages![0]).toEqual({ name: "pip", version: "24.0" });
    expect(parsed.packages![2]).toEqual({ name: "requests", version: "2.31.0" });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pip-show (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.pip-show", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerPipShowTool(server as never);
    handler = server.tools.get("pip-show")!.handler;
  });

  it("S1 [recorded] shows single package metadata", async () => {
    const stdout = loadFixture("pip-show", "s01-single.txt");
    vi.mocked(pip).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
    const result = await handler({
      package: "requests",
      path: "/tmp/project",
      files: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipShowSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe("requests");
    expect(parsed.version).toBe("2.31.0");
    expect(parsed.summary).toBe("Python HTTP for Humans.");
    expect(parsed.license).toBe("Apache-2.0");
    expect(parsed.requires).toEqual(["certifi", "charset-normalizer", "idna", "urllib3"]);
    expect(parsed.requiredBy).toEqual(["httpx"]);
    expect(parsed.packages).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// mypy (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.mypy", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerMypyTool(server as never);
    handler = server.tools.get("mypy")!.handler;
  });

  it("S1 [recorded] clean — no type errors", async () => {
    const stdout = loadFixture("mypy", "s01-clean.txt");
    vi.mocked(mypy).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      strict: false,
      ignoreMissingImports: false,
      noIncremental: false,
      disallowUntypedDefs: false,
      disallowIncompleteDefs: false,
      disallowUntypedCalls: false,
      disallowAnyGenerics: false,
      warnReturnAny: false,
      warnUnusedIgnores: false,
      warnRedundantCasts: false,
      warnUnreachable: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = MypyResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
    expect(parsed.total).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("S2 [recorded] type errors", async () => {
    const stdout = loadFixture("mypy", "s02-errors.txt");
    vi.mocked(mypy).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 1 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      strict: false,
      ignoreMissingImports: false,
      noIncremental: false,
      disallowUntypedDefs: false,
      disallowIncompleteDefs: false,
      disallowUntypedCalls: false,
      disallowAnyGenerics: false,
      warnReturnAny: false,
      warnUnusedIgnores: false,
      warnRedundantCasts: false,
      warnUnreachable: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = MypyResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(false);
    expect(parsed.errors).toBe(2);
    expect(parsed.notes).toBe(1);
    expect(parsed.total).toBe(3);
    expect(parsed.diagnostics![0].file).toBe("src/main.py");
    expect(parsed.diagnostics![0].line).toBe(10);
    expect(parsed.diagnostics![0].severity).toBe("error");
    expect(parsed.diagnostics![0].code).toBe("return-value");
    expect(parsed.diagnostics![1].code).toBe("arg-type");
    expect(parsed.diagnostics![2].severity).toBe("note");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ruff-check (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.ruff-check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerRuffTool(server as never);
    handler = server.tools.get("ruff-check")!.handler;
  });

  it("S1 [recorded] clean — no violations", async () => {
    const stdout = loadFixture("ruff-check", "s01-clean.txt");
    vi.mocked(ruff).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      fix: false,
      unsafeFixes: false,
      diff: false,
      preview: false,
      noCache: false,
      statistics: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = RuffResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.total).toBe(0);
    expect(parsed.fixable).toBe(0);
    expect(parsed.diagnostics).toEqual([]);
  });

  it("S2 [recorded] violations found", async () => {
    const stdout = loadFixture("ruff-check", "s02-violations.txt");
    vi.mocked(ruff).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 1 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      fix: false,
      unsafeFixes: false,
      diff: false,
      preview: false,
      noCache: false,
      statistics: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = RuffResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(false);
    expect(parsed.total).toBe(2);
    expect(parsed.fixable).toBe(1);
    expect(parsed.diagnostics![0].code).toBe("F401");
    expect(parsed.diagnostics![0].file).toBe("src/main.py");
    expect(parsed.diagnostics![0].fixable).toBe(true);
    expect(parsed.diagnostics![0].fixApplicability).toBe("safe");
    expect(parsed.diagnostics![1].code).toBe("E501");
    expect(parsed.diagnostics![1].fixable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// pytest (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.pytest", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerPytestTool(server as never);
    handler = server.tools.get("pytest")!.handler;
  });

  it("S1 [recorded] all tests pass", async () => {
    const stdout = loadFixture("pytest", "s01-pass.txt");
    vi.mocked(pytestRunner).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      verbose: false,
      exitFirst: false,
      collectOnly: false,
      lastFailed: false,
      noCapture: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = PytestResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.passed).toBe(5);
    expect(parsed.failed).toBe(0);
    expect(parsed.total).toBe(5);
    expect(parsed.duration).toBeCloseTo(0.12, 1);
    expect(parsed.failures).toEqual([]);
  });

  it("S2 [recorded] test failures", async () => {
    const stdout = loadFixture("pytest", "s02-failures.txt");
    vi.mocked(pytestRunner).mockResolvedValueOnce({ stdout, stderr: "", exitCode: 1 });
    const result = await handler({
      path: "/tmp/project",
      verbose: false,
      exitFirst: false,
      collectOnly: false,
      lastFailed: false,
      noCapture: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = PytestResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(false);
    expect(parsed.passed).toBe(4);
    expect(parsed.failed).toBe(1);
    expect(parsed.total).toBe(5);
    expect(parsed.failures!.length).toBe(1);
    expect(parsed.failures![0].test).toBe("test_subtract");
    expect(parsed.failures![0].message).toContain("assert 2 == 3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// black (recorded)
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: python.black", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(pip).mockReset();
    vi.mocked(mypy).mockReset();
    vi.mocked(ruff).mockReset();
    vi.mocked(pytestRunner).mockReset();
    vi.mocked(black).mockReset();
    const server = new FakeServer();
    registerBlackTool(server as never);
    handler = server.tools.get("black")!.handler;
  });

  it("S1 [recorded] check clean — no changes needed", async () => {
    const stderr = loadFixture("black", "s01-clean.txt");
    vi.mocked(black).mockResolvedValueOnce({ stdout: "", stderr, exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      check: true,
      diff: false,
      skipStringNormalization: false,
      preview: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = BlackResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
    expect(parsed.filesUnchanged).toBe(3);
    expect(parsed.filesChecked).toBe(3);
  });

  it("S2 [recorded] format changes applied", async () => {
    const stderr = loadFixture("black", "s02-changes.txt");
    vi.mocked(black).mockResolvedValueOnce({ stdout: "", stderr, exitCode: 0 });
    const result = await handler({
      path: "/tmp/project",
      targets: ["."],
      check: false,
      diff: false,
      skipStringNormalization: false,
      preview: false,
      compact: false,
    });
    expect(result).toHaveProperty("structuredContent");
    const parsed = BlackResultSchema.parse(result.structuredContent);
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(2);
    expect(parsed.filesUnchanged).toBe(1);
    expect(parsed.filesChecked).toBe(3);
    expect(parsed.wouldReformat).toContain("src/main.py");
    expect(parsed.wouldReformat).toContain("src/utils.py");
  });
});
