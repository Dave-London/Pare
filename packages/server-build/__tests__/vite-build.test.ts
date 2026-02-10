import { describe, it, expect } from "vitest";
import { parseViteBuildOutput } from "../src/lib/parsers.js";
import { formatViteBuild } from "../src/lib/formatters.js";
import type { ViteBuildResult } from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VITE_SUCCESS_OUTPUT = [
  "vite v6.3.5 building for production...",
  "transforming...",
  "✓ 42 modules transformed.",
  "rendering chunks...",
  "computing gzip size...",
  "dist/index.html                  0.45 kB │ gzip: 0.29 kB",
  "dist/assets/index-abc123.css     8.12 kB │ gzip: 2.34 kB",
  "dist/assets/index-def456.js     52.31 kB │ gzip: 16.89 kB",
  "dist/assets/vendor-ghi789.js   142.05 kB │ gzip: 45.12 kB",
  "✓ built in 1.23s",
].join("\n");

const VITE_EMPTY_OUTPUT = [
  "vite v6.3.5 building for production...",
  "✓ 0 modules transformed.",
  "✓ built in 0.05s",
].join("\n");

const VITE_ERROR_OUTPUT = [
  "vite v6.3.5 building for production...",
  "transforming...",
  "error during build:",
  'Error: Could not resolve "./missing" from "src/index.ts"',
  "    at file:///node_modules/rollup/dist/es/rollup.js:1234:56",
].join("\n");

const VITE_WARNING_OUTPUT = [
  "vite v6.3.5 building for production...",
  "(!) Some chunks are larger than 500 kB after minification. Consider:",
  "  - Using dynamic import() to code-split the application",
  "  - Use build.rollupOptions.output.manualChunks to improve chunking",
  "  - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit",
  "dist/index.html                  0.45 kB │ gzip: 0.29 kB",
  "dist/assets/index-abc123.js    752.31 kB │ gzip: 216.89 kB",
  "✓ built in 3.45s",
].join("\n");

const VITE_SINGLE_FILE = ["dist/bundle.js     12.50 kB │ gzip: 4.20 kB"].join("\n");

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseViteBuildOutput", () => {
  it("parses successful build with multiple output files", () => {
    const result = parseViteBuildOutput(VITE_SUCCESS_OUTPUT, "", 0, 1.2);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(1.2);
    expect(result.errors).toEqual([]);
    expect(result.outputs).toHaveLength(4);

    expect(result.outputs[0]).toEqual({ file: "dist/index.html", size: "0.45 kB" });
    expect(result.outputs[1]).toEqual({ file: "dist/assets/index-abc123.css", size: "8.12 kB" });
    expect(result.outputs[2]).toEqual({ file: "dist/assets/index-def456.js", size: "52.31 kB" });
    expect(result.outputs[3]).toEqual({ file: "dist/assets/vendor-ghi789.js", size: "142.05 kB" });
  });

  it("parses empty project with no output files", () => {
    const result = parseViteBuildOutput(VITE_EMPTY_OUTPUT, "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.outputs).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("parses build error", () => {
    const result = parseViteBuildOutput("", VITE_ERROR_OUTPUT, 1, 0.5);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorText = result.errors.join(" ");
    expect(errorText).toContain("error");
  });

  it("parses build with warnings", () => {
    const result = parseViteBuildOutput(VITE_WARNING_OUTPUT, "", 0, 3.5);

    expect(result.success).toBe(true);
    // The warning line contains "warning" in the text about chunkSizeWarningLimit
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.outputs.length).toBeGreaterThanOrEqual(1);
  });

  it("parses single output file", () => {
    const result = parseViteBuildOutput(VITE_SINGLE_FILE, "", 0, 0.5);

    expect(result.success).toBe(true);
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].file).toBe("dist/bundle.js");
    expect(result.outputs[0].size).toBe("12.50 kB");
  });

  it("handles completely empty output", () => {
    const result = parseViteBuildOutput("", "", 0, 0.1);

    expect(result.success).toBe(true);
    expect(result.outputs).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("filters lines starting with 'vite' or 'building' but keeps user data", () => {
    // Lines that look like output files but start with "vite" or "building" should be skipped
    const stdout = [
      "vite v6.3.5 building for production...",
      "building something                100.00 kB │ gzip: 50.00 kB",
      "dist/vite-plugin-output.js         12.34 kB │ gzip: 4.56 kB",
      "dist/building-blocks.js            8.00 kB │ gzip: 3.00 kB",
    ].join("\n");
    const result = parseViteBuildOutput(stdout, "", 0, 1.0);

    expect(result.success).toBe(true);
    // "vite v6.3.5 building..." does not match the output regex (no multi-space padding)
    // "building something" starts with "building" so it is filtered out
    // "dist/vite-plugin-output.js" does NOT start with "vite" so it is kept
    // "dist/building-blocks.js" does NOT start with "building" so it is kept
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0].file).toBe("dist/vite-plugin-output.js");
    expect(result.outputs[1].file).toBe("dist/building-blocks.js");
  });

  it("handles error in stderr with error details in stdout", () => {
    const stderr = "Error: ENOENT: no such file or directory";
    const result = parseViteBuildOutput("", stderr, 1, 0.1);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("preserves duration exactly", () => {
    const result = parseViteBuildOutput("", "", 0, 7.891);
    expect(result.duration).toBe(7.891);
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe("formatViteBuild", () => {
  it("formats successful build with output files", () => {
    const data: ViteBuildResult = {
      success: true,
      duration: 1.5,
      outputs: [
        { file: "dist/index.html", size: "0.45 kB" },
        { file: "dist/assets/index.js", size: "52.31 kB" },
      ],
      errors: [],
      warnings: [],
    };
    const output = formatViteBuild(data);
    expect(output).toContain("Vite build succeeded in 1.5s");
    expect(output).toContain("2 output files");
    expect(output).toContain("dist/index.html");
    expect(output).toContain("0.45 kB");
    expect(output).toContain("dist/assets/index.js");
    expect(output).toContain("52.31 kB");
  });

  it("formats successful build with no output files", () => {
    const data: ViteBuildResult = {
      success: true,
      duration: 0.1,
      outputs: [],
      errors: [],
      warnings: [],
    };
    const output = formatViteBuild(data);
    expect(output).toBe("Vite build succeeded in 0.1s");
  });

  it("formats successful build with warnings", () => {
    const data: ViteBuildResult = {
      success: true,
      duration: 3.0,
      outputs: [{ file: "dist/bundle.js", size: "752 kB" }],
      errors: [],
      warnings: ["Chunk size exceeds limit"],
    };
    const output = formatViteBuild(data);
    expect(output).toContain("Vite build succeeded");
    expect(output).toContain("1 warnings");
  });

  it("formats failed build with errors", () => {
    const data: ViteBuildResult = {
      success: false,
      duration: 0.5,
      outputs: [],
      errors: ['Could not resolve "./missing"', "Build failed"],
      warnings: [],
    };
    const output = formatViteBuild(data);
    expect(output).toContain("Vite build failed (0.5s)");
    expect(output).toContain('Could not resolve "./missing"');
    expect(output).toContain("Build failed");
  });
});
