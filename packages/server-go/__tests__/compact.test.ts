import { describe, it, expect } from "vitest";
import {
  compactBuildMap,
  formatBuildCompact,
  compactTestMap,
  formatTestCompact,
  compactVetMap,
  formatVetCompact,
  compactFmtMap,
  formatFmtCompact,
  compactRunMap,
  formatRunCompact,
  compactGenerateMap,
  formatGenerateCompact,
  compactModTidyMap,
  formatModTidyCompact,
  compactEnvMap,
  formatEnvCompact,
  compactListMap,
  formatListCompact,
  compactGetMap,
  formatGetCompact,
  compactGolangciLintMap,
  formatGolangciLintCompact,
  GOLANGCI_LINT_COMPACT_MAX_DIAGNOSTICS,
} from "../src/lib/formatters.js";
import type {
  GoBuildResult,
  GoTestResult,
  GoVetResult,
  GoFmtResult,
  GoRunResult,
  GoGenerateResult,
  GoModTidyResult,
  GoEnvResult,
  GoListResult,
  GoGetResult,
  GolangciLintResult,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
describe("compactBuildMap", () => {
  it("preserves errors array when non-empty", () => {
    const data: GoBuildResult = {
      success: false,
      errors: [
        { file: "main.go", line: 10, column: 5, message: "undefined: foo" },
        { file: "util.go", line: 22, message: "syntax error" },
      ],
    };

    const compact = compactBuildMap(data);

    expect(compact.success).toBe(false);
    expect(compact.errors).toEqual(data.errors);
  });

  it("omits errors when empty (clean build)", () => {
    const data: GoBuildResult = { success: true, errors: [] };

    const compact = compactBuildMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("errors");
  });
});

describe("formatBuildCompact", () => {
  it("formats successful build", () => {
    expect(formatBuildCompact({ success: true })).toBe("go build: success.");
  });

  it("formats failed build with error count", () => {
    expect(
      formatBuildCompact({
        success: false,
        errors: [
          { file: "a.go", line: 1, message: "e1" },
          { file: "b.go", line: 2, message: "e2" },
          { file: "c.go", line: 3, message: "e3" },
        ],
      }),
    ).toBe("go build: 3 errors");
  });
});

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------
describe("compactTestMap", () => {
  it("keeps counts, drops individual test details", () => {
    const data: GoTestResult = {
      success: false,
      tests: [
        { package: "myapp/auth", name: "TestLogin", status: "pass", elapsed: 0.05 },
        { package: "myapp/auth", name: "TestLogout", status: "fail", elapsed: 0.02 },
        { package: "myapp/util", name: "TestSkipped", status: "skip" },
      ],
      passed: 1,
      failed: 1,
      skipped: 1,
    };

    const compact = compactTestMap(data);

    expect(compact.success).toBe(false);
    expect(compact.passed).toBe(1);
    expect(compact.failed).toBe(1);
    expect(compact.skipped).toBe(1);
    expect(compact).not.toHaveProperty("tests");
  });

  it("preserves zero counts for empty suite", () => {
    const data: GoTestResult = {
      success: true,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
    };

    const compact = compactTestMap(data);

    expect(compact.passed).toBe(0);
    expect(compact.failed).toBe(0);
    expect(compact.skipped).toBe(0);
  });
});

describe("formatTestCompact", () => {
  it("formats passing test summary", () => {
    expect(formatTestCompact({ success: true, passed: 5, failed: 0, skipped: 0 })).toBe(
      "ok: 5 passed, 0 failed, 0 skipped",
    );
  });

  it("formats failing test summary", () => {
    expect(formatTestCompact({ success: false, passed: 1, failed: 1, skipped: 1 })).toBe(
      "FAIL: 1 passed, 1 failed, 1 skipped",
    );
  });
});

// ---------------------------------------------------------------------------
// vet
// ---------------------------------------------------------------------------
describe("compactVetMap", () => {
  it("preserves diagnostics when non-empty", () => {
    const data: GoVetResult = {
      success: false,
      diagnostics: [
        { file: "main.go", line: 15, column: 2, message: "unreachable code" },
        { file: "handler.go", line: 30, message: "possible misuse of unsafe.Pointer" },
      ],
    };

    const compact = compactVetMap(data);

    expect(compact.success).toBe(false);
    expect(compact.diagnostics).toEqual(data.diagnostics);
  });

  it("omits diagnostics when empty for clean vet", () => {
    const data: GoVetResult = { success: true, diagnostics: [] };

    const compact = compactVetMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

describe("formatVetCompact", () => {
  it("formats clean vet", () => {
    expect(formatVetCompact({ success: true })).toBe("go vet: no issues found.");
  });

  it("formats vet with issues", () => {
    expect(
      formatVetCompact({
        success: false,
        diagnostics: [
          { file: "a.go", line: 1, message: "d1" },
          { file: "b.go", line: 2, message: "d2" },
          { file: "c.go", line: 3, message: "d3" },
        ],
      }),
    ).toBe("go vet: 3 issues");
  });
});

// ---------------------------------------------------------------------------
// fmt
// ---------------------------------------------------------------------------
describe("compactFmtMap", () => {
  it("keeps success and file count, drops file list", () => {
    const data: GoFmtResult = {
      success: false,
      filesChanged: 3,
      files: ["main.go", "cmd/server/handler.go", "internal/util/helpers.go"],
    };

    const compact = compactFmtMap(data);

    expect(compact.success).toBe(false);
    expect(compact.filesChanged).toBe(3);
    expect(compact).not.toHaveProperty("files");
  });

  it("preserves clean format state", () => {
    const data: GoFmtResult = { success: true, filesChanged: 0, files: [] };

    const compact = compactFmtMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(0);
  });
});

describe("formatFmtCompact", () => {
  it("formats all formatted", () => {
    expect(formatFmtCompact({ success: true, filesChanged: 0 })).toBe(
      "gofmt: all files formatted.",
    );
  });

  it("formats with file count", () => {
    expect(formatFmtCompact({ success: false, filesChanged: 5 })).toBe("gofmt: 5 files");
  });
});

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
describe("compactRunMap", () => {
  it("keeps exitCode, success, and short stdout/stderr content (#1022)", () => {
    const data: GoRunResult = {
      exitCode: 0,
      stdout: "Hello, World!\nLine 2",
      stderr: "",
      success: true,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(0);
    expect(compact.success).toBe(true);
    expect(compact.stdout).toBe("Hello, World!\nLine 2");
    expect(compact).not.toHaveProperty("stderr");
    expect(compact).not.toHaveProperty("stdoutTruncated");
  });

  it("preserves non-zero exit code and stderr content", () => {
    const data: GoRunResult = {
      exitCode: 2,
      stdout: "",
      stderr: "panic: runtime error",
      success: false,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.success).toBe(false);
    expect(compact.stderr).toBe("panic: runtime error");
  });

  it("truncates long streams to the compact budget with flags and total lines", () => {
    const stdout = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const data: GoRunResult = {
      exitCode: 0,
      stdout,
      stderr: "",
      success: true,
    };

    const compact = compactRunMap(data);

    expect(compact.stdoutTruncated).toBe(true);
    expect(compact.stdoutTotalLines).toBe(200);
    expect(compact.stdout).toContain("line 0");
    expect(compact.stdout).toContain("line 199");
    expect(compact.stdout).toContain("lines omitted");
    expect(compact.stdout!.length).toBeLessThan(stdout.length);
  });

  it("preserves upstream maxOutput truncation flags", () => {
    const data: GoRunResult = {
      exitCode: 0,
      stdout: "partial output\n... (truncated)",
      stderr: "",
      stdoutTruncated: true,
      success: true,
    };

    const compact = compactRunMap(data);

    expect(compact.stdoutTruncated).toBe(true);
    expect(compact.stdout).toContain("partial output");
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(formatRunCompact({ exitCode: 0, success: true })).toBe("go run: success.");
  });

  it("formats failed run with exit code", () => {
    expect(formatRunCompact({ exitCode: 2, success: false })).toBe("go run: exit code 2.");
  });

  it("includes stream content and truncation notes (#1022)", () => {
    const text = formatRunCompact({
      exitCode: 1,
      success: false,
      stdout: "some output",
      stderr: "boom",
      stderrTruncated: true,
      stderrTotalLines: 500,
    });
    expect(text).toContain("go run: exit code 1.");
    expect(text).toContain("some output");
    expect(text).toContain("boom");
    expect(text).toContain("[stderr truncated: 500 total lines");
  });
});

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------
describe("compactGenerateMap", () => {
  it("includes output when non-empty", () => {
    const data: GoGenerateResult = {
      success: true,
      output: "mockgen -source=service.go -destination=mock_service.go",
    };

    const compact = compactGenerateMap(data);

    expect(compact.success).toBe(true);
    expect(compact.output).toBe("mockgen -source=service.go -destination=mock_service.go");
  });

  it("omits output when empty", () => {
    const data: GoGenerateResult = {
      success: true,
      output: "",
    };

    const compact = compactGenerateMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("output");
  });

  it("preserves failure state with output", () => {
    const data: GoGenerateResult = {
      success: false,
      output: 'main.go:3: running "mockgen": exec: "mockgen": executable file not found',
    };

    const compact = compactGenerateMap(data);

    expect(compact.success).toBe(false);
    expect(compact.output).toBe(
      'main.go:3: running "mockgen": exec: "mockgen": executable file not found',
    );
  });
});

describe("formatGenerateCompact", () => {
  it("formats successful generate", () => {
    expect(formatGenerateCompact({ success: true })).toBe("go generate: success.");
  });

  it("formats failed generate", () => {
    expect(formatGenerateCompact({ success: false })).toBe("go generate: FAIL");
  });
});

// ---------------------------------------------------------------------------
// mod-tidy
// ---------------------------------------------------------------------------
describe("compactModTidyMap", () => {
  it("includes summary when non-empty", () => {
    const data: GoModTidyResult = {
      success: true,
      summary: "go.mod and go.sum are already tidy.",
    };

    const compact = compactModTidyMap(data);

    expect(compact.success).toBe(true);
    expect(compact.summary).toBe("go.mod and go.sum are already tidy.");
  });

  it("omits summary when empty", () => {
    const data: GoModTidyResult = {
      success: true,
      summary: "",
    };

    const compact = compactModTidyMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("summary");
  });

  it("preserves failure state with summary", () => {
    const data: GoModTidyResult = {
      success: false,
      summary: "go.mod file not found in current directory or any parent directory",
    };

    const compact = compactModTidyMap(data);

    expect(compact.success).toBe(false);
    expect(compact.summary).toBe(
      "go.mod file not found in current directory or any parent directory",
    );
  });
});

describe("formatModTidyCompact", () => {
  it("formats successful mod tidy", () => {
    expect(formatModTidyCompact({ success: true })).toBe("go mod tidy: success.");
  });

  it("formats failed mod tidy", () => {
    expect(formatModTidyCompact({ success: false })).toBe("go mod tidy: FAIL");
  });
});

// ---------------------------------------------------------------------------
// env
// ---------------------------------------------------------------------------
describe("compactEnvMap", () => {
  it("keeps key fields, drops full vars map", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
        CGO_ENABLED: "1",
        GOMODCACHE: "/home/user/go/pkg/mod",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };

    const compact = compactEnvMap(data);

    expect(compact.success).toBe(true);
    expect(compact.goroot).toBe("/usr/local/go");
    expect(compact.gopath).toBe("/home/user/go");
    expect(compact.goversion).toBe("go1.22.0");
    expect(compact.goos).toBe("linux");
    expect(compact.goarch).toBe("amd64");
    expect(compact).not.toHaveProperty("vars");
  });

  it("preserves empty fields", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {},
      goroot: "",
      gopath: "",
      goversion: "",
      goos: "",
      goarch: "",
    };

    const compact = compactEnvMap(data);

    expect(compact.goroot).toBe("");
    expect(compact.goversion).toBe("");
  });
});

describe("formatEnvCompact", () => {
  it("formats env summary", () => {
    expect(
      formatEnvCompact({
        success: true,
        goroot: "/usr/local/go",
        gopath: "/home/user/go",
        goversion: "go1.22.0",
        goos: "linux",
        goarch: "amd64",
      }),
    ).toBe("go env: go1.22.0 linux/amd64");
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------
describe("compactListMap", () => {
  it("keeps only packageCount, drops package details", () => {
    const data: GoListResult = {
      success: true,
      packages: [
        {
          dir: "/project",
          importPath: "github.com/user/project",
          name: "main",
          goFiles: ["main.go"],
        },
        { dir: "/project/pkg", importPath: "github.com/user/project/pkg", name: "pkg" },
      ],
    };

    const compact = compactListMap(data);

    expect(compact.success).toBe(true);
    expect(compact.packageCount).toBe(2);
    expect(compact).not.toHaveProperty("packages");
  });

  it("preserves zero packageCount for empty list", () => {
    const data: GoListResult = { success: true, packages: [] };

    const compact = compactListMap(data);

    expect(compact.success).toBe(true);
    expect(compact.packageCount).toBe(0);
  });
});

describe("formatListCompact", () => {
  it("formats empty list", () => {
    expect(formatListCompact({ success: true, packageCount: 0 })).toBe(
      "go list: no packages found.",
    );
  });

  it("formats list with count", () => {
    expect(formatListCompact({ success: true, packageCount: 5 })).toBe("go list: 5 packages");
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------
describe("compactGetMap", () => {
  it("returns success and resolvedCount 0 when no resolved packages", () => {
    const data: GoGetResult = {
      success: true,
    };

    const compact = compactGetMap(data);

    expect(compact.success).toBe(true);
    expect(compact.resolvedCount).toBe(0);
  });

  it("preserves failure state", () => {
    const data: GoGetResult = {
      success: false,
    };

    const compact = compactGetMap(data);

    expect(compact.success).toBe(false);
    expect(compact.resolvedCount).toBe(0);
  });

  it("includes resolvedCount when packages are resolved", () => {
    const data: GoGetResult = {
      success: true,
      resolvedPackages: [
        { package: "golang.org/x/text", previousVersion: "v0.3.7", newVersion: "v0.14.0" },
      ],
    };

    const compact = compactGetMap(data);

    expect(compact.success).toBe(true);
    expect(compact.resolvedCount).toBe(1);
  });
});

describe("formatGetCompact", () => {
  it("formats successful get", () => {
    expect(formatGetCompact({ success: true, resolvedCount: 0 })).toBe("go get: success.");
  });

  it("formats failed get", () => {
    expect(formatGetCompact({ success: false, resolvedCount: 0 })).toBe("go get: FAIL");
  });

  it("formats successful get with resolved packages", () => {
    expect(formatGetCompact({ success: true, resolvedCount: 3 })).toBe(
      "go get: success, 3 packages resolved.",
    );
  });
});

// ─── Gap #150: env compact mode with queried vars ───────────────────

describe("compactEnvMap — queried vars (Gap #150)", () => {
  it("includes queried variables in compact output", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
        CGO_ENABLED: "1",
        GOMODCACHE: "/home/user/go/pkg/mod",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };

    const compact = compactEnvMap(data, ["CGO_ENABLED", "GOMODCACHE"]);

    expect(compact.success).toBe(true);
    expect(compact.goroot).toBe("/usr/local/go");
    expect(compact.CGO_ENABLED).toBe("1");
    expect(compact.GOMODCACHE).toBe("/home/user/go/pkg/mod");
  });

  it("does not duplicate default key fields as extra keys", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };

    const compact = compactEnvMap(data, ["GOROOT", "GOOS"]);

    // GOROOT and GOOS are already top-level fields, should not be added again
    const keys = Object.keys(compact);
    expect(keys.filter((k) => k === "GOROOT")).toHaveLength(0); // Not added as extra key
    expect(compact.goroot).toBe("/usr/local/go");
  });

  it("works without queried vars (backward compatible)", () => {
    const data: GoEnvResult = {
      success: true,
      vars: {
        GOROOT: "/usr/local/go",
        GOPATH: "/home/user/go",
        GOVERSION: "go1.22.0",
        GOOS: "linux",
        GOARCH: "amd64",
        CGO_ENABLED: "1",
      },
      goroot: "/usr/local/go",
      gopath: "/home/user/go",
      goversion: "go1.22.0",
      goos: "linux",
      goarch: "amd64",
    };

    const compact = compactEnvMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("CGO_ENABLED");
  });
});

// ─── Gap #151 / #1022: fmt compact keeps parse errors ───────────────

describe("compactFmtMap — parseErrors (#1022)", () => {
  it("keeps the full parseErrors array (real errors, not noise)", () => {
    const data: GoFmtResult = {
      success: false,
      filesChanged: 1,
      files: ["main.go"],
      parseErrors: [{ file: "broken.go", line: 5, column: 1, message: "syntax error" }],
    };

    const compact = compactFmtMap(data);

    expect(compact.parseErrors).toEqual(data.parseErrors);
    expect(compact).not.toHaveProperty("files");
  });

  it("does not include parseErrors when no parse errors", () => {
    const data: GoFmtResult = {
      success: true,
      filesChanged: 0,
      files: [],
    };

    const compact = compactFmtMap(data);

    expect(compact).not.toHaveProperty("parseErrors");
  });
});

describe("formatFmtCompact — parseErrors (#1022)", () => {
  it("lists parse errors in compact format", () => {
    const text = formatFmtCompact({
      success: false,
      filesChanged: 2,
      parseErrors: [
        { file: "broken.go", line: 5, column: 1, message: "expected declaration, found foo" },
      ],
    });
    expect(text).toContain("gofmt: 2 files, 1 parse errors");
    expect(text).toContain("broken.go:5:1: expected declaration, found foo");
  });
});

// ─── Gap #152: generate compact with directiveCount ─────────────────

describe("compactGenerateMap — directiveCount (Gap #152)", () => {
  it("includes directiveCount when directives present", () => {
    const data: GoGenerateResult = {
      success: true,
      output: 'main.go:3: running "stringer"',
      directives: [{ file: "main.go", line: 3, command: "stringer", status: "completed" }],
    };

    const compact = compactGenerateMap(data);

    expect(compact.directiveCount).toBe(1);
  });

  it("does not include directiveCount when no directives", () => {
    const data: GoGenerateResult = {
      success: true,
      output: "",
    };

    const compact = compactGenerateMap(data);

    expect(compact).not.toHaveProperty("directiveCount");
  });
});

// ─── Gap #156: mod-tidy compact with madeChanges ────────────────────

describe("compactModTidyMap — madeChanges (Gap #156)", () => {
  it("includes madeChanges when defined", () => {
    const data: GoModTidyResult = {
      success: true,
      summary: "updated",
      madeChanges: true,
    };

    const compact = compactModTidyMap(data);

    expect(compact.madeChanges).toBe(true);
  });

  it("omits madeChanges when undefined", () => {
    const data: GoModTidyResult = {
      success: true,
      summary: "success",
    };

    const compact = compactModTidyMap(data);

    expect(compact).not.toHaveProperty("madeChanges");
  });
});

describe("formatModTidyCompact — madeChanges (Gap #156)", () => {
  it("formats with changes made", () => {
    expect(formatModTidyCompact({ success: true, madeChanges: true })).toBe(
      "go mod tidy: success (changes made).",
    );
  });

  it("formats with already tidy", () => {
    expect(formatModTidyCompact({ success: true, madeChanges: false })).toBe(
      "go mod tidy: success (already tidy).",
    );
  });

  it("formats without madeChanges", () => {
    expect(formatModTidyCompact({ success: true })).toBe("go mod tidy: success.");
  });
});

// ─── #1022: get compact keeps failing packages ──────────────────────

describe("compactGetMap — failing packages (#1022)", () => {
  it("keeps packages with error/errorType on failure", () => {
    const data: GoGetResult = {
      success: false,
      packages: [
        { path: "github.com/ok/pkg", version: "v1.0.0" },
        {
          path: "github.com/nonexistent/pkg",
          error: 'no matching versions for query "latest"',
          errorType: "unknown",
        },
      ],
    };

    const compact = compactGetMap(data);

    expect(compact.success).toBe(false);
    expect(compact.packages).toHaveLength(1);
    expect(compact.packages![0].path).toBe("github.com/nonexistent/pkg");
    expect(compact.packages![0].error).toBe('no matching versions for query "latest"');
    expect(compact.packages![0].errorType).toBe("unknown");
  });

  it("omits packages when none failed", () => {
    const data: GoGetResult = {
      success: true,
      packages: [{ path: "github.com/ok/pkg", version: "v1.0.0" }],
    };

    const compact = compactGetMap(data);

    expect(compact).not.toHaveProperty("packages");
  });
});

describe("formatGetCompact — failing packages (#1022)", () => {
  it("lists per-package errors", () => {
    const text = formatGetCompact({
      success: false,
      resolvedCount: 0,
      packages: [
        {
          path: "github.com/nonexistent/pkg",
          error: "no matching versions",
          errorType: "unknown",
        },
      ],
    });
    expect(text).toContain("go get: FAIL");
    expect(text).toContain("github.com/nonexistent/pkg [unknown]: no matching versions");
  });
});

// ─── #1024: test compact passes through toolchain error ─────────────

describe("compactTestMap — error passthrough (#1024)", () => {
  it("keeps error and exitCode from a surfaced toolchain failure", () => {
    const data: GoTestResult = {
      success: false,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      error: "go: cannot find main module, but found .git/config",
      exitCode: 1,
    };

    const compact = compactTestMap(data);

    expect(compact.error).toBe("go: cannot find main module, but found .git/config");
    expect(compact.exitCode).toBe(1);
  });

  it("omits error when not set", () => {
    const data: GoTestResult = { success: true, tests: [], passed: 3, failed: 0, skipped: 0 };

    const compact = compactTestMap(data);

    expect(compact).not.toHaveProperty("error");
    expect(compact).not.toHaveProperty("exitCode");
  });
});

describe("formatTestCompact — error (#1024)", () => {
  it("shows the toolchain error", () => {
    const text = formatTestCompact({
      success: false,
      passed: 0,
      failed: 0,
      skipped: 0,
      error: "go: cannot find main module",
    });
    expect(text).toContain("FAIL: 0 passed, 0 failed, 0 skipped");
    expect(text).toContain("go: cannot find main module");
  });
});

// ─── #1022/#1024: golangci-lint compact diagnostics + error ─────────

describe("compactGolangciLintMap (#1022)", () => {
  const diag = (i: number): NonNullable<GolangciLintResult["diagnostics"]>[number] => ({
    file: `file${i}.go`,
    line: i,
    column: 2,
    linter: "govet",
    severity: "warning" as const,
    message: `issue ${i}`,
  });

  it("keeps the first N diagnostics with fix data stripped", () => {
    const diagnostics = Array.from({ length: 5 }, (_, i) => ({
      ...diag(i),
      fix: { text: "replacement" },
    }));
    const data: GolangciLintResult = { diagnostics, errors: 0, warnings: 5 };

    const compact = compactGolangciLintMap(data);

    expect(compact.diagnostics).toHaveLength(5);
    expect(compact.diagnostics![0]).not.toHaveProperty("fix");
    expect(compact.diagnostics![0].message).toBe("issue 0");
    expect(compact).not.toHaveProperty("diagnosticsOmitted");
  });

  it("caps diagnostics and reports omitted count", () => {
    const count = GOLANGCI_LINT_COMPACT_MAX_DIAGNOSTICS + 7;
    const diagnostics = Array.from({ length: count }, (_, i) => diag(i));
    const data: GolangciLintResult = { diagnostics, errors: 0, warnings: count };

    const compact = compactGolangciLintMap(data);

    expect(compact.diagnostics).toHaveLength(GOLANGCI_LINT_COMPACT_MAX_DIAGNOSTICS);
    expect(compact.diagnosticsOmitted).toBe(7);
  });

  it("passes through error and exitCode from a surfaced linter failure (#1024)", () => {
    const data: GolangciLintResult = {
      diagnostics: [],
      errors: 0,
      warnings: 0,
      error: "Can't read config: unknown linter 'bogus'",
      exitCode: 3,
    };

    const compact = compactGolangciLintMap(data);

    expect(compact.error).toBe("Can't read config: unknown linter 'bogus'");
    expect(compact.exitCode).toBe(3);
  });
});

describe("formatGolangciLintCompact (#1022)", () => {
  it("lists kept diagnostics and omitted count", () => {
    const text = formatGolangciLintCompact({
      errors: 1,
      warnings: 21,
      diagnostics: [
        {
          file: "main.go",
          line: 10,
          column: 5,
          linter: "govet",
          severity: "warning",
          message: "unreachable code",
        },
      ],
      diagnosticsOmitted: 2,
    });
    expect(text).toContain("golangci-lint: 22 issues (1 errors, 21 warnings)");
    expect(text).toContain("main.go:10:5: unreachable code (govet)");
    expect(text).toContain("... 2 more");
  });

  it("shows the linter failure error", () => {
    const text = formatGolangciLintCompact({
      errors: 0,
      warnings: 0,
      error: "Can't read config",
      exitCode: 3,
    });
    expect(text).toContain("golangci-lint: FAIL (exit code 3)");
    expect(text).toContain("Can't read config");
  });
});
