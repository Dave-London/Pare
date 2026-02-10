/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from the raw CLI output.
 *
 * These tests run real git commands on the Pare repo itself, then compare
 * the raw output against Pare's parsed structured output to ensure no
 * important data is lost.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  parseStatus,
  parseLog,
  parseDiffStat,
  parseBranch,
  parseShow,
} from "../src/lib/parsers.js";

const CWD = process.cwd();

function gitRaw(args: string[]): string {
  return execFileSync("git", args, {
    cwd: CWD,
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
}

describe("fidelity: git status", () => {
  it("preserves every file from porcelain output", () => {
    const raw = gitRaw(["status", "--porcelain=v1", "--branch"]);
    const lines = raw.split("\n").filter(Boolean);
    const branchLine = lines.find((l) => l.startsWith("## ")) ?? "## unknown";
    const fileLines = lines.filter((l) => !l.startsWith("## "));

    const status = parseStatus(fileLines.join("\n"), branchLine);

    // Every non-branch line should be represented somewhere in the output
    const allStructuredFiles = [
      ...status.staged.map((s) => s.file),
      ...status.modified,
      ...status.deleted,
      ...status.untracked,
      ...status.conflicts,
    ];

    for (const line of fileLines) {
      const filename = line.slice(3).trim().split(" -> ").pop()!;
      expect(allStructuredFiles).toContain(filename);
    }

    // File count should match
    expect(allStructuredFiles.length).toBeGreaterThanOrEqual(fileLines.length);
  });

  it("preserves branch name from porcelain", () => {
    const raw = gitRaw(["status", "--porcelain=v1", "--branch"]);
    const branchLine =
      raw
        .split("\n")
        .filter(Boolean)
        .find((l) => l.startsWith("## ")) ?? "## unknown";

    const status = parseStatus("", branchLine);

    // Branch name from raw
    const rawBranch = branchLine.replace("## ", "").split("...")[0].split(" ")[0];
    expect(status.branch).toBe(rawBranch);
  });

  it("staged file status matches raw index column", () => {
    const raw = gitRaw(["status", "--porcelain=v1", "--branch"]);
    const lines = raw.split("\n").filter(Boolean);
    const branchLine = lines.find((l) => l.startsWith("## ")) ?? "## unknown";
    const fileLines = lines.filter((l) => !l.startsWith("## "));

    const status = parseStatus(fileLines.join("\n"), branchLine);

    // For each staged file, verify the status mapping is correct
    const statusMap: Record<string, string> = {
      A: "added",
      M: "modified",
      D: "deleted",
      R: "renamed",
      C: "copied",
    };

    for (const line of fileLines) {
      const index = line[0];
      if (index && index !== " " && index !== "?" && index !== "U") {
        const filename = line.slice(3).trim().split(" -> ").pop()!;
        const stagedEntry = status.staged.find((s) => s.file === filename);
        if (stagedEntry) {
          expect(stagedEntry.status).toBe(statusMap[index] ?? "modified");
        }
      }
    }
  });
});

describe("fidelity: git log", () => {
  it("preserves every commit hash from raw log", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
    const rawFormatted = gitRaw(["log", `--format=${FORMAT}`, "--max-count=5"]);

    // Also get raw oneline to cross-check
    const rawOneline = gitRaw(["log", "--oneline", "--max-count=5"]);
    const rawHashes = rawOneline
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split(" ")[0]);

    const log = parseLog(rawFormatted);

    // Every raw hash should appear in structured output
    for (const shortHash of rawHashes) {
      const found = log.commits.some((c) => c.hashShort === shortHash);
      expect(found).toBe(true);
    }

    // Commit count matches
    expect(log.commits.length).toBe(rawHashes.length);
    expect(log.total).toBe(rawHashes.length);
  });

  it("preserves commit messages", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
    const rawFormatted = gitRaw(["log", `--format=${FORMAT}`, "--max-count=5"]);

    // Get raw messages via separate format
    const rawMessages = gitRaw(["log", "--format=%s", "--max-count=5"])
      .trim()
      .split("\n")
      .filter(Boolean);

    const log = parseLog(rawFormatted);

    for (let i = 0; i < rawMessages.length; i++) {
      expect(log.commits[i].message).toBe(rawMessages[i]);
    }
  });

  it("preserves author name and email", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
    const rawFormatted = gitRaw(["log", `--format=${FORMAT}`, "--max-count=3"]);

    const rawAuthors = gitRaw(["log", "--format=%an", "--max-count=3"])
      .trim()
      .split("\n")
      .filter(Boolean);
    const rawEmails = gitRaw(["log", "--format=%ae", "--max-count=3"])
      .trim()
      .split("\n")
      .filter(Boolean);

    const log = parseLog(rawFormatted);

    for (let i = 0; i < rawAuthors.length; i++) {
      expect(log.commits[i].author).toBe(rawAuthors[i]);
      expect(log.commits[i].email).toBe(rawEmails[i]);
    }
  });
});

