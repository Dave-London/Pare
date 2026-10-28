import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@paretools/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@paretools/shared")>()),
  run: vi.fn(),
}));

import { run } from "@paretools/shared";
import { registerPlaywrightTool } from "../src/tools/playwright.js";

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function playwrightHandler(): ToolHandler {
  const server = new FakeServer();
  registerPlaywrightTool(server as never);
  return server.tools.get("playwright")!.handler;
}

describe("playwright args passthrough (#1108)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No JSON file gets written, so the tool falls back to parsing stdout.
    vi.mocked(run).mockResolvedValue({
      stdout: JSON.stringify({ suites: [], stats: { duration: 1 } }),
      stderr: "",
      exitCode: 0,
    });
  });

  it("passes flag args such as --list through to playwright test", async () => {
    await playwrightHandler()({ args: ["--list"], compact: false });

    const [cmd, argv] = vi.mocked(run).mock.calls[0];
    expect(cmd).toBe("npx");
    expect(argv).toEqual(["playwright", "test", "--reporter=json", "--list"]);
  });

  it("passes flag/value pairs through in order", async () => {
    await playwrightHandler()({ args: ["--repeat-each", "3", "-x"], compact: false });

    const argv = vi.mocked(run).mock.calls[0][1];
    expect(argv.slice(-3)).toEqual(["--repeat-each", "3", "-x"]);
  });

  it("rejects newline characters in args", async () => {
    await expect(playwrightHandler()({ args: ["--list\n--x"] })).rejects.toThrow(/Invalid args/);
    expect(run).not.toHaveBeenCalled();
  });

  it("keeps the flag guard on named params", async () => {
    await expect(playwrightHandler()({ project: "--headed" })).rejects.toThrow(/Invalid project/);
    expect(run).not.toHaveBeenCalled();
  });
});
