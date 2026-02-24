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
  formatCondaResult,
  formatCondaListCompact,
  formatCondaInfoCompact,
  formatCondaEnvListCompact,
  formatCondaResultCompact,
  compactCondaListMap,
  compactCondaInfoMap,
  compactCondaEnvListMap,
  compactCondaResultMap,
  formatPoetry,
  formatPoetryCompact,
  compactPoetryMap,
  formatPyenv,
  formatPyenvCompact,
  compactPyenvMap,
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
  PyenvResult,
} from "../src/schemas/index.js";

describe("formatPipInstall", () => {
  it("formats already satisfied install", () => {
    const data: PipInstall = {
      success: true,
      installed: [],
      alreadySatisfied: true,

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

    };
    expect(formatPipInstall(data)).toBe("pip install failed.");
  });
});

describe("formatMypy", () => {
  it("formats clean mypy result", () => {
    const data: MypyResult = {
      success: true,
      diagnostics: [],

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

    };
    const output = formatMypy(data);
    expect(output).toContain("mypy: 1 errors, 0 warnings, 1 notes");
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

      errors: 1,
      warnings: 0,
      notes: 0,
    };
    const output = formatMypy(data);
    expect(output).toContain("app.py:1 error: Cannot find implementation or library stub");
    expect(output).not.toContain("[");
  });
});

describe("formatRuff", () => {
  it("formats clean ruff result", () => {
    const data: RuffResult = {
      success: true,
      diagnostics: [],

    };
    expect(formatRuff(data)).toBe("ruff: no issues found.");
  });

  it("formats ruff result with issues", () => {
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
          message: "Line too long (120 > 88 characters)",
          fixable: false,
        },
      ],

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
      success: true,
      vulnerabilities: [],

    };
    expect(formatPipAudit(data)).toBe("No vulnerabilities found.");
  });

  it("formats audit with vulnerabilities and fix versions", () => {
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
      warnings: 0,
      failures,
    };
    const output = formatPytest(data);

    expect(output).toContain("80 passed, 20 failed");
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
      warnings: 0,

      failures: [],
    };
    const output = formatPytest(data);
    expect(output).toContain("3 errors, 2 skipped");
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
      success: true,
      wouldReformat: [],
    };
    const output = formatBlack(data);
    expect(output).toContain("3 files reformatted, 2 unchanged");
    // Should not list any files
    expect(output.split("\n")).toHaveLength(1);
  });

  it("formats internal error (exit 123)", () => {
    const data: BlackResult = {
      filesChanged: 0,
      filesUnchanged: 0,
      success: false,
      exitCode: 123,
      errorType: "internal_error",
      wouldReformat: [],
    };
    expect(formatBlack(data)).toBe("black: internal error (exit 123). Check for syntax errors.");
  });
});

// ─── pip-list formatter tests ────────────────────────────────────────────────

