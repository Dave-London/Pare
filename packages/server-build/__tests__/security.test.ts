import { describe, it, expect } from "vitest";
import { assertAllowedCommand, assertNoFlagInjection } from "@paretools/shared";

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
