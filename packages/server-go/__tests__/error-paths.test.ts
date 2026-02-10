/**
 * Error path tests: exercise edge cases and unusual inputs for the Go parsers
 * that are not covered by the main parser/fidelity tests.
 */
import { describe, it, expect } from "vitest";
import {
  parseGoTestJson,
  parseGoFmtOutput,
  parseGoBuildOutput,
  parseGoVetOutput,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// parseGoTestJson — subtests (e.g., TestMain/SubTest)
// ---------------------------------------------------------------------------
describe("error paths: parseGoTestJson subtests", () => {
  it("parses subtests with parent/child naming", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestMain" }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestMain/SubAdd" }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestMain/SubSub" }),
      JSON.stringify({
        Action: "pass",
        Package: "myapp",
        Test: "TestMain/SubAdd",
        Elapsed: 0.001,
      }),
      JSON.stringify({
        Action: "fail",
        Package: "myapp",
        Test: "TestMain/SubSub",
        Elapsed: 0.002,
      }),
      JSON.stringify({ Action: "fail", Package: "myapp", Test: "TestMain", Elapsed: 0.003 }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    // Parent and subtests are all tracked separately by key (Package/Test)
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(2);

    const subAdd = result.tests.find((t) => t.name === "TestMain/SubAdd");
    const subSub = result.tests.find((t) => t.name === "TestMain/SubSub");
    const parent = result.tests.find((t) => t.name === "TestMain");
    expect(subAdd?.status).toBe("pass");
    expect(subSub?.status).toBe("fail");
    expect(parent?.status).toBe("fail");
  });

  it("parses deeply nested subtests", () => {
    const stdout = [
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestAPI/GET/users/200" }),
      JSON.stringify({
        Action: "pass",
        Package: "myapp",
        Test: "TestAPI/GET/users/200",
        Elapsed: 0.01,
      }),
      JSON.stringify({ Action: "run", Package: "myapp", Test: "TestAPI/POST/users/400" }),
      JSON.stringify({
        Action: "fail",
        Package: "myapp",
        Test: "TestAPI/POST/users/400",
        Elapsed: 0.02,
      }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 1);

    expect(result.total).toBe(2);
    const getTest = result.tests.find((t) => t.name === "TestAPI/GET/users/200");
    const postTest = result.tests.find((t) => t.name === "TestAPI/POST/users/400");
    expect(getTest?.status).toBe("pass");
    expect(postTest?.status).toBe("fail");
  });

  it("handles subtests with spaces (URL-encoded in test name)", () => {
    const stdout = [
      JSON.stringify({
        Action: "run",
        Package: "myapp",
        Test: "TestTable/case_with_spaces",
      }),
      JSON.stringify({
        Action: "pass",
        Package: "myapp",
        Test: "TestTable/case_with_spaces",
        Elapsed: 0.001,
      }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("TestTable/case_with_spaces");
    expect(result.tests[0].status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// parseGoFmtOutput — non-.go files in output
// ---------------------------------------------------------------------------
describe("error paths: parseGoFmtOutput with non-.go files", () => {
  it("includes non-.go filenames if present in output", () => {
    // gofmt normally only outputs .go files, but the parser should not filter
    const stdout = "main.go\nREADME.md\nMakefile\n";
    const result = parseGoFmtOutput(stdout, "", 0, true);

    expect(result.filesChanged).toBe(3);
    expect(result.files).toContain("main.go");
    expect(result.files).toContain("README.md");
    expect(result.files).toContain("Makefile");
  });

  it("handles files with unusual extensions", () => {
    const stdout = "main.go\ngenerated.pb.go\nvendor/lib.go\n";
    const result = parseGoFmtOutput(stdout, "", 0, true);

    expect(result.filesChanged).toBe(3);
    expect(result.files).toContain("generated.pb.go");
    expect(result.files).toContain("vendor/lib.go");
  });

  it("handles blank lines in output", () => {
    const stdout = "main.go\n\nutil.go\n\n";
    const result = parseGoFmtOutput(stdout, "", 0, true);

    // Blank lines should be filtered out
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["main.go", "util.go"]);
  });
});

// ---------------------------------------------------------------------------
// Parsers with non-ASCII characters in error paths
// ---------------------------------------------------------------------------
describe("error paths: non-ASCII characters", () => {
  it("parseGoBuildOutput handles non-ASCII file paths", () => {
    const stderr = "\u00fcbung.go:5:3: undefined: greet";
    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors[0].file).toBe("\u00fcbung.go");
    expect(result.errors[0].line).toBe(5);
    expect(result.errors[0].column).toBe(3);
    expect(result.errors[0].message).toBe("undefined: greet");
  });

  it("parseGoBuildOutput handles CJK characters in error messages", () => {
    const stderr = 'main.go:12:7: \u672a\u5b9a\u7fa9\u306e\u5909\u6570: x';
    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors[0].message).toContain("\u672a\u5b9a\u7fa9");
  });

  it("parseGoVetOutput handles non-ASCII file paths", () => {
    const stderr = "caf\u00e9.go:10:2: printf: extra arg";
    const result = parseGoVetOutput("", stderr);

    expect(result.total).toBe(1);
    expect(result.diagnostics[0].file).toBe("caf\u00e9.go");
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(2);
    expect(result.diagnostics[0].message).toBe("printf: extra arg");
  });

  it("parseGoTestJson handles non-ASCII test names", () => {
    const stdout = [
      JSON.stringify({
        Action: "run",
        Package: "myapp",
        Test: "Test\u65e5\u672c\u8a9e",
      }),
      JSON.stringify({
        Action: "pass",
        Package: "myapp",
        Test: "Test\u65e5\u672c\u8a9e",
        Elapsed: 0.001,
      }),
    ].join("\n");

    const result = parseGoTestJson(stdout, 0);

    expect(result.total).toBe(1);
    expect(result.tests[0].name).toBe("Test\u65e5\u672c\u8a9e");
    expect(result.tests[0].status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// parseGoBuildOutput — multi-line error messages
// ---------------------------------------------------------------------------
describe("error paths: parseGoBuildOutput multi-line errors", () => {
  it("parses each line as a separate error (Go compiler format)", () => {
    // Go compiler outputs each error on its own line, even if logically related.
    // Multi-line context lines (like "have ..." / "want ...") are indented and
    // won't match the error regex — only the main error line is captured.
    const stderr = [
      "main.go:10:5: cannot use x (variable of type string) as int value in argument to process",
      "\thave (string)",
      "\twant (int)",
      "main.go:20:3: undefined: bar",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    // The indented "have/want" lines don't match the regex, so only 2 errors
    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors[0].file).toBe("main.go");
    expect(result.errors[0].line).toBe(10);
    expect(result.errors[0].message).toBe(
      "cannot use x (variable of type string) as int value in argument to process",
    );
    expect(result.errors[1].file).toBe("main.go");
    expect(result.errors[1].line).toBe(20);
    expect(result.errors[1].message).toBe("undefined: bar");
  });

  it("handles linker errors mixed with compiler errors", () => {
    const stderr = [
      "# myapp",
      "main.go:5:2: undefined: missingFunc",
      "# myapp",
      "./main.go:8:3: too many arguments in call to fmt.Println",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors[0].message).toBe("undefined: missingFunc");
    expect(result.errors[1].message).toBe("too many arguments in call to fmt.Println");
  });

  it("handles errors with colons in the message", () => {
    const stderr = 'main.go:1:1: expected \'package\', found \'EOF\'';
    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.errors[0].file).toBe("main.go");
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[0].column).toBe(1);
    expect(result.errors[0].message).toBe("expected 'package', found 'EOF'");
  });

  it("handles errors from files in subdirectories", () => {
    const stderr = [
      "cmd/server/main.go:15:4: undefined: config.Load",
      "internal/auth/jwt.go:22:8: cannot convert x (type int) to string",
      "pkg/util/helper.go:3:1: expected declaration, got '}'",
    ].join("\n");

    const result = parseGoBuildOutput("", stderr, 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.errors[0].file).toBe("cmd/server/main.go");
    expect(result.errors[1].file).toBe("internal/auth/jwt.go");
    expect(result.errors[2].file).toBe("pkg/util/helper.go");
  });
});
