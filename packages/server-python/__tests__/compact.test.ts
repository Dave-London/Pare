import { describe, it, expect } from "vitest";
import {
  compactPytestMap,
  formatPytestCompact,
  compactMypyMap,
  formatMypyCompact,
  compactRuffMap,
  formatRuffCompact,
  compactBlackMap,
  formatBlackCompact,
  compactPipInstallMap,
  formatPipInstallCompact,
  compactPipAuditMap,
  formatPipAuditCompact,
  compactUvInstallMap,
  formatUvInstallCompact,
  compactUvRunMap,
  formatUvRunCompact,
  compactPipListMap,
  formatPipListCompact,
  compactPipShowMap,
  formatPipShowCompact,
  compactRuffFormatMap,
  formatRuffFormatCompact,
} from "../src/lib/formatters.js";
import type {
  PytestResult,
  MypyResult,
  RuffResult,
  BlackResult,
  PipInstall,
  PipAuditResult,
  UvInstall,
  UvRun,
  PipList,
  PipShow,
  RuffFormatResult,
} from "../src/schemas/index.js";

// ── Pytest compact ────────────────────────────────────────────────────

describe("compactPytestMap", () => {
  it("keeps counts and duration, replaces failures with test names only", () => {
    const data: PytestResult = {
      success: false,
      passed: 8,
      failed: 2,
      errors: 1,
      skipped: 1,
      warnings: 0,
      failures: [
        { test: "test_auth_login", message: "assert 200 == 401\n+  where 200 = response.status" },
        { test: "test_auth_logout", message: "KeyError: 'session'" },
      ],
    };

    const compact = compactPytestMap(data);

    expect(compact.success).toBe(false);
    expect(compact.passed).toBe(8);
    expect(compact.failed).toBe(2);
    expect(compact.errors).toBe(1);
    expect(compact.skipped).toBe(1);
    expect(compact.warnings).toBe(0);
    expect(compact.failedTests).toEqual(["test_auth_login", "test_auth_logout"]);
    // Verify failure messages are dropped
    expect(compact).not.toHaveProperty("failures");
  });

  it("returns empty failedTests when no failures", () => {
    const data: PytestResult = {
      success: true,
      passed: 10,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failures: [],
    };

    const compact = compactPytestMap(data);
    expect(compact.failedTests).toEqual([]);
    expect(compact).not.toHaveProperty("exitCode");
    expect(compact).not.toHaveProperty("errorOutput");
  });

  it("keeps exitCode and errorOutput diagnostics on failed empty runs", () => {
    const data: PytestResult = {
      success: false,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failures: [],
      exitCode: 2,
      errorOutput: "ModuleNotFoundError: No module named 'mypkg'",
    };

    const compact = compactPytestMap(data);

    expect(compact.exitCode).toBe(2);
    expect(compact.errorOutput).toBe("ModuleNotFoundError: No module named 'mypkg'");
  });
});

describe("formatPytestCompact", () => {
  it("formats compact pytest with failed test names", () => {
    const compact = {
      success: false,
      passed: 8,
      failed: 2,
      errors: 0,
      skipped: 1,
      warnings: 0,
      failedTests: ["test_auth_login", "test_auth_logout"],
    };
    const output = formatPytestCompact(compact);

    expect(output).toContain("8 passed, 2 failed, 1 skipped");
    expect(output).toContain("FAILED test_auth_login");
    expect(output).toContain("FAILED test_auth_logout");
  });

  it("formats no tests collected", () => {
    const compact = {
      success: true,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failedTests: [],
    };
    expect(formatPytestCompact(compact)).toBe("pytest: no tests collected.");
  });

  it("formats failed empty run with exit code and diagnostics", () => {
    const compact = {
      success: false,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,
      failedTests: [],
      exitCode: 2,
      errorOutput: "ModuleNotFoundError: No module named 'mypkg'",
    };
    const output = formatPytestCompact(compact);

    expect(output).toContain("run failed with no test results (exit code 2)");
    expect(output).toContain("ModuleNotFoundError: No module named 'mypkg'");
  });
});

// ── Mypy compact ──────────────────────────────────────────────────────

