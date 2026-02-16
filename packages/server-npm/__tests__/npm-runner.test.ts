import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the shared runner before importing the module under test
vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import { npm } from "../src/lib/npm-runner.js";
import { run } from "@paretools/shared";

const mockRun = vi.mocked(run);

beforeEach(() => {
  mockRun.mockClear();
});

describe("npm runner", () => {
  describe("argument construction", () => {
    it("passes args array directly to run()", async () => {
      await npm(["install", "--save-dev", "vitest"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["install", "--save-dev", "vitest"],
        expect.objectContaining({}),
      );
    });

    it("passes cwd option to run()", async () => {
      await npm(["audit", "--json"], "/home/user/project");

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["audit", "--json"],
        expect.objectContaining({ cwd: "/home/user/project" }),
      );
    });

    it("passes undefined cwd when not provided", async () => {
      await npm(["outdated", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["outdated", "--json"],
        expect.objectContaining({ cwd: undefined }),
      );
    });
  });

  describe("timeout logic", () => {
    it("uses 300s timeout for install", async () => {
      await npm(["install"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["install"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for i (install shorthand)", async () => {
      await npm(["i"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["i"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for ci", async () => {
      await npm(["ci"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["ci"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for run", async () => {
      await npm(["run", "build"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["run", "build"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for run-script", async () => {
      await npm(["run-script", "lint"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["run-script", "lint"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for test", async () => {
      await npm(["test"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["test"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 300s timeout for t (test shorthand)", async () => {
      await npm(["t"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["t"],
        expect.objectContaining({ timeout: 300_000 }),
      );
    });

    it("uses 60s timeout for audit", async () => {
      await npm(["audit", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["audit", "--json"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });

    it("uses 60s timeout for outdated", async () => {
      await npm(["outdated", "--json"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["outdated", "--json"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });

    it("uses 60s timeout for ls (list)", async () => {
      await npm(["ls", "--json", "--depth=0"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["ls", "--json", "--depth=0"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });

    it("uses 60s timeout for init", async () => {
      await npm(["init", "-y"]);

      expect(mockRun).toHaveBeenCalledWith(
        "npm",
        ["init", "-y"],
        expect.objectContaining({ timeout: 180_000 }),
      );
    });
  });

  describe("return value", () => {
    it("returns the RunResult from the shared runner", async () => {
      mockRun.mockResolvedValueOnce({ exitCode: 1, stdout: "some output", stderr: "some error" });

      const result = await npm(["test"]);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("some output");
      expect(result.stderr).toBe("some error");
    });
  });
});