/** Check if repo has enough history for diff tests (CI may shallow-clone) */
function hasParentCommit(): boolean {
  try {
    gitRaw(["rev-parse", "--verify", "HEAD~1"]);
    return true;
  } catch {
    return false;
  }
}

describe("fidelity: git diff", () => {
  it("preserves every changed file from numstat", () => {
    if (!hasParentCommit()) return; // shallow clone in CI

    const rawNumstat = gitRaw(["diff", "--numstat", "HEAD~1"]);

    if (!rawNumstat.trim()) return; // No diff to compare

    const diff = parseDiffStat(rawNumstat);

    // Every file in numstat should be in structured output
    const rawFiles = rawNumstat
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split("\t").slice(2).join("\t"));

    expect(diff.files.length).toBe(rawFiles.length);

    for (const rawFile of rawFiles) {
      const found = diff.files.some((f) => f.file === rawFile);
      expect(found).toBe(true);
    }
  });

  it("preserves addition/deletion counts", () => {
    if (!hasParentCommit()) return; // shallow clone in CI

    const rawNumstat = gitRaw(["diff", "--numstat", "HEAD~1"]);

    if (!rawNumstat.trim()) return;

    const diff = parseDiffStat(rawNumstat);

    const rawLines = rawNumstat.trim().split("\n").filter(Boolean);
    for (let i = 0; i < rawLines.length; i++) {
      const [rawAdd, rawDel] = rawLines[i].split("\t");
      const expectedAdd = rawAdd === "-" ? 0 : parseInt(rawAdd, 10);
      const expectedDel = rawDel === "-" ? 0 : parseInt(rawDel, 10);

      expect(diff.files[i].additions).toBe(expectedAdd);
      expect(diff.files[i].deletions).toBe(expectedDel);
    }
  });

  it("totalAdditions/totalDeletions match sum of per-file counts", () => {
    if (!hasParentCommit()) return; // shallow clone in CI

    const rawNumstat = gitRaw(["diff", "--numstat", "HEAD~1"]);

    if (!rawNumstat.trim()) return;

    const diff = parseDiffStat(rawNumstat);

    const expectedAdditions = diff.files.reduce((sum, f) => sum + f.additions, 0);
    const expectedDeletions = diff.files.reduce((sum, f) => sum + f.deletions, 0);

    expect(diff.totalAdditions).toBe(expectedAdditions);
    expect(diff.totalDeletions).toBe(expectedDeletions);
    expect(diff.totalFiles).toBe(diff.files.length);
  });
});

describe("fidelity: git branch", () => {
  it("preserves every branch name from raw output", () => {
    const raw = gitRaw(["branch"]);
    const rawBranches = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.replace(/^\*?\s+/, "").split(/\s+/)[0]);

    const branches = parseBranch(raw);

    expect(branches.branches.length).toBe(rawBranches.length);

    for (const rawBranch of rawBranches) {
      const found = branches.branches.some((b) => b.name === rawBranch);
      expect(found).toBe(true);
    }
  });

  it("correctly identifies the current branch", () => {
    const raw = gitRaw(["branch"]);
    const rawCurrent = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .find((l) => l.startsWith("* "));

    const branches = parseBranch(raw);

    if (rawCurrent) {
      const expectedCurrent = rawCurrent.replace("* ", "").split(/\s+/)[0];
      expect(branches.current).toBe(expectedCurrent);
    }
  });
});