describe("compactMypyMap", () => {
  it("keeps severity counts and first-N diagnostics", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [
        {
          file: "src/main.py",
          line: 10,
          column: 5,
          severity: "error",
          message: "Incompatible return value type",
          code: "return-value",
        },
        {
          file: "src/utils.py",
          line: 3,
          severity: "note",
          message: "Revealed type is 'builtins.str'",
        },
      ],
    };

    const compact = compactMypyMap(data);

    expect(compact.success).toBe(false);
    expect(compact.errorCount).toBe(1);
    expect(compact.warningCount).toBe(0);
    expect(compact.diagnostics).toEqual([
      {
        file: "src/main.py",
        line: 10,
        severity: "error",
        message: "Incompatible return value type",
        code: "return-value",
      },
      {
        file: "src/utils.py",
        line: 3,
        severity: "note",
        message: "Revealed type is 'builtins.str'",
      },
    ]);
    expect(compact).not.toHaveProperty("truncated");
  });

  it("caps diagnostics at 20 and sets truncated", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: Array.from({ length: 25 }, (_, i) => ({
        file: `src/m${i}.py`,
        line: i + 1,
        severity: "error" as const,
        message: `error ${i}`,
      })),
    };

    const compact = compactMypyMap(data);

    expect(compact.errorCount).toBe(25);
    expect(compact.diagnostics).toHaveLength(20);
    expect(compact.truncated).toBe(true);
  });

  it("passes through error and exitCode from failed runs", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [],
      error: "mypy: error: Cannot find config file 'missing.ini'",
      exitCode: 2,
    };

    const compact = compactMypyMap(data);

    expect(compact.error).toBe("mypy: error: Cannot find config file 'missing.ini'");
    expect(compact.exitCode).toBe(2);
  });
});

describe("formatMypyCompact", () => {
  it("formats clean result", () => {
    const compact = { success: true, errorCount: 0, warningCount: 0 };
    expect(formatMypyCompact(compact)).toBe("mypy: no errors found.");
  });

  it("formats result with errors including diagnostics", () => {
    const compact = {
      success: false,
      errorCount: 1,
      warningCount: 0,
      diagnostics: [
        {
          file: "src/main.py",
          line: 10,
          severity: "error" as const,
          message: "Incompatible return value type",
          code: "return-value",
        },
      ],
    };
    const output = formatMypyCompact(compact);
    expect(output).toContain("mypy: 1 errors, 0 warnings");
    expect(output).toContain("src/main.py:10 error: Incompatible return value type [return-value]");
  });

  it("formats failed run with error detail", () => {
    const compact = {
      success: false,
      errorCount: 0,
      warningCount: 0,
      error: "mypy: error: Cannot find config file 'missing.ini'",
      exitCode: 2,
    };
    const output = formatMypyCompact(compact);
    expect(output).toContain("mypy: run failed (exit code 2)");
    expect(output).toContain("Cannot find config file");
  });
});

// ── Ruff compact ──────────────────────────────────────────────────────

describe("compactRuffMap", () => {
  it("keeps totals, fixedCount, and first-N diagnostics", () => {
    const data: RuffResult = {
      success: false,
      diagnostics: [
        {
          file: "src/main.py",
          line: 1,
          column: 1,
          code: "F401",
          message: "'os' imported but unused",
          fixable: true,
          fixApplicability: "safe",
          url: "https://docs.astral.sh/ruff/rules/unused-import",
        },
        {
          file: "src/main.py",
          line: 5,
          column: 10,
          code: "E501",
          message: "Line too long",
          fixable: false,
        },
      ],
      fixedCount: 1,
    };

    const compact = compactRuffMap(data);

    expect(compact.success).toBe(false);
    expect(compact.total).toBe(2);
    expect(compact.fixableCount).toBe(1);
    expect(compact.fixedCount).toBe(1);
    expect(compact.diagnostics).toEqual([
      {
        file: "src/main.py",
        line: 1,
        column: 1,
        code: "F401",
        message: "'os' imported but unused",
        fixable: true,
      },
      {
        file: "src/main.py",
        line: 5,
        column: 10,
        code: "E501",
        message: "Line too long",
        fixable: false,
      },
    ]);
    expect(compact).not.toHaveProperty("truncated");
  });

  it("caps diagnostics at 20 and sets truncated", () => {
    const data: RuffResult = {
      success: false,
      diagnostics: Array.from({ length: 30 }, (_, i) => ({
        file: `src/m${i}.py`,
        line: i + 1,
        column: 1,
        code: "F401",
        message: `unused import ${i}`,
        fixable: true,
      })),
    };

    const compact = compactRuffMap(data);

    expect(compact.total).toBe(30);
    expect(compact.diagnostics).toHaveLength(20);
    expect(compact.truncated).toBe(true);
  });

  it("passes through error and exitCode from failed runs", () => {
    const data: RuffResult = {
      success: false,
      diagnostics: [],
      error: "ruff failed\n  Cause: Failed to parse ruff.toml",
      exitCode: 2,
    };

    const compact = compactRuffMap(data);

    expect(compact.error).toContain("Failed to parse ruff.toml");
    expect(compact.exitCode).toBe(2);
  });
});

