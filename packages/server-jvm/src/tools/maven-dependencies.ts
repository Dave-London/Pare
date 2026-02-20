import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, compactInput, projectPathInput } from "@paretools/shared";
import { mvnCmd } from "../lib/jvm-runner.js";
import { parseMavenDependencies } from "../lib/parsers.js";
import {
  formatMavenDependencies,
  compactMavenDepsMap,
  formatMavenDepsCompact,
} from "../lib/formatters.js";
import { MavenDependenciesResultSchema } from "../schemas/index.js";

export function registerMavenDependenciesTool(server: McpServer) {
  server.registerTool(
    "maven-dependencies",
    {
      title: "Maven Dependencies",
      description: "Shows the Maven dependency tree with structured output per artifact.",
      inputSchema: {
        path: projectPathInput,
        compact: compactInput,
      },
      outputSchema: MavenDependenciesResultSchema,
    },
    async ({ path, compact }) => {
      const cwd = path || process.cwd();

      const result = await mvnCmd(["dependency:tree"], cwd);
      const data = parseMavenDependencies(result.stdout);
      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatMavenDependencies,
        compactMavenDepsMap,
        formatMavenDepsCompact,
        compact === false,
      );
    },
  );
}
