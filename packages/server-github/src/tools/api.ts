import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseApi } from "../lib/parsers.js";
import { formatApi } from "../lib/formatters.js";
import { ApiResultSchema } from "../schemas/index.js";

export function registerApiTool(server: McpServer) {
  server.registerTool(
    "api",
    {
      title: "GitHub API",
      description:
        "Makes arbitrary GitHub API calls via `gh api`. Supports all HTTP methods, request bodies, field parameters, pagination, and jq filtering. Returns structured data with status, parsed JSON body, endpoint, and method.",
      inputSchema: {
        endpoint: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("GitHub API endpoint (e.g., repos/owner/repo/pulls, /user)"),
        method: z
          .enum(["GET", "POST", "PATCH", "DELETE", "PUT"])
          .optional()
          .default("GET")
          .describe("HTTP method (default: GET)"),
        body: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("JSON request body as key-value pairs (sent via --input)"),
        fields: z
          .record(z.string(), z.string())
          .optional()
          .describe("Key-value pairs sent as --raw-field parameters"),
        paginate: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable pagination (--paginate). Fetches all pages."),
        jq: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("jq filter expression to apply to the response"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path"),
      },
      outputSchema: ApiResultSchema,
    },
    async ({ endpoint, method, body, fields, paginate, jq, path }) => {
      const cwd = path || process.cwd();

      const args = ["api", endpoint, "--method", method!];

      if (paginate) {
        args.push("--paginate");
      }

      if (jq) {
        args.push("--jq", jq);
      }

      // Add --raw-field for each field entry
      if (fields) {
        for (const [key, value] of Object.entries(fields)) {
          args.push("--raw-field", `${key}=${value}`);
        }
      }

      // Pass JSON body via stdin using --input -
      let stdin: string | undefined;
      if (body) {
        args.push("--input", "-");
        stdin = JSON.stringify(body);
      }

      const result = await ghCmd(args, { cwd, stdin });

      if (result.exitCode !== 0 && result.stderr) {
        throw new Error(`gh api failed: ${result.stderr}`);
      }

      const data = parseApi(result.stdout, result.exitCode, endpoint, method!);
      return dualOutput(data, formatApi);
    },
  );
}
