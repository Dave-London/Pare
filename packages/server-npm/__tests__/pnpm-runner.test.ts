import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared runner before importing the module under test
vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import { pnpm, runPm } from "../src/lib/npm-runner.js";
import { run } from "@paretools/shared";

const mockRun = vi.mocked(run);

beforeEach(() => {
  mockRun.mockClear();
});

describe("pnpm runner", () => {
  describe("argument construction", () => {
    it("passes args array directly to run() with pnpm command", async () => {
      await pnpm(["install", "--frozen-lockfile"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["install", "--frozen-lockfile"],
        expect.objectContaining({}),
      );
    });

    it("passes cwd option to run()", async () => {
      await pnpm(["audit", "--json"], "/home/user/project");

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["audit", "--json"],
        expect.objectContaining({ cwd: "/home/user/project" }),
      );
    });
  });

  describe("timeout logic", () => {
    it("uses 300s timeout for install", async () => {
      await pnpm(["install"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["install"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for add", async () => {
      await pnpm(["add", "express"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["add", "express"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for run", async () => {
      await pnpm(["run", "build"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["run", "build"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for test", async () => {
      await pnpm(["test"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["test"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 60s timeout for audit", async () => {
      await pnpm(["audit", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["audit", "--json"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });

    it("uses 60s timeout for outdated", async () => {
      await pnpm(["outdated", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["outdated", "--json"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });

    it("uses 60s timeout for list", async () => {
      await pnpm(["list", "--json", "--depth=0"]);

      expect(mockRun).toHaveBeenCalledWith(
        "pnpm",
        ["list", "--json", "--depth=0"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });
  });
});

describe("runPm", () => {
  it("delegates to npm when pm is npm", async () => {
    await runPm("npm", ["install"]);

    expect(mockRun).toHaveBeenCalledWith("npm", ["install"], expect.objectContaining({}));
  });

  it("delegates to pnpm when pm is pnpm", async () => {
    await runPm("pnpm", ["install"]);

    expect(mockRun).toHaveBeenCalledWith("pnpm", ["install"], expect.objectContaining({}));
  });
});