describe("formatRuffCompact", () => {
  it("formats clean result", () => {
    const compact = { success: true, total: 0, fixableCount: 0 };
    expect(formatRuffCompact(compact)).toBe("ruff: no issues found.");
  });

  it("formats result with issues", () => {
    const compact = {
      success: false,
      total: 2,
      fixableCount: 1,
      fixedCount: 3,
      diagnostics: [
        {
          file: "src/main.py",
          line: 1,
          column: 1,
          code: "F401",
          message: "'os' imported but unused",
          fixable: true,
        },
      ],
    };
    const output = formatRuffCompact(compact);
    expect(output).toContain("ruff: 2 issues (1 fixable, 3 fixed)");
    expect(output).toContain("src/main.py:1:1 F401: 'os' imported but unused");
  });

  it("formats failed run with error detail", () => {
    const compact = {
      success: false,
      total: 0,
      fixableCount: 0,
      error: "ruff failed\n  Cause: Failed to parse ruff.toml",
      exitCode: 2,
    };
    const output = formatRuffCompact(compact);
    expect(output).toContain("ruff: run failed (exit code 2)");
    expect(output).toContain("Failed to parse ruff.toml");
  });
});

// ── Black compact ─────────────────────────────────────────────────────

describe("compactBlackMap", () => {
  it("keeps counts, drops file lists", () => {
    const data: BlackResult = {
      filesChanged: 3,
      filesUnchanged: 7,
      success: true,
      wouldReformat: ["a.py", "b.py", "c.py"],
    };

    const compact = compactBlackMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(3);
    expect(compact.filesUnchanged).toBe(7);
    expect(compact).not.toHaveProperty("wouldReformat");
  });
});

describe("formatBlackCompact", () => {
  it("formats no files found", () => {
    const compact = { success: true, filesChanged: 0, filesUnchanged: 0 };
    expect(formatBlackCompact(compact)).toBe("black: no Python files found.");
  });

  it("formats all clean", () => {
    const compact = { success: true, filesChanged: 0, filesUnchanged: 10 };
    expect(formatBlackCompact(compact)).toBe("black: 10 files already formatted.");
  });

  it("formats with changes", () => {
    const compact = { success: true, filesChanged: 3, filesUnchanged: 7 };
    expect(formatBlackCompact(compact)).toBe("black: 3 reformatted, 7 unchanged");
  });
});

// ── Pip Install compact ───────────────────────────────────────────────

describe("compactPipInstallMap", () => {
  it("keeps success and alreadySatisfied; drops package details", () => {
    const data: PipInstall = {
      success: true,
      installed: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
      alreadySatisfied: false,
    };

    const compact = compactPipInstallMap(data);

    expect(compact.success).toBe(true);
    expect(compact.alreadySatisfied).toBe(false);
    expect(compact).not.toHaveProperty("installed");
  });
});

