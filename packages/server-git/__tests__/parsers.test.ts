import { describe, it, expect } from "vitest";
import {
  parseStatus,
  parseLog,
  parseDiffStat,
  parseBranch,
  parseShow,
  parseAdd,
  parseTagOutput,
  parseStashListOutput,
  parseStashOutput,
  parseStashError,
  parseRemoteOutput,
  parseBlameOutput,
  parseReset,
  parseRestore,
  parseCherryPick,
  parseMerge,
  parseMergeAbort,
  parseRebase,
  parseLogGraph,
  parseReflogOutput,
  normalizeReflogAction,
  parseCheckout,
  parseCheckoutError,
  parsePush,
  parsePushError,
  parseWorktreeList,
  parseWorktreeResult,
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
      `abc1234567890${DELIM}abc1234${DELIM}Jane Doe <jane@example.com>${DELIM}2 hours ago${DELIM}HEAD -> main${DELIM}Fix the bug`,
      `def5678901234${DELIM}def5678${DELIM}John Smith <john@example.com>${DELIM}1 day ago${DELIM}${DELIM}Add feature X`,
    ].join("\n");

    const result = parseLog(stdout);

    expect(result.total).toBe(2);
    expect(result.commits[0]).toEqual({
      hash: "abc1234567890",
      hashShort: "abc1234",
      author: "Jane Doe <jane@example.com>",
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

  it("preserves combined author <email> with special characters", () => {
    const DELIM = "@@";
    const line = `abc123${DELIM}abc${DELIM}José O'Brien <jose.o'brien@company-name.co.uk>${DELIM}3 days ago${DELIM}${DELIM}fix: encoding`;
    const result = parseLog(line);
    expect(result.commits[0].author).toBe("José O'Brien <jose.o'brien@company-name.co.uk>");
  });

  it("handles author without email brackets", () => {
    const DELIM = "@@";
    const line = `abc123${DELIM}abc${DELIM}noreply${DELIM}1 day ago${DELIM}${DELIM}automated commit`;
    const result = parseLog(line);
    expect(result.commits[0].author).toBe("noreply");
    expect(result.commits[0].message).toBe("automated commit");
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

  it("handles binary files (- - markers) and sets binary flag", () => {
    const stdout = "-\t-\timage.png";
    const result = parseDiffStat(stdout);

    expect(result.files[0].additions).toBe(0);
    expect(result.files[0].deletions).toBe(0);
    expect(result.files[0].binary).toBe(true);
  });

  it("does not set binary flag for non-binary files", () => {
    const stdout = "10\t2\tsrc/index.ts";
    const result = parseDiffStat(stdout);

    expect(result.files[0].binary).toBeUndefined();
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

  it("parses upstream tracking info from -vv output", () => {
    const stdout = [
      "  dev          abc1234 [origin/dev] Fix bug",
      "* main         def5678 [origin/main: ahead 2] Latest",
      "  feature/auth 1234567 Work in progress",
    ].join("\n");

    const result = parseBranch(stdout);

    expect(result.current).toBe("main");
    expect(result.branches[0]).toEqual({ name: "dev", current: false, upstream: "origin/dev" });
    expect(result.branches[1]).toEqual({ name: "main", current: true, upstream: "origin/main" });
    expect(result.branches[2]).toEqual({ name: "feature/auth", current: false });
  });
});

describe("parseShow", () => {
  it("parses commit info and diff stats", () => {
    const DELIM = "@@";
    const commitInfo = `abc123${DELIM}Jane Doe <jane@example.com>${DELIM}2 hours ago${DELIM}Fix critical bug in parser`;
    const diffStat = "5\t2\tsrc/parser.ts\n1\t1\ttests/parser.test.ts";

    const result = parseShow(commitInfo, diffStat);

    expect(result.hash).toBe("abc123");
    expect(result.author).toBe("Jane Doe <jane@example.com>");
    expect(result.date).toBe("2 hours ago");
    expect(result.message).toBe("Fix critical bug in parser");
    expect(result.diff.totalFiles).toBe(2);
    expect(result.diff.totalAdditions).toBe(6);
    expect(result.diff.totalDeletions).toBe(3);
  });

  it("preserves combined author <email> with special characters", () => {
    const DELIM = "@@";
    const commitInfo = `abc123${DELIM}María García-López <maria@über-corp.de>${DELIM}5 hours ago${DELIM}chore: update deps`;
    const result = parseShow(commitInfo, "");
    expect(result.author).toBe("María García-López <maria@über-corp.de>");
  });

  it("handles author without email brackets", () => {
    const DELIM = "@@";
    const commitInfo = `abc123${DELIM}bot${DELIM}now${DELIM}auto-merge`;
    const result = parseShow(commitInfo, "");
    expect(result.author).toBe("bot");
    expect(result.message).toBe("auto-merge");
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

describe("parseTagOutput", () => {
  it("parses tag list with dates and messages", () => {
    const stdout = [
      "v1.2.0\t2024-01-15T10:30:00+00:00\tRelease 1.2.0",
      "v1.1.0\t2024-01-01T09:00:00+00:00\tRelease 1.1.0",
      "v1.0.0\t2023-12-01T08:00:00+00:00\tInitial release",
    ].join("\n");

    const result = parseTagOutput(stdout);

    expect(result.total).toBe(3);
    expect(result.tags[0]).toEqual({
      name: "v1.2.0",
      date: "2024-01-15T10:30:00+00:00",
      message: "Release 1.2.0",
    });
    expect(result.tags[1].name).toBe("v1.1.0");
    expect(result.tags[2].name).toBe("v1.0.0");
  });

  it("handles empty tag list", () => {
    const result = parseTagOutput("");

    expect(result.total).toBe(0);
    expect(result.tags).toEqual([]);
  });

  it("handles tags without messages", () => {
    const stdout = "v1.0.0\t2024-01-01T00:00:00+00:00\t";

    const result = parseTagOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.tags[0].name).toBe("v1.0.0");
    expect(result.tags[0].date).toBe("2024-01-01T00:00:00+00:00");
  });

  it("handles lightweight tags (no date or message)", () => {
    const stdout = "v0.1.0\t\t";

    const result = parseTagOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.tags[0].name).toBe("v0.1.0");
  });
});

describe("parseStashListOutput", () => {
  it("parses stash list entries", () => {
    const stdout = [
      "stash@{0}\tWIP on main: abc1234 Fix bug\t2024-01-15 10:30:00 +0000",
      "stash@{1}\tOn main: save progress\t2024-01-14 09:00:00 +0000",
    ].join("\n");

    const result = parseStashListOutput(stdout);

    expect(result.total).toBe(2);
    expect(result.stashes[0]).toEqual({
      index: 0,
      message: "WIP on main: abc1234 Fix bug",
      date: "2024-01-15 10:30:00 +0000",
      branch: "main",
    });
    expect(result.stashes[1]).toEqual({
      index: 1,
      message: "On main: save progress",
      date: "2024-01-14 09:00:00 +0000",
      branch: "main",
    });
  });

  it("handles empty stash list", () => {
    const result = parseStashListOutput("");

    expect(result.total).toBe(0);
    expect(result.stashes).toEqual([]);
  });

  it("parses single stash entry", () => {
    const stdout = "stash@{0}\tWIP on feature: work in progress\t2024-01-15 12:00:00 +0000";

    const result = parseStashListOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.stashes[0].index).toBe(0);
  });
});

describe("parseStashOutput", () => {
  it("parses stash push output", () => {
    const result = parseStashOutput(
      "Saved working directory and index state WIP on main: abc1234 Fix bug",
      "",
      "push",
    );

    expect(result.action).toBe("push");
    expect(result.success).toBe(true);
    expect(result.message).toContain("Saved working directory");
  });

  it("parses stash pop output", () => {
    const result = parseStashOutput("", "Dropped refs/stash@{0}", "pop");

    expect(result.action).toBe("pop");
    expect(result.success).toBe(true);
    expect(result.message).toContain("Dropped");
  });

  it("parses stash apply output", () => {
    const result = parseStashOutput("On branch main\nChanges not staged for commit:", "", "apply");

    expect(result.action).toBe("apply");
    expect(result.success).toBe(true);
  });

  it("parses stash drop output", () => {
    const result = parseStashOutput("Dropped stash@{0} (abc1234...)", "", "drop");

    expect(result.action).toBe("drop");
    expect(result.success).toBe(true);
    expect(result.message).toContain("Dropped stash@{0}");
  });

  it("handles empty output", () => {
    const result = parseStashOutput("", "", "push");

    expect(result.success).toBe(true);
    expect(result.message).toBe("Stash push completed successfully");
  });
});

describe("parseRemoteOutput", () => {
  it("parses remote -v output with single remote", () => {
    const stdout = [
      "origin\thttps://github.com/user/repo.git (fetch)",
      "origin\thttps://github.com/user/repo.git (push)",
    ].join("\n");

    const result = parseRemoteOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.remotes[0]).toEqual({
      name: "origin",
      fetchUrl: "https://github.com/user/repo.git",
      pushUrl: "https://github.com/user/repo.git",
      protocol: "https",
    });
  });

  it("parses remote -v output with multiple remotes", () => {
    const stdout = [
      "origin\thttps://github.com/user/repo.git (fetch)",
      "origin\thttps://github.com/user/repo.git (push)",
      "upstream\thttps://github.com/upstream/repo.git (fetch)",
      "upstream\thttps://github.com/upstream/repo.git (push)",
    ].join("\n");

    const result = parseRemoteOutput(stdout);

    expect(result.total).toBe(2);
    expect(result.remotes[0].name).toBe("origin");
    expect(result.remotes[1].name).toBe("upstream");
    expect(result.remotes[1].fetchUrl).toBe("https://github.com/upstream/repo.git");
  });

  it("handles different fetch and push URLs", () => {
    const stdout = [
      "origin\thttps://github.com/user/repo.git (fetch)",
      "origin\tgit@github.com:user/repo.git (push)",
    ].join("\n");

    const result = parseRemoteOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.remotes[0].fetchUrl).toBe("https://github.com/user/repo.git");
    expect(result.remotes[0].pushUrl).toBe("git@github.com:user/repo.git");
  });

  it("handles empty remote list", () => {
    const result = parseRemoteOutput("");

    expect(result.total).toBe(0);
    expect(result.remotes).toEqual([]);
  });
});

describe("parseBlameOutput", () => {
  it("groups lines by commit with single commit", () => {
    const stdout = [
      "abc123456789012345678901234567890123abcd 1 1 3",
      "author John Doe",
      "author-mail <john@example.com>",
      "author-time 1700000000",
      "author-tz +0000",
      "committer John Doe",
      "committer-mail <john@example.com>",
      "committer-time 1700000000",
      "committer-tz +0000",
      "summary Initial commit",
      "filename src/index.ts",
      "\tconst x = 1;",
      "abc123456789012345678901234567890123abcd 2 2",
      "\tconst y = 2;",
      "abc123456789012345678901234567890123abcd 3 3",
      "\tconst z = 3;",
    ].join("\n");

    const result = parseBlameOutput(stdout, "src/index.ts");

    expect(result.file).toBe("src/index.ts");
    expect(result.totalLines).toBe(3);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]).toEqual({
      hash: "abc12345",
      author: "John Doe",
      email: "john@example.com",
      date: new Date(1700000000 * 1000).toISOString(),
      lines: [
        { lineNumber: 1, content: "const x = 1;" },
        { lineNumber: 2, content: "const y = 2;" },
        { lineNumber: 3, content: "const z = 3;" },
      ],
    });
  });

  it("groups lines by commit with multiple commits", () => {
    const stdout = [
      "aaaa111122223333444455556666777788889999 1 1 1",
      "author Alice",
      "author-mail <alice@example.com>",
      "author-time 1700000000",
      "author-tz +0000",
      "committer Alice",
      "committer-mail <alice@example.com>",
      "committer-time 1700000000",
      "committer-tz +0000",
      "summary First commit",
      "filename file.ts",
      "\tline one",
      "bbbb111122223333444455556666777788889999 2 2 1",
      "author Bob",
      "author-mail <bob@example.com>",
      "author-time 1700100000",
      "author-tz +0000",
      "committer Bob",
      "committer-mail <bob@example.com>",
      "committer-time 1700100000",
      "committer-tz +0000",
      "summary Second commit",
      "filename file.ts",
      "\tline two",
    ].join("\n");

    const result = parseBlameOutput(stdout, "file.ts");

    expect(result.totalLines).toBe(2);
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].hash).toBe("aaaa1111");
    expect(result.commits[0].author).toBe("Alice");
    expect(result.commits[0].lines).toEqual([{ lineNumber: 1, content: "line one" }]);
    expect(result.commits[1].hash).toBe("bbbb1111");
    expect(result.commits[1].author).toBe("Bob");
    expect(result.commits[1].lines).toEqual([{ lineNumber: 2, content: "line two" }]);
  });

  it("deduplicates interleaved commits (A-B-A pattern)", () => {
    // Simulates a file where commit A wrote lines 1,3 and commit B wrote line 2
    const stdout = [
      "aaaa111122223333444455556666777788889999 1 1 1",
      "author Alice",
      "author-mail <alice@example.com>",
      "author-time 1700000000",
      "author-tz +0000",
      "committer Alice",
      "committer-mail <alice@example.com>",
      "committer-time 1700000000",
      "committer-tz +0000",
      "summary First commit",
      "filename file.ts",
      "\tline one",
      "bbbb111122223333444455556666777788889999 2 2 1",
      "author Bob",
      "author-mail <bob@example.com>",
      "author-time 1700100000",
      "author-tz +0000",
      "committer Bob",
      "committer-mail <bob@example.com>",
      "committer-time 1700100000",
      "committer-tz +0000",
      "summary Second commit",
      "filename file.ts",
      "\tline two",
      "aaaa111122223333444455556666777788889999 3 3",
      "\tline three",
    ].join("\n");

    const result = parseBlameOutput(stdout, "file.ts");

    expect(result.totalLines).toBe(3);
    // Only 2 commit groups despite 3 lines
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0].hash).toBe("aaaa1111");
    expect(result.commits[0].lines).toEqual([
      { lineNumber: 1, content: "line one" },
      { lineNumber: 3, content: "line three" },
    ]);
    expect(result.commits[1].hash).toBe("bbbb1111");
    expect(result.commits[1].lines).toEqual([{ lineNumber: 2, content: "line two" }]);
  });

  it("handles many commits with many lines (large file simulation)", () => {
    // Simulate a 30-line file with 5 different commits (6 lines each)
    const commits = [
      { hash: "aaaa" + "0".repeat(36), author: "Alice", time: 1700000000 },
      { hash: "bbbb" + "0".repeat(36), author: "Bob", time: 1700100000 },
      { hash: "cccc" + "0".repeat(36), author: "Charlie", time: 1700200000 },
      { hash: "dddd" + "0".repeat(36), author: "Diana", time: 1700300000 },
      { hash: "eeee" + "0".repeat(36), author: "Eve", time: 1700400000 },
    ];
    const lines: string[] = [];
    for (let lineNum = 1; lineNum <= 30; lineNum++) {
      const c = commits[(lineNum - 1) % 5];
      const isFirstOccurrence = lineNum <= 5; // first time each commit appears
      lines.push(`${c.hash} ${lineNum} ${lineNum}${isFirstOccurrence ? " 6" : ""}`);
      if (isFirstOccurrence) {
        lines.push(`author ${c.author}`);
        lines.push(`author-mail <${c.author.toLowerCase()}@example.com>`);
        lines.push(`author-time ${c.time}`);
        lines.push(`author-tz +0000`);
        lines.push(`committer ${c.author}`);
        lines.push(`committer-mail <${c.author.toLowerCase()}@example.com>`);
        lines.push(`committer-time ${c.time}`);
        lines.push(`committer-tz +0000`);
        lines.push(`summary Commit by ${c.author}`);
        lines.push("filename large.ts");
      }
      lines.push(`\tcode line ${lineNum}`);
    }

    const result = parseBlameOutput(lines.join("\n"), "large.ts");

    expect(result.totalLines).toBe(30);
    expect(result.commits).toHaveLength(5);
    // Each commit owns 6 lines
    for (const c of result.commits) {
      expect(c.lines).toHaveLength(6);
    }
    expect(result.commits[0].author).toBe("Alice");
    expect(result.commits[4].author).toBe("Eve");
  });

  it("handles single commit owning entire file", () => {
    const hash = "ff" + "0".repeat(38);
    const lines = [
      `${hash} 1 1 5`,
      "author Solo Dev",
      "author-mail <solo@example.com>",
      "author-time 1700000000",
      "author-tz +0000",
      "committer Solo Dev",
      "committer-mail <solo@example.com>",
      "committer-time 1700000000",
      "committer-tz +0000",
      "summary Initial commit",
      "filename solo.ts",
      "\tline 1",
      `${hash} 2 2`,
      "\tline 2",
      `${hash} 3 3`,
      "\tline 3",
      `${hash} 4 4`,
      "\tline 4",
      `${hash} 5 5`,
      "\tline 5",
    ];

    const result = parseBlameOutput(lines.join("\n"), "solo.ts");

    expect(result.totalLines).toBe(5);
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0].author).toBe("Solo Dev");
    expect(result.commits[0].lines).toHaveLength(5);
  });

  it("handles empty blame output", () => {
    const result = parseBlameOutput("", "empty-file.ts");

    expect(result.file).toBe("empty-file.ts");
    expect(result.totalLines).toBe(0);
    expect(result.commits).toEqual([]);
  });
});

