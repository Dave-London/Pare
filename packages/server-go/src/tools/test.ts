import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoTestJson } from "../lib/parsers.js";
import { formatGoTest } from "../lib/formatters.js";
import { GoTestResultSchema } from "../schemas/index.js";

export function registerTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Go Test",
      description:
        "Runs go test and returns structured test results (name, status, package, elapsed). Use instead of running `go test` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string())
          .optional()
          .default(["./..."])
          .describe("Packages to test (default: ./...)"),
        run: z.string().optional().describe("Test name filter regex"),
      },
      outputSchema: GoTestResultSchema,
    },
    async ({ path, packages, run: runFilter }) => {
      const cwd = path || process.cwd();
      const args = ["test", "-json", ...(packages || ["./..."])];
      if (runFilter) args.push("-run", runFilter);

      const result = await goCmd(args, cwd);
      const data = parseGoTestJson(result.stdout, result.exitCode);
      return dualOutput(data, formatGoTest);
    },
  );
}
