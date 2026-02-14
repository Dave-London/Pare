import { describe, it, expect } from "vitest";
import { parseReleaseList } from "../src/lib/parsers.js";
import {
  formatReleaseList,
  compactReleaseListMap,
  formatReleaseListCompact,
} from "../src/lib/formatters.js";
import type { ReleaseListResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseReleaseList", () => {
  it("parses release list JSON", () => {
    const json = JSON.stringify([
      {
        tagName: "v1.0.0",
        name: "Version 1.0.0",
        isDraft: false,
        isPrerelease: false,
        publishedAt: "2024-01-15T10:00:00Z",
        url: "https://github.com/owner/repo/releases/tag/v1.0.0",
      },
      {
        tagName: "v0.9.0-beta",
        name: "Beta Release",
        isDraft: false,
        isPrerelease: true,
        publishedAt: "2024-01-10T08:00:00Z",
        url: "https://github.com/owner/repo/releases/tag/v0.9.0-beta",
      },
    ]);

    const result = parseReleaseList(json);

    expect(result.total).toBe(2);
    expect(result.releases[0]).toEqual({
      tag: "v1.0.0",
      name: "Version 1.0.0",
      draft: false,
      prerelease: false,
      publishedAt: "2024-01-15T10:00:00Z",
      url: "https://github.com/owner/repo/releases/tag/v1.0.0",
    });
    expect(result.releases[1].tag).toBe("v0.9.0-beta");
    expect(result.releases[1].prerelease).toBe(true);
  });

  it("handles empty list", () => {
    const result = parseReleaseList("[]");
    expect(result.total).toBe(0);
    expect(result.releases).toEqual([]);
  });

  it("handles draft releases", () => {
    const json = JSON.stringify([
      {
        tagName: "v2.0.0",
        name: "Draft Release",
        isDraft: true,
        isPrerelease: false,
        publishedAt: "",
        url: "https://github.com/owner/repo/releases/tag/v2.0.0",
      },
    ]);

    const result = parseReleaseList(json);

    expect(result.releases[0].draft).toBe(true);
    expect(result.releases[0].prerelease).toBe(false);
  });

  it("handles missing optional fields with defaults", () => {
    const json = JSON.stringify([{ tagName: "v1.0.0" }]);

    const result = parseReleaseList(json);

    expect(result.releases[0]).toEqual({
      tag: "v1.0.0",
      name: "",
      draft: false,
      prerelease: false,
      publishedAt: "",
      url: "",
    });
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatReleaseList", () => {
  it("formats a release list", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v1.0.0",
          name: "Version 1.0.0",
          draft: false,
          prerelease: false,
          publishedAt: "2024-01-15T10:00:00Z",
          url: "https://github.com/owner/repo/releases/tag/v1.0.0",
        },
      ],
      total: 1,
    };
    const output = formatReleaseList(data);
    expect(output).toContain("1 releases:");
    expect(output).toContain("v1.0.0 Version 1.0.0 — 2024-01-15T10:00:00Z");
  });

  it("formats empty list", () => {
    const data: ReleaseListResult = { releases: [], total: 0 };
    expect(formatReleaseList(data)).toBe("No releases found.");
  });

  it("shows draft and prerelease flags", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v2.0.0-alpha",
          name: "Alpha",
          draft: true,
          prerelease: true,
          publishedAt: "2024-02-01T00:00:00Z",
          url: "https://github.com/owner/repo/releases/tag/v2.0.0-alpha",
        },
      ],
      total: 1,
    };
    const output = formatReleaseList(data);
    expect(output).toContain("(draft, prerelease)");
  });

  it("shows only draft flag when not prerelease", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v2.0.0",
          name: "Draft",
          draft: true,
          prerelease: false,
          publishedAt: "",
          url: "https://url",
        },
      ],
      total: 1,
    };
    const output = formatReleaseList(data);
    expect(output).toContain("(draft)");
    expect(output).not.toContain("prerelease");
  });
});

// ── Compact formatter tests ─────────────────────────────────────────

describe("compactReleaseList", () => {
  it("maps to compact format", () => {
    const data: ReleaseListResult = {
      releases: [
        {
          tag: "v1.0.0",
          name: "Version 1.0.0",
          draft: false,
          prerelease: false,
          publishedAt: "2024-01-15T10:00:00Z",
          url: "https://github.com/owner/repo/releases/tag/v1.0.0",
        },
      ],
      total: 1,
    };
    const compact = compactReleaseListMap(data);
    expect(compact.releases[0]).not.toHaveProperty("url");
    expect(compact.releases[0]).not.toHaveProperty("publishedAt");
    expect(compact.releases[0].tag).toBe("v1.0.0");
    expect(compact.total).toBe(1);

    const text = formatReleaseListCompact(compact);
    expect(text).toContain("1 releases:");
    expect(text).toContain("v1.0.0 Version 1.0.0");
  });

  it("formats empty compact list", () => {
    const compact = compactReleaseListMap({ releases: [], total: 0 });
    expect(formatReleaseListCompact(compact)).toBe("No releases found.");
  });
});
