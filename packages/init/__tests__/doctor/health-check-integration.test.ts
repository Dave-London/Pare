import { describe, it, expect } from "vitest";
import { checkServer } from "../../src/lib/doctor/health-check.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isWindows } from "../../src/lib/platform.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

// Path to a known-good built server
const GIT_SERVER = resolve(__dirname, "../../../server-git/dist/index.js");

describe("checkServer", () => {
  it("passes for a known-good server (pare-git)", async () => {
    const result = await checkServer("pare-git", "node", [GIT_SERVER]);

    expect(result.serverId).toBe("pare-git");
    expect(result.status).toBe("pass");
    expect(result.toolCount).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  }, 30_000);

  it("fails for a non-existent command", async () => {
    const result = await checkServer("bad-server", "this-command-does-not-exist-xyz", ["--bogus"]);

    expect(result.serverId).toBe("bad-server");
    expect(result.status).toBe("fail");
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeGreaterThan(0);
  }, 20_000);

  it("fails for a command that exits immediately", async () => {
    // "node -e process.exit(1)" exits with code 1 — not a valid MCP server
    const script = "process.exit(1)";
    const result = await checkServer("crash-server", "node", ["-e", script]);

    expect(result.serverId).toBe("crash-server");
    expect(result.status).toBe("fail");
    expect(result.error).toBeDefined();
  }, 20_000);

  it("fails for a command that outputs garbage (not MCP protocol)", async () => {
    const script = 'console.log("hello world"); setTimeout(() => process.exit(0), 500)';
    const result = await checkServer("garbage-server", "node", ["-e", script]);

    expect(result.serverId).toBe("garbage-server");
    expect(result.status).toBe("fail");
    expect(result.error).toBeDefined();
  }, 20_000);

  it("reports latency even on failure", async () => {
    const result = await checkServer("nonexistent", "this-command-does-not-exist-xyz", []);

    expect(result.latencyMs).toBeDefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  }, 20_000);
});
