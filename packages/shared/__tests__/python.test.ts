import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

vi.mock("../src/runner.js", () => ({
  run: vi.fn(),
}));

import { run } from "../src/runner.js";
import { pythonInterpreterCandidates, runPythonModule, runPythonTool } from "../src/python.js";

const mockRun = vi.mocked(run);

function ok() {
  return { stdout: "", stderr: "", exitCode: 0 };
}

describe("python helpers", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = join(tmpdir(), `pare-python-helper-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("prefers project venv interpreters before PATH fallbacks", async () => {
    const python = join(tempDir, ".venv", "bin", "python");
    await mkdir(join(tempDir, ".venv", "bin"), { recursive: true });
    await writeFile(python, "");

    expect(pythonInterpreterCandidates(tempDir, { platform: "linux" }).slice(0, 3)).toEqual([
      python,
      "python",
      "python3",
    ]);
  });

  it("falls back from missing tool executable to python -m module", async () => {
    mockRun
      .mockRejectedValueOnce(new Error('Command not found: "ruff". Ensure it is installed.'))
      .mockResolvedValueOnce(ok());

    await runPythonTool("ruff", "ruff", ["check", "."], { cwd: tempDir });

    expect(mockRun.mock.calls[0]).toEqual(["ruff", ["check", "."], { cwd: tempDir }]);
    expect(mockRun.mock.calls[1]).toEqual([
      "python",
      ["-m", "ruff", "check", "."],
      { cwd: tempDir },
    ]);
  });

  it("falls back from missing python to python3 for module execution", async () => {
    mockRun
      .mockRejectedValueOnce(new Error('Command not found: "python". Ensure it is installed.'))
      .mockResolvedValueOnce(ok());

    await runPythonModule("pytest", ["-v"], { cwd: tempDir });

    expect(mockRun.mock.calls[0][0]).toBe("python");
    expect(mockRun.mock.calls[1]).toEqual(["python3", ["-m", "pytest", "-v"], { cwd: tempDir }]);
  });

  it("uses explicit pythonPath without probing PATH commands", async () => {
    mockRun.mockResolvedValueOnce(ok());

    await runPythonTool("pytest", "pytest", ["-q"], {
      cwd: tempDir,
      pythonPath: "/custom/python",
    });

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("/custom/python", ["-m", "pytest", "-q"], {
      cwd: tempDir,
    });
  });

  it("treats missing Python modules as command-not-found and tries the next interpreter", async () => {
    mockRun
      .mockResolvedValueOnce({ stdout: "", stderr: "No module named ruff", exitCode: 1 })
      .mockResolvedValueOnce(ok());

    await runPythonModule("ruff", ["check"], { cwd: tempDir });

    expect(mockRun.mock.calls[0][0]).toBe("python");
    expect(mockRun.mock.calls[1][0]).toBe("python3");
  });
});
