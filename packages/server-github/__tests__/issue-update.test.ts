import { describe, it, expect } from "vitest";
import { parseIssueUpdate } from "../src/lib/parsers.js";
import { formatIssueUpdate } from "../src/lib/formatters.js";
import type { EditResult } from "../src/schemas/index.js";

// -- Parser tests -------------------------------------------------------------

describe("parseIssueUpdate", () => {
  it("parses issue edit URL output", () => {
    const stdout = "https://github.com/owner/repo/issues/42\n";
    const result = parseIssueUpdate(stdout, 42);

    expect(result.number).toBe(42);
    expect(result.url).toBe("https://github.com/owner/repo/issues/42");
  });

  it("handles URL without trailing newline", () => {
    const result = parseIssueUpdate("https://github.com/owner/repo/issues/7", 7);

    expect(result.number).toBe(7);
    expect(result.url).toBe("https://github.com/owner/repo/issues/7");
  });

  it("preserves the issue number from the argument", () => {
    const result = parseIssueUpdate("https://github.com/owner/repo/issues/99\n", 99);

    expect(result.number).toBe(99);
  });

  it("returns empty URL when no URL found in output", () => {
    const result = parseIssueUpdate("Edited issue #5\n", 5);

    expect(result.number).toBe(5);
    expect(result.url).toBe("");
  });

  it("extracts URL from multiline output", () => {
    const stdout = "Updated title\nhttps://github.com/owner/repo/issues/10\nDone.\n";
    const result = parseIssueUpdate(stdout, 10);

    expect(result.url).toBe("https://github.com/owner/repo/issues/10");
  });
});

// -- Formatter tests ----------------------------------------------------------

describe("formatIssueUpdate", () => {
  it("formats issue update result", () => {
    const data: EditResult = {
      number: 42,
      url: "https://github.com/owner/repo/issues/42",
    };
    expect(formatIssueUpdate(data)).toBe(
      "Updated issue #42: https://github.com/owner/repo/issues/42",
    );
  });

  it("formats issue update result with different number", () => {
    const data: EditResult = {
      number: 1,
      url: "https://github.com/owner/repo/issues/1",
    };
    expect(formatIssueUpdate(data)).toBe(
      "Updated issue #1: https://github.com/owner/repo/issues/1",
    );
  });
});
