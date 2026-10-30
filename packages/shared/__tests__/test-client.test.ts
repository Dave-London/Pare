import { describe, it, expect } from "vitest";
import { connectStdioTestClient, formatStdioConnectFailure } from "../src/test-client.js";

describe("formatStdioConnectFailure", () => {
  it("includes the SDK error message and child stderr", () => {
    const message = formatStdioConnectFailure(
      new Error("MCP error -32000: Connection closed"),
      "boom\n",
    );
    expect(message).toContain("MCP error -32000: Connection closed");
    expect(message).toContain("Server stderr:");
    expect(message).toContain("boom");
  });

  it("reports empty stderr instead of omitting the section", () => {
    const message = formatStdioConnectFailure(new Error("closed"), "   \n");
    expect(message).toContain("Server stderr: (empty)");
  });

  it("marks truncated stderr", () => {
    const message = formatStdioConnectFailure(new Error("closed"), "partial", true);
    expect(message).toContain("[stderr truncated]");
  });
});

describe("connectStdioTestClient", () => {
  it("rethrows connect failures with stderr from the child", async () => {
    await expect(
      connectStdioTestClient({
        command: "node",
        args: ["-e", "process.stderr.write('boom-from-child\\n'); process.exit(3)"],
      }),
    ).rejects.toThrow(/boom-from-child/);
  }, 30_000);

  it("keeps the failure diagnosable when the child emits no stderr", async () => {
    await expect(
      connectStdioTestClient({
        command: "node",
        args: ["-e", "process.exit(4)"],
      }),
    ).rejects.toThrow(/Server stderr: \(empty\)/);
  }, 30_000);
});
