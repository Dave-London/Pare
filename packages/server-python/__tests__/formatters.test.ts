import { describe, it, expect } from "vitest";
import {
  formatPipInstall,
  formatMypy,
  formatRuff,
  formatPipAudit,
  formatPytest,
  formatBlack,
  formatPipList,
  formatPipShow,
  formatRuffFormat,
  formatCondaList,
  formatCondaInfo,
  formatCondaEnvList,
  formatPoetry,
} from "../src/lib/formatters.js";
import type {
  PipInstall,
  MypyResult,
  RuffResult,
  PipAuditResult,
  PytestResult,
  BlackResult,
  PipList,
  PipShow,
  RuffFormatResult,
  CondaList,
  CondaInfo,
  CondaEnvList,
  PoetryResult,
} from "../src/schemas/index.js";

describe("formatPipInstall", () => {
  it("formats already satisfied install", () => {
    const data: PipInstall = {
      success: true,
      installed: [],
      alreadySatisfied: true,
      total: 0,
    };
    expect(formatPipInstall(data)).toBe("All requirements already satisfied.");
  });

  it("formats successful install with packages", () => {
    const data: PipInstall = {
      success: true,
      installed: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
      alreadySatisfied: false,
      total: 2,
    };
    const output = formatPipInstall(data);
    expect(output).toContain("Installed 2 packages:");
    expect(output).toContain("flask==3.0.0");
    expect(output).toContain("requests==2.31.0");
  });

  it("formats failed install", () => {
    const data: PipInstall = {
      success: false,
      installed: [],
      alreadySatisfied: false,
      total: 0,
    };
    expect(formatPipInstall(data)).toBe("pip install failed.");
  });
});

describe("formatMypy", () => {
  it("formats clean mypy result", () => {
    const data: MypyResult = {
      success: true,
      diagnostics: [],
      total: 0,
      errors: 0,
      warnings: 0,
    };
    expect(formatMypy(data)).toBe("mypy: no errors found.");
  });

  it("formats mypy result with errors", () => {
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
      total: 2,
      errors: 1,
      warnings: 1,
    };
    const output = formatMypy(data);
    expect(output).toContain("mypy: 1 errors, 1 warnings/notes");
    expect(output).toContain(
      "src/main.py:10:5 error: Incompatible return value type [return-value]",
    );
    expect(output).toContain("src/utils.py:3 note: Revealed type is 'builtins.str'");
  });

  it("formats mypy diagnostic without optional column and code", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [
        {
          file: "app.py",
          line: 1,
          severity: "error",
          message: "Cannot find implementation or library stub",
        },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatMypy(data);
    expect(output).toContain("app.py:1 error: Cannot find implementation or library stub");
    expect(output).not.toContain("[");
  });
});

describe("formatRuff", () => {
  it("formats clean ruff result", () => {
    const data: RuffResult = {
      diagnostics: [],
      total: 0,
      fixable: 0,
    };
    expect(formatRuff(data)).toBe("ruff: no issues found.");
  });

  it("formats ruff result with issues", () => {
    const data: RuffResult = {
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
          message: "Line too long (120 > 88 characters)",
          fixable: false,
        },
      ],
      total: 2,
      fixable: 1,
    };
    const output = formatRuff(data);
    expect(output).toContain("ruff: 2 issues (1 fixable)");
    expect(output).toContain("src/main.py:1:1 F401: 'os' imported but unused");
    expect(output).toContain("src/main.py:5:10 E501: Line too long (120 > 88 characters)");
  });
});

describe("formatPipAudit", () => {
  it("formats clean audit", () => {
    const data: PipAuditResult = {
      vulnerabilities: [],
      total: 0,
    };
    expect(formatPipAudit(data)).toBe("No vulnerabilities found.");
  });

  it("formats audit with vulnerabilities and fix versions", () => {
    const data: PipAuditResult = {
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
      total: 2,
    };
    const output = formatPipAudit(data);
    expect(output).toContain("2 vulnerabilities:");
    expect(output).toContain(
      "requests==2.25.0 PYSEC-2023-001: Session fixation vulnerability (fix: 2.31.0)",
    );
    expect(output).toContain("flask==1.0.0 CVE-2023-12345: XSS vulnerability in debug mode");
    // No fix version should not show "(fix: ...)"
    expect(output).not.toContain("XSS vulnerability in debug mode (fix:");
  });
});

// ─── Formatter edge cases ──────────────────────────────────────────────────────

