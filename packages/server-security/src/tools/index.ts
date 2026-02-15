import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerTrivyTool } from "./trivy.js";
import { registerSemgrepTool } from "./semgrep.js";
import { registerGitleaksTool } from "./gitleaks.js";

/** Registers all security tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("security", name);
  if (s("trivy")) registerTrivyTool(server);
  if (s("semgrep")) registerSemgrepTool(server);
  if (s("gitleaks")) registerGitleaksTool(server);
}
