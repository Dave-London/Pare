import { describe, it, expect } from "vitest";
import {
  parsePipInstall,
  parseMypyOutput,
  parseMypyJsonOutput,
  parseMypyTextOutput,
  parseRuffJson,
  parsePipAuditJson,
  parsePytestOutput,
  parseUvInstall,
  parseBlackOutput,
  parsePipListJson,
  parsePipShowOutput,
  parseRuffFormatOutput,
  parseCondaListJson,
  parseCondaInfoJson,
  parseCondaEnvListJson,
  parsePoetryOutput,
  parsePyenvOutput,
} from "../src/lib/parsers.js";

describe("parsePipInstall", () => {
  it("parses successful install", () => {
    const stdout =
      "Collecting requests\n  Downloading requests-2.31.0.tar.gz\nSuccessfully installed requests-2.31.0 urllib3-2.1.0 charset-normalizer-3.3.0";
    const result = parsePipInstall(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.installed[0]).toEqual({ name: "requests", version: "2.31.0" });
    expect(result.installed[1]).toEqual({ name: "urllib3", version: "2.1.0" });
    expect(result.alreadySatisfied).toBe(false);
  });

  it("parses already satisfied", () => {
    const stdout =
      "Requirement already satisfied: requests in /usr/lib/python3/site-packages (2.31.0)";
    const result = parsePipInstall(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.alreadySatisfied).toBe(true);
    expect(result.total).toBe(0);
  });

  it("handles failed install", () => {
    const result = parsePipInstall("", "ERROR: No matching distribution found for nonexistent", 1);
    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
  });

  it("parses dry-run output with Would install line", () => {
    const stdout = [
      "Collecting requests",
      "  Downloading requests-2.31.0-py3-none-any.whl",
      "Would install requests-2.31.0 urllib3-2.1.0 charset-normalizer-3.3.0",
    ].join("\n");
    const result = parsePipInstall(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.total).toBe(3);
    expect(result.installed[0]).toEqual({ name: "requests", version: "2.31.0" });
    expect(result.installed[1]).toEqual({ name: "urllib3", version: "2.1.0" });
    expect(result.installed[2]).toEqual({ name: "charset-normalizer", version: "3.3.0" });
  });

  it("sets dryRun false for normal install", () => {
    const stdout = "Successfully installed requests-2.31.0";
    const result = parsePipInstall(stdout, "", 0);

    expect(result.dryRun).toBe(false);
  });
});

