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
} from "../src/lib/formatters.js";
import type { GitLog, GitDiff, GitShow } from "../src/schemas/index.js";
import type { GitBranchFull } from "../src/schemas/index.js";

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
