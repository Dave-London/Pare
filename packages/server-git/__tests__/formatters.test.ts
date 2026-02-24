import { describe, it, expect } from "vitest";
import {
  formatStatus,
  formatLog,
  formatDiff,
  formatBranch,
  formatShow,
  formatTag,
  formatStashList,
  formatStash,
  formatRemote,
  formatBlame,
  formatReset,
  formatRestore,
  formatCherryPick,
  formatMerge,
  formatRebase,
  formatLogGraph,
  formatReflog,
  formatWorktreeList,
  formatWorktree,
  formatAdd,
  formatRemoteMutate,
  formatTagMutate,
  formatPull,
} from "../src/lib/formatters.js";
import type {
  GitStatus,
  GitLog,
  GitDiff,
  GitBranchFull,
  GitShow,
  GitAdd,
  GitTagFull,
  GitStashListFull,
  GitStash,
  GitRemoteFull,
  GitBlameFull,
  GitReset,
  GitRestore,
  GitCherryPick,
  GitMerge,
  GitRebase,
  GitLogGraphFull,
  GitReflogFull,
  GitWorktreeListFull,
  GitWorktree,
  GitPull,
  GitRemoteMutate,
  GitTagMutate,
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
          author: "Jane <j@e.com>",
          date: "2h ago",
          message: "Fix bug",
        },
        {
          hash: "def456",
          hashShort: "def5678",
          author: "John <j@e.com>",
          date: "1d ago",
          message: "Add feature",
        },
      ],
    };
    const output = formatLog(log);

    expect(output).toContain("abc1234 Fix bug (Jane <j@e.com>, 2h ago)");
    expect(output).toContain("def5678 Add feature (John <j@e.com>, 1d ago)");
  });
});

describe("formatDiff", () => {
  it("formats diff summary and file list", () => {
    const diff: GitDiff = {
      files: [
        { file: "src/a.ts", status: "modified", additions: 10, deletions: 3 },
        { file: "src/b.ts", status: "added", additions: 25, deletions: 0 },
      ],
    };
    const output = formatDiff(diff);

    expect(output).toContain("2 files changed, +35 -3");
    expect(output).toContain("src/a.ts +10 -3");
    expect(output).toContain("src/b.ts +25 -0");
  });
});

describe("formatBranch", () => {
  it("marks current branch with asterisk", () => {
    const branches: GitBranchFull = {
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

  it("shows upstream tracking info", () => {
    const branches: GitBranchFull = {
      branches: [
        { name: "main", current: true, upstream: "origin/main" },
        { name: "dev", current: false },
      ],
      current: "main",
    };
    const output = formatBranch(branches);

    expect(output).toContain("* main -> origin/main");
    expect(output).toContain("  dev");
    expect(output).not.toContain("dev ->");
  });
});

describe("formatShow", () => {
  it("formats commit details with diff", () => {
    const show: GitShow = {
      hash: "abc123def456",
      author: "Jane Doe <jane@example.com>",
      date: "2 hours ago",
      message: "Fix parser bug",
      diff: {
        files: [{ file: "src/parser.ts", status: "modified", additions: 5, deletions: 2 }],
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
      author: "John Smith <john@example.com>",
      date: "3 days ago",
      message: "feat: add new feature with detailed description",
      diff: {
        files: [
          { file: "src/feature.ts", status: "added", additions: 100, deletions: 0 },
          { file: "src/tests.ts", status: "added", additions: 50, deletions: 0 },
        ],
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
      author: "Author <a@b.com>",
      date: "1 hour ago",
      message: "chore: empty commit",
      diff: {
        files: [],
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
    const log: GitLog = { commits: [] };
    const output = formatLog(log);

    expect(output).toBe("");
  });

  it("formats single commit", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123",
          hashShort: "abc1234",
          author: "Dev <d@e.com>",
          date: "5 min ago",
          message: "initial",
        },
      ],
    };
    const output = formatLog(log);

    expect(output).toBe("abc1234 initial (Dev <d@e.com>, 5 min ago)");
  });

  it("formats commits with refs", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "aaa111",
          hashShort: "aaa1111",
          author: "Alice <a@b.com>",
          date: "1h ago",
          message: "fix: bug",
          refs: "HEAD -> main",
        },
      ],
    };
    const output = formatLog(log);

    // formatLog doesn't include refs in the output, but message should be present
    expect(output).toContain("aaa1111 fix: bug (Alice <a@b.com>, 1h ago)");
  });

  it("formats many commits", () => {
    const commits = Array.from({ length: 10 }, (_, i) => ({
      hash: `hash${i}`,
      hashShort: `short${i}`,
      author: `Author${i} <a${i}@b.com>`,
      date: `${i}d ago`,
      message: `Commit message ${i}`,
    }));
    const log: GitLog = { commits };
    const output = formatLog(log);
    const lines = output.split("\n").filter(Boolean);

    expect(lines).toHaveLength(10);
    expect(lines[0]).toContain("short0 Commit message 0 (Author0 <a0@b.com>, 0d ago)");
    expect(lines[9]).toContain("short9 Commit message 9 (Author9 <a9@b.com>, 9d ago)");
  });

  it("formats commit with special characters in message", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "xyz789",
          hashShort: "xyz7890",
          author: "Dev <d@e.com>",
          date: "now",
          message: 'fix: handle "quotes" & <brackets>',
        },
      ],
    };
    const output = formatLog(log);

    expect(output).toContain('fix: handle "quotes" & <brackets>');
  });

  it("includes full author <email> in formatted output", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123",
          hashShort: "abc1234",
          author: "Jane Doe <jane@example.com>",
          date: "2h ago",
          message: "feat: add feature",
        },
      ],
    };
    const output = formatLog(log);

    expect(output).toContain("(Jane Doe <jane@example.com>, 2h ago)");
  });

  it("handles author without email in formatted output", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "def456",
          hashShort: "def4567",
          author: "bot",
          date: "now",
          message: "auto-deploy",
        },
      ],
    };
    const output = formatLog(log);

    expect(output).toContain("(bot, now)");
  });
});

