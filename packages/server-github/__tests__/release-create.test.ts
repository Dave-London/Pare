import { describe, it, expect } from "vitest";
import { parseReleaseCreate } from "../src/lib/parsers.js";
import { formatReleaseCreate } from "../src/lib/formatters.js";
import type { ReleaseCreateResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseReleaseCreate", () => {
  it("parses release create output with URL", () => {
    const stdout = "https://github.com/owner/repo/releases/tag/v1.0.0\n";

    const result = parseReleaseCreate(stdout, "v1.0.0", false, false);

    expect(result.tag).toBe("v1.0.0");
    expect(result.url).toBe("https://github.com/owner/repo/releases/tag/v1.0.0");
    expect(result.draft).toBe(false);
    expect(result.prerelease).toBe(false);
  });

  it("parses draft release output", () => {
    const stdout = "https://github.com/owner/repo/releases/tag/v2.0.0-beta\n";

    const result = parseReleaseCreate(stdout, "v2.0.0-beta", true, false);

    expect(result.tag).toBe("v2.0.0-beta");
    expect(result.url).toBe("https://github.com/owner/repo/releases/tag/v2.0.0-beta");
    expect(result.draft).toBe(true);
    expect(result.prerelease).toBe(false);
  });

  it("parses prerelease output", () => {
    const stdout = "https://github.com/owner/repo/releases/tag/v3.0.0-rc.1\n";

    const result = parseReleaseCreate(stdout, "v3.0.0-rc.1", false, true);

    expect(result.tag).toBe("v3.0.0-rc.1");
    expect(result.url).toBe("https://github.com/owner/repo/releases/tag/v3.0.0-rc.1");
    expect(result.draft).toBe(false);
    expect(result.prerelease).toBe(true);
  });

  it("parses draft prerelease output", () => {
    const stdout = "https://github.com/owner/repo/releases/tag/v4.0.0-alpha\n";

    const result = parseReleaseCreate(stdout, "v4.0.0-alpha", true, true);

    expect(result.tag).toBe("v4.0.0-alpha");
    expect(result.draft).toBe(true);
    expect(result.prerelease).toBe(true);
  });

  it("trims whitespace from URL", () => {
    const stdout = "  https://github.com/owner/repo/releases/tag/v1.0.0  \n";

    const result = parseReleaseCreate(stdout, "v1.0.0", false, false);

    expect(result.url).toBe("https://github.com/owner/repo/releases/tag/v1.0.0");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatReleaseCreate", () => {
  it("formats a standard release", () => {
    const data: ReleaseCreateResult = {
      tag: "v1.0.0",
      url: "https://github.com/owner/repo/releases/tag/v1.0.0",
      draft: false,
      prerelease: false,
    };
    expect(formatReleaseCreate(data)).toBe(
      "Created release v1.0.0: https://github.com/owner/repo/releases/tag/v1.0.0",
    );
  });

  it("formats a draft release", () => {
    const data: ReleaseCreateResult = {
      tag: "v2.0.0",
      url: "https://github.com/owner/repo/releases/tag/v2.0.0",
      draft: true,
      prerelease: false,
    };
    expect(formatReleaseCreate(data)).toBe(
      "Created release v2.0.0 (draft): https://github.com/owner/repo/releases/tag/v2.0.0",
    );
  });

  it("formats a prerelease", () => {
    const data: ReleaseCreateResult = {
      tag: "v3.0.0-rc.1",
      url: "https://github.com/owner/repo/releases/tag/v3.0.0-rc.1",
      draft: false,
      prerelease: true,
    };
    expect(formatReleaseCreate(data)).toBe(
      "Created release v3.0.0-rc.1 (prerelease): https://github.com/owner/repo/releases/tag/v3.0.0-rc.1",
    );
  });

  it("formats a draft prerelease", () => {
    const data: ReleaseCreateResult = {
      tag: "v4.0.0-alpha",
      url: "https://github.com/owner/repo/releases/tag/v4.0.0-alpha",
      draft: true,
      prerelease: true,
    };
    expect(formatReleaseCreate(data)).toBe(
      "Created release v4.0.0-alpha (draft, prerelease): https://github.com/owner/repo/releases/tag/v4.0.0-alpha",
    );
  });
});
