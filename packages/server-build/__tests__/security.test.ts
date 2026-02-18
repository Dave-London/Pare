import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertAllowedCommand, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

// ---------------------------------------------------------------------------
// assertAllowedCommand — used by the build tool
// ---------------------------------------------------------------------------

describe("assertAllowedCommand", () => {
  it("allows known safe commands", () => {
    const safe = ["npm", "npx", "pnpm", "yarn", "bun", "make", "cargo", "go", "tsc", "esbuild"];
    for (const cmd of safe) {
      expect(() => assertAllowedCommand(cmd)).not.toThrow();
    }
  });

  it("rejects arbitrary commands", () => {
    expect(() => assertAllowedCommand("rm")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("curl")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("bash")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("sh")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("powershell")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("cmd")).toThrow(/not in the allowed/);
  });

  it("rejects empty string", () => {
    expect(() => assertAllowedCommand("")).toThrow(/not in the allowed/);
  });

  it("extracts base name from full path (Unix)", () => {
    expect(() => assertAllowedCommand("/usr/bin/npm")).not.toThrow();
    expect(() => assertAllowedCommand("/usr/local/bin/pnpm")).not.toThrow();
  });

  it("extracts base name from full path (Windows)", () => {
    expect(() => assertAllowedCommand("C:\\Program Files\\nodejs\\npm.cmd")).not.toThrow();
    expect(() => assertAllowedCommand("C:\\tools\\yarn.exe")).not.toThrow();
  });

  it("strips .cmd, .exe, .bat, .sh extensions", () => {
    expect(() => assertAllowedCommand("npm.cmd")).not.toThrow();
    expect(() => assertAllowedCommand("pnpm.exe")).not.toThrow();
    expect(() => assertAllowedCommand("make.bat")).not.toThrow();
    expect(() => assertAllowedCommand("cargo.sh")).not.toThrow();
  });

  it("rejects dangerous commands even with full path", () => {
    expect(() => assertAllowedCommand("/usr/bin/rm")).toThrow(/not in the allowed/);
    expect(() => assertAllowedCommand("C:\\Windows\\System32\\cmd.exe")).toThrow(
      /not in the allowed/,
    );
  });
});

// ---------------------------------------------------------------------------
// assertNoFlagInjection — used by the esbuild tool for entryPoints
// ---------------------------------------------------------------------------

describe("assertNoFlagInjection", () => {
  it("allows normal file paths", () => {
    expect(() => assertNoFlagInjection("src/index.ts", "entryPoints")).not.toThrow();
    expect(() => assertNoFlagInjection("./app.tsx", "entryPoints")).not.toThrow();
    expect(() => assertNoFlagInjection("lib/utils.js", "entryPoints")).not.toThrow();
  });

  it("rejects values starting with single dash", () => {
    expect(() => assertNoFlagInjection("-o", "entryPoints")).toThrow(/must not start with/);
    expect(() => assertNoFlagInjection("-exec", "entryPoints")).toThrow(/must not start with/);
  });

  it("rejects values starting with double dash", () => {
    expect(() => assertNoFlagInjection("--outfile=/etc/passwd", "entryPoints")).toThrow(
      /must not start with/,
    );
    expect(() => assertNoFlagInjection("--loader:.ts=tsx", "entryPoints")).toThrow(
      /must not start with/,
    );
  });

  it("includes parameter name in error message", () => {
    expect(() => assertNoFlagInjection("--evil", "entryPoints")).toThrow(/entryPoints/);
    expect(() => assertNoFlagInjection("--evil", "ref")).toThrow(/ref/);
  });

  it("allows paths that contain dashes but don't start with one", () => {
    expect(() => assertNoFlagInjection("src/my-component.ts", "entryPoints")).not.toThrow();
    expect(() => assertNoFlagInjection("pages/about-us.tsx", "entryPoints")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// tsc tool — project parameter flag injection
// ---------------------------------------------------------------------------

describe("security: tsc tool — project parameter validation", () => {
  it("accepts normal tsconfig paths", () => {
    expect(() => assertNoFlagInjection("tsconfig.json", "project")).not.toThrow();
    expect(() => assertNoFlagInjection("./tsconfig.build.json", "project")).not.toThrow();
    expect(() => assertNoFlagInjection("packages/core/tsconfig.json", "project")).not.toThrow();
  });

  it("rejects flag-like project values", () => {
    expect(() => assertNoFlagInjection("--outDir=/tmp/evil", "project")).toThrow(
      /must not start with "-"/,
    );
    expect(() => assertNoFlagInjection("-p", "project")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("--noEmit", "project")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("--declaration", "project")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects whitespace-prefixed flag injection", () => {
    expect(() => assertNoFlagInjection(" --outDir=/etc/passwd", "project")).toThrow(
      /must not start with "-"/,
    );
    expect(() => assertNoFlagInjection("\t-p", "project")).toThrow(/must not start with "-"/);
  });
});

// ---------------------------------------------------------------------------
// vite-build tool — mode and args[] flag injection
// ---------------------------------------------------------------------------

describe("security: vite-build tool — mode parameter validation", () => {
  it("accepts normal mode values", () => {
    expect(() => assertNoFlagInjection("production", "mode")).not.toThrow();
    expect(() => assertNoFlagInjection("development", "mode")).not.toThrow();
    expect(() => assertNoFlagInjection("staging", "mode")).not.toThrow();
  });

  it("rejects flag-like mode values", () => {
    expect(() => assertNoFlagInjection("--mode=evil", "mode")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("-m", "mode")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("--outDir=/etc/passwd", "mode")).toThrow(
      /must not start with "-"/,
    );
  });
});

// ---------------------------------------------------------------------------
// webpack tool — config flag injection
// ---------------------------------------------------------------------------

describe("security: webpack tool — config parameter validation", () => {
  it("accepts normal config paths", () => {
    expect(() => assertNoFlagInjection("webpack.config.js", "config")).not.toThrow();
    expect(() => assertNoFlagInjection("./config/webpack.prod.js", "config")).not.toThrow();
  });

  it("rejects flag-like config values", () => {
    expect(() => assertNoFlagInjection("--output-path=/etc/passwd", "config")).toThrow(
      /must not start with "-"/,
    );
    expect(() => assertNoFlagInjection("-c", "config")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("--mode=production", "config")).toThrow(
      /must not start with "-"/,
    );
  });

  it("rejects whitespace-prefixed flag injection", () => {
    expect(() => assertNoFlagInjection(" --output-path=/tmp", "config")).toThrow(
      /must not start with "-"/,
    );
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Build tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Build tool schemas", () => {
  describe("tsc project parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("tsconfig.json").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("vite-build mode parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a mode within the limit", () => {
      expect(schema.safeParse("production").success).toBe(true);
    });

    it("rejects a mode exceeding SHORT_STRING_MAX", () => {
      const oversized = "m".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("build command parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a command within the limit", () => {
      expect(schema.safeParse("npm").success).toBe(true);
    });

    it("rejects a command exceeding SHORT_STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "arg");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects arg string exceeding STRING_MAX", () => {
      const oversized = ["a".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("esbuild entryPoints (ARRAY_MAX + PATH_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.PATH_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "src/index.ts");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects path exceeding PATH_MAX", () => {
      const oversized = ["p".repeat(INPUT_LIMITS.PATH_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