describe("formatPipList", () => {
  it("formats empty package list", () => {
    const data: PipList = { success: true, packages: [] };
    expect(formatPipList(data)).toBe("No packages installed.");
  });

  it("formats package list with multiple packages", () => {
    const data: PipList = {
      success: true,
      packages: [
        { name: "flask", version: "3.0.0" },
        { name: "requests", version: "2.31.0" },
      ],

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
      checkMode: false,
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
      checkMode: true,
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
  });
});

// ─── conda result dispatcher tests ──────────────────────────────────────────

describe("formatCondaResult", () => {
  it("dispatches list action to formatCondaList", () => {
    const data: CondaList = {
      action: "list",
      packages: [{ name: "numpy", version: "1.26.0", channel: "defaults" }],
      total: 1,
    };
    const output = formatCondaResult(data);
    expect(output).toContain("conda list: 1 packages:");
    expect(output).toContain("numpy==1.26.0 (defaults)");
  });

  it("dispatches info action to formatCondaInfo", () => {
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
    const output = formatCondaResult(data);
    expect(output).toContain("conda 24.1.0");
  });

  it("dispatches env-list action to formatCondaEnvList", () => {
    const data: CondaEnvList = {
      action: "env-list",
      environments: [{ name: "base", path: "/home/user/miniconda3", active: true }],
      total: 1,
    };
    const output = formatCondaResult(data);
    expect(output).toContain("conda environments: 1");
  });

  it("returns unknown action for unrecognised action", () => {
    const data = { action: "bogus" } as unknown as CondaList;
    expect(formatCondaResult(data)).toBe("conda: unknown action.");
  });
});

// ─── conda compact formatter tests ──────────────────────────────────────────

describe("formatCondaListCompact", () => {
  it("formats empty list", () => {
    const data = compactCondaListMap({ action: "list", packages: [], total: 0 } as CondaList);
    expect(formatCondaListCompact(data)).toBe("conda: no packages found.");
  });

  it("formats list with packages and environment", () => {
    const data = compactCondaListMap({
      action: "list",
      packages: [{ name: "numpy", version: "1.26.0", channel: "defaults" }],
      total: 5,
      environment: "myenv",
    } as CondaList);
    expect(formatCondaListCompact(data)).toBe("conda list (env: myenv): 5 packages.");
  });

  it("formats list without environment", () => {
    const data = compactCondaListMap({
      action: "list",
      packages: [{ name: "numpy", version: "1.26.0", channel: "defaults" }],
      total: 3,
    } as CondaList);
    expect(formatCondaListCompact(data)).toBe("conda list: 3 packages.");
  });
});

describe("formatCondaInfoCompact", () => {
  it("formats conda info summary", () => {
    const data = compactCondaInfoMap({
      action: "info",
      condaVersion: "24.1.0",
      platform: "win-64",
      pythonVersion: "3.11.7",
      defaultPrefix: "C:\\miniconda3",
      channels: ["defaults"],
      envsDirs: [],
      pkgsDirs: [],
    } as CondaInfo);
    expect(formatCondaInfoCompact(data)).toBe("conda 24.1.0 (win-64, python 3.11.7)");
  });
});

describe("formatCondaEnvListCompact", () => {
  it("formats empty env list", () => {
    const data = compactCondaEnvListMap({
      action: "env-list",
      environments: [],
      total: 0,
    } as CondaEnvList);
    expect(formatCondaEnvListCompact(data)).toBe("conda: no environments found.");
  });

  it("formats env list with count", () => {
    const data = compactCondaEnvListMap({
      action: "env-list",
      environments: [
        { name: "base", path: "/home/user/miniconda3", active: true },
        { name: "dev", path: "/home/user/miniconda3/envs/dev", active: false },
      ],
      total: 2,
    } as CondaEnvList);
    expect(formatCondaEnvListCompact(data)).toBe("conda: 2 environments.");
  });
});

describe("formatCondaResultCompact", () => {
  it("dispatches compact list", () => {
    const data = compactCondaResultMap({ action: "list", packages: [], total: 0 } as CondaList);
    expect(formatCondaResultCompact(data)).toBe("conda: no packages found.");
  });

  it("dispatches compact info", () => {
    const data = compactCondaResultMap({
      action: "info",
      condaVersion: "24.1.0",
      platform: "linux-64",
      pythonVersion: "3.11.7",
      defaultPrefix: "/home/user/miniconda3",
      channels: [],
      envsDirs: [],
      pkgsDirs: [],
    } as CondaInfo);
    expect(formatCondaResultCompact(data)).toBe("conda 24.1.0 (linux-64, python 3.11.7)");
  });

  it("dispatches compact env-list", () => {
    const data = compactCondaResultMap({
      action: "env-list",
      environments: [{ name: "base", path: "/p", active: true }],
      total: 1,
    } as CondaEnvList);
    expect(formatCondaResultCompact(data)).toBe("conda: 1 environments.");
  });

  it("falls back for unknown action", () => {
    const data = compactCondaResultMap({ action: "bogus" } as unknown as CondaList);
    expect(formatCondaResultCompact(data)).toBe("conda: no packages found.");
  });
});

// ─── pyenv formatter tests ──────────────────────────────────────────────────

describe("formatPyenv", () => {
  it("formats failed action", () => {
    const data: PyenvResult = {
      action: "versions",
      success: false,
      error: "pyenv not found",
    };
    expect(formatPyenv(data)).toBe("pyenv versions failed: pyenv not found");
  });

  it("formats failed action without error message", () => {
    const data: PyenvResult = {
      action: "install",
      success: false,
    };
    expect(formatPyenv(data)).toBe("pyenv install failed: unknown error");
  });

  it("formats versions list with current marker", () => {
    const data: PyenvResult = {
      action: "versions",
      success: true,
      versions: ["3.10.12", "3.11.7", "3.12.1"],
      current: "3.11.7",
    };
    const output = formatPyenv(data);
    expect(output).toContain("3 versions installed:");
    expect(output).toContain("3.10.12");
    expect(output).toContain("3.11.7 *");
    expect(output).toContain("3.12.1");
    expect(output).not.toContain("3.10.12 *");
  });

  it("formats empty versions list", () => {
    const data: PyenvResult = {
      action: "versions",
      success: true,
      versions: [],
    };
    expect(formatPyenv(data)).toBe("pyenv: no versions installed.");
  });

  it("formats current version", () => {
    const data: PyenvResult = {
      action: "version",
      success: true,
      current: "3.11.7",
    };
    expect(formatPyenv(data)).toBe("pyenv: current version is 3.11.7");
  });

  it("formats version when not set", () => {
    const data: PyenvResult = {
      action: "version",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: no version set.");
  });

  it("formats install with version", () => {
    const data: PyenvResult = {
      action: "install",
      success: true,
      installed: "3.12.1",
    };
    expect(formatPyenv(data)).toBe("pyenv: installed Python 3.12.1");
  });

  it("formats install without version detail", () => {
    const data: PyenvResult = {
      action: "install",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: installation completed.");
  });

  it("formats local version set", () => {
    const data: PyenvResult = {
      action: "local",
      success: true,
      localVersion: "3.11.7",
    };
    expect(formatPyenv(data)).toBe("pyenv: local version set to 3.11.7");
  });

  it("formats local without version detail", () => {
    const data: PyenvResult = {
      action: "local",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: local version set.");
  });

  it("formats global version set", () => {
    const data: PyenvResult = {
      action: "global",
      success: true,
      globalVersion: "3.12.1",
    };
    expect(formatPyenv(data)).toBe("pyenv: global version set to 3.12.1");
  });

  it("formats global without version detail", () => {
    const data: PyenvResult = {
      action: "global",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: global version set.");
  });
});

describe("formatPyenvCompact", () => {
  it("formats failed action", () => {
    const data = compactPyenvMap({
      action: "install",
      success: false,
      error: "not found",
    } as PyenvResult);
    expect(formatPyenvCompact(data)).toBe("pyenv install failed.");
  });

  it("formats successful action", () => {
    const data = compactPyenvMap({
      action: "versions",
      success: true,
      versions: ["3.11.7"],
    } as PyenvResult);
    expect(formatPyenvCompact(data)).toBe("pyenv versions: success.");
  });
});

// ─── poetry formatter tests ─────────────────────────────────────────────────

describe("formatPoetry", () => {
  it("formats failed action", () => {
    const data: PoetryResult = {
      success: false,
    };
    expect(formatPoetry(data, "install")).toBe("poetry install failed.");
  });

  it("formats show with packages", () => {
    const data: PoetryResult = {
      success: true,
      packages: [
        { name: "requests", version: "2.31.0" },
        { name: "flask", version: "3.0.0" },
      ],
    };
    const output = formatPoetry(data, "show");
    expect(output).toContain("2 packages:");
    expect(output).toContain("requests==2.31.0");
    expect(output).toContain("flask==3.0.0");
  });

  it("formats show with no packages", () => {
    const data: PoetryResult = {
      success: true,
      packages: [],
    };
    expect(formatPoetry(data, "show")).toBe("No packages found.");
  });

  it("formats build with artifacts", () => {
    const data: PoetryResult = {
      success: true,
      artifacts: [{ file: "mypackage-1.0.0.tar.gz" }, { file: "mypackage-1.0.0-py3-none-any.whl" }],
    };
    const output = formatPoetry(data, "build");
    expect(output).toContain("Built 2 artifacts:");
    expect(output).toContain("mypackage-1.0.0.tar.gz");
    expect(output).toContain("mypackage-1.0.0-py3-none-any.whl");
  });

  it("formats build with no artifacts", () => {
    const data: PoetryResult = {
      success: true,
      artifacts: [],
    };
    expect(formatPoetry(data, "build")).toBe("poetry build: no artifacts produced.");
  });

  it("formats install with packages", () => {
    const data: PoetryResult = {
      success: true,
      packages: [{ name: "requests", version: "2.31.0" }],
    };
    const output = formatPoetry(data, "install");
    expect(output).toContain("poetry install: 1 packages:");
    expect(output).toContain("requests==2.31.0");
  });

  it("formats install with no changes", () => {
    const data: PoetryResult = {
      success: true,
      packages: [],
    };
    expect(formatPoetry(data, "install")).toBe("poetry install: no changes.");
  });

  it("formats add with packages", () => {
    const data: PoetryResult = {
      success: true,
      packages: [
        { name: "certifi", version: "2023.7.22" },
        { name: "requests", version: "2.31.0" },
      ],
    };
    const output = formatPoetry(data, "add");
    expect(output).toContain("poetry add: 2 packages:");
    expect(output).toContain("certifi==2023.7.22");
  });

  it("formats remove with packages", () => {
    const data: PoetryResult = {
      success: true,
      packages: [{ name: "requests", version: "2.31.0" }],
    };
    const output = formatPoetry(data, "remove");
    expect(output).toContain("poetry remove: 1 packages:");
    expect(output).toContain("requests==2.31.0");
  });
});

// ─── poetry compact formatter tests ─────────────────────────────────────────

describe("formatPoetryCompact", () => {
  it("formats failed action", () => {
    const data = compactPoetryMap({
      success: false,

    } as PoetryResult);
    expect(formatPoetryCompact(data)).toBe("poetry: failed.");
  });

  it("formats successful action", () => {
    const data = compactPoetryMap({
      success: true,
      packages: [
        { name: "requests", version: "2.31.0" },
        { name: "flask", version: "3.0.0" },
      ],
    } as PoetryResult);
    expect(formatPoetryCompact(data)).toBe("poetry: success.");
  });
});

// ─── P1 Gap Formatter Tests ──────────────────────────────────────────────

describe("formatMypy — notes separated", () => {
  it("formats result with separate notes and warnings", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: [
        { file: "a.py", line: 1, severity: "error", message: "err", code: "misc" },
        { file: "b.py", line: 2, severity: "warning", message: "warn", code: "unused-ignore" },
        { file: "c.py", line: 3, severity: "note", message: "info" },
      ],

    };
    const output = formatMypy(data);
    expect(output).toContain("mypy: 1 errors, 1 warnings, 1 notes");
  });
});

describe("formatPipAudit — severity fields", () => {
  it("includes severity and CVSS score in output", () => {
    const data: PipAuditResult = {
      success: false,

      vulnerabilities: [
        {
          name: "requests",
          version: "2.25.0",
          id: "PYSEC-2023-001",
          description: "SSRF vulnerability",
          fixVersions: ["2.31.0"],
          severity: "HIGH",
          cvssScore: 8.1,
        },
      ],
    };
    const output = formatPipAudit(data);
    expect(output).toContain("[HIGH]");
    expect(output).toContain("CVSS:8.1");
  });
});

describe("formatPipList — error surfacing", () => {
  it("formats error in output", () => {
    const data: PipList = {
      success: false,
      packages: [],

      error: "Failed to parse JSON",
    };
    expect(formatPipList(data)).toContain("pip list error: Failed to parse JSON");
  });
});

describe("formatPipShow — multiple packages", () => {
  it("formats multiple packages with separator", () => {
    const data: PipShow = {
      success: true,
      name: "requests",
      version: "2.31.0",
      summary: "HTTP library",
      packages: [
        { name: "requests", version: "2.31.0", summary: "HTTP library" },
        { name: "flask", version: "3.0.0", summary: "Web framework" },
      ],
    };
    const output = formatPipShow(data);
    expect(output).toContain("requests==2.31.0");
    expect(output).toContain("flask==3.0.0");
    expect(output).toContain("---");
  });
});

describe("formatPyenv — uninstall", () => {
  it("formats successful uninstall with version", () => {
    const data: PyenvResult = {
      action: "uninstall",
      success: true,
      uninstalled: "3.10.13",
    };
    expect(formatPyenv(data)).toBe("pyenv: uninstalled Python 3.10.13");
  });

  it("formats uninstall without version info", () => {
    const data: PyenvResult = {
      action: "uninstall",
      success: true,
    };
    expect(formatPyenv(data)).toBe("pyenv: uninstall completed.");
  });

  it("formats failed uninstall", () => {
    const data: PyenvResult = {
      action: "uninstall",
      success: false,
      error: "version not installed",
    };
    expect(formatPyenv(data)).toBe("pyenv uninstall failed: version not installed");
  });
});

describe("formatPytest — warnings in output", () => {
  it("includes warnings in formatted output", () => {
    const data: PytestResult = {
      success: true,
      passed: 10,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 3,

      failures: [],
    };
    const output = formatPytest(data);
    expect(output).toContain("3 warnings");
  });

  it("omits warnings from output when zero", () => {
    const data: PytestResult = {
      success: true,
      passed: 5,
      failed: 0,
      errors: 0,
      skipped: 0,
      warnings: 0,

      failures: [],
    };
    const output = formatPytest(data);
    expect(output).not.toContain("warnings");
  });
});

describe("formatRuff — fixApplicability", () => {
  it("includes fix applicability in formatted output", () => {
    const data: RuffResult = {
      success: false,

      diagnostics: [
        {
          file: "a.py",
          line: 1,
          column: 1,
          code: "F401",
          message: "unused import",
          fixable: true,
          fixApplicability: "safe",
        },
      ],
    };
    const output = formatRuff(data);
    expect(output).toContain("[fix: safe]");
  });

  it("omits fix applicability when not present", () => {
    const data: RuffResult = {
      success: false,

      diagnostics: [
        {
          file: "a.py",
          line: 1,
          column: 1,
          code: "E501",
          message: "line too long",
          fixable: false,
        },
      ],
    };
    const output = formatRuff(data);
    expect(output).not.toContain("[fix:");
  });
});
