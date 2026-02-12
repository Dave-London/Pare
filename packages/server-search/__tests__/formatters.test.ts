import { describe, it, expect } from "vitest";
import {
  formatSearch,
  formatFind,
  formatCount,
  compactSearchMap,
  compactFindMap,
  compactCountMap,
  formatSearchCompact,
  formatFindCompact,
  formatCountCompact,
} from "../src/lib/formatters.js";
import type { SearchResult, FindResult, CountResult } from "../src/schemas/index.js";

// ── Full formatters ─────────────────────────────────────────────────

describe("formatSearch", () => {
  it("formats matches with file locations", () => {
    const data: SearchResult = {
      matches: [
        { file: "src/foo.ts", line: 42, column: 7, matchText: "x", lineContent: "const x = 1;" },
        {
          file: "src/bar.ts",
          line: 10,
          column: 9,
          matchText: "x",
          lineContent: "let y = x + 2;",
        },
      ],
      totalMatches: 2,
      filesSearched: 2,
    };
    const output = formatSearch(data);
    expect(output).toContain("search: 2 matches in 2 files");
    expect(output).toContain("src/foo.ts:42:7: const x = 1;");
    expect(output).toContain("src/bar.ts:10:9: let y = x + 2;");
  });

  it("formats no matches", () => {
    const data: SearchResult = { matches: [], totalMatches: 0, filesSearched: 0 };
    expect(formatSearch(data)).toBe("search: no matches found.");
  });
});

describe("formatFind", () => {
  it("formats file listing", () => {
    const data: FindResult = {
      files: [
        { path: "src/index.ts", name: "index.ts", ext: ".ts" },
        { path: "README.md", name: "README.md", ext: ".md" },
      ],
      total: 2,
    };
    const output = formatFind(data);
    expect(output).toContain("find: 2 files");
    expect(output).toContain("src/index.ts");
    expect(output).toContain("README.md");
  });

  it("formats no files found", () => {
    const data: FindResult = { files: [], total: 0 };
    expect(formatFind(data)).toBe("find: no files found.");
  });
});

describe("formatCount", () => {
  it("formats per-file counts", () => {
    const data: CountResult = {
      files: [
        { file: "src/index.ts", count: 5 },
        { file: "src/lib/parsers.ts", count: 12 },
      ],
      totalMatches: 17,
      totalFiles: 2,
    };
    const output = formatCount(data);
    expect(output).toContain("count: 17 matches in 2 files");
    expect(output).toContain("src/index.ts: 5");
    expect(output).toContain("src/lib/parsers.ts: 12");
  });

  it("formats no matches", () => {
    const data: CountResult = { files: [], totalMatches: 0, totalFiles: 0 };
    expect(formatCount(data)).toBe("count: no matches found.");
  });
});

// ── Compact mappers ─────────────────────────────────────────────────

describe("compactSearchMap", () => {
  it("drops individual matches, keeps totals", () => {
    const data: SearchResult = {
      matches: [
        { file: "src/a.ts", line: 1, column: 1, matchText: "foo", lineContent: "const foo = 1;" },
      ],
      totalMatches: 1,
      filesSearched: 1,
    };
    const compact = compactSearchMap(data);
    expect(compact).toEqual({ totalMatches: 1, filesSearched: 1 });
    expect((compact as Record<string, unknown>)["matches"]).toBeUndefined();
  });
});

describe("compactFindMap", () => {
  it("drops individual file entries, keeps total", () => {
    const data: FindResult = {
      files: [{ path: "a.ts", name: "a.ts", ext: ".ts" }],
      total: 1,
    };
    const compact = compactFindMap(data);
    expect(compact).toEqual({ total: 1 });
    expect((compact as Record<string, unknown>)["files"]).toBeUndefined();
  });
});

describe("compactCountMap", () => {
  it("drops per-file breakdown, keeps totals", () => {
    const data: CountResult = {
      files: [{ file: "a.ts", count: 5 }],
      totalMatches: 5,
      totalFiles: 1,
    };
    const compact = compactCountMap(data);
    expect(compact).toEqual({ totalMatches: 5, totalFiles: 1 });
    expect((compact as Record<string, unknown>)["files"]).toBeUndefined();
  });
});

// ── Compact formatters ──────────────────────────────────────────────

describe("formatSearchCompact", () => {
  it("formats compact search summary", () => {
    expect(formatSearchCompact({ totalMatches: 10, filesSearched: 3 })).toBe(
      "search: 10 matches in 3 files",
    );
  });

  it("formats no matches", () => {
    expect(formatSearchCompact({ totalMatches: 0, filesSearched: 0 })).toBe(
      "search: no matches found.",
    );
  });
});

describe("formatFindCompact", () => {
  it("formats compact find summary", () => {
    expect(formatFindCompact({ total: 42 })).toBe("find: 42 files");
  });

  it("formats no files", () => {
    expect(formatFindCompact({ total: 0 })).toBe("find: no files found.");
  });
});

describe("formatCountCompact", () => {
  it("formats compact count summary", () => {
    expect(formatCountCompact({ totalMatches: 100, totalFiles: 5 })).toBe(
      "count: 100 matches in 5 files",
    );
  });

  it("formats no matches", () => {
    expect(formatCountCompact({ totalMatches: 0, totalFiles: 0 })).toBe("count: no matches found.");
  });
});
