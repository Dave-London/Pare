import { describe, it, expect } from "vitest";
import { parsePrDiffNumstat } from "../src/lib/parsers.js";
import { formatPrDiff, compactPrDiffMap, formatPrDiffCompact } from "../src/lib/formatters.js";
import type { PrDiffResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrDiffNumstat", () => {
  it("parses numstat output with multiple files", () => {
    const stdout = [
      "10\t2\tsrc/index.ts",
      "5\t0\tsrc/lib/new-file.ts",
      "0\t8\tsrc/lib/removed.ts",
    ].join("\n");

    const result = parsePrDiffNumstat(stdout);

    expect(result.files).toHaveLength(3);
    expect(result.files[0]).toEqual({
      file: "src/index.ts",
      status: "modified",
      additions: 10,
      deletions: 2,
    });
    expect(result.files[1]).toEqual({
      file: "src/lib/new-file.ts",
      status: "added",
      additions: 5,
      deletions: 0,
    });
    expect(result.files[2]).toEqual({
      file: "src/lib/removed.ts",
      status: "deleted",
      additions: 0,
      deletions: 8,
    });
  });

  it("handles empty output", () => {
    const result = parsePrDiffNumstat("");
    expect(result.files).toEqual([]);
  });

  it("handles binary files with dash stats", () => {
    const stdout = "-\t-\timage.png";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0]).toEqual({
      file: "image.png",
      status: "modified",
      additions: 0,
      deletions: 0,
    });
  });

  it("handles renamed files", () => {
    const stdout = "5\t3\told-name.ts => new-name.ts";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].file).toBe("old-name.ts => new-name.ts");
    expect(result.files[0].oldFile).toBe("old-name.ts");
  });

  it("handles renamed files with braces", () => {
    const stdout = "2\t1\tsrc/{old => new}/file.ts";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].file).toBe("src/{old => new}/file.ts");
  });

  it("handles single file", () => {
    const stdout = "42\t7\tREADME.md\n";
    const result = parsePrDiffNumstat(stdout);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].additions).toBe(42);
    expect(result.files[0].deletions).toBe(7);
    expect(result.files[0].status).toBe("modified");
  });
});

// ── Binary field test (parsePrDiffFromPatch is tested via integration) ──

// We cannot directly test parsePrDiffFromPatch here since it's a local function
// in the tool file. The binary detection is tested via the formatter test below.

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrDiff", () => {
  const data: PrDiffResult = {
    files: [
      { file: "src/index.ts", status: "modified", additions: 10, deletions: 2 },
      { file: "src/lib/new.ts", status: "added", additions: 50, deletions: 0 },
    ],
  };

  it("formats diff with file stats", () => {
    const output = formatPrDiff(data);
    expect(output).toContain("2 files changed, +60 -2");
    expect(output).toContain("src/index.ts +10 -2");
    expect(output).toContain("src/lib/new.ts +50 -0");
  });

  it("formats empty diff", () => {
    const empty: PrDiffResult = {
      files: [],
    };
    const output = formatPrDiff(empty);
    expect(output).toContain("0 files changed, +0 -0");
  });

  it("shows binary indicator for binary files", () => {
    const binaryDiff: PrDiffResult = {
      files: [
        { file: "image.png", status: "added", additions: 0, deletions: 0, binary: true },
        { file: "src/index.ts", status: "modified", additions: 5, deletions: 2 },
      ],
    };
    const output = formatPrDiff(binaryDiff);
    expect(output).toContain("image.png +0 -0 (binary)");
    expect(output).not.toContain("src/index.ts +5 -2 (binary)");
  });
});

describe("compactPrDiff", () => {
  it("maps to compact format without chunks", () => {
    const data: PrDiffResult = {
      files: [
        {
          file: "src/index.ts",
          status: "modified",
          additions: 10,
          deletions: 2,
          chunks: [{ header: "@@ -1,5 +1,7 @@", lines: "+new line\n old line" }],
        },
      ],
    };

    const compact = compactPrDiffMap(data);
    expect(compact.files).toHaveLength(1);
    expect(compact.files[0]).not.toHaveProperty("chunks");

    const text = formatPrDiffCompact(compact);
    expect(text).toContain("1 files changed");
    expect(text).toContain("src/index.ts +10 -2");
  });
});
