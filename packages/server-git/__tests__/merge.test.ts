import { describe, it, expect } from "vitest";
import { parseMerge, parseMergeAbort } from "../src/lib/parsers.js";
import { formatMerge } from "../src/lib/formatters.js";
import { assertNoFlagInjection } from "@paretools/shared";
import type { GitMerge } from "../src/schemas/index.js";

// ── Parser tests ─────────────────────────────────────────────────────

describe("parseMerge", () => {
  it("parses fast-forward merge", () => {
    const stdout =
      "Updating abc1234..def5678\nFast-forward\n file.txt | 1 +\n 1 file changed, 1 insertion(+)";
    const result = parseMerge(stdout, "", "feature");

    expect(result.merged).toBe(true);
    expect(result.state).toBe("fast-forward");
    expect(result.fastForward).toBe(true);
    expect(result.branch).toBe("feature");
    expect(result.conflicts).toEqual([]);
    expect(result.commitHash).toBe("def5678");
  });

  it("parses non-fast-forward (3-way) merge", () => {
    const stdout =
      "Merge made by the 'ort' strategy.\n file.txt | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)";
    const stderr = "";
    const result = parseMerge(stdout, stderr, "feature/auth");

    expect(result.merged).toBe(true);
    expect(result.state).toBe("completed");
    expect(result.fastForward).toBe(false);
    expect(result.branch).toBe("feature/auth");
    expect(result.conflicts).toEqual([]);
  });

  it("parses merge with conflicts", () => {
    const stdout =
      "Auto-merging src/index.ts\nCONFLICT (content): Merge conflict in src/index.ts\nAuto-merging README.md\nCONFLICT (content): Merge conflict in README.md\nAutomatic merge failed; fix conflicts and then commit the result.";
    const result = parseMerge(stdout, "", "feature/breaking");

    expect(result.merged).toBe(false);
    expect(result.state).toBe("conflict");
    expect(result.fastForward).toBe(false);
    expect(result.branch).toBe("feature/breaking");
    expect(result.conflicts).toEqual(["src/index.ts", "README.md"]);
    expect(result.commitHash).toBeUndefined();
  });

  it("parses single conflict", () => {
    const stdout =
      "Auto-merging app.ts\nCONFLICT (content): Merge conflict in app.ts\nAutomatic merge failed; fix conflicts and then commit the result.";
    const result = parseMerge(stdout, "", "hotfix");

    expect(result.merged).toBe(false);
    expect(result.conflicts).toEqual(["app.ts"]);
  });

  it("parses merge with add/add conflict", () => {
    const stdout =
      "CONFLICT (add/add): Merge conflict in new-file.ts\nAutomatic merge failed; fix conflicts and then commit the result.";
    const result = parseMerge(stdout, "", "add-branch");

    expect(result.merged).toBe(false);
    expect(result.conflicts).toEqual(["new-file.ts"]);
  });

  it("handles already up-to-date merge", () => {
    const stdout = "Already up to date.";
    const result = parseMerge(stdout, "", "main");

    expect(result.merged).toBe(true);
    expect(result.state).toBe("already-up-to-date");
    expect(result.fastForward).toBe(false);
    expect(result.branch).toBe("main");
    expect(result.conflicts).toEqual([]);
  });

  it("extracts commit hash from fast-forward range", () => {
    const stdout = "Updating a1b2c3d..e4f5a6b\nFast-forward";
    const result = parseMerge(stdout, "", "feature");

    expect(result.commitHash).toBe("e4f5a6b");
  });

  it("handles merge with recursive strategy", () => {
    const stdout =
      "Merge made by the 'recursive' strategy.\n src/app.ts | 5 +++++\n 1 file changed, 5 insertions(+)";
    const result = parseMerge(stdout, "", "legacy-branch");

    expect(result.merged).toBe(true);
    expect(result.fastForward).toBe(false);
    expect(result.branch).toBe("legacy-branch");
  });
});

describe("parseMergeAbort", () => {
  it("returns merge-aborted result", () => {
    const result = parseMergeAbort("", "");

    expect(result.merged).toBe(false);
    expect(result.fastForward).toBe(false);
    expect(result.branch).toBe("");
    expect(result.conflicts).toEqual([]);
  });
});

// ── Formatter tests ──────────────────────────────────────────────────

describe("formatMerge", () => {
  it("formats fast-forward merge", () => {
    const data: GitMerge = {
      merged: true,
      state: "fast-forward",
      fastForward: true,
      branch: "feature",
      conflicts: [],
      commitHash: "abc1234",
    };
    expect(formatMerge(data)).toBe("Fast-forward merge of 'feature' (abc1234)");
  });

  it("formats non-fast-forward merge", () => {
    const data: GitMerge = {
      merged: true,
      state: "completed",
      fastForward: false,
      branch: "feature/auth",
      conflicts: [],
      commitHash: "def5678",
    };
    expect(formatMerge(data)).toBe("Merged 'feature/auth' (def5678)");
  });

  it("formats merge without commit hash", () => {
    const data: GitMerge = {
      merged: true,
      state: "completed",
      fastForward: false,
      branch: "main",
      conflicts: [],
    };
    expect(formatMerge(data)).toBe("Merged 'main'");
  });

  it("formats merge with conflicts", () => {
    const data: GitMerge = {
      merged: false,
      state: "conflict",
      fastForward: false,
      branch: "feature/breaking",
      conflicts: ["src/index.ts", "README.md"],
    };
    expect(formatMerge(data)).toBe(
      "Merge of 'feature/breaking' failed with 2 conflict(s) [conflict]: src/index.ts, README.md",
    );
  });

  it("formats single conflict", () => {
    const data: GitMerge = {
      merged: false,
      state: "conflict",
      fastForward: false,
      branch: "hotfix",
      conflicts: ["app.ts"],
    };
    expect(formatMerge(data)).toBe(
      "Merge of 'hotfix' failed with 1 conflict(s) [conflict]: app.ts",
    );
  });

  it("formats merge abort", () => {
    const data: GitMerge = {
      merged: false,
      state: "completed",
      fastForward: false,
      branch: "",
      conflicts: [],
    };
    expect(formatMerge(data)).toBe("Merge aborted");
  });

  it("formats already-up-to-date merge", () => {
    const data: GitMerge = {
      merged: true,
      state: "already-up-to-date",
      fastForward: false,
      branch: "main",
      conflicts: [],
    };
    expect(formatMerge(data)).toBe("Already up to date with 'main'");
  });
});

// ── Security tests ───────────────────────────────────────────────────

describe("security: merge tool — branch validation", () => {
  const MALICIOUS_INPUTS = [
    "--force",
    "--amend",
    "-rf",
    "--no-verify",
    "--exec=rm -rf /",
    "-u",
    "--delete",
    "--hard",
    "--output=/etc/passwd",
    "-D",
    " --force",
    "\t--delete",
  ];

  it("rejects flag-like branch names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "branch")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: merge tool — message validation", () => {
  const MALICIOUS_INPUTS = [
    "--force",
    "--amend",
    "-rf",
    "--no-verify",
    "--exec=rm -rf /",
    " --force",
    "\t--delete",
  ];

  it("rejects flag-like merge messages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "message")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe merge messages", () => {
    const safe = ["Merge feature into main", "Release v2.0", "Merge branch 'hotfix'"];
    for (const msg of safe) {
      expect(() => assertNoFlagInjection(msg, "message")).not.toThrow();
    }
  });
});