describe("formatMypy — edge cases", () => {
  it("formats diagnostic with missing column and code", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [
        {
          file: "src/app.py",
          line: 42,
          severity: "error",
          message: "Cannot find implementation or library stub for module named 'missing'",
        },
      ],
      total: 1,
      errors: 1,
      warnings: 0,
    };
    const output = formatMypy(data);
    expect(output).toContain("src/app.py:42 error: Cannot find implementation or library stub");
    // Should not contain column separator or bracket-code when omitted
    expect(output).not.toContain(":42:");
    expect(output).not.toContain("[");
  });

  it("formats diagnostic with column but no code", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [
        {
          file: "lib.py",
          line: 5,
          column: 10,
          severity: "warning",
          message: "Unused type: ignore comment",
        },
      ],
      total: 1,
      errors: 0,
      warnings: 1,
    };
    const output = formatMypy(data);
    expect(output).toContain("lib.py:5:10 warning: Unused type: ignore comment");
    expect(output).not.toContain("[");
  });
});

describe("formatPytest — edge cases", () => {
  it("formats large failure list correctly", () => {
    const failures = Array.from({ length: 20 }, (_, i) => ({
      test: `test_case_${i}`,
      message: `assertion failed in case ${i}`,
    }));
    const data: PytestResult = {
      success: false,
      passed: 80,
      failed: 20,
      errors: 0,
      skipped: 0,
      total: 100,
      duration: 15.5,
      failures,
    };
    const output = formatPytest(data);

    expect(output).toContain("80 passed, 20 failed in 15.5s");
    // All 20 failures should be listed
    for (let i = 0; i < 20; i++) {
      expect(output).toContain(`FAILED test_case_${i}: assertion failed in case ${i}`);
    }
  });

  it("formats result with only errors and skipped (no passed/failed)", () => {
    const data: PytestResult = {
      success: false,
      passed: 0,
      failed: 0,
      errors: 3,
      skipped: 2,
      total: 5,
      duration: 0.5,
      failures: [],
    };
    const output = formatPytest(data);
    expect(output).toContain("3 errors, 2 skipped in 0.5s");
    expect(output).not.toContain("passed");
    expect(output).not.toContain("failed");
  });
});

describe("formatBlack — edge cases", () => {
  it("formats zero filesChecked but non-empty wouldReformat", () => {
    // Edge case: wouldReformat has entries but filesChecked is 0
    // This is logically inconsistent but tests the formatter's behavior
    const data: BlackResult = {
      filesChanged: 0,
      filesUnchanged: 0,
      filesChecked: 0,
      success: true,
      wouldReformat: ["orphan.py"],
    };
    // With filesChecked === 0, formatter returns "no Python files found"
    const output = formatBlack(data);
    expect(output).toBe("black: no Python files found.");
  });

  it("formats with filesChanged > 0 but empty wouldReformat list", () => {
    const data: BlackResult = {
      filesChanged: 3,
      filesUnchanged: 2,
      filesChecked: 5,
      success: true,
      wouldReformat: [],
    };
    const output = formatBlack(data);
    expect(output).toContain("3 files reformatted, 2 unchanged");
    // Should not list any files
    expect(output.split("\n")).toHaveLength(1);
  });
});

// ─── pip-list formatter tests ────────────────────────────────────────────────

describe("formatPipList", () => {
  it("formats empty package list", () => {
    const data: PipList = { packages: [], total: 0 };
    expect(formatPipList(data)).toBe("No packages installed.");
  });

  it("formats package list with multiple packages", () => {
    const data: PipList = {
      packages: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],
      total: 2,
    };
    const output = formatPipList(data);
    expect(output).toContain("2 packages installed:");
    expect(output).toContain("flask==3.0.0");
    expect(output).toContain("requests==2.31.0");
  });
});

// ─── pip-show formatter tests ────────────────────────────────────────────────

