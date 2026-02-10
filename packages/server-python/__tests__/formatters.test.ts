import { describe, it, expect } from "vitest";
import { formatPipInstall, formatMypy, formatRuff, formatPipAudit } from "../src/lib/formatters.js";
import type { PipInstall, MypyResult, RuffResult, PipAuditResult } from "../src/schemas/index.js";

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
