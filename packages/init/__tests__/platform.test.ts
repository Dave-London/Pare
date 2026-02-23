import { describe, it, expect, vi, afterEach } from "vitest";
import { npxCommand } from "../src/lib/platform.js";

describe("npxCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns npx command for non-Windows", () => {
    vi.mock("node:os", () => ({ platform: () => "linux" }));
    // Force re-import to pick up mock
    const mod = await import("../src/lib/platform.js");
    const result = mod.npxCommand("@paretools/git");
    expect(result.command).toBe("npx");
    expect(result.args).toEqual(["-y", "@paretools/git"]);
  });

  it("wraps with cmd /c on Windows", () => {
    vi.mock("node:os", () => ({ platform: () => "win32" }));
    const mod = await import("../src/lib/platform.js");
    const result = mod.npxCommand("@paretools/git");
    expect(result.command).toBe("cmd");
    expect(result.args).toEqual(["/c", "npx", "-y", "@paretools/git"]);
  });
});
