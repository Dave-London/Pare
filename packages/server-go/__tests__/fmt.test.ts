import { describe, it, expect } from "vitest";
import { parseGoFmtOutput } from "../src/lib/parsers.js";
import { formatGoFmt } from "../src/lib/formatters.js";
import type { GoFmtResult } from "../src/schemas/index.js";

describe("parseGoFmtOutput", () => {
  describe("check mode (-l)", () => {
    it("parses files needing formatting", () => {
      const stdout = "main.go\nutil.go\nhandler.go\n";
      const result = parseGoFmtOutput(stdout, "", 0, true);

      expect(result.success).toBe(false);
      expect(result.filesChanged).toBe(3);
      expect(result.files).toEqual(["main.go", "util.go", "handler.go"]);
    });

    it("parses no files needing formatting", () => {
      const result = parseGoFmtOutput("", "", 0, true);

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(0);
      expect(result.files).toEqual([]);
    });

    it("parses single file needing formatting", () => {
      const stdout = "main.go\n";
      const result = parseGoFmtOutput(stdout, "", 0, true);

      expect(result.success).toBe(false);
      expect(result.filesChanged).toBe(1);
      expect(result.files).toEqual(["main.go"]);
    });

    it("handles files with path separators", () => {
      const stdout = "pkg/server/handler.go\ncmd/main.go\n";
      const result = parseGoFmtOutput(stdout, "", 0, true);

      expect(result.success).toBe(false);
      expect(result.filesChanged).toBe(2);
      expect(result.files).toEqual(["pkg/server/handler.go", "cmd/main.go"]);
    });
  });

  describe("fix mode (-w)", () => {
    it("parses successful fix with no output", () => {
      const result = parseGoFmtOutput("", "", 0, false);

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(0);
      expect(result.files).toEqual([]);
    });

    it("handles error exit code", () => {
      const result = parseGoFmtOutput("", "error: could not parse file.go", 2, false);

      expect(result.success).toBe(false);
    });
  });

  describe("error cases", () => {
    it("handles gofmt error with non-zero exit code", () => {
      const stderr = "main.go:5:1: expected declaration, got '}'";
      const result = parseGoFmtOutput("", stderr, 2, true);

      expect(result.success).toBe(false);
    });
  });
});

describe("formatGoFmt", () => {
  it("formats all files formatted (success)", () => {
    const data: GoFmtResult = {
      success: true,
      filesChanged: 0,
      files: [],
    };
    const output = formatGoFmt(data);
    expect(output).toBe("gofmt: all files formatted.");
  });

  it("formats files needing changes", () => {
    const data: GoFmtResult = {
      success: false,
      filesChanged: 2,
      files: ["main.go", "util.go"],
    };
    const output = formatGoFmt(data);
    expect(output).toContain("gofmt: 2 files");
    expect(output).toContain("main.go");
    expect(output).toContain("util.go");
  });

  it("formats single file needing changes", () => {
    const data: GoFmtResult = {
      success: false,
      filesChanged: 1,
      files: ["main.go"],
    };
    const output = formatGoFmt(data);
    expect(output).toContain("gofmt: 1 files");
    expect(output).toContain("main.go");
  });
});
