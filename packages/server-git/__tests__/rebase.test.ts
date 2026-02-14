import { describe, it, expect } from "vitest";
import { parseRebase } from "../src/lib/parsers.js";
import { formatRebase } from "../src/lib/formatters.js";
import type { GitRebase } from "../src/schemas/index.js";

describe("parseRebase", () => {
  it("parses successful rebase", () => {
    const stdout = "Successfully rebased and updated refs/heads/feature.";
    const result = parseRebase(stdout, "", "main", "feature");

    expect(result.success).toBe(true);
    expect(result.branch).toBe("main");
    expect(result.current).toBe("feature");
    expect(result.conflicts).toEqual([]);
  });

  it("parses rebase with conflicts", () => {
    const stderr = `Auto-merging src/index.ts
CONFLICT (content): Merge conflict in src/index.ts
Auto-merging src/utils.ts
CONFLICT (content): Merge conflict in src/utils.ts
error: could not apply abc1234... Fix the thing
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".`;

    const result = parseRebase("", stderr, "main", "feature");

    expect(result.success).toBe(false);
    expect(result.branch).toBe("main");
    expect(result.current).toBe("feature");
    expect(result.conflicts).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("parses rebase with single conflict", () => {
    const stderr = `CONFLICT (content): Merge conflict in README.md
error: could not apply abc1234... Update readme`;

    const result = parseRebase("", stderr, "main", "feature");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["README.md"]);
  });

  it("parses rebase with add/add conflict", () => {
    const stderr = `CONFLICT (add/add): Merge conflict in new-file.ts`;

    const result = parseRebase("", stderr, "main", "feature");

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(["new-file.ts"]);
  });

  it("parses rebase abort (branch is empty when aborting)", () => {
    const stdout = "";
    const stderr = "";
    // When the tool invokes --abort, it passes branch="" to the parser
    const result = parseRebase(stdout, stderr, "", "feature");

    expect(result.success).toBe(true);
    expect(result.branch).toBe("");
    expect(result.current).toBe("feature");
    expect(result.conflicts).toEqual([]);
  });

  it("parses rebase continue success", () => {
    const stdout = "Successfully rebased and updated refs/heads/feature.";
    const result = parseRebase(stdout, "", "main", "feature");

    expect(result.success).toBe(true);
    expect(result.branch).toBe("main");
    expect(result.current).toBe("feature");
    expect(result.conflicts).toEqual([]);
  });

  it("parses rebase with Applying lines", () => {
    const stdout = `Applying: Fix the first thing
Applying: Fix the second thing
Applying: Fix the third thing`;

    const result = parseRebase(stdout, "", "main", "feature");

    expect(result.rebasedCommits).toBe(3);
    expect(result.branch).toBe("main");
    expect(result.current).toBe("feature");
  });

  it("handles empty output (already up to date)", () => {
    const stdout = "Current branch feature is up to date.";
    const result = parseRebase(stdout, "", "main", "feature");

    expect(result.success).toBe(true);
    expect(result.branch).toBe("main");
    expect(result.conflicts).toEqual([]);
  });
});

describe("formatRebase", () => {
  it("formats successful rebase", () => {
    const data: GitRebase = {
      success: true,
      branch: "main",
      current: "feature",
      conflicts: [],
      rebasedCommits: 3,
    };
    const output = formatRebase(data);

    expect(output).toContain("Rebased 'feature' onto 'main'");
    expect(output).toContain("3 commit(s) rebased");
  });

  it("formats rebase with conflicts", () => {
    const data: GitRebase = {
      success: false,
      branch: "main",
      current: "feature",
      conflicts: ["src/index.ts", "src/utils.ts"],
    };
    const output = formatRebase(data);

    expect(output).toContain("paused with conflicts");
    expect(output).toContain("Conflicts: src/index.ts, src/utils.ts");
  });

  it("formats rebase abort", () => {
    const data: GitRebase = {
      success: true,
      branch: "",
      current: "feature",
      conflicts: [],
    };
    const output = formatRebase(data);

    expect(output).toBe("Rebase aborted on 'feature'");
  });

  it("formats successful rebase without commit count", () => {
    const data: GitRebase = {
      success: true,
      branch: "main",
      current: "feature",
      conflicts: [],
    };
    const output = formatRebase(data);

    expect(output).toBe("Rebased 'feature' onto 'main'");
  });

  it("formats rebase with conflicts but no conflict file list", () => {
    const data: GitRebase = {
      success: false,
      branch: "main",
      current: "feature",
      conflicts: [],
    };
    const output = formatRebase(data);

    expect(output).toContain("paused with conflicts");
    expect(output).not.toContain("Conflicts:");
  });
});
