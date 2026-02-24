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
    expect(result.url).toBeUndefined();
  });

  it("trims whitespace from output", () => {
    const result = parseComment("  https://github.com/owner/repo/issues/5#issuecomment-555  \n");
    expect(result.url).toBe("https://github.com/owner/repo/issues/5#issuecomment-555");
  });

  it("extracts commentId from URL", () => {
    const result = parseComment("https://github.com/owner/repo/issues/15#issuecomment-789012\n");
    expect(result.commentId).toBe("789012");
  });

  it("passes operation type and issue number", () => {
    const result = parseComment("https://github.com/owner/repo/issues/15#issuecomment-789012\n", {
      operation: "create",
      issueNumber: 15,
    });
    expect(result.operation).toBe("create");
    expect(result.issueNumber).toBe(15);
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

  it("formats comment with operation type", () => {
    const data: CommentResult = {
      url: "https://github.com/owner/repo/issues/15#issuecomment-789012",
      operation: "edit",
      commentId: "789012",
    };
    expect(formatComment(data)).toContain("editd");
    expect(formatComment(data)).toContain("(id: 789012)");
  });
});