describe("formatPipInstallCompact", () => {
  it("formats already satisfied", () => {
    const compact = { success: true, alreadySatisfied: true };
    expect(formatPipInstallCompact(compact)).toBe("All requirements already satisfied.");
  });

  it("formats failed install", () => {
    const compact = { success: false, alreadySatisfied: false };
    expect(formatPipInstallCompact(compact)).toBe("pip install failed.");
  });

  it("formats successful install", () => {
    const compact = { success: true, alreadySatisfied: false };
    expect(formatPipInstallCompact(compact)).toBe("Installed packages.");
  });
});

// ── Pip Audit compact ─────────────────────────────────────────────────

describe("compactPipAuditMap", () => {
  it("keeps total, severity counts, and vulnerability identities", () => {
    const data: PipAuditResult = {
      success: false,
      vulnerabilities: [
        {
          name: "requests",
          version: "2.25.0",
          id: "PYSEC-2023-001",
          description: "Session fixation vulnerability",
          fixVersions: ["2.31.0"],
          severity: "HIGH",
        },
        {
          name: "flask",
          version: "1.0.0",
          id: "CVE-2023-12345",
          description: "XSS vulnerability in debug mode",
          fixVersions: [],
        },
      ],
    };

    const compact = compactPipAuditMap(data);

    expect(compact.success).toBe(false);
    expect(compact.total).toBe(2);
    expect(compact.severityCounts).toEqual({ HIGH: 1, unknown: 1 });
    expect(compact.vulnerabilities).toHaveLength(2);
    expect(compact.vulnerabilities?.[0]).toMatchObject({
      name: "requests",
      version: "2.25.0",
      id: "PYSEC-2023-001",
      fixVersions: ["2.31.0"],
      severity: "HIGH",
    });
  });

  it("truncates long descriptions and caps entries at 10", () => {
    const data: PipAuditResult = {
      success: false,
      vulnerabilities: Array.from({ length: 12 }, (_, i) => ({
        name: `pkg${i}`,
        version: "1.0.0",
        id: `PYSEC-2024-${i}`,
        description: "x".repeat(500),
        fixVersions: [],
      })),
    };

    const compact = compactPipAuditMap(data);

    expect(compact.total).toBe(12);
    expect(compact.vulnerabilities).toHaveLength(10);
    expect(compact.truncated).toBe(true);
    expect(compact.vulnerabilities?.[0].description.length).toBeLessThanOrEqual(141);
  });

  it("passes through error and exitCode from crashed audits", () => {
    const data: PipAuditResult = {
      success: false,
      vulnerabilities: [],
      error: "ERROR:pip_audit._cli:Vulnerability service returned an error",
      exitCode: 1,
    };

    const compact = compactPipAuditMap(data);

    expect(compact.total).toBe(0);
    expect(compact.error).toContain("Vulnerability service returned an error");
    expect(compact.exitCode).toBe(1);
  });
});

describe("formatPipAuditCompact", () => {
  it("formats clean audit", () => {
    const compact = { success: true, total: 0 };
    expect(formatPipAuditCompact(compact)).toBe("No vulnerabilities found.");
  });

  it("formats audit with vulnerabilities", () => {
    const compact = {
      success: false,
      total: 2,
      severityCounts: { HIGH: 1, unknown: 1 },
      vulnerabilities: [
        {
          name: "requests",
          version: "2.25.0",
          id: "PYSEC-2023-001",
          description: "Session fixation",
          fixVersions: ["2.31.0"],
          severity: "HIGH",
        },
      ],
    };
    const output = formatPipAuditCompact(compact);
    expect(output).toContain("2 vulnerabilities (1 HIGH, 1 unknown):");
    expect(output).toContain("requests==2.25.0 PYSEC-2023-001 [HIGH] (fix: 2.31.0)");
  });

  it("formats crashed audit as NOT a clean scan", () => {
    const compact = {
      success: false,
      total: 0,
      error: "ERROR:pip_audit._cli:Vulnerability service returned an error",
      exitCode: 1,
    };
    const output = formatPipAuditCompact(compact);
    expect(output).toContain("audit failed (exit code 1)");
    expect(output).toContain("NOT a clean scan");
    expect(output).not.toContain("No vulnerabilities found");
  });
});

// ── Uv Install compact ───────────────────────────────────────────────

