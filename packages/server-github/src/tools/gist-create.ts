import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseGistCreate } from "../lib/parsers.js";
import { formatGistCreate } from "../lib/formatters.js";
import { GistCreateResultSchema } from "../schemas/index.js";

export function registerGistCreateTool(server: McpServer) {
  server.registerTool(
    "gist-create",
    {
      title: "Gist Create",
      description:
        "Creates a new GitHub gist from one or more files. Returns structured data with gist ID, URL, and visibility.",
      inputSchema: {
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .min(1)
          .max(INPUT_LIMITS.ARRAY_MAX)
          .describe("File paths to include in the gist"),
        description: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Gist description"),
        public: z
          .boolean()
          .optional()
          .default(false)
          .describe("Create as public gist (default: secret)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
      },
      outputSchema: GistCreateResultSchema,
    },
    async ({ files, description, public: isPublic, path }) => {
      const cwd = path || process.cwd();

      const args = ["gist", "create"];
      if (description) {
        args.push("--desc", description);
      }
      if (isPublic) {
        args.push("--public");
      }
      args.push(...files);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh gist create failed: ${result.stderr}`);
      }

      const data = parseGistCreate(result.stdout, !!isPublic);
      return dualOutput(data, formatGistCreate);
    },
  );
}
