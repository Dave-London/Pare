import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerGradleBuildTool } from "./gradle-build.js";
import { registerGradleTestTool } from "./gradle-test.js";
import { registerGradleTasksTool } from "./gradle-tasks.js";
import { registerGradleDependenciesTool } from "./gradle-dependencies.js";
import { registerMavenBuildTool } from "./maven-build.js";
import { registerMavenTestTool } from "./maven-test.js";
import { registerMavenDependenciesTool } from "./maven-dependencies.js";
import { registerMavenVerifyTool } from "./maven-verify.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "gradle-build",
    description:
      "Runs `gradle build` and returns structured output with diagnostics, task counts, and exit code.",
    register: registerGradleBuildTool,
  },
  {
    name: "gradle-test",
    description:
      "Runs `gradle test` and returns structured test results with pass/fail counts and individual test outcomes.",
    register: registerGradleTestTool,
  },
  {
    name: "gradle-tasks",
    description: "Lists available Gradle tasks with descriptions and groups.",
    register: registerGradleTasksTool,
  },
  {
    name: "gradle-dependencies",
    description: "Shows the Gradle dependency tree with structured output per configuration.",
    register: registerGradleDependenciesTool,
  },
  {
    name: "maven-build",
    description:
      "Runs `mvn package` (or specified goals) and returns structured build output with diagnostics.",
    register: registerMavenBuildTool,
  },
  {
    name: "maven-test",
    description:
      "Runs `mvn test` and returns structured Surefire test results with pass/fail/error counts.",
    register: registerMavenTestTool,
  },
  {
    name: "maven-dependencies",
    description: "Shows the Maven dependency tree with structured output per artifact.",
    register: registerMavenDependenciesTool,
  },
  {
    name: "maven-verify",
    description: "Runs `mvn verify` to execute all checks and returns structured results.",
    register: registerMavenVerifyTool,
  },
];

/** Registers all JVM tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("jvm", name);
  const isCore = (name: string) => isCoreToolForServer("jvm", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "jvm");
  }
}
