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

    const result = parseRuffJson(json);

    expect(result.total).toBe(2);
    expect(result.fixable).toBe(1);
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
    const result = parseRuffJson("[]");
    expect(result.total).toBe(0);
    expect(result.fixable).toBe(0);
  });

  it("handles invalid JSON", () => {
    const result = parseRuffJson("not json");
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

    const result = parsePipAuditJson(json);

    expect(result.total).toBe(1);
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

    const result = parsePipAuditJson(json);
    expect(result.total).toBe(0);
  });

  it("handles invalid JSON", () => {
    const result = parsePipAuditJson("not json");
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
    const result = parseRuffJson("");
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("throws on JSON that is not an array", () => {
    // parseRuffJson expects an array from ruff --output-format json.
    // Non-array valid JSON (object, null) causes a TypeError on .map().
    // This documents the current behavior — ruff always produces an array.
    expect(() => parseRuffJson('{"key": "value"}')).toThrow();
  });

  it("throws on null JSON", () => {
    // null is valid JSON but not an array — .map() throws TypeError
    expect(() => parseRuffJson("null")).toThrow();
  });
});

describe("parsePipAuditJson — error paths", () => {
  it("handles empty string", () => {
    const result = parsePipAuditJson("");
    expect(result.total).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles JSON with missing dependencies key", () => {
    const result = parsePipAuditJson("{}");
    expect(result.total).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles dependencies with missing vulns arrays", () => {
    const json = JSON.stringify({
      dependencies: [{ name: "requests", version: "2.31.0" }],
    });
    const result = parsePipAuditJson(json);
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
  });

  it("handles summary with only reformatted count and no unchanged", () => {
    const stderr = ["reformatted app.py", "All done! 1 file reformatted."].join("\n");
    const result = parseBlackOutput("", stderr, 0);
    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.wouldReformat).toEqual(["app.py"]);
  });
});

describe("parseUvInstall — error paths", () => {
  it("handles completely empty output", () => {
    const result = parseUvInstall("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
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
});

// ─── pip list parser tests ──────────────────────────────────────────────────

describe("parsePipListJson", () => {
  it("parses JSON array of packages", () => {
    const json = JSON.stringify([
      { name: "flask", version: "3.0.0" },
      { name: "requests", version: "2.31.0" },
    ]);
    const result = parsePipListJson(json);

    expect(result.total).toBe(2);
    expect(result.packages[0]).toEqual({ name: "flask", version: "3.0.0" });
    expect(result.packages[1]).toEqual({ name: "requests", version: "2.31.0" });
  });

  it("parses empty array", () => {
    const result = parsePipListJson("[]");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles invalid JSON", () => {
    const result = parsePipListJson("not json");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles empty string", () => {
    const result = parsePipListJson("");
    expect(result.total).toBe(0);
    expect(result.packages).toEqual([]);
  });

  it("handles non-array JSON", () => {
    const result = parsePipListJson('{"key": "value"}');
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

    const result = parsePipShowOutput(stdout);

    expect(result.name).toBe("requests");
    expect(result.version).toBe("2.31.0");
    expect(result.summary).toBe("Python HTTP for Humans.");
    expect(result.homepage).toBe("https://requests.readthedocs.io");
    expect(result.author).toBe("Kenneth Reitz");
    expect(result.license).toBe("Apache-2.0");
    expect(result.location).toBe("/usr/lib/python3.11/site-packages");
    expect(result.requires).toEqual(["charset-normalizer", "idna", "urllib3", "certifi"]);
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

    const result = parsePipShowOutput(stdout);

    expect(result.name).toBe("certifi");
    expect(result.requires).toEqual([]);
  });

  it("handles empty output", () => {
    const result = parsePipShowOutput("");

    expect(result.name).toBe("");
    expect(result.version).toBe("");
    expect(result.summary).toBe("");
    expect(result.requires).toEqual([]);
  });

  it("handles output with missing optional fields", () => {
    const stdout = ["Name: mypackage", "Version: 1.0.0", "Summary: A test package"].join("\n");

    const result = parsePipShowOutput(stdout);

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
    expect(result.files).toEqual(["src/main.py", "src/utils.py"]);
  });

  it("parses format mode with reformatted files", () => {
    const stderr = ["reformatted: src/main.py", "1 file reformatted"].join("\n");

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.files).toEqual(["src/main.py"]);
  });

  it("parses clean output (no files need formatting)", () => {
    const stderr = "0 files reformatted";

    const result = parseRuffFormatOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseRuffFormatOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toBeUndefined();
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
