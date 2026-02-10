import { describe, it, expect } from "vitest";
import {
  formatStatus,
  formatLog,
  formatDiff,
  formatBranch,
  formatShow,
  formatAdd,
  formatCommit,
  formatPush,
  formatPull,
  formatCheckout,
} from "../src/lib/formatters.js";
import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranch,
  GitShow,
  GitAdd,
  GitCommit,
  GitPush,
  GitPull,
  GitCheckout,
} from "../src/schemas/index.js";

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

  it("formats commit with multiline message (single-line %s)", () => {
    const show: GitShow = {
      hash: "def456789012",
      author: "John Smith",
      email: "john@example.com",
      date: "3 days ago",
      message: "feat: add new feature with detailed description",
      diff: {
        files: [
          { file: "src/feature.ts", status: "added", additions: 100, deletions: 0 },
          { file: "src/tests.ts", status: "added", additions: 50, deletions: 0 },
        ],
        totalAdditions: 150,
        totalDeletions: 0,
        totalFiles: 2,
      },
    };
    const output = formatShow(show);

    expect(output).toContain("def45678 feat: add new feature with detailed description");
    expect(output).toContain("Author: John Smith <john@example.com>");
    expect(output).toContain("Date: 3 days ago");
    expect(output).toContain("2 files changed, +150 -0");
    expect(output).toContain("src/feature.ts +100 -0");
    expect(output).toContain("src/tests.ts +50 -0");
  });

  it("formats commit with empty diff", () => {
    const show: GitShow = {
      hash: "aaa111222333",
      author: "Author",
      email: "a@b.com",
      date: "1 hour ago",
      message: "chore: empty commit",
      diff: {
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        totalFiles: 0,
      },
    };
    const output = formatShow(show);

    expect(output).toContain("aaa11122 chore: empty commit");
    expect(output).toContain("0 files changed, +0 -0");
  });
});

// ── Expanded formatter tests ─────────────────────────────────────────

describe("formatLog (expanded)", () => {
  it("formats empty log", () => {
    const log: GitLog = { commits: [], total: 0 };
    const output = formatLog(log);

    expect(output).toBe("");
  });

  it("formats single commit", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123",
          hashShort: "abc1234",
          author: "Dev",
          email: "d@e.com",
          date: "5 min ago",
          message: "initial",
        },
      ],
      total: 1,
    };
    const output = formatLog(log);

    expect(output).toBe("abc1234 initial (Dev, 5 min ago)");
  });

  it("formats commits with refs", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "aaa111",
          hashShort: "aaa1111",
          author: "Alice",
          email: "a@b.com",
          date: "1h ago",
          message: "fix: bug",
          refs: "HEAD -> main",
        },
      ],
      total: 1,
    };
    const output = formatLog(log);

    // formatLog doesn't include refs in the output, but message should be present
    expect(output).toContain("aaa1111 fix: bug (Alice, 1h ago)");
  });

  it("formats many commits", () => {
    const commits = Array.from({ length: 10 }, (_, i) => ({
      hash: `hash${i}`,
      hashShort: `short${i}`,
      author: `Author${i}`,
      email: `a${i}@b.com`,
      date: `${i}d ago`,
      message: `Commit message ${i}`,
    }));
    const log: GitLog = { commits, total: 10 };
    const output = formatLog(log);
    const lines = output.split("\n").filter(Boolean);

    expect(lines).toHaveLength(10);
    expect(lines[0]).toContain("short0 Commit message 0 (Author0, 0d ago)");
    expect(lines[9]).toContain("short9 Commit message 9 (Author9, 9d ago)");
  });

  it("formats commit with special characters in message", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "xyz789",
          hashShort: "xyz7890",
          author: "Dev",
          email: "d@e.com",
          date: "now",
          message: 'fix: handle "quotes" & <brackets>',
        },
      ],
      total: 1,
    };
    const output = formatLog(log);

    expect(output).toContain('fix: handle "quotes" & <brackets>');
  });
});

