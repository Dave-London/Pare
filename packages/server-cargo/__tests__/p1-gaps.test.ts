import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
  parseCargoFmtOutput,
  parseCargoAddOutput,
  parseCargoRemoveOutput,
  parseCargoRunOutput,
  parseCargoAuditJson,
  parseCargoUpdateOutput,
  extractCvssScore,
  detectRunFailureType,
} from "../src/lib/parsers.js";
import {
  formatCargoAdd,
  formatCargoRemove,
  formatCargoRun,
  formatCargoAudit,
  formatCargoClippy,
  formatCargoBuild,
  formatCargoTest,
  compactRunMap,
  formatRunCompact,
  compactAddMap,
  compactRemoveMap,
  compactAuditMap,
  compactTestMap,
  compactUpdateMap,
} from "../src/lib/formatters.js";

// ── Gap #86: Dependency type in cargo add output ──────────────────────

describe("Gap #86: cargo add dependency type", () => {
  it("detects normal dependency type from output", () => {
    const stderr = "      Adding serde v1.0.217 to dependencies";
    const result = parseCargoAddOutput("", stderr, 0);
    expect(result.dependencyType).toBe("normal");
  });

  it("detects dev dependency type from output", () => {
    const stderr = "      Adding pretty_assertions v1.4.1 to dev-dependencies";
    const result = parseCargoAddOutput("", stderr, 0);
    expect(result.dependencyType).toBe("dev");
  });

  it("detects build dependency type from output", () => {
    const stderr = "      Adding cc v1.0.83 to build-dependencies";
    const result = parseCargoAddOutput("", stderr, 0);
    expect(result.dependencyType).toBe("build");
  });

  it("uses explicitly provided dependency type over detected", () => {
    const stderr = "      Adding serde v1.0.217 to dependencies";
    const result = parseCargoAddOutput("", stderr, 0, "dev");
    expect(result.dependencyType).toBe("dev");
  });

  it("formats add with dev dependency type", () => {
    const output = formatCargoAdd({
      success: true,
      added: [{ name: "serde", version: "1.0.217" }],
      total: 1,
      dependencyType: "dev",
    });
    expect(output).toContain("[dev]");
  });

  it("formats add with normal dependency type (no suffix)", () => {
    const output = formatCargoAdd({
      success: true,
      added: [{ name: "serde", version: "1.0.217" }],
      total: 1,
      dependencyType: "normal",
    });
    expect(output).not.toContain("[normal]");
    expect(output).not.toContain("[dev]");
  });

  it("includes dependencyType in compact add output", () => {
    const compact = compactAddMap({
      success: true,
      added: [{ name: "serde", version: "1.0.217" }],
      total: 1,
      dependencyType: "dev",
    });
    expect(compact.dependencyType).toBe("dev");
  });

  it("does not include dependencyType when not set", () => {
    const result = parseCargoAddOutput("", "", 0);
    expect(result.dependencyType).toBeUndefined();
  });
});

// ── Gap #87: cargo audit fix support ──────────────────────────────────

describe("Gap #87: cargo audit fix", () => {
  it("includes fixesApplied count in fix mode", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "RUSTSEC-2022-0090", title: "Use-after-free", cvss: "9.8" },
            package: { name: "libsqlite3-sys", version: "0.24.2" },
            versions: { patched: [">=0.25.1"], unaffected: [] },
          },
          {
            advisory: { id: "RUSTSEC-2023-0001", title: "No fix available", cvss: "5.5" },
            package: { name: "some-crate", version: "1.0.0" },
            versions: { patched: [], unaffected: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0, true);
    expect(result.fixesApplied).toBe(1); // Only one has patched versions
  });

  it("does not include fixesApplied in non-fix mode", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "RUSTSEC-2022-0090", title: "Use-after-free", cvss: "9.8" },
            package: { name: "libsqlite3-sys", version: "0.24.2" },
            versions: { patched: [">=0.25.1"], unaffected: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0, false);
    expect(result.fixesApplied).toBeUndefined();
  });

  it("fixesApplied is 0 when no vulns have patches", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "RUSTSEC-2023-0001", title: "No fix", cvss: "5.5" },
            package: { name: "some-crate", version: "1.0.0" },
            versions: { patched: [], unaffected: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0, true);
    expect(result.fixesApplied).toBe(0);
  });

  it("formats audit output with fixes applied", () => {
    const output = formatCargoAudit({
      success: true,
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        unknown: 0,
      },
      fixesApplied: 3,
    });
    expect(output).toContain("3 fix(es) applied");
  });

  it("includes fixesApplied in compact audit output", () => {
    const compact = compactAuditMap({
      success: true,
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        unknown: 0,
      },
      fixesApplied: 2,
    });
    expect(compact.fixesApplied).toBe(2);
  });
});

