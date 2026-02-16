/**
 * Fidelity tests: verify that Pare's structured output preserves all
 * meaningful information from the raw CLI output.
 *
 * These tests run real git commands on the Pare repo itself, then compare
 * the raw output against Pare's parsed structured output to ensure no
 * important data is lost.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseStatus,
  parseLog,
  parseDiffStat,
  parseBranch,
  parseShow,
  parseAdd,
  parseCommit,
  parseCheckout,
  parsePush,
  parsePull,
  parseLogGraph,
  parseReflogOutput,
  parseBisect,
  parseWorktreeList,
} from "../src/lib/parsers.js";

const CWD = process.cwd();

function gitRaw(args: string[]): string {
  return execFileSync("git", args, {
    cwd: CWD,
    encoding: "utf-8",
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
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
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
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
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

  it("preserves author name and email in combined format", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%h${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%D${DELIMITER}%s`;
    const rawFormatted = gitRaw(["log", `--format=${FORMAT}`, "--max-count=3"]);

    const rawAuthors = gitRaw(["log", "--format=%an <%ae>", "--max-count=3"])
      .trim()
      .split("\n")
      .filter(Boolean);

    const log = parseLog(rawFormatted);

    for (let i = 0; i < rawAuthors.length; i++) {
      expect(log.commits[i].author).toBe(rawAuthors[i]);
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
    const FORMAT = `%H${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%B`;

    const rawFormatted = gitRaw(["show", "--no-patch", `--format=${FORMAT}`, "HEAD"]);
    const rawDiff = gitRaw(["show", "--numstat", "--format=", "HEAD"]);

    // Cross-check with raw fields
    const rawHash = gitRaw(["show", "--format=%H", "--no-patch", "HEAD"]).trim();
    const rawAuthor = gitRaw(["show", "--format=%an <%ae>", "--no-patch", "HEAD"]).trim();

    const show = parseShow(rawFormatted, rawDiff);

    expect(show.hash).toBe(rawHash);
    expect(show.author).toBe(rawAuthor);
  });

  it("preserves file list from show diff", () => {
    const DELIMITER = "@@";
    const FORMAT = `%H${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%B`;

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
    const line = `abc123${DELIMITER}abc${DELIMITER}Author <a@b.com>${DELIMITER}1 day ago${DELIMITER}HEAD -> main${DELIMITER}fix: handle "quotes" & <brackets>`;
    const log = parseLog(line);
    expect(log.commits[0].message).toBe('fix: handle "quotes" & <brackets>');
  });
});

describe("fidelity: status edge cases (expanded)", () => {
  it("parseStatus handles quoted paths with spaces in rename", () => {
    const status = parseStatus('R  "old name.ts" -> "new name.ts"', "## main");
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
    const status = parseStatus("?? file-with-special_chars!@#$.txt", "## main");
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
    const line = `abc123${DELIMITER}abc${DELIMITER}Author <a@b.com>${DELIMITER}2 days ago${DELIMITER}HEAD -> main${DELIMITER}fix: handle @@ in diff output`;
    const log = parseLog(line);
    expect(log.commits).toHaveLength(1);
    // The parser joins messageParts with @@, so it reconstructs the message
    expect(log.commits[0].message).toBe("fix: handle @@ in diff output");
  });

  it("parseLog handles commit message with multiple @@ occurrences", () => {
    const DELIMITER = "@@";
    const line = `def456${DELIMITER}def${DELIMITER}Dev <d@e.com>${DELIMITER}3 hours ago${DELIMITER}${DELIMITER}fix: @@ -1,5 +1,7 @@ in message`;
    const log = parseLog(line);
    expect(log.commits).toHaveLength(1);
    expect(log.commits[0].message).toBe("fix: @@ -1,5 +1,7 @@ in message");
  });

  it("parseLog handles empty refs field (no decoration)", () => {
    const DELIMITER = "@@";
    const line = `abc123${DELIMITER}abc${DELIMITER}Author <a@b.com>${DELIMITER}5 days ago${DELIMITER}${DELIMITER}chore: routine update`;
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
    const input = `abc123${DELIMITER}abc${DELIMITER}Author <a@b.com>${DELIMITER}1 day ago${DELIMITER}${DELIMITER}first line\nsecond line`;
    const log = parseLog(input);
    // The newline splits into two lines; first parses as a commit, second is malformed
    expect(log.commits.length).toBeGreaterThanOrEqual(1);
    expect(log.commits[0].message).toBe("first line");
  });

  it("parseLog handles multiple commits with mixed refs", () => {
    const DELIMITER = "@@";
    const lines = [
      `aaa111${DELIMITER}aaa${DELIMITER}Alice <alice@test.com>${DELIMITER}1 day ago${DELIMITER}HEAD -> main, origin/main${DELIMITER}feat: add feature`,
      `bbb222${DELIMITER}bbb${DELIMITER}Bob <bob@test.com>${DELIMITER}2 days ago${DELIMITER}${DELIMITER}fix: bug fix`,
      `ccc333${DELIMITER}ccc${DELIMITER}Charlie <charlie@test.com>${DELIMITER}3 days ago${DELIMITER}tag: v1.0.0${DELIMITER}chore: release`,
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
    const line = `xyz789${DELIMITER}xyz${DELIMITER}Dev <dev@co.com>${DELIMITER}1 hour ago${DELIMITER}${DELIMITER}fix: escape "quotes" <tags> & ampersands 'singles' \`backticks\``;
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
    const lines = ["15000\t0\tsrc/vendor/large-lib.js", "0\t12000\tsrc/vendor/old-lib.js"].join(
      "\n",
    );
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
    const metadata = `abc123${DELIMITER}Author <a@b.com>${DELIMITER}1 day ago${DELIMITER}chore: empty commit`;
    const show = parseShow(metadata, "");
    expect(show.hash).toBe("abc123");
    expect(show.author).toBe("Author <a@b.com>");
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
    const metadata = `def456${DELIMITER}Dev <dev@co.com>${DELIMITER}2 hours ago${DELIMITER}fix: handle @@ -1,5 +1,7 @@ diff markers in commit messages`;
    const diffOutput = "3\t1\tsrc/parsers.ts";
    const show = parseShow(metadata, diffOutput);
    expect(show.hash).toBe("def456");
    expect(show.message).toBe("fix: handle @@ -1,5 +1,7 @@ diff markers in commit messages");
    expect(show.diff.files).toHaveLength(1);
    expect(show.diff.files[0].file).toBe("src/parsers.ts");
  });

  it("parseShow handles commit with multiple @@ in body", () => {
    const DELIMITER = "@@";
    const metadata = `ghi789${DELIMITER}Author <a@b.com>${DELIMITER}3 days ago${DELIMITER}test: verify @@ delimiter @@ handling @@ in messages`;
    const show = parseShow(metadata, "");
    expect(show.hash).toBe("ghi789");
    expect(show.message).toBe("test: verify @@ delimiter @@ handling @@ in messages");
  });

  it("parseShow handles commit with large diff", () => {
    const DELIMITER = "@@";
    const metadata = `jkl012${DELIMITER}Dev <dev@co.com>${DELIMITER}1 week ago${DELIMITER}feat: massive refactor`;
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

// ── Write tool fidelity tests ──────────────────────────────────────────

/**
 * Helper: create a temporary git repo for write-tool fidelity tests.
 * Returns { dir, git } where git() runs git commands in that repo.
 */
