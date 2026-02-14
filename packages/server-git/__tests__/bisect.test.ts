import { describe, it, expect } from "vitest";
import { parseBisect } from "../src/lib/parsers.js";
import { formatBisect } from "../src/lib/formatters.js";
import type { GitBisect } from "../src/schemas/index.js";

describe("parseBisect", () => {
  it("parses bisecting step with remaining revisions", () => {
    const stdout = `Bisecting: 5 revisions left to test after this (roughly 3 steps)
[abc1234def5678901234567890abcdef12345678] Fix something`;

    const result = parseBisect(stdout, "", "start");

    expect(result.action).toBe("start");
    expect(result.remaining).toBe(3);
    expect(result.current).toBe("abc1234def5678901234567890abcdef12345678");
    expect(result.result).toBeUndefined();
  });

  it("parses bisect finding the culprit commit", () => {
    const stdout = `abc1234def5678901234567890abcdef12345678 is the first bad commit
commit abc1234def5678901234567890abcdef12345678
Author: John Doe <john@example.com>
Date:   Mon Jan 1 12:00:00 2024 +0000

    Introduce the bug`;

    const result = parseBisect(stdout, "", "bad");

    expect(result.action).toBe("bad");
    expect(result.result).toBeDefined();
    expect(result.result!.hash).toBe("abc1234def5678901234567890abcdef12345678");
    expect(result.result!.message).toBe("Introduce the bug");
    expect(result.result!.author).toBe("John Doe <john@example.com>");
    expect(result.result!.date).toBe("Mon Jan 1 12:00:00 2024 +0000");
  });

  it("parses bisect good with remaining steps", () => {
    const stdout = `Bisecting: 2 revisions left to test after this (roughly 1 steps)
[def5678abc1234567890abcdef1234567890abcd] Another commit`;

    const result = parseBisect(stdout, "", "good");

    expect(result.action).toBe("good");
    expect(result.remaining).toBe(1);
    expect(result.current).toBe("def5678abc1234567890abcdef1234567890abcd");
  });

  it("parses bisect reset", () => {
    const stdout = "Previous HEAD position was abc1234 Fix something\nSwitched to branch 'main'";

    const result = parseBisect(stdout, "", "reset");

    expect(result.action).toBe("reset");
    expect(result.message).toContain("Switched to branch");
  });

  it("parses bisect status (log output)", () => {
    const stdout = `git bisect start
# bad: [abc1234] Bad commit
git bisect bad abc1234
# good: [def5678] Good commit
git bisect good def5678`;

    const result = parseBisect(stdout, "", "status");

    expect(result.action).toBe("status");
    expect(result.message).toContain("git bisect start");
  });

  it("handles single revision left", () => {
    const stdout = `Bisecting: 0 revisions left to test after this (roughly 1 steps)
[aaa1111bbb2222ccc3333ddd4444eee5555fff66] Last step`;

    const result = parseBisect(stdout, "", "good");

    expect(result.remaining).toBe(1);
    expect(result.current).toBe("aaa1111bbb2222ccc3333ddd4444eee5555fff66");
  });

  it("handles empty output for reset", () => {
    const result = parseBisect("", "", "reset");

    expect(result.action).toBe("reset");
    expect(result.message).toBe("Bisect reset completed");
  });
});

describe("formatBisect", () => {
  it("formats bisect step with remaining", () => {
    const data: GitBisect = {
      action: "start",
      current: "abc1234",
      remaining: 3,
      message: "Bisecting: 5 revisions left",
    };
    const output = formatBisect(data);

    expect(output).toContain("Bisect start");
    expect(output).toContain("Current: abc1234");
    expect(output).toContain("~3 step(s) remaining");
  });

  it("formats bisect result (culprit found)", () => {
    const data: GitBisect = {
      action: "bad",
      result: {
        hash: "abc1234def5678901234567890abcdef12345678",
        message: "Introduce the bug",
        author: "John Doe <john@example.com>",
        date: "Mon Jan 1 12:00:00 2024 +0000",
      },
      message: "Found it",
    };
    const output = formatBisect(data);

    expect(output).toContain("Bisect found culprit: abc1234d Introduce the bug");
    expect(output).toContain("Author: John Doe <john@example.com>");
    expect(output).toContain("Date: Mon Jan 1 12:00:00 2024 +0000");
  });

  it("formats bisect reset", () => {
    const data: GitBisect = {
      action: "reset",
      message: "Bisect reset completed",
    };
    const output = formatBisect(data);

    expect(output).toBe("Bisect reset");
  });

  it("formats bisect result without author/date", () => {
    const data: GitBisect = {
      action: "bad",
      result: {
        hash: "abc1234def5678901234567890abcdef12345678",
        message: "Bug commit",
      },
      message: "Found it",
    };
    const output = formatBisect(data);

    expect(output).toContain("Bisect found culprit: abc1234d Bug commit");
    expect(output).not.toContain("Author:");
  });
});
