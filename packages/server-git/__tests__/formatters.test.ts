import { describe, it, expect } from "vitest";
import {
  formatStatus,
  formatLog,
  formatDiff,
  formatBranch,
  formatShow,
} from "../src/lib/formatters.js";
import type { GitStatus, GitLog, GitDiff, GitBranch, GitShow } from "../src/schemas/index.js";

describe("formatStatus", () => {
  it("formats clean repo", () => {
    const status: GitStatus = {
      branch: "main",
      staged: [],
      modified: [],
      deleted: [],
      untracked: [],
      conflicts: [],
      clean: true,
    };
    expect(formatStatus(status)).toBe("On branch main — clean");
  });

  it("formats dirty repo with all sections", () => {
    const status: GitStatus = {
      branch: "feature",
      upstream: "origin/feature",
      ahead: 2,
      staged: [{ file: "src/index.ts", status: "modified" }],
      modified: ["README.md"],
      deleted: ["old.ts"],
      untracked: ["temp.log"],
      conflicts: [],
      clean: false,
    };
    const output = formatStatus(status);

    expect(output).toContain("On branch feature [ahead 2]");
    expect(output).toContain("Staged: m:src/index.ts");
    expect(output).toContain("Modified: README.md");
    expect(output).toContain("Deleted: old.ts");
    expect(output).toContain("Untracked: temp.log");
  });
});

describe("formatLog", () => {
  it("formats commit entries", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123",
          hashShort: "abc1234",
          author: "Jane",
          email: "j@e.com",
          date: "2h ago",
          message: "Fix bug",
        },
        {
          hash: "def456",
          hashShort: "def5678",
          author: "John",
          email: "j@e.com",
          date: "1d ago",
          message: "Add feature",
        },
      ],
      total: 2,
    };
    const output = formatLog(log);

    expect(output).toContain("abc1234 Fix bug (Jane, 2h ago)");
    expect(output).toContain("def5678 Add feature (John, 1d ago)");
  });
});

describe("formatDiff", () => {
  it("formats diff summary and file list", () => {
    const diff: GitDiff = {
      files: [
        { file: "src/a.ts", status: "modified", additions: 10, deletions: 3 },
        { file: "src/b.ts", status: "added", additions: 25, deletions: 0 },
      ],
      totalAdditions: 35,
      totalDeletions: 3,
      totalFiles: 2,
    };
    const output = formatDiff(diff);

    expect(output).toContain("2 files changed, +35 -3");
    expect(output).toContain("src/a.ts +10 -3");
    expect(output).toContain("src/b.ts +25 -0");
  });
});

describe("formatBranch", () => {
  it("marks current branch with asterisk", () => {
    const branches: GitBranch = {
      branches: [
        { name: "dev", current: false },
        { name: "main", current: true },
      ],
      current: "main",
    };
    const output = formatBranch(branches);

    expect(output).toContain("  dev");
    expect(output).toContain("* main");
  });
});

describe("formatShow", () => {
  it("formats commit details with diff", () => {
    const show: GitShow = {
      hash: "abc123def456",
      author: "Jane Doe",
      email: "jane@example.com",
      date: "2 hours ago",
      message: "Fix parser bug",
      diff: {
        files: [{ file: "src/parser.ts", status: "modified", additions: 5, deletions: 2 }],
        totalAdditions: 5,
        totalDeletions: 2,
        totalFiles: 1,
      },
    };
    const output = formatShow(show);

    expect(output).toContain("abc123de Fix parser bug");
    expect(output).toContain("Author: Jane Doe <jane@example.com>");
    expect(output).toContain("1 files changed, +5 -2");
  });
});
