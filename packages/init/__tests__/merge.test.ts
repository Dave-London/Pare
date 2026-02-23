import { describe, it, expect } from "vitest";
import { mergeConfig, memoryFs } from "../src/lib/merge.js";
import { getClients } from "../src/lib/clients.js";
import { SERVERS } from "../src/lib/servers.js";

const testServers = SERVERS.filter((s) => ["pare-git", "pare-test"].includes(s.id));

describe("mergeConfig", () => {
  it("creates new config for claude-code", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const fs = memoryFs();
    const result = mergeConfig(client, testServers, "/project", fs);

    expect(result.configPath).toBe("/project/.claude/settings.local.json");
    expect(result.serverCount).toBe(2);

    const written = JSON.parse(fs.files.get(result.configPath)!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
    expect(written.mcpServers["pare-test"]).toBeDefined();
    expect(written.mcpServers["pare-git"].args).toContain("@paretools/git");
  });

  it("preserves existing non-Pare entries", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const fs = memoryFs({
      "/project/.claude/settings.local.json": JSON.stringify({
        mcpServers: {
          "my-custom-server": { command: "node", args: ["custom.js"] },
        },
      }),
    });

    mergeConfig(client, testServers, "/project", fs);

    const written = JSON.parse(fs.files.get("/project/.claude/settings.local.json")!);
    expect(written.mcpServers["my-custom-server"]).toBeDefined();
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("overwrites existing Pare entries", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const fs = memoryFs({
      "/project/.claude/settings.local.json": JSON.stringify({
        mcpServers: {
          "pare-git": { command: "old-cmd", args: ["old"] },
        },
      }),
    });

    mergeConfig(client, testServers, "/project", fs);

    const written = JSON.parse(fs.files.get("/project/.claude/settings.local.json")!);
    expect(written.mcpServers["pare-git"].args).toContain("@paretools/git");
  });

  it("creates config for vscode format", () => {
    const client = getClients().find((c) => c.id === "vscode")!;
    const fs = memoryFs();
    mergeConfig(client, testServers, "/project", fs);

    const written = JSON.parse(fs.files.get("/project/.vscode/mcp.json")!);
    expect(written.servers["pare-git"]).toBeDefined();
    expect(written.servers["pare-git"].type).toBe("stdio");
  });

  it("creates config for zed format", () => {
    const client = getClients().find((c) => c.id === "zed")!;
    const fs = memoryFs();
    mergeConfig(client, testServers, "/project", fs);

    const configPath = client.configPath;
    const written = JSON.parse(fs.files.get(configPath)!);
    expect(written.context_servers["pare-git"]).toBeDefined();
    expect(written.context_servers["pare-git"].env).toEqual({});
  });

  it("creates config for codex TOML format", () => {
    const client = getClients().find((c) => c.id === "codex")!;
    const fs = memoryFs();
    mergeConfig(client, testServers, "/project", fs);

    const content = fs.files.get("/project/.codex/config.toml")!;
    expect(content).toContain("pare-git");
    expect(content).toContain("@paretools/git");
  });

  it("creates config for continue YAML format", () => {
    const client = getClients().find((c) => c.id === "continue")!;
    const fs = memoryFs();
    mergeConfig(client, testServers, "/project", fs);

    const content = fs.files.get("/project/.continue/mcpServers/pare.yaml")!;
    expect(content).toContain("pare-git");
    expect(content).toContain("Pare Tools");
    expect(content).toContain("stdio");
  });
});

describe("mergeConfig backup", () => {
  it("creates .bak backup when existing config file exists", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const existingContent = JSON.stringify({
      mcpServers: { "my-server": { command: "node", args: ["custom.js"] } },
    });
    const fs = memoryFs({
      "/project/.claude/settings.local.json": existingContent,
    });

    const result = mergeConfig(client, testServers, "/project", fs);

    expect(result.backupPath).toBe("/project/.claude/settings.local.json.bak");
    expect(fs.files.get("/project/.claude/settings.local.json.bak")).toBe(existingContent);
  });

  it("does not create backup when config file does not exist", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const fs = memoryFs();

    const result = mergeConfig(client, testServers, "/project", fs);

    expect(result.backupPath).toBeUndefined();
    expect(fs.files.has("/project/.claude/settings.local.json.bak")).toBe(false);
  });

  it("backup preserves exact original content", () => {
    const client = getClients().find((c) => c.id === "claude-code")!;
    const original = JSON.stringify(
      { mcpServers: { old: { command: "x", args: [] } }, custom: "data" },
      null,
      2,
    );
    const fs = memoryFs({
      "/project/.claude/settings.local.json": original,
    });

    mergeConfig(client, testServers, "/project", fs);

    const backup = fs.files.get("/project/.claude/settings.local.json.bak")!;
    expect(backup).toBe(original);
    // Original file should be updated (not equal to backup)
    const updated = fs.files.get("/project/.claude/settings.local.json")!;
    expect(updated).not.toBe(original);
    // Round-trip: backup should parse and contain original data
    const parsed = JSON.parse(backup);
    expect(parsed.custom).toBe("data");
  });

  it("creates backup for TOML config files", () => {
    const client = getClients().find((c) => c.id === "codex")!;
    const tomlContent = `model = "gpt-4"\n`;
    const fs = memoryFs({
      "/project/.codex/config.toml": tomlContent,
    });

    const result = mergeConfig(client, testServers, "/project", fs);

    expect(result.backupPath).toBe("/project/.codex/config.toml.bak");
    expect(fs.files.get("/project/.codex/config.toml.bak")).toBe(tomlContent);
  });

  it("creates backup for YAML config files", () => {
    const client = getClients().find((c) => c.id === "continue")!;
    const yamlContent = "name: Pare Tools\nversion: 0.0.1\nschema: v1\n";
    const fs = memoryFs({
      "/project/.continue/mcpServers/pare.yaml": yamlContent,
    });

    const result = mergeConfig(client, testServers, "/project", fs);

    expect(result.backupPath).toBe("/project/.continue/mcpServers/pare.yaml.bak");
    expect(fs.files.get("/project/.continue/mcpServers/pare.yaml.bak")).toBe(yamlContent);
  });
});
