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
    expect(result.event).toBe("APPROVE");
  });

  it("parses request-changes review output", () => {
    const stdout = "✓ Requested changes to pull request #7\nhttps://github.com/owner/repo/pull/7\n";

    const result = parsePrReview(stdout, 7, "request-changes");

    expect(result.number).toBe(7);
    expect(result.event).toBe("REQUEST_CHANGES");
  });

  it("parses comment review output", () => {
    const stdout = "✓ Reviewed pull request #100\nhttps://github.com/owner/repo/pull/100\n";

    const result = parsePrReview(stdout, 100, "comment");

    expect(result.number).toBe(100);
    expect(result.event).toBe("COMMENT");
  });

  it("handles output without URL", () => {
    const stdout = "✓ Approved pull request #5\n";

    const result = parsePrReview(stdout, 5, "approve");

    expect(result.number).toBe(5);
    expect(result.event).toBe("APPROVE");
  });

  it("preserves number and event from arguments", () => {
    const stdout = "some unexpected output\n";

    const result = parsePrReview(stdout, 99, "comment");

    expect(result.number).toBe(99);
    expect(result.event).toBe("COMMENT");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatPrReview", () => {
  it("formats approve review result", () => {
    const data: PrReviewResult = {
      number: 42,
      event: "approve",
    };
    expect(formatPrReview(data)).toBe("Reviewed PR #42 (approve)");
  });

  it("formats request-changes review result", () => {
    const data: PrReviewResult = {
      number: 7,
      event: "request-changes",
    };
    expect(formatPrReview(data)).toBe("Reviewed PR #7 (request-changes)");
  });

  it("formats comment review result", () => {
    const data: PrReviewResult = {
      number: 100,
      event: "comment",
    };
    expect(formatPrReview(data)).toBe("Reviewed PR #100 (comment)");
  });
});

// ── P1-gap #145: Review event parsing ───────────────────────────────

describe("parsePrReview — event type mapping (P1 #145)", () => {
  it("maps approve to APPROVE", () => {
    const result = parsePrReview("https://github.com/owner/repo/pull/1\n", 1, "approve");
    expect(result.event).toBe("APPROVE");
  });

  it("maps request-changes to REQUEST_CHANGES", () => {
    const result = parsePrReview("https://github.com/owner/repo/pull/1\n", 1, "request-changes");
    expect(result.event).toBe("REQUEST_CHANGES");
  });

  it("maps comment to COMMENT", () => {
    const result = parsePrReview("https://github.com/owner/repo/pull/1\n", 1, "comment");
    expect(result.event).toBe("COMMENT");
  });

  it("passes through unknown event types unchanged", () => {
    const result = parsePrReview("", 1, "DISMISS");
    expect(result.event).toBe("DISMISS");
  });

  it("includes body in output", () => {
    const result = parsePrReview("", 1, "comment", "LGTM");
    expect(result.body).toBe("LGTM");
  });
});

// ── P1-gap #146: Review error classification ────────────────────────

describe("parsePrReview — error classification (P1 #146)", () => {
  it("classifies not-found error", () => {
    const result = parsePrReview(
      "",
      42,
      "approve",
      undefined,
      "Could not resolve to a PullRequest",
    );
    expect(result.errorType).toBe("not-found");
  });

  it("classifies permission-denied error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "HTTP 403: Permission denied");
    expect(result.errorType).toBe("permission-denied");
  });

  it("classifies already-reviewed error", () => {
    const result = parsePrReview(
      "",
      42,
      "approve",
      undefined,
      "You have already approved this pull request",
    );
    expect(result.errorType).toBe("already-reviewed");
  });

  it("classifies draft-pr error", () => {
    const result = parsePrReview("", 42, "approve", undefined, "Pull request is a draft");
    expect(result.errorType).toBe("draft-pr");
  });

  it("classifies unknown error for unrecognized stderr", () => {
    const result = parsePrReview("", 42, "approve", undefined, "some unexpected error");
    expect(result.errorType).toBe("unknown");
  });

  it("does not classify when no stderr", () => {
    const result = parsePrReview("https://github.com/owner/repo/pull/42\n", 42, "approve");
    expect(result.errorType).toBeUndefined();
  });
});
