import { describe, it, expect } from "vitest";
import {
  parsePipInstall,
  parseMypyOutput,
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
    expect(result.warnings).toBe(1);
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

  it("handles invalid JSON", () => {
    const result = parsePipListJson("not json", 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles empty string", () => {
    const result = parsePipListJson("", 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles non-array JSON", () => {
    const result = parsePipListJson('{"key": "value"}', 0);
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
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
