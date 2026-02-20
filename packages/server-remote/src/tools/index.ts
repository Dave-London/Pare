import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerSshRunTool } from "./ssh-run.js";
import { registerSshTestTool } from "./ssh-test.js";
import { registerSshKeyscanTool } from "./ssh-keyscan.js";
import { registerRsyncTool } from "./rsync.js";

/** Registers all Remote tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("remote", name);
  if (s("ssh-run")) registerSshRunTool(server);
  if (s("ssh-test")) registerSshTestTool(server);
  if (s("ssh-keyscan")) registerSshKeyscanTool(server);
  if (s("rsync")) registerRsyncTool(server);
}