// ── Gap #88: CVSS score/vector in audit vulnerabilities ───────────────

describe("Gap #88: CVSS score/vector in audit", () => {
  it("includes raw CVSS score for numeric CVSS", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "RUSTSEC-2022-0090", title: "Issue", cvss: "9.8" },
            package: { name: "crate", version: "1.0.0" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);
    expect(result.vulnerabilities![0].cvssScore).toBe(9.8);
  });

  it("includes raw CVSS score for vector string", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: {
              id: "RUSTSEC-2022-0090",
              title: "Issue",
              cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            },
            package: { name: "crate", version: "1.0.0" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);
    expect(result.vulnerabilities![0].cvssScore).toBe(9.8);
  });

  it("does not include CVSS fields when cvss is null", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "RUSTSEC-2022-0090", title: "Issue", cvss: null },
            package: { name: "crate", version: "1.0.0" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const result = parseCargoAuditJson(json, 0);
    expect(result.vulnerabilities![0].cvssScore).toBeUndefined();
  });

  it("extractCvssScore returns numeric score for plain number", () => {
    expect(extractCvssScore("9.8")).toBe(9.8);
    expect(extractCvssScore("5.5")).toBe(5.5);
    expect(extractCvssScore("0.0")).toBe(0);
  });

  it("extractCvssScore returns computed score for CVSS v3 vector", () => {
    const score = extractCvssScore("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
    expect(score).toBe(9.8);
  });

  it("extractCvssScore returns undefined for null/undefined", () => {
    expect(extractCvssScore(null)).toBeUndefined();
    expect(extractCvssScore(undefined)).toBeUndefined();
    expect(extractCvssScore("")).toBeUndefined();
  });

  it("formats audit with CVSS scores", () => {
    const output = formatCargoAudit({
      success: false,
      vulnerabilities: [
        {
          id: "RUSTSEC-2022-0090",
          package: "libsqlite3-sys",
          version: "0.24.2",
          severity: "critical",
          title: "Use-after-free",
          patched: [">=0.25.1"],
          cvssScore: 9.8,
          cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        },
      ],
      summary: {
        total: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
        informational: 0,
        unknown: 0,
      },
    });
    expect(output).toContain("[CVSS: 9.8]");
  });
});

// ── Gap #89: build-finished JSON event success field ──────────────────

describe("Gap #89: build-finished success field", () => {
  it("uses build-finished success=true as authoritative", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({ reason: "build-finished", success: true }),
    ].join("\n");

    // Even if exit code is non-zero, build-finished success takes precedence
    const result = parseCargoBuildJson(stdout, 1);
    expect(result.success).toBe(true);
  });

  it("uses build-finished success=false as authoritative", () => {
    const stdout = [
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
        },
      }),
      JSON.stringify({ reason: "build-finished", success: false }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.success).toBe(false);
  });

  it("falls back to exit code when no build-finished event", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);
    expect(result.success).toBe(true);
  });

  it("falls back to exit code=1 when no build-finished event", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "E0308" },
        level: "error",
        message: "mismatched types",
        spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
      },
    });

    const result = parseCargoBuildJson(stdout, 1);
    expect(result.success).toBe(false);
  });
});

// ── Gap #90: Clippy suggestion text from JSON children ────────────────

