/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from raw Python tool CLI output.
 *
 * These tests use realistic fixture data representing actual CLI output
 * from pip, mypy, ruff, and pip-audit. No Python installation required.
 */
import { describe, it, expect } from "vitest";
import {
  parsePipInstall,
  parseMypyOutput,
  parseRuffJson,
  parsePipAuditJson,
  parsePytestOutput,
  parseUvInstall,
  parseUvRun,
  parseBlackOutput,
} from "../src/lib/parsers.js";

// ─── pip install fixtures ─────────────────────────────────────────────────────

const PIP_INSTALL_SUCCESS =
  "Collecting requests\n" +
  "  Downloading requests-2.31.0-py3-none-any.whl (62 kB)\n" +
  "Collecting urllib3<3,>=1.21.1\n" +
  "  Downloading urllib3-2.0.7-py3-none-any.whl (124 kB)\n" +
  "Installing collected packages: urllib3, requests\n" +
  "Successfully installed requests-2.31.0 urllib3-2.0.7";

const PIP_INSTALL_ALREADY_SATISFIED =
  "Requirement already satisfied: requests in /usr/lib/python3.11/site-packages (2.31.0)\n" +
  "Requirement already satisfied: urllib3<3,>=1.21.1 in /usr/lib/python3.11/site-packages (2.0.7)";

const PIP_INSTALL_FAILURE_STDERR =
  "ERROR: Could not find a version that satisfies the requirement nonexistent-pkg-xyz (from versions: none)\n" +
  "ERROR: No matching distribution found for nonexistent-pkg-xyz";

// ─── mypy fixtures ────────────────────────────────────────────────────────────

const MYPY_SINGLE_ERROR =
  'src/main.py:10:5: error: Incompatible types in assignment (expression has type "str", variable has type "int") [assignment]\n' +
  "Found 1 error in 1 file (checked 3 source files)";

const MYPY_MULTIPLE_DIAGNOSTICS =
  'src/main.py:10: error: Argument 1 to "foo" has incompatible type "str"; expected "int"  [arg-type]\n' +
  'src/main.py:20:5: error: Name "bar" is not defined  [name-defined]\n' +
  'src/utils.py:3:1: error: Cannot find implementation or library stub for module named "missing"  [import-not-found]\n' +
  'src/models.py:45:10: error: Incompatible return value type (got "None", expected "str")  [return-value]\n' +
  "Found 4 errors in 3 files (checked 10 source files)";

const MYPY_WARNINGS_AND_NOTES =
  'src/main.py:5: warning: Unused "type: ignore" comment  [unused-ignore]\n' +
  "src/main.py:10:5: error: Incompatible types in assignment [assignment]\n" +
  "src/main.py:10: note: See https://mypy.readthedocs.io/en/stable/error_code_list.html for more info\n" +
  "Found 1 error in 1 file (checked 2 source files)";

const MYPY_CLEAN = "Success: no issues found in 5 source files";

// ─── ruff fixtures ────────────────────────────────────────────────────────────

const RUFF_SINGLE_VIOLATION = JSON.stringify([
  {
    code: "F401",
    message: "`os` imported but unused",
    filename: "src/main.py",
    location: { row: 1, column: 1 },
    end_location: { row: 1, column: 10 },
    fix: { applicability: "safe", message: "Remove unused import: `os`" },
  },
]);

const RUFF_MULTIPLE_VIOLATIONS = JSON.stringify([
  {
    code: "F401",
    message: "`os` imported but unused",
    filename: "src/main.py",
    location: { row: 1, column: 1 },
    end_location: { row: 1, column: 10 },
    fix: { applicability: "safe", message: "Remove unused import: `os`" },
  },
  {
    code: "E501",
    message: "Line too long (120 > 88)",
    filename: "src/main.py",
    location: { row: 15, column: 89 },
    end_location: { row: 15, column: 120 },
    fix: null,
  },
  {
    code: "F841",
    message: "Local variable `x` is assigned to but never used",
    filename: "src/utils.py",
    location: { row: 22, column: 5 },
    end_location: { row: 22, column: 6 },
    fix: { applicability: "safe", message: "Remove assignment to unused variable `x`" },
  },
  {
    code: "W291",
    message: "Trailing whitespace",
    filename: "tests/test_main.py",
    location: { row: 8, column: 30 },
    end_location: { row: 8, column: 32 },
    fix: { applicability: "safe", message: "Remove trailing whitespace" },
  },
]);

