import { describe, it, expect } from "vitest";
import { parseGoGenerateOutput } from "../src/lib/parsers.js";
import { formatGoGenerate } from "../src/lib/formatters.js";
import type { GoGenerateResult } from "../src/schemas/index.js";

describe("parseGoGenerateOutput", () => {
  it("parses successful generate with no output", () => {
    const result = parseGoGenerateOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toBe("");
  });

  it("parses successful generate with output", () => {
    const stdout = "generating mocks for service.go\ngenerating stringer for types.go\n";
    const result = parseGoGenerateOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("generating mocks for service.go");
    expect(result.output).toContain("generating stringer for types.go");
  });

  it("parses failed generate", () => {
    const stderr =
      'main.go:3: running "mockgen": exec: "mockgen": executable file not found in $PATH\n';
    const result = parseGoGenerateOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.output).toContain("mockgen");
    expect(result.output).toContain("executable file not found");
  });

  it("parses generate with both stdout and stderr", () => {
    const stdout = "generating...\n";
    const stderr = "warning: deprecated directive\n";
    const result = parseGoGenerateOutput(stdout, stderr, 0);

    expect(result.success).toBe(true);
    expect(result.output).toContain("generating...");
    expect(result.output).toContain("warning: deprecated directive");
  });

  it("parses generate error with no output", () => {
    const result = parseGoGenerateOutput("", "", 1);

    expect(result.success).toBe(false);
    expect(result.output).toBe("");
  });

  it("parses generate with syntax error in directive", () => {
    const stderr = "main.go:3: bad flag syntax in //go:generate directive\n";
    const result = parseGoGenerateOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.output).toContain("bad flag syntax");
  });
});

describe("formatGoGenerate", () => {
  it("formats successful generate with no output", () => {
    const data: GoGenerateResult = {
      success: true,
      output: "",
    };
    const output = formatGoGenerate(data);
    expect(output).toBe("go generate: success.");
  });

  it("formats successful generate with output", () => {
    const data: GoGenerateResult = {
      success: true,
      output: "generated mock_service.go",
    };
    const output = formatGoGenerate(data);
    expect(output).toContain("go generate: success.");
    expect(output).toContain("generated mock_service.go");
  });

  it("formats failed generate", () => {
    const data: GoGenerateResult = {
      success: false,
      output: "mockgen: command not found",
    };
    const output = formatGoGenerate(data);
    expect(output).toContain("go generate: FAIL");
    expect(output).toContain("mockgen: command not found");
  });
});