function makeTempRepo(): {
  dir: string;
  git: (args: string[]) => string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), "pare-git-fidelity-"));
  const gitInDir = (args: string[]) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf-8",
    });

  // Initialise a repo with an initial commit
  gitInDir(["init"]);
  gitInDir(["config", "user.email", "test@pare.dev"]);
  gitInDir(["config", "user.name", "Pare Test"]);
  writeFileSync(join(dir, "initial.txt"), "hello\n");
  gitInDir(["add", "."]);
  gitInDir(["commit", "-m", "Initial commit"]);

  return {
    dir,
    git: gitInDir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe("fidelity: git add (write tool)", () => {
  let repo: ReturnType<typeof makeTempRepo>;

  beforeEach(() => {
    repo = makeTempRepo();
  });

  afterEach(() => {
    repo.cleanup();
  });

  it("parseAdd captures newly staged files", () => {
    writeFileSync(join(repo.dir, "a.ts"), "export const a = 1;\n");
    writeFileSync(join(repo.dir, "b.ts"), "export const b = 2;\n");

    repo.git(["add", "a.ts", "b.ts"]);
    const statusOut = repo.git(["status", "--porcelain=v1"]);

    const result = parseAdd(statusOut);

    expect(result.staged).toBe(2);
    expect(result.files.map((f) => f.file)).toContain("a.ts");
    expect(result.files.map((f) => f.file)).toContain("b.ts");
  });

  it("parseAdd captures staged deletions", () => {
    repo.git(["rm", "initial.txt"]);
    const statusOut = repo.git(["status", "--porcelain=v1"]);

    const result = parseAdd(statusOut);

    expect(result.staged).toBe(1);
    expect(result.files.map((f) => f.file)).toContain("initial.txt");
    expect(result.files[0].status).toBe("deleted");
  });

  it("parseAdd captures staged modifications", () => {
    writeFileSync(join(repo.dir, "initial.txt"), "modified content\n");
    repo.git(["add", "initial.txt"]);
    const statusOut = repo.git(["status", "--porcelain=v1"]);

    const result = parseAdd(statusOut);

    expect(result.staged).toBe(1);
    expect(result.files.map((f) => f.file)).toContain("initial.txt");
    expect(result.files[0].status).toBe("modified");
  });

  it("parseAdd ignores unstaged and untracked files", () => {
    writeFileSync(join(repo.dir, "untracked.ts"), "new\n");
    writeFileSync(join(repo.dir, "initial.txt"), "modified\n");
    // Don't stage anything
    const statusOut = repo.git(["status", "--porcelain=v1"]);

    const result = parseAdd(statusOut);

    expect(result.staged).toBe(0);
    expect(result.files).toEqual([]);
  });

  it("parseAdd with git add -A stages everything", () => {
    writeFileSync(join(repo.dir, "new1.ts"), "a\n");
    writeFileSync(join(repo.dir, "new2.ts"), "b\n");
    writeFileSync(join(repo.dir, "initial.txt"), "changed\n");

    repo.git(["add", "-A"]);
    const statusOut = repo.git(["status", "--porcelain=v1"]);

    const result = parseAdd(statusOut);

    expect(result.staged).toBe(3);
    expect(result.files.map((f) => f.file)).toContain("new1.ts");
    expect(result.files.map((f) => f.file)).toContain("new2.ts");
    expect(result.files.map((f) => f.file)).toContain("initial.txt");
  });
});

describe("fidelity: git commit (write tool)", () => {
  let repo: ReturnType<typeof makeTempRepo>;

  beforeEach(() => {
    repo = makeTempRepo();
  });

  afterEach(() => {
    repo.cleanup();
  });

  it("parseCommit captures hash, message, and stats from real commit", () => {
    writeFileSync(join(repo.dir, "feature.ts"), "export function feature() {}\n");
    repo.git(["add", "feature.ts"]);
    const stdout = repo.git(["commit", "-m", "Add feature module"]);

    const result = parseCommit(stdout);

    expect(result.hash).toBeTruthy();
    expect(result.hash.length).toBeGreaterThanOrEqual(7);
    expect(result.hashShort.length).toBe(7);
    expect(result.message).toBe("Add feature module");
    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(1);
    expect(result.deletions).toBe(0);
  });

  it("parseCommit captures multi-file commit stats", () => {
    writeFileSync(join(repo.dir, "a.ts"), "line1\nline2\nline3\n");
    writeFileSync(join(repo.dir, "b.ts"), "line1\nline2\n");
    repo.git(["add", "."]);
    const stdout = repo.git(["commit", "-m", "Add two files"]);

    const result = parseCommit(stdout);

    expect(result.filesChanged).toBe(2);
    expect(result.insertions).toBe(5);
    expect(result.deletions).toBe(0);
  });

  it("parseCommit captures deletions", () => {
    writeFileSync(join(repo.dir, "initial.txt"), "modified\n");
    repo.git(["add", "."]);
    const stdout = repo.git(["commit", "-m", "Modify initial file"]);

    const result = parseCommit(stdout);

    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(1);
    expect(result.deletions).toBe(1);
  });

  it("parseCommit hash matches git rev-parse HEAD", () => {
    writeFileSync(join(repo.dir, "verify.ts"), "export {};\n");
    repo.git(["add", "."]);
    const stdout = repo.git(["commit", "-m", "Verify hash"]);

    const result = parseCommit(stdout);
    const actualHash = repo.git(["rev-parse", "HEAD"]).trim();

    expect(actualHash.startsWith(result.hash)).toBe(true);
  });
});

describe("fidelity: git checkout (write tool)", () => {
  let repo: ReturnType<typeof makeTempRepo>;

  beforeEach(() => {
    repo = makeTempRepo();
  });

  afterEach(() => {
    repo.cleanup();
  });

  it("parseCheckout captures new branch creation", () => {
    const currentBranch = repo.git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();

    const stderr = repo.git(["checkout", "-b", "feature/test"]);

    const result = parseCheckout("", stderr, "feature/test", currentBranch, true);

    expect(result.success).toBe(true);
    expect(result.ref).toBe("feature/test");
    expect(result.previousRef).toBe(currentBranch);
    expect(result.created).toBe(true);

    // Verify git actually switched
    const newBranch = repo.git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    expect(newBranch).toBe("feature/test");
  });

  it("parseCheckout captures branch switch", () => {
    repo.git(["checkout", "-b", "dev"]);
    repo.git([
      "checkout",
      repo
        .git(["branch"])
        .trim()
        .split("\n")
        .find((l) => !l.startsWith("*"))
        ?.trim() || "master",
    ]);

    const previousBranch = repo.git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    const stderr = repo.git(["checkout", "dev"]);

    const result = parseCheckout("", stderr, "dev", previousBranch, false);

    expect(result.success).toBe(true);
    expect(result.ref).toBe("dev");
    expect(result.previousRef).toBe(previousBranch);
    expect(result.created).toBe(false);
  });
});

describe("fidelity: git push parser (write tool — fixture-based)", () => {
  it("parsePush captures successful push to new branch", () => {
    const stderr = `To github.com:user/repo.git
 * [new branch]      feature/auth -> feature/auth`;

    const result = parsePush("", stderr, "origin", "feature/auth");

    expect(result.success).toBe(true);
    expect(result.remote).toBe("origin");
    expect(result.branch).toBe("feature/auth");
    expect(result.summary).toContain("new branch");
  });

  it("parsePush captures fast-forward push", () => {
    const stderr = `To github.com:user/repo.git
   abc1234..def5678  main -> main`;

    const result = parsePush("", stderr, "origin", "main");

    expect(result.success).toBe(true);
    expect(result.remote).toBe("origin");
    expect(result.branch).toBe("main");
    expect(result.summary).toContain("abc1234..def5678");
  });

  it("parsePush captures forced update", () => {
    const stderr = `To github.com:user/repo.git
 + abc1234...def5678 main -> main (forced update)`;

    const result = parsePush("", stderr, "origin", "main");

    expect(result.success).toBe(true);
    expect(result.summary).toContain("forced update");
  });

  it("parsePush resolves branch from output when not specified", () => {
    const stderr = `To github.com:user/repo.git
   aaa1111..bbb2222  develop -> develop`;

    const result = parsePush("", stderr, "origin", "");

    expect(result.branch).toBe("develop");
  });
});

describe("fidelity: git pull parser (write tool — fixture-based)", () => {
  it("parsePull captures fast-forward with stats", () => {
    const stdout = `Updating abc1234..def5678
Fast-forward
 src/index.ts | 10 +++++++---
 src/utils.ts |  5 +++++
 2 files changed, 12 insertions(+), 3 deletions(-)`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.insertions).toBe(12);
    expect(result.deletions).toBe(3);
    expect(result.conflicts).toEqual([]);
  });

  it("parsePull captures already up to date", () => {
    const result = parsePull("Already up to date.", "");

    expect(result.success).toBe(true);
    expect(result.summary).toBe("Already up to date");
    expect(result.filesChanged).toBe(0);
  });

  it("parsePull captures merge conflicts from realistic output", () => {
    const stdout = `remote: Enumerating objects: 5, done.
remote: Counting objects: 100% (5/5), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 3 (delta 2), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:user/repo
   abc1234..def5678  main       -> origin/main
Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
Auto-merging src/config.ts
CONFLICT (content): Merge conflict in src/config.ts
Automatic merge failed; fix conflicts and then commit the result.`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["src/index.ts", "src/config.ts"]);
    expect(result.summary).toContain("2 conflict(s)");
  });

  it("parsePull captures rebase pull output", () => {
    const stdout = `Successfully rebased and updated refs/heads/main.
 5 files changed, 30 insertions(+), 10 deletions(-)`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(5);
    expect(result.insertions).toBe(30);
    expect(result.deletions).toBe(10);
  });
});

