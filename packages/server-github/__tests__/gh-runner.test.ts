import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paretools/shared", () => ({
  run: vi.fn().mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" }),
}));

import { run } from "@paretools/shared";
import { ghCmd } from "../src/lib/gh-runner.js";

const mockRun = vi.mocked(run);

beforeEach(() => {
  mockRun.mockClear();
});

describe("ghCmd", () => {
  it("uses shell:false for native gh executable", async () => {
    await ghCmd(["issue", "view", "1"], "/repo");

    expect(mockRun).toHaveBeenCalledWith("gh", ["issue", "view", "1"], {
      cwd: "/repo",
      timeout: 30_000,
      stdin: undefined,
      shell: false,
    });
  });

  it("passes stdin through when provided", async () => {
    await ghCmd(["issue", "create", "--body-file", "-"], {
      cwd: "/repo",
      stdin: "hello",
    });

    expect(mockRun).toHaveBeenCalledWith("gh", ["issue", "create", "--body-file", "-"], {
      cwd: "/repo",
      timeout: 30_000,
      stdin: "hello",
      shell: false,
    });
  });
});
