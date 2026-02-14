import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const SERVER_PATH = resolve(__dirname, "../dist/index.js");
const CALL_TIMEOUT = 120_000;

describe("@paretools/process integration", () => {
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

  it("lists 1 tool", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["run"]);
  });

  it("tool has an outputSchema", async () => {
    const { tools } = await client.listTools();
    expect(tools[0].outputSchema).toBeDefined();
    expect(tools[0].outputSchema!.type).toBe("object");
  });

  describe("run", () => {
    it("executes a simple command and returns structured output", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: { command: "node", args: ["-e", "console.log(42)"] },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBeFalsy();
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.success).toBe(true);
      expect(sc.exitCode).toBe(0);
      expect(typeof sc.duration).toBe("number");
      expect(sc.timedOut).toBe(false);
      expect(sc.command).toBe("node");
    });

    it("returns exit code for a failing command", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: { command: "node", args: ["-e", "process.exit(1)"] },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBeFalsy();
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.success).toBe(false);
      expect(sc.exitCode).toBe(1);
    });

    it("captures stdout in full output mode", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: {
            command: "node",
            args: ["-e", "console.log('hello-from-process')"],
            compact: false,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBeFalsy();
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.stdout).toContain("hello-from-process");
    });

    it("handles command-not-found gracefully", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: { command: "nonexistent-cmd-for-testing-xyz" },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      // Command-not-found should result in an error
      expect(result.isError).toBe(true);
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0].text).toMatch(/not found|ENOENT|failed|error|nonexistent/i);
    });

    it("accepts env parameter", async () => {
      const result = await client.callTool(
        {
          name: "run",
          arguments: {
            command: "node",
            args: ["-e", "console.log(process.env.TEST_VAR)"],
            env: { TEST_VAR: "hello-env" },
            compact: false,
          },
        },
        undefined,
        { timeout: CALL_TIMEOUT },
      );

      expect(result.isError).toBeFalsy();
      const sc = result.structuredContent as Record<string, unknown>;
      expect(sc).toBeDefined();
      expect(sc.stdout).toContain("hello-env");
    });
  });
});