// ── Fidelity tests for new tools (log-graph, reflog, bisect, worktree) ──

describe("fidelity: git log-graph (fixture-based)", () => {
  it("parseLogGraph preserves commit hashes and messages from graph output", () => {
    const raw = [
      "* abc1234 (HEAD -> main, origin/main) feat: add log-graph tool",
      "* def5678 fix: handle edge case in parser",
      "* aaa9012 chore: update dependencies",
    ].join("\n");

    const result = parseLogGraph(raw);

    expect(result.total).toBe(3);
    expect(result.commits).toHaveLength(3);

    expect(result.commits[0].hashShort).toBe("abc1234");
    expect(result.commits[0].message).toBe("feat: add log-graph tool");
    expect(result.commits[0].refs).toBe("HEAD -> main, origin/main");
    expect(result.commits[0].graph).toBe("*");

    expect(result.commits[1].hashShort).toBe("def5678");
    expect(result.commits[1].message).toBe("fix: handle edge case in parser");
    expect(result.commits[1].refs).toBeUndefined();

    expect(result.commits[2].hashShort).toBe("aaa9012");
    expect(result.commits[2].message).toBe("chore: update dependencies");
  });

  it("parseLogGraph handles merge graph topology with continuation lines", () => {
    const raw = [
      "*   abc1234 (HEAD -> main) Merge branch 'feature'",
      "|\\",
      "| * def5678 feat: add feature",
      "| * aaa9012 feat: scaffold feature",
      "|/",
      "* bbb3456 chore: initial commit",
    ].join("\n");

    const result = parseLogGraph(raw);

    // 4 actual commits + 2 continuation lines
    expect(result.total).toBe(4);
    expect(result.commits).toHaveLength(6);

    // Continuation lines have empty hashShort
    const realCommits = result.commits.filter((c) => c.hashShort !== "");
    expect(realCommits).toHaveLength(4);
    expect(realCommits[0].hashShort).toBe("abc1234");
    expect(realCommits[0].refs).toBe("HEAD -> main");
    expect(realCommits[1].hashShort).toBe("def5678");
    expect(realCommits[2].hashShort).toBe("aaa9012");
    expect(realCommits[3].hashShort).toBe("bbb3456");
  });

  it("parseLogGraph handles empty output", () => {
    const result = parseLogGraph("");
    expect(result.total).toBe(0);
    expect(result.commits).toHaveLength(0);
  });

  it("parseLogGraph handles multiple refs on a single commit", () => {
    const raw = "* abc1234 (HEAD -> main, tag: v1.0.0, origin/main) release: v1.0.0";

    const result = parseLogGraph(raw);

    expect(result.total).toBe(1);
    expect(result.commits[0].refs).toBe("HEAD -> main, tag: v1.0.0, origin/main");
    expect(result.commits[0].message).toBe("release: v1.0.0");
  });

  it("parseLogGraph preserves commit data from real repo output", () => {
    if (!hasParentCommit()) return; // shallow clone in CI

    const raw = gitRaw(["log", "--graph", "--oneline", "--decorate", "--max-count=5"]);
    const result = parseLogGraph(raw);

    // Cross-check with oneline output for commit count
    const rawOneline = gitRaw(["log", "--oneline", "--max-count=5"]);
    const rawHashes = rawOneline
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split(" ")[0]);

    const graphHashes = result.commits.filter((c) => c.hashShort !== "").map((c) => c.hashShort);

    // Every hash from oneline should appear in graph output
    for (const hash of rawHashes) {
      expect(graphHashes).toContain(hash);
    }
  });
});

