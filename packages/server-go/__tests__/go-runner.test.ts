import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RunResult } from "@paretools/shared";

// Mock @paretools/shared before importing the module under test
vi.mock("@paretools/shared", () => ({
  run: vi.fn(),
}));

// Import after mock is registered
import { run } from "@paretools/shared";
import { goCmd, gofmtCmd } from "../src/lib/go-runner.js";

const mockRun = vi.mocked(run);

describe("goCmd", () => {
  beforeEach(() => {
    mockRun.mockReset();
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });
  });

  it("calls run with 'go' as the command", async () => {
    await goCmd(["build", "./..."], "/project");

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun.mock.calls[0][0]).toBe("go");
  });

  it("passes arguments array through to run", async () => {
    await goCmd(["test", "-json", "./..."], "/project");

    expect(mockRun.mock.calls[0][1]).toEqual(["test", "-json", "./..."]);
  });

  it("passes cwd option to run", async () => {
    await goCmd(["build", "./..."], "/my/project");

    expect(mockRun.mock.calls[0][2]).toMatchObject({ cwd: "/my/project" });
  });

  it("sets timeout to 300 seconds (300_000ms)", async () => {
    await goCmd(["build", "./..."], "/project");

    expect(mockRun.mock.calls[0][2]).toMatchObject({ timeout: 300_000 });
  });

  it("passes undefined cwd when not provided", async () => {
    await goCmd(["vet", "./..."]);

    expect(mockRun.mock.calls[0][2]).toMatchObject({ cwd: undefined });
  });

  it("returns the RunResult from run()", async () => {
    const expected: RunResult = { exitCode: 2, stdout: "", stderr: "error" };
    mockRun.mockResolvedValue(expected);

    const result = await goCmd(["build", "."]);

    expect(result).toBe(expected);
  });

  it("propagates errors from run()", async () => {
    mockRun.mockRejectedValue(new Error('Command not found: "go"'));

    await expect(goCmd(["build"])).rejects.toThrow('Command not found: "go"');
  });

  it("handles empty args array", async () => {
    await goCmd([], "/project");

    expect(mockRun.mock.calls[0][1]).toEqual([]);
  });
});

describe("gofmtCmd", () => {
  beforeEach(() => {
    mockRun.mockReset();
    mockRun.mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });
  });

  it("calls run with 'gofmt' as the command", async () => {
    await gofmtCmd(["-l", "."], "/project");

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun.mock.calls[0][0]).toBe("gofmt");
  });

  it("passes arguments array through to run", async () => {
    await gofmtCmd(["-w", "main.go"], "/project");

    expect(mockRun.mock.calls[0][1]).toEqual(["-w", "main.go"]);
  });

  it("passes cwd option to run", async () => {
    await gofmtCmd(["-l", "."], "/my/project");

    expect(mockRun.mock.calls[0][2]).toMatchObject({ cwd: "/my/project" });
  });

  it("sets timeout to 120 seconds (120_000ms)", async () => {
    await gofmtCmd(["-l", "."], "/project");

    expect(mockRun.mock.calls[0][2]).toMatchObject({ timeout: 120_000 });
  });

  it("passes undefined cwd when not provided", async () => {
    await gofmtCmd(["-l", "."]);

    expect(mockRun.mock.calls[0][2]).toMatchObject({ cwd: undefined });
  });

  it("returns the RunResult from run()", async () => {
    const expected: RunResult = { exitCode: 0, stdout: "main.go\n", stderr: "" };
    mockRun.mockResolvedValue(expected);

    const result = await gofmtCmd(["-l", "."]);

    expect(result).toBe(expected);
  });

  it("propagates errors from run()", async () => {
    mockRun.mockRejectedValue(new Error('Command not found: "gofmt"'));

    await expect(gofmtCmd(["-l", "."])).rejects.toThrow('Command not found: "gofmt"');
  });
});
