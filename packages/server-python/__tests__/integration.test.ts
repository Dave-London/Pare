import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");

/** MCP SDK defaults to 60 s request timeout; override for CI where shell spawning is slow. */
const CALL_TIMEOUT = { timeout: 120_000 };

describe("@paretools/python integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [SERVER_PATH],
      stderr: "pipe",
    });

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
  });

  it("lists all 14 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "black",
      "conda",
      "mypy",
      "pip-audit",
      "pip-install",
      "pip-list",
      "pip-show",
      "poetry",
      "pyenv",
      "pytest",
      "ruff-check",
      "ruff-format",
      "uv-install",
      "uv-run",
    ]);
  });

  it("each tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.outputSchema!.type).toBe("object");
    }
  });

  describe("ruff-check", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "ruff-check", arguments: { path: resolve(__dirname, "../../..") } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        // ruff not installed — verify meaningful error
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/ruff|command|not found/i);
      } else {
        // ruff is available — verify structured output
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.total).toEqual(expect.any(Number));
        expect(sc.fixable).toEqual(expect.any(Number));
        expect(Array.isArray(sc.diagnostics)).toBe(true);
      }
    });
  });

  describe("pip-install", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pip-install", arguments: { packages: ["nonexistent-pkg-xyz-12345"] } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pip|command|not found/i);
      } else {
        // May return compact output (success + total + alreadySatisfied)
        // or full output (adds installed[]). Check fields present in both.
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.alreadySatisfied).toBe("boolean");
      }
    });
  });

  describe("mypy", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "mypy", arguments: { targets: ["nonexistent_dir_xyz"] } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/mypy|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(Array.isArray(sc.diagnostics)).toBe(true);
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.errors).toBe("number");
        expect(typeof sc.warnings).toBe("number");
      }
    });
  });

  describe("pip-audit", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pip-audit", arguments: {} },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pip-audit|pip.audit|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(Array.isArray(sc.vulnerabilities)).toBe(true);
        expect(typeof sc.total).toBe("number");
      }
    });
  });

  describe("pytest", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pytest", arguments: { targets: ["nonexistent_test_dir_xyz"] } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pytest|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.passed).toBe("number");
        expect(typeof sc.failed).toBe("number");
        expect(typeof sc.errors).toBe("number");
        expect(typeof sc.skipped).toBe("number");
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.duration).toBe("number");
        expect(Array.isArray(sc.failures)).toBe(true);
      }
    });
  });

  describe("uv-install", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "uv-install", arguments: { packages: ["nonexistent-pkg-xyz-12345"] } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/uv|command|not found/i);
      } else {
        // May return compact output (success + total + duration)
        // or full output (adds installed[]). Check fields present in both.
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.total).toBe("number");
        expect(typeof sc.duration).toBe("number");
      }
    });
  });

  describe("uv-run", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "uv-run", arguments: { command: ["python", "--version"] } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/uv|command|not found/i);
      } else {
        // May return compact output (exitCode + success + duration)
        // or full output (adds stdout, stderr). Check fields present in both.
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.exitCode).toBe("number");
        expect(typeof sc.duration).toBe("number");
      }
    });
  });

  describe("black", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "black", arguments: { targets: ["nonexistent_dir_xyz"], check: true } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/black|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.filesChanged).toBe("number");
        expect(typeof sc.filesUnchanged).toBe("number");
        expect(typeof sc.filesChecked).toBe("number");
        expect(Array.isArray(sc.wouldReformat)).toBe(true);
      }
    });
  });

  describe("pip-list", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pip-list", arguments: {} },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pip|command|not found/i);
      } else {
        // May return compact output (total only) or full output (adds packages[]).
        // Check the field present in both.
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.total).toBe("number");
      }
    });
  });

  describe("pip-show", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pip-show", arguments: { package: "pip" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pip|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.name).toBe("string");
        expect(typeof sc.version).toBe("string");
        expect(typeof sc.summary).toBe("string");
        expect(Array.isArray(sc.requires)).toBe(true);
      }
    });
  });

  describe("ruff-format", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "ruff-format", arguments: { patterns: ["nonexistent_dir_xyz"], check: true } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/ruff|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(typeof sc.filesChanged).toBe("number");
      }
    });
  });

  describe("conda", () => {
    it("returns structured data for info action or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "conda", arguments: { action: "info" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/conda|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.action).toBe("info");
        expect(typeof sc.condaVersion).toBe("string");
        expect(typeof sc.platform).toBe("string");
        expect(typeof sc.pythonVersion).toBe("string");
        expect(typeof sc.defaultPrefix).toBe("string");
        expect(Array.isArray(sc.channels)).toBe(true);
      }
    });

    it("returns structured data for env-list action or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "conda", arguments: { action: "env-list" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/conda|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.action).toBe("env-list");
        expect(Array.isArray(sc.environments)).toBe(true);
        expect(typeof sc.total).toBe("number");
      }
    });

    it("returns structured data for list action or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "conda", arguments: { action: "list" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/conda|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.action).toBe("list");
        expect(Array.isArray(sc.packages)).toBe(true);
        expect(typeof sc.total).toBe("number");
      }
    });
  });

  describe("pyenv", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "pyenv", arguments: { action: "version" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/pyenv|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(sc.action).toBe("version");
        expect(typeof sc.success).toBe("boolean");
      }
    });
  });

  describe("poetry", () => {
    it("returns structured data or a command-not-found error", async () => {
      const result = await client.callTool(
        { name: "poetry", arguments: { action: "show" } },
        undefined,
        CALL_TIMEOUT,
      );

      if (result.isError) {
        const content = result.content as Array<{ type: string; text: string }>;
        expect(content[0].text).toMatch(/poetry|command|not found/i);
      } else {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc).toBeDefined();
        expect(typeof sc.success).toBe("boolean");
        expect(sc.action).toBe("show");
        expect(typeof sc.total).toBe("number");
      }
    });
  });
});
