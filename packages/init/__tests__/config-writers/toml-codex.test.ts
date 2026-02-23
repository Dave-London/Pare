import { describe, it, expect } from "vitest";
import { writeCodexConfig } from "../../src/lib/config-writers/toml-codex.js";
import { memoryFs } from "../../src/lib/merge.js";
import { SERVERS } from "../../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;

describe("writeCodexConfig", () => {
  it("creates new TOML file with mcp_servers section", () => {
    const fs = memoryFs();
    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("mcp_servers");
    expect(content).toContain("pare-git");
    expect(content).toContain("@paretools/git");
  });

  it("merges into existing TOML", () => {
    const fs = memoryFs({
      "/config.toml": `model = "gpt-4"\n\n[mcp_servers.other]\ncommand = "x"\nargs = []\n`,
    });

    writeCodexConfig("/config.toml", [git], fs);

    const content = fs.files.get("/config.toml")!;
    expect(content).toContain("model");
    expect(content).toContain("other");
    expect(content).toContain("pare-git");
  });
});