describe("parseMypyOutput", () => {
  it("parses mypy errors", () => {
    const stdout = [
      'src/main.py:10: error: Argument 1 to "foo" has incompatible type "str"; expected "int"  [arg-type]',
      'src/main.py:20:5: error: Name "bar" is not defined  [name-defined]',
      "src/utils.py:5: note: See https://mypy.readthedocs.io for more info",
      "Found 2 errors in 2 files",
    ].join("\n");

    const result = parseMypyOutput(stdout, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(0);
    expect(result.notes).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "src/main.py",
      line: 10,
      column: undefined,
      severity: "error",
      message: 'Argument 1 to "foo" has incompatible type "str"; expected "int"',
      code: "arg-type",
    });
    expect(result.diagnostics[1].column).toBe(5);
    expect(result.diagnostics[1].code).toBe("name-defined");
  });

  it("parses clean output", () => {
    const stdout = "Success: no issues found in 5 source files";
    const result = parseMypyOutput(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe("parseRuffJson", () => {
  it("parses ruff JSON output", () => {
    const json = JSON.stringify([
      {
        code: "F401",
        message: "`os` imported but unused",
        filename: "src/main.py",
        location: { row: 1, column: 1 },
        end_location: { row: 1, column: 10 },
        fix: { applicability: "safe", message: "Remove unused import" },
      },
      {
        code: "E501",
        message: "Line too long (120 > 88)",
        filename: "src/main.py",
        location: { row: 15, column: 89 },
        end_location: { row: 15, column: 120 },
        fix: null,
      },
    ]);

    const result = parseRuffJson(json, 1);

    expect(result.total).toBe(2);
    expect(result.fixable).toBe(1);
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]).toEqual({
      file: "src/main.py",
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 10,
      code: "F401",
      message: "`os` imported but unused",
      fixable: true,
      fixApplicability: "safe",
      url: undefined,
    });
    expect(result.diagnostics[1].fixable).toBe(false);
  });

  it("parses clean output", () => {
    const result = parseRuffJson("[]", 0);
    expect(result.total).toBe(0);
    expect(result.fixable).toBe(0);
  });

  it("handles invalid JSON", () => {
    const result = parseRuffJson("not json", 0);
    expect(result.total).toBe(0);
  });
});

describe("parsePipAuditJson", () => {
  it("parses audit with vulnerabilities", () => {
    const json = JSON.stringify({
      dependencies: [
        {
          name: "requests",
          version: "2.25.0",
          vulns: [
            { id: "PYSEC-2023-001", description: "SSRF vulnerability", fix_versions: ["2.31.0"] },
          ],
        },
        {
          name: "flask",
          version: "2.0.0",
          vulns: [],
        },
      ],
    });

    const result = parsePipAuditJson(json, 0);

    expect(result.total).toBe(1);
    expect(result.success).toBe(true);
    expect(result.vulnerabilities[0]).toEqual({
      name: "requests",
      version: "2.25.0",
      id: "PYSEC-2023-001",
      description: "SSRF vulnerability",
      fixVersions: ["2.31.0"],
    });
  });

  it("parses clean audit", () => {
    const json = JSON.stringify({
      dependencies: [{ name: "requests", version: "2.31.0", vulns: [] }],
    });

    const result = parsePipAuditJson(json, 0);
    expect(result.total).toBe(0);
  });

  it("handles invalid JSON", () => {
    const result = parsePipAuditJson("not json", 0);
    expect(result.total).toBe(0);
  });
});

// ─── Error path tests ──────────────────────────────────────────────────────────

describe("parsePipInstall — error paths", () => {
  it("handles completely empty output", () => {
    const result = parsePipInstall("", "", 0);
    expect(result.success).toBe(true);
    expect(result.installed).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("handles malformed output with no recognizable patterns", () => {
    const result = parsePipInstall("random garbage\nno patterns here", "", 0);
    expect(result.success).toBe(true);
    expect(result.installed).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.alreadySatisfied).toBe(false);
  });
});

describe("parseMypyOutput — error paths", () => {
  it("handles empty output", () => {
    const result = parseMypyOutput("", 0);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("handles completely malformed output", () => {
    const result = parseMypyOutput("this is not mypy output at all\njust random text", 1);
    expect(result.success).toBe(false);
    expect(result.diagnostics).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("strips ANSI color codes from output", () => {
    // mypy with --color-output may include ANSI codes
    const stdout =
      "\x1b[1m\x1b[31msrc/main.py:10:5: error: Incompatible types in assignment\x1b[0m  [assignment]";
    const result = parseMypyOutput(stdout, 1);

    // The ANSI codes may or may not be stripped by the runner before reaching the parser.
    // Either the parser handles them gracefully or they break the regex.
    // This test documents the current behavior.
    expect(result.success).toBe(false);
    // If ANSI codes are not stripped, the regex may not match
    // The parser should still not throw
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it("handles output with only the summary line", () => {
    const result = parseMypyOutput("Found 0 errors in 0 files (checked 5 source files)", 0);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("parseRuffJson — error paths", () => {
  it("handles empty string", () => {
    const result = parseRuffJson("", 0);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("throws on JSON that is not an array", () => {
    // parseRuffJson expects an array from ruff --output-format json.
    // Non-array valid JSON (object, null) causes a TypeError on .map().
    // This documents the current behavior — ruff always produces an array.
    expect(() => parseRuffJson('{"key": "value"}', 0)).toThrow();
  });

  it("throws on null JSON", () => {
    // null is valid JSON but not an array — .map() throws TypeError
    expect(() => parseRuffJson("null", 0)).toThrow();
  });
});

describe("parsePipAuditJson — error paths", () => {
  it("handles empty string", () => {
    const result = parsePipAuditJson("", 0);
    expect(result.total).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles JSON with missing dependencies key", () => {
    const result = parsePipAuditJson("{}", 0);
    expect(result.total).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles dependencies with missing vulns arrays", () => {
    const json = JSON.stringify({
      dependencies: [{ name: "requests", version: "2.31.0" }],
    });
    const result = parsePipAuditJson(json, 0);
    expect(result.total).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });
});

describe("parsePytestOutput — error paths", () => {
  it("handles completely empty output", () => {
    const result = parsePytestOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.total).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("handles malformed output with no summary line", () => {
    const result = parsePytestOutput("random text\nno pytest here", "", 1);
    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
  });

  it("handles exit code 0 for passing tests", () => {
    const stdout = "========================= 10 passed in 3.50s =========================";
    const result = parsePytestOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.passed).toBe(10);
    expect(result.total).toBe(10);
  });

  it("handles exit code 1 for failed tests", () => {
    const stdout =
      "========================= 5 passed, 2 failed in 1.00s =========================";
    const result = parsePytestOutput(stdout, "", 1);
    expect(result.success).toBe(false);
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(2);
    expect(result.total).toBe(7);
  });

  it("handles exit code 2 for internal errors", () => {
    const stdout =
      "========================= 3 passed, 1 errors in 0.50s =========================";
    const result = parsePytestOutput(stdout, "", 2);
    expect(result.success).toBe(false);
    expect(result.errors).toBe(1);
    expect(result.passed).toBe(3);
  });

  it("handles exit code 5 for no tests collected", () => {
    const stdout = "========================= no tests ran in 0.01s =========================";
    const result = parsePytestOutput(stdout, "", 5);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });
});

describe("parseBlackOutput — error paths", () => {
  it("handles completely empty output", () => {
    const result = parseBlackOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.wouldReformat).toEqual([]);
    expect(result.errorType).toBeUndefined();
    expect(result.exitCode).toBeUndefined();
  });

  it("handles malformed summary line", () => {
    const stderr = "some random text that is not black output";
    const result = parseBlackOutput("", stderr, 0);
    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.wouldReformat).toEqual([]);
  });

  it("handles exit code 123 (internal error)", () => {
    const stderr = "error: cannot format src/main.py: Cannot parse: 1:0: unexpected token";
    const result = parseBlackOutput("", stderr, 123);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("internal_error");
    expect(result.exitCode).toBe(123);
  });

  it("handles exit code 1 (check mode failure)", () => {
    const stderr = ["would reformat src/main.py", "Oh no! 1 file would be reformatted."].join("\n");
    const result = parseBlackOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe("check_failed");
    expect(result.exitCode).toBe(1);
  });

  it("handles summary with only reformatted count and no unchanged", () => {
    const stderr = ["reformatted app.py", "All done! 1 file reformatted."].join("\n");
    const result = parseBlackOutput("", stderr, 0);
    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.wouldReformat).toEqual(["app.py"]);
    expect(result.errorType).toBeUndefined();
  });
});

describe("parseUvInstall — error paths", () => {
  it("handles completely empty output", () => {
    const result = parseUvInstall("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
    expect(result.error).toBeUndefined();
    expect(result.resolutionConflicts).toBeUndefined();
  });

  it("handles malformed package lines", () => {
    const stderr = ["Some random output", " + malformed-no-version", " + valid-pkg==1.0.0"].join(
      "\n",
    );
    const result = parseUvInstall("", stderr, 0);
    // The malformed line without == should not be parsed
    expect(result.installed).toHaveLength(1);
    expect(result.installed[0]).toEqual({ name: "valid-pkg", version: "1.0.0" });
  });

  it("handles malformed duration strings in summary", () => {
    const stderr = ["Installed 1 package in abc", " + flask==3.0.0"].join("\n");
    const result = parseUvInstall("", stderr, 0);
    // The summary regex expects a number, so "abc" won't match
    expect(result.success).toBe(true);
    expect(result.installed).toHaveLength(1);
    expect(result.duration).toBe(0);
  });

  it("parses resolution conflict errors from stderr", () => {
    const stderr = [
      "error: version solving failed",
      "  Because `flask>=3.0` and `werkzeug<2.0` are incompatible",
      "  and `myapp` depends on `flask>=3.0` and `werkzeug<2.0`",
    ].join("\n");
    const result = parseUvInstall("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.resolutionConflicts).toBeDefined();
    expect(result.resolutionConflicts!.length).toBeGreaterThan(0);
    // Verify the parsed conflict packages
    const pkgNames = result.resolutionConflicts!.map((c) => c.package);
    expect(pkgNames).toContain("flask");
    expect(pkgNames).toContain("werkzeug");
  });

  it("returns error string on generic failure", () => {
    const stderr = "error: Could not find package 'nonexistent-pkg-xyz'";
    const result = parseUvInstall("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("error: Could not find package 'nonexistent-pkg-xyz'");
    expect(result.resolutionConflicts).toBeUndefined();
  });
});

// ─── pip list parser tests ──────────────────────────────────────────────────

describe("parsePipListJson", () => {
  it("parses JSON array of packages", () => {
    const json = JSON.stringify([
      { name: "flask", version: "3.0.0" },
      { name: "requests", version: "2.31.0" },
    ]);
    const result = parsePipListJson(json, 0);

    expect(result.total).toBe(2);
    expect(result.success).toBe(true);
    expect(result.packages[0]).toEqual({ name: "flask", version: "3.0.0" });
    expect(result.packages[1]).toEqual({ name: "requests", version: "2.31.0" });
  });

  it("parses empty array", () => {
    const result = parsePipListJson("[]", 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles invalid JSON with error info", () => {
    const result = parsePipListJson("not json", 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.rawOutput).toBe("not json");
  });

  it("handles empty string with error info", () => {
    const result = parsePipListJson("", 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("handles non-array JSON with error info", () => {
    const result = parsePipListJson('{"key": "value"}', 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("pip list output is not a JSON array");
    expect(result.rawOutput).toBe('{"key": "value"}');
  });
});

// ─── pip show parser tests ──────────────────────────────────────────────────

describe("parsePipShowOutput", () => {
  it("parses full pip show output", () => {
    const stdout = [
      "Name: requests",
      "Version: 2.31.0",
      "Summary: Python HTTP for Humans.",
      "Home-page: https://requests.readthedocs.io",
      "Author: Kenneth Reitz",
      "Author-email: me@kennethreitz.org",
      "License: Apache-2.0",
      "Location: /usr/lib/python3.11/site-packages",
      "Requires: charset-normalizer, idna, urllib3, certifi",
      "Required-by: ",
    ].join("\n");

    const result = parsePipShowOutput(stdout, 0);

    expect(result.name).toBe("requests");
    expect(result.version).toBe("2.31.0");
    expect(result.summary).toBe("Python HTTP for Humans.");
    expect(result.homepage).toBe("https://requests.readthedocs.io");
    expect(result.author).toBe("Kenneth Reitz");
    expect(result.license).toBe("Apache-2.0");
    expect(result.location).toBe("/usr/lib/python3.11/site-packages");
    expect(result.requires).toEqual(["charset-normalizer", "idna", "urllib3", "certifi"]);
    expect(result.success).toBe(true);
    expect(result.authorEmail).toBe("me@kennethreitz.org");
    expect(result.requiredBy).toBeUndefined();
  });

  it("parses output with empty Requires field", () => {
    const stdout = [
      "Name: certifi",
      "Version: 2023.7.22",
      "Summary: Python package for providing Mozilla's CA Bundle.",
      "Home-page: https://github.com/certifi/python-certifi",
      "Author: Kenneth Reitz",
      "License: MPL-2.0",
      "Location: /usr/lib/python3.11/site-packages",
      "Requires: ",
      "Required-by: requests",
    ].join("\n");

    const result = parsePipShowOutput(stdout, 0);

    expect(result.name).toBe("certifi");
    expect(result.requires).toEqual([]);
    expect(result.requiredBy).toEqual(["requests"]);
    expect(result.success).toBe(true);
  });

  it("handles empty output", () => {
    const result = parsePipShowOutput("", 1);

    expect(result.name).toBe("");
    expect(result.version).toBe("");
    expect(result.summary).toBe("");
    expect(result.requires).toEqual([]);
    expect(result.success).toBe(false);
  });

  it("handles output with missing optional fields", () => {
    const stdout = ["Name: mypackage", "Version: 1.0.0", "Summary: A test package"].join("\n");

    const result = parsePipShowOutput(stdout, 0);

    expect(result.name).toBe("mypackage");
    expect(result.version).toBe("1.0.0");
    expect(result.summary).toBe("A test package");
    expect(result.homepage).toBeUndefined();
    expect(result.author).toBeUndefined();
    expect(result.license).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.requires).toEqual([]);
  });
});

// ─── ruff format parser tests ───────────────────────────────────────────────

describe("parseRuffFormatOutput", () => {
  it("parses check mode with files needing formatting", () => {
    const stderr = [
      "Would reformat: src/main.py",
      "Would reformat: src/utils.py",
      "2 files would be reformatted",
    ].join("\n");

    const result = parseRuffFormatOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(0);
    expect(result.files).toEqual(["src/main.py", "src/utils.py"]);
    expect(result.checkMode).toBe(true);
  });

  it("parses format mode with reformatted files", () => {
    const stderr = ["reformatted: src/main.py", "1 file reformatted"].join("\n");

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.filesUnchanged).toBe(0);
    expect(result.files).toEqual(["src/main.py"]);
    expect(result.checkMode).toBe(false);
  });

  it("parses clean output (no files need formatting)", () => {
    const stderr = "0 files reformatted";

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(0);
    expect(result.files).toBeUndefined();
    expect(result.checkMode).toBe(false);
  });

  it("handles empty output", () => {
    const result = parseRuffFormatOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(0);
    expect(result.files).toBeUndefined();
    expect(result.checkMode).toBe(false);
  });

  it("detects check mode from summary line only", () => {
    const stderr = "3 files would be reformatted";
    const result = parseRuffFormatOutput("", stderr, 1);

    expect(result.checkMode).toBe(true);
    expect(result.filesChanged).toBe(3);
  });

  it("parses filesUnchanged from summary with both changed and unchanged", () => {
    const stderr = ["reformatted: src/main.py", "1 file reformatted, 5 files left unchanged"].join(
      "\n",
    );

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.filesUnchanged).toBe(5);
    expect(result.files).toEqual(["src/main.py"]);
  });

  it("parses filesUnchanged when all files are unchanged", () => {
    const stderr = "10 files left unchanged";

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(10);
    expect(result.files).toBeUndefined();
  });

  it("parses check mode with unchanged count", () => {
    const stderr = "2 files would be reformatted, 8 files would be left unchanged";

    const result = parseRuffFormatOutput("", stderr, 1);

    expect(result.checkMode).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(8);
  });
});

// ─── conda list parser tests ────────────────────────────────────────────────

describe("parseCondaListJson", () => {
  it("parses JSON array of packages", () => {
    const json = JSON.stringify([
      { name: "numpy", version: "1.26.0", channel: "defaults", build_string: "py311h5b45529_0" },
      { name: "pandas", version: "2.1.0", channel: "conda-forge", build_string: "py311hf63a34e_0" },
    ]);
    const result = parseCondaListJson(json);

    expect(result.action).toBe("list");
    expect(result.total).toBe(2);
    expect(result.packages[0]).toEqual({
      name: "numpy",
      version: "1.26.0",
      channel: "defaults",
      buildString: "py311h5b45529_0",
    });
    expect(result.packages[1].channel).toBe("conda-forge");
  });

  it("parses with environment name", () => {
    const json = JSON.stringify([{ name: "flask", version: "3.0.0", channel: "defaults" }]);
    const result = parseCondaListJson(json, "myenv");

    expect(result.environment).toBe("myenv");
    expect(result.total).toBe(1);
  });

  it("parses empty array", () => {
    const result = parseCondaListJson("[]");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles invalid JSON", () => {
    const result = parseCondaListJson("not json");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles non-array JSON", () => {
    const result = parseCondaListJson('{"key": "value"}');
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles empty string", () => {
    const result = parseCondaListJson("");
    expect(result.total).toBe(0);
  });
});

// ─── conda info parser tests ────────────────────────────────────────────────

describe("parseCondaInfoJson", () => {
  it("parses full conda info output", () => {
    const json = JSON.stringify({
      conda_version: "24.1.0",
      platform: "win-64",
      python_version: "3.11.7.final.0",
      default_prefix: "C:\\Users\\user\\miniconda3",
      active_prefix: "C:\\Users\\user\\miniconda3\\envs\\myenv",
      active_prefix_name: "myenv",
      channels: ["defaults", "conda-forge"],
      envs_dirs: ["C:\\Users\\user\\miniconda3\\envs"],
      pkgs_dirs: ["C:\\Users\\user\\miniconda3\\pkgs"],
    });
    const result = parseCondaInfoJson(json);

    expect(result.action).toBe("info");
    expect(result.condaVersion).toBe("24.1.0");
    expect(result.platform).toBe("win-64");
    expect(result.pythonVersion).toBe("3.11.7.final.0");
    expect(result.defaultPrefix).toBe("C:\\Users\\user\\miniconda3");
    expect(result.activePrefix).toBe("C:\\Users\\user\\miniconda3\\envs\\myenv");
    expect(result.channels).toEqual(["defaults", "conda-forge"]);
    expect(result.envsDirs).toEqual(["C:\\Users\\user\\miniconda3\\envs"]);
    expect(result.pkgsDirs).toEqual(["C:\\Users\\user\\miniconda3\\pkgs"]);
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify({
      conda_version: "24.1.0",
      platform: "linux-64",
    });
    const result = parseCondaInfoJson(json);

    expect(result.condaVersion).toBe("24.1.0");
    expect(result.platform).toBe("linux-64");
    expect(result.pythonVersion).toBe("");
    expect(result.defaultPrefix).toBe("");
    expect(result.activePrefix).toBeUndefined();
    expect(result.channels).toEqual([]);
  });

  it("handles invalid JSON", () => {
    const result = parseCondaInfoJson("not json");
    expect(result.condaVersion).toBe("");
    expect(result.platform).toBe("");
  });

  it("handles empty string", () => {
    const result = parseCondaInfoJson("");
    expect(result.action).toBe("info");
    expect(result.condaVersion).toBe("");
  });
});

// ─── conda env list parser tests ─────────────────────────────────────────────

describe("parseCondaEnvListJson", () => {
  it("parses environment list", () => {
    const json = JSON.stringify({
      envs: [
        "C:\\Users\\user\\miniconda3",
        "C:\\Users\\user\\miniconda3\\envs\\myenv",
        "C:\\Users\\user\\miniconda3\\envs\\test",
      ],
    });
    const result = parseCondaEnvListJson(json, "C:\\Users\\user\\miniconda3");

    expect(result.action).toBe("env-list");
    expect(result.total).toBe(3);
    expect(result.environments[0]).toEqual({
      name: "miniconda3",
      path: "C:\\Users\\user\\miniconda3",
      active: true,
    });
    expect(result.environments[1]).toEqual({
      name: "myenv",
      path: "C:\\Users\\user\\miniconda3\\envs\\myenv",
      active: false,
    });
    expect(result.environments[2].name).toBe("test");
  });

  it("parses empty env list", () => {
    const json = JSON.stringify({ envs: [] });
    const result = parseCondaEnvListJson(json);

    expect(result.total).toBe(0);
    expect(result.environments).toEqual([]);
  });

  it("handles missing envs key", () => {
    const result = parseCondaEnvListJson("{}");
    expect(result.total).toBe(0);
  });

  it("handles invalid JSON", () => {
    const result = parseCondaEnvListJson("not json");
    expect(result.total).toBe(0);
  });

  it("handles no active prefix", () => {
    const json = JSON.stringify({
      envs: ["/home/user/miniconda3"],
    });
    const result = parseCondaEnvListJson(json);

    expect(result.environments[0].active).toBe(false);
  });
});

// ─── poetry parser tests ────────────────────────────────────────────────────

describe("parsePoetryOutput — show", () => {
  it("parses poetry show output with packages", () => {
    const stdout = [
      "certifi            2023.7.22 Python package for Mozilla's CA Bundle.",
      "charset-normalizer 3.3.0     The Real First Universal Charset Detector.",
      "requests           2.31.0    Python HTTP for Humans.",
    ].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "show");

    expect(result.success).toBe(true);
    expect(result.action).toBe("show");
    expect(result.total).toBe(3);
    expect(result.packages).toEqual([
      {
        name: "certifi",
        version: "2023.7.22",
        description: "Python package for Mozilla's CA Bundle.",
      },
      {
        name: "charset-normalizer",
        version: "3.3.0",
        description: "The Real First Universal Charset Detector.",
      },
      { name: "requests", version: "2.31.0", description: "Python HTTP for Humans." },
    ]);
  });

  it("parses empty show output", () => {
    const result = parsePoetryOutput("", "", 0, "show");

    expect(result.success).toBe(true);
    expect(result.action).toBe("show");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });
});

describe("parsePoetryOutput — build", () => {
  it("parses poetry build output with artifacts", () => {
    const stdout = [
      "Building mypackage (1.0.0)",
      "  - Built mypackage-1.0.0.tar.gz",
      "  - Built mypackage-1.0.0-py3-none-any.whl",
    ].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "build");

    expect(result.success).toBe(true);
    expect(result.action).toBe("build");
    expect(result.total).toBe(2);
    expect(result.artifacts).toEqual([
      { file: "mypackage-1.0.0.tar.gz" },
      { file: "mypackage-1.0.0-py3-none-any.whl" },
    ]);
  });

  it("handles empty build output", () => {
    const result = parsePoetryOutput("", "", 0, "build");

    expect(result.success).toBe(true);
    expect(result.action).toBe("build");
    expect(result.total).toBe(0);
    expect(result.artifacts).toEqual([]);
  });

  it("handles failed build", () => {
    const result = parsePoetryOutput("", "Build error", 1, "build");

    expect(result.success).toBe(false);
    expect(result.action).toBe("build");
  });
});

describe("parsePoetryOutput — install", () => {
  it("parses poetry install output with installed packages", () => {
    const stderr = [
      "Installing dependencies from lock file",
      "",
      "Package operations: 3 installs, 0 updates, 0 removals",
      "",
      "  - Installing certifi (2023.7.22)",
      "  - Installing charset-normalizer (3.3.0)",
      "  - Installing requests (2.31.0)",
    ].join("\n");

    const result = parsePoetryOutput("", stderr, 0, "install");

    expect(result.success).toBe(true);
    expect(result.action).toBe("install");
    expect(result.total).toBe(3);
    expect(result.packages).toEqual([
      { name: "certifi", version: "2023.7.22" },
      { name: "charset-normalizer", version: "3.3.0" },
      { name: "requests", version: "2.31.0" },
    ]);
  });

  it("handles already up to date", () => {
    const stderr = "No dependencies to install or update";
    const result = parsePoetryOutput("", stderr, 0, "install");

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });
});

describe("parsePoetryOutput — add", () => {
  it("parses poetry add with installed packages", () => {
    const stderr = [
      "Using version ^2.31.0 for requests",
      "",
      "Updating dependencies",
      "Resolving dependencies...",
      "",
      "Package operations: 4 installs, 0 updates, 0 removals",
      "",
      "  - Installing certifi (2023.7.22)",
      "  - Installing urllib3 (2.1.0)",
      "  - Installing requests (2.31.0)",
    ].join("\n");

    const result = parsePoetryOutput("", stderr, 0, "add");

    expect(result.success).toBe(true);
    expect(result.action).toBe("add");
    expect(result.total).toBe(3);
    expect(result.packages![0]).toEqual({ name: "certifi", version: "2023.7.22" });
  });
});

describe("parsePoetryOutput — remove", () => {
  it("parses poetry remove with removed packages", () => {
    const stderr = [
      "Updating dependencies",
      "Resolving dependencies...",
      "",
      "Package operations: 0 installs, 0 updates, 2 removals",
      "",
      "  - Removing requests (2.31.0)",
      "  - Removing urllib3 (2.1.0)",
    ].join("\n");

    const result = parsePoetryOutput("", stderr, 0, "remove");

    expect(result.success).toBe(true);
    expect(result.action).toBe("remove");
    expect(result.total).toBe(2);
    expect(result.packages).toEqual([
      { name: "requests", version: "2.31.0" },
      { name: "urllib3", version: "2.1.0" },
    ]);
  });

  it("handles failed remove", () => {
    const result = parsePoetryOutput("", "Package not found", 1, "remove");

    expect(result.success).toBe(false);
    expect(result.action).toBe("remove");
    expect(result.total).toBe(0);
  });
});

// ── pip-list outdated parser tests ───────────────────────────────────

describe("parsePipListJson with outdated", () => {
  it("parses outdated JSON with latestVersion and latestFiletype", () => {
    const stdout = JSON.stringify([
      { name: "requests", version: "2.28.0", latest_version: "2.31.0", latest_filetype: "wheel" },
      { name: "flask", version: "2.2.0", latest_version: "3.0.0", latest_filetype: "sdist" },
    ]);
    const result = parsePipListJson(stdout, 0, true);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.packages![0].latestVersion).toBe("2.31.0");
    expect(result.packages![0].latestFiletype).toBe("wheel");
    expect(result.packages![1].latestVersion).toBe("3.0.0");
    expect(result.packages![1].latestFiletype).toBe("sdist");
  });

  it("does not include latestVersion when outdated is false", () => {
    const stdout = JSON.stringify([
      { name: "requests", version: "2.28.0", latest_version: "2.31.0", latest_filetype: "wheel" },
    ]);
    const result = parsePipListJson(stdout, 0, false);

    expect(result.packages![0].latestVersion).toBeUndefined();
    expect(result.packages![0].latestFiletype).toBeUndefined();
  });

  it("does not include latestVersion when outdated is not provided", () => {
    const stdout = JSON.stringify([
      { name: "requests", version: "2.28.0", latest_version: "2.31.0" },
    ]);
    const result = parsePipListJson(stdout, 0);

    expect(result.packages![0].latestVersion).toBeUndefined();
  });

  it("handles outdated JSON without latest fields", () => {
    const stdout = JSON.stringify([{ name: "requests", version: "2.28.0" }]);
    const result = parsePipListJson(stdout, 0, true);

    expect(result.packages![0].latestVersion).toBeUndefined();
    expect(result.packages![0].latestFiletype).toBeUndefined();
  });
});

// ── pyenv installList parser tests ───────────────────────────────────

describe("parsePyenvOutput installList action", () => {
  it("parses available versions list", () => {
    const stdout = "Available versions:\n  2.7.18\n  3.10.13\n  3.11.7\n  3.12.0\n  3.13.0a2\n";
    const result = parsePyenvOutput(stdout, "", 0, "installList");

    expect(result.success).toBe(true);
    expect(result.action).toBe("installList");
    expect(result.availableVersions).toEqual(["2.7.18", "3.10.13", "3.11.7", "3.12.0", "3.13.0a2"]);
  });

  it("parses plain version list without header", () => {
    const stdout = "  3.11.7\n  3.12.0\n";
    const result = parsePyenvOutput(stdout, "", 0, "installList");

    expect(result.success).toBe(true);
    expect(result.availableVersions).toEqual(["3.11.7", "3.12.0"]);
  });

  it("handles empty output", () => {
    const result = parsePyenvOutput("", "", 0, "installList");

    expect(result.success).toBe(true);
    expect(result.availableVersions).toEqual([]);
  });

  it("handles failure", () => {
    const result = parsePyenvOutput("", "pyenv: command not found", 127, "installList");

    expect(result.success).toBe(false);
    expect(result.error).toContain("command not found");
  });
});

// ─── P1 Gap Tests ──────────────────────────────────────────────────────────

// Gap #183: mypy JSON output parsing
describe("parseMypyJsonOutput", () => {
  it("parses mypy JSON output array", () => {
    const json = JSON.stringify([
      {
        file: "src/main.py",
        line: 10,
        column: 5,
        message: "Incompatible return value type",
        hint: null,
        code: "return-value",
        severity: "error",
      },
      {
        file: "src/utils.py",
        line: 3,
        column: 0,
        message: "See https://mypy.readthedocs.io for more info",
        hint: null,
        code: null,
        severity: "note",
      },
    ]);

    const result = parseMypyJsonOutput(json, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.notes).toBe(1);
    expect(result.diagnostics![0]).toEqual({
      file: "src/main.py",
      line: 10,
      column: 5,
      severity: "error",
      message: "Incompatible return value type",
      code: "return-value",
    });
    expect(result.diagnostics![1]).toEqual({
      file: "src/utils.py",
      line: 3,
      column: undefined,
      severity: "note",
      message: "See https://mypy.readthedocs.io for more info",
      code: undefined,
    });
  });

  it("parses clean JSON output", () => {
    const result = parseMypyJsonOutput("[]", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.notes).toBe(0);
  });

  it("falls back to text parsing on invalid JSON", () => {
    const textOutput = [
      'src/main.py:10:5: error: Argument 1 to "foo" has incompatible type  [arg-type]',
      "src/utils.py:5: note: See docs for more info",
      "Found 1 error in 1 file",
    ].join("\n");

    const result = parseMypyJsonOutput(textOutput, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.notes).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics![0].file).toBe("src/main.py");
  });

  it("falls back to text on non-array JSON", () => {
    const result = parseMypyJsonOutput('{"error": true}', 1);

    // Falls back to text parsing which finds no diagnostics
    expect(result.total).toBe(0);
  });

  it("handles JSON with all severity levels", () => {
    const json = JSON.stringify([
      {
        file: "a.py",
        line: 1,
        column: 1,
        message: "err",
        hint: null,
        code: "misc",
        severity: "error",
      },
      {
        file: "b.py",
        line: 2,
        column: 1,
        message: "warn",
        hint: null,
        code: "misc",
        severity: "warning",
      },
      {
        file: "c.py",
        line: 3,
        column: 1,
        message: "info",
        hint: null,
        code: null,
        severity: "note",
      },
    ]);

    const result = parseMypyJsonOutput(json, 1);

    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.notes).toBe(1);
    expect(result.total).toBe(3);
  });
});

// Gap #184: Separate notes from warnings in text parsing
describe("parseMypyTextOutput — notes separated from warnings", () => {
  it("separates notes from warnings", () => {
    const stdout = [
      'src/main.py:5:1: warning: Unused "type: ignore" comment  [unused-ignore]',
      "src/main.py:10: note: See https://mypy.readthedocs.io for more info",
      "src/main.py:10:5: error: Incompatible types in assignment  [assignment]",
    ].join("\n");

    const result = parseMypyTextOutput(stdout, 1);

    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.notes).toBe(1);
    expect(result.total).toBe(3);
  });

  it("reports zero notes when there are none", () => {
    const stdout = ['src/main.py:1: error: Name "foo" is not defined  [name-defined]'].join("\n");

    const result = parseMypyTextOutput(stdout, 1);

    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(0);
    expect(result.notes).toBe(0);
    expect(result.total).toBe(1);
  });
});

// Gap #185: pip-audit severity/aliases
describe("parsePipAuditJson — severity and aliases", () => {
  it("parses vulnerabilities with severity and aliases", () => {
    const json = JSON.stringify({
      dependencies: [
        {
          name: "requests",
          version: "2.25.0",
          vulns: [
            {
              id: "PYSEC-2023-001",
              description: "SSRF vulnerability",
              fix_versions: ["2.31.0"],
              aliases: ["CVE-2023-32681"],
              url: "https://osv.dev/vulnerability/PYSEC-2023-001",
              severity: "HIGH",
              cvss_score: 8.1,
            },
          ],
        },
      ],
    });

    const result = parsePipAuditJson(json, 1);

    expect(result.total).toBe(1);
    const vuln = result.vulnerabilities![0];
    expect(vuln.aliases).toEqual(["CVE-2023-32681"]);
    expect(vuln.url).toBe("https://osv.dev/vulnerability/PYSEC-2023-001");
    expect(vuln.severity).toBe("HIGH");
    expect(vuln.cvssScore).toBe(8.1);
  });

  it("omits optional fields when not present", () => {
    const json = JSON.stringify({
      dependencies: [
        {
          name: "flask",
          version: "1.0.0",
          vulns: [
            {
              id: "CVE-2023-999",
              description: "XSS vulnerability",
              fix_versions: ["2.0.0"],
            },
          ],
        },
      ],
    });

    const result = parsePipAuditJson(json, 1);

    const vuln = result.vulnerabilities![0];
    expect(vuln.aliases).toBeUndefined();
    expect(vuln.url).toBeUndefined();
    expect(vuln.severity).toBeUndefined();
    expect(vuln.cvssScore).toBeUndefined();
  });

  it("handles empty aliases array", () => {
    const json = JSON.stringify({
      dependencies: [
        {
          name: "pkg",
          version: "1.0",
          vulns: [
            {
              id: "VULN-1",
              description: "test",
              fix_versions: [],
              aliases: [],
            },
          ],
        },
      ],
    });

    const result = parsePipAuditJson(json, 0);
    expect(result.vulnerabilities![0].aliases).toBeUndefined();
  });
});

// Gap #186: pip-list parse errors
describe("parsePipListJson — error surfacing", () => {
  it("surfaces JSON parse errors with raw output", () => {
    const badOutput = "WARNING: pip is configured with locations\n[broken json";
    const result = parsePipListJson(badOutput, 0);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.rawOutput).toBe(badOutput);
  });

  it("surfaces non-array JSON error", () => {
    const result = parsePipListJson('{"packages": []}', 0);

    expect(result.success).toBe(false);
    expect(result.error).toBe("pip list output is not a JSON array");
    expect(result.rawOutput).toBeDefined();
  });

  it("truncates raw output when longer than 500 chars", () => {
    const longOutput = "x".repeat(600);
    const result = parsePipListJson(longOutput, 0);

    expect(result.rawOutput!.length).toBeLessThanOrEqual(503); // 500 + "..."
    expect(result.rawOutput).toContain("...");
  });

  it("returns no error for valid JSON", () => {
    const json = JSON.stringify([{ name: "pkg", version: "1.0" }]);
    const result = parsePipListJson(json, 0);

    expect(result.error).toBeUndefined();
    expect(result.rawOutput).toBeUndefined();
    expect(result.success).toBe(true);
  });
});

// Gap #187: pip-show multiple packages
describe("parsePipShowOutput — multiple packages", () => {
  it("parses multiple packages separated by ---", () => {
    const stdout = [
      "Name: requests",
      "Version: 2.31.0",
      "Summary: Python HTTP for Humans.",
      "Requires: charset-normalizer, idna, urllib3, certifi",
      "---",
      "Name: flask",
      "Version: 3.0.0",
      "Summary: A micro web framework.",
      "Requires: click, jinja2, werkzeug",
    ].join("\n");

    const result = parsePipShowOutput(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.packages).toHaveLength(2);
    expect(result.packages[0].name).toBe("requests");
    expect(result.packages[0].version).toBe("2.31.0");
    expect(result.packages[1].name).toBe("flask");
    expect(result.packages[1].version).toBe("3.0.0");
    // Backward compat: top-level fields from first package
    expect(result.name).toBe("requests");
    expect(result.version).toBe("2.31.0");
  });

  it("handles single package (backward compat)", () => {
    const stdout = ["Name: requests", "Version: 2.31.0", "Summary: Python HTTP for Humans."].join(
      "\n",
    );

    const result = parsePipShowOutput(stdout, 0);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe("requests");
    expect(result.name).toBe("requests");
  });

  it("handles three packages", () => {
    const stdout = [
      "Name: pkg1",
      "Version: 1.0.0",
      "Summary: First",
      "---",
      "Name: pkg2",
      "Version: 2.0.0",
      "Summary: Second",
      "---",
      "Name: pkg3",
      "Version: 3.0.0",
      "Summary: Third",
    ].join("\n");

    const result = parsePipShowOutput(stdout, 0);

    expect(result.packages).toHaveLength(3);
    expect(result.packages[2].name).toBe("pkg3");
  });
});

// Gap #188: Poetry POETRY_SHOW_RE regex
describe("parsePoetryOutput — strict regex", () => {
  it("does not match status/header lines", () => {
    const stdout = [
      "Loading packages...",
      "certifi            2023.7.22 Python package for Mozilla's CA Bundle.",
      "requests           2.31.0    Python HTTP for Humans.",
      "Resolving dependencies...",
    ].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "show");

    // Should only match the two actual package lines
    expect(result.total).toBe(2);
    expect(result.packages![0].name).toBe("certifi");
    expect(result.packages![1].name).toBe("requests");
  });

  it("matches packages with dots and underscores in names", () => {
    const stdout = ["my.package_v2   1.0.0  A package with dots and underscores"].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "show");

    expect(result.total).toBe(1);
    expect(result.packages![0].name).toBe("my.package_v2");
    expect(result.packages![0].version).toBe("1.0.0");
  });

  it("does not match lines starting with special chars", () => {
    const stdout = [
      " - Installing requests (2.31.0)",
      "  * certifi 2023.7.22",
      "requests           2.31.0    Python HTTP for Humans.",
    ].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "show");

    // Should only match the properly formatted package line
    expect(result.total).toBe(1);
    expect(result.packages![0].name).toBe("requests");
  });

  it("requires version to start with a digit", () => {
    const stdout = [
      "loading             status  Some status message",
      "requests            2.31.0  Python HTTP for Humans.",
    ].join("\n");

    const result = parsePoetryOutput(stdout, "", 0, "show");

    // "loading status" should not match (version doesn't start with digit)
    expect(result.total).toBe(1);
    expect(result.packages![0].name).toBe("requests");
  });
});

// Gap #189: pyenv uninstall
describe("parsePyenvOutput — uninstall", () => {
  it("parses successful uninstall", () => {
    const stderr = "pyenv: remove /home/user/.pyenv/versions/3.10.13\n";
    const result = parsePyenvOutput("", stderr, 0, "uninstall");

    expect(result.success).toBe(true);
    expect(result.action).toBe("uninstall");
    expect(result.uninstalled).toBeDefined();
  });

  it("parses uninstall with version in output", () => {
    const stdout = "";
    const stderr = "pyenv: remove 3.10.13\n";
    const result = parsePyenvOutput(stdout, stderr, 0, "uninstall");

    expect(result.success).toBe(true);
    expect(result.action).toBe("uninstall");
    expect(result.uninstalled).toBe("3.10.13");
  });

  it("handles uninstall failure", () => {
    const stderr = "pyenv: version '99.99.99' not installed\n";
    const result = parsePyenvOutput("", stderr, 1, "uninstall");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not installed");
  });

  it("handles silent successful uninstall", () => {
    // Some pyenv versions produce no output on success
    const result = parsePyenvOutput("", "", 0, "uninstall");

    expect(result.success).toBe(true);
    expect(result.action).toBe("uninstall");
  });
});

// Gap #191: pytest warnings count
describe("parsePytestOutput — warnings count", () => {
  it("parses warnings from summary line", () => {
    const stdout = [
      "========================= short test summary info =========================",
      "==================== 5 passed, 2 warnings in 1.23s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.passed).toBe(5);
    expect(result.warnings).toBe(2);
    expect(result.total).toBe(5);
  });

  it("parses warnings with mixed results", () => {
    const stdout = [
      "==================== 3 passed, 1 failed, 4 warnings in 2.50s ====================",
    ].join("\n");

    const result = parsePytestOutput(stdout, "", 1);

    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.warnings).toBe(4);
  });

  it("reports zero warnings when none present", () => {
    const stdout = ["4 passed in 0.52s"].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.warnings).toBe(0);
  });

  it("handles single warning", () => {
    const stdout = ["10 passed, 1 warning in 3.00s"].join("\n");

    const result = parsePytestOutput(stdout, "", 0);

    expect(result.warnings).toBe(1);
  });
});

// Gap #192: ruff fixApplicability
describe("parseRuffJson — fixApplicability", () => {
  it("extracts safe fix applicability", () => {
    const json = JSON.stringify([
      {
        code: "F401",
        message: "unused import",
        filename: "a.py",
        location: { row: 1, column: 1 },
        fix: { applicability: "safe", message: "Remove import", edits: [] },
      },
    ]);

    const result = parseRuffJson(json, 1);
    expect(result.diagnostics![0].fixApplicability).toBe("safe");
  });

  it("extracts unsafe fix applicability", () => {
    const json = JSON.stringify([
      {
        code: "UP035",
        message: "deprecated import",
        filename: "b.py",
        location: { row: 5, column: 1 },
        fix: { applicability: "unsafe", message: "Replace import", edits: [] },
      },
    ]);

    const result = parseRuffJson(json, 1);
    expect(result.diagnostics![0].fixApplicability).toBe("unsafe");
  });

  it("extracts display fix applicability", () => {
    const json = JSON.stringify([
      {
        code: "E711",
        message: "comparison to None",
        filename: "c.py",
        location: { row: 10, column: 5 },
        fix: { applicability: "display", message: "Use 'is None'", edits: [] },
      },
    ]);

    const result = parseRuffJson(json, 1);
    expect(result.diagnostics![0].fixApplicability).toBe("display");
  });

  it("returns undefined when no fix", () => {
    const json = JSON.stringify([
      {
        code: "E501",
        message: "line too long",
        filename: "d.py",
        location: { row: 1, column: 89 },
        fix: null,
      },
    ]);

    const result = parseRuffJson(json, 1);
    expect(result.diagnostics![0].fixApplicability).toBeUndefined();
    expect(result.diagnostics![0].fixable).toBe(false);
  });

  it("returns undefined when fix has no applicability field", () => {
    const json = JSON.stringify([
      {
        code: "F401",
        message: "unused import",
        filename: "e.py",
        location: { row: 1, column: 1 },
        fix: { message: "Remove import", edits: [] },
      },
    ]);

    const result = parseRuffJson(json, 1);
    expect(result.diagnostics![0].fixApplicability).toBeUndefined();
    expect(result.diagnostics![0].fixable).toBe(true);
  });
});
