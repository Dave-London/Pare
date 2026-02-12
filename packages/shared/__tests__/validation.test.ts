import { describe, it, expect, vi } from "vitest";
import { assertNoFlagInjection, assertAllowedCommand } from "../src/validation.js";
import { INPUT_LIMITS } from "../src/limits.js";

describe("assertNoFlagInjection", () => {
  it("throws for values starting with -", () => {
    expect(() => assertNoFlagInjection("-v", "ref")).toThrow();
  });

  it("throws for values starting with --", () => {
    expect(() => assertNoFlagInjection("--output=/etc/passwd", "ref")).toThrow();
  });

  it("error message includes the param name", () => {
    expect(() => assertNoFlagInjection("-x", "branch")).toThrow(/branch/);
  });

  it("error message includes the offending value", () => {
    expect(() => assertNoFlagInjection("--evil", "ref")).toThrow(/--evil/);
  });

  it("allows normal branch name", () => {
    expect(() => assertNoFlagInjection("main", "ref")).not.toThrow();
  });

  it("allows feature branch with slash", () => {
    expect(() => assertNoFlagInjection("feature/foo", "ref")).not.toThrow();
  });

  it("allows commit hash", () => {
    expect(() => assertNoFlagInjection("abc123", "ref")).not.toThrow();
  });

  it("allows HEAD", () => {
    expect(() => assertNoFlagInjection("HEAD", "ref")).not.toThrow();
  });

  it("allows strings with dashes in the middle", () => {
    expect(() => assertNoFlagInjection("my-branch", "ref")).not.toThrow();
  });

  it("allows empty string", () => {
    expect(() => assertNoFlagInjection("", "ref")).not.toThrow();
  });

  it("throws for space-prefixed flag (whitespace bypass)", () => {
    expect(() => assertNoFlagInjection(" --force", "ref")).toThrow();
  });

  it("throws for tab-prefixed flag (whitespace bypass)", () => {
    expect(() => assertNoFlagInjection("\t--delete", "ref")).toThrow();
  });

  it("throws for multiple spaces before flag", () => {
    expect(() => assertNoFlagInjection("   -rf", "ref")).toThrow();
  });
});

describe("assertAllowedCommand", () => {
  const allowedCommands = [
    "npm",
    "npx",
    "pnpm",
    "yarn",
    "bun",
    "bunx",
    "make",
    "cmake",
    "gradle",
    "gradlew",
    "mvn",
    "ant",
    "cargo",
    "go",
    "dotnet",
    "msbuild",
    "tsc",
    "esbuild",
    "vite",
    "webpack",
    "rollup",
    "turbo",
    "nx",
    "bazel",
  ];

  for (const cmd of allowedCommands) {
    it(`allows "${cmd}"`, () => {
      expect(() => assertAllowedCommand(cmd)).not.toThrow();
    });
  }

  it("allows command with Unix path", () => {
    expect(() => assertAllowedCommand("/usr/bin/npm")).not.toThrow();
  });

  it("allows command with Windows path", () => {
    expect(() => assertAllowedCommand("C:\\Program Files\\node\\npm")).not.toThrow();
  });

  it("strips .cmd extension", () => {
    expect(() => assertAllowedCommand("npm.cmd")).not.toThrow();
  });

  it("strips .exe extension", () => {
    expect(() => assertAllowedCommand("npm.exe")).not.toThrow();
  });

  it("strips .bat extension", () => {
    expect(() => assertAllowedCommand("yarn.bat")).not.toThrow();
  });

  it("strips .sh extension", () => {
    expect(() => assertAllowedCommand("gradle.sh")).not.toThrow();
  });

  it("handles Windows path with .cmd extension", () => {
    expect(() => assertAllowedCommand("C:\\npm.cmd")).not.toThrow();
  });

  it("rejects rm", () => {
    expect(() => assertAllowedCommand("rm")).toThrow();
  });

  it("rejects curl", () => {
    expect(() => assertAllowedCommand("curl")).toThrow();
  });

  it("rejects cat", () => {
    expect(() => assertAllowedCommand("cat")).toThrow();
  });

  it("rejects bash", () => {
    expect(() => assertAllowedCommand("bash")).toThrow();
  });

  it("rejects arbitrary command", () => {
    expect(() => assertAllowedCommand("malicious-tool")).toThrow();
  });

  it("error message lists allowed commands", () => {
    expect(() => assertAllowedCommand("rm")).toThrow(/Allowed:/);
  });

  it("error message includes the rejected command", () => {
    expect(() => assertAllowedCommand("curl")).toThrow(/curl/);
  });

  it("extension stripping is case-insensitive", () => {
    expect(() => assertAllowedCommand("npm.CMD")).not.toThrow();
    expect(() => assertAllowedCommand("yarn.Exe")).not.toThrow();
  });

  it("warns when a Unix full path is used", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertAllowedCommand("/usr/bin/npm");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[pare:security] Command uses a full path"),
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("/usr/bin/npm"));
    warnSpy.mockRestore();
  });

  it("warns when a Windows full path is used", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertAllowedCommand("C:\\Program Files\\node\\npm");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[pare:security] Command uses a full path"),
    );
    warnSpy.mockRestore();
  });

  it("does not warn when a bare command name is used", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertAllowedCommand("npm");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("still rejects disallowed commands even with full paths", () => {
    expect(() => assertAllowedCommand("/tmp/evil/rm")).toThrow();
    expect(() => assertAllowedCommand("C:\\evil\\bash")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// INPUT_LIMITS — exported constant verification
// ---------------------------------------------------------------------------

describe("INPUT_LIMITS", () => {
  it("exports the expected limits", () => {
    expect(INPUT_LIMITS.STRING_MAX).toBe(65_536);
    expect(INPUT_LIMITS.ARRAY_MAX).toBe(1_000);
    expect(INPUT_LIMITS.PATH_MAX).toBe(4_096);
    expect(INPUT_LIMITS.MESSAGE_MAX).toBe(72_000);
    expect(INPUT_LIMITS.SHORT_STRING_MAX).toBe(255);
  });

  it("all values are positive integers", () => {
    for (const [key, value] of Object.entries(INPUT_LIMITS)) {
      expect(Number.isInteger(value), `${key} should be an integer`).toBe(true);
      expect(value, `${key} should be positive`).toBeGreaterThan(0);
    }
  });
});
