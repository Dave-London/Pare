import { describe, it, expect } from "vitest";
import { parseRgJsonOutput, parseFdOutput, parseRgCountOutput } from "../src/lib/parsers.js";

describe("parseRgJsonOutput", () => {
  it("parses match events from rg --json output", () => {
    const stdout = [
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/foo.ts" },
          lines: { text: "const x = 1;\n" },
          line_number: 42,
          absolute_offset: 1234,
          submatches: [{ match: { text: "x" }, start: 6, end: 7 }],
        },
      }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/bar.ts" },
          lines: { text: "let y = x + 2;\n" },
          line_number: 10,
          absolute_offset: 500,
          submatches: [{ match: { text: "x" }, start: 8, end: 9 }],
        },
      }),
      JSON.stringify({
        type: "summary",
        data: {
          stats: {
            searches_with_match: 2,
            bytes_searched: 12345,
          },
        },
      }),
    ].join("\n");

    const result = parseRgJsonOutput(stdout, 1000);

    expect(result.totalMatches).toBe(2);
    expect(result.filesSearched).toBe(2);
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]).toEqual({
      file: "src/foo.ts",
      line: 42,
      column: 7, // 1-based: start(6) + 1
      matchText: "x",
      lineContent: "const x = 1;",
    });
    expect(result.matches[1]).toEqual({
      file: "src/bar.ts",
      line: 10,
      column: 9, // 1-based: start(8) + 1
      matchText: "x",
      lineContent: "let y = x + 2;",
    });
  });

  it("respects maxResults limit", () => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(
        JSON.stringify({
          type: "match",
          data: {
            path: { text: `file${i}.ts` },
            lines: { text: `line ${i}\n` },
            line_number: i + 1,
            absolute_offset: i * 100,
            submatches: [{ match: { text: "line" }, start: 0, end: 4 }],
          },
        }),
      );
    }
    const stdout = lines.join("\n");

    const result = parseRgJsonOutput(stdout, 3);

    expect(result.totalMatches).toBe(3);
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0].file).toBe("file0.ts");
    expect(result.matches[2].file).toBe("file2.ts");
  });

  it("handles empty output", () => {
    const result = parseRgJsonOutput("", 1000);

    expect(result.totalMatches).toBe(0);
    expect(result.filesSearched).toBe(0);
    expect(result.matches).toHaveLength(0);
  });

  it("skips non-JSON lines gracefully", () => {
    const stdout = [
      "not valid json",
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/valid.ts" },
          lines: { text: "found it\n" },
          line_number: 1,
          absolute_offset: 0,
          submatches: [{ match: { text: "found" }, start: 0, end: 5 }],
        },
      }),
      "another invalid line",
    ].join("\n");

    const result = parseRgJsonOutput(stdout, 1000);

    expect(result.totalMatches).toBe(1);
    expect(result.matches[0].file).toBe("src/valid.ts");
  });

  it("skips non-match type events", () => {
    const stdout = [
      JSON.stringify({ type: "begin", data: { path: { text: "src/foo.ts" } } }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/foo.ts" },
          lines: { text: "hello world\n" },
          line_number: 5,
          absolute_offset: 100,
          submatches: [{ match: { text: "hello" }, start: 0, end: 5 }],
        },
      }),
      JSON.stringify({ type: "end", data: { path: { text: "src/foo.ts" }, stats: {} } }),
    ].join("\n");

    const result = parseRgJsonOutput(stdout, 1000);

    expect(result.totalMatches).toBe(1);
    expect(result.matches[0].matchText).toBe("hello");
  });

  it("counts unique files when no summary line is present", () => {
    const stdout = [
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/a.ts" },
          lines: { text: "match1\n" },
          line_number: 1,
          absolute_offset: 0,
          submatches: [{ match: { text: "match1" }, start: 0, end: 6 }],
        },
      }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/a.ts" },
          lines: { text: "match2\n" },
          line_number: 5,
          absolute_offset: 50,
          submatches: [{ match: { text: "match2" }, start: 0, end: 6 }],
        },
      }),
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "src/b.ts" },
          lines: { text: "match3\n" },
          line_number: 3,
          absolute_offset: 200,
          submatches: [{ match: { text: "match3" }, start: 0, end: 6 }],
        },
      }),
    ].join("\n");

    const result = parseRgJsonOutput(stdout, 1000);

    expect(result.totalMatches).toBe(3);
    // No summary line, so filesSearched falls back to unique file count
    expect(result.filesSearched).toBe(2);
  });
});

