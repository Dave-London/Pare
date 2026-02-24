import { describe, it, expect } from "vitest";
import { parseCargoBuildJson } from "../src/lib/parsers.js";
import { formatCargoBuild } from "../src/lib/formatters.js";

/**
 * cargo check uses the same JSON format and parser as cargo build.
 * These tests verify the parser works for check-specific scenarios
 * (same diagnostics but no artifacts produced).
 */

function compilerMessage(
  level: string,
  message: string,
  file: string,
  line: number,
  column: number,
  code?: string,
): string {
  return JSON.stringify({
    reason: "compiler-message",
    message: {
      code: code ? { code } : null,
      level,
      message,
      spans: [{ file_name: file, line_start: line, column_start: column }],
    },
  });
}

describe("cargo check (reuses parseCargoBuildJson)", () => {
  it("parses clean check output", () => {
    const stdout = [
      JSON.stringify({ reason: "compiler-artifact", package_id: "myapp 0.1.0" }),
      JSON.stringify({ reason: "build-finished", success: true }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("parses check with type errors", () => {
    const stdout = [
      compilerMessage("error", "mismatched types", "src/main.rs", 10, 5, "E0308"),
      compilerMessage("error", "cannot find value `x`", "src/main.rs", 15, 9, "E0425"),
      JSON.stringify({ reason: "build-finished", success: false }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 101);

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0].code).toBe("E0308");
    expect(result.diagnostics[1].code).toBe("E0425");
  });

  it("parses check with warnings only", () => {
    const stdout = [
      compilerMessage("warning", "unused variable: `x`", "src/lib.rs", 5, 9, "unused_variables"),
      compilerMessage("warning", "unused import: `HashMap`", "src/lib.rs", 1, 5, "unused_imports"),
      JSON.stringify({ reason: "build-finished", success: true }),
    ].join("\n");

    const result = parseCargoBuildJson(stdout, 0);

    expect(result.success).toBe(true);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    expect(result.diagnostics.filter((d) => d.severity === "warning")).toHaveLength(2);
  });

  it("formats check output with diagnostics", () => {
    const data = parseCargoBuildJson(
      compilerMessage("error", "type mismatch", "src/main.rs", 5, 3, "E0308"),
      101,
    );

    const output = formatCargoBuild(data);

    expect(output).toContain("cargo build: failed");
    expect(output).toContain("src/main.rs:5:3 error [E0308]: type mismatch");
  });

  it("formats clean check output", () => {
    const data = parseCargoBuildJson(
      JSON.stringify({ reason: "build-finished", success: true }),
      0,
    );

    const output = formatCargoBuild(data);

    expect(output).toBe("cargo build: success, no diagnostics.");
  });
});
