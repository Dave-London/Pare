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
