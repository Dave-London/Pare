import { describe, it, expect } from "vitest";
import { parseBiomeFormat } from "../src/lib/parsers.js";
import { formatFormatWrite } from "../src/lib/formatters.js";
import type { FormatWriteResult } from "../src/schemas/index.js";

describe("parseBiomeFormat", () => {
  it("parses file paths from Biome format --write output", () => {
    const stdout = ["src/index.ts", "src/utils.ts"].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("returns empty files when no files were formatted", () => {
    const result = parseBiomeFormat("", "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles exit code failure", () => {
    const result = parseBiomeFormat("", "biome not found", 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
  });

  it("filters out summary lines from Biome output", () => {
    const stdout = [
      "src/index.ts",
      "src/utils.ts",
      "Formatted 2 files in 50ms.",
      "Fixed 2 files.",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.filesChanged).toBe(2);
  });

  it("filters out Checked summary lines", () => {
    const stdout = [
      "src/app.tsx",
      "Checked 5 files in 20ms. No fixes needed.",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.files).toEqual(["src/app.tsx"]);
    expect(result.filesChanged).toBe(1);
  });

  it("handles various file extensions", () => {
    const stdout = [
      "src/app.tsx",
      "styles/main.css",
      "config.json",
      "lib/helpers.js",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.filesChanged).toBe(4);
    expect(result.files).toEqual([
      "src/app.tsx",
      "styles/main.css",
      "config.json",
      "lib/helpers.js",
    ]);
  });
});

describe("formatFormatWrite (biome context)", () => {
  it("formats successful biome format result", () => {
    const data: FormatWriteResult = {
      filesChanged: 3,
      files: ["src/a.ts", "src/b.ts", "src/c.ts"],
      success: true,
    };

    const output = formatFormatWrite(data);
    expect(output).toContain("Formatted 3 files:");
    expect(output).toContain("src/a.ts");
    expect(output).toContain("src/b.ts");
    expect(output).toContain("src/c.ts");
  });

  it("formats when nothing needed formatting", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: true,
    };

    expect(formatFormatWrite(data)).toBe("All files already formatted.");
  });

  it("formats failure", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      files: [],
      success: false,
    };

    expect(formatFormatWrite(data)).toBe("Format failed.");
  });
});
