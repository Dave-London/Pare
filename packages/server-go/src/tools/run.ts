import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoRunOutput } from "../lib/parsers.js";
import { formatGoRun } from "../lib/formatters.js";
import { GoRunResultSchema } from "../schemas/index.js";

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Go Run",
      description:
        "Runs a Go program and returns structured output (stdout, stderr, exit code). Use instead of running `go run` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        file: z.string().optional().default(".").describe("Go file or package to run (default: .)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Arguments to pass to the program"),
        buildArgs: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Build flags to pass to go run (e.g., -race, -tags)"),
      },
      outputSchema: GoRunResultSchema,
    },
    async ({ path, file, args, buildArgs }) => {
      const cwd = path || process.cwd();
      const target = file || ".";
      assertNoFlagInjection(target, "file");
      const cmdArgs = ["run", ...(buildArgs || []), target];
      const programArgs = args || [];
      if (programArgs.length > 0) {
        cmdArgs.push("--", ...programArgs);
      }
      const result = await goCmd(cmdArgs, cwd);
      const data = parseGoRunOutput(result.stdout, result.stderr, result.exitCode);
      return dualOutput(data, formatGoRun);
    },
  );
}