const RUFF_EMPTY = "[]";

// ─── pip-audit fixtures ───────────────────────────────────────────────────────

const PIP_AUDIT_VULNS = JSON.stringify({
  dependencies: [
    {
      name: "requests",
      version: "2.25.0",
      vulns: [
        {
          id: "PYSEC-2023-74",
          description: "Unintended leak of Proxy-Authorization header",
          fix_versions: ["2.31.0"],
        },
      ],
    },
    {
      name: "flask",
      version: "2.3.0",
      vulns: [],
    },
    {
      name: "urllib3",
      version: "1.26.5",
      vulns: [
        {
          id: "PYSEC-2023-212",
          description: "Cookie request header isn't stripped during cross-origin redirects",
          fix_versions: ["1.26.17", "2.0.6"],
        },
      ],
    },
  ],
});

const PIP_AUDIT_CLEAN = JSON.stringify({
  dependencies: [
    { name: "requests", version: "2.31.0", vulns: [] },
    { name: "flask", version: "3.0.0", vulns: [] },
    { name: "urllib3", version: "2.1.0", vulns: [] },
  ],
});

const PIP_AUDIT_MULTI_VULN_SAME_PKG = JSON.stringify({
  dependencies: [
    {
      name: "django",
      version: "3.2.0",
      vulns: [
        {
          id: "CVE-2023-36053",
          description:
            "Potential regular expression denial of service in EmailValidator/URLValidator",
          fix_versions: ["3.2.20", "4.1.10", "4.2.3"],
        },
        {
          id: "CVE-2023-41164",
          description: "Potential denial of service in django.utils.encoding.uri_to_iri()",
          fix_versions: ["3.2.21", "4.1.11", "4.2.5"],
        },
        {
          id: "CVE-2024-24680",
          description: "Potential denial-of-service in intcomma template filter",
          fix_versions: ["3.2.24", "4.2.10", "5.0.2"],
        },
      ],
    },
    {
      name: "flask",
      version: "3.0.0",
      vulns: [],
    },
  ],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fidelity: pip install", () => {
  it("preserves every installed package name and version", () => {
    const result = parsePipInstall(PIP_INSTALL_SUCCESS, "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.installed).toHaveLength(2);

    // Verify both packages are captured with correct name-version split
    const names = result.installed.map((p) => p.name);
    const versions = result.installed.map((p) => p.version);

    expect(names).toContain("requests");
    expect(names).toContain("urllib3");
    expect(versions).toContain("2.31.0");
    expect(versions).toContain("2.0.7");

    // Verify the exact pairing
    const requests = result.installed.find((p) => p.name === "requests")!;
    expect(requests.version).toBe("2.31.0");

    const urllib3 = result.installed.find((p) => p.name === "urllib3")!;
    expect(urllib3.version).toBe("2.0.7");
  });

  it("detects already-satisfied requirements", () => {
    const result = parsePipInstall(PIP_INSTALL_ALREADY_SATISFIED, "", 0);

    expect(result.success).toBe(true);
    expect(result.alreadySatisfied).toBe(true);
    expect(result.installed).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("reports failure on non-zero exit code", () => {
    const result = parsePipInstall("", PIP_INSTALL_FAILURE_STDERR, 1);

    expect(result.success).toBe(false);
    expect(result.installed).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.alreadySatisfied).toBe(false);
  });

  it("handles mixed already-satisfied with new installs", () => {
    const stdout =
      "Requirement already satisfied: urllib3 in /usr/lib/python3.11/site-packages (2.0.7)\n" +
      "Collecting requests\n" +
      "  Downloading requests-2.31.0-py3-none-any.whl (62 kB)\n" +
      "Successfully installed requests-2.31.0";

    const result = parsePipInstall(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.alreadySatisfied).toBe(true);
    expect(result.installed).toHaveLength(1);
    expect(result.installed[0].name).toBe("requests");
    expect(result.installed[0].version).toBe("2.31.0");
    expect(result.total).toBe(1);
  });
});

describe("fidelity: mypy", () => {
  it("parses single error with file, line, column, severity, message, and code", () => {
    const result = parseMypyOutput(MYPY_SINGLE_ERROR, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);

    const diag = result.diagnostics[0];
    expect(diag.file).toBe("src/main.py");
    expect(diag.line).toBe(10);
    expect(diag.column).toBe(5);
    expect(diag.severity).toBe("error");
    expect(diag.message).toContain("Incompatible types in assignment");
    expect(diag.code).toBe("assignment");
  });

  it("parses multiple diagnostics across files", () => {
    const result = parseMypyOutput(MYPY_MULTIPLE_DIAGNOSTICS, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(4);
    expect(result.errors).toBe(4);
    expect(result.warnings).toBe(0);

    // Verify all files are represented
    const files = result.diagnostics.map((d) => d.file);
    expect(files).toContain("src/main.py");
    expect(files).toContain("src/utils.py");
    expect(files).toContain("src/models.py");

    // Verify specific diagnostics
    const importDiag = result.diagnostics.find((d) => d.code === "import-not-found")!;
    expect(importDiag.file).toBe("src/utils.py");
    expect(importDiag.line).toBe(3);
    expect(importDiag.column).toBe(1);

    const returnDiag = result.diagnostics.find((d) => d.code === "return-value")!;
    expect(returnDiag.file).toBe("src/models.py");
    expect(returnDiag.line).toBe(45);
    expect(returnDiag.column).toBe(10);
  });

  it("distinguishes warning and note severity levels", () => {
    const result = parseMypyOutput(MYPY_WARNINGS_AND_NOTES, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
    // warnings count includes both "warning" and "note" severity
    expect(result.warnings).toBe(2);

    const warning = result.diagnostics.find((d) => d.severity === "warning")!;
    expect(warning.file).toBe("src/main.py");
    expect(warning.line).toBe(5);
    expect(warning.code).toBe("unused-ignore");

    const note = result.diagnostics.find((d) => d.severity === "note")!;
    expect(note.file).toBe("src/main.py");
    expect(note.line).toBe(10);
    expect(note.message).toContain("https://mypy.readthedocs.io");

    const error = result.diagnostics.find((d) => d.severity === "error")!;
    expect(error.line).toBe(10);
    expect(error.column).toBe(5);
    expect(error.code).toBe("assignment");
  });

  it("handles clean file with no diagnostics", () => {
    const result = parseMypyOutput(MYPY_CLEAN, 0);

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
  });

  it("preserves column as undefined when not present in output", () => {
    const stdout = 'src/main.py:10: error: Argument 1 to "foo" has incompatible type  [arg-type]';
    const result = parseMypyOutput(stdout, 1);

    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBeUndefined();
  });
});

describe("fidelity: ruff", () => {
  it("parses single violation with fix available", () => {
    const result = parseRuffJson(RUFF_SINGLE_VIOLATION);

    expect(result.total).toBe(1);
    expect(result.fixable).toBe(1);

    const diag = result.diagnostics[0];
    expect(diag.file).toBe("src/main.py");
    expect(diag.line).toBe(1);
    expect(diag.column).toBe(1);
    expect(diag.endLine).toBe(1);
    expect(diag.endColumn).toBe(10);
    expect(diag.code).toBe("F401");
    expect(diag.message).toBe("`os` imported but unused");
    expect(diag.fixable).toBe(true);
  });

  it("parses multiple violations across files", () => {
    const result = parseRuffJson(RUFF_MULTIPLE_VIOLATIONS);

    expect(result.total).toBe(4);

    // Verify all files are represented
    const files = [...new Set(result.diagnostics.map((d) => d.file))];
    expect(files).toContain("src/main.py");
    expect(files).toContain("src/utils.py");
    expect(files).toContain("tests/test_main.py");

    // Verify all codes are captured
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("F401");
    expect(codes).toContain("E501");
    expect(codes).toContain("F841");
    expect(codes).toContain("W291");
  });

  it("preserves accurate fixable count", () => {
    const result = parseRuffJson(RUFF_MULTIPLE_VIOLATIONS);

    // F401, F841, and W291 have fix objects; E501 has fix: null
    expect(result.fixable).toBe(3);

    const e501 = result.diagnostics.find((d) => d.code === "E501")!;
    expect(e501.fixable).toBe(false);

    const fixableDiags = result.diagnostics.filter((d) => d.fixable);
    expect(fixableDiags).toHaveLength(3);
  });

  it("handles empty JSON array (clean code)", () => {
    const result = parseRuffJson(RUFF_EMPTY);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.fixable).toBe(0);
  });

  it("preserves end_location for range information", () => {
    const result = parseRuffJson(RUFF_MULTIPLE_VIOLATIONS);

    const f841 = result.diagnostics.find((d) => d.code === "F841")!;
    expect(f841.line).toBe(22);
    expect(f841.column).toBe(5);
    expect(f841.endLine).toBe(22);
    expect(f841.endColumn).toBe(6);
  });
});

describe("fidelity: pip-audit", () => {
  it("preserves vulnerabilities with fix versions", () => {
    const result = parsePipAuditJson(PIP_AUDIT_VULNS);

    expect(result.total).toBe(2);
    expect(result.vulnerabilities).toHaveLength(2);

    const reqVuln = result.vulnerabilities.find((v) => v.name === "requests")!;
    expect(reqVuln.version).toBe("2.25.0");
    expect(reqVuln.id).toBe("PYSEC-2023-74");
    expect(reqVuln.description).toContain("Proxy-Authorization");
    expect(reqVuln.fixVersions).toEqual(["2.31.0"]);

    const urlVuln = result.vulnerabilities.find((v) => v.name === "urllib3")!;
    expect(urlVuln.version).toBe("1.26.5");
    expect(urlVuln.id).toBe("PYSEC-2023-212");
    expect(urlVuln.fixVersions).toEqual(["1.26.17", "2.0.6"]);
  });

  it("handles no vulnerabilities", () => {
    const result = parsePipAuditJson(PIP_AUDIT_CLEAN);

    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("preserves multiple vulnerabilities for same package", () => {
    const result = parsePipAuditJson(PIP_AUDIT_MULTI_VULN_SAME_PKG);

    // Django has 3 vulns, flask has 0
    expect(result.total).toBe(3);
    expect(result.vulnerabilities).toHaveLength(3);

    // All three should reference django
    const djangoVulns = result.vulnerabilities.filter((v) => v.name === "django");
    expect(djangoVulns).toHaveLength(3);

    // Verify each vulnerability ID is preserved
    const ids = djangoVulns.map((v) => v.id);
    expect(ids).toContain("CVE-2023-36053");
    expect(ids).toContain("CVE-2023-41164");
    expect(ids).toContain("CVE-2024-24680");

    // Verify all point to same version
    for (const vuln of djangoVulns) {
      expect(vuln.version).toBe("3.2.0");
    }

    // Verify fix versions are preserved for each
    const cve36053 = djangoVulns.find((v) => v.id === "CVE-2023-36053")!;
    expect(cve36053.fixVersions).toEqual(["3.2.20", "4.1.10", "4.2.3"]);

    const cve24680 = djangoVulns.find((v) => v.id === "CVE-2024-24680")!;
    expect(cve24680.fixVersions).toEqual(["3.2.24", "4.2.10", "5.0.2"]);
  });

  it("skips packages with empty vulns arrays", () => {
    const result = parsePipAuditJson(PIP_AUDIT_VULNS);

    // flask has vulns: [] so should not appear in vulnerabilities
    const flaskVulns = result.vulnerabilities.filter((v) => v.name === "flask");
    expect(flaskVulns).toHaveLength(0);
  });
});

// ─── pytest fixtures ─────────────────────────────────────────────────────────

const PYTEST_ALL_PASSING = [
  "test_math.py .....",
  "",
  "========================= 5 passed in 0.32s =========================",
].join("\n");

const PYTEST_MIXED_RESULTS = [
  "test_math.py ..F.s",
  "test_strings.py .F",
  "",
  "_____________________________ test_subtract _____________________________",
  "",
  "    def test_subtract():",
  ">       assert 5 - 3 == 1",
  "E       assert 2 == 1",
  "E        +  where 2 = 5 - 3",
  "",
  "test_math.py:12: AssertionError",
  "_____________________________ test_upper _____________________________",
  "",
  '    def test_upper():',
  '>       assert "hello".upper() == "WORLD"',
  "E       AssertionError: assert 'HELLO' == 'WORLD'",
  "E         - WORLD",
  "E         + HELLO",
  "",
  "test_strings.py:8: AssertionError",
  "========================= short test summary info =========================",
  "FAILED test_math.py::test_subtract",
  "FAILED test_strings.py::test_upper",
  "==================== 3 passed, 2 failed, 1 skipped in 1.24s ====================",
].join("\n");

const PYTEST_NO_TESTS_RAN = [
  "========================= no tests ran in 0.01s =========================",
].join("\n");

// ─── uv install fixtures ─────────────────────────────────────────────────────

const UV_INSTALL_SUCCESS = [
  "Resolved 5 packages in 320ms",
  "Prepared 5 packages in 500ms",
  "Installed 5 packages in 120ms",
  " + flask==3.0.0",
  " + jinja2==3.1.2",
  " + markupsafe==2.1.3",
  " + werkzeug==3.0.1",
  " + itsdangerous==2.1.2",
].join("\n");

const UV_INSTALL_ALREADY_SATISFIED = [
  "Audited 5 packages in 10ms",
].join("\n");

// ─── uv run fixtures ────────────────────────────────────────────────────────

// Simple stdout passthrough
const UV_RUN_STDOUT = "Hello from Python script!\nProcessed 42 items.\n";
const UV_RUN_STDERR = "";

// Mixed stdout/stderr
const UV_RUN_MIXED_STDOUT = "Result: 3.14159\n";
const UV_RUN_MIXED_STDERR = "DeprecationWarning: use math.tau instead\n";

// ─── black fixtures ──────────────────────────────────────────────────────────

const BLACK_CHECK_MODE_DIRTY = [
  "would reformat src/main.py",
  "would reformat src/utils.py",
  "would reformat tests/test_main.py",
  "Oh no! 3 files would be reformatted, 7 files would be left unchanged.",
].join("\n");

const BLACK_FORMAT_MODE_CHANGED = [
  "reformatted src/main.py",
  "reformatted src/utils.py",
  "All done! 2 files reformatted, 5 files left unchanged.",
].join("\n");

const BLACK_ALL_CLEAN = "All done! 10 files would be left unchanged.";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fidelity: pytest", () => {
  it("preserves pass count and duration for all-passing suite", () => {
    const result = parsePytestOutput(PYTEST_ALL_PASSING, "", 0);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(5);
    expect(result.duration).toBe(0.32);
    expect(result.failures).toEqual([]);
  });

  it("preserves mixed results with failure details", () => {
    const result = parsePytestOutput(PYTEST_MIXED_RESULTS, "", 1);

    expect(result.success).toBe(false);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(6);
    expect(result.duration).toBe(1.24);

    // Verify failure details are preserved
    expect(result.failures).toHaveLength(2);

    const subtractFailure = result.failures.find((f) => f.test === "test_subtract")!;
    expect(subtractFailure).toBeDefined();
    expect(subtractFailure.message).toContain("assert 2 == 1");

    const upperFailure = result.failures.find((f) => f.test === "test_upper")!;
    expect(upperFailure).toBeDefined();
    expect(upperFailure.message).toContain("assert 'HELLO' == 'WORLD'");
  });

  it("handles no-tests-ran case with exit code 5", () => {
    const result = parsePytestOutput(PYTEST_NO_TESTS_RAN, "", 5);

    expect(result.success).toBe(true);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(0);
    expect(result.failures).toEqual([]);
  });
});

describe("fidelity: uv install", () => {
  it("preserves all installed package names and versions", () => {
    const result = parseUvInstall("", UV_INSTALL_SUCCESS, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(5);
    expect(result.installed).toHaveLength(5);

    const names = result.installed.map((p) => p.name);
    expect(names).toContain("flask");
    expect(names).toContain("jinja2");
    expect(names).toContain("markupsafe");
    expect(names).toContain("werkzeug");
    expect(names).toContain("itsdangerous");

    // Verify exact pairings
    const flask = result.installed.find((p) => p.name === "flask")!;
    expect(flask.version).toBe("3.0.0");

    const markupsafe = result.installed.find((p) => p.name === "markupsafe")!;
    expect(markupsafe.version).toBe("2.1.3");
  });

  it("detects already-satisfied via Audited output", () => {
    const result = parseUvInstall("", UV_INSTALL_ALREADY_SATISFIED, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
  });

  it("reports failure on non-zero exit code", () => {
    const stderr = "error: Could not find package 'nonexistent-pkg-xyz'";
    const result = parseUvInstall("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
  });
});

describe("fidelity: uv run", () => {
  it("preserves stdout/stderr passthrough with exit code", () => {
    const result = parseUvRun(UV_RUN_STDOUT, UV_RUN_STDERR, 0, 1500);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(UV_RUN_STDOUT);
    expect(result.stderr).toBe(UV_RUN_STDERR);
    expect(result.duration).toBe(1.5);
  });

  it("preserves mixed stdout and stderr", () => {
    const result = parseUvRun(UV_RUN_MIXED_STDOUT, UV_RUN_MIXED_STDERR, 0, 250);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe(UV_RUN_MIXED_STDOUT);
    expect(result.stderr).toBe(UV_RUN_MIXED_STDERR);
    expect(result.duration).toBe(0.25);
  });

  it("captures failed command exit code and stderr", () => {
    const stderr = "Traceback (most recent call last):\n  File \"script.py\", line 5\nNameError: name 'x' is not defined\n";
    const result = parseUvRun("", stderr, 1, 800);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("NameError");
    expect(result.duration).toBe(0.8);
  });
});

describe("fidelity: black", () => {
  it("preserves check mode with files needing reformat", () => {
    const result = parseBlackOutput("", BLACK_CHECK_MODE_DIRTY, 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(3);
    expect(result.filesUnchanged).toBe(7);
    expect(result.filesChecked).toBe(10);

    expect(result.wouldReformat).toHaveLength(3);
    expect(result.wouldReformat).toContain("src/main.py");
    expect(result.wouldReformat).toContain("src/utils.py");
    expect(result.wouldReformat).toContain("tests/test_main.py");
  });

  it("preserves format mode with reformatted files", () => {
    const result = parseBlackOutput("", BLACK_FORMAT_MODE_CHANGED, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(5);
    expect(result.filesChecked).toBe(7);

    expect(result.wouldReformat).toEqual(["src/main.py", "src/utils.py"]);
  });

  it("preserves all-clean check mode output", () => {
    const result = parseBlackOutput("", BLACK_ALL_CLEAN, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(10);
    expect(result.filesChecked).toBe(10);
    expect(result.wouldReformat).toEqual([]);
  });
});
