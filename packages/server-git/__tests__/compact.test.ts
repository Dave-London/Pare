import { describe, it, expect } from "vitest";
import {
  compactLogMap,
  formatLogCompact,
  compactDiffMap,
  formatDiffCompact,
  compactBranchMap,
  formatBranchCompact,
  compactShowMap,
  formatShowCompact,
  compactTagMap,
  formatTagCompact,
  compactStashListMap,
  formatStashListCompact,
  compactRemoteMap,
  formatRemoteCompact,
  compactBlameMap,
  formatBlameCompact,
  compactLogGraphMap,
  formatLogGraphCompact,
  compactReflogMap,
  formatReflogCompact,
  compactWorktreeListMap,
  formatWorktreeListCompact,
} from "../src/lib/formatters.js";
import type { GitLog, GitDiff, GitShow } from "../src/schemas/index.js";
import type {
  GitBranchFull,
  GitTagFull,
  GitStashListFull,
  GitRemoteFull,
  GitBlameFull,
  GitLogGraphFull,
  GitReflogFull,
  GitWorktreeListFull,
} from "../src/schemas/index.js";

describe("compactLogMap", () => {
  it("keeps only hashShort, message, and refs", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123full",
          hashShort: "abc1234",
          author: "Jane <j@e.com>",
          date: "2h ago",
          message: "Fix bug",
          refs: "HEAD -> main",
        },
        {
          hash: "def456full",
          hashShort: "def5678",
          author: "John <j@e.com>",
          date: "1d ago",
          message: "Add feature",
        },
      ],
      total: 2,
    };

    const compact = compactLogMap(log);

    expect(compact.total).toBe(2);
    expect(compact.commits).toHaveLength(2);
    expect(compact.commits[0]).toEqual({
      hashShort: "abc1234",
      message: "Fix bug",
      refs: "HEAD -> main",
    });
    expect(compact.commits[1]).toEqual({ hashShort: "def5678", message: "Add feature" });
    // Verify dropped fields are not present
    expect(compact.commits[0]).not.toHaveProperty("hash");
    expect(compact.commits[0]).not.toHaveProperty("author");
    expect(compact.commits[0]).not.toHaveProperty("date");
  });
});

describe("formatLogCompact", () => {
  it("formats compact log entries", () => {
    const compact = {
      commits: [
        { hashShort: "abc1234", message: "Fix bug", refs: "HEAD -> main" },
        { hashShort: "def5678", message: "Add feature" },
      ],
      total: 2,
    };
    const output = formatLogCompact(compact);

    expect(output).toBe("abc1234 Fix bug (HEAD -> main)\ndef5678 Add feature");
  });
});

describe("compactDiffMap", () => {
  it("keeps only file, status, additions, deletions, and totalFiles", () => {
    const diff: GitDiff = {
      files: [
        {
          file: "src/a.ts",
          status: "modified",
          additions: 10,
          deletions: 3,
          chunks: [{ header: "@@-1,5 +1,7@@", lines: "+added\n-removed" }],
        },
        { file: "src/b.ts", status: "added", additions: 25, deletions: 0 },
      ],
      totalAdditions: 35,
      totalDeletions: 3,
      totalFiles: 2,
    };

    const compact = compactDiffMap(diff);

    expect(compact.totalFiles).toBe(2);
    expect(compact.files).toHaveLength(2);
    expect(compact.files[0]).toEqual({
      file: "src/a.ts",
      status: "modified",
      additions: 10,
      deletions: 3,
    });
    expect(compact.files[1]).toEqual({
      file: "src/b.ts",
      status: "added",
      additions: 25,
      deletions: 0,
    });
    // Verify dropped fields
    expect(compact).not.toHaveProperty("totalAdditions");
    expect(compact).not.toHaveProperty("totalDeletions");
    expect(compact.files[0]).not.toHaveProperty("chunks");
  });
});

describe("formatDiffCompact", () => {
  it("formats compact diff", () => {
    const compact = {
      files: [
        { file: "src/a.ts", status: "modified" as const, additions: 10, deletions: 3 },
        { file: "src/b.ts", status: "added" as const, additions: 25, deletions: 0 },
      ],
      totalFiles: 2,
    };
    const output = formatDiffCompact(compact);

    expect(output).toContain("2 files changed");
    expect(output).toContain("src/a.ts +10 -3");
    expect(output).toContain("src/b.ts +25 -0");
    // Should NOT contain aggregate totals
    expect(output).not.toMatch(/\+35/);
  });
});

