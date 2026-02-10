import { describe, it, expect } from "vitest";
import { parseBlackOutput } from "../src/lib/parsers.js";
import { formatBlack } from "../src/lib/formatters.js";
import type { BlackResult } from "../src/schemas/index.js";

describe("parseBlackOutput", () => {
  it("parses check mode with files needing reformat", () => {
    const stderr = [
      "would reformat src/main.py",
      "would reformat src/utils.py",
      "Oh no! 2 files would be reformatted, 3 files would be left unchanged.",
    ].join("\n");

    const result = parseBlackOutput("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(3);
    expect(result.filesChecked).toBe(5);
    expect(result.wouldReformat).toEqual(["src/main.py", "src/utils.py"]);
  });

  it("parses check mode with all files formatted", () => {
    const stderr = "All done! 5 files would be left unchanged.";

    const result = parseBlackOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(5);
    expect(result.filesChecked).toBe(5);
    expect(result.wouldReformat).toEqual([]);
  });

  it("parses format mode with reformatted files", () => {
    const stderr = [
      "reformatted src/main.py",
      "reformatted src/utils.py",
      "All done! 2 files reformatted, 1 file left unchanged.",
    ].join("\n");

    const result = parseBlackOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.filesUnchanged).toBe(1);
    expect(result.filesChecked).toBe(3);
    expect(result.wouldReformat).toEqual(["src/main.py", "src/utils.py"]);
  });

  it("parses format mode with no changes needed", () => {
    const stderr = "All done! 3 files left unchanged.";

    const result = parseBlackOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(3);
    expect(result.filesChecked).toBe(3);
    expect(result.wouldReformat).toEqual([]);
  });

  it("handles no Python files found", () => {
    const stderr = "No Python files are present to be formatted. Nothing to do!";

    const result = parseBlackOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.filesUnchanged).toBe(0);
    expect(result.filesChecked).toBe(0);
    expect(result.wouldReformat).toEqual([]);
  });

  it("parses single file reformatted", () => {
    const stderr = [
      "reformatted app.py",
      "All done! 1 file reformatted.",
    ].join("\n");

    const result = parseBlackOutput("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(1);
    expect(result.wouldReformat).toEqual(["app.py"]);
  });
});

describe("formatBlack", () => {
  it("formats no files found", () => {
    const data: BlackResult = {
      filesChanged: 0,
      filesUnchanged: 0,
      filesChecked: 0,
      success: true,
      wouldReformat: [],
    };
    expect(formatBlack(data)).toBe("black: no Python files found.");
  });

  it("formats all files already formatted", () => {
    const data: BlackResult = {
      filesChanged: 0,
      filesUnchanged: 5,
      filesChecked: 5,
      success: true,
      wouldReformat: [],
    };
    expect(formatBlack(data)).toBe("black: 5 files already formatted.");
  });

  it("formats check mode with files needing reformat", () => {
    const data: BlackResult = {
      filesChanged: 2,
      filesUnchanged: 3,
      filesChecked: 5,
      success: false,
      wouldReformat: ["src/main.py", "src/utils.py"],
    };
    const output = formatBlack(data);

    expect(output).toContain("2 files would be reformatted, 3 unchanged");
    expect(output).toContain("src/main.py");
    expect(output).toContain("src/utils.py");
  });

  it("formats format mode with reformatted files", () => {
    const data: BlackResult = {
      filesChanged: 1,
      filesUnchanged: 4,
      filesChecked: 5,
      success: true,
      wouldReformat: ["src/main.py"],
    };
    const output = formatBlack(data);

    expect(output).toContain("1 files reformatted, 4 unchanged");
    expect(output).toContain("src/main.py");
  });
});