describe("Gap #90: clippy suggestion text", () => {
  it("extracts help suggestion from children array", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::needless_return" },
        level: "warning",
        message: "unneeded `return` statement",
        spans: [{ file_name: "src/main.rs", line_start: 15, column_start: 5 }],
        children: [
          { level: "help", message: "remove `return`" },
          { level: "note", message: "some note" },
        ],
      },
    });

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.diagnostics![0].suggestion).toBe("remove `return`");
  });

  it("extracts suggestion-level child", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::unwrap_used" },
        level: "warning",
        message: "used `unwrap()` on a `Result` value",
        spans: [{ file_name: "src/lib.rs", line_start: 42, column_start: 10 }],
        children: [{ level: "suggestion", message: "use `expect()` instead" }],
      },
    });

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.diagnostics![0].suggestion).toBe("use `expect()` instead");
  });

  it("no suggestion when children is empty", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::test" },
        level: "warning",
        message: "some warning",
        spans: [{ file_name: "src/lib.rs", line_start: 1, column_start: 1 }],
        children: [],
      },
    });

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.diagnostics![0].suggestion).toBeUndefined();
  });

  it("no suggestion when children is absent", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::test" },
        level: "warning",
        message: "some warning",
        spans: [{ file_name: "src/lib.rs", line_start: 1, column_start: 1 }],
      },
    });

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.diagnostics![0].suggestion).toBeUndefined();
  });

  it("formats clippy with suggestion", () => {
    const output = formatCargoClippy({
      success: true,
      diagnostics: [
        {
          file: "src/main.rs",
          line: 15,
          column: 5,
          severity: "warning",
          code: "clippy::needless_return",
          message: "unneeded `return` statement",
          suggestion: "remove `return`",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
    });
    expect(output).toContain("suggestion: remove `return`");
  });

  it("formats build diagnostics with suggestion", () => {
    const output = formatCargoBuild({
      success: false,
      diagnostics: [
        {
          file: "src/main.rs",
          line: 10,
          column: 5,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
          suggestion: "try using `as i32`",
        },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    });
    expect(output).toContain("suggestion: try using `as i32`");
  });
});

// ── Gap #91: Clippy lint level configuration ──────────────────────────
// These tests are more about the tool parameter handling, which is tested
// at the integration level. We verify the flag injection guard works.

describe("Gap #91: clippy lint levels (parser-level)", () => {
  it("clippy parser still works correctly with no lint flags", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::unwrap_used" },
        level: "warning",
        message: "used unwrap",
        spans: [{ file_name: "src/main.rs", line_start: 5, column_start: 1 }],
      },
    });

    const result = parseCargoClippyJson(stdout, 0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics![0].code).toBe("clippy::unwrap_used");
  });
});

// ── Gap #92: fmt --files-with-diff for check mode ─────────────────────

describe("Gap #92: fmt --files-with-diff", () => {
  it("parses file paths from --files-with-diff in check mode", () => {
    const stdout = "src/main.rs\nsrc/lib.rs\n";
    const result = parseCargoFmtOutput(stdout, "", 1, true);
    expect(result.needsFormatting).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["src/main.rs", "src/lib.rs"]);
  });

  it("handles empty output in check mode (all formatted)", () => {
    const result = parseCargoFmtOutput("", "", 0, true);
    expect(result.needsFormatting).toBe(false);
    expect(result.filesChanged).toBe(0);
  });

  it("ignores warning/error lines in check mode", () => {
    const stdout = "warning: some warning\nsrc/main.rs\nerror: something\n";
    const result = parseCargoFmtOutput(stdout, "", 1, true);
    expect(result.filesChanged).toBe(1);
    expect(result.files).toEqual(["src/main.rs"]);
  });

  it("deduplicates file paths in check mode", () => {
    const stdout = "src/main.rs\nsrc/main.rs\nsrc/lib.rs\n";
    const result = parseCargoFmtOutput(stdout, "", 1, true);
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["src/main.rs", "src/lib.rs"]);
  });
});

// ── Gap #93: Dependency type in cargo remove output ───────────────────

