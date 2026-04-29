import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerPrReadyTool } from "../src/tools/pr-ready.js";
import { parsePrReady } from "../src/lib/parsers.js";
import { formatPrReady } from "../src/lib/formatters.js";
import type { PrReadyResult } from "../src/schemas/index.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: PrReadyResult }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function makeServer() {
  const server = new FakeServer();
  registerPrReadyTool(server as never);
  return server.tools.get("pr-ready")!.handler;
}

describe("parsePrReady", () => {
  it("returns isDraft=false for the default ready operation", () => {
    const data = parsePrReady("https://github.com/owner/repo/pull/3\n", 3);
    expect(data.isDraft).toBe(false);
    expect(data.url).toBe("https://github.com/owner/repo/pull/3");
    expect(data.state).toBe("open");
  });

  it("returns isDraft=true when undo=true", () => {
    const data = parsePrReady("https://github.com/owner/repo/pull/3\n", 3, true);
    expect(data.isDraft).toBe(true);
  });
});

describe("formatPrReady", () => {
  it("formats a ready-for-review action", () => {
    const data: PrReadyResult = {
      number: 4,
      state: "open",
      url: "https://github.com/owner/repo/pull/4",
      isDraft: false,
    };
    expect(formatPrReady(data)).toContain("ready for review");
    expect(formatPrReady(data)).toContain("#4");
  });

  it("formats an undo (convert to draft) action", () => {
    const data: PrReadyResult = {
      number: 4,
      state: "open",
      url: "https://github.com/owner/repo/pull/4",
      isDraft: true,
    };
    expect(formatPrReady(data)).toContain("draft");
  });
});

describe("pr-ready tool handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes gh pr ready without --undo by default", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/pull/12\n",
      stderr: "",
      exitCode: 0,
    });

    const handler = makeServer();
    const out = await handler({ number: "12" });

    expect(out.structuredContent.isDraft).toBe(false);
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toEqual(["pr", "ready", "12"]);
  });

  it("passes --undo when undo=true and reports isDraft=true", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/pull/12\n",
      stderr: "",
      exitCode: 0,
    });

    const handler = makeServer();
    const out = await handler({ number: "12", undo: true });

    expect(out.structuredContent.isDraft).toBe(true);
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toEqual(["pr", "ready", "12", "--undo"]);
  });

  it("returns errorType=not-found on a missing PR", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "could not resolve to a pull request",
      exitCode: 1,
    });

    const handler = makeServer();
    const out = await handler({ number: "99999" });
    expect(out.structuredContent.errorType).toBe("not-found");
  });
});
