import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractPareServers } from "../src/lib/extract-servers.js";
import type { ClientEntry } from "../src/lib/clients.js";

// Mock fs module
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

import { existsSync, readFileSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

function makeClient(overrides: Partial<ClientEntry>): ClientEntry {
  return {
    id: "test",
    name: "Test",
    configPath: "/config.json",
    format: "json-mcpservers",
    scope: "user",
    detectPaths: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("extractPareServers", () => {
  it("returns empty map when config file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    const client = makeClient({});
    const result = extractPareServers(client, "/project");
    expect(result.size).toBe(0);
  });

  it("returns empty map when config cannot be parsed", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("not valid json {{{");
    const client = makeClient({});
    const result = extractPareServers(client, "/project");
    expect(result.size).toBe(0);
  });

  describe("json-mcpservers format", () => {
    it("extracts pare- prefixed servers", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          mcpServers: {
            "pare-git": { command: "npx", args: ["-y", "@paretools/git"] },
            "pare-npm": { command: "npx", args: ["-y", "@paretools/npm"] },
            "other-server": { command: "node", args: ["server.js"] },
          },
        }),
      );
      const client = makeClient({ format: "json-mcpservers" });
      const result = extractPareServers(client, "/project");

      expect(result.size).toBe(2);
      expect(result.get("pare-git")).toEqual({ command: "npx", args: ["-y", "@paretools/git"] });
      expect(result.get("pare-npm")).toEqual({ command: "npx", args: ["-y", "@paretools/npm"] });
      expect(result.has("other-server")).toBe(false);
    });

    it("returns empty map when mcpServers is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({}));
      const client = makeClient({ format: "json-mcpservers" });
      const result = extractPareServers(client, "/project");
      expect(result.size).toBe(0);
    });
  });

  describe("json-vscode format", () => {
    it("extracts pare- prefixed servers", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          servers: {
            "pare-git": { type: "stdio", command: "npx", args: ["-y", "@paretools/git"] },
            other: { type: "stdio", command: "node", args: ["s.js"] },
          },
        }),
      );
      const client = makeClient({ format: "json-vscode" });
      const result = extractPareServers(client, "/project");

      expect(result.size).toBe(1);
      expect(result.get("pare-git")).toEqual({ command: "npx", args: ["-y", "@paretools/git"] });
    });

    it("returns empty map when servers is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({}));
      const client = makeClient({ format: "json-vscode" });
      const result = extractPareServers(client, "/project");
      expect(result.size).toBe(0);
    });
  });

  describe("json-zed format", () => {
    it("extracts pare- prefixed servers from context_servers", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          context_servers: {
            "pare-search": { command: "npx", args: ["-y", "@paretools/search"] },
            "non-pare": { command: "node", args: ["x.js"] },
          },
        }),
      );
      const client = makeClient({ format: "json-zed" });
      const result = extractPareServers(client, "/project");

      expect(result.size).toBe(1);
      expect(result.get("pare-search")).toEqual({
        command: "npx",
        args: ["-y", "@paretools/search"],
      });
    });

    it("returns empty map when context_servers is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({}));
      const client = makeClient({ format: "json-zed" });
      const result = extractPareServers(client, "/project");
      expect(result.size).toBe(0);
    });
  });

  describe("toml-codex format", () => {
    it("extracts pare- prefixed servers from mcp_servers", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        [
          '[mcp_servers."pare-git"]',
          'command = "npx"',
          'args = ["-y", "@paretools/git"]',
          "",
          '[mcp_servers."other"]',
          'command = "node"',
          'args = ["x.js"]',
        ].join("\n"),
      );
      const client = makeClient({ format: "toml-codex" });
      const result = extractPareServers(client, "/project");

      expect(result.size).toBe(1);
      expect(result.get("pare-git")!.command).toBe("npx");
    });

    it("returns empty map when mcp_servers is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('model = "gpt-4"\n');
      const client = makeClient({ format: "toml-codex" });
      const result = extractPareServers(client, "/project");
      expect(result.size).toBe(0);
    });
  });

  describe("yaml-continue format", () => {
    it("extracts pare- prefixed servers from mcpServers array", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        [
          "mcpServers:",
          "  - name: pare-git",
          "    command: npx",
          "    args:",
          "      - -y",
          "      - '@paretools/git'",
          "  - name: other-server",
          "    command: node",
          "    args:",
          "      - server.js",
        ].join("\n"),
      );
      const client = makeClient({ format: "yaml-continue" });
      const result = extractPareServers(client, "/project");

      expect(result.size).toBe(1);
      expect(result.get("pare-git")!.command).toBe("npx");
    });

    it("returns empty map when mcpServers is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("name: Pare Tools\n");
      const client = makeClient({ format: "yaml-continue" });
      const result = extractPareServers(client, "/project");
      expect(result.size).toBe(0);
    });
  });

  it("resolves {project} placeholder in config path", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ mcpServers: {} }));
    const client = makeClient({ configPath: "{project}/.claude/settings.json" });
    extractPareServers(client, "/my/project");

    expect(mockExistsSync).toHaveBeenCalledWith("/my/project/.claude/settings.json");
  });
});
