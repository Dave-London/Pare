import { describe, it, expect } from "vitest";
import { parseWebpackOutput } from "../src/lib/parsers.js";
import { formatWebpack } from "../src/lib/formatters.js";
import type { WebpackResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WEBPACK_JSON_SUCCESS = JSON.stringify({
  assets: [
    { name: "main.js", size: 52480 },
    { name: "vendor.js", size: 143360 },
    { name: "styles.css", size: 8192 },
  ],
  errors: [],
  warnings: [],
  modules: [{ name: "./src/index.ts" }, { name: "./src/app.ts" }, { name: "./src/utils.ts" }],
});

const WEBPACK_JSON_WITH_ERRORS = JSON.stringify({
  assets: [],
  errors: [
    { message: "Module not found: Error: Can't resolve './missing' in '/src'" },
    { message: "Module build failed: SyntaxError: Unexpected token" },
  ],
  warnings: [],
  modules: [],
});

const WEBPACK_JSON_WITH_WARNINGS = JSON.stringify({
  assets: [{ name: "bundle.js", size: 524288 }],
  errors: [],
  warnings: [
    {
      message:
        "asset size limit: The following asset(s) exceed the recommended size limit (244 KiB)",
    },
    "Critical dependency: the request of a dependency is an expression",
  ],
  modules: [{ name: "./src/index.ts" }],
});

const WEBPACK_JSON_WITH_STRING_ERRORS = JSON.stringify({
  assets: [],
  errors: ["Module not found: './missing'", "Compilation failed"],
  warnings: ["Deprecation warning: use new API"],
  modules: 42,
});

const WEBPACK_JSON_EMPTY_BUILD = JSON.stringify({
  assets: [],
  errors: [],
  warnings: [],
});

const WEBPACK_TEXT_FALLBACK = [
  "Hash: abc123",
  "Version: webpack 5.90.0",
  "Time: 1234ms",
  "ERROR in ./src/index.ts",
  "Module not found: Error: Can't resolve './missing'",
  "WARNING in ./src/utils.ts",
  "Unused export 'helper'",
].join("\n");

const WEBPACK_JSON_WITH_PREFIX = [
  "Some webpack output before JSON",
  JSON.stringify({
    assets: [{ name: "main.js", size: 10240 }],
    errors: [],
    warnings: [],
    modules: 5,
  }),
].join("\n");

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseWebpackOutput", () => {
  it("parses JSON output with assets and modules", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_SUCCESS, "", 0, 2.5);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(2.5);
    expect(result.assets).toHaveLength(3);
    expect(result.assets[0]).toEqual({ name: "main.js", size: 52480 });
    expect(result.assets[1]).toEqual({ name: "vendor.js", size: 143360 });
    expect(result.assets[2]).toEqual({ name: "styles.css", size: 8192 });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.modules).toBe(3);
  });

  it("parses JSON output with object errors", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_WITH_ERRORS, "", 1, 1.0);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("Module not found");
    expect(result.errors[1]).toContain("SyntaxError");
    expect(result.assets).toEqual([]);
  });

  it("parses JSON output with mixed warning formats", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_WITH_WARNINGS, "", 0, 3.0);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain("asset size limit");
    expect(result.warnings[1]).toContain("Critical dependency");
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBe("bundle.js");
  });

  it("parses JSON output with string errors and numeric modules", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_WITH_STRING_ERRORS, "", 1, 0.5);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toBe("Module not found: './missing'");
    expect(result.errors[1]).toBe("Compilation failed");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Deprecation warning");
    expect(result.modules).toBe(42);
  });

  it("parses empty JSON build", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_EMPTY_BUILD, "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.assets).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.modules).toBeUndefined();
  });

  it("falls back to text parsing when JSON is invalid", () => {
    const result = parseWebpackOutput(WEBPACK_TEXT_FALLBACK, "", 1, 1.5);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorText = result.errors.join(" ");
    expect(errorText).toContain("ERROR");
    expect(result.assets).toEqual([]);
  });

  it("handles JSON with preceding text (finds JSON object)", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_WITH_PREFIX, "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].name).toBe("main.js");
    expect(result.modules).toBe(5);
  });

  it("handles completely empty output", () => {
    const result = parseWebpackOutput("", "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.assets).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("marks as failed when JSON has errors even with exit code 0", () => {
    // webpack can sometimes exit 0 even with errors
    const result = parseWebpackOutput(WEBPACK_JSON_WITH_ERRORS, "", 0, 1.0);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("preserves duration exactly", () => {
    const result = parseWebpackOutput(WEBPACK_JSON_EMPTY_BUILD, "", 0, 5.678);
    expect(result.duration).toBe(5.678);
  });

  it("handles text fallback with warnings", () => {
    const stdout = ["Build output", "WARNING in ./src/utils.ts: unused export"].join("\n");
    const result = parseWebpackOutput(stdout, "", 0, 0.5);

    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe("formatWebpack", () => {
  it("formats successful build with assets and modules", () => {
    const data: WebpackResult = {
      success: true,
      duration: 2.5,
      assets: [
        { name: "main.js", size: 52480 },
        { name: "vendor.js", size: 143360 },
      ],
      errors: [],
      warnings: [],
      modules: 42,
    };
    const output = formatWebpack(data);
    expect(output).toContain("webpack: build succeeded in 2.5s");
    expect(output).toContain("2 assets");
    expect(output).toContain("42 modules");
    expect(output).toContain("main.js");
    expect(output).toContain("51.3 kB"); // 52480 / 1024 = 51.25, rounds to 51.3
    expect(output).toContain("vendor.js");
    expect(output).toContain("140.0 kB"); // 143360 / 1024 = 140.0
  });

  it("formats successful build with no assets", () => {
    const data: WebpackResult = {
      success: true,
      duration: 0.5,
      assets: [],
      errors: [],
      warnings: [],
    };
    const output = formatWebpack(data);
    expect(output).toBe("webpack: build succeeded in 0.5s");
  });

  it("formats successful build with warnings", () => {
    const data: WebpackResult = {
      success: true,
      duration: 3.0,
      assets: [{ name: "bundle.js", size: 524288 }],
      errors: [],
      warnings: ["Asset size limit exceeded"],
      modules: 10,
    };
    const output = formatWebpack(data);
    expect(output).toContain("1 warnings");
  });

  it("formats failed build with errors", () => {
    const data: WebpackResult = {
      success: false,
      duration: 1.0,
      assets: [],
      errors: ["Module not found: ./missing", "Compilation failed"],
      warnings: [],
    };
    const output = formatWebpack(data);
    expect(output).toContain("webpack: build failed (1s)");
    expect(output).toContain("Module not found: ./missing");
    expect(output).toContain("Compilation failed");
  });

  it("formats build with no modules info", () => {
    const data: WebpackResult = {
      success: true,
      duration: 1.0,
      assets: [{ name: "main.js", size: 1024 }],
      errors: [],
      warnings: [],
    };
    const output = formatWebpack(data);
    expect(output).toContain("1 assets");
    expect(output).not.toContain("modules");
  });
});
