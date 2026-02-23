import { describe, it, expect } from "vitest";
import { npxCommand, isWindows } from "../src/lib/platform.js";

describe("npxCommand", () => {
  it("returns npx command when forceWindows is false", () => {
    const result = npxCommand("@paretools/git", false);
    expect(result.command).toBe("npx");
    expect(result.args).toEqual(["-y", "@paretools/git"]);
  });

  it("wraps with cmd /c when forceWindows is true", () => {
    const result = npxCommand("@paretools/git", true);
    expect(result.command).toBe("cmd");
    expect(result.args).toEqual(["/c", "npx", "-y", "@paretools/git"]);
  });

  it("uses platform detection when forceWindows is not provided", () => {
    const result = npxCommand("@paretools/test");
    // On any platform, the result should be valid
    if (isWindows()) {
      expect(result.command).toBe("cmd");
      expect(result.args[0]).toBe("/c");
    } else {
      expect(result.command).toBe("npx");
      expect(result.args[0]).toBe("-y");
    }
  });

  it("handles scoped packages correctly", () => {
    const result = npxCommand("@paretools/security", false);
    expect(result.args).toEqual(["-y", "@paretools/security"]);
  });

  it("windows args preserve full package name", () => {
    const result = npxCommand("@paretools/docker", true);
    expect(result.args).toEqual(["/c", "npx", "-y", "@paretools/docker"]);
  });
});

describe("isWindows", () => {
  it("returns a boolean", () => {
    expect(typeof isWindows()).toBe("boolean");
  });
});
