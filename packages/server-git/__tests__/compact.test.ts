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
} from "../src/lib/formatters.js";
import type { GitLog, GitDiff, GitShow } from "../src/schemas/index.js";
import type {
  GitBranchFull,
  GitTagFull,
  GitStashListFull,
  GitRemoteFull,
  GitBlameFull,
} from "../src/schemas/index.js";

describe("compactLogMap", () => {
  it("keeps only hashShort, message, and refs", () => {
    const log: GitLog = {
      commits: [
        {
          hash: "abc123full",
          hashShort: "abc1234",
          author: "Jane",
          email: "j@e.com",
          date: "2h ago",
          message: "Fix bug",
          refs: "HEAD -> main",
        },
        {
          hash: "def456full",
          hashShort: "def5678",
          author: "John",
          email: "j@e.com",
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
    expect(compact.commits[0]).not.toHaveProperty("email");
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
  it("keeps only file, additions, deletions, and totalFiles", () => {
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
    expect(compact.files[0]).toEqual({ file: "src/a.ts", additions: 10, deletions: 3 });
    expect(compact.files[1]).toEqual({ file: "src/b.ts", additions: 25, deletions: 0 });
    // Verify dropped fields
    expect(compact).not.toHaveProperty("totalAdditions");
    expect(compact).not.toHaveProperty("totalDeletions");
    expect(compact.files[0]).not.toHaveProperty("status");
    expect(compact.files[0]).not.toHaveProperty("chunks");
  });
});

describe("formatDiffCompact", () => {
  it("formats compact diff", () => {
    const compact = {
      files: [
        { file: "src/a.ts", additions: 10, deletions: 3 },
        { file: "src/b.ts", additions: 25, deletions: 0 },
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
      author: "Jane Doe",
      email: "jane@example.com",
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
    expect(compact).not.toHaveProperty("hash");
    expect(compact).not.toHaveProperty("author");
    expect(compact).not.toHaveProperty("email");
    expect(compact).not.toHaveProperty("date");
    expect(compact).not.toHaveProperty("diff");
  });

  it("derives hashShort from hash when hashShort not present", () => {
    const show: GitShow = {
      hash: "abc123def456full",
      author: "Jane",
      email: "j@e.com",
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
    const compact = { hashShort: "abc1234", message: "Fix parser bug" };
    expect(formatShowCompact(compact)).toBe("abc1234 Fix parser bug");
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
  it("keeps only hash, lineNumber, and content", () => {
    const blame: GitBlameFull = {
      lines: [
        {
          hash: "abc12345",
          author: "John Doe",
          date: "2024-01-15T10:30:00.000Z",
          lineNumber: 1,
          content: "const x = 1;",
        },
        {
          hash: "def67890",
          author: "Jane Smith",
          date: "2024-01-16T11:00:00.000Z",
          lineNumber: 2,
          content: "const y = 2;",
        },
      ],
      file: "src/index.ts",
    };

    const compact = compactBlameMap(blame);

    expect(compact.file).toBe("src/index.ts");
    expect(compact.lines).toHaveLength(2);
    expect(compact.lines[0]).toEqual({ hash: "abc12345", lineNumber: 1, content: "const x = 1;" });
    expect(compact.lines[1]).toEqual({ hash: "def67890", lineNumber: 2, content: "const y = 2;" });
    // Verify dropped fields
    expect(compact.lines[0]).not.toHaveProperty("author");
    expect(compact.lines[0]).not.toHaveProperty("date");
  });
});

describe("formatBlameCompact", () => {
  it("formats compact blame", () => {
    const compact = {
      lines: [
        { hash: "abc12345", lineNumber: 1, content: "const x = 1;" },
        { hash: "def67890", lineNumber: 2, content: "const y = 2;" },
      ],
      file: "src/index.ts",
    };
    const output = formatBlameCompact(compact);

    expect(output).toBe("abc12345 1: const x = 1;\ndef67890 2: const y = 2;");
  });

  it("formats empty blame", () => {
    const compact = { lines: [], file: "empty.ts" };
    expect(formatBlameCompact(compact)).toBe("No blame data for empty.ts");
  });
});