describe("parseFdOutput", () => {
  it("parses fd output with file paths", () => {
    const stdout = ["src/index.ts", "src/lib/parsers.ts", "README.md"].join("\n");

    const result = parseFdOutput(stdout, 1000);

    expect(result.total).toBe(3);
    expect(result.files).toHaveLength(3);
    expect(result.files[0]).toEqual({
      path: "src/index.ts",
      name: "index.ts",
      ext: ".ts",
    });
    expect(result.files[1]).toEqual({
      path: "src/lib/parsers.ts",
      name: "parsers.ts",
      ext: ".ts",
    });
    expect(result.files[2]).toEqual({
      path: "README.md",
      name: "README.md",
      ext: ".md",
    });
  });

  it("handles files without extensions", () => {
    const stdout = ["Makefile", "Dockerfile", ".gitignore"].join("\n");

    const result = parseFdOutput(stdout, 1000);

    expect(result.total).toBe(3);
    expect(result.files[0]).toEqual({
      path: "Makefile",
      name: "Makefile",
      ext: "",
    });
    expect(result.files[1]).toEqual({
      path: "Dockerfile",
      name: "Dockerfile",
      ext: "",
    });
    expect(result.files[2]).toEqual({
      path: ".gitignore",
      name: ".gitignore",
      ext: "",
    });
  });

  it("respects maxResults limit", () => {
    const stdout = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"].join("\n");

    const result = parseFdOutput(stdout, 3);

    expect(result.total).toBe(3);
    expect(result.files).toHaveLength(3);
  });

  it("handles empty output", () => {
    const result = parseFdOutput("", 1000);

    expect(result.total).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("handles trailing newlines and blank lines", () => {
    const stdout = "src/index.ts\n\nsrc/lib/foo.ts\n\n";

    const result = parseFdOutput(stdout, 1000);

    expect(result.total).toBe(2);
    expect(result.files[0].path).toBe("src/index.ts");
    expect(result.files[1].path).toBe("src/lib/foo.ts");
  });
});

describe("parseRgCountOutput", () => {
  it("parses rg --count output with file:count format", () => {
    const stdout = ["src/index.ts:5", "src/lib/parsers.ts:12", "README.md:1"].join("\n");

    const result = parseRgCountOutput(stdout);

    expect(result.totalFiles).toBe(3);
    expect(result.totalMatches).toBe(18);
    expect(result.files).toHaveLength(3);
    expect(result.files[0]).toEqual({ file: "src/index.ts", count: 5 });
    expect(result.files[1]).toEqual({ file: "src/lib/parsers.ts", count: 12 });
    expect(result.files[2]).toEqual({ file: "README.md", count: 1 });
  });

  it("handles Windows paths with drive letter colons", () => {
    const stdout = "C:\\Users\\code\\file.ts:3";

    const result = parseRgCountOutput(stdout);

    expect(result.totalFiles).toBe(1);
    expect(result.files[0]).toEqual({ file: "C:\\Users\\code\\file.ts", count: 3 });
  });

  it("handles empty output", () => {
    const result = parseRgCountOutput("");

    expect(result.totalFiles).toBe(0);
    expect(result.totalMatches).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it("skips lines without colon separator", () => {
    const stdout = ["valid.ts:5", "no-colon-here", "also_valid.ts:2"].join("\n");

    const result = parseRgCountOutput(stdout);

    expect(result.totalFiles).toBe(2);
    expect(result.totalMatches).toBe(7);
  });

  it("skips lines with non-numeric count", () => {
    const stdout = ["file.ts:abc", "other.ts:10"].join("\n");

    const result = parseRgCountOutput(stdout);

    expect(result.totalFiles).toBe(1);
    expect(result.totalMatches).toBe(10);
    expect(result.files[0]).toEqual({ file: "other.ts", count: 10 });
  });
});
