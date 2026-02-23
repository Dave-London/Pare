import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface HealthResult {
  serverId: string;
  status: "pass" | "fail";
  toolCount?: number;
  latencyMs?: number;
  error?: string;
}

const SERVER_TIMEOUT = 15_000;

/** Race a promise against a timeout, cleaning up the timer on resolution. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Spawn a Pare MCP server, perform initialize + listTools, report health.
 */
export async function checkServer(
  serverId: string,
  command: string,
  args: string[],
): Promise<HealthResult> {
  const start = Date.now();

  try {
    const transport = new StdioClientTransport({
      command,
      args,
      stderr: "pipe",
    });

    const client = new Client({ name: "pare-doctor", version: "1.0.0" });

    await withTimeout(client.connect(transport), SERVER_TIMEOUT, "Connection");

    const { tools } = await withTimeout(client.listTools(), SERVER_TIMEOUT, "listTools");

    const latencyMs = Date.now() - start;

    // Clean up
    try {
      await transport.close();
    } catch {
      // Ignore close errors
    }

    return {
      serverId,
      status: "pass",
      toolCount: tools.length,
      latencyMs,
    };
  } catch (err) {
    return {
      serverId,
      status: "fail",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
