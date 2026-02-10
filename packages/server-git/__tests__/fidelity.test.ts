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
    const DELIMITER = "\x1f";
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
    const DELIMITER = "\x1f";
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
    const DELIMITER = "\x1f";
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
    const DELIMITER = "\x1f";
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
    const DELIMITER = "\x1f";
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
    const DELIMITER = "\x1f";
    const line = `abc123${DELIMITER}abc${DELIMITER}Author${DELIMITER}a@b.com${DELIMITER}1 day ago${DELIMITER}HEAD -> main${DELIMITER}fix: handle "quotes" & <brackets>`;
    const log = parseLog(line);
    expect(log.commits[0].message).toBe('fix: handle "quotes" & <brackets>');
  });
});