describe("formatPipShow", () => {
  it("formats package not found", () => {
    const data: PipShow = {
      name: "",
      version: "",
      summary: "",
      requires: [],
    };
    expect(formatPipShow(data)).toBe("Package not found.");
  });

  it("formats full package metadata", () => {
    const data: PipShow = {
      name: "requests",
      version: "2.31.0",
      summary: "Python HTTP for Humans.",
      homepage: "https://requests.readthedocs.io",
      author: "Kenneth Reitz",
      license: "Apache-2.0",
      location: "/usr/lib/python3.11/site-packages",
      requires: ["charset-normalizer", "idna", "urllib3", "certifi"],
    };
    const output = formatPipShow(data);
    expect(output).toContain("requests==2.31.0");
    expect(output).toContain("Summary: Python HTTP for Humans.");
    expect(output).toContain("Author: Kenneth Reitz");
    expect(output).toContain("License: Apache-2.0");
    expect(output).toContain("Homepage: https://requests.readthedocs.io");
    expect(output).toContain("Location: /usr/lib/python3.11/site-packages");
    expect(output).toContain("Requires: charset-normalizer, idna, urllib3, certifi");
  });

  it("formats package with minimal metadata", () => {
    const data: PipShow = {
      name: "mypackage",
      version: "1.0.0",
      summary: "A test package",
      requires: [],
    };
    const output = formatPipShow(data);
    expect(output).toContain("mypackage==1.0.0");
    expect(output).toContain("Summary: A test package");
    expect(output).not.toContain("Author:");
    expect(output).not.toContain("Homepage:");
    expect(output).not.toContain("Requires:");
  });
});

// ─── ruff-format formatter tests ─────────────────────────────────────────────

describe("formatRuffFormat", () => {
  it("formats all files already formatted", () => {
    const data: RuffFormatResult = {
      success: true,
      filesChanged: 0,
    };
    expect(formatRuffFormat(data)).toBe("ruff format: all files already formatted.");
  });

  it("formats format mode with reformatted files", () => {
    const data: RuffFormatResult = {
      success: true,
      filesChanged: 2,
      files: ["src/main.py", "src/utils.py"],
    };
    const output = formatRuffFormat(data);
    expect(output).toContain("2 files reformatted");
    expect(output).toContain("src/main.py");
    expect(output).toContain("src/utils.py");
  });

  it("formats check mode with files needing formatting", () => {
    const data: RuffFormatResult = {
      success: false,
      filesChanged: 1,
      files: ["src/main.py"],
    };
    const output = formatRuffFormat(data);
    expect(output).toContain("1 files would be reformatted");
    expect(output).toContain("src/main.py");
  });

  it("formats with filesChanged > 0 but no file list", () => {
    const data: RuffFormatResult = {
      success: true,
      filesChanged: 3,
    };
    const output = formatRuffFormat(data);
    expect(output).toContain("3 files reformatted");
    expect(output.split("\n")).toHaveLength(1);
  });
});

// ─── conda list formatter tests ──────────────────────────────────────────────

describe("formatCondaList", () => {
  it("formats empty package list", () => {
    const data: CondaList = { action: "list", packages: [], total: 0 };
    expect(formatCondaList(data)).toBe("conda: no packages found.");
  });

  it("formats package list with multiple packages", () => {
    const data: CondaList = {
      action: "list",
      packages: [
        { name: "numpy", version: "1.26.0", channel: "defaults" },
        { name: "pandas", version: "2.1.0", channel: "conda-forge" },
      ],
      total: 2,
    };
    const output = formatCondaList(data);
    expect(output).toContain("conda list: 2 packages:");
    expect(output).toContain("numpy==1.26.0 (defaults)");
    expect(output).toContain("pandas==2.1.0 (conda-forge)");
  });

  it("formats package list with environment name", () => {
    const data: CondaList = {
      action: "list",
      packages: [{ name: "flask", version: "3.0.0", channel: "defaults" }],
      total: 1,
      environment: "myenv",
    };
    const output = formatCondaList(data);
    expect(output).toContain("conda list (env: myenv): 1 packages:");
  });
});

// ─── conda info formatter tests ──────────────────────────────────────────────

describe("formatCondaInfo", () => {
  it("formats full conda info", () => {
    const data: CondaInfo = {
      action: "info",
      condaVersion: "24.1.0",
      platform: "win-64",
      pythonVersion: "3.11.7",
      defaultPrefix: "C:\\miniconda3",
      activePrefix: "C:\\miniconda3\\envs\\dev",
      channels: ["defaults", "conda-forge"],
      envsDirs: ["C:\\miniconda3\\envs"],
      pkgsDirs: ["C:\\miniconda3\\pkgs"],
    };
    const output = formatCondaInfo(data);
    expect(output).toContain("conda 24.1.0");
    expect(output).toContain("platform: win-64");
    expect(output).toContain("python: 3.11.7");
    expect(output).toContain("default prefix: C:\\miniconda3");
    expect(output).toContain("active prefix: C:\\miniconda3\\envs\\dev");
    expect(output).toContain("channels: defaults, conda-forge");
  });

  it("formats conda info without active prefix", () => {
    const data: CondaInfo = {
      action: "info",
      condaVersion: "24.1.0",
      platform: "linux-64",
      pythonVersion: "3.11.7",
      defaultPrefix: "/home/user/miniconda3",
      channels: [],
      envsDirs: [],
      pkgsDirs: [],
    };
    const output = formatCondaInfo(data);
    expect(output).not.toContain("active prefix:");
    expect(output).not.toContain("channels:");
  });
});

