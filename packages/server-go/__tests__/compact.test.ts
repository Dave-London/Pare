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
  it("keeps exitCode and success, drops stdout/stderr", () => {
    const data: GoRunResult = {
      exitCode: 0,
      stdout: "Hello, World!\nLine 2",
      stderr: "",
      success: true,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(0);
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("preserves non-zero exit code", () => {
    const data: GoRunResult = {
      exitCode: 2,
      stdout: "",
      stderr: "panic: runtime error",
      success: false,
    };

    const compact = compactRunMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.success).toBe(false);
  });
});

describe("formatRunCompact", () => {
  it("formats successful run", () => {
    expect(formatRunCompact({ exitCode: 0, success: true })).toBe("go run: success.");
  });

  it("formats failed run with exit code", () => {
    expect(formatRunCompact({ exitCode: 2, success: false })).toBe("go run: exit code 2.");
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
import { compactEnvMap } from "../src/lib/formatters.js";

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

// ─── Gap #151: fmt compact with parse error count ───────────────────
import { compactFmtMap, formatFmtCompact } from "../src/lib/formatters.js";

describe("compactFmtMap — parseErrorCount (Gap #151)", () => {
  it("includes parseErrorCount when parse errors present", () => {
    const data: GoFmtResult = {
      success: false,
      filesChanged: 1,
      files: ["main.go"],
      parseErrors: [{ file: "broken.go", line: 5, column: 1, message: "syntax error" }],
    };

    const compact = compactFmtMap(data);

    expect(compact.parseErrorCount).toBe(1);
  });

  it("does not include parseErrorCount when no parse errors", () => {
    const data: GoFmtResult = {
      success: true,
      filesChanged: 0,
      files: [],
    };

    const compact = compactFmtMap(data);

    expect(compact).not.toHaveProperty("parseErrorCount");
  });
});

describe("formatFmtCompact — parseErrorCount (Gap #151)", () => {
  it("includes parse error count in compact format", () => {
    expect(formatFmtCompact({ success: false, filesChanged: 2, parseErrorCount: 3 })).toBe(
      "gofmt: 2 files, 3 parse errors",
    );
  });
});

// ─── Gap #152: generate compact with directiveCount ─────────────────
import {
  compactGenerateMap,
  compactModTidyMap,
  formatModTidyCompact,
} from "../src/lib/formatters.js";

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
