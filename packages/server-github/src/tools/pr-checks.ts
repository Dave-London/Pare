import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrChecks } from "../lib/parsers.js";
import { formatPrChecks, compactPrChecksMap, formatPrChecksCompact } from "../lib/formatters.js";
import { PrChecksResultSchema } from "../schemas/index.js";

const PR_CHECKS_FIELDS = "name,state,bucket,description,event,workflow,link,startedAt,completedAt";

export function registerPrChecksTool(server: McpServer) {
  server.registerTool(
    "pr-checks",
    {
      title: "PR Checks",
      description:
        "Lists check/status results for a pull request. Returns structured data with check names, states, conclusions, URLs, and summary counts (passed, failed, pending).",
      inputSchema: {
        pr: z.number().describe("Pull request number"),
        repo: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: PrChecksResultSchema,
    },
    async ({ pr, repo, compact }) => {
      const args = ["pr", "checks", String(pr), "--json", PR_CHECKS_FIELDS];
      if (repo) {
        args.push("--repo", repo);
      }
      const result = await ghCmd(args);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr checks failed: ${result.stderr}`);
      }

      const data = parsePrChecks(result.stdout, pr);
      return compactDualOutput(
        data,
        result.stdout,
        formatPrChecks,
        compactPrChecksMap,
        formatPrChecksCompact,
        compact === false,
      );
    },
  );
}
