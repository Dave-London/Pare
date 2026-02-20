import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { gradleCmd } from "../lib/jvm-runner.js";
import { parseGradleDependencies } from "../lib/parsers.js";
import {
  formatGradleDependencies,
  compactGradleDepsMap,
  formatGradleDepsCompact,
} from "../lib/formatters.js";
import { GradleDependenciesResultSchema } from "../schemas/index.js";

export function registerGradleDependenciesTool(server: McpServer) {
  server.registerTool(
    "gradle-dependencies",
    {
      title: "Gradle Dependencies",
      description: "Shows the Gradle dependency tree with structured output per configuration.",
      inputSchema: {
        path: projectPathInput,
        configuration: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter to a specific configuration (e.g. compileClasspath)"),
        compact: compactInput,
      },
      outputSchema: GradleDependenciesResultSchema,
    },
    async ({ path, configuration, compact }) => {
      const cwd = path || process.cwd();
      if (configuration) assertNoFlagInjection(configuration, "configuration");

      const cmdArgs = ["dependencies"];
      if (configuration) cmdArgs.push("--configuration", configuration);

      const result = await gradleCmd(cmdArgs, cwd);
      const data = parseGradleDependencies(result.stdout);
      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGradleDependencies,
        compactGradleDepsMap,
        formatGradleDepsCompact,
        compact === false,
      );
    },
  );
}
