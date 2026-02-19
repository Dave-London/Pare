import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, projectPathInput } from "@paretools/shared";
import { gradleCmd } from "../lib/jvm-runner.js";
import { parseGradleTasks } from "../lib/parsers.js";
import {
  formatGradleTasks,
  compactGradleTasksMap,
  formatGradleTasksCompact,
} from "../lib/formatters.js";
import { GradleTasksResultSchema } from "../schemas/index.js";

export function registerGradleTasksTool(server: McpServer) {
  server.registerTool(
    "gradle-tasks",
    {
      title: "Gradle Tasks",
      description:
        "Lists available Gradle tasks with descriptions and groups. Uses `gradle tasks --all`.",
      inputSchema: {
        path: projectPathInput,
        all: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include all tasks including subtasks (default: true)"),
        compact: compactInput,
      },
      outputSchema: GradleTasksResultSchema,
    },
    async ({ path, all, compact }) => {
      const cwd = path || process.cwd();

      const cmdArgs = ["tasks"];
      if (all !== false) cmdArgs.push("--all");

      const result = await gradleCmd(cmdArgs, cwd);
      const data = parseGradleTasks(result.stdout);
      const rawOutput = result.stdout.trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatGradleTasks,
        compactGradleTasksMap,
        formatGradleTasksCompact,
        compact === false,
      );
    },
  );
}
