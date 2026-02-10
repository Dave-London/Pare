import { describe, it, expect } from "vitest";
import { parsePrettierWrite } from "../src/lib/parsers.js";
import { formatFormatWrite } from "../src/lib/formatters.js";
import type { FormatWriteResult } from "../src/schemas/index.js";

describe("parsePrettierWrite", () => {
  it("parses file paths from Prettier --write output", () => {
    const stdout = ["src/index.ts", "src/utils.ts", "src/config.ts"].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(3);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts", "src/config.ts"]);
  });

  it("returns empty files when no files were changed", () => {
    const result = parsePrettierWrite("", "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles exit code failure", () => {
    const result = parsePrettierWrite("", "error: no parser found", 2);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
  });

  it("filters out non-file-path lines", () => {
    const stdout = [
      "src/index.ts",
      "[warn] some warning message",
      "src/utils.ts",
      "Checking formatting...",
      "All matched files use Prettier code style!",
    ].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.filesChanged).toBe(2);
  });

  it("handles files with various extensions", () => {
    const stdout = [
      "src/app.tsx",
      "styles/main.css",
      "config/settings.json",
      "docs/readme.md",
    ].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.filesChanged).toBe(4);
    expect(result.files).toEqual([
      "src/app.tsx",
      "styles/main.css",
      "config/settings.json",
      "docs/readme.md",
    ]);
  });
});

describe("formatFormatWrite", () => {
  it("formats successful result with changed files", () => {
    const data: FormatWriteResult = {
      filesChanged: 2,
      files: ["src/index.ts", "src/utils.ts"],
      success: true,
    };

    const output = formatFormatWrite(data);
    expect(output).toContain("Formatted 2 files:");
    expect(output).toContain("src/index.ts");
    expect(output).toContain("src/utils.ts");
  });

  it("formats result when all files already formatted", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: true,
    };

    expect(formatFormatWrite(data)).toBe("All files already formatted.");
  });

  it("formats failure result", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
    };

    expect(formatFormatWrite(data)).toBe("Format failed.");
  });
});
