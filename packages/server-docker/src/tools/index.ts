import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPsTool } from "./ps.js";
import { registerBuildTool } from "./build.js";
import { registerLogsTool } from "./logs.js";
import { registerImagesTool } from "./images.js";
import { registerRunTool } from "./run.js";
import { registerExecTool } from "./exec.js";
import { registerComposeUpTool } from "./compose-up.js";
import { registerComposeDownTool } from "./compose-down.js";
import { registerPullTool } from "./pull.js";

export function registerAllTools(server: McpServer) {
  registerPsTool(server);
  registerBuildTool(server);
  registerLogsTool(server);
  registerImagesTool(server);
  registerRunTool(server);
  registerExecTool(server);
  registerComposeUpTool(server);
  registerComposeDownTool(server);
  registerPullTool(server);
}
