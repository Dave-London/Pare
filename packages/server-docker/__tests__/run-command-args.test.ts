import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerRunTool } from "../src/tools/run.js";

vi.mock("../src/lib/docker-runner.js", () => ({
  docker: vi.fn(),
}));

import { docker } from "../src/lib/docker-runner.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function runHandler(): ToolHandler {
  const server = new FakeServer();
  registerRunTool(server as never);
  return server.tools.get("run")!.handler;
}

describe("docker run command args (#1107)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(docker).mockResolvedValue({ stdout: "abc123def456\n", stderr: "", exitCode: 0 });
  });

  it("passes flag arguments of the container command through after the image", async () => {
    await runHandler()({ image: "nginx:alpine", command: ["nginx", "-t"], rm: true });

    const argv = vi.mocked(docker).mock.calls[0][0];
    expect(argv.slice(-3)).toEqual(["nginx:alpine", "nginx", "-t"]);
  });

  it("allows a leading flag when the image has an ENTRYPOINT", async () => {
    await runHandler()({ image: "alpine/git", command: ["--version"] });

    const argv = vi.mocked(docker).mock.calls[0][0];
    expect(argv.slice(-2)).toEqual(["alpine/git", "--version"]);
  });

  it("keeps sh -c scripts as a single argv element", async () => {
    await runHandler()({ image: "alpine", command: ["sh", "-c", "echo a && echo b"] });

    const argv = vi.mocked(docker).mock.calls[0][0];
    expect(argv.slice(-4)).toEqual(["alpine", "sh", "-c", "echo a && echo b"]);
  });

  it("still rejects a flag in the image param", async () => {
    await expect(runHandler()({ image: "--privileged", command: ["sh"] })).rejects.toThrow(
      /Invalid image/,
    );
    expect(docker).not.toHaveBeenCalled();
  });

  it("rejects newline characters in command args", async () => {
    await expect(runHandler()({ image: "alpine", command: ["sh", "-c\nx"] })).rejects.toThrow(
      /Invalid command/,
    );
    expect(docker).not.toHaveBeenCalled();
  });
});
