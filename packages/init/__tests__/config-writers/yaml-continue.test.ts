import { describe, it, expect } from "vitest";
import { writeContinueConfig } from "../../src/lib/config-writers/yaml-continue.js";
import { memoryFs } from "../../src/lib/merge.js";
import { SERVERS } from "../../src/lib/servers.js";

const git = SERVERS.find((s) => s.id === "pare-git")!;
const test = SERVERS.find((s) => s.id === "pare-test")!;

describe("writeContinueConfig", () => {
  it("creates new YAML file with defaults", () => {
    const fs = memoryFs();
    writeContinueConfig("/pare.yaml", [git], fs);

    const content = fs.files.get("/pare.yaml")!;
    expect(content).toContain("Pare Tools");
    expect(content).toContain("v1");
    expect(content).toContain("pare-git");
    expect(content).toContain("stdio");
    expect(content).toContain("@paretools/git");
  });

  it("merges into existing YAML without duplicates", () => {
    const fs = memoryFs({
      "/pare.yaml": [
        "name: Pare Tools",
        "version: 0.0.1",
        "schema: v1",
        "mcpServers:",
        "  - name: pare-git",
        "    type: stdio",
        "    command: old-npx",
        '    args: ["-y", "@paretools/git"]',
      ].join("\n"),
    });

    writeContinueConfig("/pare.yaml", [git, test], fs);

    const content = fs.files.get("/pare.yaml")!;
    // Should have updated pare-git (not duplicated) and added pare-test
    const gitMatches = content.match(/pare-git/g);
    expect(gitMatches?.length).toBe(1);
    expect(content).toContain("pare-test");
  });
});