describe("fidelity: git show", () => {
  it("preserves commit metadata from raw show", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%B`;

    const rawFormatted = gitRaw(["show", "--no-patch", `--format=${FORMAT}`, "HEAD"]);
    const rawDiff = gitRaw(["show", "--numstat", "--format=", "HEAD"]);

    // Cross-check with raw fields
    const rawHash = gitRaw(["show", "--format=%H", "--no-patch", "HEAD"]).trim();
    const rawAuthor = gitRaw(["show", "--format=%an", "--no-patch", "HEAD"]).trim();
    const rawEmail = gitRaw(["show", "--format=%ae", "--no-patch", "HEAD"]).trim();

    const show = parseShow(rawFormatted, rawDiff);

    expect(show.hash).toBe(rawHash);
    expect(show.author).toBe(rawAuthor);
    expect(show.email).toBe(rawEmail);
  });

  it("preserves file list from show diff", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%B`;

    const rawFormatted = gitRaw(["show", "--no-patch", `--format=${FORMAT}`, "HEAD"]);
    const rawDiff = gitRaw(["show", "--numstat", "--format=", "HEAD"]);

    const show = parseShow(rawFormatted, rawDiff);

    // Cross-check file count with raw stat
    const rawStat = gitRaw(["show", "--stat", "--format=", "HEAD"]);
    const rawFileCountMatch = rawStat.match(/(\d+) files? changed/);

    if (rawFileCountMatch) {
      expect(show.diff.totalFiles).toBe(parseInt(rawFileCountMatch[1], 10));
    }
  });
});

describe("fidelity: edge cases", () => {
  it("parseStatus handles empty working tree", () => {
    const status = parseStatus("", "## main");
    expect(status.clean).toBe(true);
    expect(status.staged).toHaveLength(0);
    expect(status.modified).toHaveLength(0);
    expect(status.untracked).toHaveLength(0);
  });

  it("parseLog handles empty output", () => {
    const log = parseLog("");
    expect(log.commits).toHaveLength(0);
    expect(log.total).toBe(0);
  });

  it("parseDiffStat handles empty diff", () => {
    const diff = parseDiffStat("");
    expect(diff.files).toHaveLength(0);
    expect(diff.totalAdditions).toBe(0);
    expect(diff.totalDeletions).toBe(0);
    expect(diff.totalFiles).toBe(0);
  });

  it("parseBranch handles single branch", () => {
    const branches = parseBranch("* main\n");
    expect(branches.branches).toHaveLength(1);
    expect(branches.current).toBe("main");
  });

  it("parseStatus handles rename with arrow notation", () => {
    const status = parseStatus("R  old-name.ts -> new-name.ts", "## main");
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].file).toBe("new-name.ts");
    expect(status.staged[0].oldFile).toBe("old-name.ts");
    expect(status.staged[0].status).toBe("renamed");
  });

  it("parseStatus handles conflict markers (UU)", () => {
    const status = parseStatus("UU conflicted-file.ts", "## main");
    expect(status.conflicts).toContain("conflicted-file.ts");
    expect(status.staged).toHaveLength(0);
  });

  it("parseDiffStat handles binary files (- - markers)", () => {
    const diff = parseDiffStat("-\t-\timage.png");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].file).toBe("image.png");
    expect(diff.files[0].additions).toBe(0);
    expect(diff.files[0].deletions).toBe(0);
  });

  it("parseLog handles commit message with special characters", () => {
    const DELIMITER = "@@";
    const line = `abc123${DELIMITER}abc${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}1 day ago${DELIMITER}HEAD -> main${DELIMITER}fix: handle "quotes" & <brackets>`;
    const log = parseLog(line);
    expect(log.commits[0].message).toBe('fix: handle "quotes" & <brackets>');
  });
});

