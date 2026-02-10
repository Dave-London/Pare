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
    expect(result.remote).toBe("origin");
    expect(result.branch).toBe("main");
    expect(result.summary).toContain("main -> main");
  });

  it("parses new branch push", () => {
    const stderr = `To github.com:user/repo.git
 * [new branch]      feature -> feature`;

    const result = parsePush("", stderr, "origin", "feature");

    expect(result.success).toBe(true);
    expect(result.remote).toBe("origin");
    expect(result.branch).toBe("feature");
  });

  it("resolves branch from output when not provided", () => {
    const stderr = `To github.com:user/repo.git
   abc1234..def5678  develop -> develop`;

    const result = parsePush("", stderr, "origin", "");

    expect(result.branch).toBe("develop");
  });

  it("handles empty output gracefully", () => {
    const result = parsePush("", "", "origin", "main");

    expect(result.success).toBe(true);
    expect(result.remote).toBe("origin");
    expect(result.branch).toBe("main");
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
  it("formats push result", () => {
    const data: GitPush = {
      success: true,
      remote: "origin",
      branch: "main",
      summary: "abc1234..def5678  main -> main",
    };
    const output = formatPush(data);

    expect(output).toBe("Pushed to origin/main: abc1234..def5678  main -> main");
  });
});
