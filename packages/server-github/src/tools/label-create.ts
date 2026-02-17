import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseLabelCreate } from "../lib/parsers.js";
import { formatLabelCreate } from "../lib/formatters.js";
import { LabelCreateResultSchema } from "../schemas/index.js";

function classifyLabelCreateError(
  text: string,
): "already-exists" | "validation" | "permission-denied" | "unknown" {
  const lower = text.toLowerCase();
  if (/already exists|label .* already/.test(lower)) return "already-exists";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/validation|invalid|required|unprocessable/.test(lower)) return "validation";
  return "unknown";
}

/** Registers the `label-create` tool on the given MCP server. */
export function registerLabelCreateTool(server: McpServer) {
  server.registerTool(
    "label-create",
    {
      title: "Label Create",
      description:
        "Creates a new repository label. Returns structured data with label name, description, color, and URL.",
      inputSchema: {
        name: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Label name"),
        description: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Label description"),
        color: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Label color as hex (e.g., 'ff0000' without #)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
      },
      outputSchema: LabelCreateResultSchema,
    },
    async ({ name, description, color, repo, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(name, "name");
      if (description) assertNoFlagInjection(description, "description");
      if (color) assertNoFlagInjection(color, "color");
      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["label", "create", name];
      if (description) args.push("--description", description);
      if (color) args.push("--color", color);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            name,
            description: description ?? undefined,
            color: color ?? undefined,
            errorType: classifyLabelCreateError(combined),
            errorMessage: combined || "gh label create failed",
          },
          formatLabelCreate,
        );
      }

      const data = parseLabelCreate(result.stdout, result.stderr, name, description, color);
      return dualOutput(data, formatLabelCreate);
    },
  );
}
