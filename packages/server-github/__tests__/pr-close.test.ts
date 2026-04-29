import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gh-runner.js", () => ({
  ghCmd: vi.fn(),
}));

import { ghCmd } from "../src/lib/gh-runner.js";
import { registerPrCloseTool } from "../src/tools/pr-close.js";
import { parsePrClose } from "../src/lib/parsers.js";
import { formatPrClose } from "../src/lib/formatters.js";
import type { PrCloseResult } from "../src/schemas/index.js";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ structuredContent: PrCloseResult }>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function makeServer() {
  const server = new FakeServer();
  registerPrCloseTool(server as never);
  return server.tools.get("pr-close")!.handler;
}

// ── Parser tests ────────────────────────────────────────────────────

describe("parsePrClose", () => {
  it("extracts the PR URL from a plain stdout", () => {
    const data = parsePrClose("https://github.com/owner/repo/pull/42\n", 42);
    expect(data.number).toBe(42);
    expect(data.state).toBe("closed");
    expect(data.url).toBe("https://github.com/owner/repo/pull/42");
    expect(data.alreadyClosed).toBeUndefined();
    expect(data.deletedBranch).toBeUndefined();
  });

  it("extracts URL from confirmation text", () => {
    const stdout = "✓ Closed pull request #7\nhttps://github.com/owner/repo/pull/7\n";
    const data = parsePrClose(stdout, 7);
    expect(data.url).toBe("https://github.com/owner/repo/pull/7");
  });

  it("flags alreadyClosed when stderr says so", () => {
    const data = parsePrClose("", 1, false, "pull request #1 is already closed");
    expect(data.alreadyClosed).toBe(true);
  });

  it("reports deletedBranch=true when --delete-branch was used and gh confirms", () => {
    const stdout = "✓ Closed PR\nhttps://github.com/owner/repo/pull/3\n✓ Deleted branch feature-x";
    const data = parsePrClose(stdout, 3, true);
    expect(data.deletedBranch).toBe(true);
  });

  it("reports deletedBranch=false when --delete-branch was used but no confirmation", () => {
    const data = parsePrClose("https://github.com/owner/repo/pull/3\n", 3, true);
    expect(data.deletedBranch).toBe(false);
  });

  it("leaves deletedBranch undefined when --delete-branch was not used", () => {
    const data = parsePrClose("https://github.com/owner/repo/pull/3\n", 3);
    expect(data.deletedBranch).toBeUndefined();
  });
});

// ── Formatter tests ────────────────────────────────────────────────

describe("formatPrClose", () => {
  it("formats a successful close", () => {
    const data: PrCloseResult = {
      number: 42,
      state: "closed",
      url: "https://github.com/owner/repo/pull/42",
    };
    expect(formatPrClose(data)).toBe("Closed PR #42: https://github.com/owner/repo/pull/42");
  });

  it("annotates already-closed and deleted-branch", () => {
    const data: PrCloseResult = {
      number: 5,
      state: "closed",
      url: "https://github.com/owner/repo/pull/5",
      alreadyClosed: true,
      deletedBranch: true,
    };
    expect(formatPrClose(data)).toContain("[already closed]");
    expect(formatPrClose(data)).toContain("[branch deleted]");
  });
});

// ── Tool handler tests ─────────────────────────────────────────────

describe("pr-close tool handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes gh pr close with the right args and returns structured data", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "https://github.com/owner/repo/pull/12\n",
      stderr: "",
      exitCode: 0,
    });

    const handler = makeServer();
    const out = await handler({ number: "12", comment: "bye", deleteBranch: true });

    expect(out.structuredContent.number).toBe(12);
    expect(out.structuredContent.state).toBe("closed");
    const args = vi.mocked(ghCmd).mock.calls[0][0] as string[];
    expect(args).toEqual(["pr", "close", "12", "--comment", "bye", "--delete-branch"]);
  });

  it("returns errorType=already-closed when gh reports it", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "pull request #12 is already closed",
      exitCode: 1,
    });

    const handler = makeServer();
    const out = await handler({ number: "12" });
    expect(out.structuredContent.errorType).toBe("already-closed");
    expect(out.structuredContent.alreadyClosed).toBe(true);
  });

  it("returns errorType=permission-denied on 403", async () => {
    vi.mocked(ghCmd).mockResolvedValueOnce({
      stdout: "",
      stderr: "HTTP 403 Forbidden",
      exitCode: 1,
    });

    const handler = makeServer();
    const out = await handler({ number: "9" });
    expect(out.structuredContent.errorType).toBe("permission-denied");
  });
});
