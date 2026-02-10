import { describe, it, expect } from "vitest";
import { parseCommit } from "../src/lib/parsers.js";
import { formatCommit } from "../src/lib/formatters.js";
import type { GitCommit } from "../src/schemas/index.js";

describe("parseCommit", () => {
  it("parses standard commit output", () => {
    const stdout = `[main abc1234] Fix the bug
 1 file changed, 2 insertions(+), 1 deletion(-)`;

    const result = parseCommit(stdout);

    expect(result.hash).toBe("abc1234");
    expect(result.hashShort).toBe("abc1234");
    expect(result.message).toBe("Fix the bug");
    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(2);
    expect(result.deletions).toBe(1);
  });

  it("parses commit with multiple files changed", () => {
    const stdout = `[feature/auth def5678] Add authentication
 3 files changed, 150 insertions(+), 10 deletions(-)`;

    const result = parseCommit(stdout);

    expect(result.hash).toBe("def5678");
    expect(result.hashShort).toBe("def5678");
    expect(result.message).toBe("Add authentication");
    expect(result.filesChanged).toBe(3);
    expect(result.insertions).toBe(150);
    expect(result.deletions).toBe(10);
  });

  it("parses root commit", () => {
    const stdout = `[main (root-commit) aaa1111] Initial commit
 1 file changed, 1 insertion(+)`;

    const result = parseCommit(stdout);

    expect(result.hash).toBe("aaa1111");
    expect(result.hashShort).toBe("aaa1111");
    expect(result.message).toBe("Initial commit");
    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(1);
    expect(result.deletions).toBe(0);
  });

  it("parses commit with only insertions", () => {
    const stdout = `[main bbb2222] Add new file
 1 file changed, 25 insertions(+)`;

    const result = parseCommit(stdout);

    expect(result.insertions).toBe(25);
    expect(result.deletions).toBe(0);
  });

  it("parses commit with only deletions", () => {
    const stdout = `[main ccc3333] Remove old code
 1 file changed, 15 deletions(-)`;

    const result = parseCommit(stdout);

    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(15);
  });

  it("parses commit with long hash", () => {
    const stdout = `[main abcdef1234567] Refactor
 2 files changed, 10 insertions(+), 5 deletions(-)`;

    const result = parseCommit(stdout);

    expect(result.hash).toBe("abcdef1234567");
    expect(result.hashShort).toBe("abcdef1");
  });

  it("handles branch names with slashes", () => {
    const stdout = `[feat/git-ops abc1234] Add write tools
 5 files changed, 200 insertions(+), 10 deletions(-)`;

    const result = parseCommit(stdout);

    expect(result.hash).toBe("abc1234");
    expect(result.message).toBe("Add write tools");
    expect(result.filesChanged).toBe(5);
  });

  it("handles empty/unparseable output gracefully", () => {
    const result = parseCommit("");

    expect(result.hash).toBe("");
    expect(result.hashShort).toBe("");
    expect(result.message).toBe("");
    expect(result.filesChanged).toBe(0);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
  });
});

describe("formatCommit", () => {
  it("formats commit data", () => {
    const data: GitCommit = {
      hash: "abc1234567890",
      hashShort: "abc1234",
      message: "Fix the bug",
      filesChanged: 1,
      insertions: 2,
      deletions: 1,
    };
    const output = formatCommit(data);

    expect(output).toContain("[abc1234] Fix the bug");
    expect(output).toContain("1 file(s) changed, +2, -1");
  });

  it("formats commit with zero changes", () => {
    const data: GitCommit = {
      hash: "abc1234",
      hashShort: "abc1234",
      message: "Empty commit",
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
    };
    const output = formatCommit(data);

    expect(output).toContain("[abc1234] Empty commit");
    expect(output).toContain("0 file(s) changed, +0, -0");
  });
});
