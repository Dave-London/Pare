import { describe, it, expect } from "vitest";
import { parseCargoDocOutput } from "../src/lib/parsers.js";
import { formatCargoDoc, compactDocMap } from "../src/lib/formatters.js";

describe("parseCargoDocOutput", () => {
  it("parses successful doc build with no warnings", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s",
      " Documenting myapp v0.1.0 (/home/user/myapp)",
    ].join("\n");

    const result = parseCargoDocOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(0);
    expect(result.warningDetails).toBeUndefined();
  });

  it("parses doc build with warnings and extracts structured details", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      " Documenting myapp v0.1.0 (/home/user/myapp)",
      "warning: missing documentation for a function",
      "  --> src/lib.rs:10:1",
      "   |",
      "10 | pub fn undocumented() {}",
      "   | ^^^^^^^^^^^^^^^^^^^^^^^",
      "   |",
      "warning: missing documentation for a struct",
      "  --> src/lib.rs:15:1",
      "   |",
      "15 | pub struct Foo;",
      "   | ^^^^^^^^^^^^^^^",
      "   |",
      "warning: 2 warnings emitted",
    ].join("\n");

    const result = parseCargoDocOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(2);
    expect(result.warningDetails).toHaveLength(2);
    expect(result.warningDetails![0]).toEqual({
      file: "src/lib.rs",
      line: 10,
      message: "missing documentation for a function",
    });
    expect(result.warningDetails![1]).toEqual({
      file: "src/lib.rs",
      line: 15,
      message: "missing documentation for a struct",
    });
  });

  it("parses failed doc build", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "error[E0308]: mismatched types",
      "  --> src/main.rs:5:10",
    ].join("\n");

    const result = parseCargoDocOutput("", stderr, 101);

    expect(result.success).toBe(false);
  });

  it("parses empty stderr", () => {
    const result = parseCargoDocOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(0);
    expect(result.warningDetails).toBeUndefined();
  });

  it("parses warning with code bracket format and extracts details", () => {
    const stderr = ["warning[E0599]: no method named `foo`", "  --> src/main.rs:5:10"].join("\n");

    const result = parseCargoDocOutput("", stderr, 0);

    expect(result.warnings).toBe(1);
    expect(result.warningDetails).toHaveLength(1);
    expect(result.warningDetails![0]).toEqual({
      file: "src/main.rs",
      line: 5,
      message: "no method named `foo`",
    });
  });

  it("handles warnings without location info", () => {
    const stderr = "warning: some general warning without a file location";

    const result = parseCargoDocOutput("", stderr, 0);

    expect(result.warnings).toBe(1);
    expect(result.warningDetails).toHaveLength(1);
    expect(result.warningDetails![0].file).toBe("");
    expect(result.warningDetails![0].line).toBe(0);
    expect(result.warningDetails![0].message).toBe("some general warning without a file location");
  });

  it("does not count non-warning lines as warnings", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s",
      "   Generated /home/user/myapp/target/doc/myapp/index.html",
    ].join("\n");

    const result = parseCargoDocOutput("", stderr, 0);

    expect(result.warnings).toBe(0);
  });

  it("sets outputDir when cwd is provided", () => {
    const result = parseCargoDocOutput("", "", 0, "/home/user/myapp");

    expect(result.outputDir).toBe("/home/user/myapp/target/doc");
  });
});

describe("formatCargoDoc", () => {
  it("formats successful doc build with no warnings", () => {
    const output = formatCargoDoc({
      success: true,
      warnings: 0,
    });

    expect(output).toBe("cargo doc: success.");
  });

  it("formats successful doc build with warnings and details", () => {
    const output = formatCargoDoc({
      success: true,
      warnings: 2,
      warningDetails: [
        { file: "src/lib.rs", line: 10, message: "missing documentation for a function" },
        { file: "src/lib.rs", line: 15, message: "missing documentation for a struct" },
      ],
    });

    expect(output).toContain("cargo doc: success (2 warning(s))");
    expect(output).toContain("src/lib.rs:10 warning: missing documentation for a function");
    expect(output).toContain("src/lib.rs:15 warning: missing documentation for a struct");
  });

  it("formats failed doc build", () => {
    const output = formatCargoDoc({
      success: false,
      warnings: 0,
    });

    expect(output).toBe("cargo doc: failed.");
  });

  it("formats failed doc build with warnings", () => {
    const output = formatCargoDoc({
      success: false,
      warnings: 2,
    });

    expect(output).toContain("cargo doc: failed (2 warning(s))");
  });
});

describe("compactDocMap with warningDetails", () => {
  it("preserves warningDetails when non-empty", () => {
    const data = {
      success: true,
      warnings: 1,
      warningDetails: [{ file: "src/lib.rs", line: 10, message: "missing docs" }],
    };
    const compact = compactDocMap(data);
    expect(compact.warningDetails).toHaveLength(1);
    expect(compact.warningDetails![0].file).toBe("src/lib.rs");
  });

  it("omits warningDetails when empty", () => {
    const data = { success: true, warnings: 0 };
    const compact = compactDocMap(data);
    expect(compact).not.toHaveProperty("warningDetails");
  });
});
