import { describe, it, expect } from "vitest";
import { assertNoFlagInjection, assertAllowedCommand } from "../src/validation.js";

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
});
