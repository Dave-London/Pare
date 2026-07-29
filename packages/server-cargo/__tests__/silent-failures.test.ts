import { describe, it, expect } from "vitest";
import {
  parseCargoBuildJson,
  parseCargoCheckJson,
  parseCargoTestOutput,
  parseCargoClippyJson,
  parseCargoAuditJson,
} from "../src/lib/parsers.js";
import {
  formatCargoBuild,
  formatCargoTest,
  formatCargoClippy,
  formatCargoAudit,
  compactBuildMap,
  compactTestMap,
  compactClippyMap,
  formatBuildCompact,
  formatTestCompact,
  formatClippyCompact,
} from "../src/lib/formatters.js";
import {
  CargoBuildResultSchema,
  CargoTestResultSchema,
  CargoClippyResultSchema,
  CargoAuditResultSchema,
} from "../src/schemas/index.js";

// Real cargo error output captured from cargo 1.79 on a directory without a project.
const MISSING_MANIFEST_STDERR =
  "error: could not find `Cargo.toml` in `/tmp/not-a-project` or any parent directory";

// Real rustup error when no toolchain is configured.
const NO_TOOLCHAIN_STDERR =
  "error: rustup could not choose a version of cargo to run, because one wasn't specified explicitly, and no default is configured.\n" +
  "help: run 'rustup default stable' to download the latest stable release of Rust and set it as your default toolchain.";

// ── Epic #1024: cargo build/check silent failures ────────────────────

describe("Epic #1024: parseCargoBuildJson silent failures", () => {
  it("surfaces stderr when build fails with no parseable diagnostics", () => {
    const result = parseCargoBuildJson("", 101, MISSING_MANIFEST_STDERR);
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.error).toContain("could not find `Cargo.toml`");
    expect(result.exitCode).toBe(101);
  });

  it("uses a fallback message when both streams are empty", () => {
    const result = parseCargoBuildJson("", 101, "");
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("101");
  });

  it("does not attach error when the build fails WITH diagnostics", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "E0308" },
        level: "error",
        message: "mismatched types",
        spans: [{ file_name: "src/main.rs", line_start: 5, column_start: 9 }],
      },
    });
    const result = parseCargoBuildJson(stdout, 101, "error: could not compile `myapp`");
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("does not attach error on a clean successful build", () => {
    const stdout = JSON.stringify({ reason: "build-finished", success: true });
    const result = parseCargoBuildJson(stdout, 0, "    Finished dev profile");
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("check parser mirrors the build guard", () => {
    const result = parseCargoCheckJson("", 101, MISSING_MANIFEST_STDERR);
    expect(result.error).toContain("could not find `Cargo.toml`");
    expect(result.exitCode).toBe(101);
  });

  it("augmented result validates against the schema", () => {
    const result = parseCargoBuildJson("", 101, MISSING_MANIFEST_STDERR);
    expect(() => CargoBuildResultSchema.parse(result)).not.toThrow();
  });

  it("full and compact formatters surface the error instead of '0 errors'", () => {
    const result = parseCargoBuildJson("", 101, MISSING_MANIFEST_STDERR);
    expect(formatCargoBuild(result)).toContain("could not find `Cargo.toml`");
    const compact = compactBuildMap(result);
    expect(compact.error).toContain("could not find `Cargo.toml`");
    expect(compact.exitCode).toBe(101);
    expect(formatBuildCompact(compact)).toContain("could not find `Cargo.toml`");
  });
});

// ── Epic #1024: cargo test silent failures ───────────────────────────

describe("Epic #1024: parseCargoTestOutput silent failures", () => {
  it("surfaces stderr when cargo test fails before running any test", () => {
    const result = parseCargoTestOutput("", 101, undefined, MISSING_MANIFEST_STDERR);
    expect(result.success).toBe(false);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.error).toContain("could not find `Cargo.toml`");
    expect(result.exitCode).toBe(101);
  });

  it("surfaces toolchain errors", () => {
    const result = parseCargoTestOutput("", 1, undefined, NO_TOOLCHAIN_STDERR);
    expect(result.error).toContain("rustup");
  });

  it("does NOT attach error when tests failed (non-zero exit is expected)", () => {
    const stdout = [
      "running 2 tests",
      "test tests::test_add ... ok",
      "test tests::test_div ... FAILED",
      "",
      "failures:",
      "",
      "---- tests::test_div stdout ----",
      "thread 'tests::test_div' panicked at 'attempt to divide by zero'",
      "",
      "failures:",
      "    tests::test_div",
      "",
      "test result: FAILED. 1 passed; 1 failed; 0 ignored",
    ].join("\n");
    const result = parseCargoTestOutput(stdout, 101, undefined, "error: test failed");
    expect(result.failed).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("does NOT attach error when compilation diagnostics were parsed", () => {
    const jsonOutput = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "E0308" },
        level: "error",
        message: "mismatched types",
        spans: [{ file_name: "src/lib.rs", line_start: 3, column_start: 1 }],
      },
    });
    const result = parseCargoTestOutput("", 101, jsonOutput, "error: could not compile");
    expect(result.compilationDiagnostics).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("does NOT attach error for zero tests with exit 0 (e.g. --no-run)", () => {
    const result = parseCargoTestOutput("", 0, undefined, "");
    expect(result.error).toBeUndefined();
  });

  it("augmented result validates against the schema", () => {
    const result = parseCargoTestOutput("", 101, undefined, MISSING_MANIFEST_STDERR);
    expect(() => CargoTestResultSchema.parse(result)).not.toThrow();
  });

  it("full and compact formatters surface the error instead of '0 passed; 0 failed'", () => {
    const result = parseCargoTestOutput("", 101, undefined, MISSING_MANIFEST_STDERR);
    expect(formatCargoTest(result)).toContain("could not find `Cargo.toml`");
    const compact = compactTestMap(result);
    expect(compact.error).toContain("could not find `Cargo.toml`");
    expect(compact.exitCode).toBe(101);
    expect(formatTestCompact(compact)).toContain("could not find `Cargo.toml`");
  });
});

