import { describe, it, expect } from "vitest";
import { parsePrReview } from "../src/lib/parsers.js";
import { formatPrReview } from "../src/lib/formatters.js";
import type { PrReviewResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrReview", () => {
  it("parses approve review output with PR URL", () => {
    const stdout = "✓ Approved pull request #42\nhttps://github.com/owner/repo/pull/42\n";

    const result = parsePrReview(stdout, 42, "approve");

    expect(result.number).toBe(42);
    expect(result.event).toBe("approve");
    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
  });

  it("parses request-changes review output", () => {
    const stdout = "✓ Requested changes to pull request #7\nhttps://github.com/owner/repo/pull/7\n";

    const result = parsePrReview(stdout, 7, "request-changes");

    expect(result.number).toBe(7);
    expect(result.event).toBe("request-changes");
    expect(result.url).toBe("https://github.com/owner/repo/pull/7");
  });

  it("parses comment review output", () => {
    const stdout = "✓ Reviewed pull request #100\nhttps://github.com/owner/repo/pull/100\n";

    const result = parsePrReview(stdout, 100, "comment");

    expect(result.number).toBe(100);
    expect(result.event).toBe("comment");
    expect(result.url).toBe("https://github.com/owner/repo/pull/100");
  });

  it("handles output without URL", () => {
    const stdout = "✓ Approved pull request #5\n";

    const result = parsePrReview(stdout, 5, "approve");

    expect(result.number).toBe(5);
    expect(result.event).toBe("approve");
    expect(result.url).toBe("");
  });

  it("preserves number and event from arguments", () => {
    const stdout = "some unexpected output\n";

    const result = parsePrReview(stdout, 99, "comment");

    expect(result.number).toBe(99);
    expect(result.event).toBe("comment");
    expect(result.url).toBe("");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrReview", () => {
  it("formats approve review result", () => {
    const data: PrReviewResult = {
      number: 42,
      event: "approve",
      url: "https://github.com/owner/repo/pull/42",
    };
    expect(formatPrReview(data)).toBe(
      "Reviewed PR #42 (approve): https://github.com/owner/repo/pull/42",
    );
  });

  it("formats request-changes review result", () => {
    const data: PrReviewResult = {
      number: 7,
      event: "request-changes",
      url: "https://github.com/owner/repo/pull/7",
    };
    expect(formatPrReview(data)).toBe(
      "Reviewed PR #7 (request-changes): https://github.com/owner/repo/pull/7",
    );
  });

  it("formats comment review result", () => {
    const data: PrReviewResult = {
      number: 100,
      event: "comment",
      url: "https://github.com/owner/repo/pull/100",
    };
    expect(formatPrReview(data)).toBe(
      "Reviewed PR #100 (comment): https://github.com/owner/repo/pull/100",
    );
  });
});
