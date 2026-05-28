import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock @paretools/shared's run function to simulate ENOENT errors
vi.mock("@paretools/shared", async () => {
  const actual = await vi.importActual<typeof import("@paretools/shared")>("@paretools/shared");
  return {
    ...actual,
    run: vi.fn(),
  };
});

import { run } from "@paretools/shared";
import { rgCmd, fdCmd, jqCmd, resolveSearchTarget } from "../src/lib/search-runner.js";

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

describe("resolveSearchTarget", () => {
  // Set up a fixture tree:
  //   <tmp>/file.txt   (a file)
  //   <tmp>/sub/       (a directory)
  let root: string;
  let filePath: string;
  let subDir: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "pare-search-target-"));
    filePath = join(root, "file.txt");
    writeFileSync(filePath, "hello world\n");
    subDir = join(root, "sub");
    mkdirSync(subDir);
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns process.cwd() and '.' when path is undefined", () => {
    const result = resolveSearchTarget(undefined);
    expect(result.cwd).toBe(process.cwd());
    expect(result.target).toBe(".");
    expect(result.isFile).toBe(false);
  });

  it("returns process.cwd() and '.' when path is an empty string", () => {
    const result = resolveSearchTarget("");
    expect(result.cwd).toBe(process.cwd());
    expect(result.target).toBe(".");
    expect(result.isFile).toBe(false);
  });

  it("uses the path as cwd and '.' as target when path is an existing directory", () => {
    const result = resolveSearchTarget(subDir);
    expect(result.cwd).toBe(subDir);
    expect(result.target).toBe(".");
    expect(result.isFile).toBe(false);
  });

  it("splits a file path into parent dir cwd + basename target (regression: spawn ENOTDIR)", () => {
    // This is the core fix for issue #871. Previously the runner used
    // `path` directly as cwd, causing `spawn ENOTDIR` when path was a file.
    const result = resolveSearchTarget(filePath);
    expect(result.cwd).toBe(root);
    expect(result.target).toBe("file.txt");
    expect(result.isFile).toBe(true);
  });

  it("falls back to process.cwd() + raw path when path does not exist", () => {
    const missing = join(root, "does-not-exist.txt");
    const result = resolveSearchTarget(missing);
    expect(result.cwd).toBe(process.cwd());
    expect(result.target).toBe(missing);
    expect(result.isFile).toBe(false);
  });

  it("resolves relative directory paths to absolute cwd", () => {
    // process.cwd() is always a directory, so passing "." should yield an
    // absolute cwd matching it and target ".".
    const result = resolveSearchTarget(".");
    expect(result.cwd).toBe(process.cwd());
    expect(result.target).toBe(".");
    expect(result.isFile).toBe(false);
  });
});
