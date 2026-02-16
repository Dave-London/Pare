import { describe, it, expect } from "vitest";
import { parseGistCreate } from "../src/lib/parsers.js";
import { formatGistCreate } from "../src/lib/formatters.js";
import type { GistCreateResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseGistCreate", () => {
  it("parses gist create output with URL and extracts ID", () => {
    const stdout = "https://gist.github.com/abc123def456\n";

    const result = parseGistCreate(stdout, false);

    expect(result.id).toBe("abc123def456");
    expect(result.url).toBe("https://gist.github.com/abc123def456");
    expect(result.public).toBe(false);
  });

  it("parses public gist output", () => {
    const stdout = "https://gist.github.com/deadbeef0123\n";

    const result = parseGistCreate(stdout, true);

    expect(result.id).toBe("deadbeef0123");
    expect(result.url).toBe("https://gist.github.com/deadbeef0123");
    expect(result.public).toBe(true);
  });

  it("trims whitespace from URL", () => {
    const stdout = "  https://gist.github.com/abc123def456  \n";

    const result = parseGistCreate(stdout, false);

    expect(result.url).toBe("https://gist.github.com/abc123def456");
    expect(result.id).toBe("abc123def456");
  });

  it("handles URL with no matching ID gracefully", () => {
    const stdout = "https://gist.github.com/\n";

    const result = parseGistCreate(stdout, false);

    expect(result.id).toBe("");
    expect(result.url).toBe("https://gist.github.com/");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatGistCreate", () => {
  it("formats a secret gist", () => {
    const data: GistCreateResult = {
      id: "abc123def456",
      url: "https://gist.github.com/abc123def456",
      public: false,
    };
    expect(formatGistCreate(data)).toBe(
      "Created secret gist abc123def456: https://gist.github.com/abc123def456",
    );
  });

  it("formats a public gist", () => {
    const data: GistCreateResult = {
      id: "deadbeef0123",
      url: "https://gist.github.com/deadbeef0123",
      public: true,
    };
    expect(formatGistCreate(data)).toBe(
      "Created public gist deadbeef0123: https://gist.github.com/deadbeef0123",
    );
  });
});

// ── P1-gap #143: Content-based gist creation ────────────────────────

describe("parseGistCreate — content-based (P1 #143)", () => {
  it("includes content filenames in output", () => {
    const stdout = "https://gist.github.com/abc123def456\n";

    const result = parseGistCreate(stdout, false, ["script.py", "helper.js"], "My scripts");

    expect(result.files).toEqual(["script.py", "helper.js"]);
    expect(result.fileCount).toBe(2);
    expect(result.description).toBe("My scripts");
  });

  it("handles single content file", () => {
    const stdout = "https://gist.github.com/deadbeef0123\n";

    const result = parseGistCreate(stdout, true, ["README.md"]);

    expect(result.files).toEqual(["README.md"]);
    expect(result.fileCount).toBe(1);
    expect(result.public).toBe(true);
  });
});

describe("formatGistCreate — with files and description (P1 #143)", () => {
  it("formats gist with files and description", () => {
    const data: GistCreateResult = {
      id: "abc123",
      url: "https://gist.github.com/abc123",
      public: false,
      files: ["script.py", "helper.js"],
      description: "My scripts",
      fileCount: 2,
    };
    const output = formatGistCreate(data);

    expect(output).toContain("script.py, helper.js");
    expect(output).toContain("My scripts");
    expect(output).toContain("secret");
  });
});
