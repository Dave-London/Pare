import { describe, it, expect } from "vitest";
import {
  writeMcpServersConfig,
  buildMcpServersEntries,
} from "../../src/lib/config-writers/json-mcpservers.js";
import { memoryFs } from "../../src/lib/merge.js";
import { SERVERS } from "../../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;
const test = SERVERS.find((s) => s.id === "pare-test")!;

describe("buildMcpServersEntries", () => {
  it("builds entries for given servers", () => {
    const entries = buildMcpServersEntries([git, test]);
    expect(entries["pare-git"]).toBeDefined();
    expect(entries["pare-test"]).toBeDefined();
    expect(entries["pare-git"].args).toContain("@paretools/git");
  });
});

describe("writeMcpServersConfig", () => {
  it("creates new file with mcpServers key", () => {
    const fs = memoryFs();
    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"]).toBeDefined();
  });

  it("merges into existing config", () => {
    const fs = memoryFs({
      "/config.json": JSON.stringify({
        mcpServers: { "other-server": { command: "x", args: [] } },
        otherKey: true,
      }),
    });

    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["other-server"]).toBeDefined();
    expect(written.mcpServers["pare-git"]).toBeDefined();
    expect(written.otherKey).toBe(true);
  });

  it("overwrites existing pare entry", () => {
    const fs = memoryFs({
      "/config.json": JSON.stringify({
        mcpServers: { "pare-git": { command: "old", args: [] } },
      }),
    });

    writeMcpServersConfig("/config.json", [git], fs);

    const written = JSON.parse(fs.files.get("/config.json")!);
    expect(written.mcpServers["pare-git"].args).toContain("@paretools/git");
  });
});