describe("fidelity: status edge cases (expanded)", () => {
  it("parseStatus handles quoted paths with spaces in rename", () => {
    const status = parseStatus(
      'R  "old name.ts" -> "new name.ts"',
      "## main",
    );
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].file).toBe('"new name.ts"');
    expect(status.staged[0].oldFile).toBe('"old name.ts"');
    expect(status.staged[0].status).toBe("renamed");
  });

  it("parseStatus handles AA (both added) conflict", () => {
    const status = parseStatus("AA both-added.ts", "## main");
    expect(status.conflicts).toContain("both-added.ts");
    expect(status.staged).toHaveLength(0);
    expect(status.clean).toBe(false);
  });

  it("parseStatus handles DD (both deleted) as staged deletion", () => {
    // DD = both deleted; parser treats index D as staged deletion
    // and worktree D as deleted — it does NOT match conflict conditions
    const status = parseStatus("DD both-deleted.ts", "## main");
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].status).toBe("deleted");
    expect(status.deleted).toContain("both-deleted.ts");
    expect(status.clean).toBe(false);
  });

  it("parseStatus handles AU (added by us, unmerged) conflict", () => {
    const status = parseStatus("AU added-by-us.ts", "## main");
    expect(status.conflicts).toContain("added-by-us.ts");
    expect(status.staged).toHaveLength(0);
  });

  it("parseStatus handles UA (unmerged, added by them) conflict", () => {
    const status = parseStatus("UA added-by-them.ts", "## main");
    expect(status.conflicts).toContain("added-by-them.ts");
    expect(status.staged).toHaveLength(0);
  });

  it("parseStatus handles DU (deleted by us, unmerged) conflict", () => {
    const status = parseStatus("DU deleted-by-us.ts", "## main");
    expect(status.conflicts).toContain("deleted-by-us.ts");
    expect(status.staged).toHaveLength(0);
  });

  it("parseStatus handles UD (unmerged, deleted by them) conflict", () => {
    const status = parseStatus("UD deleted-by-them.ts", "## main");
    expect(status.conflicts).toContain("deleted-by-them.ts");
    expect(status.staged).toHaveLength(0);
  });

  it("parseStatus handles detached HEAD", () => {
    const status = parseStatus("", "## HEAD (no branch)");
    expect(status.branch).toBe("HEAD");
    expect(status.clean).toBe(true);
  });

  it("parseStatus handles files with special characters in names", () => {
    const status = parseStatus(
      "?? file-with-special_chars!@#$.txt",
      "## main",
    );
    expect(status.untracked).toContain("file-with-special_chars!@#$.txt");
  });

  it("parseStatus handles file with plus and equals in name", () => {
    const status = parseStatus("M  config+debug=true.json", "## main");
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0].file).toBe("config+debug=true.json");
    expect(status.staged[0].status).toBe("modified");
  });

  it("parseStatus handles multiple conflict types simultaneously", () => {
    const lines = [
      "UU merge-conflict.ts",
      "AA both-added.ts",
      "AU our-add.ts",
      "UA their-add.ts",
    ].join("\n");
    const status = parseStatus(lines, "## main");
    expect(status.conflicts).toHaveLength(4);
    expect(status.conflicts).toContain("merge-conflict.ts");
    expect(status.conflicts).toContain("both-added.ts");
    expect(status.conflicts).toContain("our-add.ts");
    expect(status.conflicts).toContain("their-add.ts");
    expect(status.staged).toHaveLength(0);
  });
});

