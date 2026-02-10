import { describe, it, expect } from "vitest";
import {
  parseStatus,
  parseLog,
  parseDiffStat,
  parseBranch,
  parseShow,
  parseAdd,
  parseCommit,
  parsePush,
  parsePull,
  parseCheckout,
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
    const DELIM = "@@";
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
    const DELIM = "@@";
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

// ── Diff chunk splitting tests (full patch mode logic) ─────────────────

describe("parseDiffStat — chunk scenarios for full=true", () => {
  it("parseDiffStat correctly detects status for single-file add", () => {
    const numstat = "50\t0\tsrc/new-module.ts";
    const result = parseDiffStat(numstat);

    expect(result.totalFiles).toBe(1);
    expect(result.files[0].status).toBe("added");
    expect(result.files[0].additions).toBe(50);
    expect(result.files[0].deletions).toBe(0);
  });

  it("parseDiffStat correctly detects status for single-file delete", () => {
    const numstat = "0\t30\tsrc/old-module.ts";
    const result = parseDiffStat(numstat);

    expect(result.files[0].status).toBe("deleted");
  });

  it("parseDiffStat handles multi-file diff with mixed statuses", () => {
    const numstat = [
      "10\t5\tsrc/app.ts",
      "100\t0\tsrc/feature.ts",
      "0\t80\tsrc/deprecated.ts",
      "-\t-\tassets/image.png",
      "3\t1\t{src => lib}/utils.ts",
    ].join("\n");

    const result = parseDiffStat(numstat);

    expect(result.totalFiles).toBe(5);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[1].status).toBe("added");
    expect(result.files[2].status).toBe("deleted");
    expect(result.files[3].status).toBe("modified"); // binary: 0 add, 0 del
    expect(result.files[4].status).toBe("renamed");
    expect(result.totalAdditions).toBe(113);
    expect(result.totalDeletions).toBe(86);
  });

  it("parseDiffStat handles file path with tabs", () => {
    // Tabs in file paths would split incorrectly; fileParts.join(\t) handles this
    const numstat = "5\t2\tpath/with\ttab.ts";
    const result = parseDiffStat(numstat);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].file).toBe("path/with\ttab.ts");
    expect(result.files[0].additions).toBe(5);
    expect(result.files[0].deletions).toBe(2);
  });

  it("parseDiffStat handles zero-change file (0 0) as modified", () => {
    const numstat = "0\t0\tsrc/unchanged.ts";
    const result = parseDiffStat(numstat);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe("modified");
    expect(result.files[0].additions).toBe(0);
    expect(result.files[0].deletions).toBe(0);
  });

  it("parseDiffStat preserves oldFile for brace-style renames", () => {
    const numstat = "7\t3\tpackages/{old-name => new-name}/src/index.ts";
    const result = parseDiffStat(numstat);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].file).toBe("packages/{old-name => new-name}/src/index.ts");
    // The parser produces an oldFile from the first capture group
    expect(result.files[0].oldFile).toBeDefined();
  });

  it("parseDiffStat preserves oldFile for simple rename", () => {
    const numstat = "2\t1\told-file.ts => new-file.ts";
    const result = parseDiffStat(numstat);

    expect(result.files[0].status).toBe("renamed");
    expect(result.files[0].oldFile).toBeDefined();
  });
});