describe("parseReset", () => {
  it("parses unstaged files from reset output", () => {
    const stdout = "Unstaged changes after reset:\nM\tsrc/index.ts\nM\tsrc/app.ts\n";
    const result = parseReset(stdout, "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.filesAffected).toEqual(["src/index.ts", "src/app.ts"]);
  });

  it("handles empty output", () => {
    const result = parseReset("", "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.filesAffected).toEqual([]);
  });

  it("parses output with various status types", () => {
    const stdout = "Unstaged changes after reset:\nM\tmodified.ts\nD\tdeleted.ts\nA\tadded.ts\n";
    const result = parseReset(stdout, "", "HEAD");

    expect(result.filesAffected).toEqual(["modified.ts", "deleted.ts", "added.ts"]);
  });
});

describe("parseLogGraph", () => {
  it("parses simple linear graph output", () => {
    const stdout = [
      "* abc1234 (HEAD -> main) Latest commit",
      "* def5678 Previous commit",
      "* 1234abc Initial commit",
    ].join("\n");

    const result = parseLogGraph(stdout);

    expect(result.total).toBe(3);
    expect(result.commits).toHaveLength(3);
    expect(result.commits[0]).toEqual({
      graph: "*",
      hashShort: "abc1234",
      message: "Latest commit",
      refs: "HEAD -> main",
    });
    expect(result.commits[1]).toEqual({
      graph: "*",
      hashShort: "def5678",
      message: "Previous commit",
    });
    expect(result.commits[2]).toEqual({
      graph: "*",
      hashShort: "1234abc",
      message: "Initial commit",
    });
  });

  it("parses branching graph with merge", () => {
    const stdout = [
      "*   abc1234 (HEAD -> main) Merge branch 'feature'",
      "|\\",
      "| * def5678 (feature) Add feature",
      "* | 9876543 Fix bug on main",
      "|/",
      "* aaa1111 Common ancestor",
    ].join("\n");

    const result = parseLogGraph(stdout);

    // 4 real commits + 2 graph-only lines
    expect(result.total).toBe(4);
    expect(result.commits).toHaveLength(6);
    expect(result.commits[0].hashShort).toBe("abc1234");
    expect(result.commits[0].refs).toBe("HEAD -> main");
    // graph-only line
    expect(result.commits[1].hashShort).toBe("");
    expect(result.commits[1].graph).toBe("|\\");
    // feature branch commit
    expect(result.commits[2].hashShort).toBe("def5678");
    expect(result.commits[2].graph).toBe("| *");
    expect(result.commits[2].refs).toBe("feature");
  });

  it("handles empty output", () => {
    const result = parseLogGraph("");
    expect(result.total).toBe(0);
    expect(result.commits).toEqual([]);
  });

  it("parses commits without refs", () => {
    const stdout = "* abc1234 Just a plain commit";
    const result = parseLogGraph(stdout);

    expect(result.total).toBe(1);
    expect(result.commits[0].refs).toBeUndefined();
    expect(result.commits[0].message).toBe("Just a plain commit");
  });

  it("parses commits with multiple refs", () => {
    const stdout = "* abc1234 (HEAD -> main, origin/main, tag: v1.0) Release 1.0";
    const result = parseLogGraph(stdout);

    expect(result.total).toBe(1);
    expect(result.commits[0].refs).toBe("HEAD -> main, origin/main, tag: v1.0");
    expect(result.commits[0].message).toBe("Release 1.0");
  });
});

describe("parseReflogOutput", () => {
  it("parses reflog entries with checkout action and normalizes", () => {
    const stdout = [
      "abc123full\tabc1234\tHEAD@{0}\tcheckout: moving from main to feature\t2024-01-15 10:30:00 +0000",
      "def456full\tdef5678\tHEAD@{1}\tcommit: fix the bug\t2024-01-14 09:00:00 +0000",
    ].join("\n");

    const result = parseReflogOutput(stdout);

    expect(result.total).toBe(2);
    expect(result.entries[0]).toEqual({
      hash: "abc123full",
      shortHash: "abc1234",
      selector: "HEAD@{0}",
      action: "checkout",
      rawAction: "checkout",
      description: "moving from main to feature",
      date: "2024-01-15 10:30:00 +0000",
    });
    expect(result.entries[1]).toEqual({
      hash: "def456full",
      shortHash: "def5678",
      selector: "HEAD@{1}",
      action: "commit",
      rawAction: "commit",
      description: "fix the bug",
      date: "2024-01-14 09:00:00 +0000",
    });
  });

  it("handles empty reflog output", () => {
    const result = parseReflogOutput("");

    expect(result.total).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("parses single reflog entry and normalizes commit (initial)", () => {
    const stdout =
      "aaa111full\taaa1111\tHEAD@{0}\tcommit (initial): initial commit\t2024-01-01 00:00:00 +0000";

    const result = parseReflogOutput(stdout);

    expect(result.total).toBe(1);
    expect(result.entries[0].selector).toBe("HEAD@{0}");
    expect(result.entries[0].action).toBe("commit-initial");
    expect(result.entries[0].rawAction).toBe("commit (initial)");
    expect(result.entries[0].description).toBe("initial commit");
  });

  it("parses various reflog actions and normalizes them", () => {
    const stdout = [
      "aaa\ta1\tHEAD@{0}\tmerge feature: Fast-forward\t2024-01-15 10:00:00 +0000",
      "bbb\tb1\tHEAD@{1}\treset: moving to HEAD~1\t2024-01-14 09:00:00 +0000",
      "ccc\tc1\tHEAD@{2}\trebase (finish): returning to refs/heads/main\t2024-01-13 08:00:00 +0000",
    ].join("\n");

    const result = parseReflogOutput(stdout);

    expect(result.total).toBe(3);
    expect(result.entries[0].action).toBe("merge");
    expect(result.entries[0].rawAction).toBe("merge feature");
    expect(result.entries[0].description).toBe("Fast-forward");
    expect(result.entries[1].action).toBe("reset");
    expect(result.entries[1].rawAction).toBe("reset");
    expect(result.entries[1].description).toBe("moving to HEAD~1");
    expect(result.entries[2].action).toBe("rebase-finish");
    expect(result.entries[2].rawAction).toBe("rebase (finish)");
    expect(result.entries[2].description).toBe("returning to refs/heads/main");
  });
});

describe("normalizeReflogAction", () => {
  it("normalizes commit variants", () => {
    expect(normalizeReflogAction("commit")).toBe("commit");
    expect(normalizeReflogAction("commit (initial)")).toBe("commit-initial");
    expect(normalizeReflogAction("commit (amend)")).toBe("commit-amend");
    expect(normalizeReflogAction("commit: initial")).toBe("commit-initial");
    expect(normalizeReflogAction("commit: amend")).toBe("commit-amend");
  });

  it("normalizes checkout", () => {
    expect(normalizeReflogAction("checkout")).toBe("checkout");
    expect(normalizeReflogAction("checkout: moving from main to feature")).toBe("checkout");
  });

  it("normalizes rebase variants", () => {
    expect(normalizeReflogAction("rebase (finish)")).toBe("rebase-finish");
    expect(normalizeReflogAction("rebase (abort)")).toBe("rebase-abort");
    expect(normalizeReflogAction("rebase (pick)")).toBe("rebase-pick");
    expect(normalizeReflogAction("rebase (reword)")).toBe("rebase-reword");
    expect(normalizeReflogAction("rebase (squash)")).toBe("rebase-squash");
    expect(normalizeReflogAction("rebase (fixup)")).toBe("rebase-fixup");
    expect(normalizeReflogAction("rebase (edit)")).toBe("rebase-edit");
    expect(normalizeReflogAction("rebase -i (pick)")).toBe("rebase-pick");
    expect(normalizeReflogAction("rebase -i (finish)")).toBe("rebase-finish");
    expect(normalizeReflogAction("rebase")).toBe("rebase");
  });

  it("normalizes merge (strips branch name)", () => {
    expect(normalizeReflogAction("merge feature")).toBe("merge");
    expect(normalizeReflogAction("merge origin/main")).toBe("merge");
  });

  it("normalizes other actions", () => {
    expect(normalizeReflogAction("pull")).toBe("pull");
    expect(normalizeReflogAction("reset")).toBe("reset");
    expect(normalizeReflogAction("branch")).toBe("branch");
    expect(normalizeReflogAction("clone")).toBe("clone");
    expect(normalizeReflogAction("cherry-pick")).toBe("cherry-pick");
    expect(normalizeReflogAction("stash")).toBe("stash");
  });

  it("returns 'other' for unknown actions", () => {
    expect(normalizeReflogAction("unknown-action")).toBe("other");
    expect(normalizeReflogAction("")).toBe("other");
  });
});

describe("parseWorktreeList", () => {
  it("parses porcelain output with single worktree", () => {
    const stdout = [
      "worktree /home/user/repo",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/main",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0]).toEqual({
      path: "/home/user/repo",
      head: "abc1234567890abcdef1234567890abcdef123456",
      branch: "main",
      bare: false,
    });
  });

  it("parses porcelain output with multiple worktrees", () => {
    const stdout = [
      "worktree /home/user/repo",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/main",
      "",
      "worktree /home/user/repo-feature",
      "HEAD def5678901234567890abcdef1234567890abcdef",
      "branch refs/heads/feature",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(2);
    expect(result.worktrees[0].path).toBe("/home/user/repo");
    expect(result.worktrees[0].branch).toBe("main");
    expect(result.worktrees[1].path).toBe("/home/user/repo-feature");
    expect(result.worktrees[1].branch).toBe("feature");
  });

  it("parses bare worktree", () => {
    const stdout = [
      "worktree /home/user/repo.git",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "bare",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].bare).toBe(true);
    expect(result.worktrees[0].branch).toBe("");
  });

  it("parses detached HEAD worktree", () => {
    const stdout = [
      "worktree /home/user/repo-detached",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "detached",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].branch).toBe("(detached)");
    expect(result.worktrees[0].bare).toBe(false);
  });

  it("handles empty output", () => {
    const result = parseWorktreeList("");

    expect(result.total).toBe(0);
    expect(result.worktrees).toEqual([]);
  });
});

describe("parseWorktreeResult", () => {
  it("returns structured result for add", () => {
    const result = parseWorktreeResult("Preparing worktree", "", "/tmp/wt", "feature");

    expect(result.success).toBe(true);
    expect(result.path).toBe("/tmp/wt");
    expect(result.branch).toBe("feature");
  });

  it("returns structured result for remove", () => {
    const result = parseWorktreeResult("", "", "/tmp/wt", "");

    expect(result.success).toBe(true);
    expect(result.path).toBe("/tmp/wt");
    expect(result.branch).toBe("");
  });
});

describe("parseCheckout — success field", () => {
  it("returns success: true on normal checkout", () => {
    const result = parseCheckout("", "Switched to branch 'feature'", "feature", "main", false);
    expect(result.success).toBe(true);
    expect(result.ref).toBe("feature");
  });
});

describe("parseCheckoutError", () => {
  it("classifies dirty working tree error", () => {
    const stderr = `error: Your local changes to the following files would be overwritten by checkout:
\tsrc/index.ts
\tsrc/app.ts
Please commit your changes or stash them before you switch branches.
Aborting`;

    const result = parseCheckoutError("", stderr, "feature", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("dirty-tree");
    expect(result.conflictFiles).toEqual(["src/index.ts", "src/app.ts"]);
    expect(result.errorMessage).toContain("would be overwritten");
  });

  it("classifies invalid ref error", () => {
    const stderr = "error: pathspec 'nonexistent' did not match any file(s) known to git";

    const result = parseCheckoutError("", stderr, "nonexistent", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("invalid-ref");
    expect(result.created).toBe(false);
  });

  it("classifies branch already exists error", () => {
    const stderr = "fatal: a branch named 'feature' already exists";

    const result = parseCheckoutError("", stderr, "feature", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("already-exists");
  });

  it("classifies merge conflict error", () => {
    const stderr = `CONFLICT (content): Merge conflict in src/index.ts
CONFLICT (content): Merge conflict in src/utils.ts`;

    const result = parseCheckoutError("", stderr, "feature", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("conflict");
    expect(result.conflictFiles).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("classifies unknown error", () => {
    const stderr = "fatal: some completely unknown error";

    const result = parseCheckoutError("", stderr, "feature", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("unknown");
  });
});

describe("parsePush — success field", () => {
  it("returns success: true on normal push", () => {
    const result = parsePush("", "abc..def main -> main", "origin", "main");
    expect(result.success).toBe(true);
  });
});

describe("parsePushError", () => {
  it("classifies rejected (non-fast-forward) push", () => {
    const stderr = `To github.com:user/repo.git
 ! [rejected]        main -> main (non-fast-forward)
error: failed to push some refs to 'github.com:user/repo.git'
hint: Updates were rejected because the tip of your current branch is behind`;

    const result = parsePushError("", stderr, "origin", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("rejected");
    expect(result.rejectedRef).toBe("main");
    expect(result.hint).toContain("Updates were rejected");
  });

  it("classifies no-upstream error", () => {
    const stderr = `fatal: The current branch feature has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin feature`;

    const result = parsePushError("", stderr, "origin", "feature");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("no-upstream");
  });

  it("classifies permission denied error", () => {
    const stderr = "fatal: could not read credentials for 'https://github.com'";

    const result = parsePushError("", stderr, "origin", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("permission-denied");
  });

  it("classifies repository not found error", () => {
    const stderr =
      "fatal: 'origin' does not appear to be a git repository\nfatal: Could not read from remote repository.";

    const result = parsePushError("", stderr, "origin", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("repository-not-found");
  });

  it("classifies hook declined error", () => {
    const stderr = `remote: error: hook declined to update refs/heads/main
To github.com:user/repo.git
 ! [remote rejected] main -> main (hook declined)`;

    const result = parsePushError("", stderr, "origin", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("hook-declined");
  });

  it("classifies unknown push error", () => {
    const stderr = "fatal: some completely unknown error";

    const result = parsePushError("", stderr, "origin", "main");

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("unknown");
  });
});

describe("parseStashError", () => {
  it("detects nothing-to-stash gracefully", () => {
    const result = parseStashError("", "No local changes to save", "push");

    expect(result.success).toBe(false);
    expect(result.action).toBe("push");
    expect(result.reason).toBe("no-local-changes");
  });

  it("detects stash pop/apply conflicts", () => {
    const stderr = `Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
CONFLICT (content): Merge conflict in src/utils.ts
The stash entry is kept in case you need it again.`;

    const result = parseStashError("", stderr, "pop");

    expect(result.success).toBe(false);
    expect(result.action).toBe("pop");
    expect(result.reason).toBe("conflict");
    expect(result.conflictFiles).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("detects no stash entries", () => {
    const result = parseStashError("", "No stash entries found.", "pop");

    expect(result.success).toBe(false);
    expect(result.action).toBe("pop");
    expect(result.reason).toBe("no-stash-entries");
  });

  it("detects stash ref does not exist", () => {
    const result = parseStashError("", "error: stash@{5} does not exist", "drop");

    expect(result.success).toBe(false);
    expect(result.action).toBe("drop");
    expect(result.reason).toBe("no-stash-entries");
  });

  it("handles unknown stash errors", () => {
    const result = parseStashError("", "fatal: some unexpected error", "apply");

    expect(result.success).toBe(false);
    expect(result.action).toBe("apply");
    expect(result.reason).toBe("unknown");
  });
});

describe("parseAdd — per-file status", () => {
  it("parses added files with status", () => {
    const stdout = "A  src/new.ts\nM  src/index.ts\nD  old-file.ts";
    const result = parseAdd(stdout);

    expect(result.staged).toBe(3);
    expect(result.files).toEqual([
      { file: "src/new.ts", status: "added" },
      { file: "src/index.ts", status: "modified" },
      { file: "old-file.ts", status: "deleted" },
    ]);
  });

  it("handles empty status output", () => {
    const result = parseAdd("");
    expect(result.staged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("ignores untracked files", () => {
    const stdout = "A  src/new.ts\n?? temp.log";
    const result = parseAdd(stdout);

    expect(result.staged).toBe(1);
    expect(result.files).toEqual([{ file: "src/new.ts", status: "added" }]);
  });
});

describe("parseCherryPick — state field", () => {
  it("returns completed state on success", () => {
    const result = parseCherryPick("[main abc1234] Cherry-pick commit", "", 0, ["abc1234"]);

    expect(result.success).toBe(true);
    expect(result.state).toBe("completed");
    expect(result.applied).toEqual(["abc1234"]);
  });

  it("returns conflict state on conflict", () => {
    const result = parseCherryPick("", "CONFLICT (content): Merge conflict in src/index.ts", 1, [
      "abc1234",
    ]);

    expect(result.success).toBe(false);
    expect(result.state).toBe("conflict");
    expect(result.conflicts).toEqual(["src/index.ts"]);
  });

  it("returns in-progress state on non-conflict failure", () => {
    const result = parseCherryPick("", "error: could not apply abc1234", 1, ["abc1234"]);

    expect(result.success).toBe(false);
    expect(result.state).toBe("in-progress");
  });

  it("returns completed state on abort", () => {
    const result = parseCherryPick("cherry-pick abort completed", "", 0, []);

    expect(result.success).toBe(true);
    expect(result.state).toBe("completed");
  });
});

describe("parseMerge — state field", () => {
  it("returns completed state on normal merge", () => {
    const result = parseMerge(
      "Merge made by the 'ort' strategy.\n abc1234..def5678",
      "",
      "feature",
    );

    expect(result.merged).toBe(true);
    expect(result.state).toBe("completed");
  });

  it("returns fast-forward state", () => {
    const result = parseMerge("Updating abc1234..def5678\nFast-forward", "", "feature");

    expect(result.merged).toBe(true);
    expect(result.state).toBe("fast-forward");
    expect(result.fastForward).toBe(true);
  });

  it("returns conflict state", () => {
    const result = parseMerge("", "CONFLICT (content): Merge conflict in src/index.ts", "feature");

    expect(result.merged).toBe(false);
    expect(result.state).toBe("conflict");
  });

  it("returns already-up-to-date state", () => {
    const result = parseMerge("Already up to date.", "", "feature");

    expect(result.merged).toBe(true);
    expect(result.state).toBe("already-up-to-date");
  });

  it("parseMergeAbort returns completed state", () => {
    const result = parseMergeAbort("", "");

    expect(result.merged).toBe(false);
    expect(result.state).toBe("completed");
  });
});

describe("parseRebase — state field", () => {
  it("returns completed state on success", () => {
    const result = parseRebase(
      "Successfully rebased and updated refs/heads/feature.",
      "",
      "main",
      "feature",
    );

    expect(result.success).toBe(true);
    expect(result.state).toBe("completed");
  });

  it("returns conflict state on conflict", () => {
    const result = parseRebase(
      "",
      "CONFLICT (content): Merge conflict in src/index.ts",
      "main",
      "feature",
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe("conflict");
  });

  it("returns completed state on abort (empty branch)", () => {
    const result = parseRebase("", "", "", "feature");

    expect(result.success).toBe(true);
    expect(result.state).toBe("completed");
  });
});

describe("parseReset — previousRef/newRef fields", () => {
  it("includes previousRef and newRef when provided", () => {
    const result = parseReset(
      "Unstaged changes after reset:\nM\tsrc/index.ts",
      "",
      "HEAD~1",
      "mixed",
      "abc1234567890",
      "def5678901234",
    );

    expect(result.ref).toBe("HEAD~1");
    expect(result.previousRef).toBe("abc1234567890");
    expect(result.newRef).toBe("def5678901234");
    expect(result.filesAffected).toEqual(["src/index.ts"]);
  });

  it("omits previousRef/newRef when not provided", () => {
    const result = parseReset("", "", "HEAD");

    expect(result.previousRef).toBeUndefined();
    expect(result.newRef).toBeUndefined();
  });
});

describe("parseRestore — verification fields", () => {
  it("includes verification data when provided", () => {
    const verifiedFiles = [
      { file: "src/index.ts", restored: true },
      { file: "src/app.ts", restored: false },
    ];
    const result = parseRestore(["src/index.ts", "src/app.ts"], "HEAD", false, verifiedFiles);

    expect(result.verified).toBe(false);
    expect(result.verifiedFiles).toEqual(verifiedFiles);
  });

  it("verified is true when all files restored", () => {
    const verifiedFiles = [
      { file: "src/index.ts", restored: true },
      { file: "src/app.ts", restored: true },
    ];
    const result = parseRestore(["src/index.ts", "src/app.ts"], "HEAD", false, verifiedFiles);

    expect(result.verified).toBe(true);
  });

  it("omits verification fields when not provided", () => {
    const result = parseRestore(["src/index.ts"], "HEAD", false);

    expect(result.verified).toBeUndefined();
    expect(result.verifiedFiles).toBeUndefined();
  });
});

describe("parseWorktreeList — locked/prunable fields", () => {
  it("parses locked worktree", () => {
    const stdout = [
      "worktree /home/user/repo",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/main",
      "",
      "worktree /home/user/repo-locked",
      "HEAD def5678901234567890abcdef1234567890abcdef",
      "branch refs/heads/feature",
      "locked",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(2);
    expect(result.worktrees[0].locked).toBeUndefined();
    expect(result.worktrees[1].locked).toBe(true);
    expect(result.worktrees[1].lockReason).toBeUndefined();
  });

  it("parses locked worktree with reason", () => {
    const stdout = [
      "worktree /home/user/repo-locked",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/feature",
      "locked maintenance in progress",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].locked).toBe(true);
    expect(result.worktrees[0].lockReason).toBe("maintenance in progress");
  });

  it("parses prunable worktree", () => {
    const stdout = [
      "worktree /home/user/repo-stale",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/old-branch",
      "prunable",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].prunable).toBe(true);
  });

  it("parses locked and prunable worktree", () => {
    const stdout = [
      "worktree /home/user/repo-both",
      "HEAD abc1234567890abcdef1234567890abcdef123456",
      "branch refs/heads/test",
      "locked some reason",
      "prunable",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].locked).toBe(true);
    expect(result.worktrees[0].lockReason).toBe("some reason");
    expect(result.worktrees[0].prunable).toBe(true);
  });
});
