import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseBlackOutput,
  parseCondaListJson,
  parsePipAuditJson,
  parsePipInstall,
  parseRuffJson,
  parseUvInstall,
  parseUvRun,
} from "../src/lib/parsers.js";
import { compactPyenvMap } from "../src/lib/formatters.js";
import { CondaResultSchema, PyenvResultSchema } from "../src/schemas/index.js";
import { registerCondaTool } from "../src/tools/conda.js";
import { registerMypyTool } from "../src/tools/mypy.js";
import { registerPoetryTool } from "../src/tools/poetry.js";
import { registerPyenvTool } from "../src/tools/pyenv.js";

vi.mock("../src/lib/python-runner.js", () => ({
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

import { conda, mypy, poetry, pyenv } from "../src/lib/python-runner.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: Record<string, unknown> }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

describe("Python P2 gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("#358 parses black syntax errors into diagnostics", () => {
    const out = parseBlackOutput(
      "",
      "error: cannot format app.py: Cannot parse: 12:8: bad input",
      123,
    );
    expect(out.errorType).toBe("internal_error");
    expect(out.diagnostics?.[0]).toEqual({
      file: "app.py",
      line: 12,
      column: 8,
      message: "bad input",
    });
  });

  it("#359 adds conda remove action", async () => {
    const server = new FakeServer();
    registerCondaTool(server as never);
    const handler = server.tools.get("conda")!.handler;
    vi.mocked(conda).mockResolvedValueOnce({
      stdout: JSON.stringify({
        success: true,
        actions: { UNLINK: [{ name: "numpy", version: "1.26.0" }] },
      }),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({
      action: "remove",
      name: "dev",
      packages: ["numpy"],
      compact: false,
    });
    expect(vi.mocked(conda).mock.calls[0][0]).toEqual([
      "remove",
      "--json",
      "-y",
      "--name",
      "dev",
      "numpy",
    ]);
    expect(out.structuredContent.action).toBe("remove");
  });

  it("#360 adds conda create action", async () => {
    const server = new FakeServer();
    registerCondaTool(server as never);
    const handler = server.tools.get("conda")!.handler;
    vi.mocked(conda).mockResolvedValueOnce({
      stdout: JSON.stringify({
        success: true,
        actions: { LINK: [{ name: "python", version: "3.12.1" }] },
      }),
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({
      action: "create",
      name: "newenv",
      packages: ["python=3.12"],
      compact: false,
    });
    expect(vi.mocked(conda).mock.calls[0][0]).toEqual([
      "create",
      "--json",
      "-y",
      "--name",
      "newenv",
      "python=3.12",
    ]);
    expect(out.structuredContent.action).toBe("create");
  });

  it("#361 adds conda update action", async () => {
    const server = new FakeServer();
    registerCondaTool(server as never);
    const handler = server.tools.get("conda")!.handler;
    vi.mocked(conda).mockResolvedValueOnce({
      stdout: JSON.stringify({ success: true, actions: {} }),
      stderr: "",
      exitCode: 0,
    });

    await handler({ action: "update", name: "dev", all: true, compact: false });
    expect(vi.mocked(conda).mock.calls[0][0]).toEqual([
      "update",
      "--json",
      "-y",
      "--name",
      "dev",
      "--all",
    ]);
  });

  it("#362 uses a discriminated union for conda action states", () => {
    const parsed = CondaResultSchema.safeParse({ action: "list", condaVersion: "24.1.0" });
    expect(parsed.success).toBe(false);
  });

  it("#363 surfaces conda JSON parse errors", () => {
    const out = parseCondaListJson("not-json", "dev");
    expect(out.parseError).toBeDefined();
  });

  it("#364 exposes mypy strictness flags", async () => {
    const server = new FakeServer();
    registerMypyTool(server as never);
    const handler = server.tools.get("mypy")!.handler;
    vi.mocked(mypy).mockResolvedValueOnce({ stdout: "[]", stderr: "", exitCode: 0 });

    await handler({
      disallowUntypedDefs: true,
      disallowUntypedCalls: true,
      warnUnreachable: true,
      compact: false,
    });
    const args = vi.mocked(mypy).mock.calls[0][0];
    expect(args).toContain("--disallow-untyped-defs");
    expect(args).toContain("--disallow-untyped-calls");
    expect(args).toContain("--warn-unreachable");
  });

  it("#365 includes pip-audit skipped dependencies", () => {
    const out = parsePipAuditJson(
      JSON.stringify({
        dependencies: [
          { name: "local-pkg", version: "1.0.0", skip_reason: "not installed from index" },
        ],
      }),
      0,
    );
    expect(out.skipped).toEqual([{ name: "local-pkg", reason: "not installed from index" }]);
  });

  it("#366 preserves pip-audit package grouping", () => {
    const out = parsePipAuditJson(
      JSON.stringify({
        dependencies: [
          {
            name: "requests",
            version: "2.0.0",
            vulns: [
              { id: "VULN-1", fix_versions: ["2.1.0"] },
              { id: "VULN-2", fix_versions: ["2.2.0"] },
            ],
          },
        ],
      }),
      1,
    );
    expect(out.byPackage?.[0].name).toBe("requests");
    expect(out.byPackage?.[0].vulnerabilities).toHaveLength(2);
  });

  it("#367 extracts warnings from pip-install output", () => {
    const out = parsePipInstall(
      "",
      "WARNING: old resolver\nDEPRECATION: this flag will be removed",
      0,
    );
    expect(out.warnings).toEqual([
      "WARNING: old resolver",
      "DEPRECATION: this flag will be removed",
    ]);
  });

  it("#368 adds poetry update action", async () => {
    const server = new FakeServer();
    registerPoetryTool(server as never);
    const handler = server.tools.get("poetry")!.handler;
    vi.mocked(poetry).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ action: "update", packages: ["requests"], compact: false });
    expect(vi.mocked(poetry).mock.calls[0][0][0]).toBe("update");
    expect(vi.mocked(poetry).mock.calls[0][0]).toContain("requests");
  });

  it("#369 adds poetry lock action", async () => {
    const server = new FakeServer();
    registerPoetryTool(server as never);
    const handler = server.tools.get("poetry")!.handler;
    vi.mocked(poetry).mockResolvedValueOnce({
      stdout: "Writing lock file",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ action: "lock", compact: false });
    expect(vi.mocked(poetry).mock.calls[0][0][0]).toBe("lock");
    expect(out.structuredContent.action).toBe("lock");
  });

  it("#370 adds poetry check action", async () => {
    const server = new FakeServer();
    registerPoetryTool(server as never);
    const handler = server.tools.get("poetry")!.handler;
    vi.mocked(poetry).mockResolvedValueOnce({
      stdout: "All set!",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ action: "check", compact: false });
    expect(vi.mocked(poetry).mock.calls[0][0][0]).toBe("check");
    expect(out.structuredContent.action).toBe("check");
  });

  it("#371 adds poetry export action", async () => {
    const server = new FakeServer();
    registerPoetryTool(server as never);
    const handler = server.tools.get("poetry")!.handler;
    vi.mocked(poetry).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({
      action: "export",
      exportFormat: "requirements.txt",
      output: "requirements.txt",
      withoutHashes: true,
      compact: false,
    });
    const args = vi.mocked(poetry).mock.calls[0][0];
    expect(args).toContain("--format");
    expect(args).toContain("requirements.txt");
    expect(args).toContain("--output");
    expect(args).toContain("--without-hashes");
  });

  it("#372 adds pyenv which action", async () => {
    const server = new FakeServer();
    registerPyenvTool(server as never);
    const handler = server.tools.get("pyenv")!.handler;
    vi.mocked(pyenv).mockResolvedValueOnce({
      stdout: "/usr/bin/python\n",
      stderr: "",
      exitCode: 0,
    });

    const out = await handler({ action: "which", command: "python", compact: false });
    expect(vi.mocked(pyenv).mock.calls[0][0]).toEqual(["which", "python"]);
    expect(out.structuredContent.commandPath).toBe("/usr/bin/python");
  });

  it("#373 adds pyenv rehash action", async () => {
    const server = new FakeServer();
    registerPyenvTool(server as never);
    const handler = server.tools.get("pyenv")!.handler;
    vi.mocked(pyenv).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const out = await handler({ action: "rehash", compact: false });
    expect(vi.mocked(pyenv).mock.calls[0][0]).toEqual(["rehash"]);
    expect(out.structuredContent.action).toBe("rehash");
  });

  it("#374 includes key value in compact pyenv mode", () => {
    const compact = compactPyenvMap({
      action: "version",
      success: true,
      current: "3.11.7",
    });
    expect(compact.keyValue).toBe("3.11.7");
  });

  it("#375 uses discriminated union for pyenv state", () => {
    const parsed = PyenvResultSchema.safeParse({
      action: "version",
      success: true,
      localVersion: "3.11.7",
    });
    expect(parsed.success).toBe(false);
  });

  it("#376 captures ruff fixedCount", () => {
    const out = parseRuffJson("[]", 0, "Fixed 3 errors.");
    expect(out.fixedCount).toBe(3);
  });

  it("#377 sets uv-install alreadySatisfied boolean", () => {
    const out = parseUvInstall("", "Audited 5 packages in 10ms", 0);
    expect(out.alreadySatisfied).toBe(true);
  });

  it("#378 truncates uv-run stdout/stderr when over limit", () => {
    const out = parseUvRun("x".repeat(100), "y".repeat(100), 0, 42, { maxOutputChars: 20 });
    expect(out.truncated).toBe(true);
    expect(out.stdout?.endsWith("…")).toBe(true);
    expect(out.stderr?.endsWith("…")).toBe(true);
  });

  it("#379 separates uv diagnostics from command stderr", () => {
    const out = parseUvRun("", "Resolved 1 package in 3ms\ncommand failed: boom", 1, 50);
    expect(out.uvDiagnostics).toEqual(["Resolved 1 package in 3ms"]);
    expect(out.commandStderr).toContain("command failed: boom");
    expect(out.stderr).toContain("command failed: boom");
  });
});
