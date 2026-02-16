import { describe, it, expect } from "vitest";
import { parsePrMerge } from "../src/lib/parsers.js";
import { formatPrMerge } from "../src/lib/formatters.js";
import type { PrMergeResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrMerge", () => {
  it("parses merge output with PR URL", () => {
    const stdout =
      "✓ Squashed and merged pull request #42\nhttps://github.com/owner/repo/pull/42\n";

    const result = parsePrMerge(stdout, 42, "squash");

    expect(result.number).toBe(42);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("squash");
    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.state).toBe("merged");
  });

  it("parses merge output with rebase method", () => {
    const stdout = "✓ Rebased and merged pull request #7\nhttps://github.com/owner/repo/pull/7\n";

    const result = parsePrMerge(stdout, 7, "rebase");

    expect(result.number).toBe(7);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("rebase");
    expect(result.url).toBe("https://github.com/owner/repo/pull/7");
    expect(result.state).toBe("merged");
  });

  it("parses merge output with merge method", () => {
    const stdout = "✓ Merged pull request #100\nhttps://github.com/owner/repo/pull/100\n";

    const result = parsePrMerge(stdout, 100, "merge");

    expect(result.number).toBe(100);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("merge");
    expect(result.url).toBe("https://github.com/owner/repo/pull/100");
    expect(result.state).toBe("merged");
  });

  it("handles output without URL", () => {
    const stdout = "✓ Squashed and merged pull request #5\n";

    const result = parsePrMerge(stdout, 5, "squash");

    expect(result.number).toBe(5);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("squash");
    expect(result.url).toBe("");
    expect(result.state).toBe("merged");
  });

  it("handles delete-branch output with URL", () => {
    const stdout =
      "✓ Squashed and merged pull request #3\nhttps://github.com/owner/repo/pull/3\n✓ Deleted branch feat/test\n";

    const result = parsePrMerge(stdout, 3, "squash");

    expect(result.number).toBe(3);
    expect(result.merged).toBe(true);
    expect(result.url).toBe("https://github.com/owner/repo/pull/3");
    expect(result.state).toBe("merged");
  });

  it("detects auto-merge enabled state", () => {
    const stdout =
      "✓ Pull request #10 will be automatically merged via squash when all requirements are met\nhttps://github.com/owner/repo/pull/10\n";

    const result = parsePrMerge(stdout, 10, "squash", false, true);

    expect(result.state).toBe("auto-merge-enabled");
    expect(result.merged).toBe(false);
    expect(result.method).toBe("squash");
  });

  it("detects auto-merge disabled state", () => {
    const stdout =
      "✓ Auto-merge disabled for pull request #10\nhttps://github.com/owner/repo/pull/10\n";

    const result = parsePrMerge(stdout, 10, "squash", false, false, true);

    expect(result.state).toBe("auto-merge-disabled");
    expect(result.merged).toBe(false);
  });

  it("detects method from output text (squash detected from text)", () => {
    const stdout =
      "✓ Squashed and merged pull request #42\nhttps://github.com/owner/repo/pull/42\n";

    // User passes "merge" but text says "Squashed and merged"
    const result = parsePrMerge(stdout, 42, "merge");

    expect(result.method).toBe("squash");
  });

  it("detects method from output text (rebase detected from text)", () => {
    const stdout = "✓ Rebased and merged pull request #7\nhttps://github.com/owner/repo/pull/7\n";

    const result = parsePrMerge(stdout, 7, "squash");

    expect(result.method).toBe("rebase");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrMerge", () => {
  it("formats merge result with squash", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "squash",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
    };
    expect(formatPrMerge(data)).toBe(
      "Merged PR #42 via squash: https://github.com/owner/repo/pull/42",
    );
  });

  it("formats merge result with rebase", () => {
    const data: PrMergeResult = {
      number: 7,
      merged: true,
      method: "rebase",
      url: "https://github.com/owner/repo/pull/7",
      state: "merged",
    };
    expect(formatPrMerge(data)).toBe(
      "Merged PR #7 via rebase: https://github.com/owner/repo/pull/7",
    );
  });

  it("formats merge result with merge", () => {
    const data: PrMergeResult = {
      number: 100,
      merged: true,
      method: "merge",
      url: "https://github.com/owner/repo/pull/100",
      state: "merged",
    };
    expect(formatPrMerge(data)).toBe(
      "Merged PR #100 via merge: https://github.com/owner/repo/pull/100",
    );
  });

  it("formats merge result with merge commit SHA", () => {
    const data: PrMergeResult = {
      number: 42,
      merged: true,
      method: "squash",
      url: "https://github.com/owner/repo/pull/42",
      state: "merged",
      mergeCommitSha: "abc1234567890def1234567890abcdef12345678",
    };
    const output = formatPrMerge(data);
    expect(output).toContain("[abc1234]");
    expect(output).toContain("Merged PR #42 via squash");
  });

  it("formats auto-merge enabled state", () => {
    const data: PrMergeResult = {
      number: 10,
      merged: false,
      method: "squash",
      url: "https://github.com/owner/repo/pull/10",
      state: "auto-merge-enabled",
    };
    expect(formatPrMerge(data)).toBe(
      "Auto-merge enabled for PR #10 via squash: https://github.com/owner/repo/pull/10",
    );
  });

  it("formats auto-merge disabled state", () => {
    const data: PrMergeResult = {
      number: 10,
      merged: false,
      method: "squash",
      url: "https://github.com/owner/repo/pull/10",
      state: "auto-merge-disabled",
    };
    expect(formatPrMerge(data)).toBe(
      "Auto-merge disabled for PR #10: https://github.com/owner/repo/pull/10",
    );
  });
});
