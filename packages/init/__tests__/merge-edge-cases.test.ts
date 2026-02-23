import { describe, it, expect, vi, afterEach } from "vitest";
import { memoryFs } from "../src/lib/merge.js";
import { writeMcpServersConfig } from "../src/lib/config-writers/json-mcpservers.js";
import { writeVsCodeConfig } from "../src/lib/config-writers/json-vscode.js";
import { writeZedConfig } from "../src/lib/config-writers/json-zed.js";
import { writeCodexConfig } from "../src/lib/config-writers/toml-codex.js";
import { writeContinueConfig } from "../src/lib/config-writers/yaml-continue.js";
import { SERVERS } from "../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;

const BOM = "\uFEFF";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("json-mcpservers edge cases", () => {
  it("handles empty file gracefully", () => {
    const fs = memoryFs({ "/config.json": "" });
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("handles whitespace-only file gracefully", () => {
    const fs = memoryFs({ "/config.json": "   \n\t  \n  " });
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("handles BOM-prefixed JSON", () => {
    const fs = memoryFs({
      "/config.json":
        BOM + JSON.stringify({ mcpServers: { existing: { command: "x", args: [] } } }),
    });
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["existing"]).toBeDefined();
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("handles malformed JSON by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/config.json": "{ not valid json !!!" });
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Could not parse"));
  });

  it("handles JSON array (wrong root type) by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/config.json": "[1, 2, 3]" });
    // JSON.parse succeeds but the result isn't an object with mcpServers
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
    warnSpy.mockRestore();
  });

  it("preserves large config with many non-Pare entries", () => {
    const bigConfig: Record<string, unknown> = {
      mcpServers: {} as Record<string, { command: string; args: string[] }>,
      settings: { theme: "dark", fontSize: 14 },
      extensions: Array.from({ length: 50 }, (_, i) => `ext-${i}`),
    };
    for (let i = 0; i < 20; i++) {
      (bigConfig.mcpServers as Record<string, unknown>)[`custom-server-${i}`] = {
        command: `cmd-${i}`,
        args: [`arg-${i}`],
      };
    }

    const fs = memoryFs({ "/config.json": JSON.stringify(bigConfig) });
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    // All 20 custom servers preserved
    for (let i = 0; i < 20; i++) {
      expect(written.mcpServers[`custom-server-${i}`]).toBeDefined();
    }
    // Pare server added
    expect(written.mcpServers["pare-git"]).toBeDefined();
    // Non-mcpServers keys preserved
    expect(written.settings).toEqual({ theme: "dark", fontSize: 14 });
    expect(written.extensions).toHaveLength(50);
  });
});

describe("json-mcpservers JSONC support", () => {
  it("preserves existing config when file has single-line comments", () => {
    const fs = memoryFs({
      "/config.json": [
        "{",
        "  // MCP server configuration",
        '  "mcpServers": {',
        '    "my-server": { "command": "node", "args": ["server.js"] }',
        "  }",
        "}",
      ].join("\n"),
    });

    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["my-server"]).toBeDefined();
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("preserves existing config when file has block comments", () => {
    const fs = memoryFs({
      "/config.json": [
        "/* Claude Code settings */",
        "{",
        '  "mcpServers": {',
        '    "custom": { "command": "x", "args": [] }',
        "  }",
        "}",
      ].join("\n"),
    });

    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["custom"]).toBeDefined();
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });
});

describe("json-vscode JSONC support", () => {
  it("preserves existing VS Code config with comments", () => {
    const fs = memoryFs({
      "/mcp.json": [
        "{",
        "  // Copilot MCP servers",
        '  "servers": {',
        '    "my-lsp": { "type": "stdio", "command": "node", "args": ["lsp.js"] }',
        "  }",
        "}",
      ].join("\n"),
    });

    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["my-lsp"]).toBeDefined();
    expect(written.servers["pare-git"]).toBeDefined();
    expect(written.servers["pare-git"].type).toBe("stdio");
  });
});

describe("json-zed JSONC support", () => {
  it("preserves existing Zed settings with comments", () => {
    const fs = memoryFs({
      "/settings.json": [
        "{",
        "  // Zed editor theme",
        '  "theme": "One Dark",',
        "  /* MCP context servers */",
        '  "context_servers": {}',
        "}",
      ].join("\n"),
    });

    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.theme).toBe("One Dark");
    expect(written.context_servers["pare-git"]).toBeDefined();
  });
});

describe("json-vscode edge cases", () => {
  it("handles empty file gracefully", () => {
    const fs = memoryFs({ "/mcp.json": "" });
    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["pare-git"]).toBeDefined();
    expect(written.servers["pare-git"].type).toBe("stdio");
  });

  it("handles BOM-prefixed JSON", () => {
    const fs = memoryFs({
      "/mcp.json": BOM + JSON.stringify({ servers: {} }),
    });
    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["pare-git"]).toBeDefined();
  });

  it("handles malformed JSON by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/mcp.json": "{{{{" });
    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["pare-git"]).toBeDefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("json-zed edge cases", () => {
  it("handles empty file gracefully", () => {
    const fs = memoryFs({ "/settings.json": "" });
    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.context_servers["pare-git"]).toBeDefined();
  });

  it("handles BOM-prefixed JSON", () => {
    const fs = memoryFs({
      "/settings.json": BOM + JSON.stringify({ theme: "gruvbox" }),
    });
    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.theme).toBe("gruvbox");
    expect(written.context_servers["pare-git"]).toBeDefined();
  });

  it("handles malformed JSON by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/settings.json": "not json" });
    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.context_servers["pare-git"]).toBeDefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("toml-codex edge cases", () => {
  it("handles empty file gracefully", () => {
    const fs = memoryFs({ "/config.toml": "" });
    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("pare-git");
  });

  it("handles whitespace-only file gracefully", () => {
    const fs = memoryFs({ "/config.toml": "  \n\n  " });
    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("pare-git");
  });

  it("handles BOM-prefixed TOML", () => {
    const fs = memoryFs({
      "/config.toml": BOM + `model = "gpt-4"\n`,
    });
    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("model");
    expect(content).toContain("pare-git");
  });

  it("handles malformed TOML by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/config.toml": "[[[invalid toml syntax" });
    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("pare-git");
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("yaml-continue edge cases", () => {
  it("handles empty file gracefully", () => {
    const fs = memoryFs({ "/pare.yaml": "" });
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("Pare Tools");
    expect(content).toContain("pare-git");
  });

  it("handles whitespace-only file gracefully", () => {
    const fs = memoryFs({ "/pare.yaml": "   \n\n   " });
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("pare-git");
  });

  it("handles BOM-prefixed YAML", () => {
    const fs = memoryFs({
      "/pare.yaml": BOM + "name: My Config\nschema: v1\n",
    });
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("My Config");
    expect(content).toContain("pare-git");
  });

  it("handles malformed YAML by creating fresh config", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fs = memoryFs({ "/pare.yaml": ":\n  - :\n    - : : :" });
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("Pare Tools");
    expect(content).toContain("pare-git");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("handles YAML that parses to null", () => {
    const fs = memoryFs({ "/pare.yaml": "---\n" });
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("Pare Tools");
    expect(content).toContain("pare-git");
  });
});
