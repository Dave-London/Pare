import { describe, it, expect } from "vitest";
import {
  parsePipInstall,
  parseMypyJsonOutput,
  parseMypyTextOutput,
  parseRuffJson,
  parseRuffFormatOutput,
  parsePipAuditJson,
  parsePoetryOutput,
} from "../src/lib/parsers.js";

// Epic #1024: parsers must never return a zeroed/empty result on a failed run
// without surfacing WHY (error + exitCode). Fixtures below are real CLI output.

// ── pip-audit ────────────────────────────────────────────────────────

describe("parsePipAuditJson — silent failures (#1024)", () => {
  // Real pip-audit stderr when the vulnerability service is unreachable
  const auditCrashStderr =
    "ERROR:pip_audit._cli:Vulnerability service PyPI returned an error: " +
    "HTTPSConnectionPool(host='pypi.org', port=443): Max retries exceeded";

  it("surfaces a crashed audit instead of reporting 0 vulnerabilities", () => {
    const result = parsePipAuditJson("", 1, auditCrashStderr);

    expect(result.success).toBe(false);
    expect(result.vulnerabilities).toEqual([]);
    expect(result.error).toContain("Vulnerability service PyPI returned an error");
    expect(result.exitCode).toBe(1);
  });

  it("does NOT attach error when exit 1 comes from found vulnerabilities", () => {
    const stdout = JSON.stringify({
      dependencies: [
        {
          name: "requests",
          version: "2.25.0",
          vulns: [{ id: "PYSEC-2023-001", description: "bad", fix_versions: ["2.31.0"] }],
        },
      ],
    });
    const result = parsePipAuditJson(stdout, 1, "");

    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("attaches error on non-zero exit with valid JSON but no vulnerabilities (e.g. --strict skip)", () => {
    const stdout = JSON.stringify({ dependencies: [] });
    const result = parsePipAuditJson(
      stdout,
      1,
      "ERROR: dependency 'local-pkg' could not be audited",
    );

    expect(result.vulnerabilities).toEqual([]);
    expect(result.error).toContain("could not be audited");
    expect(result.exitCode).toBe(1);
  });

  it("leaves clean successful audits unchanged", () => {
    const result = parsePipAuditJson(JSON.stringify({ dependencies: [] }), 0, "");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("attaches a fallback message when the crash produced no output at all", () => {
    const result = parsePipAuditJson("", 1, "");

    expect(result.error).toContain("exited with code 1");
    expect(result.exitCode).toBe(1);
  });
});

// ── mypy ─────────────────────────────────────────────────────────────

describe("parseMypyJsonOutput — silent failures (#1024)", () => {
  it("surfaces usage/config errors (exit 2) with empty output", () => {
    // mypy writes usage errors to stderr and produces no JSON on stdout
    const stderr = "mypy: error: Cannot find config file 'missing.ini'";
    const result = parseMypyJsonOutput("", 2, stderr);

    expect(result.success).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.error).toBe(stderr);
    expect(result.exitCode).toBe(2);
  });

  it("does NOT attach error for exit 1 with parsed diagnostics (normal type errors)", () => {
    const stdout = JSON.stringify([
      {
        file: "src/main.py",
        line: 10,
        column: 5,
        message: "Incompatible return value type",
        hint: null,
        code: "return-value",
        severity: "error",
      },
    ]);
    const result = parseMypyJsonOutput(stdout, 1, "");

    expect(result.diagnostics).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("attaches stderr alongside diagnostics when exit > 1", () => {
    // mypy exits 2 on blocking errors but may still emit diagnostics
    const stdout = JSON.stringify([
      {
        file: "src/broken.py",
        line: 3,
        column: 1,
        message: "invalid syntax",
        hint: null,
        code: "syntax",
        severity: "error",
      },
    ]);
    const stderr = "Found 1 error in 1 file (errors prevented further checking)";
    const result = parseMypyJsonOutput(stdout, 2, stderr);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.error).toBe(stderr);
    expect(result.exitCode).toBe(2);
  });

  it("surfaces failures through the text-parsing fallback too", () => {
    const stderr = "mypy: error: Invalid value for --python-version: 'not-a-version'";
    const result = parseMypyTextOutput("", 2, stderr);

    expect(result.diagnostics).toEqual([]);
    expect(result.error).toBe(stderr);
    expect(result.exitCode).toBe(2);
  });

  it("leaves clean runs unchanged", () => {
    const result = parseMypyJsonOutput("[]", 0, "");

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ── ruff check ───────────────────────────────────────────────────────

describe("parseRuffJson — silent failures (#1024)", () => {
  it("surfaces unparseable output on non-zero exit (config error)", () => {
    // Real ruff stderr shape for a broken config file (exit 2, no JSON on stdout)
    const stderr =
      "ruff failed\n  Cause: Failed to parse C:\\proj\\ruff.toml\n" +
      "  Cause: TOML parse error at line 1, column 1";
    const result = parseRuffJson("", 2, stderr);

    expect(result.success).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.error).toContain("Failed to parse");
    expect(result.exitCode).toBe(2);
  });

  it("does NOT attach error when JSON parses (violations found, exit 1)", () => {
    const stdout = JSON.stringify([
      {
        code: "F401",
        message: "'os' imported but unused",
        filename: "main.py",
        location: { row: 1, column: 1 },
      },
    ]);
    const result = parseRuffJson(stdout, 1, "");

    expect(result.diagnostics).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("keeps the old empty result for unparseable output at exit 0", () => {
    const result = parseRuffJson("not json", 0, "");

    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.error).toBeUndefined();
  });
});

// ── ruff format ──────────────────────────────────────────────────────

describe("parseRuffFormatOutput — silent failures (#1024)", () => {
  it("surfaces stderr on non-zero exit with no file matches", () => {
    const stderr =
      "ruff failed\n  Cause: Failed to parse C:\\proj\\pyproject.toml\n" +
      "  Cause: TOML parse error at line 12, column 3";
    const result = parseRuffFormatOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
    expect(result.error).toContain("Failed to parse");
    expect(result.exitCode).toBe(2);
  });

  it("does NOT attach error for check-mode exit 1 with matched files", () => {
    const stderr = "Would reformat: src/main.py\n1 file would be reformatted";
    const result = parseRuffFormatOutput("", stderr, 1);

    expect(result.filesChanged).toBe(1);
    expect(result.checkMode).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });
});

// ── pip install ──────────────────────────────────────────────────────

describe("parsePipInstall — ERROR line capture (#1024)", () => {
  // Real pip 25.2 stderr for a nonexistent package (exit 1), captured on Windows
  const pipErrorStderr =
    "ERROR: Could not find a version that satisfies the requirement " +
    "nonexistent-package-xyz-12345 (from versions: none)\n" +
    "ERROR: No matching distribution found for nonexistent-package-xyz-12345";

  it("captures pip ERROR: lines into error on failure", () => {
    const result = parsePipInstall("", pipErrorStderr, 1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Could not find a version that satisfies");
    expect(result.error).toContain("No matching distribution found");
    expect(result.exitCode).toBe(1);
  });

  it("falls back to raw stderr when the failure has no ERROR: lines", () => {
    const stderr = "Traceback (most recent call last):\n  MemoryError";
    const result = parsePipInstall("", stderr, 2);

    expect(result.error).toContain("MemoryError");
    expect(result.exitCode).toBe(2);
  });

  it("does not attach error on successful installs with warnings", () => {
    const stdout = "Successfully installed requests-2.31.0";
    const stderr = "WARNING: You are using pip version 25.2";
    const result = parsePipInstall(stdout, stderr, 0);

    expect(result.success).toBe(true);
    expect(result.installed).toEqual([{ name: "requests", version: "2.31.0" }]);
    expect(result.warnings).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });
});

// ── poetry ───────────────────────────────────────────────────────────

describe("parsePoetryOutput — messages fallback (#1024)", () => {
  // Real poetry error when run outside a project
  const noPyprojectStderr =
    "Poetry could not find a pyproject.toml file in C:\\proj or its parents";

  it("keeps raw output lines as messages when install parses nothing", () => {
    const result = parsePoetryOutput("", noPyprojectStderr, 1, "install");

    expect(result.success).toBe(false);
    expect(result.packages).toEqual([]);
    expect(result.messages).toEqual([noPyprojectStderr]);
  });

  it("keeps raw output lines as messages when show parses nothing", () => {
    const result = parsePoetryOutput("", noPyprojectStderr, 1, "show");

    expect(result.packages).toEqual([]);
    expect(result.messages).toEqual([noPyprojectStderr]);
  });

  it("keeps raw output lines as messages when build parses nothing", () => {
    const stderr = "No file/folder found for package broken-project";
    const result = parsePoetryOutput("", stderr, 1, "build");

    expect(result.artifacts).toEqual([]);
    expect(result.messages).toEqual([stderr]);
  });

  it("attaches a fallback error when a failed run produced no output at all", () => {
    const result = parsePoetryOutput("", "", 1, "add");

    expect(result.success).toBe(false);
    expect(result.error).toContain("exited with code 1");
    expect(result.exitCode).toBe(1);
  });

  it("does not add messages when packages were parsed", () => {
    const stdout = "  - Installing requests (2.31.0)\n  - Installing flask (3.0.0)";
    const result = parsePoetryOutput(stdout, "", 0, "install");

    expect(result.packages).toEqual([
      { name: "requests", version: "2.31.0" },
      { name: "flask", version: "3.0.0" },
    ]);
    expect(result.messages).toBeUndefined();
    expect(result.error).toBeUndefined();
  });
});