describe("formatDiff (expanded)", () => {
  it("formats empty diff", () => {
    const diff: GitDiff = {
      files: [],
    };
    const output = formatDiff(diff);

    expect(output).toContain("0 files changed, +0 -0");
  });

  it("formats diff with binary file (0/0)", () => {
    const diff: GitDiff = {
      files: [{ file: "image.png", status: "modified", additions: 0, deletions: 0 }],
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
    };
    const output = formatDiff(diff);
    const lines = output.split("\n").filter(Boolean);

    // 1 summary line + 20 file lines
    expect(lines).toHaveLength(21);
    expect(output).toContain("20 files changed");
  });

  it("formats diff with renamed file", () => {
    const diff: GitDiff = {
      files: [{ file: "{old => new}/index.ts", status: "renamed", additions: 3, deletions: 1 }],
    };
    const output = formatDiff(diff);

    expect(output).toContain("{old => new}/index.ts +3 -1");
  });

  it("formats diff with only additions", () => {
    const diff: GitDiff = {
      files: [{ file: "src/new.ts", status: "added", additions: 50, deletions: 0 }],
    };
    const output = formatDiff(diff);

    expect(output).toContain("1 files changed, +50 -0");
    expect(output).toContain("src/new.ts +50 -0");
  });

  it("formats diff with only deletions", () => {
    const diff: GitDiff = {
      files: [{ file: "src/old.ts", status: "deleted", additions: 0, deletions: 100 }],
    };
    const output = formatDiff(diff);

    expect(output).toContain("1 files changed, +0 -100");
    expect(output).toContain("src/old.ts +0 -100");
  });
});

