import { describe, it, expect } from "vitest";
import { parseIssueClose } from "../src/lib/parsers.js";
import { formatIssueClose } from "../src/lib/formatters.js";
import type { IssueCloseResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseIssueClose", () => {
  it("parses issue close URL output", () => {
    const result = parseIssueClose("https://github.com/owner/repo/issues/42\n", 42);

    expect(result.number).toBe(42);
    expect(result.state).toBe("closed");
    expect(result.url).toBe("https://github.com/owner/repo/issues/42");
  });

  it("handles URL without trailing newline", () => {
    const result = parseIssueClose("https://github.com/owner/repo/issues/1", 1);

    expect(result.number).toBe(1);
    expect(result.state).toBe("closed");
    expect(result.url).toBe("https://github.com/owner/repo/issues/1");
  });

  it("preserves the issue number from the argument", () => {
    const result = parseIssueClose("https://github.com/owner/repo/issues/99\n", 99);

    expect(result.number).toBe(99);
  });

  it("always returns state as closed", () => {
    const result = parseIssueClose("https://github.com/owner/repo/issues/5", 5);

    expect(result.state).toBe("closed");
  });

  it("trims whitespace from URL", () => {
    const result = parseIssueClose("  https://github.com/owner/repo/issues/10  \n", 10);

    expect(result.url).toBe("https://github.com/owner/repo/issues/10");
  });

  // ── Robust URL extraction tests (#37) ────────────────────────────

  it("extracts URL from multi-line output with prefix message", () => {
    const stdout = "✓ Closed issue #42\nhttps://github.com/owner/repo/issues/42\n";
    const result = parseIssueClose(stdout, 42);

    expect(result.url).toBe("https://github.com/owner/repo/issues/42");
  });

  it("extracts URL when embedded in confirmation text", () => {
    const stdout =
      "Closing issue owner/repo#7 (some title) as completed\nhttps://github.com/owner/repo/issues/7\n";
    const result = parseIssueClose(stdout, 7);

    expect(result.url).toBe("https://github.com/owner/repo/issues/7");
  });

  it("extracts URL with extra whitespace and surrounding text", () => {
    const stdout = "  Done!  https://github.com/owner/repo/issues/99  some trailing text\n";
    const result = parseIssueClose(stdout, 99);

    expect(result.url).toBe("https://github.com/owner/repo/issues/99");
  });

  it("falls back to trimmed stdout when no URL pattern matches", () => {
    const stdout = "operation completed\n";
    const result = parseIssueClose(stdout, 5);

    expect(result.url).toBe("operation completed");
    expect(result.number).toBe(5);
    expect(result.state).toBe("closed");
  });

  it("handles enterprise GitHub URLs", () => {
    const stdout = "✓ Closed\nhttps://github.com/my-org/my-repo/issues/123\n";
    const result = parseIssueClose(stdout, 123);

    expect(result.url).toBe("https://github.com/my-org/my-repo/issues/123");
  });

  it("extracts URL from output with both issue URL and comment URL", () => {
    const stdout =
      "✓ Closed issue #10\nhttps://github.com/owner/repo/issues/10\nhttps://github.com/owner/repo/issues/10#issuecomment-456789\n";
    const result = parseIssueClose(stdout, 10, undefined, "closing comment");

    expect(result.url).toBe("https://github.com/owner/repo/issues/10");
    expect(result.commentUrl).toBe("https://github.com/owner/repo/issues/10#issuecomment-456789");
  });

  it("includes reason in result when provided", () => {
    const stdout = "https://github.com/owner/repo/issues/3\n";
    const result = parseIssueClose(stdout, 3, "not planned");

    expect(result.reason).toBe("not planned");
  });

  it("includes commentUrl only when comment was provided and URL found", () => {
    // No comment URL in output, but comment was passed
    const stdout = "https://github.com/owner/repo/issues/3\n";
    const result = parseIssueClose(stdout, 3, undefined, "a comment");

    expect(result.commentUrl).toBeUndefined();
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatIssueClose", () => {
  it("formats issue close result", () => {
    const data: IssueCloseResult = {
      number: 42,
      state: "closed",
      url: "https://github.com/owner/repo/issues/42",
    };
    expect(formatIssueClose(data)).toBe(
      "Closed issue #42: https://github.com/owner/repo/issues/42",
    );
  });

  it("formats issue close result with different number", () => {
    const data: IssueCloseResult = {
      number: 1,
      state: "closed",
      url: "https://github.com/owner/repo/issues/1",
    };
    expect(formatIssueClose(data)).toBe("Closed issue #1: https://github.com/owner/repo/issues/1");
  });
});

// ── P1-gap #144: Already-closed detection ───────────────────────────

describe("parseIssueClose — already-closed detection (P1 #144)", () => {
  it("detects already-closed from stderr", () => {
    const stdout = "";
    const result = parseIssueClose(stdout, 42, undefined, undefined, "issue #42 is already closed");

    expect(result.alreadyClosed).toBe(true);
    expect(result.state).toBe("closed");
    expect(result.number).toBe(42);
  });

  it("detects already-closed with different phrasing", () => {
    const stdout = "";
    const result = parseIssueClose(stdout, 10, undefined, undefined, "Issue already closed");

    expect(result.alreadyClosed).toBe(true);
  });

  it("detects already-closed from 'already been closed' phrasing", () => {
    const stdout = "";
    const result = parseIssueClose(
      stdout,
      5,
      undefined,
      undefined,
      "This issue has already been closed",
    );

    expect(result.alreadyClosed).toBe(true);
  });

  it("does not flag alreadyClosed for normal close", () => {
    const stdout = "https://github.com/owner/repo/issues/42\n";
    const result = parseIssueClose(stdout, 42, "completed");

    expect(result.alreadyClosed).toBeUndefined();
  });

  it("does not flag alreadyClosed when no stderr", () => {
    const stdout = "✓ Closed issue #42\nhttps://github.com/owner/repo/issues/42\n";
    const result = parseIssueClose(stdout, 42);

    expect(result.alreadyClosed).toBeUndefined();
  });
});

describe("formatIssueClose — already-closed display (P1 #144)", () => {
  it("shows already-closed indicator", () => {
    const data: IssueCloseResult = {
      number: 42,
      state: "closed",
      url: "https://github.com/owner/repo/issues/42",
      alreadyClosed: true,
    };
    const output = formatIssueClose(data);

    expect(output).toContain("[already closed]");
  });

  it("does not show indicator when not already closed", () => {
    const data: IssueCloseResult = {
      number: 42,
      state: "closed",
      url: "https://github.com/owner/repo/issues/42",
    };
    const output = formatIssueClose(data);

    expect(output).not.toContain("[already closed]");
  });
});