describe("fidelity: log edge cases (expanded)", () => {
  it("parseLog handles commit message containing @@ delimiter", () => {
    const DELIMITER = "@@";
    // Message itself contains @@, which is also the delimiter
    const line = `abc123${DELIMITER}abc${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}2 days ago${DELIMITER}HEAD -> main${DELIMITER}fix: handle @@ in diff output`;
    const log = parseLog(line);
    expect(log.commits).toHaveLength(1);
    // The parser joins messageParts with @@, so it reconstructs the message
    expect(log.commits[0].message).toBe("fix: handle @@ in diff output");
  });

  it("parseLog handles commit message with multiple @@ occurrences", () => {
    const DELIMITER = "@@";
    const line = `def456${DELIMITER}def${DELIMITER}Dev${DELIMITER}d@e.com${DELIMITER}3 hours ago${DELIMITER}${DELIMITER}fix: @@ -1,5 +1,7 @@ in message`;
    const log = parseLog(line);
    expect(log.commits).toHaveLength(1);
    expect(log.commits[0].message).toBe("fix: @@ -1,5 +1,7 @@ in message");
  });

  it("parseLog handles empty refs field (no decoration)", () => {
    const DELIMITER = "@@";
    const line = `abc123${DELIMITER}abc${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}5 days ago${DELIMITER}${DELIMITER}chore: routine update`;
    const log = parseLog(line);
    expect(log.commits).toHaveLength(1);
    expect(log.commits[0].message).toBe("chore: routine update");
    // Empty refs field should not produce a refs property (the parser uses spread with truthy check)
    expect(log.commits[0].refs).toBeUndefined();
  });

  it("parseLog handles message with newline characters gracefully", () => {
    const DELIMITER = "@@";
    // %s in git log should not have newlines, but if it somehow does, the parser
    // splits on \n first, so a newline would create a second "line" that fails to parse
    // Test that at least the first commit parses correctly
    const input = `abc123${DELIMITER}abc${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}1 day ago${DELIMITER}${DELIMITER}first line\nsecond line`;
    const log = parseLog(input);
    // The newline splits into two lines; first parses as a commit, second is malformed
    expect(log.commits.length).toBeGreaterThanOrEqual(1);
    expect(log.commits[0].message).toBe("first line");
  });

  it("parseLog handles multiple commits with mixed refs", () => {
    const DELIMITER = "@@";
    const lines = [
      `aaa111${DELIMITER}aaa${DELIMITER}Alice${DELIMITER}alice@test.com${DELIMITER}1 day ago${DELIMITER}HEAD -> main, origin/main${DELIMITER}feat: add feature`,
      `bbb222${DELIMITER}bbb${DELIMITER}Bob${DELIMITER}bob@test.com${DELIMITER}2 days ago${DELIMITER}${DELIMITER}fix: bug fix`,
      `ccc333${DELIMITER}ccc${DELIMITER}Charlie${DELIMITER}charlie@test.com${DELIMITER}3 days ago${DELIMITER}tag: v1.0.0${DELIMITER}chore: release`,
    ].join("\n");
    const log = parseLog(lines);
    expect(log.commits).toHaveLength(3);
    expect(log.total).toBe(3);
    expect(log.commits[0].refs).toBe("HEAD -> main, origin/main");
    expect(log.commits[1].refs).toBeUndefined();
    expect(log.commits[2].refs).toBe("tag: v1.0.0");
  });

  it("parseLog handles message with quotes, angle brackets, and ampersands", () => {
    const DELIMITER = "@@";
    const line = `xyz789${DELIMITER}xyz${DELIMITER}Dev${DELIMITER}dev@co.com${DELIMITER}1 hour ago${DELIMITER}${DELIMITER}fix: escape "quotes" <tags> & ampersands 'singles' \`backticks\``;
    const log = parseLog(line);
    expect(log.commits[0].message).toBe(
      "fix: escape \"quotes\" <tags> & ampersands 'singles' `backticks`",
    );
  });
});

describe("fidelity: diff edge cases (expanded)", () => {
  it("parseDiffStat handles simple rename with => notation", () => {
    const diff = parseDiffStat("5\t2\told.ts => new.ts");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].file).toBe("old.ts => new.ts");
    expect(diff.files[0].status).toBe("renamed");
    expect(diff.files[0].additions).toBe(5);
    expect(diff.files[0].deletions).toBe(2);
  });

  it("parseDiffStat handles brace rename {src => lib}/file.ts", () => {
    const diff = parseDiffStat("3\t1\t{src => lib}/file.ts");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].file).toBe("{src => lib}/file.ts");
    expect(diff.files[0].status).toBe("renamed");
    expect(diff.files[0].additions).toBe(3);
    expect(diff.files[0].deletions).toBe(1);
  });

  it("parseDiffStat handles large addition/deletion counts", () => {
    const diff = parseDiffStat("1500\t2300\tsrc/generated/schema.ts");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].additions).toBe(1500);
    expect(diff.files[0].deletions).toBe(2300);
    expect(diff.totalAdditions).toBe(1500);
    expect(diff.totalDeletions).toBe(2300);
  });

  it("parseDiffStat handles very large counts (10000+)", () => {
    const lines = [
      "15000\t0\tsrc/vendor/large-lib.js",
      "0\t12000\tsrc/vendor/old-lib.js",
    ].join("\n");
    const diff = parseDiffStat(lines);
    expect(diff.files).toHaveLength(2);
    expect(diff.files[0].additions).toBe(15000);
    expect(diff.files[0].deletions).toBe(0);
    expect(diff.files[0].status).toBe("added");
    expect(diff.files[1].additions).toBe(0);
    expect(diff.files[1].deletions).toBe(12000);
    expect(diff.files[1].status).toBe("deleted");
    expect(diff.totalAdditions).toBe(15000);
    expect(diff.totalDeletions).toBe(12000);
    expect(diff.totalFiles).toBe(2);
  });

  it("parseDiffStat handles renamed file with zero changes", () => {
    const diff = parseDiffStat("0\t0\told-name.ts => new-name.ts");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].status).toBe("renamed");
    expect(diff.files[0].additions).toBe(0);
    expect(diff.files[0].deletions).toBe(0);
  });

  it("parseDiffStat handles nested brace rename", () => {
    const diff = parseDiffStat("10\t5\tpackages/{server-old => server-new}/src/index.ts");
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0].file).toBe("packages/{server-old => server-new}/src/index.ts");
    expect(diff.files[0].status).toBe("renamed");
    expect(diff.files[0].additions).toBe(10);
    expect(diff.files[0].deletions).toBe(5);
  });

  it("parseDiffStat handles mix of renames, additions, deletions, and binary", () => {
    const lines = [
      "5\t2\told.ts => new.ts",
      "100\t0\tsrc/feature.ts",
      "0\t50\tsrc/deprecated.ts",
      "-\t-\tassets/logo.png",
      "10\t10\tsrc/refactored.ts",
    ].join("\n");
    const diff = parseDiffStat(lines);
    expect(diff.totalFiles).toBe(5);
    expect(diff.files[0].status).toBe("renamed");
    expect(diff.files[1].status).toBe("added");
    expect(diff.files[2].status).toBe("deleted");
    expect(diff.files[3].additions).toBe(0);
    expect(diff.files[3].deletions).toBe(0);
    expect(diff.files[4].status).toBe("modified");
    expect(diff.totalAdditions).toBe(115);
    expect(diff.totalDeletions).toBe(62);
  });
});

