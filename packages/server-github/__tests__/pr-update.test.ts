import { describe, it, expect } from "vitest";
import { parsePrUpdate } from "../src/lib/parsers.js";
import { formatPrUpdate } from "../src/lib/formatters.js";
import type { EditResult } from "../src/schemas/index.js";

// -- Parser tests -------------------------------------------------------------

describe("parsePrUpdate", () => {
  it("parses PR edit URL output", () => {
    const stdout = "https://github.com/owner/repo/pull/42\n";
    const result = parsePrUpdate(stdout, 42);

    expect(result.number).toBe(42);
    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
  });

  it("handles URL without trailing newline", () => {
    const result = parsePrUpdate("https://github.com/owner/repo/pull/7", 7);

    expect(result.number).toBe(7);
    expect(result.url).toBe("https://github.com/owner/repo/pull/7");
  });

  it("preserves the PR number from the argument", () => {
    const result = parsePrUpdate("https://github.com/owner/repo/pull/99\n", 99);

    expect(result.number).toBe(99);
  });

  it("returns empty URL when no URL found in output", () => {
    const result = parsePrUpdate("Edited pull request #5\n", 5);

    expect(result.number).toBe(5);
    expect(result.url).toBe("");
  });

  it("extracts URL from multiline output", () => {
    const stdout = "Updated title\nhttps://github.com/owner/repo/pull/10\nDone.\n";
    const result = parsePrUpdate(stdout, 10);

    expect(result.url).toBe("https://github.com/owner/repo/pull/10");
  });
});

// -- Formatter tests ----------------------------------------------------------

describe("formatPrUpdate", () => {
  it("formats PR update result", () => {
    const data: EditResult = {
      number: 42,
      url: "https://github.com/owner/repo/pull/42",
    };
    expect(formatPrUpdate(data)).toBe("Updated PR #42: https://github.com/owner/repo/pull/42");
  });

  it("formats PR update result with different number", () => {
    const data: EditResult = {
      number: 1,
      url: "https://github.com/owner/repo/pull/1",
    };
    expect(formatPrUpdate(data)).toBe("Updated PR #1: https://github.com/owner/repo/pull/1");
  });
});
