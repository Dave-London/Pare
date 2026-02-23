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

    // Race against timeout
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), SERVER_TIMEOUT),
    );

    await Promise.race([connectPromise, timeoutPromise]);

    const { tools } = await Promise.race([
      client.listTools(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("listTools timeout")), SERVER_TIMEOUT),
      ),
    ]);

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