describe("compactBranchMap", () => {
  it("reduces branches to string array", () => {
    const branches: GitBranchFull = {
      branches: [
        { name: "dev", current: false, upstream: "origin/dev" },
        { name: "main", current: true, upstream: "origin/main", lastCommit: "abc1234" },
        { name: "feature/auth", current: false },
      ],
      current: "main",
    };

    const compact = compactBranchMap(branches);

    expect(compact.current).toBe("main");
    expect(compact.branches).toEqual(["dev", "main", "feature/auth"]);
  });
});

describe("formatBranchCompact", () => {
  it("marks current branch with asterisk", () => {
    const compact = {
      branches: ["dev", "main", "feature/auth"],
      current: "main",
    };
    const output = formatBranchCompact(compact);

    expect(output).toContain("  dev");
    expect(output).toContain("* main");
    expect(output).toContain("  feature/auth");
  });
});

describe("compactShowMap", () => {
  it("keeps only hashShort and first line of message", () => {
    const show: GitShow = {
      hash: "abc123def456full",
      hashShort: "abc123d",
      author: "Jane Doe <jane@example.com>",
      date: "2 hours ago",
      message: "Fix parser bug\n\nDetailed description here",
      diff: {
        files: [{ file: "src/parser.ts", status: "modified", additions: 5, deletions: 2 }],
        totalAdditions: 5,
        totalDeletions: 2,
        totalFiles: 1,
      },
    };

    const compact = compactShowMap(show);

    expect(compact.hashShort).toBe("abc123d");
    expect(compact.message).toBe("Fix parser bug");
    expect(compact.author).toBe("Jane Doe <jane@example.com>");
    expect(compact.date).toBe("2 hours ago");
    expect(compact).not.toHaveProperty("hash");
    expect(compact).not.toHaveProperty("diff");
  });

  it("derives hashShort from hash when hashShort not present", () => {
    const show: GitShow = {
      hash: "abc123def456full",
      author: "Jane <j@e.com>",
      date: "1h ago",
      message: "Some commit",
      diff: { files: [], totalAdditions: 0, totalDeletions: 0, totalFiles: 0 },
    };

    const compact = compactShowMap(show);
    expect(compact.hashShort).toBe("abc123d");
  });
});

describe("formatShowCompact", () => {
  it("formats compact show as single line", () => {
    const compact = {
      hashShort: "abc1234",
      message: "Fix parser bug",
      author: "Jane <j@e.com>",
      date: "2h ago",
    };
    const output = formatShowCompact(compact);
    expect(output).toContain("abc1234 Fix parser bug");
    expect(output).toContain("Author: Jane <j@e.com>");
    expect(output).toContain("Date: 2h ago");
  });
});

describe("compactTagMap", () => {
  it("reduces tags to string array", () => {
    const tags: GitTagFull = {
      tags: [
        { name: "v1.2.0", date: "2024-01-15T10:30:00+00:00", message: "Release 1.2.0" },
        { name: "v1.1.0", date: "2024-01-01T09:00:00+00:00", message: "Release 1.1.0" },
      ],
      total: 2,
    };

    const compact = compactTagMap(tags);

    expect(compact.total).toBe(2);
    expect(compact.tags).toEqual(["v1.2.0", "v1.1.0"]);
    // Verify dropped fields
    expect(compact.tags[0]).not.toHaveProperty("date");
    expect(compact.tags[0]).not.toHaveProperty("message");
  });
});

describe("formatTagCompact", () => {
  it("formats compact tag list", () => {
    const compact = { tags: ["v1.2.0", "v1.1.0", "v1.0.0"], total: 3 };
    const output = formatTagCompact(compact);

    expect(output).toBe("v1.2.0\nv1.1.0\nv1.0.0");
  });

  it("formats empty tag list", () => {
    const compact = { tags: [], total: 0 };
    expect(formatTagCompact(compact)).toBe("No tags found");
  });
});

