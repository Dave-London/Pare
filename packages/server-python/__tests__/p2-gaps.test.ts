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
import { registerPytestTool, pytestVerbosityArg } from "../src/tools/pytest.js";
import { registerRuffTool } from "../src/tools/ruff.js";

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

import { conda, mypy, poetry, pyenv, pytest, ruff } from "../src/lib/python-runner.js";

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

  it("#891 passes pythonPath through to ruff-check", async () => {
    const server = new FakeServer();
    registerRuffTool(server as never);
    const handler = server.tools.get("ruff-check")!.handler;
    vi.mocked(ruff).mockResolvedValueOnce({ stdout: "[]", stderr: "", exitCode: 0 });

    await handler({ pythonPath: ".venv/bin/python", compact: false });

    expect(vi.mocked(ruff).mock.calls[0][2]).toBe(".venv/bin/python");
  });

  it("#891 passes pythonPath through to pytest", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    await handler({ pythonPath: ".venv/bin/python", compact: false });

    expect(vi.mocked(pytest).mock.calls[0][2]).toBe(".venv/bin/python");
  });

  it("#984 passes env through to the pytest runner", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "1 passed in 0.1s",
      stderr: "",
      exitCode: 0,
    });

    await handler({ env: { PYTHONPATH: "src" }, compact: false });

    expect(vi.mocked(pytest).mock.calls[0][3]).toEqual({ PYTHONPATH: "src" });
  });

  it("#984 appends extraArgs before targets", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "1 passed in 0.1s",
      stderr: "",
      exitCode: 0,
    });

    await handler({ extraArgs: ["-p", "no:logfire"], targets: ["tests/"], compact: false });

    const args = vi.mocked(pytest).mock.calls[0][0] as string[];
    expect(args.slice(-4)).toEqual(["-p", "no:logfire", "--verbosity=-1", "tests/"]);
  });

  // pytest drops its summary line at two levels of quiet, and -q flags add up across
  // the tool, extraArgs and the project's addopts. The last verbosity option wins, so
  // the tool pins an absolute level after everything else (#1118, #1110, #1092).
  it("#1118 pins verbosity after extraArgs so a caller's -q cannot stack", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "19 passed in 5.67s",
      stderr: "",
      exitCode: 0,
    });

    await handler({
      extraArgs: ["-p", "no:logfire", "-q", "--timeout=60"],
      targets: ["tests/api/test_a.py", "tests/test_b.py"],
      compact: false,
    });

    const args = vi.mocked(pytest).mock.calls[0][0] as string[];
    // The tool no longer adds a relative -q of its own.
    expect(args.filter((a) => a === "-q")).toEqual(["-q"]);
    expect(args.indexOf("--verbosity=-1")).toBeGreaterThan(args.lastIndexOf("-q"));
    expect(args.indexOf("--verbosity=-1")).toBeLessThan(args.indexOf("tests/api/test_a.py"));
    expect(args.slice(-2)).toEqual(["tests/api/test_a.py", "tests/test_b.py"]);
  });

  it("#1118 pins verbosity to 1 when verbose is requested", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "==== 1 passed in 0.1s ====",
      stderr: "",
      exitCode: 0,
    });

    await handler({ verbose: true, compact: false });

    const args = vi.mocked(pytest).mock.calls[0][0] as string[];
    expect(args).toContain("--verbosity=1");
    expect(args).not.toContain("-v");
    expect(args).not.toContain("-q");
  });

  // The pin overrides relative flags, so it has to carry explicit requests for MORE
  // output itself; otherwise `-vv` (the full assertion diff) would stop working.
  it("#1118 carries explicit verbosity requests from extraArgs into the pin", () => {
    expect(pytestVerbosityArg(false)).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(true)).toBe("--verbosity=1");
    expect(pytestVerbosityArg(false, ["-v"])).toBe("--verbosity=1");
    expect(pytestVerbosityArg(false, ["-vv"])).toBe("--verbosity=2");
    expect(pytestVerbosityArg(true, ["-vv"])).toBe("--verbosity=3");
    expect(pytestVerbosityArg(false, ["--verbose", "-v"])).toBe("--verbosity=2");
    expect(pytestVerbosityArg(true, ["--verbosity=2"])).toBe("--verbosity=2");
    expect(pytestVerbosityArg(false, ["--verbosity", "3"])).toBe("--verbosity=3");
    expect(pytestVerbosityArg(false, ["--verbosity=0"])).toBe("--verbosity=0");
  });

  it("#1118 counts -v inside short-option clusters, but not inside an option's value", () => {
    // pytest accepts clustered flags such as -xvv.
    expect(pytestVerbosityArg(false, ["-xvv"])).toBe("--verbosity=2");
    expect(pytestVerbosityArg(false, ["-vvx"])).toBe("--verbosity=2");
    expect(pytestVerbosityArg(true, ["-vvs"])).toBe("--verbosity=3");
    expect(pytestVerbosityArg(false, ["-vq"])).toBe("--verbosity=1");
    // After a value-taking option the rest of the token is its value.
    expect(pytestVerbosityArg(false, ["-kvv"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["-mvery_slow"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["-pno:vcr"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["-n4", "-rv"])).toBe("--verbosity=-1");
    // Long options and positionals containing "v" are not flags.
    expect(pytestVerbosityArg(false, ["--cov=src", "tests/v1", "-V"])).toBe("--verbosity=-1");
  });

  it("#1118 passes an explicit level through as written and ignores malformed ones", () => {
    // Not reformatted: a huge value must reach pytest as the caller wrote it.
    expect(pytestVerbosityArg(false, ["--verbosity=99999999999999999999999"])).toBe(
      "--verbosity=99999999999999999999999",
    );
    // Malformed or missing values fall back to the counted level; pytest then
    // reports its own usage error for the caller's argument.
    expect(pytestVerbosityArg(true, ["--verbosity=abc"])).toBe("--verbosity=1");
    expect(pytestVerbosityArg(false, ["--verbosity=1.5"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["--verbosity"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["--verbosity="])).toBe("--verbosity=-1");
  });

  it("#1118 never lets the pin go below -1, whatever asks for less output", () => {
    expect(pytestVerbosityArg(false, ["-q"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["-qq", "--quiet"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["--verbosity=-3"])).toBe("--verbosity=-1");
    // -q does not cancel an explicit -v: more output never costs the summary line.
    expect(pytestVerbosityArg(false, ["-v", "-q"])).toBe("--verbosity=1");
    // Not verbosity flags: a value for another option, and anything after a bare `--`.
    expect(pytestVerbosityArg(false, ["-k", "v", "-x"])).toBe("--verbosity=-1");
    expect(pytestVerbosityArg(false, ["--", "-vv"])).toBe("--verbosity=-1");
  });

  it("#1118 puts the pin before a bare -- so pytest does not read it as a path", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "3 passed in 0.1s",
      stderr: "",
      exitCode: 0,
    });

    await handler({ extraArgs: ["-x", "--", "tests/test_a.py"], compact: false });

    const args = vi.mocked(pytest).mock.calls[0][0] as string[];
    expect(args.slice(-4)).toEqual(["-x", "--verbosity=-1", "--", "tests/test_a.py"]);
  });

  it("#984 rejects env keys that are not valid variable names", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;

    await expect(handler({ env: { "BAD-NAME": "x" }, compact: false })).rejects.toThrow(
      /Invalid env/,
    );
    await expect(handler({ env: { "1LEADING": "x" }, compact: false })).rejects.toThrow(
      /Invalid env/,
    );
    expect(vi.mocked(pytest)).not.toHaveBeenCalled();
  });

  it("#984 rejects env values and extraArgs with control characters", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;

    await expect(handler({ env: { GOOD_NAME: "bad\nvalue" }, compact: false })).rejects.toThrow(
      /must not contain NUL or newline/,
    );
    await expect(handler({ extraArgs: ["-p\nno:evil"], compact: false })).rejects.toThrow(
      /must not contain NUL or newline/,
    );
    expect(vi.mocked(pytest)).not.toHaveBeenCalled();
  });

  it("#984 surfaces errorOutput when a run fails with no test results", async () => {
    const server = new FakeServer();
    registerPytestTool(server as never);
    const handler = server.tools.get("pytest")!.handler;
    vi.mocked(pytest).mockResolvedValueOnce({
      stdout: "",
      stderr: "ImportError: broken plugin",
      exitCode: 1,
    });

    const out = await handler({ compact: false });

    expect(out.structuredContent.success).toBe(false);
    expect(out.structuredContent.exitCode).toBe(1);
    expect(out.structuredContent.errorOutput).toContain("ImportError: broken plugin");
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
    expect(out.structuredContent.success).toBe(true);
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
    expect(out.structuredContent.success).toBe(true);
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
