/**
 * Integration-test helper for MCP stdio servers.
 *
 * Why this exists (#1085): stdio integration tests spawn a server child and
 * call `client.connect(transport)`. When the child dies at startup, the SDK
 * surfaces only `MCP error -32000: Connection closed` and the child's stderr is
 * piped but never read, so the failure is undiagnosable. This helper attaches a
 * bounded stderr collector before connecting and rethrows connect failures with
 * that stderr attached.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  type StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";

export interface StdioTestClient {
  client: Client;
  transport: StdioClientTransport;
  /** Returns stderr collected so far (bounded by `maxStderrBytes`). */
  getStderr: () => string;
}

export interface ConnectStdioTestClientOptions extends StdioServerParameters {
  clientInfo?: { name: string; version: string };
  /** Maximum stderr bytes retained for failure diagnostics. Defaults to 64 KiB. */
  maxStderrBytes?: number;
}

/**
 * Spawns an MCP stdio server for an integration test and connects a client.
 *
 * On connect failure, the thrown error includes any stderr emitted by the
 * child before it died. The transport is closed best-effort before rethrowing.
 */
export async function connectStdioTestClient(
  options: ConnectStdioTestClientOptions,
): Promise<StdioTestClient> {
  const {
    clientInfo = { name: "pare-integration-test-client", version: "1.0.0" },
    maxStderrBytes = 64 * 1024,
    ...serverParams
  } = options;

  const transport = new StdioClientTransport({ ...serverParams, stderr: "pipe" });

  let stderr = "";
  let truncated = false;
  const stderrStream = transport.stderr;
  if (stderrStream) {
    stderrStream.on("data", (chunk: unknown) => {
      if (truncated) return;
      const text =
        typeof chunk === "string" ? chunk : Buffer.from(chunk as Uint8Array).toString("utf8");
      const used = Buffer.byteLength(stderr, "utf8");
      const remaining = maxStderrBytes - used;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      const bytes = Buffer.from(text, "utf8");
      if (bytes.length <= remaining) {
        stderr += text;
      } else {
        stderr += bytes.subarray(0, remaining).toString("utf8");
        truncated = true;
      }
    });
  }

  const client = new Client(clientInfo);
  try {
    await client.connect(transport);
  } catch (error) {
    try {
      await transport.close();
    } catch {
      // Best-effort cleanup; preserve the original connect failure.
    }
    throw new Error(formatStdioConnectFailure(error, stderr, truncated), { cause: error });
  }

  return { client, transport, getStderr: () => stderr };
}

/**
 * Formats a stdio connect failure with bounded child stderr. Exported for unit
 * testing without spawning a process.
 */
export function formatStdioConnectFailure(
  error: unknown,
  stderr: string,
  truncated = false,
): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = [`MCP stdio test client failed to connect: ${message}`];
  const detail = stderr.trim();
  lines.push(
    detail
      ? `Server stderr:\n${detail}${truncated ? "\n[stderr truncated]" : ""}`
      : "Server stderr: (empty)",
  );
  return lines.join("\n");
}
