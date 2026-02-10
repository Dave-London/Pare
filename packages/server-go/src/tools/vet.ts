import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { goCmd } from "../lib/go-runner.js";
import { parseGoVetOutput } from "../lib/parsers.js";
import { formatGoVet } from "../lib/formatters.js";
import { GoVetResultSchema } from "../schemas/index.js";

export function registerVetTool(server: McpServer) {
  server.registerTool(
    "vet",
    {
      title: "Go Vet",
      description:
        "Runs go vet and returns structured static analysis diagnostics. Use instead of running `go vet` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        packages: z
          .array(z.string())
          .optional()
          .default(["./..."])
          .describe("Packages to vet (default: ./...)"),
      },
      outputSchema: GoVetResultSchema,
    },
    async ({ path, packages }) => {
      const cwd = path || process.cwd();
      const result = await goCmd(["vet", ...(packages || ["./..."])], cwd);
      const data = parseGoVetOutput(result.stdout, result.stderr);
      return dualOutput(data, formatGoVet);
    },
  );
}