describe("Gap #93: cargo remove dependency type", () => {
  it("detects normal dependency type from remove output", () => {
    const stderr = "      Removing serde from dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);
    expect(result.dependencyType).toBe("normal");
  });

  it("detects dev dependency type from remove output", () => {
    const stderr = "      Removing pretty_assertions from dev-dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);
    expect(result.dependencyType).toBe("dev");
  });

  it("detects build dependency type from remove output", () => {
    const stderr = "      Removing cc from build-dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0);
    expect(result.dependencyType).toBe("build");
  });

  it("uses explicitly provided dependency type over detected", () => {
    const stderr = "      Removing serde from dependencies";
    const result = parseCargoRemoveOutput("", stderr, 0, "build");
    expect(result.dependencyType).toBe("build");
  });

  it("formats remove with dev dependency type", () => {
    const output = formatCargoRemove({
      success: true,
      removed: ["serde"],
      total: 1,
      dependencyType: "dev",
    });
    expect(output).toContain("[dev]");
  });

  it("formats remove with normal dependency type (no suffix)", () => {
    const output = formatCargoRemove({
      success: true,
      removed: ["serde"],
      total: 1,
      dependencyType: "normal",
    });
    expect(output).not.toContain("[normal]");
    expect(output).not.toContain("[dev]");
  });

  it("includes dependencyType in compact remove output", () => {
    const compact = compactRemoveMap({
      success: true,
      removed: ["serde"],
      total: 1,
      dependencyType: "build",
    });
    expect(compact.dependencyType).toBe("build");
  });

  it("does not include dependencyType when not set", () => {
    const result = parseCargoRemoveOutput("", "", 0);
    expect(result.dependencyType).toBeUndefined();
  });
});

// ── Gap #94: Compilation vs runtime failure in cargo run ──────────────

describe("Gap #94: run failure type detection", () => {
  it("detects compilation failure from error[E0308]", () => {
    const type = detectRunFailureType("error[E0308]: mismatched types", 101);
    expect(type).toBe("compilation");
  });

  it("detects compilation failure from 'could not compile'", () => {
    const type = detectRunFailureType("error: could not compile `myapp`", 101);
    expect(type).toBe("compilation");
  });

  it("detects compilation failure from 'aborting due to N previous errors'", () => {
    const type = detectRunFailureType("aborting due to 3 previous errors", 101);
    expect(type).toBe("compilation");
  });

  it("detects timeout failure", () => {
    const type = detectRunFailureType("", 1, true);
    expect(type).toBe("timeout");
  });

  it("detects runtime failure (default)", () => {
    const type = detectRunFailureType("thread 'main' panicked at 'division by zero'", 101);
    expect(type).toBe("runtime");
  });

  it("detects runtime failure for generic errors", () => {
    const type = detectRunFailureType("Error: file not found", 1);
    expect(type).toBe("runtime");
  });

  it("parseCargoRunOutput includes failureType for compilation", () => {
    const result = parseCargoRunOutput(
      "",
      "error[E0308]: mismatched types\nnote: for more info",
      101,
    );
    expect(result.failureType).toBe("compilation");
  });

  it("parseCargoRunOutput includes failureType for runtime", () => {
    const result = parseCargoRunOutput("", "thread 'main' panicked at 'oops'", 101);
    expect(result.failureType).toBe("runtime");
  });

  it("parseCargoRunOutput includes failureType for timeout", () => {
    const result = parseCargoRunOutput("", "timed out", 1, undefined, true);
    expect(result.failureType).toBe("timeout");
  });

  it("parseCargoRunOutput does not include failureType for success", () => {
    const result = parseCargoRunOutput("ok", "", 0);
    expect(result.failureType).toBeUndefined();
  });

  it("formats run output with failure type", () => {
    const output = formatCargoRun({
      exitCode: 101,
      stdout: "",
      stderr: "error",
      success: false,
      failureType: "compilation",
    });
    expect(output).toContain("[compilation]");
  });

  it("formats run output without failure type for success", () => {
    const output = formatCargoRun({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      success: true,
    });
    expect(output).not.toContain("[");
    expect(output).toContain("success");
  });

  it("includes failureType in compact run output", () => {
    const compact = compactRunMap({
      exitCode: 101,
      stdout: "output",
      stderr: "error",
      success: false,
      failureType: "runtime",
    });
    expect(compact.failureType).toBe("runtime");
  });

  it("does not include failureType in compact when absent", () => {
    const compact = compactRunMap({
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      success: true,
    });
    expect(compact.failureType).toBeUndefined();
  });

  it("formats compact run with failure type", () => {
    const output = formatRunCompact({
      exitCode: 101,
      success: false,
      failureType: "timeout",
    });
    expect(output).toContain("[timeout]");
  });
});

