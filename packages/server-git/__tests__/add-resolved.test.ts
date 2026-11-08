import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { registerAddTool } from "../src/tools/add.js";

const { gitMock } = vi.hoisted(() => ({ gitMock: vi.fn() }));
vi.mock("../src/lib/git-runner.js", () => ({
  git: gitMock,
  resolveFilePaths: async (files: string[]) => files,
}));

describe("add resolved mode (#1250)", () => {
  let handler: (params: Record<string, unknown>) => Promise<unknown>;
  let inputSchema: Record<string, z.ZodType>;

  beforeEach(() => {
    gitMock.mockReset();
    const server = {
      registerTool(
        _name: string,
        config: { inputSchema: Record<string, z.ZodType> },
        callback: typeof handler,
      ) {
        inputSchema = config.inputSchema;
        handler = callback;
      },
    };
    registerAddTool(server as never);
  });

  it("exposes an optional boolean resolved parameter in the MCP schema", () => {
    expect(inputSchema.resolved).toBeDefined();
    expect(z.object(inputSchema).parse({ files: ["one.txt"], resolved: true }).resolved).toBe(true);
    expect(z.object(inputSchema).parse({ files: ["one.txt"] }).resolved).toBe(false);
    expect(z.object(inputSchema).safeParse({ files: ["one.txt"], resolved: "false" }).success).toBe(
      false,
    );
  });

  it("passes resolved and dry-run options before the pathspec separator", async () => {
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    await handler({ path: "/repo", files: ["one.txt"], resolved: true, dryRun: true });
    expect(gitMock).toHaveBeenNthCalledWith(
      1,
      ["add", "--resolved", "--dry-run", "--", "one.txt"],
      "/repo",
    );
  });

  it("passes dry-run before the pathspec separator in ordinary add", async () => {
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    await handler({ path: "/repo", files: ["one.txt"], dryRun: true });
    expect(gitMock).toHaveBeenNthCalledWith(1, ["add", "--dry-run", "--", "one.txt"], "/repo");
  });

  it.each([undefined, false])("preserves ordinary add when resolved is %s", async (resolved) => {
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    gitMock.mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });
    await handler({ path: "/repo", files: ["one.txt"], resolved });
    expect(gitMock).toHaveBeenNthCalledWith(1, ["add", "--", "one.txt"], "/repo");
  });

  it.each(["all", "update"])("rejects resolved with %s before invoking Git", async (option) => {
    await expect(
      handler({ path: "/repo", files: ["one.txt"], resolved: true, [option]: true }),
    ).rejects.toThrow(/resolved.*all.*update/i);
    expect(gitMock).not.toHaveBeenCalled();
  });

  it("reports an unsupported Git option without falling back to ordinary add", async () => {
    gitMock.mockResolvedValueOnce({
      exitCode: 129,
      stdout: "",
      stderr: "error: unknown option `resolved'",
    });
    await expect(handler({ path: "/repo", files: ["one.txt"], resolved: true })).rejects.toThrow(
      /git add failed:.*unknown option.*resolved/,
    );
    expect(gitMock).toHaveBeenCalledExactlyOnceWith(
      ["add", "--resolved", "--", "one.txt"],
      "/repo",
    );
  });
});