// ─── conda env list formatter tests ──────────────────────────────────────────

describe("formatCondaEnvList", () => {
  it("formats empty environment list", () => {
    const data: CondaEnvList = { action: "env-list", environments: [], total: 0 };
    expect(formatCondaEnvList(data)).toBe("conda: no environments found.");
  });

  it("formats environment list with active marker", () => {
    const data: CondaEnvList = {
      action: "env-list",
      environments: [
        { name: "base", path: "/home/user/miniconda3", active: true },
        { name: "dev", path: "/home/user/miniconda3/envs/dev", active: false },
      ],
      total: 2,
    };
    const output = formatCondaEnvList(data);
    expect(output).toContain("conda environments: 2");
    expect(output).toContain("base *: /home/user/miniconda3");
    expect(output).toContain("dev: /home/user/miniconda3/envs/dev");
    expect(output).not.toContain("dev *:");
// ─── poetry formatter tests ─────────────────────────────────────────────────

describe("formatPoetry", () => {
  it("formats failed action", () => {
    const data: PoetryResult = {
      success: false,
      action: "install",
      total: 0,
    };
    expect(formatPoetry(data)).toBe("poetry install failed.");
  });

  it("formats show with packages", () => {
    const data: PoetryResult = {
      success: true,
      action: "show",
      packages: [
        { name: "requests", version: "2.31.0" },
        { name: "flask", version: "3.0.0" },
      ],
      total: 2,
    };
    const output = formatPoetry(data);
    expect(output).toContain("2 packages:");
    expect(output).toContain("requests==2.31.0");
    expect(output).toContain("flask==3.0.0");
  });

  it("formats show with no packages", () => {
    const data: PoetryResult = {
      success: true,
      action: "show",
      packages: [],
      total: 0,
    };
    expect(formatPoetry(data)).toBe("No packages found.");
  });

  it("formats build with artifacts", () => {
    const data: PoetryResult = {
      success: true,
      action: "build",
      artifacts: [{ file: "mypackage-1.0.0.tar.gz" }, { file: "mypackage-1.0.0-py3-none-any.whl" }],
      total: 2,
    };
    const output = formatPoetry(data);
    expect(output).toContain("Built 2 artifacts:");
    expect(output).toContain("mypackage-1.0.0.tar.gz");
    expect(output).toContain("mypackage-1.0.0-py3-none-any.whl");
  });

  it("formats build with no artifacts", () => {
    const data: PoetryResult = {
      success: true,
      action: "build",
      artifacts: [],
      total: 0,
    };
    expect(formatPoetry(data)).toBe("poetry build: no artifacts produced.");
  });

  it("formats install with packages", () => {
    const data: PoetryResult = {
      success: true,
      action: "install",
      packages: [{ name: "requests", version: "2.31.0" }],
      total: 1,
    };
    const output = formatPoetry(data);
    expect(output).toContain("poetry install: 1 packages:");
    expect(output).toContain("requests==2.31.0");
  });

  it("formats install with no changes", () => {
    const data: PoetryResult = {
      success: true,
      action: "install",
      packages: [],
      total: 0,
    };
    expect(formatPoetry(data)).toBe("poetry install: no changes.");
  });

  it("formats add with packages", () => {
    const data: PoetryResult = {
      success: true,
      action: "add",
      packages: [
        { name: "certifi", version: "2023.7.22" },
        { name: "requests", version: "2.31.0" },
      ],
      total: 2,
    };
    const output = formatPoetry(data);
    expect(output).toContain("poetry add: 2 packages:");
    expect(output).toContain("certifi==2023.7.22");
  });

  it("formats remove with packages", () => {
    const data: PoetryResult = {
      success: true,
      action: "remove",
      packages: [{ name: "requests", version: "2.31.0" }],
      total: 1,
    };
    const output = formatPoetry(data);
    expect(output).toContain("poetry remove: 1 packages:");
    expect(output).toContain("requests==2.31.0");
  });
});
