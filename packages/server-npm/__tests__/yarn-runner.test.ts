import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared runner before importing the module under test
vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import { yarn, runPm } from "../src/lib/npm-runner.js";
import { run } from "@paretools/shared";

const mockRun = vi.mocked(run);

beforeEach(() => {
  mockRun.mockClear();
});

describe("yarn runner", () => {
  describe("argument construction", () => {
    it("passes args array directly to run() with yarn command", async () => {
      await yarn(["install", "--frozen-lockfile"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["install", "--frozen-lockfile"],
        expect.objectContaining({}),
      );
    });

    it("passes cwd option to run()", async () => {
      await yarn(["audit", "--json"], "/home/user/project");

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["audit", "--json"],
        expect.objectContaining({ cwd: "/home/user/project" }),
      );
    });
  });

  describe("timeout logic", () => {
    it("uses 300s timeout for install", async () => {
      await yarn(["install"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["install"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for add", async () => {
      await yarn(["add", "express"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["add", "express"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for run", async () => {
      await yarn(["run", "build"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["run", "build"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for test", async () => {
      await yarn(["test"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["test"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 60s timeout for audit", async () => {
      await yarn(["audit", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["audit", "--json"],
        expect.objectContaining({ timeout: 60_000 }),
      );
    });

    it("uses 60s timeout for outdated", async () => {
      await yarn(["outdated", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["outdated", "--json"],
        expect.objectContaining({ timeout: 60_000 }),
      );
    });

    it("uses 60s timeout for list", async () => {
      await yarn(["list", "--json", "--depth=0"]);

      expect(mockRun).toHaveBeenCalledWith(
        "yarn",
        ["list", "--json", "--depth=0"],
        expect.objectContaining({ timeout: 60_000 }),
      );
    });
  });
});

describe("runPm with yarn", () => {
  it("delegates to yarn when pm is yarn", async () => {
    await runPm("yarn", ["install"]);

    expect(mockRun).toHaveBeenCalledWith("yarn", ["install"], expect.objectContaining({}));
  });

  it("delegates to npm when pm is npm", async () => {
    await runPm("npm", ["install"]);

    expect(mockRun).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({}));
  });

  it("delegates to pnpm when pm is pnpm", async () => {
    await runPm("pnpm", ["install"]);

    expect(mockRun).toHaveBeenCalledWith("pnpm", ["install"], expect.objectContaining({}));
  });
});
