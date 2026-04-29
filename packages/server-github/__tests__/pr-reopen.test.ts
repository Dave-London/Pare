import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerPrReopenTool } from "../src/tools/pr-reopen.js";
import { parsePrReopen } from "../src/lib/parsers.js";
import { formatPrReopen } from "../src/lib/formatters.js";
import type { PrReopenResult } from "../src/schemas/index.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: PrReopenResult }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function makeServer() {
  const server = new FakeServer();
  registerPrReopenTool(server as never);
  return server.tools.get("pr-reopen")!.handler;
}

describe("parsePrReopen", () => {
  it("extracts the PR URL", () => {
    const data = parsePrReopen("https://github.com/owner/repo/pull/77\n", 77);
    expect(data.url).toBe("https://github.com/owner/repo/pull/77");
    expect(data.state).toBe("open");
    expect(data.alreadyOpen).toBeUndefined();
  });

  it("flags alreadyOpen when stderr says so", () => {
    const data = parsePrReopen("", 1, "pull request #1 is already open");
    expect(data.alreadyOpen).toBe(true);
  });
});

describe("formatPrReopen", () => {
  it("formats a successful reopen", () => {
    const data: PrReopenResult = {
      number: 8,
      state: "open",
      url: "https://github.com/owner/repo/pull/8",
    };
    expect(formatPrReopen(data)).toBe("Reopened PR #8: https://github.com/owner/repo/pull/8");
  });

  it("annotates already-open", () => {
    const data: PrReopenResult = {
      number: 8,
      state: "open",
      url: "https://github.com/owner/repo/pull/8",
      alreadyOpen: true,
    };
    expect(formatPrReopen(data)).toContain("[already open]");
  });
});

describe("pr-reopen tool handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes gh pr reopen and returns structured data", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/pull/12\n",
      stderr: "",
      exitCode: 0,
    });

    const handler = makeServer();
    const out = await handler({ number: "12", comment: "back open" });

    expect(out.structuredContent.number).toBe(12);
    expect(out.structuredContent.state).toBe("open");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toEqual(["pr", "reopen", "12", "--comment", "back open"]);
  });

  it("returns errorType=already-open when gh reports it", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "pull request #12 is already open",
      exitCode: 1,
    });

    const handler = makeServer();
    const out = await handler({ number: "12" });
    expect(out.structuredContent.errorType).toBe("already-open");
    expect(out.structuredContent.alreadyOpen).toBe(true);
  });

  it("returns errorType=merged when gh reports the PR is merged", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "Cannot reopen a merged pull request",
      exitCode: 1,
    });

    const handler = makeServer();
    const out = await handler({ number: "12" });
    expect(out.structuredContent.errorType).toBe("merged");
  });
});