describe("fidelity: git reflog (fixture-based)", () => {
  it("parseReflogOutput preserves all fields and normalizes actions", () => {
    const raw = [
      "abc123def456full\tabc1234\tHEAD@{0}\tcheckout: moving from main to feature\t2024-01-15 10:30:00 +0000",
      "def456abc789full\tdef5678\tHEAD@{1}\tcommit: fix the parser bug\t2024-01-14 09:00:00 +0000",
      "ghi789jkl012full\tghi9012\tHEAD@{2}\tpull: Fast-forward\t2024-01-13 08:00:00 +0000",
    ].join("\n");

    const result = parseReflogOutput(raw);

    expect(result.total).toBe(3);
    expect(result.entries).toHaveLength(3);

    // First entry — normalized action
    expect(result.entries[0].hash).toBe("abc123def456full");
    expect(result.entries[0].shortHash).toBe("abc1234");
    expect(result.entries[0].selector).toBe("HEAD@{0}");
    expect(result.entries[0].action).toBe("checkout");
    expect(result.entries[0].rawAction).toBe("checkout");
    expect(result.entries[0].description).toBe("moving from main to feature");
    expect(result.entries[0].date).toBe("2024-01-15 10:30:00 +0000");

    // Second entry — normalized action
    expect(result.entries[1].hash).toBe("def456abc789full");
    expect(result.entries[1].shortHash).toBe("def5678");
    expect(result.entries[1].selector).toBe("HEAD@{1}");
    expect(result.entries[1].action).toBe("commit");
    expect(result.entries[1].rawAction).toBe("commit");
    expect(result.entries[1].description).toBe("fix the parser bug");

    // Third entry — normalized action
    expect(result.entries[2].action).toBe("pull");
    expect(result.entries[2].rawAction).toBe("pull");
    expect(result.entries[2].description).toBe("Fast-forward");
  });

  it("parseReflogOutput handles empty output", () => {
    const result = parseReflogOutput("");
    expect(result.total).toBe(0);
    expect(result.entries).toHaveLength(0);
  });

  it("parseReflogOutput handles entry without description (no colon separator)", () => {
    const raw = "abc123full\tabc1234\tHEAD@{0}\treset\t2024-01-15 10:00:00 +0000";

    const result = parseReflogOutput(raw);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe("reset");
    expect(result.entries[0].rawAction).toBe("reset");
    expect(result.entries[0].description).toBe("");
  });

  it("parseReflogOutput preserves data from real repo output", () => {
    const FORMAT = "%H\t%h\t%gd\t%gs\t%ci";
    const raw = gitRaw(["reflog", `--format=${FORMAT}`, "--max-count=5"]);

    if (!raw.trim()) return; // no reflog entries

    const result = parseReflogOutput(raw);

    // Cross-check: count should match raw lines
    const rawLines = raw.trim().split("\n").filter(Boolean);
    expect(result.total).toBe(rawLines.length);

    // Every entry should have a non-empty hash and selector
    for (const entry of result.entries) {
      expect(entry.hash.length).toBeGreaterThan(0);
      expect(entry.shortHash.length).toBeGreaterThan(0);
      expect(entry.selector).toMatch(/HEAD@\{\d+\}/);
    }
  });
});

