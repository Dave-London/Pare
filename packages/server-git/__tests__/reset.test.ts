import { describe, it, expect } from "vitest";
import { parseReset } from "../src/lib/parsers.js";
import { formatReset } from "../src/lib/formatters.js";
import type { GitReset } from "../src/schemas/index.js";

describe("parseReset", () => {
  it("parses unstaged files from git reset output", () => {
    const stdout = "Unstaged changes after reset:\nM\tsrc/index.ts\nM\tsrc/app.ts\n";

    const result = parseReset(stdout, "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.unstaged).toEqual(["src/index.ts", "src/app.ts"]);
  });

  it("parses deleted files from reset output", () => {
    const stdout = "Unstaged changes after reset:\nD\told-file.ts\n";

    const result = parseReset(stdout, "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.unstaged).toEqual(["old-file.ts"]);
  });

  it("parses added files from reset output", () => {
    const stdout = "Unstaged changes after reset:\nA\tnew-file.ts\n";

    const result = parseReset(stdout, "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.unstaged).toEqual(["new-file.ts"]);
  });

  it("handles empty output (nothing was staged)", () => {
    const result = parseReset("", "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.unstaged).toEqual([]);
  });

  it("handles output with no file lines", () => {
    const result = parseReset("Unstaged changes after reset:\n", "", "HEAD");

    expect(result.ref).toBe("HEAD");
    expect(result.unstaged).toEqual([]);
  });

  it("uses the provided ref", () => {
    const result = parseReset("", "", "abc1234");

    expect(result.ref).toBe("abc1234");
    expect(result.unstaged).toEqual([]);
  });

  it("parses mixed status types", () => {
    const stdout = [
      "Unstaged changes after reset:",
      "M\tmodified.ts",
      "D\tdeleted.ts",
      "A\tadded.ts",
    ].join("\n");

    const result = parseReset(stdout, "", "HEAD");

    expect(result.unstaged).toEqual(["modified.ts", "deleted.ts", "added.ts"]);
  });

  it("handles output in stderr (some git versions)", () => {
    const stderr = "Unstaged changes after reset:\nM\tsrc/file.ts\n";

    const result = parseReset("", stderr, "HEAD");

    expect(result.unstaged).toEqual(["src/file.ts"]);
  });
});

describe("formatReset", () => {
  it("formats reset with unstaged files", () => {
    const data: GitReset = { ref: "HEAD", unstaged: ["src/a.ts", "src/b.ts"] };
    expect(formatReset(data)).toBe("Reset to HEAD: unstaged 2 file(s): src/a.ts, src/b.ts");
  });

  it("formats reset with no unstaged files", () => {
    const data: GitReset = { ref: "HEAD", unstaged: [] };
    expect(formatReset(data)).toBe("Reset to HEAD — no files unstaged");
  });

  it("formats reset with single unstaged file", () => {
    const data: GitReset = { ref: "HEAD", unstaged: ["README.md"] };
    expect(formatReset(data)).toBe("Reset to HEAD: unstaged 1 file(s): README.md");
  });

  it("formats reset with custom ref", () => {
    const data: GitReset = { ref: "abc1234", unstaged: ["file.ts"] };
    expect(formatReset(data)).toBe("Reset to abc1234: unstaged 1 file(s): file.ts");
  });
});
