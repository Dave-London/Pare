import { describe, it, expect } from "vitest";
import { parseCargoFmtOutput } from "../src/lib/parsers.js";
import { formatCargoFmt } from "../src/lib/formatters.js";

describe("parseCargoFmtOutput", () => {
  describe("check mode", () => {
    it("parses files needing formatting (Diff in format)", () => {
      const stdout = [
        "Diff in src/main.rs at line 5:",
        "+    let x = 1;",
        "-let x = 1;",
        "Diff in src/lib.rs at line 10:",
        "+    fn foo() {}",
        "-fn foo() {}",
      ].join("\n");

      const result = parseCargoFmtOutput(stdout, "", 1, true);

      expect(result.success).toBe(false);
      expect(result.filesChanged).toBe(2);
      expect(result.files).toContain("src/main.rs");
      expect(result.files).toContain("src/lib.rs");
    });

    it("parses all formatted (no diff)", () => {
      const result = parseCargoFmtOutput("", "", 0, true);

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(0);
      expect(result.files).toEqual([]);
    });

    it("deduplicates file names with multiple diffs in same file", () => {
      const stdout = [
        "Diff in src/main.rs at line 5:",
        "+    let x = 1;",
        "Diff in src/main.rs at line 20:",
        "+    let y = 2;",
      ].join("\n");

      const result = parseCargoFmtOutput(stdout, "", 1, true);

      expect(result.filesChanged).toBe(1);
      expect(result.files).toEqual(["src/main.rs"]);
    });

    it("parses file paths listed directly (alternate format)", () => {
      const stdout = ["src/main.rs", "src/lib.rs"].join("\n");

      const result = parseCargoFmtOutput(stdout, "", 1, true);

      expect(result.filesChanged).toBe(2);
      expect(result.files).toContain("src/main.rs");
      expect(result.files).toContain("src/lib.rs");
    });

    it("ignores diff marker lines", () => {
      const stdout = [
        "Diff in src/main.rs at line 5:",
        "+    let x = 1;",
        "-let x = 1;",
        "@@ -5,3 +5,3 @@",
      ].join("\n");

      const result = parseCargoFmtOutput(stdout, "", 1, true);

      // Only src/main.rs should be counted, not diff markers
      expect(result.filesChanged).toBe(1);
    });
  });

  describe("fix mode", () => {
    it("returns empty files list in fix mode", () => {
      const result = parseCargoFmtOutput("", "", 0, false);

      expect(result.success).toBe(true);
      expect(result.filesChanged).toBe(0);
      expect(result.files).toEqual([]);
    });

    it("success in fix mode", () => {
      const result = parseCargoFmtOutput("", "", 0, false);

      expect(result.success).toBe(true);
    });
  });

  it("handles failure exit code", () => {
    const result = parseCargoFmtOutput("", "error: rustfmt not found", 1, true);

    expect(result.success).toBe(false);
  });
});

describe("formatCargoFmt", () => {
  it("formats all files formatted", () => {
    const output = formatCargoFmt({
      success: true,
      filesChanged: 0,
      files: [],
    });

    expect(output).toBe("cargo fmt: all files formatted.");
  });

  it("formats files needing changes", () => {
    const output = formatCargoFmt({
      success: false,
      filesChanged: 2,
      files: ["src/main.rs", "src/lib.rs"],
    });

    expect(output).toContain("cargo fmt: needs formatting (2 file(s))");
    expect(output).toContain("src/main.rs");
    expect(output).toContain("src/lib.rs");
  });

  it("formats successful fix with files changed", () => {
    const output = formatCargoFmt({
      success: true,
      filesChanged: 3,
      files: ["src/main.rs", "src/lib.rs", "src/utils.rs"],
    });

    expect(output).toContain("cargo fmt: success (3 file(s))");
  });
});
