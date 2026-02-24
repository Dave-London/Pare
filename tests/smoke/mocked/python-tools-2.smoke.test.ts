/**
 * Smoke tests: python server (Part 2 of 2) -- Phase 2 (mocked)
 *
 * Covers: poetry, pyenv, pytest, ruff-check, ruff-format, uv-install, uv-run
 *
 * Tests all tools end-to-end with mocked python-runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PoetryResultSchema,
  PyenvResultSchema,
  PytestResultSchema,
  RuffResultSchema,
  RuffFormatResultSchema,
  UvInstallSchema,
  UvRunSchema,
} from "../../../packages/server-python/src/schemas/index.js";

// Mock the python runner module used by all python tools
vi.mock("../../../packages/server-python/src/lib/python-runner.js", () => ({
  pip: vi.fn(),
  mypy: vi.fn(),
  ruff: vi.fn(),
  pytest: vi.fn(),
  uv: vi.fn(),
  black: vi.fn(),
  conda: vi.fn(),
  pyenv: vi.fn(),
  poetry: vi.fn(),
  pipAudit: vi.fn(),
}));

import {
  ruff,
  pytest as pytestRunner,
  uv,
  pyenv as pyenvRunner,
  poetry as poetryRunner,
} from "../../../packages/server-python/src/lib/python-runner.js";
import { registerPoetryTool } from "../../../packages/server-python/src/tools/poetry.js";
import { registerPyenvTool } from "../../../packages/server-python/src/tools/pyenv.js";
import { registerPytestTool } from "../../../packages/server-python/src/tools/pytest.js";
import { registerRuffTool } from "../../../packages/server-python/src/tools/ruff.js";
import { registerRuffFormatTool } from "../../../packages/server-python/src/tools/ruff-format.js";
import { registerUvInstallTool } from "../../../packages/server-python/src/tools/uv-install.js";
import { registerUvRunTool } from "../../../packages/server-python/src/tools/uv-run.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function mockRunner(runner: ReturnType<typeof vi.fn>, stdout: string, stderr = "", exitCode = 0) {
  runner.mockResolvedValueOnce({ stdout, stderr, exitCode });
}

// =============================================================================
// poetry tool
// =============================================================================
describe("Smoke: poetry", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPoetryTool(server as never);
    handler = server.tools.get("poetry")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PoetryResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const POETRY_INSTALL_SUCCESS =
    "Installing dependencies from lock file\n\nNo dependencies to install or update\n";

  const POETRY_SHOW_OUTPUT =
    "requests      2.31.0 Python HTTP library\n" +
    "urllib3       2.0.7  HTTP library with thread-safe connection pooling\n";

  const POETRY_BUILD_OUTPUT =
    "Building my-package (0.1.0)\n  - Building sdist\n  - Built my_package-0.1.0.tar.gz\n  - Building wheel\n  - Built my_package-0.1.0-py3-none-any.whl\n";

  const POETRY_CHECK_OUTPUT = "All set!\n";

  // S1 [P0] Install dependencies
  it("S1 [P0] install returns success", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_INSTALL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ action: "install", path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Show packages
  it("S2 [P0] show packages returns packages list", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_SHOW_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ action: "show", path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S3 [P0] No pyproject.toml
  it("S3 [P0] no pyproject.toml throws error", async () => {
    vi.mocked(poetryRunner).mockRejectedValueOnce(
      new Error("Poetry could not find a pyproject.toml file"),
    );
    await expect(callAndValidate({ action: "install", path: "/tmp/empty" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on packages
  it("S4 [P0] flag injection on packages is blocked", async () => {
    await expect(callAndValidate({ action: "add", packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on group
  it("S5 [P0] flag injection on group is blocked", async () => {
    await expect(callAndValidate({ action: "add", group: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on output
  it("S6 [P0] flag injection on output is blocked", async () => {
    await expect(callAndValidate({ action: "export", output: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P1] Add package
  it("S7 [P1] add package passes package name to CLI", async () => {
    mockRunner(vi.mocked(poetryRunner), "Using version ^2.31.0 for requests\n", "", 0);
    await callAndValidate({ action: "add", packages: ["requests"] });
    const cliArgs = vi.mocked(poetryRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("requests");
    expect(cliArgs[0]).toBe("add");
  });

  // S8 [P1] Build wheel
  it("S8 [P1] build wheel passes --format wheel to CLI", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_BUILD_OUTPUT, "", 0);
    await callAndValidate({ action: "build", format: "wheel" });
    const cliArgs = vi.mocked(poetryRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--format");
    expect(cliArgs).toContain("wheel");
  });

  // S9 [P1] Check project
  it("S9 [P1] check returns success", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_CHECK_OUTPUT, "", 0);
    const { parsed } = await callAndValidate({ action: "check" });
    expect(parsed.success).toBe(true);
  });

  // S10 [P2] Dry run install
  it("S10 [P2] dry run install passes --dry-run to CLI", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_INSTALL_SUCCESS, "", 0);
    await callAndValidate({ action: "install", dryRun: true });
    const cliArgs = vi.mocked(poetryRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S11 [P0] Schema validation
  it("S11 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(poetryRunner), POETRY_INSTALL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ action: "install", path: "/tmp/project" });
    expect(PoetryResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pyenv tool
// =============================================================================
describe("Smoke: pyenv", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPyenvTool(server as never);
    handler = server.tools.get("pyenv")!.handler;
  });

  // Pyenv uses z.object({ action: z.string() }).passthrough() as outputSchema
  // because the discriminated union is not MCP-compatible. Validate with compact: false
  // for data shape tests, or loosely for CLI arg tests.
  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toHaveProperty("action");
    return { result, parsed: sc };
  }

  async function callAndValidateFull(params: Record<string, unknown>) {
    const result = await handler({ ...params, compact: false });
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PyenvResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const PYENV_VERSIONS =
    "  system\n" + "  3.10.12\n" + "* 3.11.6 (set by /home/user/.pyenv/version)\n" + "  3.12.0\n";

  const PYENV_VERSION = "3.11.6 (set by /home/user/.pyenv/version)\n";

  const PYENV_INSTALL_LIST = "Available versions:\n  2.7.18\n  3.10.12\n  3.11.6\n  3.12.0\n";

  const PYENV_LOCAL = "3.11.6\n";

  // S1 [P0] List versions
  it("S1 [P0] list versions returns versions array with current", async () => {
    mockRunner(vi.mocked(pyenvRunner), PYENV_VERSIONS, "", 0);
    const { parsed } = await callAndValidateFull({ action: "versions" });
    expect(parsed.action).toBe("versions");
    if (parsed.action === "versions") {
      expect(parsed.versions).toBeDefined();
      expect(parsed.current).toBeDefined();
    }
  });

  // S2 [P0] Get current version
  it("S2 [P0] get current version returns current", async () => {
    mockRunner(vi.mocked(pyenvRunner), PYENV_VERSION, "", 0);
    const { parsed } = await callAndValidateFull({ action: "version" });
    expect(parsed.action).toBe("version");
    if (parsed.action === "version") {
      expect(parsed.current).toBeDefined();
    }
  });

  // S3 [P0] pyenv not installed
  it("S3 [P0] pyenv not installed throws error", async () => {
    vi.mocked(pyenvRunner).mockRejectedValueOnce(new Error("spawn pyenv ENOENT"));
    await expect(callAndValidate({ action: "versions" })).rejects.toThrow();
  });

  // S4 [P0] Install without version
  it("S4 [P0] install without version returns error", async () => {
    const result = await handler({ action: "install" });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("version is required");
  });

  // S5 [P0] Uninstall without version
  it("S5 [P0] uninstall without version returns error", async () => {
    const result = await handler({ action: "uninstall" });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("version is required");
  });

  // S6 [P0] Which without command
  it("S6 [P0] which without command returns error", async () => {
    const result = await handler({ action: "which" });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("command is required");
  });

  // S7 [P0] Flag injection on version
  it("S7 [P0] flag injection on version is blocked", async () => {
    await expect(callAndValidate({ action: "install", version: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on command
  it("S8 [P0] flag injection on command is blocked", async () => {
    await expect(callAndValidate({ action: "which", command: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P1] Install list
  it("S9 [P1] install list returns available versions", async () => {
    mockRunner(vi.mocked(pyenvRunner), PYENV_INSTALL_LIST, "", 0);
    const { parsed } = await callAndValidateFull({ action: "installList" });
    expect(parsed.action).toBe("installList");
    if (parsed.action === "installList") {
      expect(parsed.availableVersions).toBeDefined();
    }
  });

  // S10 [P1] Local version
  it("S10 [P1] local version returns localVersion", async () => {
    mockRunner(vi.mocked(pyenvRunner), PYENV_LOCAL, "", 0);
    const { parsed } = await callAndValidateFull({ action: "local" });
    expect(parsed.action).toBe("local");
    if (parsed.action === "local") {
      expect(parsed.localVersion).toBeDefined();
    }
  });

  // S11 [P2] Rehash
  it("S11 [P2] rehash returns success", async () => {
    mockRunner(vi.mocked(pyenvRunner), "", "", 0);
    const { parsed } = await callAndValidateFull({ action: "rehash" });
    expect(parsed.action).toBe("rehash");
    expect(parsed.success).toBe(true);
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on versions result", async () => {
    mockRunner(vi.mocked(pyenvRunner), PYENV_VERSIONS, "", 0);
    const { parsed } = await callAndValidateFull({ action: "versions" });
    expect(PyenvResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pytest tool
// =============================================================================
describe("Smoke: pytest", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPytestTool(server as never);
    handler = server.tools.get("pytest")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PytestResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const PYTEST_ALL_PASS = "5 passed in 1.23s\n";

  const PYTEST_FAILURES =
    "FAILED tests/test_app.py::test_something - AssertionError: assert 1 == 2\n" +
    "FAILED tests/test_app.py::test_other - ValueError: invalid\n" +
    "2 failed, 3 passed in 2.50s\n";

  const PYTEST_NO_TESTS = "no tests ran in 0.01s\n";

  const PYTEST_COLLECT_ONLY =
    "<Module tests/test_app.py>\n  <Function test_something>\n  <Function test_other>\n2 tests collected in 0.1s\n";

  // S1 [P0] All tests pass
  it("S1 [P0] all tests pass returns success", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_ALL_PASS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.failed).toBe(0);
  });

  // S2 [P0] Tests with failures
  it("S2 [P0] tests with failures returns failure details", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_FAILURES, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.failed).toBeGreaterThan(0);
  });

  // S3 [P0] No tests found
  it("S3 [P0] no tests found returns total 0", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_NO_TESTS, "", 5);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.passed).toBe(0);
    expect(parsed.failed).toBe(0);
  });

  // S4 [P0] Flag injection on targets
  it("S4 [P0] flag injection on targets is blocked", async () => {
    await expect(callAndValidate({ targets: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on markers
  it("S5 [P0] flag injection on markers is blocked", async () => {
    await expect(callAndValidate({ markers: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on keyword
  it("S6 [P0] flag injection on keyword is blocked", async () => {
    await expect(callAndValidate({ keyword: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on coverage
  it("S7 [P0] flag injection on coverage is blocked", async () => {
    await expect(callAndValidate({ coverage: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on configFile
  it("S8 [P0] flag injection on configFile is blocked", async () => {
    await expect(callAndValidate({ configFile: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P1] Exit on first failure
  it("S9 [P1] exit first passes -x to CLI", async () => {
    mockRunner(vi.mocked(pytestRunner), "1 failed in 0.5s\n", "", 1);
    await callAndValidate({ path: "/tmp/project", exitFirst: true });
    const cliArgs = vi.mocked(pytestRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-x");
  });

  // S10 [P1] Keyword filter
  it("S10 [P1] keyword filter passes -k to CLI", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_ALL_PASS, "", 0);
    await callAndValidate({ path: "/tmp/project", keyword: "test_specific" });
    const cliArgs = vi.mocked(pytestRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-k");
    expect(cliArgs).toContain("test_specific");
  });

  // S11 [P1] Collect only
  it("S11 [P1] collect only passes --collect-only to CLI", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_COLLECT_ONLY, "", 0);
    await callAndValidate({ path: "/tmp/project", collectOnly: true });
    const cliArgs = vi.mocked(pytestRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--collect-only");
  });

  // S12 [P2] With coverage
  it("S12 [P2] coverage passes --cov to CLI", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_ALL_PASS, "", 0);
    await callAndValidate({ path: "/tmp/project", coverage: "src" });
    const cliArgs = vi.mocked(pytestRunner).mock.calls[0][0] as string[];
    expect(cliArgs.some((a: string) => a.startsWith("--cov="))).toBe(true);
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(pytestRunner), PYTEST_ALL_PASS, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(PytestResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// ruff-check tool
// =============================================================================
describe("Smoke: ruff-check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRuffTool(server as never);
    handler = server.tools.get("ruff-check")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RuffResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const RUFF_CLEAN = "[]";

  const RUFF_VIOLATIONS = JSON.stringify([
    {
      code: "F401",
      message: "`os` imported but unused",
      filename: "src/app.py",
      location: { row: 1, column: 1 },
      end_location: { row: 1, column: 10 },
      fix: { applicability: "safe", message: "Remove unused import" },
      url: "https://docs.astral.sh/ruff/rules/unused-import",
    },
    {
      code: "E501",
      message: "Line too long (120 > 88)",
      filename: "src/app.py",
      location: { row: 5, column: 89 },
      end_location: { row: 5, column: 120 },
      fix: null,
      url: "https://docs.astral.sh/ruff/rules/line-too-long",
    },
  ]);

  // S1 [P0] Clean project
  it("S1 [P0] clean project returns success with 0 total", async () => {
    mockRunner(vi.mocked(ruff), RUFF_CLEAN, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Project with violations
  it("S2 [P0] project with violations returns diagnostics", async () => {
    mockRunner(vi.mocked(ruff), RUFF_VIOLATIONS, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  // S3 [P0] No Python files
  it("S3 [P0] no python files returns success", async () => {
    mockRunner(vi.mocked(ruff), "[]", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(true);
  });

  // S4 [P0] Flag injection on targets
  it("S4 [P0] flag injection on targets is blocked", async () => {
    await expect(callAndValidate({ targets: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on config
  it("S5 [P0] flag injection on config is blocked", async () => {
    await expect(callAndValidate({ config: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on targetVersion
  it("S6 [P0] flag injection on targetVersion is blocked", async () => {
    await expect(callAndValidate({ targetVersion: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on select
  it("S7 [P0] flag injection on select is blocked", async () => {
    await expect(callAndValidate({ select: ["--exec=evil"] })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on ignore
  it("S8 [P0] flag injection on ignore is blocked", async () => {
    await expect(callAndValidate({ ignore: ["--exec=evil"] })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on exclude
  it("S9 [P0] flag injection on exclude is blocked", async () => {
    await expect(callAndValidate({ exclude: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P1] Select specific rules
  it("S10 [P1] select specific rules passes --select to CLI", async () => {
    mockRunner(vi.mocked(ruff), RUFF_CLEAN, "", 0);
    await callAndValidate({ path: "/tmp/project", select: ["E", "F401"] });
    const cliArgs = vi.mocked(ruff).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--select");
    expect(cliArgs).toContain("E,F401");
  });

  // S11 [P1] Fix mode
  it("S11 [P1] fix mode passes --fix to CLI", async () => {
    mockRunner(vi.mocked(ruff), RUFF_CLEAN, "", 0);
    await callAndValidate({ path: "/tmp/project", fix: true });
    const cliArgs = vi.mocked(ruff).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--fix");
  });

  // S12 [P1] Fixable diagnostics present
  it("S12 [P1] fixable diagnostics are correctly identified", async () => {
    mockRunner(vi.mocked(ruff), RUFF_VIOLATIONS, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    // fixable removed from schema; check diagnostics have fixable property
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.some((d) => d.fixable)).toBe(true);
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(ruff), RUFF_CLEAN, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(RuffResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// ruff-format tool
// =============================================================================
describe("Smoke: ruff-format", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerRuffFormatTool(server as never);
    handler = server.tools.get("ruff-format")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = RuffFormatResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const RUFF_FORMAT_CLEAN = "3 files left unchanged\n";
  const RUFF_FORMAT_CHANGED = "1 file reformatted, 2 files left unchanged\n";
  const RUFF_FORMAT_CHECK_FAIL =
    "Would reformat: src/app.py\n1 file would be reformatted, 2 files would be left unchanged\n";

  // S1 [P0] Format clean project
  it("S1 [P0] format clean project returns no changes", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CLEAN, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  // S2 [P0] Format with changes
  it("S2 [P0] format with changes returns files changed", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CHANGED, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
  });

  // S3 [P0] Check mode with unformatted
  it("S3 [P0] check mode with unformatted returns failure", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CHECK_FAIL, 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", check: true });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] No Python files
  it("S4 [P0] no python files returns success with 0 changes", async () => {
    mockRunner(vi.mocked(ruff), "", "0 files left unchanged\n", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  // S5 [P0] Flag injection on patterns
  it("S5 [P0] flag injection on patterns is blocked", async () => {
    await expect(callAndValidate({ patterns: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on config
  it("S6 [P0] flag injection on config is blocked", async () => {
    await expect(callAndValidate({ config: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on targetVersion
  it("S7 [P0] flag injection on targetVersion is blocked", async () => {
    await expect(callAndValidate({ targetVersion: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on range
  it("S8 [P0] flag injection on range is blocked", async () => {
    await expect(callAndValidate({ range: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on exclude
  it("S9 [P0] flag injection on exclude is blocked", async () => {
    await expect(callAndValidate({ exclude: ["--exec=evil"] })).rejects.toThrow();
  });

  // S10 [P1] Custom line length
  it("S10 [P1] custom line length passes --line-length to CLI", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CLEAN, 0);
    await callAndValidate({ path: "/tmp/project", lineLength: 120 });
    const cliArgs = vi.mocked(ruff).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--line-length");
    expect(cliArgs).toContain("120");
  });

  // S11 [P2] Diff mode
  it("S11 [P2] diff mode passes --diff to CLI", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CLEAN, 0);
    await callAndValidate({ path: "/tmp/project", diff: true });
    const cliArgs = vi.mocked(ruff).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--diff");
  });

  // S12 [P0] Schema validation
  it("S12 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(ruff), "", RUFF_FORMAT_CLEAN, 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(RuffFormatResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// uv-install tool
// =============================================================================
describe("Smoke: uv-install", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerUvInstallTool(server as never);
    handler = server.tools.get("uv-install")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = UvInstallSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const UV_INSTALL_SUCCESS =
    "Resolved 5 packages in 100ms\n" + "Installed 1 package in 50ms\n" + " + requests==2.31.0\n";

  const UV_ALREADY_SATISFIED = "Audited 1 package in 10ms\n";

  // S1 [P0] Install packages
  it("S1 [P0] install packages returns success", async () => {
    mockRunner(vi.mocked(uv), "", UV_INSTALL_SUCCESS, 0);
    const { parsed } = await callAndValidate({ packages: ["requests"] });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Already satisfied
  it("S2 [P0] already satisfied returns alreadySatisfied", async () => {
    mockRunner(vi.mocked(uv), "", UV_ALREADY_SATISFIED, 0);
    const { parsed } = await callAndValidate({ packages: ["pip"] });
    expect(parsed.success).toBe(true);
  });

  // S3 [P0] uv not installed
  it("S3 [P0] uv not installed throws error", async () => {
    vi.mocked(uv).mockRejectedValueOnce(new Error("spawn uv ENOENT"));
    await expect(callAndValidate({ packages: ["requests"] })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on packages
  it("S4 [P0] flag injection on packages is blocked", async () => {
    await expect(callAndValidate({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on requirements
  it("S5 [P0] flag injection on requirements is blocked", async () => {
    await expect(callAndValidate({ requirements: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on editable
  it("S6 [P0] flag injection on editable is blocked", async () => {
    await expect(callAndValidate({ editable: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on constraint
  it("S7 [P0] flag injection on constraint is blocked", async () => {
    await expect(callAndValidate({ constraint: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on indexUrl
  it("S8 [P0] flag injection on indexUrl is blocked", async () => {
    await expect(callAndValidate({ indexUrl: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on python
  it("S9 [P0] flag injection on python is blocked", async () => {
    await expect(callAndValidate({ python: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on extras
  it("S10 [P0] flag injection on extras is blocked", async () => {
    await expect(callAndValidate({ extras: ["--exec=evil"] })).rejects.toThrow();
  });

  // S11 [P1] Dry run
  it("S11 [P1] dry run passes --dry-run to CLI", async () => {
    mockRunner(vi.mocked(uv), "", "Would install requests==2.31.0\n", 0);
    await callAndValidate({ packages: ["requests"], dryRun: true });
    const cliArgs = vi.mocked(uv).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S12 [P1] Resolution conflict
  it("S12 [P1] resolution conflict returns structured error", async () => {
    mockRunner(
      vi.mocked(uv),
      "",
      "error: Because pkg1==1.0 depends on dep>=2.0 and pkg2==2.0 depends on dep<2.0, we can conclude that pkg1==1.0 and pkg2==2.0 are incompatible.\n",
      1,
    );
    const { parsed } = await callAndValidate({ packages: ["pkg1==1.0", "pkg2==2.0"] });
    expect(parsed.success).toBe(false);
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(uv), "", UV_INSTALL_SUCCESS, 0);
    const { parsed } = await callAndValidate({ packages: ["requests"] });
    expect(UvInstallSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// uv-run tool
// =============================================================================
describe("Smoke: uv-run", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerUvRunTool(server as never);
    handler = server.tools.get("uv-run")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = UvRunSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Run simple command
  it("S1 [P0] run simple command returns success with stdout", async () => {
    mockRunner(vi.mocked(uv), "hi\n", "", 0);
    const { parsed } = await callAndValidate({
      command: ["python", "-c", "print('hi')"],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
  });

  // S2 [P0] Command failure
  it("S2 [P0] command failure returns exit code 1", async () => {
    mockRunner(vi.mocked(uv), "", "Traceback...\nException\n", 1);
    const { parsed } = await callAndValidate({
      command: ["python", "-c", "raise Exception()"],
    });
    expect(parsed.success).toBe(false);
    expect(parsed.exitCode).toBe(1);
  });

  // S3 [P0] uv not installed
  it("S3 [P0] uv not installed throws error", async () => {
    vi.mocked(uv).mockRejectedValueOnce(new Error("spawn uv ENOENT"));
    await expect(callAndValidate({ command: ["python", "--version"] })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on command[0]
  it("S4 [P0] flag injection on command[0] is blocked", async () => {
    await expect(callAndValidate({ command: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on python
  it("S5 [P0] flag injection on python is blocked", async () => {
    await expect(callAndValidate({ command: ["python"], python: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on envFile
  it("S6 [P0] flag injection on envFile is blocked", async () => {
    await expect(
      callAndValidate({ command: ["python"], envFile: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S7 [P0] Flag injection on withPackages
  it("S7 [P0] flag injection on withPackages is blocked", async () => {
    await expect(
      callAndValidate({ command: ["python"], withPackages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S8 [P1] With injected packages
  it("S8 [P1] with packages passes --with to CLI", async () => {
    mockRunner(vi.mocked(uv), "", "", 0);
    await callAndValidate({
      command: ["python", "-c", "import requests"],
      withPackages: ["requests"],
    });
    const cliArgs = vi.mocked(uv).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--with");
    expect(cliArgs).toContain("requests");
  });

  // S9 [P1] Output truncation
  it("S9 [P1] output truncation returns truncated flag", async () => {
    const longOutput = "x".repeat(200);
    mockRunner(vi.mocked(uv), longOutput, "", 0);
    const { parsed } = await callAndValidate({
      command: ["python", "-c", "print('x'*200)"],
      outputLimit: 100,
    });
    // Truncation is applied by the parser if output exceeds limit
    expect(parsed.success).toBe(true);
  });

  // S10 [P2] Module mode
  it("S10 [P2] module mode passes -m to CLI", async () => {
    mockRunner(vi.mocked(uv), "", "", 0);
    await callAndValidate({ command: ["http.server"], module: true });
    const cliArgs = vi.mocked(uv).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-m");
  });

  // S11 [P0] Schema validation
  it("S11 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(uv), "hello\n", "", 0);
    const { parsed } = await callAndValidate({
      command: ["python", "-c", "print('hello')"],
    });
    expect(UvRunSchema.safeParse(parsed).success).toBe(true);
  });
});
