import { describe, it, expect } from "vitest";
import { parseInfoJson, parseSearchJson } from "../src/lib/parsers.js";
import {
  formatInfo,
  compactInfoMap,
  formatInfoCompact,
  formatSearch,
  compactSearchMap,
  formatSearchCompact,
} from "../src/lib/formatters.js";
import type { NpmInfo, NpmSearch } from "../src/schemas/index.js";

// ── parseInfoJson ────────────────────────────────────────────────────

describe("parseInfoJson", () => {
  it("parses full package info with all fields", () => {
    const json = JSON.stringify({
      name: "express",
      version: "4.18.2",
      description: "Fast, unopinionated, minimalist web framework",
      homepage: "http://expressjs.com/",
      license: "MIT",
      dependencies: {
        accepts: "~1.3.8",
        "array-flatten": "1.1.1",
        "body-parser": "1.20.1",
      },
      dist: {
        tarball: "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
        fileCount: 214,
        unpackedSize: 220551,
      },
    });

    const result = parseInfoJson(json);

    expect(result.name).toBe("express");
    expect(result.version).toBe("4.18.2");
    expect(result.description).toBe("Fast, unopinionated, minimalist web framework");
    expect(result.homepage).toBe("http://expressjs.com/");
    expect(result.license).toBe("MIT");
    expect(result.dependencies).toEqual({
      accepts: "~1.3.8",
      "array-flatten": "1.1.1",
      "body-parser": "1.20.1",
    });
    expect(result.dist?.tarball).toBe("https://registry.npmjs.org/express/-/express-4.18.2.tgz");
    expect(result.dist).not.toHaveProperty("fileCount");
    expect(result.dist).not.toHaveProperty("unpackedSize");
  });

  it("handles minimal package info", () => {
    const json = JSON.stringify({
      name: "tiny-pkg",
      version: "1.0.0",
      description: "A tiny package",
    });

    const result = parseInfoJson(json);

    expect(result.name).toBe("tiny-pkg");
    expect(result.version).toBe("1.0.0");
    expect(result.description).toBe("A tiny package");
    expect(result.homepage).toBeUndefined();
    expect(result.license).toBeUndefined();
    expect(result.dependencies).toBeUndefined();
    expect(result.dist).toBeUndefined();
  });

  it("defaults name to 'unknown' when missing", () => {
    const json = JSON.stringify({ version: "1.0.0", description: "test" });
    const result = parseInfoJson(json);
    expect(result.name).toBe("unknown");
  });

  it("defaults version to '0.0.0' when missing", () => {
    const json = JSON.stringify({ name: "test", description: "test" });
    const result = parseInfoJson(json);
    expect(result.version).toBe("0.0.0");
  });

  it("defaults description to empty string when missing", () => {
    const json = JSON.stringify({ name: "test", version: "1.0.0" });
    const result = parseInfoJson(json);
    expect(result.description).toBe("");
  });

  it("omits empty dependencies object", () => {
    const json = JSON.stringify({
      name: "test",
      version: "1.0.0",
      description: "",
      dependencies: {},
    });
    const result = parseInfoJson(json);
    expect(result.dependencies).toBeUndefined();
  });

  it("omits dist when empty", () => {
    const json = JSON.stringify({
      name: "test",
      version: "1.0.0",
      description: "",
      dist: {},
    });
    const result = parseInfoJson(json);
    expect(result.dist).toBeUndefined();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseInfoJson("not valid json")).toThrow();
  });
});

// ── parseSearchJson ──────────────────────────────────────────────────

describe("parseSearchJson", () => {
  it("parses search results with all fields", () => {
    const json = JSON.stringify([
      {
        name: "express",
        version: "4.18.2",
        description: "Fast web framework",
        author: { name: "TJ Holowaychuk" },
        date: "2022-10-08T00:00:00.000Z",
      },
      {
        name: "koa",
        version: "2.14.2",
        description: "Koa web framework",
        author: { name: "TJ Holowaychuk" },
        date: "2023-01-01T00:00:00.000Z",
      },
    ]);

    const result = parseSearchJson(json);

    expect(result.packages).toHaveLength(2);
    expect(result.packages[0].name).toBe("express");
    expect(result.packages[0].version).toBe("4.18.2");
    expect(result.packages[0].description).toBe("Fast web framework");
    expect(result.packages[0].author).toBe("TJ Holowaychuk");
    expect(result.packages[0].date).toBe("2022-10-08T00:00:00.000Z");
    expect(result.packages[1].name).toBe("koa");
  });

  it("handles author as a string", () => {
    const json = JSON.stringify([
      {
        name: "pkg",
        version: "1.0.0",
        description: "test",
        author: "John Doe",
      },
    ]);

    const result = parseSearchJson(json);
    expect(result.packages[0].author).toBe("John Doe");
  });

  it("handles empty search results", () => {
    const result = parseSearchJson("[]");
    expect(result.packages).toEqual([]);
  });

  it("handles missing optional fields", () => {
    const json = JSON.stringify([
      {
        name: "simple-pkg",
        version: "0.1.0",
        description: "Simple package",
      },
    ]);

    const result = parseSearchJson(json);

    expect(result.packages[0].name).toBe("simple-pkg");
    expect(result.packages[0].author).toBeUndefined();
    expect(result.packages[0].date).toBeUndefined();
  });

  it("normalizes date values to ISO-8601", () => {
    const json = JSON.stringify([
      {
        name: "pkg",
        version: "1.0.0",
        description: "test",
        date: "2025-01-02 03:04:05",
      },
    ]);

    const result = parseSearchJson(json);
    expect(result.packages[0].date).toBe(new Date("2025-01-02 03:04:05").toISOString());
  });

  it("defaults missing fields gracefully", () => {
    const json = JSON.stringify([{}]);
    const result = parseSearchJson(json);

    expect(result.packages[0].name).toBe("unknown");
    expect(result.packages[0].version).toBe("0.0.0");
    expect(result.packages[0].description).toBe("");
  });

  it("handles non-array JSON by returning empty results", () => {
    const json = JSON.stringify({ name: "not-an-array" });
    const result = parseSearchJson(json);
    expect(result.packages).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseSearchJson("not valid json")).toThrow();
  });
});

