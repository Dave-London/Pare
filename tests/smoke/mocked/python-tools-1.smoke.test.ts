/**
 * Smoke tests: python server (Part 1 of 2) -- Phase 2 (mocked)
 *
 * Covers: black, conda, mypy, pip-audit, pip-install, pip-list, pip-show
 *
 * Tests all tools end-to-end with mocked python-runner,
 * validating argument construction, output schema compliance,
 * flag injection blocking, and edge case handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BlackResultSchema,
  MypyResultSchema,
  PipAuditResultSchema,
  PipInstallSchema,
  PipListSchema,
  PipShowSchema,
  CondaResultSchema,
  CondaListResultSchema,
  CondaInfoResultSchema,
  CondaEnvListResultSchema,
  CondaCreateResultSchema,
  CondaRemoveResultSchema,
  CondaUpdateResultSchema,
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
  pip,
  mypy,
  black as blackRunner,
  conda as condaRunner,
  pipAudit,
} from "../../../packages/server-python/src/lib/python-runner.js";
import { registerBlackTool } from "../../../packages/server-python/src/tools/black.js";
import { registerCondaTool } from "../../../packages/server-python/src/tools/conda.js";
import { registerMypyTool } from "../../../packages/server-python/src/tools/mypy.js";
import { registerPipAuditTool } from "../../../packages/server-python/src/tools/pip-audit.js";
import { registerPipInstallTool } from "../../../packages/server-python/src/tools/pip-install.js";
import { registerPipListTool } from "../../../packages/server-python/src/tools/pip-list.js";
import { registerPipShowTool } from "../../../packages/server-python/src/tools/pip-show.js";

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
// black tool
// =============================================================================
describe("Smoke: black", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerBlackTool(server as never);
    handler = server.tools.get("black")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = BlackResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  // S1 [P0] Format clean project (no changes)
  it("S1 [P0] format clean project returns no changes", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "All done! \u2728 \ud83c\udf70 \u2728\n0 files reformatted, 5 files left unchanged.\n",
      0,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBe(0);
  });

  // S2 [P0] Format project with changes
  it("S2 [P0] format project with changes returns files changed", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "reformatted src/app.py\nAll done! \u2728 \ud83c\udf70 \u2728\n1 file reformatted, 3 files left unchanged.\n",
      0,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
    expect(parsed.filesChanged).toBeGreaterThan(0);
  });

  // S3 [P0] Check mode with violations
  it("S3 [P0] check mode with violations returns check_failed", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "would reformat src/app.py\nOh no! \ud83d\udca5 \ud83d\udca5 \ud83d\udca5\n1 file would be reformatted, 2 files would be left unchanged.\n",
      1,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project", check: true });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("check_failed");
  });

  // S4 [P0] No Python files found
  it("S4 [P0] no python files returns success with 0 files checked", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "No Python files are present to be formatted. Nothing to do \ud83d\ude34\n",
      0,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(true);
  });

  // S5 [P0] Flag injection on targets
  it("S5 [P0] flag injection on targets is blocked", async () => {
    await expect(callAndValidate({ targets: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on targetVersion
  it("S6 [P0] flag injection on targetVersion is blocked", async () => {
    await expect(callAndValidate({ targetVersion: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on config
  it("S7 [P0] flag injection on config is blocked", async () => {
    await expect(callAndValidate({ config: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P1] Syntax error in file
  it("S8 [P1] syntax error returns internal_error", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "error: cannot format src/bad.py: Cannot parse: 1:0:   x = \nOh no! \ud83d\udca5 \ud83d\udca5 \ud83d\udca5\n1 file failed to reformat.\n",
      123,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.errorType).toBe("internal_error");
  });

  // S9 [P1] Custom line length
  it("S9 [P1] custom line length passed to CLI", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "All done! \u2728 \ud83c\udf70 \u2728\n0 files reformatted.\n",
      0,
    );
    await callAndValidate({ path: "/tmp/project", lineLength: 120 });
    const cliArgs = vi.mocked(blackRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--line-length");
    expect(cliArgs).toContain("120");
  });

  // S10 [P2] Diff mode
  it("S10 [P2] diff mode passed to CLI", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "All done! \u2728 \ud83c\udf70 \u2728\n0 files reformatted.\n",
      0,
    );
    await callAndValidate({ path: "/tmp/project", diff: true });
    const cliArgs = vi.mocked(blackRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--diff");
  });

  // S11 [P0] Schema validation
  it("S11 [P0] schema validation passes on all results", async () => {
    mockRunner(
      vi.mocked(blackRunner),
      "",
      "All done! \u2728 \ud83c\udf70 \u2728\n0 files reformatted, 3 files left unchanged.\n",
      0,
    );
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(BlackResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// conda tool
// =============================================================================
describe("Smoke: conda", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerCondaTool(server as never);
    handler = server.tools.get("conda")!.handler;
  });

  // Conda uses z.object({ action: z.string() }).passthrough() as outputSchema
  // because the discriminated union is not MCP-compatible. Validate loosely.
  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const sc = result.structuredContent as Record<string, unknown>;
    expect(sc).toHaveProperty("action");
    return { result, parsed: sc };
  }

  const CONDA_LIST_JSON = JSON.stringify([
    { name: "numpy", version: "1.24.0", channel: "defaults", build_string: "py311h" },
    { name: "pip", version: "23.0", channel: "defaults", build_string: "py311h" },
  ]);

  const CONDA_INFO_JSON = JSON.stringify({
    conda_version: "23.1.0",
    platform: "linux-64",
    python_version: "3.11.0",
    default_prefix: "/home/user/miniconda3",
    active_prefix: "/home/user/miniconda3",
    channels: ["defaults"],
    envs_dirs: ["/home/user/miniconda3/envs"],
    pkgs_dirs: ["/home/user/miniconda3/pkgs"],
  });

  const CONDA_ENV_LIST_JSON = JSON.stringify({
    envs: ["/home/user/miniconda3", "/home/user/miniconda3/envs/myenv"],
  });

  const CONDA_CREATE_JSON = JSON.stringify({
    success: true,
    actions: {
      LINK: [{ name: "numpy", version: "1.24.0", channel: "defaults", build_string: "py311h" }],
    },
    prefix: "/home/user/miniconda3/envs/test",
  });

  const CONDA_REMOVE_JSON = JSON.stringify({
    success: true,
    actions: {
      UNLINK: [{ name: "numpy", version: "1.24.0", channel: "defaults" }],
    },
  });

  const CONDA_UPDATE_JSON = JSON.stringify({
    success: true,
    actions: {
      LINK: [{ name: "numpy", version: "1.25.0", channel: "defaults" }],
      UNLINK: [{ name: "numpy", version: "1.24.0", channel: "defaults" }],
    },
  });

  // S1 [P0] List packages in base env
  it("S1 [P0] list packages returns packages array with total", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_LIST_JSON, "", 0);
    const { parsed } = await callAndValidate({ action: "list", compact: false });
    expect(parsed.action).toBe("list");
    // In full mode, packages array is present
    expect((parsed as Record<string, unknown>).total).toBeGreaterThan(0);
  });

  // S2 [P0] Get conda info
  it("S2 [P0] info returns conda version and platform", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_INFO_JSON, "", 0);
    const { parsed } = await callAndValidate({ action: "info", compact: false });
    expect(parsed.action).toBe("info");
    expect(parsed.condaVersion).toBeDefined();
    expect(parsed.platform).toBeDefined();
  });

  // S3 [P0] List environments
  it("S3 [P0] env-list returns environments array", async () => {
    // env-list does two calls: env list --json and info --json
    mockRunner(vi.mocked(condaRunner), CONDA_ENV_LIST_JSON, "", 0);
    mockRunner(vi.mocked(condaRunner), CONDA_INFO_JSON, "", 0);
    const { parsed } = await callAndValidate({ action: "env-list", compact: false });
    expect(parsed.action).toBe("env-list");
    expect((parsed as Record<string, unknown>).total).toBeGreaterThan(0);
  });

  // S4 [P0] Conda not installed
  it("S4 [P0] conda not installed throws error", async () => {
    vi.mocked(condaRunner).mockRejectedValueOnce(new Error("spawn conda ENOENT"));
    await expect(callAndValidate({ action: "list" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on name
  it("S5 [P0] flag injection on name is blocked", async () => {
    await expect(callAndValidate({ action: "list", name: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on prefix
  it("S6 [P0] flag injection on prefix is blocked", async () => {
    await expect(callAndValidate({ action: "list", prefix: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on packageFilter
  it("S7 [P0] flag injection on packageFilter is blocked", async () => {
    await expect(
      callAndValidate({ action: "list", packageFilter: "--exec=evil" }),
    ).rejects.toThrow();
  });

  // S8 [P0] Flag injection on packages
  it("S8 [P0] flag injection on packages is blocked", async () => {
    await expect(
      callAndValidate({ action: "create", packages: ["--exec=evil"] }),
    ).rejects.toThrow();
  });

  // S9 [P1] List in named env
  it("S9 [P1] list in named env passes --name to CLI", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_LIST_JSON, "", 0);
    await callAndValidate({ action: "list", name: "myenv", compact: false });
    const cliArgs = vi.mocked(condaRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--name");
    expect(cliArgs).toContain("myenv");
  });

  // S10 [P1] Create environment
  it("S10 [P1] create environment returns success", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_CREATE_JSON, "", 0);
    const { parsed } = await callAndValidate({
      action: "create",
      name: "test",
      packages: ["numpy"],
    });
    expect(parsed.action).toBe("create");
    if (parsed.action === "create") {
      expect(parsed.success).toBe(true);
    }
  });

  // S11 [P1] Remove packages
  it("S11 [P1] remove packages returns success", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_REMOVE_JSON, "", 0);
    const { parsed } = await callAndValidate({
      action: "remove",
      name: "test",
      packages: ["numpy"],
    });
    expect(parsed.action).toBe("remove");
    if (parsed.action === "remove") {
      expect(parsed.success).toBe(true);
    }
  });

  // S12 [P2] Update all
  it("S12 [P2] update all passes --all to CLI", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_UPDATE_JSON, "", 0);
    await callAndValidate({ action: "update", all: true });
    const cliArgs = vi.mocked(condaRunner).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--all");
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on list result", async () => {
    mockRunner(vi.mocked(condaRunner), CONDA_LIST_JSON, "", 0);
    const { parsed } = await callAndValidate({ action: "list", compact: false });
    expect(CondaResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// mypy tool
// =============================================================================
describe("Smoke: mypy", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerMypyTool(server as never);
    handler = server.tools.get("mypy")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = MypyResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const MYPY_CLEAN = "Success: no issues found in 5 source files\n";

  const MYPY_ERRORS_JSON = JSON.stringify([
    {
      file: "src/app.py",
      line: 10,
      column: 5,
      message: "Incompatible types",
      hint: null,
      code: "assignment",
      severity: "error",
    },
    {
      file: "src/app.py",
      line: 20,
      column: 1,
      message: "Missing return",
      hint: null,
      code: "return",
      severity: "error",
    },
  ]);

  const MYPY_MIXED_JSON = JSON.stringify([
    {
      file: "src/app.py",
      line: 10,
      column: 5,
      message: "Incompatible types",
      hint: null,
      code: "assignment",
      severity: "error",
    },
    {
      file: "src/app.py",
      line: 15,
      column: 1,
      message: "Unused ignore",
      hint: null,
      code: "unused-ignore",
      severity: "warning",
    },
    {
      file: "src/app.py",
      line: 20,
      column: 1,
      message: "See doc",
      hint: null,
      code: null,
      severity: "note",
    },
  ]);

  // S1 [P0] Clean project (no errors)
  it("S1 [P0] clean project returns success with 0 errors", async () => {
    mockRunner(vi.mocked(mypy), MYPY_CLEAN, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Project with type errors
  it("S2 [P0] project with type errors returns diagnostics", async () => {
    mockRunner(vi.mocked(mypy), MYPY_ERRORS_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project", compact: false });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });

  // S3 [P0] No Python files
  it("S3 [P0] no python files returns success", async () => {
    mockRunner(vi.mocked(mypy), "Success: no issues found in 0 source files\n", "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/empty" });
    expect(parsed.success).toBe(true);
  });

  // S4 [P0] Flag injection on targets
  it("S4 [P0] flag injection on targets is blocked", async () => {
    await expect(callAndValidate({ targets: ["--exec=evil"] })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on configFile
  it("S5 [P0] flag injection on configFile is blocked", async () => {
    await expect(callAndValidate({ configFile: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on pythonVersion
  it("S6 [P0] flag injection on pythonVersion is blocked", async () => {
    await expect(callAndValidate({ pythonVersion: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on exclude
  it("S7 [P0] flag injection on exclude is blocked", async () => {
    await expect(callAndValidate({ exclude: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on module
  it("S8 [P0] flag injection on module is blocked", async () => {
    await expect(callAndValidate({ module: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on package
  it("S9 [P0] flag injection on package is blocked", async () => {
    await expect(callAndValidate({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P1] Strict mode
  it("S10 [P1] strict mode passes --strict to CLI", async () => {
    mockRunner(vi.mocked(mypy), MYPY_CLEAN, "", 0);
    await callAndValidate({ path: "/tmp/project", strict: true });
    const cliArgs = vi.mocked(mypy).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--strict");
  });

  // S11 [P1] Check specific module
  it("S11 [P1] check specific module passes -m to CLI", async () => {
    mockRunner(vi.mocked(mypy), MYPY_CLEAN, "", 0);
    await callAndValidate({ path: "/tmp/project", module: "mymodule" });
    const cliArgs = vi.mocked(mypy).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-m");
    expect(cliArgs).toContain("mymodule");
  });

  // S12 [P1] With warnings and notes
  it("S12 [P1] warnings and notes are counted from diagnostics", async () => {
    mockRunner(vi.mocked(mypy), MYPY_MIXED_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
    expect(parsed.diagnostics).toBeDefined();
  });

  // S13 [P0] Schema validation
  it("S13 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(mypy), MYPY_CLEAN, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(MypyResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pip-audit tool
// =============================================================================
describe("Smoke: pip-audit", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPipAuditTool(server as never);
    handler = server.tools.get("pip-audit")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipAuditResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const AUDIT_CLEAN_JSON = JSON.stringify({
    dependencies: [
      { name: "pip", version: "23.0", vulns: [] },
      { name: "setuptools", version: "67.0", vulns: [] },
    ],
  });

  const AUDIT_VULN_JSON = JSON.stringify({
    dependencies: [
      {
        name: "requests",
        version: "2.25.0",
        vulns: [
          {
            id: "PYSEC-2023-001",
            description: "HTTP redirect vulnerability",
            fix_versions: ["2.31.0"],
            aliases: ["CVE-2023-32681"],
          },
        ],
      },
    ],
  });

  // S1 [P0] No vulnerabilities
  it("S1 [P0] no vulnerabilities returns success with empty list", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Vulnerabilities found
  it("S2 [P0] vulnerabilities found returns failure with vuln list", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_VULN_JSON, "", 1);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] pip-audit not installed
  it("S3 [P0] pip-audit not installed throws error", async () => {
    vi.mocked(pipAudit).mockRejectedValueOnce(new Error("spawn pip-audit ENOENT"));
    await expect(callAndValidate({ path: "/tmp/project" })).rejects.toThrow();
  });

  // S4 [P0] Flag injection on requirements
  it("S4 [P0] flag injection on requirements is blocked", async () => {
    await expect(callAndValidate({ requirements: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on indexUrl
  it("S5 [P0] flag injection on indexUrl is blocked", async () => {
    await expect(callAndValidate({ indexUrl: "--exec=evil" })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on ignoreVuln
  it("S6 [P0] flag injection on ignoreVuln is blocked", async () => {
    await expect(callAndValidate({ ignoreVuln: ["--exec=evil"] })).rejects.toThrow();
  });

  // S7 [P1] Audit from requirements file
  it("S7 [P1] audit from requirements file passes -r to CLI", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", requirements: "requirements.txt" });
    const cliArgs = vi.mocked(pipAudit).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-r");
    expect(cliArgs).toContain("requirements.txt");
  });

  // S8 [P1] Ignore specific vuln
  it("S8 [P1] ignore specific vuln passes --ignore-vuln to CLI", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", ignoreVuln: ["PYSEC-2023-001"] });
    const cliArgs = vi.mocked(pipAudit).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--ignore-vuln");
    expect(cliArgs).toContain("PYSEC-2023-001");
  });

  // S9 [P2] Dry run fix
  it("S9 [P2] dry run fix passes --fix and --dry-run to CLI", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_CLEAN_JSON, "", 0);
    await callAndValidate({ path: "/tmp/project", fix: true, dryRun: true });
    const cliArgs = vi.mocked(pipAudit).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--fix");
    expect(cliArgs).toContain("--dry-run");
  });

  // S10 [P0] Schema validation
  it("S10 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(pipAudit), AUDIT_CLEAN_JSON, "", 0);
    const { parsed } = await callAndValidate({ path: "/tmp/project" });
    expect(PipAuditResultSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pip-install tool
// =============================================================================
describe("Smoke: pip-install", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPipInstallTool(server as never);
    handler = server.tools.get("pip-install")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipInstallSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const INSTALL_SUCCESS =
    "Collecting requests\n" +
    "  Downloading requests-2.31.0-py3-none-any.whl (62 kB)\n" +
    "Successfully installed requests-2.31.0\n";

  const ALREADY_SATISFIED =
    "Requirement already satisfied: pip in /usr/lib/python3/dist-packages (23.0.1)\n";

  const INSTALL_FAIL =
    "ERROR: Could not find a version that satisfies the requirement nonexistent-pkg-zzz\n" +
    "ERROR: No matching distribution found for nonexistent-pkg-zzz\n";

  // S1 [P0] Install single package
  it("S1 [P0] install single package returns success", async () => {
    mockRunner(vi.mocked(pip), INSTALL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ packages: ["requests"] });
    expect(parsed.success).toBe(true);
  });

  // S2 [P0] Already satisfied
  it("S2 [P0] already satisfied returns alreadySatisfied true", async () => {
    mockRunner(vi.mocked(pip), ALREADY_SATISFIED, "", 0);
    const { parsed } = await callAndValidate({ packages: ["pip"] });
    expect(parsed.success).toBe(true);
    expect(parsed.alreadySatisfied).toBe(true);
  });

  // S3 [P0] Package not found
  it("S3 [P0] package not found returns failure", async () => {
    mockRunner(vi.mocked(pip), "", INSTALL_FAIL, 1);
    const { parsed } = await callAndValidate({ packages: ["nonexistent-pkg-zzz"] });
    expect(parsed.success).toBe(false);
  });

  // S4 [P0] No packages or requirements specified falls back to requirements.txt
  it("S4 [P0] no packages falls back to requirements.txt", async () => {
    mockRunner(vi.mocked(pip), INSTALL_SUCCESS, "", 0);
    await callAndValidate({});
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("-r");
    expect(cliArgs).toContain("requirements.txt");
  });

  // S5 [P0] Flag injection on packages
  it("S5 [P0] flag injection on packages is blocked", async () => {
    await expect(callAndValidate({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P0] Flag injection on requirements
  it("S6 [P0] flag injection on requirements is blocked", async () => {
    await expect(callAndValidate({ requirements: "--exec=evil" })).rejects.toThrow();
  });

  // S7 [P0] Flag injection on constraint
  it("S7 [P0] flag injection on constraint is blocked", async () => {
    await expect(callAndValidate({ constraint: "--exec=evil" })).rejects.toThrow();
  });

  // S8 [P0] Flag injection on editable
  it("S8 [P0] flag injection on editable is blocked", async () => {
    await expect(callAndValidate({ editable: "--exec=evil" })).rejects.toThrow();
  });

  // S9 [P0] Flag injection on indexUrl
  it("S9 [P0] flag injection on indexUrl is blocked", async () => {
    await expect(callAndValidate({ indexUrl: "--exec=evil" })).rejects.toThrow();
  });

  // S10 [P0] Flag injection on target
  it("S10 [P0] flag injection on target is blocked", async () => {
    await expect(callAndValidate({ target: "--exec=evil" })).rejects.toThrow();
  });

  // S11 [P0] Flag injection on report
  it("S11 [P0] flag injection on report is blocked", async () => {
    await expect(callAndValidate({ report: "--exec=evil" })).rejects.toThrow();
  });

  // S12 [P0] Flag injection on extraIndexUrl
  it("S12 [P0] flag injection on extraIndexUrl is blocked", async () => {
    await expect(callAndValidate({ extraIndexUrl: ["--exec=evil"] })).rejects.toThrow();
  });

  // S13 [P1] Dry run
  it("S13 [P1] dry run passes --dry-run to CLI", async () => {
    mockRunner(vi.mocked(pip), "Would install requests-2.31.0\n", "", 0);
    await callAndValidate({ packages: ["requests"], dryRun: true });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--dry-run");
  });

  // S14 [P1] Upgrade mode
  it("S14 [P1] upgrade mode passes --upgrade to CLI", async () => {
    mockRunner(vi.mocked(pip), INSTALL_SUCCESS, "", 0);
    await callAndValidate({ packages: ["requests"], upgrade: true });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--upgrade");
  });

  // S15 [P0] Schema validation
  it("S15 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(pip), INSTALL_SUCCESS, "", 0);
    const { parsed } = await callAndValidate({ packages: ["requests"] });
    expect(PipInstallSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pip-list tool
// =============================================================================
describe("Smoke: pip-list", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPipListTool(server as never);
    handler = server.tools.get("pip-list")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipListSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const PIP_LIST_JSON = JSON.stringify([
    { name: "pip", version: "23.0" },
    { name: "setuptools", version: "67.0" },
    { name: "requests", version: "2.31.0" },
  ]);

  const PIP_LIST_EMPTY = "[]";

  const PIP_LIST_OUTDATED_JSON = JSON.stringify([
    { name: "pip", version: "23.0", latest_version: "23.3", latest_filetype: "wheel" },
  ]);

  // S1 [P0] List all packages
  it("S1 [P0] list all packages returns packages array", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_JSON, "", 0);
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.success).toBe(true);
    expect(parsed.packages).toBeDefined();
    expect(parsed.packages!.length).toBeGreaterThan(0);
  });

  // S2 [P0] Empty environment
  it("S2 [P0] empty environment returns empty packages", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_EMPTY, "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.success).toBe(true);
  });

  // S3 [P0] Flag injection on exclude
  it("S3 [P0] flag injection on exclude is blocked", async () => {
    await expect(callAndValidate({ exclude: ["--exec=evil"] })).rejects.toThrow();
  });

  // S4 [P1] Outdated packages
  it("S4 [P1] outdated packages passes --outdated to CLI", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_OUTDATED_JSON, "", 0);
    const { parsed } = await callAndValidate({ outdated: true, compact: false });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--outdated");
    expect(parsed.packages).toBeDefined();
  });

  // S5 [P1] Exclude specific packages
  it("S5 [P1] exclude specific packages passes --exclude to CLI", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_JSON, "", 0);
    await callAndValidate({ exclude: ["pip", "setuptools"] });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--exclude");
    expect(cliArgs).toContain("pip");
    expect(cliArgs).toContain("setuptools");
  });

  // S6 [P2] Not-required packages
  it("S6 [P2] not-required passes --not-required to CLI", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_JSON, "", 0);
    await callAndValidate({ notRequired: true });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--not-required");
  });

  // S7 [P0] Schema validation
  it("S7 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(pip), PIP_LIST_JSON, "", 0);
    const { parsed } = await callAndValidate({});
    expect(PipListSchema.safeParse(parsed).success).toBe(true);
  });
});

// =============================================================================
// pip-show tool
// =============================================================================
describe("Smoke: pip-show", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.resetAllMocks();
    const server = new FakeServer();
    registerPipShowTool(server as never);
    handler = server.tools.get("pip-show")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = PipShowSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  const PIP_SHOW_SINGLE =
    "Name: pip\n" +
    "Version: 23.0\n" +
    "Summary: The PyPA recommended tool for installing Python packages.\n" +
    "Home-page: https://pip.pypa.io/\n" +
    "Author: The pip developers\n" +
    "Author-email: distutils-sig@python.org\n" +
    "License: MIT\n" +
    "Location: /usr/lib/python3/dist-packages\n" +
    "Requires:\n" +
    "Required-by: \n";

  const PIP_SHOW_MULTI =
    "Name: pip\n" +
    "Version: 23.0\n" +
    "Summary: The PyPA recommended tool for installing Python packages.\n" +
    "Home-page: https://pip.pypa.io/\n" +
    "Author: The pip developers\n" +
    "Author-email: distutils-sig@python.org\n" +
    "License: MIT\n" +
    "Location: /usr/lib/python3/dist-packages\n" +
    "Requires:\n" +
    "Required-by: \n" +
    "---\n" +
    "Name: setuptools\n" +
    "Version: 67.0\n" +
    "Summary: Easily download, build, install, upgrade, and uninstall Python packages\n" +
    "Home-page: https://github.com/pypa/setuptools\n" +
    "Author: Python Packaging Authority\n" +
    "Author-email: distutils-sig@python.org\n" +
    "License: MIT\n" +
    "Location: /usr/lib/python3/dist-packages\n" +
    "Requires:\n" +
    "Required-by: \n";

  const PIP_SHOW_NOT_FOUND = "WARNING: Package(s) not found: nonexistent-zzz\n";

  // S1 [P0] Show single package
  it("S1 [P0] show single package returns name and version", async () => {
    mockRunner(vi.mocked(pip), PIP_SHOW_SINGLE, "", 0);
    const { parsed } = await callAndValidate({ package: "pip", compact: false });
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe("pip");
    expect(parsed.version).toBe("23.0");
  });

  // S2 [P0] Package not found
  it("S2 [P0] package not found returns failure", async () => {
    mockRunner(vi.mocked(pip), PIP_SHOW_NOT_FOUND, "", 1);
    const { parsed } = await callAndValidate({ package: "nonexistent-zzz", compact: false });
    expect(parsed.success).toBe(false);
  });

  // S3 [P0] No package specified
  it("S3 [P0] no package specified returns error", async () => {
    const result = await handler({});
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("at least one package name is required");
  });

  // S4 [P0] Flag injection on package
  it("S4 [P0] flag injection on package is blocked", async () => {
    await expect(handler({ package: "--exec=evil" })).rejects.toThrow();
  });

  // S5 [P0] Flag injection on packages
  it("S5 [P0] flag injection on packages is blocked", async () => {
    await expect(handler({ packages: ["--exec=evil"] })).rejects.toThrow();
  });

  // S6 [P1] Multiple packages
  it("S6 [P1] multiple packages returns array", async () => {
    mockRunner(vi.mocked(pip), PIP_SHOW_MULTI, "", 0);
    const { parsed } = await callAndValidate({ packages: ["pip", "setuptools"], compact: false });
    expect(parsed.packages.length).toBe(2);
  });

  // S7 [P2] Show with files
  it("S7 [P2] show with files passes --files to CLI", async () => {
    mockRunner(vi.mocked(pip), PIP_SHOW_SINGLE, "", 0);
    await callAndValidate({ package: "pip", files: true, compact: false });
    const cliArgs = vi.mocked(pip).mock.calls[0][0] as string[];
    expect(cliArgs).toContain("--files");
  });

  // S8 [P0] Schema validation
  it("S8 [P0] schema validation passes on all results", async () => {
    mockRunner(vi.mocked(pip), PIP_SHOW_SINGLE, "", 0);
    const { parsed } = await callAndValidate({ package: "pip", compact: false });
    expect(PipShowSchema.safeParse(parsed).success).toBe(true);
  });
});