describe("fidelity: show edge cases (expanded)", () => {
  it("parseShow handles commit with empty diff (no file changes)", () => {
    const DELIMITER = "@@";
    const metadata = `abc123${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}1 day ago${DELIMITER}chore: empty commit`;
    const show = parseShow(metadata, "");
    expect(show.hash).toBe("abc123");
    expect(show.author).toBe("Author");
    expect(show.email).toBe("a@b.com");
    expect(show.date).toBe("1 day ago");
    expect(show.message).toBe("chore: empty commit");
    expect(show.diff.files).toHaveLength(0);
    expect(show.diff.totalFiles).toBe(0);
    expect(show.diff.totalAdditions).toBe(0);
    expect(show.diff.totalDeletions).toBe(0);
  });

  it("parseShow handles commit body with multi-line message containing @@", () => {
    const DELIMITER = "@@";
    // Message body contains @@ which is also the delimiter
    const metadata = `def456${DELIMITER}Dev${DELIMITER}dev@co.com${DELIMITER}2 hours ago${DELIMITER}fix: handle @@ -1,5 +1,7 @@ diff markers in commit messages`;
    const diffOutput = "3\t1\tsrc/parsers.ts";
    const show = parseShow(metadata, diffOutput);
    expect(show.hash).toBe("def456");
    expect(show.message).toBe(
      "fix: handle @@ -1,5 +1,7 @@ diff markers in commit messages",
    );
    expect(show.diff.files).toHaveLength(1);
    expect(show.diff.files[0].file).toBe("src/parsers.ts");
  });

  it("parseShow handles commit with multiple @@ in body", () => {
    const DELIMITER = "@@";
    const metadata = `ghi789${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}3 days ago${DELIMITER}test: verify @@ delimiter @@ handling @@ in messages`;
    const show = parseShow(metadata, "");
    expect(show.hash).toBe("ghi789");
    expect(show.message).toBe(
      "test: verify @@ delimiter @@ handling @@ in messages",
    );
  });

  it("parseShow handles commit with large diff", () => {
    const DELIMITER = "@@";
    const metadata = `jkl012${DELIMITER}Dev${DELIMITER}dev@co.com${DELIMITER}1 week ago${DELIMITER}feat: massive refactor`;
    const diffLines = [
      "500\t200\tsrc/core.ts",
      "1000\t0\tsrc/new-module.ts",
      "0\t800\tsrc/old-module.ts",
    ].join("\n");
    const show = parseShow(metadata, diffLines);
    expect(show.diff.totalFiles).toBe(3);
    expect(show.diff.totalAdditions).toBe(1500);
    expect(show.diff.totalDeletions).toBe(1000);
  });
});