// ── formatInfo ───────────────────────────────────────────────────────

describe("formatInfo", () => {
  it("formats full info with all fields", () => {
    const data: NpmInfo = {
      name: "express",
      version: "4.18.2",
      description: "Fast web framework",
      homepage: "http://expressjs.com/",
      license: "MIT",
      dependencies: { accepts: "~1.3.8", "body-parser": "1.20.1" },
      dist: { tarball: "https://registry.npmjs.org/express/-/express-4.18.2.tgz" },
    };
    const output = formatInfo(data);
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("Fast web framework");
    expect(output).toContain("License: MIT");
    expect(output).toContain("Homepage: http://expressjs.com/");
    expect(output).toContain("Dependencies: 2");
    expect(output).toContain("accepts: ~1.3.8");
    expect(output).toContain("Tarball: https://registry.npmjs.org/express/-/express-4.18.2.tgz");
  });

  it("formats minimal info", () => {
    const data: NpmInfo = {
      name: "tiny",
      version: "1.0.0",
      description: "",
    };
    const output = formatInfo(data);
    expect(output).toBe("tiny@1.0.0");
  });
});

// ── compactInfoMap ───────────────────────────────────────────────────

describe("compactInfoMap", () => {
  it("strips dependencies and dist, keeps core fields", () => {
    const data: NpmInfo = {
      name: "express",
      version: "4.18.2",
      description: "Fast web framework",
      homepage: "http://expressjs.com/",
      license: "MIT",
      dependencies: { accepts: "~1.3.8" },
      dist: { tarball: "https://registry.npmjs.org/express/-/express-4.18.2.tgz" },
    };
    const compact = compactInfoMap(data);
    expect(compact.name).toBe("express");
    expect(compact.version).toBe("4.18.2");
    expect(compact.description).toBe("Fast web framework");
    expect(compact.license).toBe("MIT");
    expect(compact.homepage).toBe("http://expressjs.com/");
    expect(compact).not.toHaveProperty("dependencies");
    expect(compact).not.toHaveProperty("dist");
  });

  it("omits license and homepage when not present", () => {
    const data: NpmInfo = {
      name: "pkg",
      version: "1.0.0",
      description: "test",
    };
    const compact = compactInfoMap(data);
    expect(compact.license).toBeUndefined();
    expect(compact.homepage).toBeUndefined();
  });
});

// ── formatInfoCompact ────────────────────────────────────────────────

describe("formatInfoCompact", () => {
  it("formats compact info output", () => {
    const output = formatInfoCompact({
      name: "express",
      version: "4.18.2",
      description: "Fast web framework",
      license: "MIT",
      homepage: "http://expressjs.com/",
    });
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("Fast web framework");
    expect(output).toContain("License: MIT");
    expect(output).toContain("Homepage: http://expressjs.com/");
  });

  it("formats minimal compact info", () => {
    const output = formatInfoCompact({
      name: "tiny",
      version: "1.0.0",
      description: "",
    });
    expect(output).toBe("tiny@1.0.0");
  });
});

// ── formatSearch ─────────────────────────────────────────────────────

describe("formatSearch", () => {
  it("formats search results with author", () => {
    const data: NpmSearch = {
      packages: [
        {
          name: "express",
          version: "4.18.2",
          description: "Fast web framework",
          author: "TJ",
        },
      ],
    };
    const output = formatSearch(data);
    expect(output).toContain("1 packages found:");
    expect(output).toContain("express@4.18.2 — Fast web framework by TJ");
  });

  it("formats empty search results", () => {
    const data: NpmSearch = { packages: [] };
    expect(formatSearch(data)).toBe("No packages found.");
  });

  it("formats search results without author", () => {
    const data: NpmSearch = {
      packages: [{ name: "pkg", version: "1.0.0", description: "A package" }],
    };
    const output = formatSearch(data);
    expect(output).toContain("pkg@1.0.0 — A package");
    expect(output).not.toContain(" by ");
  });
});

// ── compactSearchMap ─────────────────────────────────────────────────

describe("compactSearchMap", () => {
  it("strips author and date fields", () => {
    const data: NpmSearch = {
      packages: [
        {
          name: "express",
          version: "4.18.2",
          description: "Fast web framework",
          author: "TJ",
          date: "2022-10-08",
        },
      ],
    };
    const compact = compactSearchMap(data);
    expect(compact.packages[0]).toEqual({
      name: "express",
      version: "4.18.2",
      description: "Fast web framework",
    });
    expect(compact.packages[0]).not.toHaveProperty("author");
    expect(compact.packages[0]).not.toHaveProperty("date");
  });
});

// ── formatSearchCompact ──────────────────────────────────────────────

describe("formatSearchCompact", () => {
  it("formats compact search results", () => {
    const output = formatSearchCompact({
      packages: [{ name: "express", version: "4.18.2", description: "Fast web framework" }],
    });
    expect(output).toContain("1 packages found:");
    expect(output).toContain("express@4.18.2 — Fast web framework");
  });

  it("formats empty compact results", () => {
    expect(formatSearchCompact({ packages: [] })).toBe("No packages found.");
  });
});
