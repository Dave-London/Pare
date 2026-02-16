import { describe, it, expect } from "vitest";
import { parseBiomeFormat } from "../src/lib/parsers.js";
import { formatFormatWrite } from "../src/lib/formatters.js";
import type { FormatWriteResult } from "../src/schemas/index.js";

describe("parseBiomeFormat", () => {
  it("parses JSON output from biome format --write --reporter=json", () => {
    const json = JSON.stringify({
      summary: { changed: 2, unchanged: 3, errors: 0, warnings: 0 },
      diagnostics: [],
      command: "format",
    });

    const result = parseBiomeFormat(json, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(3);
  });

  it("parses JSON output with format diagnostics containing file paths", () => {
    const json = JSON.stringify({
      summary: { changed: 0, unchanged: 1, errors: 1, warnings: 0 },
      diagnostics: [
        {
          severity: "error",
          message: "Formatter would have printed the following content:",
          category: "format",
          location: {
            path: "/tmp/test.ts",
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 },
          },
          advices: [],
        },
      ],
      command: "format",
    });

    const result = parseBiomeFormat(json, "", 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(1);
    expect(result.files).toEqual(["/tmp/test.ts"]);
  });

  it("parses JSON with all files changed and no unchanged", () => {
    const json = JSON.stringify({
      summary: { changed: 5, unchanged: 0, errors: 0, warnings: 0 },
      diagnostics: [],
      command: "format",
    });

    const result = parseBiomeFormat(json, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(5);
    expect(result.filesUnchanged).toBeUndefined();
  });

  it("falls back to text parsing for non-JSON output", () => {
    const stdout = ["src/index.ts", "src/utils.ts"].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("returns empty files when no files were formatted (text)", () => {
    const result = parseBiomeFormat("", "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
  });

  it("handles exit code failure", () => {
    const result = parseBiomeFormat("", "biome not found", 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(0);
  });

  it("parses text summary with Fixed count", () => {
    const stdout = [
      "src/index.ts",
      "src/utils.ts",
      "Formatted 5 files in 50ms. Fixed 2 files.",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(3);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("filters out Checked summary lines in text mode", () => {
    const stdout = ["src/app.tsx", "Checked 5 files in 20ms. No fixes needed."].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.files).toEqual(["src/app.tsx"]);
    expect(result.filesChanged).toBe(1);
  });

  it("handles various file extensions in text mode", () => {
    const stdout = ["src/app.tsx", "styles/main.css", "config.json", "lib/helpers.js"].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.filesChanged).toBe(4);
    expect(result.files).toEqual([
      "src/app.tsx",
      "styles/main.css",
      "config.json",
      "lib/helpers.js",
    ]);
  });

  it("skips --json unstable warning line in text output", () => {
    const stdout = [
      "The --json option is unstable/experimental and its output might change between patches/minor releases.",
      "src/app.tsx",
    ].join("\n");

    const result = parseBiomeFormat(stdout, "", 0);

    expect(result.files).toEqual(["src/app.tsx"]);
    expect(result.filesChanged).toBe(1);
  });

  it("parses JSON summary with zero changed (all already formatted)", () => {
    const json = JSON.stringify({
      summary: { changed: 0, unchanged: 10, errors: 0, warnings: 0 },
      diagnostics: [],
      command: "format",
    });

    const result = parseBiomeFormat(json, "", 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(10);
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

  it("formats result with filesUnchanged count", () => {
    const data: FormatWriteResult = {
      filesChanged: 2,
      filesUnchanged: 8,
      files: ["src/a.ts", "src/b.ts"],
      success: true,
    };

    const output = formatFormatWrite(data);
    expect(output).toContain("Formatted 2 files (8 already formatted):");
    expect(output).toContain("src/a.ts");
  });

  it("formats result with all unchanged and filesUnchanged", () => {
    const data: FormatWriteResult = {
      filesChanged: 0,
      filesUnchanged: 10,
      files: [],
      success: true,
    };

    expect(formatFormatWrite(data)).toBe("All 10 files already formatted.");
  });
});
