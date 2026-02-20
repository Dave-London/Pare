import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shouldRegisterTool } from "@paretools/shared";
import { registerGradleBuildTool } from "./gradle-build.js";
import { registerGradleTestTool } from "./gradle-test.js";
import { registerGradleTasksTool } from "./gradle-tasks.js";
import { registerGradleDependenciesTool } from "./gradle-dependencies.js";
import { registerMavenBuildTool } from "./maven-build.js";
import { registerMavenTestTool } from "./maven-test.js";
import { registerMavenDependenciesTool } from "./maven-dependencies.js";
import { registerMavenVerifyTool } from "./maven-verify.js";

/** Registers all JVM tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer) {
  const s = (name: string) => shouldRegisterTool("jvm", name);
  if (s("gradle-build")) registerGradleBuildTool(server);
  if (s("gradle-test")) registerGradleTestTool(server);
  if (s("gradle-tasks")) registerGradleTasksTool(server);
  if (s("gradle-dependencies")) registerGradleDependenciesTool(server);
  if (s("maven-build")) registerMavenBuildTool(server);
  if (s("maven-test")) registerMavenTestTool(server);
  if (s("maven-dependencies")) registerMavenDependenciesTool(server);
  if (s("maven-verify")) registerMavenVerifyTool(server);
}