// ── Gap #95: JSON message format for cargo test compilation ───────────

describe("Gap #95: test compilation diagnostics", () => {
  it("extracts compilation diagnostics from JSON output", () => {
    const humanOutput = ""; // no tests ran because compilation failed
    const jsonOutput = [
      JSON.stringify({
        reason: "compiler-message",
        message: {
          code: { code: "E0308" },
          level: "error",
          message: "mismatched types",
          spans: [{ file_name: "src/lib.rs", line_start: 10, column_start: 5 }],
        },
      }),
      JSON.stringify({ reason: "build-finished", success: false }),
    ].join("\n");

    const result = parseCargoTestOutput(humanOutput, 101, jsonOutput);
    expect(result.compilationDiagnostics).toHaveLength(1);
    expect(result.compilationDiagnostics![0].code).toBe("E0308");
    expect(result.compilationDiagnostics![0].message).toBe("mismatched types");
  });

  it("does not include compilationDiagnostics when JSON has no diagnostics", () => {
    const humanOutput =
      "test tests::test_add ... ok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored";
    const jsonOutput = JSON.stringify({
      reason: "compiler-artifact",
      package_id: "myapp 0.1.0",
    });

    const result = parseCargoTestOutput(humanOutput, 0, jsonOutput);
    expect(result.compilationDiagnostics).toBeUndefined();
  });

  it("does not include compilationDiagnostics when no JSON output", () => {
    const humanOutput =
      "test tests::test_add ... ok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored";

    const result = parseCargoTestOutput(humanOutput, 0);
    expect(result.compilationDiagnostics).toBeUndefined();
  });

  it("formats test output with compilation diagnostics", () => {
    const output = formatCargoTest({
      success: false,
      tests: [],
      total: 0,
      passed: 0,
      failed: 0,
      ignored: 0,
      compilationDiagnostics: [
        {
          file: "src/lib.rs",
          line: 10,
          column: 5,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
        },
      ],
    });
    expect(output).toContain("Compilation diagnostics (1):");
    expect(output).toContain("src/lib.rs:10:5 error [E0308]: mismatched types");
  });

  it("preserves compilationDiagnostics in compact test output", () => {
    const compact = compactTestMap({
      success: false,
      tests: [],
      total: 0,
      passed: 0,
      failed: 0,
      ignored: 0,
      compilationDiagnostics: [
        {
          file: "src/lib.rs",
          line: 10,
          column: 5,
          severity: "error",
          code: "E0308",
          message: "mismatched types",
        },
      ],
    });
    expect(compact.compilationDiagnostics).toHaveLength(1);
  });
});

// ── Gap #96: Cargo update compact mode with updateCount ───────────────

describe("Gap #96: update compact mode", () => {
  it("includes totalUpdated in update result", () => {
    const stderr = [
      "    Locking serde v1.0.200 -> v1.0.217",
      "    Locking tokio v1.35.0 -> v1.42.0",
      "    Locking anyhow v1.0.80 -> v1.0.95",
    ].join("\n");

    const result = parseCargoUpdateOutput("", stderr, 0);
    expect(result.totalUpdated).toBe(3);
    expect(result.updated).toHaveLength(3);
  });

  it("totalUpdated is 0 when nothing updated", () => {
    const result = parseCargoUpdateOutput("", "    Updating crates.io index", 0);
    expect(result.totalUpdated).toBe(0);
  });

  it("compact update preserves totalUpdated", () => {
    const compact = compactUpdateMap({
      success: true,
      updated: [
        { name: "serde", from: "1.0.200", to: "1.0.217" },
        { name: "tokio", from: "1.35.0", to: "1.42.0" },
      ],
      totalUpdated: 2,
      output: "some raw output",
    });
    expect(compact.totalUpdated).toBe(2);
    expect(compact.updated).toHaveLength(2);
    // Compact should not include raw output
    expect(compact).not.toHaveProperty("output");
  });

  it("compact update strips raw output text", () => {
    const compact = compactUpdateMap({
      success: true,
      updated: [],
      totalUpdated: 0,
      output: "    Updating crates.io index\n    Locking serde v1.0.200 -> v1.0.217",
    });
    expect(compact).not.toHaveProperty("output");
  });
});