describe("formatBranch (expanded)", () => {
  it("formats many branches", () => {
    const branches: GitBranchFull = {
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
    const branches: GitBranchFull = {
      branches: [{ name: "main", current: true }],
      current: "main",
    };
    const output = formatBranch(branches);

    expect(output).toBe("* main");
  });

  it("formats branches with no current (detached HEAD scenario)", () => {
    const branches: GitBranchFull = {
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

describe("formatTag", () => {
  it("formats tag list with dates and messages", () => {
    const tags: GitTagFull = {
      tags: [
        { name: "v1.2.0", date: "2024-01-15T10:30:00+00:00", message: "Release 1.2.0" },
        { name: "v1.1.0", date: "2024-01-01T09:00:00+00:00", message: "Release 1.1.0" },
      ],
    };
    const output = formatTag(tags);

    expect(output).toContain("v1.2.0");
    expect(output).toContain("2024-01-15T10:30:00+00:00");
    expect(output).toContain("Release 1.2.0");
    expect(output).toContain("v1.1.0");
  });

  it("formats empty tag list", () => {
    const tags: GitTagFull = { tags: [] };
    expect(formatTag(tags)).toBe("No tags found");
  });

  it("formats tags without messages", () => {
    const tags: GitTagFull = {
      tags: [{ name: "v1.0.0", date: "2024-01-01T00:00:00+00:00" }],
    };
    const output = formatTag(tags);

    expect(output).toContain("v1.0.0");
    expect(output).toContain("2024-01-01T00:00:00+00:00");
  });
});

describe("formatStashList", () => {
  it("formats stash entries", () => {
    const stashes: GitStashListFull = {
      stashes: [
        { index: 0, message: "WIP on main: abc1234 Fix bug", date: "2024-01-15 10:30:00 +0000" },
        { index: 1, message: "On main: save progress", date: "2024-01-14 09:00:00 +0000" },
      ],
    };
    const output = formatStashList(stashes);

    expect(output).toContain("stash@{0}: WIP on main: abc1234 Fix bug");
    expect(output).toContain("stash@{1}: On main: save progress");
    expect(output).toContain("2024-01-15 10:30:00 +0000");
  });

  it("formats empty stash list", () => {
    const stashes: GitStashListFull = { stashes: [] };
    expect(formatStashList(stashes)).toBe("No stashes found");
  });
});

describe("formatStash", () => {
  it("formats stash push result", () => {
    const stash: GitStash = {
      success: true,
      message: "Saved working directory and index state WIP on main: abc1234 Fix bug",
    };
    const output = formatStash(stash);

    expect(output).toContain("Saved working directory");
  });

  it("formats stash drop result", () => {
    const stash: GitStash = {
      success: true,
      message: "Dropped stash@{0} (abc1234...)",
    };
    const output = formatStash(stash);

    expect(output).toContain("Dropped stash@{0}");
  });

  it("formats nothing-to-stash failure", () => {
    const stash: GitStash = {
      success: false,
      message: "No local changes to save",
      reason: "no-local-changes",
    };
    const output = formatStash(stash);

    expect(output).toContain("Stash operation failed");
    expect(output).toContain("[no-local-changes]");
  });

  it("formats stash conflict failure", () => {
    const stash: GitStash = {
      success: false,
      message: "CONFLICT (content): Merge conflict in src/index.ts",
      reason: "conflict",
      conflictFiles: ["src/index.ts"],
    };
    const output = formatStash(stash);

    expect(output).toContain("Stash operation failed");
    expect(output).toContain("[conflict]");
    expect(output).toContain("Conflicting files: src/index.ts");
  });
});

describe("formatRemote", () => {
  it("formats remote list", () => {
    const remotes: GitRemoteFull = {
      remotes: [
        {
          name: "origin",
          fetchUrl: "https://github.com/user/repo.git",
          pushUrl: "https://github.com/user/repo.git",
        },
      ],
    };
    const output = formatRemote(remotes);

    expect(output).toContain("origin");
    expect(output).toContain("https://github.com/user/repo.git");
    expect(output).toContain("(fetch)");
    expect(output).toContain("(push)");
  });

  it("formats empty remote list", () => {
    const remotes: GitRemoteFull = { remotes: [] };
    expect(formatRemote(remotes)).toBe("No remotes configured");
  });

  it("formats multiple remotes", () => {
    const remotes: GitRemoteFull = {
      remotes: [
        {
          name: "origin",
          fetchUrl: "https://github.com/user/repo.git",
          pushUrl: "https://github.com/user/repo.git",
        },
        {
          name: "upstream",
          fetchUrl: "https://github.com/upstream/repo.git",
          pushUrl: "https://github.com/upstream/repo.git",
        },
      ],
    };
    const output = formatRemote(remotes);

    expect(output).toContain("origin");
    expect(output).toContain("upstream");
  });
});

describe("formatBlame", () => {
  it("formats grouped blame output as per-line human-readable text", () => {
    const blame: GitBlameFull = {
      commits: [
        {
          hash: "abc12345",
          author: "John Doe",
          date: "2024-01-15T10:30:00.000Z",
          lines: [{ lineNumber: 1, content: "const x = 1;" }],
        },
        {
          hash: "def67890",
          author: "Jane Smith",
          date: "2024-01-16T11:00:00.000Z",
          lines: [{ lineNumber: 2, content: "const y = 2;" }],
        },
      ],
      file: "src/index.ts",
    };
    const output = formatBlame(blame);

    expect(output).toContain("abc12345 (John Doe 2024-01-15T10:30:00.000Z) 1: const x = 1;");
    expect(output).toContain("def67890 (Jane Smith 2024-01-16T11:00:00.000Z) 2: const y = 2;");
  });

  it("sorts interleaved commit lines by line number", () => {
    const blame: GitBlameFull = {
      commits: [
        {
          hash: "abc12345",
          author: "Alice",
          date: "2024-01-15T00:00:00.000Z",
          lines: [
            { lineNumber: 1, content: "first" },
            { lineNumber: 3, content: "third" },
          ],
        },
        {
          hash: "def67890",
          author: "Bob",
          date: "2024-01-16T00:00:00.000Z",
          lines: [{ lineNumber: 2, content: "second" }],
        },
      ],
      file: "test.ts",
    };
    const output = formatBlame(blame);
    const lines = output.split("\n");

    expect(lines[0]).toContain("1: first");
    expect(lines[1]).toContain("2: second");
    expect(lines[2]).toContain("3: third");
  });

  it("formats empty blame output", () => {
    const blame: GitBlameFull = { commits: [], file: "empty.ts" };
    expect(formatBlame(blame)).toBe("No blame data for empty.ts");
  });
});

describe("formatReset", () => {
  it("formats reset with unstaged files", () => {
    const data: GitReset = { ref: "HEAD", filesAffected: ["src/a.ts", "src/b.ts"] };
    expect(formatReset(data)).toBe("Reset to HEAD: 2 file(s) affected: src/a.ts, src/b.ts");
  });

  it("formats reset with no unstaged files", () => {
    const data: GitReset = { ref: "HEAD", filesAffected: [] };
    expect(formatReset(data)).toBe("Reset to HEAD — no files affected");
  });

  it("formats reset with single file", () => {
    const data: GitReset = { ref: "HEAD", filesAffected: ["README.md"] };
    expect(formatReset(data)).toBe("Reset to HEAD: 1 file(s) affected: README.md");
  });
});

describe("formatLogGraph", () => {
  it("formats graph with commits and refs", () => {
    const data: GitLogGraphFull = {
      commits: [
        { graph: "*", hashShort: "abc1234", message: "Latest commit", refs: "HEAD -> main" },
        { graph: "*", hashShort: "def5678", message: "Previous commit" },
      ],
    };
    const output = formatLogGraph(data);

    expect(output).toContain("* abc1234 Latest commit (HEAD -> main)");
    expect(output).toContain("* def5678 Previous commit");
    expect(output).not.toContain("(undefined)");
  });

  it("formats graph with continuation lines", () => {
    const data: GitLogGraphFull = {
      commits: [
        { graph: "*  ", hashShort: "abc1234", message: "Merge commit", refs: "HEAD -> main" },
        { graph: "|\\", hashShort: "", message: "" },
        { graph: "| *", hashShort: "def5678", message: "Feature commit", refs: "feature" },
      ],
    };
    const output = formatLogGraph(data);
    const lines = output.split("\n");

    expect(lines[0]).toContain("abc1234 Merge commit (HEAD -> main)");
    expect(lines[1]).toBe("|\\");
    expect(lines[2]).toContain("def5678 Feature commit (feature)");
  });

  it("formats empty graph", () => {
    const data: GitLogGraphFull = { commits: [] };
    expect(formatLogGraph(data)).toBe("No commits found");
  });
});

describe("formatReflog", () => {
  it("formats reflog entries", () => {
    const reflog: GitReflogFull = {
      entries: [
        {
          hash: "abc123full",
          shortHash: "abc1234",
          selector: "HEAD@{0}",
          action: "checkout",
          rawAction: "checkout",
          description: "moving from main to feature",
          date: "2024-01-15 10:30:00 +0000",
        },
        {
          hash: "def456full",
          shortHash: "def5678",
          selector: "HEAD@{1}",
          action: "commit",
          rawAction: "commit",
          description: "fix the bug",
          date: "2024-01-14 09:00:00 +0000",
        },
      ],
    };
    const output = formatReflog(reflog);

    expect(output).toContain("abc1234 HEAD@{0} checkout: moving from main to feature");
    expect(output).toContain("def5678 HEAD@{1} commit: fix the bug");
    expect(output).toContain("2024-01-15 10:30:00 +0000");
  });

  it("formats empty reflog", () => {
    const reflog: GitReflogFull = { entries: [] };
    expect(formatReflog(reflog)).toBe("No reflog entries found");
  });

  it("formats reflog entry without description", () => {
    const reflog: GitReflogFull = {
      entries: [
        {
          hash: "aaa111full",
          shortHash: "aaa1111",
          selector: "HEAD@{0}",
          action: "reset",
          rawAction: "reset",
          description: "",
          date: "2024-01-01 00:00:00 +0000",
        },
      ],
    };
    const output = formatReflog(reflog);

    expect(output).toContain("aaa1111 HEAD@{0} reset");
    expect(output).not.toContain(": (");
  });
});

describe("formatWorktreeList", () => {
  it("formats worktree list with multiple entries", () => {
    const data: GitWorktreeListFull = {
      worktrees: [
        { path: "/home/user/repo", head: "abc1234567890abcdef", branch: "main", bare: false },
        {
          path: "/home/user/repo-feature",
          head: "def5678901234567890",
          branch: "feature",
          bare: false,
        },
      ],
    };
    const output = formatWorktreeList(data);

    expect(output).toContain("/home/user/repo");
    expect(output).toContain("abc12345");
    expect(output).toContain("(main)");
    expect(output).toContain("/home/user/repo-feature");
    expect(output).toContain("(feature)");
  });

  it("formats bare worktree", () => {
    const data: GitWorktreeListFull = {
      worktrees: [
        { path: "/home/user/repo.git", head: "abc1234567890abcdef", branch: "", bare: true },
      ],
    };
    const output = formatWorktreeList(data);

    expect(output).toContain("[bare]");
  });

  it("formats empty worktree list", () => {
    const data: GitWorktreeListFull = { worktrees: [] };
    expect(formatWorktreeList(data)).toBe("No worktrees found");
  });
});

describe("formatWorktree", () => {
  it("formats worktree add result with branch", () => {
    const data: GitWorktree = { success: true, path: "/tmp/wt", branch: "feature" };
    const output = formatWorktree(data);

    expect(output).toBe("Worktree at '/tmp/wt' on branch 'feature'");
  });

  it("formats worktree remove result without branch", () => {
    const data: GitWorktree = { success: true, path: "/tmp/wt", branch: "" };
    const output = formatWorktree(data);

    expect(output).toBe("Worktree at '/tmp/wt'");
  });
});

describe("formatAdd — per-file status", () => {
  it("formats staged files with status prefix", () => {
    const data: GitAdd = {
      files: [
        { file: "src/new.ts", status: "added" },
        { file: "src/index.ts", status: "modified" },
        { file: "old-file.ts", status: "deleted" },
      ],
    };
    const output = formatAdd(data);

    expect(output).toBe("Staged 3 file(s): a:src/new.ts, m:src/index.ts, d:old-file.ts");
  });

  it("formats no files staged", () => {
    const data: GitAdd = { files: [] };
    expect(formatAdd(data)).toBe("No files staged");
  });
});

describe("formatCherryPick — state in output", () => {
  it("formats conflict state", () => {
    const data: GitCherryPick = {
      success: false,
      state: "conflict",
      applied: [],
      conflicts: ["src/index.ts"],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("[conflict]");
    expect(output).toContain("CONFLICT: src/index.ts");
  });

  it("formats completed state", () => {
    const data: GitCherryPick = {
      success: true,
      state: "completed",
      applied: ["abc1234"],
      conflicts: [],
    };
    const output = formatCherryPick(data);

    expect(output).toContain("[completed]");
    expect(output).toContain("abc1234");
  });
});

describe("formatMerge — state in output", () => {
  it("formats conflict state", () => {
    const data: GitMerge = {
      merged: false,
      state: "conflict",
      fastForward: false,
      branch: "feature",
      conflicts: ["src/index.ts"],
    };
    const output = formatMerge(data);

    expect(output).toContain("[conflict]");
    expect(output).toContain("1 conflict(s)");
  });

  it("formats fast-forward state", () => {
    const data: GitMerge = {
      merged: true,
      state: "fast-forward",
      fastForward: true,
      branch: "feature",
      conflicts: [],
    };
    const output = formatMerge(data);

    expect(output).toContain("Fast-forward merge");
  });

  it("formats already-up-to-date state", () => {
    const data: GitMerge = {
      merged: true,
      state: "already-up-to-date",
      fastForward: false,
      branch: "feature",
      conflicts: [],
    };
    const output = formatMerge(data);

    expect(output).toContain("Already up to date");
  });
});

describe("formatRebase — state in output", () => {
  it("formats conflict state", () => {
    const data: GitRebase = {
      success: false,
      state: "conflict",
      branch: "main",
      current: "feature",
      conflicts: ["src/index.ts"],
    };
    const output = formatRebase(data);

    expect(output).toContain("[conflict]");
    expect(output).toContain("paused with conflicts");
  });

  it("formats completed state", () => {
    const data: GitRebase = {
      success: true,
      state: "completed",
      branch: "main",
      current: "feature",
      conflicts: [],
      rebasedCommits: 3,
    };
    const output = formatRebase(data);

    expect(output).toContain("[completed]");
    expect(output).toContain("3 commit(s) rebased");
  });
});

describe("formatReset — previousRef/newRef in output", () => {
  it("includes ref range when previousRef and newRef provided", () => {
    const data: GitReset = {
      ref: "HEAD~1",
      mode: "mixed",
      previousRef: "abc1234567890",
      newRef: "def5678901234",
      filesAffected: ["src/index.ts"],
    };
    const output = formatReset(data);

    expect(output).toContain("[abc1234..def5678]");
    expect(output).toContain("Reset to HEAD~1 (mixed)");
  });

  it("omits ref range when not provided", () => {
    const data: GitReset = { ref: "HEAD", filesAffected: [] };
    const output = formatReset(data);

    expect(output).not.toContain("[");
    expect(output).toBe("Reset to HEAD — no files affected");
  });
});

describe("formatRestore — verification in output", () => {
  it("shows verified when all files restored", () => {
    const data: GitRestore = {
      restored: ["src/index.ts"],
      source: "HEAD",
      staged: false,
      verified: true,
      verifiedFiles: [{ file: "src/index.ts", restored: true }],
    };
    const output = formatRestore(data);

    expect(output).toContain("[verified]");
  });

  it("shows verification failed when not all restored", () => {
    const data: GitRestore = {
      restored: ["src/index.ts"],
      source: "HEAD",
      staged: false,
      verified: false,
      verifiedFiles: [{ file: "src/index.ts", restored: false }],
    };
    const output = formatRestore(data);

    expect(output).toContain("[verification failed]");
  });

  it("omits verification when not provided", () => {
    const data: GitRestore = {
      restored: ["src/index.ts"],
      source: "HEAD",
      staged: false,
    };
    const output = formatRestore(data);

    expect(output).not.toContain("verified");
  });
});

describe("formatWorktreeList — locked/prunable in output", () => {
  it("shows locked annotation", () => {
    const data: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/home/user/repo",
          head: "abc1234567890abcdef",
          branch: "main",
          bare: false,
          locked: true,
        },
      ],
    };
    const output = formatWorktreeList(data);

    expect(output).toContain("[locked]");
  });

  it("shows locked with reason", () => {
    const data: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/home/user/repo",
          head: "abc1234567890abcdef",
          branch: "main",
          bare: false,
          locked: true,
          lockReason: "maintenance",
        },
      ],
    };
    const output = formatWorktreeList(data);

    expect(output).toContain("[locked: maintenance]");
  });

  it("shows prunable annotation", () => {
    const data: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/home/user/repo",
          head: "abc1234567890abcdef",
          branch: "main",
          bare: false,
          prunable: true,
        },
      ],
    };
    const output = formatWorktreeList(data);

    expect(output).toContain("[prunable]");
  });
});

