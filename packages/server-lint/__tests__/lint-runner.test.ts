import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the @paretools/shared module before importing the runner
vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import { eslint, prettier, biome } from "../src/lib/lint-runner.js";
import { run } from "@paretools/shared";

const mockRun = vi.mocked(run);

beforeEach(() => {
  mockRun.mockClear();
});

// ---------------------------------------------------------------------------
// eslint() argument construction
// ---------------------------------------------------------------------------

describe("eslint()", () => {
  it("passes arguments through to run() with npx eslint prefix", async () => {
    await eslint(["--format", "json", "src/"], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "src/"], {
      cwd: "/project",
    });
  });

  it("constructs correct args for default lint patterns", async () => {
    await eslint(["--format", "json", "."], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "."], {
      cwd: "/project",
    });
  });

  it("constructs correct args with --fix flag", async () => {
    await eslint(["--format", "json", "src/", "--fix"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "src/", "--fix"], {
      cwd: "/project",
    });
  });

  it("constructs correct args with multiple patterns", async () => {
    await eslint(["--format", "json", "src/", "lib/", "tests/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["eslint", "--format", "json", "src/", "lib/", "tests/"],
      { cwd: "/project" },
    );
  });

  it("passes undefined cwd when not specified", async () => {
    await eslint(["--format", "json", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "."], {
      cwd: undefined,
    });
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 1, stdout: "[]", stderr: "" });

    const result = await eslint(["--format", "json", "."], "/project");

    expect(result).toEqual({ exitCode: 1, stdout: "[]", stderr: "" });
  });
});

// ---------------------------------------------------------------------------
// prettier() argument construction
// ---------------------------------------------------------------------------

describe("prettier()", () => {
  it("passes arguments through to run() with npx prettier prefix", async () => {
    await prettier(["--check", "."], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--check", "."], {
      cwd: "/project",
    });
  });

  it("constructs correct args for check mode", async () => {
    await prettier(["--check", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--check", "src/", "lib/"], {
      cwd: "/project",
    });
  });

  it("constructs correct args for write mode", async () => {
    await prettier(["--write", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--write", "src/", "lib/"], {
      cwd: "/project",
    });
  });

  it("passes undefined cwd when not specified", async () => {
    await prettier(["--check", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--check", "."], {
      cwd: undefined,
    });
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "All formatted", stderr: "" });

    const result = await prettier(["--check", "."], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: "All formatted", stderr: "" });
  });
});

// ---------------------------------------------------------------------------
// biome() argument construction
// ---------------------------------------------------------------------------

describe("biome()", () => {
  it("passes arguments through to run() with npx @biomejs/biome prefix", async () => {
    await biome(["check", "--reporter=json", "."], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "check", "--reporter=json", "."],
      { cwd: "/project" },
    );
  });

  it("constructs correct args for check mode with patterns", async () => {
    await biome(["check", "--reporter=json", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "check", "--reporter=json", "src/", "lib/"],
      { cwd: "/project" },
    );
  });

  it("constructs correct args for format --write mode", async () => {
    await biome(["format", "--write", "src/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["@biomejs/biome", "format", "--write", "src/"], {
      cwd: "/project",
    });
  });

  it("constructs correct args for format --write with multiple patterns", async () => {
    await biome(["format", "--write", "src/", "lib/", "tests/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "format", "--write", "src/", "lib/", "tests/"],
      { cwd: "/project" },
    );
  });

  it("passes undefined cwd when not specified", async () => {
    await biome(["check", "--reporter=json", "."]);

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "check", "--reporter=json", "."],
      { cwd: undefined },
    );
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: '{"diagnostics":[]}', stderr: "" });

    const result = await biome(["check", "--reporter=json", "."], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: '{"diagnostics":[]}', stderr: "" });
  });
});