describe("compactStashListMap", () => {
  it("reduces stashes to string array", () => {
    const stashes: GitStashListFull = {
      stashes: [
        { index: 0, message: "WIP on main: abc1234 Fix bug", date: "2024-01-15 10:30:00 +0000" },
        { index: 1, message: "On main: save progress", date: "2024-01-14 09:00:00 +0000" },
      ],
      total: 2,
    };

    const compact = compactStashListMap(stashes);

    expect(compact.total).toBe(2);
    expect(compact.stashes).toEqual([
      "stash@{0}: WIP on main: abc1234 Fix bug",
      "stash@{1}: On main: save progress",
    ]);
  });
});

describe("formatStashListCompact", () => {
  it("formats compact stash list", () => {
    const compact = {
      stashes: ["stash@{0}: WIP on main", "stash@{1}: save progress"],
      total: 2,
    };
    const output = formatStashListCompact(compact);

    expect(output).toBe("stash@{0}: WIP on main\nstash@{1}: save progress");
  });

  it("formats empty stash list", () => {
    const compact = { stashes: [], total: 0 };
    expect(formatStashListCompact(compact)).toBe("No stashes found");
  });
});

describe("compactRemoteMap", () => {
  it("reduces remotes to string array", () => {
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
      total: 2,
    };

    const compact = compactRemoteMap(remotes);

    expect(compact.total).toBe(2);
    expect(compact.remotes).toEqual(["origin", "upstream"]);
  });
});

describe("formatRemoteCompact", () => {
  it("formats compact remote list", () => {
    const compact = { remotes: ["origin", "upstream"], total: 2 };
    const output = formatRemoteCompact(compact);

    expect(output).toBe("origin\nupstream");
  });

  it("formats empty remote list", () => {
    const compact = { remotes: [], total: 0 };
    expect(formatRemoteCompact(compact)).toBe("No remotes configured");
  });
});

describe("compactBlameMap", () => {
  it("drops author, date, and content — keeps only hash and line numbers", () => {
    const blame: GitBlameFull = {
      commits: [
        {
          hash: "abc12345",
          author: "John Doe",
          date: "2024-01-15T10:30:00.000Z",
          lines: [
            { lineNumber: 1, content: "const x = 1;" },
            { lineNumber: 3, content: "const z = 3;" },
          ],
        },
        {
          hash: "def67890",
          author: "Jane Smith",
          date: "2024-01-16T11:00:00.000Z",
          lines: [{ lineNumber: 2, content: "const y = 2;" }],
        },
      ],
      file: "src/index.ts",
      totalLines: 3,
    };

    const compact = compactBlameMap(blame);

    expect(compact.file).toBe("src/index.ts");
    expect(compact.totalLines).toBe(3);
    expect(compact.commits).toHaveLength(2);
    expect(compact.commits[0]).toEqual({ hash: "abc12345", lines: [1, 3] });
    expect(compact.commits[1]).toEqual({ hash: "def67890", lines: [2] });
  });
});

describe("formatBlameCompact", () => {
  it("formats compact blame with compressed line ranges", () => {
    const compact = {
      commits: [
        { hash: "abc12345", lines: [1, 2, 3, 7, 9, 10] },
        { hash: "def67890", lines: [4, 5, 6, 8] },
      ],
      file: "src/index.ts",
      totalLines: 10,
    };
    const output = formatBlameCompact(compact);

    expect(output).toBe("abc12345: lines 1-3, 7, 9-10\ndef67890: lines 4-6, 8");
  });

  it("formats single line per commit", () => {
    const compact = {
      commits: [{ hash: "abc12345", lines: [42] }],
      file: "src/index.ts",
      totalLines: 1,
    };
    const output = formatBlameCompact(compact);

    expect(output).toBe("abc12345: lines 42");
  });

  it("formats empty blame", () => {
    const compact = { commits: [], file: "empty.ts", totalLines: 0 };
    expect(formatBlameCompact(compact)).toBe("No blame data for empty.ts");
  });
});

