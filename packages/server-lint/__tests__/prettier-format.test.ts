import { describe, it, expect } from "vitest";
import {
  parsePrettierWrite,
  parsePrettierListDifferent,
  buildPrettierWriteResult,
} from "../src/lib/parsers.js";
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

  it("strips trailing timing info from file paths", () => {
    const stdout = ["src/index.ts 24ms", "src/utils.ts 12ms"].join("\n");

    const result = parsePrettierWrite(stdout, "", 0);

    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.filesChanged).toBe(2);
  });
});

describe("parsePrettierListDifferent", () => {
  it("parses file paths from --list-different output", () => {
    const stdout = ["src/index.ts", "src/utils.ts"].join("\n");

    const files = parsePrettierListDifferent(stdout);

    expect(files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("returns empty array for empty output (all files formatted)", () => {
    const files = parsePrettierListDifferent("");

    expect(files).toEqual([]);
  });

  it("handles single file", () => {
    const files = parsePrettierListDifferent("src/index.ts\n");

    expect(files).toEqual(["src/index.ts"]);
  });

  it("filters out lines without file extensions", () => {
    const stdout = ["src/index.ts", "some random text", "src/utils.ts"].join("\n");

    const files = parsePrettierListDifferent(stdout);

    expect(files).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("handles various file extensions", () => {
    const stdout = ["src/app.tsx", "styles/main.css", "config.json", "README.md"].join("\n");

    const files = parsePrettierListDifferent(stdout);

    expect(files).toEqual(["src/app.tsx", "styles/main.css", "config.json", "README.md"]);
  });

  it("trims whitespace from lines", () => {
    const stdout = ["  src/index.ts  ", "  src/utils.ts  "].join("\n");

    const files = parsePrettierListDifferent(stdout);

    expect(files).toEqual(["src/index.ts", "src/utils.ts"]);
  });
});

describe("buildPrettierWriteResult", () => {
  it("builds result with changed files and total count", () => {
    const result = buildPrettierWriteResult(["src/index.ts", "src/utils.ts"], 0, 10);

    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(8);
    expect(result.files).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.success).toBe(true);
  });

  it("builds result with no changed files", () => {
    const result = buildPrettierWriteResult([], 0, 5);

    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(5);
    expect(result.files).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("builds result without total count", () => {
    const result = buildPrettierWriteResult(["src/index.ts"], 0);

    expect(result.filesChanged).toBe(1);
    expect(result.filesUnchanged).toBeUndefined();
    expect(result.files).toEqual(["src/index.ts"]);
    expect(result.success).toBe(true);
  });

  it("builds result with failed exit code", () => {
    const result = buildPrettierWriteResult(["src/index.ts"], 2, 5);

    expect(result.filesChanged).toBe(1);
    expect(result.success).toBe(false);
  });

  it("handles totalFilesProcessed of 0", () => {
    const result = buildPrettierWriteResult([], 0, 0);

    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBeUndefined();
    expect(result.success).toBe(true);
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

  it("formats result with filesUnchanged", () => {
    const data: FormatWriteResult = {
      filesChanged: 3,
      filesUnchanged: 7,
      files: ["a.ts", "b.ts", "c.ts"],
      success: true,
    };

    const output = formatFormatWrite(data);
    expect(output).toContain("Formatted 3 files (7 already formatted):");
  });
});
