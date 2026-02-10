import { describe, it, expect } from "vitest";
import {
  parseStatus,
  parseLog,
  parseDiffStat,
  parseBranch,
  parseShow,
} from "../src/lib/parsers.js";

describe("parseStatus", () => {
  it("parses clean repo", () => {
    const result = parseStatus("", "## main...origin/main");
    expect(result.clean).toBe(true);
    expect(result.branch).toBe("main");
    expect(result.upstream).toBe("origin/main");
  });

  it("parses staged, modified, untracked files", () => {
    const porcelain = [
      "M  src/index.ts",
      "A  src/new.ts",
      " M README.md",
      "?? temp.log",
      "?? dist/",
    ].join("\n");

    const result = parseStatus(porcelain, "## feature...origin/feature [ahead 2]");

    expect(result.branch).toBe("feature");
    expect(result.upstream).toBe("origin/feature");
    expect(result.ahead).toBe(2);
    expect(result.behind).toBeUndefined();
    expect(result.staged).toEqual([
      { file: "src/index.ts", status: "modified" },
      { file: "src/new.ts", status: "added" },
    ]);
    expect(result.modified).toEqual(["README.md"]);
    expect(result.untracked).toEqual(["temp.log", "dist/"]);
    expect(result.clean).toBe(false);
  });

  it("parses deleted files", () => {
    const porcelain = "D  old-file.ts";
    const result = parseStatus(porcelain, "## main");

    expect(result.staged).toEqual([{ file: "old-file.ts", status: "deleted" }]);
  });

  it("parses renamed files", () => {
    const porcelain = "R  old-name.ts -> new-name.ts";
    const result = parseStatus(porcelain, "## main");

    expect(result.staged).toEqual([
      { file: "new-name.ts", status: "renamed", oldFile: "old-name.ts" },
    ]);
  });

  it("parses conflicts", () => {
    const porcelain = ["UU conflicted.ts", "AA both-added.ts"].join("\n");
    const result = parseStatus(porcelain, "## main");

    expect(result.conflicts).toEqual(["conflicted.ts", "both-added.ts"]);
  });

  it("parses ahead and behind", () => {
    const result = parseStatus("", "## dev...origin/dev [ahead 3, behind 1]");

    expect(result.branch).toBe("dev");
    expect(result.ahead).toBe(3);
    expect(result.behind).toBe(1);
  });

  it("handles detached HEAD", () => {
    const result = parseStatus("", "## HEAD (no branch)");
    expect(result.branch).toBe("HEAD");
  });

  it("handles branch with no upstream", () => {
    const result = parseStatus("", "## new-branch");
    expect(result.branch).toBe("new-branch");
    expect(result.upstream).toBeUndefined();
  });
});

describe("parseLog", () => {
  it("parses formatted log output", () => {
    const DELIM = "\x1f";
    const stdout = [
      `abc1234567890${DELIM}abc1234${DELIM}Jane Doe${DELIM}jane@example.com${DELIM}2 hours ago${DELIM}HEAD -> main${DELIM}Fix the bug`,
      `def5678901234${DELIM}def5678${DELIM}John Smith${DELIM}john@example.com${DELIM}1 day ago${DELIM}${DELIM}Add feature X`,
    ].join("\n");

    const result = parseLog(stdout);

    expect(result.total).toBe(2);
    expect(result.commits[0]).toEqual({
      hash: "abc1234567890",
      hashShort: "abc1234",
      author: "Jane Doe",
      email: "jane@example.com",
      date: "2 hours ago",
      message: "Fix the bug",
      refs: "HEAD -> main",
    });
    expect(result.commits[1].message).toBe("Add feature X");
    expect(result.commits[1].refs).toBeUndefined();
  });

  it("handles empty log", () => {
    const result = parseLog("");
    expect(result.total).toBe(0);
    expect(result.commits).toEqual([]);
  });
});

describe("parseDiffStat", () => {
  it("parses numstat output", () => {
    const stdout = ["10\t2\tsrc/index.ts", "0\t5\told-file.ts", "25\t0\tnew-file.ts"].join("\n");

    const result = parseDiffStat(stdout);

    expect(result.totalFiles).toBe(3);
    expect(result.totalAdditions).toBe(35);
    expect(result.totalDeletions).toBe(7);
    expect(result.files[0]).toEqual({
      file: "src/index.ts",
      status: "modified",
      additions: 10,
      deletions: 2,
    });
    expect(result.files[1].status).toBe("deleted");
    expect(result.files[2].status).toBe("added");
  });

  it("handles binary files (- - markers)", () => {
    const stdout = "-\t-\timage.png";
    const result = parseDiffStat(stdout);

    expect(result.files[0].additions).toBe(0);
    expect(result.files[0].deletions).toBe(0);
  });

  it("handles empty diff", () => {
    const result = parseDiffStat("");
    expect(result.totalFiles).toBe(0);
    expect(result.files).toEqual([]);
  });
});

describe("parseBranch", () => {
  it("parses branch list with current branch", () => {
    const stdout = ["  dev", "* main", "  feature/auth"].join("\n");

    const result = parseBranch(stdout);

    expect(result.current).toBe("main");
    expect(result.branches).toHaveLength(3);
    expect(result.branches[0]).toEqual({ name: "dev", current: false });
    expect(result.branches[1]).toEqual({ name: "main", current: true });
    expect(result.branches[2]).toEqual({ name: "feature/auth", current: false });
  });

  it("handles single branch", () => {
    const result = parseBranch("* main");
    expect(result.current).toBe("main");
    expect(result.branches).toHaveLength(1);
  });
});

describe("parseShow", () => {
  it("parses commit info and diff stats", () => {
    const DELIM = "\x1f";
    const commitInfo = `abc123${DELIM}Jane Doe${DELIM}jane@example.com${DELIM}2 hours ago${DELIM}Fix critical bug in parser`;
    const diffStat = "5\t2\tsrc/parser.ts\n1\t1\ttests/parser.test.ts";

    const result = parseShow(commitInfo, diffStat);

    expect(result.hash).toBe("abc123");
    expect(result.author).toBe("Jane Doe");
    expect(result.email).toBe("jane@example.com");
    expect(result.date).toBe("2 hours ago");
    expect(result.message).toBe("Fix critical bug in parser");
    expect(result.diff.totalFiles).toBe(2);
    expect(result.diff.totalAdditions).toBe(6);
    expect(result.diff.totalDeletions).toBe(3);
  });
});