// ── Remote mutate formatter tests ────────────────────────────────────

describe("formatRemoteMutate", () => {
  it("formats remote add with URL", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "add",
      name: "upstream",
      url: "https://github.com/user/repo.git",
      message: "Remote 'upstream' added",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("Remote 'upstream' added");
    expect(output).toContain("https://github.com/user/repo.git");
  });

  it("formats remote remove", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "remove",
      name: "upstream",
      message: "Remote 'upstream' removed",
    };
    const output = formatRemoteMutate(data);
    expect(output).toBe("Remote 'upstream' removed");
  });
});

describe("formatTagMutate", () => {
  it("formats lightweight tag creation", () => {
    const data: GitTagMutate = {
      success: true,
      action: "create",
      name: "v1.0.0",
      message: "Lightweight tag 'v1.0.0' created",
      annotated: false,
    };
    const output = formatTagMutate(data);
    expect(output).toContain("Lightweight tag 'v1.0.0' created");
  });

  it("formats annotated tag creation", () => {
    const data: GitTagMutate = {
      success: true,
      action: "create",
      name: "v2.0.0",
      message: "Annotated tag 'v2.0.0' created",
      annotated: true,
    };
    const output = formatTagMutate(data);
    expect(output).toContain("Annotated tag 'v2.0.0' created");
  });

  it("formats tag creation at specific commit", () => {
    const data: GitTagMutate = {
      success: true,
      action: "create",
      name: "v1.0.0",
      message: "Tag created at abc1234",
      commit: "abc1234",
      annotated: false,
    };
    const output = formatTagMutate(data);
    expect(output).toContain("at abc1234");
  });

  it("formats tag deletion", () => {
    const data: GitTagMutate = {
      success: true,
      action: "delete",
      name: "v1.0.0",
      message: "Tag 'v1.0.0' deleted",
    };
    const output = formatTagMutate(data);
    expect(output).toBe("Tag 'v1.0.0' deleted");
  });
});

