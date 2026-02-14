import { describe, it, expect } from "vitest";
import { parseComment } from "../src/lib/parsers.js";
import { formatComment } from "../src/lib/formatters.js";
import type { CommentResult } from "../src/schemas/index.js";

describe("parseComment (issue-comment)", () => {
  it("parses comment URL from stdout", () => {
    const result = parseComment("https://github.com/owner/repo/issues/15#issuecomment-789012\n");

    expect(result.url).toBe("https://github.com/owner/repo/issues/15#issuecomment-789012");
  });

  it("handles URL without trailing newline", () => {
    const result = parseComment("https://github.com/owner/repo/issues/1#issuecomment-1");
    expect(result.url).toBe("https://github.com/owner/repo/issues/1#issuecomment-1");
  });

  it("handles empty output", () => {
    const result = parseComment("");
    expect(result.url).toBe("");
  });

  it("trims whitespace from output", () => {
    const result = parseComment("  https://github.com/owner/repo/issues/5#issuecomment-555  \n");
    expect(result.url).toBe("https://github.com/owner/repo/issues/5#issuecomment-555");
  });
});

describe("formatComment (issue-comment)", () => {
  it("formats comment result", () => {
    const data: CommentResult = {
      url: "https://github.com/owner/repo/issues/15#issuecomment-789012",
    };
    expect(formatComment(data)).toBe(
      "Comment added: https://github.com/owner/repo/issues/15#issuecomment-789012",
    );
  });
});
