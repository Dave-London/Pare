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
});

// ── Mypy compact ──────────────────────────────────────────────────────

describe("compactMypyMap", () => {
  it("keeps success, drops individual diagnostics", () => {
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
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

describe("formatMypyCompact", () => {
  it("formats clean result", () => {
    const compact = { success: true };
    expect(formatMypyCompact(compact)).toBe("mypy: no errors found.");
  });

  it("formats result with errors", () => {
    const compact = { success: false };
    expect(formatMypyCompact(compact)).toBe("mypy: errors found.");
  });
});

// ── Ruff compact ──────────────────────────────────────────────────────

describe("compactRuffMap", () => {
  it("keeps success and fixedCount, drops diagnostics", () => {
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
    expect(compact.fixedCount).toBe(1);
    expect(compact).not.toHaveProperty("diagnostics");
  });
});

describe("formatRuffCompact", () => {
  it("formats clean result", () => {
    const compact = { success: true };
    expect(formatRuffCompact(compact)).toBe("ruff: no issues found.");
  });

  it("formats result with issues", () => {
    const compact = { success: false, fixedCount: 3 };
    expect(formatRuffCompact(compact)).toBe("ruff: issues found, 3 fixed");
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
  it("keeps success, drops vulnerability details", () => {
    const data: PipAuditResult = {
      success: false,
      vulnerabilities: [
        {
          name: "requests",
          version: "2.25.0",
          id: "PYSEC-2023-001",
          description: "Session fixation vulnerability",
          fixVersions: ["2.31.0"],
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
    expect(compact).not.toHaveProperty("vulnerabilities");
  });
});

describe("formatPipAuditCompact", () => {
  it("formats clean audit", () => {
    const compact = { success: true };
    expect(formatPipAuditCompact(compact)).toBe("No vulnerabilities found.");
  });

  it("formats audit with vulnerabilities", () => {
    const compact = { success: false };
    expect(formatPipAuditCompact(compact)).toBe("Vulnerabilities found.");
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
  it("keeps exitCode and success; drops stdout/stderr", () => {
    const data: UvRun = {
      exitCode: 0,
      stdout: "Hello, world!\nLine 2\nLine 3",
      stderr: "some warnings here",
      success: true,
    };

    const compact = compactUvRunMap(data);

    expect(compact.exitCode).toBe(0);
    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("stdout");
    expect(compact).not.toHaveProperty("stderr");
  });
});

describe("formatUvRunCompact", () => {
  it("formats successful run", () => {
    const compact = { exitCode: 0, success: true };
    expect(formatUvRunCompact(compact)).toBe("uv run completed");
  });

  it("formats failed run", () => {
    const compact = { exitCode: 1, success: false };
    expect(formatUvRunCompact(compact)).toBe("uv run failed (exit 1)");
  });
});

// ── Pip List compact ──────────────────────────────────────────────────

describe("compactPipListMap", () => {
  it("keeps success and error, drops package details", () => {
    const data: PipList = {
      success: true,
      packages: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
    };

    const compact = compactPipListMap(data);

    expect(compact.success).toBe(true);
    expect(compact).not.toHaveProperty("packages");
  });
});

describe("formatPipListCompact", () => {
  it("formats successful list", () => {
    const compact = { success: true };
    expect(formatPipListCompact(compact)).toBe("Packages listed.");
  });

  it("formats error", () => {
    const compact = { success: false, error: "parse error" };
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