// ── Epic #1024: cargo clippy silent failures ─────────────────────────

describe("Epic #1024: parseCargoClippyJson silent failures", () => {
  it("surfaces stderr when clippy fails with no diagnostics", () => {
    const stderr = "error: no such command: `clippy`\n\n\tDid you mean `flip`?";
    const result = parseCargoClippyJson("", 101, stderr);
    expect(result.success).toBe(false);
    expect(result.error).toContain("no such command");
    expect(result.exitCode).toBe(101);
  });

  it("does NOT attach error when denied lints produce diagnostics", () => {
    const stdout = JSON.stringify({
      reason: "compiler-message",
      message: {
        code: { code: "clippy::unwrap_used" },
        level: "error",
        message: "used `unwrap()` on a `Result` value",
        spans: [{ file_name: "src/main.rs", line_start: 10, column_start: 5 }],
      },
    });
    const result = parseCargoClippyJson(stdout, 101, "error: could not compile `myapp`");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("does NOT attach error on a clean run", () => {
    const result = parseCargoClippyJson("", 0, "    Finished dev profile");
    expect(result.error).toBeUndefined();
  });

  it("augmented result validates against the schema", () => {
    const result = parseCargoClippyJson("", 101, MISSING_MANIFEST_STDERR);
    expect(() => CargoClippyResultSchema.parse(result)).not.toThrow();
  });

  it("full and compact formatters surface the error instead of 'no warnings'", () => {
    const result = parseCargoClippyJson("", 101, MISSING_MANIFEST_STDERR);
    expect(formatCargoClippy(result)).not.toBe("clippy: no warnings.");
    expect(formatCargoClippy(result)).toContain("could not find `Cargo.toml`");
    const compact = compactClippyMap(result);
    expect(compact.error).toContain("could not find `Cargo.toml`");
    expect(formatClippyCompact(compact)).toContain("could not find `Cargo.toml`");
  });
});

// ── Epic #1024: cargo audit false-clean on unparseable output ────────

describe("Epic #1024: parseCargoAuditJson silent failures", () => {
  it("surfaces raw output when the report is unparseable (NOT a clean scan)", () => {
    const raw = "error: couldn't fetch advisory database: git operation failed";
    const result = parseCargoAuditJson(raw, 2);
    expect(result.success).toBe(false);
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.summary?.total).toBe(0);
    expect(result.error).toContain("couldn't fetch advisory database");
    expect(result.exitCode).toBe(2);
  });

  it("uses a fallback message when output is empty", () => {
    const result = parseCargoAuditJson("", 101);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("101");
    expect(result.error).toContain("not a clean scan");
  });

  it("truncates very long unparseable output, keeping the tail", () => {
    const raw = "x".repeat(10000) + "\nfinal error line";
    const result = parseCargoAuditJson(raw, 2);
    expect(result.error).toContain("(output truncated)");
    expect(result.error).toContain("final error line");
    expect(result.error!.length).toBeLessThan(5000);
  });

  it("does NOT attach error when vulnerabilities are found (exit 1 is a successful scan)", () => {
    const json = JSON.stringify({
      vulnerabilities: {
        found: true,
        count: 1,
        list: [
          {
            advisory: { id: "RUSTSEC-2022-0090", title: "Use-after-free", cvss: "9.8" },
            package: { name: "libsqlite3-sys", version: "0.24.2" },
            versions: { patched: [">=0.25.1"] },
          },
        ],
      },
    });
    const result = parseCargoAuditJson(json, 1);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("augmented result validates against the schema", () => {
    const result = parseCargoAuditJson("garbage output", 2);
    expect(() => CargoAuditResultSchema.parse(result)).not.toThrow();
  });

  it("full formatter reports a failed scan instead of 'no vulnerabilities found'", () => {
    const result = parseCargoAuditJson("error: not found: cargo-audit", 101);
    const output = formatCargoAudit(result);
    expect(output).not.toContain("no vulnerabilities found");
    expect(output).toContain("scan failed");
    expect(output).toContain("not found: cargo-audit");
  });
});
