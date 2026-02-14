import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerPsTool } from "./ps.js";
import { registerBuildTool } from "./build.js";
import { registerLogsTool } from "./logs.js";
import { registerImagesTool } from "./images.js";
import { registerRunTool } from "./run.js";
import { registerExecTool } from "./exec.js";
import { registerComposeUpTool } from "./compose-up.js";
import { registerComposeDownTool } from "./compose-down.js";
import { registerPullTool } from "./pull.js";
import { registerInspectTool } from "./inspect.js";
import { registerNetworkLsTool } from "./network-ls.js";
import { registerVolumeLsTool } from "./volume-ls.js";
import { registerComposePsTool } from "./compose-ps.js";

import { registerComposeLogsTool } from "./compose-logs.js";
import { registerComposeBuildTool } from "./compose-build.js";
import { registerStatsTool } from "./stats.js";

export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("docker", name);
  if (s("ps")) registerPsTool(server);
  if (s("build")) registerBuildTool(server);
  if (s("logs")) registerLogsTool(server);
  if (s("images")) registerImagesTool(server);
  if (s("run")) registerRunTool(server);
  if (s("exec")) registerExecTool(server);
  if (s("compose-up")) registerComposeUpTool(server);
  if (s("compose-down")) registerComposeDownTool(server);
  if (s("pull")) registerPullTool(server);
  if (s("inspect")) registerInspectTool(server);
  if (s("network-ls")) registerNetworkLsTool(server);
  if (s("volume-ls")) registerVolumeLsTool(server);
  if (s("compose-ps")) registerComposePsTool(server);

  if (s("compose-logs")) registerComposeLogsTool(server);
  if (s("compose-build")) registerComposeBuildTool(server);
  if (s("stats")) registerStatsTool(server);
}
