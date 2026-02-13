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
  });

  it("parses merge output with rebase method", () => {
    const stdout = "✓ Rebased and merged pull request #7\nhttps://github.com/owner/repo/pull/7\n";

    const result = parsePrMerge(stdout, 7, "rebase");

    expect(result.number).toBe(7);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("rebase");
    expect(result.url).toBe("https://github.com/owner/repo/pull/7");
  });

  it("parses merge output with merge method", () => {
    const stdout = "✓ Merged pull request #100\nhttps://github.com/owner/repo/pull/100\n";

    const result = parsePrMerge(stdout, 100, "merge");

    expect(result.number).toBe(100);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("merge");
    expect(result.url).toBe("https://github.com/owner/repo/pull/100");
  });

  it("handles output without URL", () => {
    const stdout = "✓ Squashed and merged pull request #5\n";

    const result = parsePrMerge(stdout, 5, "squash");

    expect(result.number).toBe(5);
    expect(result.merged).toBe(true);
    expect(result.method).toBe("squash");
    expect(result.url).toBe("");
  });

  it("handles delete-branch output with URL", () => {
    const stdout =
      "✓ Squashed and merged pull request #3\nhttps://github.com/owner/repo/pull/3\n✓ Deleted branch feat/test\n";

    const result = parsePrMerge(stdout, 3, "squash");

    expect(result.number).toBe(3);
    expect(result.merged).toBe(true);
    expect(result.url).toBe("https://github.com/owner/repo/pull/3");
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
    };
    expect(formatPrMerge(data)).toBe(
      "Merged PR #100 via merge: https://github.com/owner/repo/pull/100",
    );
  });
});
