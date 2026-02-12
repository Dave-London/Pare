import { describe, it, expect } from "vitest";
import {
  formatCargoBuild,
  formatCargoTest,
  formatCargoClippy,
  compactBuildMap,
  formatBuildCompact,
  compactTestMap,
  formatTestCompact,
  compactClippyMap,
  formatClippyCompact,
  compactRunMap,
  formatRunCompact,
  compactAddMap,
  formatAddCompact,
  compactRemoveMap,
  formatRemoveCompact,
  compactFmtMap,
  formatFmtCompact,
  compactDocMap,
  formatDocCompact,
} from "../src/lib/formatters.js";
import type {
  CargoBuildResult,
  CargoTestResult,
  CargoClippyResult,
  CargoRunResult,
  CargoAddResult,
  CargoRemoveResult,
  CargoFmtResult,
  CargoDocResult,
} from "../src/schemas/index.js";

describe("formatCargoBuild", () => {
  it("formats successful build with no diagnostics", () => {
    const data: CargoBuildResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatCargoBuild(data)).toBe("cargo build: success, no diagnostics.");
  });

  it("formats successful build with warnings", () => {
    const data: CargoBuildResult = {
      success: true,
      diagnostics: [
        {
          file: "src/main.rs",
          line: 5,
          column: 9,
          severity: "warning",
          code: "unused_variables",
          message: "unused variable: `x`",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
    };
    const output = formatCargoBuild(data);
    expect(output).toContain("cargo build: success (0 errors, 1 warnings)");
    expect(output).toContain("src/main.rs:5:9 warning [unused_variables]: unused variable: `x`");
  });

  it("formats failed build with errors", () => {
    const data: CargoBuildResult = {
      success: false,
      diagnostics: [
        {
          file: "src/lib.rs",
          line: 10,
          column: 1,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
        },
        {
          file: "src/lib.rs",
          line: 20,
          column: 5,
          severity: "error",
          message: "cannot find value `foo`",
        },
      ],
      total: 2,
      errors: 2,
      warnings: 0,
    };
    const output = formatCargoBuild(data);
    expect(output).toContain("cargo build: failed (2 errors, 0 warnings)");
    expect(output).toContain("src/lib.rs:10:1 error [E0308]: mismatched types");
    expect(output).toContain("src/lib.rs:20:5 error: cannot find value `foo`");
  });
});

describe("formatCargoTest", () => {
  it("formats passing test results", () => {
    const data: CargoTestResult = {
      success: true,
      tests: [
        { name: "test_add", status: "ok" },
        { name: "test_sub", status: "ok" },
        { name: "test_slow", status: "ignored" },
      ],
      total: 3,
      passed: 2,
      failed: 0,
      ignored: 1,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: ok. 2 passed; 0 failed; 1 ignored");
    expect(output).toContain("ok      test_add");
    expect(output).toContain("ok      test_sub");
    expect(output).toContain("ignored test_slow");
  });

  it("formats failing test results", () => {
    const data: CargoTestResult = {
      success: false,
      tests: [
        { name: "test_valid", status: "ok" },
        { name: "test_broken", status: "FAILED" },
      ],
      total: 2,
      passed: 1,
      failed: 1,
      ignored: 0,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: FAILED. 1 passed; 1 failed; 0 ignored");
    expect(output).toContain("ok      test_valid");
    expect(output).toContain("FAILED  test_broken");
  });

  it("formats empty test suite", () => {
    const data: CargoTestResult = {
      success: true,
      tests: [],
      total: 0,
      passed: 0,
      failed: 0,
      ignored: 0,
    };
    const output = formatCargoTest(data);
    expect(output).toContain("test result: ok. 0 passed; 0 failed; 0 ignored");
  });
});

describe("formatCargoClippy", () => {
  it("formats clean clippy result", () => {
    const data: CargoClippyResult = {
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatCargoClippy(data)).toBe("clippy: no warnings.");
  });

  it("formats clippy result with warnings", () => {
    const data: CargoClippyResult = {
      diagnostics: [
        {
          file: "src/main.rs",
          line: 15,
          column: 5,
          severity: "warning",
          code: "clippy::needless_return",
          message: "unneeded `return` statement",
        },
        {
          file: "src/lib.rs",
          line: 8,
          column: 1,
          severity: "warning",
          code: "clippy::unused_imports",
          message: "unused import: `std::io`",
        },
      ],
      total: 2,
      errors: 0,
      warnings: 2,
    };
    const output = formatCargoClippy(data);
    expect(output).toContain("clippy: 0 errors, 2 warnings");
    expect(output).toContain(
      "src/main.rs:15:5 warning [clippy::needless_return]: unneeded `return` statement",
    );
    expect(output).toContain(
      "src/lib.rs:8:1 warning [clippy::unused_imports]: unused import: `std::io`",
    );
  });
});

// ── Compact mapper tests ─────────────────────────────────────────────

describe("compactBuildMap", () => {
  it("strips diagnostics array and keeps counts", () => {
    const data: CargoBuildResult = {
      success: false,
      diagnostics: [
        {
          file: "src/lib.rs",
          line: 10,
          column: 1,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
        },
        {
          file: "src/lib.rs",
          line: 20,
          column: 5,
          severity: "warning",
          message: "unused variable",
        },
      ],
      total: 2,
      errors: 1,
      warnings: 1,
    };
    const compact = compactBuildMap(data);
    expect(compact).toEqual({ success: false, diagnostics: [], errors: 1, warnings: 1, total: 2 });
    expect(compact.diagnostics).toEqual([]);
  });

  it("formats compact build output", () => {
    expect(formatBuildCompact({ success: true, errors: 0, warnings: 3, total: 3 })).toBe(
      "cargo build: success (0 errors, 3 warnings)",
    );
    expect(formatBuildCompact({ success: false, errors: 2, warnings: 0, total: 2 })).toBe(
      "cargo build: failed (2 errors, 0 warnings)",
    );
  });
});

describe("compactTestMap", () => {
  it("strips individual tests and keeps summary counts", () => {
    const data: CargoTestResult = {
      success: true,
      tests: [
        { name: "test_a", status: "ok" },
        { name: "test_b", status: "FAILED" },
        { name: "test_c", status: "ignored" },
      ],
      total: 3,
      passed: 1,
      failed: 1,
      ignored: 1,
    };
    const compact = compactTestMap(data);
    expect(compact).toEqual({
      success: true,
      tests: [],
      total: 3,
      passed: 1,
      failed: 1,
      ignored: 1,
    });
    expect(compact.tests).toEqual([]);
  });

  it("formats compact test output", () => {
    expect(formatTestCompact({ success: true, total: 5, passed: 5, failed: 0, ignored: 0 })).toBe(
      "test result: ok. 5 passed; 0 failed; 0 ignored",
    );
    expect(formatTestCompact({ success: false, total: 3, passed: 1, failed: 2, ignored: 0 })).toBe(
      "test result: FAILED. 1 passed; 2 failed; 0 ignored",
    );
  });
});

describe("compactClippyMap", () => {
  it("strips diagnostics and keeps counts", () => {
    const data: CargoClippyResult = {
      diagnostics: [
        {
          file: "src/main.rs",
          line: 1,
          column: 1,
          severity: "warning",
          code: "clippy::test",
          message: "msg",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
    };
    const compact = compactClippyMap(data);
    expect(compact).toEqual({ diagnostics: [], errors: 0, warnings: 1, total: 1 });
    expect(compact.diagnostics).toEqual([]);
  });

  it("formats compact clippy output", () => {
    expect(formatClippyCompact({ errors: 0, warnings: 0, total: 0 })).toBe("clippy: no warnings.");
    expect(formatClippyCompact({ errors: 1, warnings: 3, total: 4 })).toBe(
      "clippy: 1 errors, 3 warnings",
    );
  });
});

describe("compactRunMap", () => {
  it("strips stdout/stderr and keeps exit code", () => {
    const data: CargoRunResult = {
      exitCode: 0,
      stdout: "Hello, world!\nLine 2\nLine 3",
      stderr: "some warnings here",
      success: true,
    };
    const compact = compactRunMap(data);
    expect(compact).toEqual({ exitCode: 0, success: true });
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });

  it("formats compact run output", () => {
    expect(formatRunCompact({ exitCode: 0, success: true })).toBe(
      "cargo run: success (exit code 0)",
    );
    expect(formatRunCompact({ exitCode: 1, success: false })).toBe(
      "cargo run: failed (exit code 1)",
    );
  });
});

describe("compactAddMap", () => {
  it("strips version details and keeps package names", () => {
    const data: CargoAddResult = {
      success: true,
      added: [
        { name: "serde", version: "1.0.217" },
        { name: "tokio", version: "1.42.0" },
      ],
      total: 2,
    };
    const compact = compactAddMap(data);
    expect(compact).toEqual({ success: true, packages: ["serde", "tokio"], total: 2 });
    expect(compact).not.toHaveProperty("added");
  });

  it("formats compact add output", () => {
    expect(formatAddCompact({ success: true, packages: ["serde", "tokio"], total: 2 })).toBe(
      "cargo add: 2 package(s) added: serde, tokio",
    );
    expect(formatAddCompact({ success: true, packages: [], total: 0 })).toBe(
      "cargo add: success, no packages added.",
    );
    expect(formatAddCompact({ success: false, packages: [], total: 0 })).toBe("cargo add: failed");
  });
});

describe("compactRemoveMap", () => {
  it("keeps removed names as-is", () => {
    const data: CargoRemoveResult = {
      success: true,
      removed: ["serde", "tokio"],
      total: 2,
    };
    const compact = compactRemoveMap(data);
    expect(compact).toEqual({ success: true, removed: ["serde", "tokio"], total: 2 });
  });

  it("formats compact remove output", () => {
    expect(formatRemoveCompact({ success: true, removed: ["serde"], total: 1 })).toBe(
      "cargo remove: 1 package(s) removed: serde",
    );
    expect(formatRemoveCompact({ success: true, removed: [], total: 0 })).toBe(
      "cargo remove: success, no packages removed.",
    );
    expect(formatRemoveCompact({ success: false, removed: [], total: 0 })).toBe(
      "cargo remove: failed",
    );
  });
});

describe("compactFmtMap", () => {
  it("strips file list and keeps count", () => {
    const data: CargoFmtResult = {
      success: false,
      filesChanged: 2,
      files: ["src/main.rs", "src/lib.rs"],
    };
    const compact = compactFmtMap(data);
    expect(compact).toEqual({ success: false, filesChanged: 2 });
    expect(compact).not.toHaveProperty("files");
  });

  it("formats compact fmt output", () => {
    expect(formatFmtCompact({ success: true, filesChanged: 0 })).toBe(
      "cargo fmt: all files formatted.",
    );
    expect(formatFmtCompact({ success: false, filesChanged: 3 })).toBe(
      "cargo fmt: needs formatting (3 file(s))",
    );
    expect(formatFmtCompact({ success: true, filesChanged: 1 })).toBe(
      "cargo fmt: success (1 file(s))",
    );
  });
});

describe("compactDocMap", () => {
  it("keeps success and warnings", () => {
    const data: CargoDocResult = { success: true, warnings: 5 };
    const compact = compactDocMap(data);
    expect(compact).toEqual({ success: true, warnings: 5 });
  });

  it("formats compact doc output", () => {
    expect(formatDocCompact({ success: true, warnings: 0 })).toBe("cargo doc: success.");
    expect(formatDocCompact({ success: false, warnings: 3 })).toBe(
      "cargo doc: failed (3 warning(s))",
    );
  });
});