// ── P1 gap formatter tests ──────────────────────────────────────────

describe("formatPull — changed files and conflicts (Gaps #131, #132)", () => {
  it("includes changed files in output", () => {
    const data: GitPull = {
      success: true,
      summary: "Fast-forward",
      filesChanged: 2,
      insertions: 7,
      deletions: 3,
      conflicts: [],
      changedFiles: [
        { file: "src/index.ts", insertions: 5, deletions: 2 },
        { file: "src/utils.ts", insertions: 2, deletions: 1 },
      ],
    };
    const output = formatPull(data);
    expect(output).toContain("Changed: src/index.ts, src/utils.ts");
  });
});

describe("formatStash — show action (Gap #139)", () => {
  it("formats stash show with diff stats", () => {
    const data: GitStash = {
      success: true,
      message: "Stash show completed",
      diffStat: {
        filesChanged: 2,
        insertions: 7,
        deletions: 3,
        files: [
          { file: "src/index.ts", insertions: 5, deletions: 2 },
          { file: "src/utils.ts", insertions: 2, deletions: 1 },
        ],
      },
    };
    const output = formatStash(data);
    expect(output).toContain("2 file(s) changed, +7 -3");
    expect(output).toContain("src/index.ts");
  });
});

describe("formatRemoteMutate — new actions (Gaps #133-#136)", () => {
  it("formats rename action", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "rename",
      name: "new-origin",
      oldName: "origin",
      newName: "new-origin",
      message: "Remote 'origin' renamed to 'new-origin'",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("renamed to 'new-origin'");
  });

  it("formats set-url action", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "set-url",
      name: "origin",
      url: "https://github.com/user/repo.git",
      message: "URL set",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("URL set to https://github.com/user/repo.git");
  });

  it("formats prune action with branches", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "prune",
      name: "origin",
      prunedBranches: ["origin/old-branch"],
      message: "Pruned",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("Pruned remote 'origin'");
    expect(output).toContain("origin/old-branch");
  });

  it("formats prune action with no branches", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "prune",
      name: "origin",
      prunedBranches: [],
      message: "Nothing to prune",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("nothing to prune");
  });

  it("formats show action", () => {
    const data: GitRemoteMutate = {
      success: true,
      action: "show",
      name: "origin",
      showDetails: {
        fetchUrl: "git@github.com:user/repo.git",
        pushUrl: "git@github.com:user/repo.git",
        headBranch: "main",
        remoteBranches: ["main", "develop"],
      },
      message: "Details",
    };
    const output = formatRemoteMutate(data);
    expect(output).toContain("Remote 'origin':");
    expect(output).toContain("Fetch URL: git@github.com:user/repo.git");
    expect(output).toContain("HEAD branch: main");
    expect(output).toContain("Remote branches: main, develop");
  });
});

describe("formatStashList — summary fields (Gap #140)", () => {
  it("includes file count and summary in output", () => {
    const data: GitStashListFull = {
      stashes: [
        {
          index: 0,
          message: "WIP on main: abc1234 Fix bug",
          date: "2024-01-15",
          branch: "main",
          files: 3,
          summary: "3 files changed, 10 insertions(+), 5 deletions(-)",
        },
      ],
    };
    const output = formatStashList(data);
    expect(output).toContain("(3 file(s))");
    expect(output).toContain("3 files changed");
  });
});
