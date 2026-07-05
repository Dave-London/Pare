import { describe, it, expect } from "vitest";
import {
  parseRevListCount,
  worktreePathsEqual,
  normalizeWorktreePath,
  decidePruneMerged,
} from "../src/lib/parsers.js";
import { formatBranch, formatWorktreeList, formatWorktreePrune } from "../src/lib/formatters.js";
import type { GitBranchFull, GitWorktreeListFull } from "../src/schemas/index.js";

// ── Part 1: ancestry / merged predicate helpers ──────────────────────────

describe("parseRevListCount", () => {
  it("parses a plain integer count", () => {
    expect(parseRevListCount("0\n")).toBe(0);
    expect(parseRevListCount("3\n")).toBe(3);
    expect(parseRevListCount("42")).toBe(42);
  });

  it("returns 0 for empty or non-numeric output", () => {
    expect(parseRevListCount("")).toBe(0);
    expect(parseRevListCount("\n")).toBe(0);
    expect(parseRevListCount("fatal: bad revision")).toBe(0);
  });
});

describe("formatBranch with merged predicate", () => {
  it("marks a merged branch with [merged]", () => {
    const b: GitBranchFull = {
      current: "main",
      branches: [{ name: "feature", current: false, merged: true, unmerged: 0 }],
    };
    expect(formatBranch(b)).toBe("  feature [merged]");
  });

  it("marks an unmerged branch with [unmerged N]", () => {
    const b: GitBranchFull = {
      current: "main",
      branches: [{ name: "feature", current: false, merged: false, unmerged: 3 }],
    };
    expect(formatBranch(b)).toBe("  feature [unmerged 3]");
  });

  it("leaves default output byte-for-byte unchanged when merged is undefined", () => {
    const b: GitBranchFull = {
      current: "main",
      branches: [
        { name: "main", current: true, upstream: "origin/main" },
        { name: "feature", current: false },
      ],
    };
    expect(formatBranch(b)).toBe("* main -> origin/main\n  feature");
  });
});

// ── Part 2: per-worktree status rendering ─────────────────────────────────

describe("formatWorktreeList with status enrichment", () => {
  it("appends a status suffix when enrichment fields are present", () => {
    const w: GitWorktreeListFull = {
      worktrees: [
        {
          path: "/repo/wt",
          head: "abcdef1234567890",
          branch: "feature",
          bare: false,
          dirty: true,
          ahead: 2,
          behind: 1,
          unpushed: 2,
          merged: false,
        },
      ],
    };
    expect(formatWorktreeList(w)).toBe(
      "/repo/wt  abcdef12 (feature) [dirty, ahead 2, behind 1, unpushed 2, unmerged]",
    );
  });

  it("keeps default output byte-for-byte unchanged with no status fields", () => {
    const w: GitWorktreeListFull = {
      worktrees: [{ path: "/repo", head: "abcdef1234567890", branch: "main", bare: false }],
    };
    expect(formatWorktreeList(w)).toBe("/repo  abcdef12 (main)");
  });
});

// ── Part 3: prune-merged decision + rendering ─────────────────────────────

describe("normalizeWorktreePath / worktreePathsEqual", () => {
  it("normalizes separators, trailing slash, and case", () => {
    expect(normalizeWorktreePath("C:\\Repo\\WT\\")).toBe("c:/repo/wt");
  });

  it("treats equivalent paths as equal across separators and casing", () => {
    expect(worktreePathsEqual("C:\\repo\\wt", "c:/repo/wt/")).toBe(true);
    expect(worktreePathsEqual("/repo/a", "/repo/b")).toBe(false);
  });
});

describe("decidePruneMerged", () => {
  const opts = { mainPath: "/repo", currentPath: "/repo", requireClean: true };

  it("removes a merged, clean worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/wt", branch: "done", bare: false, merged: true, dirty: false }],
      opts,
    );
    expect(r).toEqual({ path: "/repo/wt", branch: "done", removed: true });
  });

  it("skips an unmerged worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/wt", branch: "wip", bare: false, merged: false, dirty: false }],
      opts,
    );
    expect(r).toMatchObject({ removed: false, reason: "not-merged" });
  });

  it("skips a dirty worktree when requireClean is set", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/wt", branch: "done", bare: false, merged: true, dirty: true }],
      opts,
    );
    expect(r).toMatchObject({ removed: false, reason: "dirty" });
  });

  it("removes a dirty merged worktree when requireClean is false", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/wt", branch: "done", bare: false, merged: true, dirty: true }],
      { ...opts, requireClean: false },
    );
    expect(r.removed).toBe(true);
  });

  it("refuses the main worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo", branch: "main", bare: false, merged: true, dirty: false }],
      opts,
    );
    expect(r).toMatchObject({ removed: false, reason: "main" });
  });

  it("refuses the current worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/here", branch: "cur", bare: false, merged: true, dirty: false }],
      { mainPath: "/repo", currentPath: "/repo/here", requireClean: true },
    );
    expect(r).toMatchObject({ removed: false, reason: "current" });
  });

  it("refuses a bare worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo.git", branch: "", bare: true, merged: true, dirty: false }],
      opts,
    );
    expect(r).toMatchObject({ removed: false, reason: "bare" });
  });

  it("refuses a locked worktree", () => {
    const [r] = decidePruneMerged(
      [{ path: "/repo/wt", branch: "done", bare: false, locked: true, merged: true, dirty: false }],
      opts,
    );
    expect(r).toMatchObject({ removed: false, reason: "locked" });
  });

  it("classifies a mixed batch correctly", () => {
    const results = decidePruneMerged(
      [
        { path: "/repo", branch: "main", bare: false, merged: true, dirty: false },
        { path: "/repo/a", branch: "a", bare: false, merged: true, dirty: false },
        { path: "/repo/b", branch: "b", bare: false, merged: false, dirty: false },
        { path: "/repo/c", branch: "c", bare: false, merged: true, dirty: true },
      ],
      opts,
    );
    expect(results.map((r) => [r.branch, r.removed, r.reason])).toEqual([
      ["main", false, "main"],
      ["a", true, undefined],
      ["b", false, "not-merged"],
      ["c", false, "dirty"],
    ]);
  });
});

describe("formatWorktreePrune", () => {
  it("summarizes removed and skipped worktrees", () => {
    const out = formatWorktreePrune({
      base: "main",
      results: [
        { path: "/repo/a", branch: "a", removed: true },
        { path: "/repo/b", branch: "b", removed: false, reason: "not-merged" },
      ],
    });
    expect(out).toBe(
      [
        "prune-merged (base main): removed 1, skipped 1",
        "  removed: /repo/a (a)",
        "  skipped [not-merged]: /repo/b (b)",
      ].join("\n"),
    );
  });
});