describe("compactLogGraphMap", () => {
  it("filters out graph-only lines and uses short keys", () => {
    const data: GitLogGraphFull = {
      commits: [
        { graph: "*  ", hashShort: "abc1234", message: "Merge commit", refs: "HEAD -> main" },
        { graph: "|\\", hashShort: "", message: "" },
        { graph: "| *", hashShort: "def5678", message: "Feature commit", refs: "feature" },
        { graph: "|/", hashShort: "", message: "" },
        { graph: "*", hashShort: "aaa1111", message: "Base commit" },
      ],
      total: 3,
    };

    const compact = compactLogGraphMap(data);

    expect(compact.total).toBe(3);
    // Only actual commits, no continuation lines
    expect(compact.commits).toHaveLength(3);
    expect(compact.commits[0]).toEqual({
      g: "*  ",
      h: "abc1234",
      m: "Merge commit",
      r: "HEAD -> main",
    });
    expect(compact.commits[1]).toEqual({
      g: "| *",
      h: "def5678",
      m: "Feature commit",
      r: "feature",
    });
    expect(compact.commits[2]).toEqual({
      g: "*",
      h: "aaa1111",
      m: "Base commit",
    });
    // No refs key when absent
    expect(compact.commits[2]).not.toHaveProperty("r");
  });
});

describe("formatLogGraphCompact", () => {
  it("formats compact log-graph entries", () => {
    const compact = {
      commits: [
        { g: "*", h: "abc1234", m: "Fix bug", r: "HEAD -> main" },
        { g: "| *", h: "def5678", m: "Add feature" },
      ],
      total: 2,
    };
    const output = formatLogGraphCompact(compact);

    expect(output).toBe("* abc1234 Fix bug (HEAD -> main)\n| * def5678 Add feature");
  });

  it("formats empty log-graph", () => {
    const compact = { commits: [], total: 0 };
    expect(formatLogGraphCompact(compact)).toBe("No commits found");
  });
});

describe("compactReflogMap", () => {
  it("reduces entries to string array with shortHash, selector, and action", () => {
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
      total: 2,
    };

    const compact = compactReflogMap(reflog);

    expect(compact.total).toBe(2);
    expect(compact.entries).toEqual([
      "abc1234 HEAD@{0} checkout: moving from main to feature",
      "def5678 HEAD@{1} commit: fix the bug",
    ]);
  });
});

describe("formatReflogCompact", () => {
  it("formats compact reflog entries", () => {
    const compact = {
      entries: [
        "abc1234 HEAD@{0} checkout: moving from main to feature",
        "def5678 HEAD@{1} commit: fix the bug",
      ],
      total: 2,
    };
    const output = formatReflogCompact(compact);

    expect(output).toBe(
      "abc1234 HEAD@{0} checkout: moving from main to feature\ndef5678 HEAD@{1} commit: fix the bug",
    );
  });

  it("formats empty reflog", () => {
    const compact = { entries: [], total: 0 };
    expect(formatReflogCompact(compact)).toBe("No reflog entries found");
  });
});

describe("compactWorktreeListMap", () => {
  it("reduces worktrees to string array with path and branch", () => {
    const worktrees: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/home/user/repo",
          head: "abc123def456full",
          branch: "main",
          bare: false,
        },
        {
          path: "/home/user/repo-feature",
          head: "def456abc789full",
          branch: "feature/auth",
          bare: false,
        },
        {
          path: "/home/user/repo-bare",
          head: "000000000000",
          branch: "",
          bare: true,
        },
      ],
      total: 3,
    };

    const compact = compactWorktreeListMap(worktrees);

    expect(compact.total).toBe(3);
    expect(compact.worktrees).toEqual([
      "/home/user/repo (main)",
      "/home/user/repo-feature (feature/auth)",
      "/home/user/repo-bare",
    ]);
  });

  it("handles worktree with detached HEAD (no branch)", () => {
    const worktrees: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/home/user/repo",
          head: "abc123def456",
          branch: "(detached)",
          bare: false,
        },
      ],
      total: 1,
    };

    const compact = compactWorktreeListMap(worktrees);

    expect(compact.worktrees).toEqual(["/home/user/repo ((detached))"]);
  });
});

describe("formatWorktreeListCompact", () => {
  it("formats compact worktree list", () => {
    const compact = {
      worktrees: ["/home/user/repo (main)", "/home/user/repo-feature (feature/auth)"],
      total: 2,
    };
    const output = formatWorktreeListCompact(compact);

    expect(output).toBe("/home/user/repo (main)\n/home/user/repo-feature (feature/auth)");
  });

  it("formats empty worktree list", () => {
    const compact = { worktrees: [], total: 0 };
    expect(formatWorktreeListCompact(compact)).toBe("No worktrees found");
  });
});
