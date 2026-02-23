import { describe, it, expect } from "vitest";
import { writeVsCodeConfig } from "../../src/lib/config-writers/json-vscode.js";
import { memoryFs } from "../../src/lib/merge.js";
import { SERVERS } from "../../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;

describe("writeVsCodeConfig", () => {
  it("creates new file with servers key and type stdio", () => {
    const fs = memoryFs();
    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["pare-git"]).toBeDefined();
    expect(written.servers["pare-git"].type).toBe("stdio");
    expect(written.servers["pare-git"].args).toContain("@paretools/git");
  });

  it("preserves existing servers", () => {
    const fs = memoryFs({
      "/mcp.json": JSON.stringify({
        servers: { "my-server": { type: "stdio", command: "x", args: [] } },
      }),
    });

    writeVsCodeConfig("/mcp.json", [git], fs);

    const written = JSON.parse(fs.files.get("/mcp.json")!);
    expect(written.servers["my-server"]).toBeDefined();
    expect(written.servers["pare-git"]).toBeDefined();
  });
});
