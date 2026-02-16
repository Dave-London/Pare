import { describe, it, expect } from "vitest";
import { parseComment } from "../src/lib/parsers.js";
import { formatComment } from "../src/lib/formatters.js";
import type { CommentResult } from "../src/schemas/index.js";

describe("parseComment (pr-comment)", () => {
  it("parses comment URL from stdout", () => {
    const result = parseComment("https://github.com/owner/repo/pull/42#issuecomment-123456\n");

    expect(result.url).toBe("https://github.com/owner/repo/pull/42#issuecomment-123456");
  });

  it("handles URL without trailing newline", () => {
    const result = parseComment("https://github.com/owner/repo/pull/1#issuecomment-1");
    expect(result.url).toBe("https://github.com/owner/repo/pull/1#issuecomment-1");
  });

  it("handles empty output", () => {
    const result = parseComment("");
    expect(result.url).toBeUndefined();
  });

  it("trims whitespace from output", () => {
    const result = parseComment("  https://github.com/owner/repo/pull/10#issuecomment-999  \n");
    expect(result.url).toBe("https://github.com/owner/repo/pull/10#issuecomment-999");
  });

  it("extracts commentId from URL", () => {
    const result = parseComment("https://github.com/owner/repo/pull/42#issuecomment-123456\n");
    expect(result.commentId).toBe("123456");
  });

  it("passes operation type and PR number", () => {
    const result = parseComment("https://github.com/owner/repo/pull/42#issuecomment-123456\n", {
      operation: "create",
      prNumber: 42,
      body: "test comment",
    });
    expect(result.operation).toBe("create");
    expect(result.prNumber).toBe(42);
    expect(result.body).toBe("test comment");
  });
});

describe("formatComment (pr-comment)", () => {
  it("formats comment result", () => {
    const data: CommentResult = {
      url: "https://github.com/owner/repo/pull/42#issuecomment-123456",
    };
    expect(formatComment(data)).toBe(
      "Comment added: https://github.com/owner/repo/pull/42#issuecomment-123456",
    );
  });
});
