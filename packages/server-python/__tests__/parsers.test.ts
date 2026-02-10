import { describe, it, expect } from "vitest";
import {
  parsePipInstall,
  parseMypyOutput,
  parseRuffJson,
  parsePipAuditJson,
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
