import { describe, it, expect } from "vitest";
import { parseAdd } from "../src/lib/parsers.js";
import { formatAdd } from "../src/lib/formatters.js";
import type { GitAdd } from "../src/schemas/index.js";

describe("parseAdd", () => {
  it("parses staged files from porcelain status output", () => {
    const statusOutput = ["A  src/new-file.ts", "M  src/index.ts", "?? untracked.log"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.staged).toBe(2);
    expect(result.files).toEqual(["src/new-file.ts", "src/index.ts"]);
  });

  it("handles no staged files", () => {
    const statusOutput = ["?? untracked.log", " M not-staged.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.staged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles empty status output", () => {
    const result = parseAdd("");

    expect(result.staged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("handles renamed files", () => {
    const statusOutput = "R  old-name.ts -> new-name.ts";

    const result = parseAdd(statusOutput);

    expect(result.staged).toBe(1);
    expect(result.files).toEqual(["new-name.ts"]);
  });

  it("handles deleted files", () => {
    const statusOutput = "D  removed-file.ts";

    const result = parseAdd(statusOutput);

    expect(result.staged).toBe(1);
    expect(result.files).toEqual(["removed-file.ts"]);
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

    expect(result.staged).toBe(2);
    expect(result.files).toEqual(["staged.ts", "added.ts"]);
  });

  it("handles all files staged via git add -A", () => {
    const statusOutput = ["A  src/a.ts", "A  src/b.ts", "M  src/c.ts", "D  src/old.ts"].join("\n");

    const result = parseAdd(statusOutput);

    expect(result.staged).toBe(4);
    expect(result.files).toEqual(["src/a.ts", "src/b.ts", "src/c.ts", "src/old.ts"]);
  });
});

describe("formatAdd", () => {
  it("formats staged files", () => {
    const data: GitAdd = { staged: 2, files: ["src/a.ts", "src/b.ts"] };
    expect(formatAdd(data)).toBe("Staged 2 file(s): src/a.ts, src/b.ts");
  });

  it("formats no staged files", () => {
    const data: GitAdd = { staged: 0, files: [] };
    expect(formatAdd(data)).toBe("No files staged");
  });

  it("formats single staged file", () => {
    const data: GitAdd = { staged: 1, files: ["README.md"] };
    expect(formatAdd(data)).toBe("Staged 1 file(s): README.md");
  });
});
