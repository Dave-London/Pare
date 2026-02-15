import { describe, it, expect, vi } from "vitest";

// Mock @paretools/shared's run function to simulate ENOENT errors
vi.mock("@paretools/shared", async () => {
  const actual = await vi.importActual<typeof import("@paretools/shared")>("@paretools/shared");
  return {
    ...actual,
    run: vi.fn(),
  };
});

import { run } from "@paretools/shared";
import { rgCmd, fdCmd, jqCmd } from "../src/lib/search-runner.js";

const mockRun = vi.mocked(run);

describe("search-runner install hints", () => {
  it("rgCmd: replaces generic error with ripgrep install hints", async () => {
    mockRun.mockRejectedValueOnce(
      new Error('Command not found: "rg". Ensure it is installed and available in your PATH.'),
    );

    try {
      await rgCmd(["--json", "pattern", "."]);
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('Command not found: "rg"');
      expect(msg).toContain("brew install ripgrep");
      expect(msg).toContain("sudo apt install ripgrep");
      expect(msg).toContain("choco install ripgrep");
      expect(msg).toContain("https://github.com/BurntSushi/ripgrep#installation");
      // Verify the generic message was replaced, not appended
      expect(msg).not.toContain("Ensure it is installed");
    }
  });

  it("fdCmd: replaces generic error with fd install hints", async () => {
    mockRun.mockRejectedValueOnce(
      new Error('Command not found: "fd". Ensure it is installed and available in your PATH.'),
    );

    try {
      await fdCmd(["--color", "never"]);
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('Command not found: "fd"');
      expect(msg).toContain("brew install fd");
      expect(msg).toContain("sudo apt install fd-find");
      expect(msg).toContain("choco install fd");
      expect(msg).toContain("https://github.com/sharkdp/fd#installation");
      expect(msg).not.toContain("Ensure it is installed");
    }
  });

  it("jqCmd: replaces generic error with jq install hints", async () => {
    mockRun.mockRejectedValueOnce(
      new Error('Command not found: "jq". Ensure it is installed and available in your PATH.'),
    );

    try {
      await jqCmd(["."], { stdin: "{}" });
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('Command not found: "jq"');
      expect(msg).toContain("brew install jq");
      expect(msg).toContain("sudo apt install jq");
      expect(msg).toContain("choco install jq");
      expect(msg).toContain("https://github.com/jqlang/jq#installation");
      expect(msg).not.toContain("Ensure it is installed");
    }
  });

  it("re-throws non-ENOENT errors unchanged", async () => {
    const originalError = new Error('Permission denied executing "rg": EACCES');
    mockRun.mockRejectedValueOnce(originalError);

    await expect(rgCmd(["--json", "pattern", "."])).rejects.toThrow(
      'Permission denied executing "rg"',
    );
  });

  it("passes through successful results unchanged", async () => {
    mockRun.mockResolvedValueOnce({ exitCode: 0, stdout: "result", stderr: "" });

    const result = await rgCmd(["--json", "pattern", "."]);
    expect(result).toEqual({ exitCode: 0, stdout: "result", stderr: "" });
  });
});
