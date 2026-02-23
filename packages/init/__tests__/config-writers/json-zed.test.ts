import { describe, it, expect } from "vitest";
import { writeZedConfig } from "../../src/lib/config-writers/json-zed.js";
import { memoryFs } from "../../src/lib/merge.js";
import { SERVERS } from "../../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;

describe("writeZedConfig", () => {
  it("creates new file with context_servers key and env", () => {
    const fs = memoryFs();
    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.context_servers["pare-git"]).toBeDefined();
    expect(written.context_servers["pare-git"].env).toEqual({});
    expect(written.context_servers["pare-git"].args).toContain("@paretools/git");
  });

  it("preserves existing Zed settings", () => {
    const fs = memoryFs({
      "/settings.json": JSON.stringify({
        theme: "One Dark",
        context_servers: { other: { command: "x", args: [], env: {} } },
      }),
    });

    writeZedConfig("/settings.json", [git], fs);

    const written = JSON.parse(fs.files.get("/settings.json")!);
    expect(written.theme).toBe("One Dark");
    expect(written.context_servers["other"]).toBeDefined();
    expect(written.context_servers["pare-git"]).toBeDefined();
  });
});