describe("fidelity: git bisect parser (fixture-based)", () => {
  it("parseBisect captures culprit commit from bisect result output", () => {
    const hash = "abc123def456abc123def456abc123def456abcd"; // exactly 40 hex chars
    const stdout = `${hash} is the first bad commit
commit ${hash}
Author: Jane Doe <jane@example.com>
Date:   Mon Jan 15 10:30:00 2024 +0000

    feat: introduce the bug`;

    const result = parseBisect(stdout, "", "bad");

    expect(result.action).toBe("bad");
    expect(result.result).toBeDefined();
    expect(result.result!.hash).toBe(hash);
    expect(result.result!.message).toBe("feat: introduce the bug");
    expect(result.result!.author).toBe("Jane Doe <jane@example.com>");
    expect(result.result!.date).toBe("Mon Jan 15 10:30:00 2024 +0000");
  });

  it("parseBisect captures mid-bisect status with remaining steps", () => {
    const stdout = `Bisecting: 5 revisions left to test after this (roughly 3 steps)
[abc1234] chore: some commit message`;

    const result = parseBisect(stdout, "", "good");

    expect(result.action).toBe("good");
    expect(result.remaining).toBe(3);
    expect(result.current).toBe("abc1234");
    expect(result.result).toBeUndefined();
  });

  it("parseBisect handles reset with simple message", () => {
    const stdout = "Previous HEAD position was abc1234... some message\nSwitched to branch 'main'";

    const result = parseBisect(stdout, "", "reset");

    expect(result.action).toBe("reset");
    expect(result.message).toContain("Switched to branch");
    expect(result.result).toBeUndefined();
  });

  it("parseBisect handles empty output for reset", () => {
    const result = parseBisect("", "", "reset");

    expect(result.action).toBe("reset");
    expect(result.message).toBe("Bisect reset completed");
  });
});

