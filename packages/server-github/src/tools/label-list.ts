import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseLabelList } from "../lib/parsers.js";
import { formatLabelList } from "../lib/formatters.js";
import { LabelListResultSchema } from "../schemas/index.js";

function classifyLabelListError(text: string): "not-found" | "permission-denied" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no repository/.test(lower)) return "not-found";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  return "unknown";
}

/** Registers the `label-list` tool on the given MCP server. */
export function registerLabelListTool(server: McpServer) {
  server.registerTool(
    "label-list",
    {
      title: "Label List",
      description:
        "Lists repository labels. Returns structured data with label name, description, color, and default status.",
      inputSchema: {
        limit: z
          .number()
          .optional()
          .default(30)
          .describe("Maximum number of labels to return (default: 30)"),
        search: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter labels by search term"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        path: repoPathInput,
      },
      outputSchema: LabelListResultSchema,
    },
    async ({ limit, search, repo, path }) => {
      const cwd = path || process.cwd();

      if (search) assertNoFlagInjection(search, "search");
      if (repo) assertNoFlagInjection(repo, "repo");

      const args = [
        "label",
        "list",
        "--json",
        "name,description,color,isDefault",
        "--limit",
        String(limit ?? 30),
      ];
      if (search) args.push("--search", search);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            labels: [],
            total: 0,
            errorType: classifyLabelListError(combined),
            errorMessage: combined || "gh label list failed",
          },
          formatLabelList,
        );
      }

      const data = parseLabelList(result.stdout);
      return dualOutput(data, formatLabelList);
    },
  );
}
