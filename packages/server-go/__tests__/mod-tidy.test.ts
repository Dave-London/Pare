import { describe, it, expect } from "vitest";
import { parseGoModTidyOutput } from "../src/lib/parsers.js";
import { formatGoModTidy } from "../src/lib/formatters.js";
import type { GoModTidyResult } from "../src/schemas/index.js";

describe("parseGoModTidyOutput", () => {
  it("parses successful tidy with no output (already tidy)", () => {
    const result = parseGoModTidyOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.summary).toBe("go.mod and go.sum are already tidy.");
  });

  it("parses successful tidy with output", () => {
    const stderr = "go: downloading github.com/pkg/errors v0.9.1\n";
    const result = parseGoModTidyOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.summary).toContain("downloading github.com/pkg/errors");
  });

  it("parses failed tidy (no go.mod found)", () => {
    const stderr = "go: go.mod file not found in current directory or any parent directory\n";
    const result = parseGoModTidyOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.summary).toContain("go.mod file not found");
  });

  it("parses failed tidy with version conflict", () => {
    const stderr =
      'go: example.com/foo@v1.2.3 requires\n\texample.com/bar@v2.0.0: version "v2.0.0" invalid\n';
    const result = parseGoModTidyOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.summary).toContain("example.com/foo@v1.2.3");
  });

  it("parses failed tidy with empty stderr", () => {
    const result = parseGoModTidyOutput("", "", 1);

    expect(result.success).toBe(false);
    expect(result.summary).toBe("go mod tidy failed.");
  });
});

describe("formatGoModTidy", () => {
  it("formats successful tidy", () => {
    const data: GoModTidyResult = {
      success: true,
      summary: "go.mod and go.sum are already tidy.",
    };
    const output = formatGoModTidy(data);
    expect(output).toBe("go mod tidy: go.mod and go.sum are already tidy.");
  });

  it("formats failed tidy", () => {
    const data: GoModTidyResult = {
      success: false,
      summary: "go.mod file not found",
    };
    const output = formatGoModTidy(data);
    expect(output).toContain("go mod tidy: FAIL");
    expect(output).toContain("go.mod file not found");
  });
});