describe("compactUvInstallMap", () => {
  it("keeps success and error info; drops package details", () => {
    const data: UvInstall = {
      success: true,
      installed: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
    };

    const compact = compactUvInstallMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("installed");
  });
});

describe("formatUvInstallCompact", () => {
  it("formats failed install", () => {
    const compact = { success: false };
    expect(formatUvInstallCompact(compact)).toBe("uv install failed.");
  });

  it("formats already satisfied", () => {
    const compact = { success: true, alreadySatisfied: true };
    expect(formatUvInstallCompact(compact)).toBe("All requirements already satisfied.");
  });

  it("formats successful install", () => {
    const compact = { success: true };
    expect(formatUvInstallCompact(compact)).toBe("Installed packages.");
  });
});

// ── Uv Run compact ───────────────────────────────────────────────────

describe("compactUvRunMap", () => {
  it("keeps exitCode, success, and truncated streams (the #983/#1020 pattern)", () => {
    const data: UvRun = {
      exitCode: 0,
      stdout: "Hello, world!\nLine 2\nLine 3",
      stderr: "some warnings here",
      success: true,
    };

    const compact = compactUvRunMap(data);

    expect(compact.exitCode).toBe(0);
    expect(compact.success).toBe(true);
    expect(compact.stdout).toBe("Hello, world!\nLine 2\nLine 3");
    expect(compact.stderr).toBe("some warnings here");
    expect(compact).not.toHaveProperty("stdoutTruncated");
    expect(compact).not.toHaveProperty("stderrTruncated");
  });

  it("prefers commandStderr and omits empty streams", () => {
    const data: UvRun = {
      exitCode: 1,
      stdout: "",
      stderr: "Resolved 3 packages\nTraceback (most recent call last):\n  ValueError: boom",
      commandStderr: "Traceback (most recent call last):\n  ValueError: boom",
      success: false,
    };

    const compact = compactUvRunMap(data);

    expect(compact).not.toHaveProperty("stdout");
    expect(compact.stderr).toBe("Traceback (most recent call last):\n  ValueError: boom");
  });

  it("truncates long streams and sets truncation metadata", () => {
    const longStdout = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const data: UvRun = {
      exitCode: 0,
      stdout: longStdout,
      stderr: "",
      success: true,
    };

    const compact = compactUvRunMap(data);

    expect(compact.stdoutTruncated).toBe(true);
    expect(compact.stdoutTotalLines).toBe(200);
    expect(compact.stdout).toContain("line 0");
    expect(compact.stdout).toContain("lines omitted");
    expect(compact.stdout).toContain("line 199");
  });
});

describe("formatUvRunCompact", () => {
  it("formats successful run", () => {
    const compact = { exitCode: 0, success: true };
    expect(formatUvRunCompact(compact)).toBe("uv run completed");
  });

  it("formats failed run with streams", () => {
    const compact = {
      exitCode: 1,
      success: false,
      stderr: "ValueError: boom",
    };
    const output = formatUvRunCompact(compact);
    expect(output).toContain("uv run failed (exit 1)");
    expect(output).toContain("stderr:");
    expect(output).toContain("ValueError: boom");
  });
});

// ── Pip List compact ──────────────────────────────────────────────────

describe("compactPipListMap", () => {
  it("keeps total and name/version pairs", () => {
    const data: PipList = {
      success: true,
      packages: [
        { name: "flask", version: "3.0.0", location: "/usr/lib/site-packages" },
        { name: "requests", version: "2.31.0" },
      ],
    };

    const compact = compactPipListMap(data);

    expect(compact.success).toBe(true);
    expect(compact.total).toBe(2);
    expect(compact.packages).toEqual([
      { name: "flask", version: "3.0.0" },
      { name: "requests", version: "2.31.0" },
    ]);
  });

  it("keeps latestVersion for outdated mode and caps at 50", () => {
    const data: PipList = {
      success: true,
      packages: Array.from({ length: 60 }, (_, i) => ({
        name: `pkg${i}`,
        version: "1.0.0",
        latestVersion: "2.0.0",
      })),
    };

    const compact = compactPipListMap(data);

    expect(compact.total).toBe(60);
    expect(compact.packages).toHaveLength(50);
    expect(compact.truncated).toBe(true);
    expect(compact.packages?.[0].latestVersion).toBe("2.0.0");
  });
});

