import { describe, it, expect } from "vitest";
import { parseAdd } from "../src/lib/parsers.js";
import { formatAdd } from "../src/lib/formatters.js";
import type { GitAdd } from "../src/schemas/index.js";

describe("parseAdd", () => {
  it("parses staged files from porcelain status output", () => {
    const statusOutput = ["A  src/new-file.ts", "M  src/index.ts", "?? untracked.log"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(2);
    expect(result.files).toEqual([
      { file: "src/new-file.ts", status: "added" },
      { file: "src/index.ts", status: "modified" },
    ]);
  });

  it("handles no staged files", () => {
    const statusOutput = ["?? untracked.log", " M not-staged.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(0);
    expect(result.files).toEqual([]);
  });

  it("handles empty status output", () => {
    const result = parseAdd("");

    expect(result.files).toHaveLength(0);
    expect(result.files).toEqual([]);
  });

  it("handles renamed files", () => {
    const statusOutput = "R  old-name.ts -> new-name.ts";

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(1);
    expect(result.files).toEqual([{ file: "new-name.ts", status: "modified" }]);
  });

  it("handles deleted files", () => {
    const statusOutput = "D  removed-file.ts";

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(1);
    expect(result.files).toEqual([{ file: "removed-file.ts", status: "deleted" }]);
  });

  it("handles mix of staged and unstaged changes", () => {
    const statusOutput = [
      "M  staged.ts",
      " M unstaged.ts",
      "A  added.ts",
      "?? untracked.ts",
      " D deleted-unstaged.ts",
    ].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(2);
    expect(result.files).toEqual([
      { file: "staged.ts", status: "modified" },
      { file: "added.ts", status: "added" },
    ]);
  });

  it("handles all files staged via git add -A", () => {
    const statusOutput = ["A  src/a.ts", "A  src/b.ts", "M  src/c.ts", "D  src/old.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.files).toHaveLength(4);
    expect(result.files).toEqual([
      { file: "src/a.ts", status: "added" },
      { file: "src/b.ts", status: "added" },
      { file: "src/c.ts", status: "modified" },
      { file: "src/old.ts", status: "deleted" },
    ]);
  });
});

describe("formatAdd", () => {
  it("formats staged files", () => {
    const data: GitAdd = {
      files: [
        { file: "src/a.ts", status: "added" },
        { file: "src/b.ts", status: "modified" },
      ],
    };
    expect(formatAdd(data)).toBe("Staged 2 file(s): a:src/a.ts, m:src/b.ts");
  });

  it("formats no staged files", () => {
    const data: GitAdd = { files: [] };
    expect(formatAdd(data)).toBe("No files staged");
  });

  it("formats single staged file", () => {
    const data: GitAdd = { files: [{ file: "README.md", status: "added" }] };
    expect(formatAdd(data)).toBe("Staged 1 file(s): a:README.md");
  });
});
