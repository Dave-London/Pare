import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the @paretools/shared module before importing the runner
vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import {
  eslint,
  prettier,
  biome,
  stylelintCmd,
  oxlintCmd,
  shellcheckCmd,
} from "../src/lib/lint-runner.js";
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
      timeout: 120_000,
    });
  });

  it("constructs correct args for default lint patterns", async () => {
    await eslint(["--format", "json", "."], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "."], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args with --fix flag", async () => {
    await eslint(["--format", "json", "src/", "--fix"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "src/", "--fix"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args with multiple patterns", async () => {
    await eslint(["--format", "json", "src/", "lib/", "tests/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["eslint", "--format", "json", "src/", "lib/", "tests/"],
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("passes undefined cwd when not specified", async () => {
    await eslint(["--format", "json", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["eslint", "--format", "json", "."], {
      cwd: undefined,
      timeout: 120_000,
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
      timeout: 120_000,
    });
  });

  it("constructs correct args for check mode", async () => {
    await prettier(["--check", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--check", "src/", "lib/"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args for write mode", async () => {
    await prettier(["--write", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--write", "src/", "lib/"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("passes undefined cwd when not specified", async () => {
    await prettier(["--check", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["prettier", "--check", "."], {
      cwd: undefined,
      timeout: 120_000,
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
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("constructs correct args for check mode with patterns", async () => {
    await biome(["check", "--reporter=json", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "check", "--reporter=json", "src/", "lib/"],
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("constructs correct args for format --write mode", async () => {
    await biome(["format", "--write", "src/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["@biomejs/biome", "format", "--write", "src/"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args for format --write with multiple patterns", async () => {
    await biome(["format", "--write", "src/", "lib/", "tests/"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "format", "--write", "src/", "lib/", "tests/"],
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("passes undefined cwd when not specified", async () => {
    await biome(["check", "--reporter=json", "."]);

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["@biomejs/biome", "check", "--reporter=json", "."],
      { cwd: undefined, timeout: 120_000 },
    );
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: '{"diagnostics":[]}', stderr: "" });

    const result = await biome(["check", "--reporter=json", "."], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: '{"diagnostics":[]}', stderr: "" });
  });
});

// ---------------------------------------------------------------------------
// stylelintCmd() argument construction
// ---------------------------------------------------------------------------

describe("stylelintCmd()", () => {
  it("passes arguments through to run() with npx stylelint prefix", async () => {
    await stylelintCmd(["--formatter", "json", "**/*.css"], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("npx", ["stylelint", "--formatter", "json", "**/*.css"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args for default patterns", async () => {
    await stylelintCmd(["--formatter", "json", "."], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["stylelint", "--formatter", "json", "."], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args with --fix flag", async () => {
    await stylelintCmd(["--formatter", "json", "**/*.css", "--fix"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "npx",
      ["stylelint", "--formatter", "json", "**/*.css", "--fix"],
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("passes undefined cwd when not specified", async () => {
    await stylelintCmd(["--formatter", "json", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["stylelint", "--formatter", "json", "."], {
      cwd: undefined,
      timeout: 120_000,
    });
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "[]", stderr: "" });

    const result = await stylelintCmd(["--formatter", "json", "."], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: "[]", stderr: "" });
  });
});

// ---------------------------------------------------------------------------
// oxlintCmd() argument construction
// ---------------------------------------------------------------------------

describe("oxlintCmd()", () => {
  it("passes arguments through to run() with npx oxlint prefix", async () => {
    await oxlintCmd(["--format", "json", "."], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("npx", ["oxlint", "--format", "json", "."], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args with multiple patterns", async () => {
    await oxlintCmd(["--format", "json", "src/", "lib/"], "/project");

    expect(mockRun).toHaveBeenCalledWith("npx", ["oxlint", "--format", "json", "src/", "lib/"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("passes undefined cwd when not specified", async () => {
    await oxlintCmd(["--format", "json", "."]);

    expect(mockRun).toHaveBeenCalledWith("npx", ["oxlint", "--format", "json", "."], {
      cwd: undefined,
      timeout: 120_000,
    });
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

    const result = await oxlintCmd(["--format", "json", "."], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  });
});

// ---------------------------------------------------------------------------
// shellcheckCmd() argument construction
// ---------------------------------------------------------------------------

describe("shellcheckCmd()", () => {
  it("passes arguments through to run() with shellcheck command (no npx)", async () => {
    await shellcheckCmd(["--format=json", "deploy.sh"], "/project");

    expect(mockRun).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith("shellcheck", ["--format=json", "deploy.sh"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("constructs correct args with severity filter", async () => {
    await shellcheckCmd(["--format=json", "--severity=warning", "deploy.sh"], "/project");

    expect(mockRun).toHaveBeenCalledWith(
      "shellcheck",
      ["--format=json", "--severity=warning", "deploy.sh"],
      { cwd: "/project", timeout: 120_000 },
    );
  });

  it("constructs correct args with multiple files", async () => {
    await shellcheckCmd(["--format=json", "deploy.sh", "build.sh"], "/project");

    expect(mockRun).toHaveBeenCalledWith("shellcheck", ["--format=json", "deploy.sh", "build.sh"], {
      cwd: "/project",
      timeout: 120_000,
    });
  });

  it("passes undefined cwd when not specified", async () => {
    await shellcheckCmd(["--format=json", "deploy.sh"]);

    expect(mockRun).toHaveBeenCalledWith("shellcheck", ["--format=json", "deploy.sh"], {
      cwd: undefined,
      timeout: 120_000,
    });
  });

  it("returns the RunResult from run()", async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "[]", stderr: "" });

    const result = await shellcheckCmd(["--format=json", "deploy.sh"], "/project");

    expect(result).toEqual({ exitCode: 0, stdout: "[]", stderr: "" });
  });
});
