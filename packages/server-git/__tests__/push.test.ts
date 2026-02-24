import { describe, it, expect } from "vitest";
import { parsePush } from "../src/lib/parsers.js";
import { formatPush } from "../src/lib/formatters.js";
import type { GitPush } from "../src/schemas/index.js";

describe("parsePush", () => {
  it("parses successful push with branch info", () => {
    const stderr = `To github.com:user/repo.git
   abc1234..def5678  main -> main`;

    const result = parsePush("", stderr, "origin", "main");

    expect(result.success).toBe(true);
    expect(result.summary).toContain("main -> main");
  });

  it("parses new branch push", () => {
    const stderr = `To github.com:user/repo.git
 * [new branch]      feature -> feature`;

    const result = parsePush("", stderr, "origin", "feature");

    expect(result.success).toBe(true);
  });

  it("resolves branch from output when not provided", () => {
    const stderr = `To github.com:user/repo.git
   abc1234..def5678  develop -> develop`;

    const result = parsePush("", stderr, "origin", "");

    expect(result.success).toBe(true);
  });

  it("handles empty output gracefully", () => {
    const result = parsePush("", "", "origin", "main");

    expect(result.success).toBe(true);
  });

  it("preserves force push output", () => {
    const stderr = `To github.com:user/repo.git
 + abc1234...def5678 main -> main (forced update)`;

    const result = parsePush("", stderr, "origin", "main");

    expect(result.success).toBe(true);
    expect(result.summary).toContain("forced update");
  });
});

describe("formatPush", () => {
  it("formats successful push result", () => {
    const data: GitPush = {
      success: true,
      summary: "abc1234..def5678  main -> main",
    };
    const output = formatPush(data);

    expect(output).toBe("Push completed: abc1234..def5678  main -> main");
  });

  it("formats failed push with error type", () => {
    const data: GitPush = {
      success: false,
      summary: "[rejected] main -> main (non-fast-forward)",
      errorType: "rejected",
      rejectedRef: "main",
      hint: "Updates were rejected because the tip is behind",
    };
    const output = formatPush(data);

    expect(output).toContain("Push failed");
    expect(output).toContain("[rejected]");
    expect(output).toContain("rejected ref: main");
    expect(output).toContain("hint: Updates were rejected");
  });
});