describe("formatDiff (expanded)", () => {
  it("formats empty diff", () => {
    const diff: GitDiff = {
      files: [],
      totalAdditions: 0,
      totalDeletions: 0,
      totalFiles: 0,
    };
    const output = formatDiff(diff);

    expect(output).toContain("0 files changed, +0 -0");
  });

  it("formats diff with binary file (0/0)", () => {
    const diff: GitDiff = {
      files: [{ file: "image.png", status: "modified", additions: 0, deletions: 0 }],
      totalAdditions: 0,
      totalDeletions: 0,
      totalFiles: 1,
    };
    const output = formatDiff(diff);

    expect(output).toContain("1 files changed, +0 -0");
    expect(output).toContain("image.png +0 -0");
  });

  it("formats diff with many files", () => {
    const files = Array.from({ length: 20 }, (_, i) => ({
      file: `src/file${i}.ts`,
      status: "modified" as const,
      additions: i * 10,
      deletions: i * 5,
    }));
    const diff: GitDiff = {
      files,
      totalAdditions: files.reduce((s, f) => s + f.additions, 0),
      totalDeletions: files.reduce((s, f) => s + f.deletions, 0),
      totalFiles: 20,
    };
    const output = formatDiff(diff);
    const lines = output.split("\n").filter(Boolean);

    // 1 summary line + 20 file lines
    expect(lines).toHaveLength(21);
    expect(output).toContain("20 files changed");
  });

  it("formats diff with renamed file", () => {
    const diff: GitDiff = {
      files: [
        { file: "{old => new}/index.ts", status: "renamed", additions: 3, deletions: 1 },
      ],
      totalAdditions: 3,
      totalDeletions: 1,
      totalFiles: 1,
    };
    const output = formatDiff(diff);

    expect(output).toContain("{old => new}/index.ts +3 -1");
  });

  it("formats diff with only additions", () => {
    const diff: GitDiff = {
      files: [{ file: "src/new.ts", status: "added", additions: 50, deletions: 0 }],
      totalAdditions: 50,
      totalDeletions: 0,
      totalFiles: 1,
    };
    const output = formatDiff(diff);

    expect(output).toContain("1 files changed, +50 -0");
    expect(output).toContain("src/new.ts +50 -0");
  });

  it("formats diff with only deletions", () => {
    const diff: GitDiff = {
      files: [{ file: "src/old.ts", status: "deleted", additions: 0, deletions: 100 }],
      totalAdditions: 0,
      totalDeletions: 100,
      totalFiles: 1,
    };
    const output = formatDiff(diff);

    expect(output).toContain("1 files changed, +0 -100");
    expect(output).toContain("src/old.ts +0 -100");
  });
});

describe("formatBranch (expanded)", () => {
  it("formats many branches", () => {
    const branches: GitBranch = {
      branches: [
        { name: "dev", current: false },
        { name: "feature/auth", current: false },
        { name: "feature/ui", current: false },
        { name: "main", current: true },
        { name: "release/1.0", current: false },
        { name: "hotfix/urgent", current: false },
      ],
      current: "main",
    };
    const output = formatBranch(branches);
    const lines = output.split("\n").filter(Boolean);

    expect(lines).toHaveLength(6);
    expect(lines[3]).toBe("* main");
    expect(lines[0]).toBe("  dev");
    expect(lines[1]).toBe("  feature/auth");
    expect(lines[5]).toBe("  hotfix/urgent");
  });

  it("formats single branch repo", () => {
    const branches: GitBranch = {
      branches: [{ name: "main", current: true }],
      current: "main",
    };
    const output = formatBranch(branches);

    expect(output).toBe("* main");
  });

  it("formats branches with no current (detached HEAD scenario)", () => {
    const branches: GitBranch = {
      branches: [
        { name: "main", current: false },
        { name: "dev", current: false },
      ],
      current: "",
    };
    const output = formatBranch(branches);
    const lines = output.split("\n").filter(Boolean);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("  main");
    expect(lines[1]).toBe("  dev");
  });
});

describe("formatStatus (expanded)", () => {
  it("formats repo with conflicts", () => {
    const status: GitStatus = {
      branch: "main",
      staged: [],
      modified: [],
      deleted: [],
      untracked: [],
      conflicts: ["src/index.ts", "src/utils.ts"],
      clean: false,
    };
    const output = formatStatus(status);

    expect(output).toContain("On branch main");
    expect(output).toContain("Conflicts: src/index.ts, src/utils.ts");
  });

  it("formats repo behind upstream", () => {
    const status: GitStatus = {
      branch: "main",
      upstream: "origin/main",
      behind: 5,
      staged: [],
      modified: ["file.ts"],
      deleted: [],
      untracked: [],
      conflicts: [],
      clean: false,
    };
    const output = formatStatus(status);

    expect(output).toContain("[behind 5]");
  });

  it("formats repo ahead and behind", () => {
    const status: GitStatus = {
      branch: "feature",
      upstream: "origin/feature",
      ahead: 3,
      behind: 2,
      staged: [],
      modified: [],
      deleted: [],
      untracked: ["new.ts"],
      conflicts: [],
      clean: false,
    };
    const output = formatStatus(status);

    expect(output).toContain("[ahead 3, behind 2]");
  });
});
