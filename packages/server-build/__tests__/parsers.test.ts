import { describe, it, expect } from "vitest";
import {
  parseTscOutput,
  parseBuildCommandOutput,
  parseDurationToMs,
  parseSizeToBytes,
  parseEsbuildMetafile,
  parseWebpackProfile,
} from "../src/lib/parsers.js";

describe("parseTscOutput", () => {
  it("parses typical tsc errors", () => {
    const stdout = [
      "src/index.ts(5,3): error TS2322: Type 'string' is not assignable to type 'number'.",
      "src/index.ts(12,10): error TS2304: Cannot find name 'foo'.",
      "Found 2 errors in 1 file.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(2);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics[0]).toEqual({
      file: "src/index.ts",
      line: 5,
      column: 3,
      code: 2322,
      severity: "error",
      message: "Type 'string' is not assignable to type 'number'.",
    });
    expect(result.diagnostics[1].code).toBe(2304);
  });

  it("parses clean output", () => {
    const result = parseTscOutput("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("parses errors from multiple files", () => {
    const stdout = [
      "src/a.ts(1,1): error TS2307: Cannot find module './missing'.",
      "src/b.ts(10,5): error TS7006: Parameter 'x' implicitly has an 'any' type.",
      "src/c.ts(3,8): error TS2339: Property 'foo' does not exist on type 'Bar'.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);

    expect(result.total).toBe(3);
    expect(result.errors).toBe(3);
    expect(result.diagnostics.map((d) => d.file)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("parses errors with Windows paths", () => {
    const stdout = "C:\\Users\\dev\\project\\src\\index.ts(5,3): error TS2322: Type mismatch.";
    const result = parseTscOutput(stdout, "", 2);

    expect(result.total).toBe(1);
    expect(result.diagnostics[0].file).toBe("C:\\Users\\dev\\project\\src\\index.ts");
  });

  it("ignores non-diagnostic lines", () => {
    const stdout = [
      "Version 5.7.0",
      "src/index.ts(5,3): error TS2322: Type mismatch.",
      "",
      "Found 1 error.",
    ].join("\n");

    const result = parseTscOutput(stdout, "", 2);
    expect(result.total).toBe(1);
  });
});

describe("parseBuildCommandOutput", () => {
  it("parses successful build", () => {
    const stdout = "Build completed successfully\nOutput: dist/index.js";
    const result = parseBuildCommandOutput(stdout, "", 0, 3.5);

    expect(result.success).toBe(true);
    expect(result.duration).toBe(3.5);
    expect(result.errors).toEqual([]);
  });

  it("parses failed build with errors", () => {
    const stdout = "Compiling...\nError: Module not found: ./missing";
    const stderr = "build failed: compilation error";
    const result = parseBuildCommandOutput(stdout, stderr, 1, 2.0);

    expect(result.success).toBe(false);
    expect(result.duration).toBe(2.0);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("captures warnings", () => {
    const stdout = "Warning: unused variable 'x'\nWarning: deprecated API call\nBuild completed";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });

  it("handles empty output", () => {
    const result = parseBuildCommandOutput("", "", 0, 0.5);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  // Gap #78: improved error/warning heuristic tests
  it("detects TypeScript-style errors like error TS1234", () => {
    const stdout = "src/index.ts(5,3): error TS2322: Type mismatch.";
    const result = parseBuildCommandOutput(stdout, "", 1, 1.0);
    expect(result.errors!.length).toBe(1);
    expect(result.errors![0]).toContain("error TS2322");
  });

  it("detects webpack-style ERROR in lines", () => {
    const stdout = "ERROR in ./src/index.ts\nModule not found";
    const result = parseBuildCommandOutput(stdout, "", 1, 1.0);
    expect(result.errors!.length).toBeGreaterThanOrEqual(1);
    expect(result.errors![0]).toContain("ERROR in");
  });

  it("does not classify '0 errors' as an error", () => {
    const stdout = "Compiled with 0 errors and 0 warnings";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("detects SyntaxError lines", () => {
    const stdout = "SyntaxError: Unexpected token at line 5";
    const result = parseBuildCommandOutput(stdout, "", 1, 0.5);
    expect(result.errors!.length).toBe(1);
  });

  it("detects 'build failed' as error", () => {
    const stdout = "build failed with 3 errors";
    const result = parseBuildCommandOutput(stdout, "", 1, 1.0);
    expect(result.errors!.length).toBeGreaterThanOrEqual(1);
  });

  it("detects WARNING in lines for webpack", () => {
    const stdout = "WARNING in ./src/utils.ts\nUnused export";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);
    expect(result.warnings!.length).toBeGreaterThanOrEqual(1);
  });

  it("detects DeprecationWarning as warning", () => {
    const stdout = "DeprecationWarning: Buffer() is deprecated";
    const result = parseBuildCommandOutput(stdout, "", 0, 0.5);
    expect(result.warnings!.length).toBe(1);
  });

  it("does not classify 'no errors' as error", () => {
    const stdout = "Build completed with no errors";
    const result = parseBuildCommandOutput(stdout, "", 0, 1.0);
    expect(result.errors).toEqual([]);
  });
});

// Gap #82: duration normalization
describe("parseDurationToMs", () => {
  it("parses milliseconds", () => {
    expect(parseDurationToMs("100ms")).toBe(100);
    expect(parseDurationToMs("1234ms")).toBe(1234);
    expect(parseDurationToMs("0ms")).toBe(0);
  });

  it("parses seconds", () => {
    expect(parseDurationToMs("2.5s")).toBe(2500);
    expect(parseDurationToMs("10s")).toBe(10000);
    expect(parseDurationToMs("0.1s")).toBe(100);
  });

  it("parses minutes and seconds", () => {
    expect(parseDurationToMs("1m30s")).toBe(90000);
    expect(parseDurationToMs("2m0s")).toBe(120000);
  });

  it("parses minutes only", () => {
    expect(parseDurationToMs("5m")).toBe(300000);
  });

  it("returns undefined for unparseable strings", () => {
    expect(parseDurationToMs("unknown")).toBeUndefined();
    expect(parseDurationToMs("")).toBeUndefined();
    expect(parseDurationToMs("abc")).toBeUndefined();
  });
});

// Gap #83: size normalization
describe("parseSizeToBytes", () => {
  it("parses bytes", () => {
    expect(parseSizeToBytes("320 B")).toBe(320);
    expect(parseSizeToBytes("0 B")).toBe(0);
    expect(parseSizeToBytes("1B")).toBe(1);
  });

  it("parses kilobytes", () => {
    expect(parseSizeToBytes("45.2 kB")).toBe(45200);
    expect(parseSizeToBytes("1 kB")).toBe(1000);
    expect(parseSizeToBytes("0.5 kB")).toBe(500);
    expect(parseSizeToBytes("100kB")).toBe(100000);
  });

  it("parses megabytes", () => {
    expect(parseSizeToBytes("1.5 MB")).toBe(1500000);
    expect(parseSizeToBytes("0.1 MB")).toBe(100000);
  });

  it("parses gigabytes", () => {
    expect(parseSizeToBytes("1 GB")).toBe(1000000000);
    expect(parseSizeToBytes("2.5 GB")).toBe(2500000000);
  });

  it("returns undefined for invalid strings", () => {
    expect(parseSizeToBytes("")).toBeUndefined();
    expect(parseSizeToBytes("abc")).toBeUndefined();
    expect(parseSizeToBytes("45.2")).toBeUndefined();
  });

  it("is case-insensitive for units", () => {
    expect(parseSizeToBytes("10 KB")).toBe(10000);
    expect(parseSizeToBytes("10 Kb")).toBe(10000);
    expect(parseSizeToBytes("10 kb")).toBe(10000);
  });
});

// Gap #80: esbuild metafile parsing
describe("parseEsbuildMetafile", () => {
  it("parses valid metafile JSON", () => {
    const content = JSON.stringify({
      inputs: {
        "src/index.ts": { bytes: 1234 },
        "src/utils.ts": { bytes: 567 },
      },
      outputs: {
        "dist/index.js": { bytes: 8901 },
        "dist/index.js.map": { bytes: 2345 },
      },
    });
    const result = parseEsbuildMetafile(content);
    expect(result).toBeDefined();
    expect(result!.inputs["src/index.ts"].bytes).toBe(1234);
    expect(result!.inputs["src/utils.ts"].bytes).toBe(567);
    expect(result!.outputs["dist/index.js"].bytes).toBe(8901);
    expect(result!.outputs["dist/index.js.map"].bytes).toBe(2345);
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseEsbuildMetafile("not json")).toBeUndefined();
  });

  it("handles empty inputs/outputs", () => {
    const content = JSON.stringify({ inputs: {}, outputs: {} });
    const result = parseEsbuildMetafile(content);
    expect(result).toBeDefined();
    expect(Object.keys(result!.inputs)).toHaveLength(0);
    expect(Object.keys(result!.outputs)).toHaveLength(0);
  });

  it("handles missing inputs/outputs gracefully", () => {
    const content = JSON.stringify({});
    const result = parseEsbuildMetafile(content);
    expect(result).toBeDefined();
    expect(Object.keys(result!.inputs)).toHaveLength(0);
    expect(Object.keys(result!.outputs)).toHaveLength(0);
  });
});

// Gap #85: webpack profile parsing
describe("parseWebpackProfile", () => {
  it("extracts timing data from modules with profile info", () => {
    const modules = [
      { name: "./src/index.ts", profile: { factory: 10, building: 20, dependencies: 5 } },
      { name: "./src/app.ts", profile: { factory: 5, building: 15, dependencies: 3 } },
    ];
    const result = parseWebpackProfile(modules);
    expect(result).toBeDefined();
    expect(result!.modules).toHaveLength(2);
    expect(result!.modules[0]).toEqual({ name: "./src/index.ts", time: 35 });
    expect(result!.modules[1]).toEqual({ name: "./src/app.ts", time: 23 });
  });

  it("uses time field as fallback", () => {
    const modules = [{ name: "./src/index.ts", time: 42 }];
    const result = parseWebpackProfile(modules);
    expect(result).toBeDefined();
    expect(result!.modules[0]).toEqual({ name: "./src/index.ts", time: 42 });
  });

  it("returns undefined when no timing data", () => {
    const modules = [{ name: "./src/index.ts" }, { name: "./src/app.ts" }];
    const result = parseWebpackProfile(modules);
    expect(result).toBeUndefined();
  });

  it("skips modules with zero time", () => {
    const modules = [
      { name: "./src/index.ts", profile: { factory: 0, building: 0, dependencies: 0 } },
      { name: "./src/app.ts", profile: { factory: 5, building: 10, dependencies: 2 } },
    ];
    const result = parseWebpackProfile(modules);
    expect(result).toBeDefined();
    expect(result!.modules).toHaveLength(1);
    expect(result!.modules[0].name).toBe("./src/app.ts");
  });
});
