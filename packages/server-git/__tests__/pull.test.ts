import { describe, it, expect } from "vitest";
import { parsePull } from "../src/lib/parsers.js";
import { formatPull } from "../src/lib/formatters.js";
import type { GitPull } from "../src/schemas/index.js";

describe("parsePull", () => {
  it("parses successful pull with changes", () => {
    const stdout = `Updating abc1234..def5678
Fast-forward
 src/index.ts | 10 +++++++---
 2 files changed, 7 insertions(+), 3 deletions(-)`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(2);
    expect(result.insertions).toBe(7);
    expect(result.deletions).toBe(3);
    expect(result.conflicts).toEqual([]);
  });

  it("parses already up to date", () => {
    const stdout = "Already up to date.";

    const result = parsePull(stdout, "");

    expect(result.success).toBe(true);
    expect(result.summary).toBe("Already up to date");
    expect(result.filesChanged).toBe(0);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.conflicts).toEqual([]);
  });

  it("parses pull with merge conflicts", () => {
    const stdout = `Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
Auto-merging src/utils.ts
CONFLICT (content): Merge conflict in src/utils.ts
Automatic merge failed; fix conflicts and then commit the result.`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["src/index.ts", "src/utils.ts"]);
    expect(result.summary).toContain("2 conflict(s)");
  });

  it("parses pull with single conflict", () => {
    const stdout = `Auto-merging README.md
CONFLICT (content): Merge conflict in README.md
Automatic merge failed; fix conflicts and then commit the result.`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["README.md"]);
  });

  it("parses rebase pull output", () => {
    const stdout = `Successfully rebased and updated refs/heads/main.
 3 files changed, 15 insertions(+), 5 deletions(-)`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(3);
    expect(result.insertions).toBe(15);
    expect(result.deletions).toBe(5);
  });

  it("handles empty output", () => {
    const result = parsePull("", "");

    expect(result.success).toBe(true);
    expect(result.filesChanged).toBe(0);
    expect(result.conflicts).toEqual([]);
  });

  it("parses pull with only insertions", () => {
    const stdout = `Updating abc1234..def5678
Fast-forward
 1 file changed, 10 insertions(+)`;

    const result = parsePull(stdout, "");

    expect(result.filesChanged).toBe(1);
    expect(result.insertions).toBe(10);
    expect(result.deletions).toBe(0);
  });

  it("parses conflict with add/add type", () => {
    const stdout = `CONFLICT (add/add): Merge conflict in new-file.ts`;

    const result = parsePull(stdout, "");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["new-file.ts"]);
  });
});

describe("formatPull", () => {
  it("formats successful pull with changes", () => {
    const data: GitPull = {
      success: true,
      summary: "Fast-forward",
      filesChanged: 2,
      insertions: 7,
      deletions: 3,
      conflicts: [],
    };
    const output = formatPull(data);

    expect(output).toContain("Fast-forward");
    expect(output).toContain("2 file(s) changed, +7 -3");
  });

  it("formats pull with conflicts", () => {
    const data: GitPull = {
      success: false,
      summary: "Pull completed with 2 conflict(s)",
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      conflicts: ["src/index.ts", "src/utils.ts"],
    };
    const output = formatPull(data);

    expect(output).toContain("2 conflict(s)");
    expect(output).toContain("Conflicts: src/index.ts, src/utils.ts");
  });

  it("formats already up to date", () => {
    const data: GitPull = {
      success: true,
      summary: "Already up to date",
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      conflicts: [],
    };
    const output = formatPull(data);

    expect(output).toBe("Already up to date");
  });
});