describe("formatPipListCompact", () => {
  it("formats successful list with packages", () => {
    const compact = {
      success: true,
      total: 2,
      packages: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
    };
    const output = formatPipListCompact(compact);
    expect(output).toContain("2 packages installed:");
    expect(output).toContain("flask==3.0.0");
    expect(output).toContain("requests==2.31.0");
  });

  it("formats error", () => {
    const compact = { success: false, total: 0, error: "parse error" };
    expect(formatPipListCompact(compact)).toBe("pip list error: parse error");
  });
});

// ── Pip Show compact ──────────────────────────────────────────────────

describe("compactPipShowMap", () => {
  it("keeps name, version, and summary; drops detailed metadata", () => {
    const data: PipShow = {
      success: true,
      name: "requests",
      version: "2.31.0",
      summary: "Python HTTP for Humans.",
      homepage: "https://requests.readthedocs.io",
      author: "Kenneth Reitz",
      license: "Apache-2.0",
      location: "/usr/lib/python3.11/site-packages",
      requires: ["charset-normalizer", "idna", "urllib3", "certifi"],
    };

    const compact = compactPipShowMap(data);

    expect(compact.name).toBe("requests");
    expect(compact.version).toBe("2.31.0");
    expect(compact.summary).toBe("Python HTTP for Humans.");
    expect(compact).not.toHaveProperty("homepage");
    expect(compact).not.toHaveProperty("author");
    expect(compact).not.toHaveProperty("license");
    expect(compact).not.toHaveProperty("location");
    expect(Array.isArray(compact.requires)).toBe(true);
  });
});

describe("formatPipShowCompact", () => {
  it("formats package not found", () => {
    const compact = { success: false, name: "", version: "", summary: "" };
    expect(formatPipShowCompact(compact)).toBe("Package not found.");
  });

  it("formats package with summary", () => {
    const compact = {
      success: true,
      name: "requests",
      version: "2.31.0",
      summary: "Python HTTP for Humans.",
    };
    expect(formatPipShowCompact(compact)).toBe("requests==2.31.0: Python HTTP for Humans.");
  });
});

// ── Ruff Format compact ──────────────────────────────────────────────

describe("compactRuffFormatMap", () => {
  it("keeps success, filesChanged, filesUnchanged; drops file list", () => {
    const data: RuffFormatResult = {
      success: true,
      filesChanged: 3,
      filesUnchanged: 7,
      files: ["a.py", "b.py", "c.py"],
    };

    const compact = compactRuffFormatMap(data);

    expect(compact.success).toBe(true);
    expect(compact.filesChanged).toBe(3);
    expect(compact.filesUnchanged).toBe(7);
    expect(compact).not.toHaveProperty("files");
  });
});

describe("formatRuffFormatCompact", () => {
  it("formats all clean with unchanged count", () => {
    const compact = { success: true, filesChanged: 0, filesUnchanged: 10 };
    expect(formatRuffFormatCompact(compact)).toBe(
      "ruff format: all files already formatted. (10 unchanged)",
    );
  });

  it("formats all clean without unchanged count", () => {
    const compact = { success: true, filesChanged: 0, filesUnchanged: 0 };
    expect(formatRuffFormatCompact(compact)).toBe("ruff format: all files already formatted.");
  });

  it("formats with reformatted files and unchanged", () => {
    const compact = { success: true, filesChanged: 3, filesUnchanged: 7 };
    expect(formatRuffFormatCompact(compact)).toBe("ruff format: 3 files reformatted, 7 unchanged");
  });

  it("formats with reformatted files and no unchanged", () => {
    const compact = { success: true, filesChanged: 3, filesUnchanged: 0 };
    expect(formatRuffFormatCompact(compact)).toBe("ruff format: 3 files reformatted");
  });

  it("formats check mode with files needing formatting", () => {
    const compact = { success: false, filesChanged: 2, filesUnchanged: 5, checkMode: true };
    expect(formatRuffFormatCompact(compact)).toBe(
      "ruff format: 2 files would be reformatted, 5 unchanged",
    );
  });
});
