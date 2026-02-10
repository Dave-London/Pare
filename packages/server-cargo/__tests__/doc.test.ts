import { describe, it, expect } from "vitest";
import { parseCargoDocOutput } from "../src/lib/parsers.js";
import { formatCargoDoc } from "../src/lib/formatters.js";

describe("parseCargoDocOutput", () => {
  it("parses successful doc build with no warnings", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s",
      " Documenting myapp v0.1.0 (/home/user/myapp)",
    ].join("\n");

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(0);
  });

  it("parses doc build with warnings", () => {
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

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.success).toBe(true);
    // Counts "warning:" or "warning[" lines - the individual warnings
    expect(result.warnings).toBe(2);
  });

  it("parses failed doc build", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "error[E0308]: mismatched types",
      "  --> src/main.rs:5:10",
    ].join("\n");

    const result = parseCargoDocOutput(stderr, 101);

    expect(result.success).toBe(false);
  });

  it("parses empty stderr", () => {
    const result = parseCargoDocOutput("", 0);

    expect(result.success).toBe(true);
    expect(result.warnings).toBe(0);
  });

  it("parses warning with code bracket format", () => {
    const stderr = ["warning[E0599]: no method named `foo`", "  --> src/main.rs:5:10"].join("\n");

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.warnings).toBe(1);
  });

  it("does not count non-warning lines as warnings", () => {
    const stderr = [
      "   Compiling myapp v0.1.0 (/home/user/myapp)",
      "    Finished `dev` profile [unoptimized + debuginfo] target(s) in 2.34s",
      "   Generated /home/user/myapp/target/doc/myapp/index.html",
    ].join("\n");

    const result = parseCargoDocOutput(stderr, 0);

    expect(result.warnings).toBe(0);
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

  it("formats successful doc build with warnings", () => {
    const output = formatCargoDoc({
      success: true,
      warnings: 3,
    });

    expect(output).toBe("cargo doc: success (3 warning(s))");
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

    expect(output).toBe("cargo doc: failed (2 warning(s))");
  });
});
