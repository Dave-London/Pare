/**
 * server.json checks: MCP Registry rules, enforced before publish.
 *
 * `mcp-publisher publish` runs by hand after npm, so a bad `server.json` used
 * to surface only then: in 0.24.2, server-remote and server-ruby were rejected
 * with a 422 because their descriptions exceeded the registry's 100-character
 * limit. These checks catch that, and npm/registry drift, in CI instead.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const PACKAGES_DIR = resolve(__dirname, "../../../packages");

// Limit enforced by registry.modelcontextprotocol.io ("expected length <= 100").
const REGISTRY_DESCRIPTION_MAX = 100;

const servers = readdirSync(PACKAGES_DIR)
  .filter((dir) => existsSync(resolve(PACKAGES_DIR, dir, "server.json")))
  .map((dir) => ({
    dir,
    server: JSON.parse(readFileSync(resolve(PACKAGES_DIR, dir, "server.json"), "utf-8")),
    pkg: JSON.parse(readFileSync(resolve(PACKAGES_DIR, dir, "package.json"), "utf-8")),
  }));

describe("server.json", () => {
  it("exists for at least one package", () => {
    expect(servers.length).toBeGreaterThan(0);
  });

  describe.each(servers)("$dir", ({ server, pkg }) => {
    it(`has a description of at most ${REGISTRY_DESCRIPTION_MAX} characters`, () => {
      expect(typeof server.description).toBe("string");
      expect(server.description.length).toBeLessThanOrEqual(REGISTRY_DESCRIPTION_MAX);
    });

    it("uses the package.json mcpName as its name", () => {
      expect(server.name).toBe(pkg.mcpName);
    });

    it("matches the package.json version and npm identifier", () => {
      expect(server.version).toBe(pkg.version);
      const npmEntries = (server.packages ?? []).filter(
        (p: { registryType?: string }) => p.registryType === "npm",
      );
      expect(npmEntries.length).toBeGreaterThan(0);
      for (const entry of npmEntries) {
        expect(entry.identifier).toBe(pkg.name);
        expect(entry.version).toBe(pkg.version);
      }
    });
  });
});
