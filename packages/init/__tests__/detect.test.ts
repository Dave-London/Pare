import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectClients } from "../src/lib/detect.js";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

import { existsSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("detectClients", () => {
  it("returns empty array when no client paths exist", () => {
    mockExistsSync.mockReturnValue(false);
    const result = detectClients();
    expect(result).toEqual([]);
  });

  it("returns clients whose detectPaths exist on the filesystem", () => {
    // Only return true for paths containing ".claude" (Claude Code's detect path)
    mockExistsSync.mockImplementation((p) => {
      return typeof p === "string" && p.includes(".claude");
    });
    const result = detectClients();
    const ids = result.map((c) => c.id);
    expect(ids).toContain("claude-code");
  });

  it("returns multiple clients when multiple paths exist", () => {
    mockExistsSync.mockImplementation((p) => {
      if (typeof p !== "string") return false;
      return p.includes(".claude") || p.includes(".cursor");
    });
    const result = detectClients();
    const ids = result.map((c) => c.id);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
  });
});