describe("fidelity: git worktree parser (fixture-based)", () => {
  it("parseWorktreeList parses porcelain output with multiple worktrees", () => {
    const stdout = [
      "worktree /home/user/repo",
      "HEAD abc123def456abc123def456abc123def456abcdef01",
      "branch refs/heads/main",
      "",
      "worktree /home/user/repo-feature",
      "HEAD def456abc789def456abc789def456abc789defabc02",
      "branch refs/heads/feature/auth",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(2);
    expect(result.worktrees).toHaveLength(2);

    expect(result.worktrees[0].path).toBe("/home/user/repo");
    expect(result.worktrees[0].head).toBe("abc123def456abc123def456abc123def456abcdef01");
    expect(result.worktrees[0].branch).toBe("main");
    expect(result.worktrees[0].bare).toBe(false);

    expect(result.worktrees[1].path).toBe("/home/user/repo-feature");
    expect(result.worktrees[1].head).toBe("def456abc789def456abc789def456abc789defabc02");
    expect(result.worktrees[1].branch).toBe("feature/auth");
    expect(result.worktrees[1].bare).toBe(false);
  });

  it("parseWorktreeList handles bare repository entry", () => {
    const stdout = [
      "worktree /home/user/repo.git",
      "HEAD abc123def456abc123def456abc123def456abcdef01",
      "bare",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].bare).toBe(true);
    expect(result.worktrees[0].branch).toBe("");
  });

  it("parseWorktreeList handles detached HEAD worktree", () => {
    const stdout = [
      "worktree /home/user/repo-detached",
      "HEAD abc123def456abc123def456abc123def456abcdef01",
      "detached",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.total).toBe(1);
    expect(result.worktrees[0].branch).toBe("(detached)");
    expect(result.worktrees[0].bare).toBe(false);
  });

  it("parseWorktreeList handles empty output", () => {
    const result = parseWorktreeList("");
    expect(result.total).toBe(0);
    expect(result.worktrees).toHaveLength(0);
  });

  it("parseWorktreeList strips refs/heads/ prefix from branch", () => {
    const stdout = [
      "worktree /home/user/repo",
      "HEAD abc123",
      "branch refs/heads/feature/deep/nested",
      "",
    ].join("\n");

    const result = parseWorktreeList(stdout);

    expect(result.worktrees[0].branch).toBe("feature/deep/nested");
  });
});
