import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrChecks } from "../lib/parsers.js";
import { formatPrChecks, compactPrChecksMap, formatPrChecksCompact } from "../lib/formatters.js";
import { PrChecksResultSchema } from "../schemas/index.js";

const PR_CHECKS_FIELDS = "name,state,bucket,description,event,workflow,link,startedAt,completedAt";

/** Registers the `pr-checks` tool on the given MCP server. */
export function registerPrChecksTool(server: McpServer) {
  server.registerTool(
    "pr-checks",
    {
      title: "PR Checks",
      description:
        "Lists check/status results for a pull request. Returns structured data with check names, states, URLs, and summary counts (passed, failed, pending). Use instead of running `gh pr checks` in the terminal.",
      inputSchema: {
        number: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Pull request number, URL, or branch name"),
        repo: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository in OWNER/REPO format (default: current repo)"),
        watch: z.boolean().optional().describe("Poll checks until they complete (-w/--watch)"),
        // S-gap P0: Add required filter
        required: z
          .boolean()
          .optional()
          .describe("Filter to show only required checks (--required)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PrChecksResultSchema,
    },
    async ({ number, repo, watch, required, compact }) => {
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof number === "string") assertNoFlagInjection(number, "number");

      const selector = String(number);
      const prNum = typeof number === "number" ? number : 0;

      const args = ["pr", "checks", selector, "--json", PR_CHECKS_FIELDS];
      if (repo) {
        args.push("--repo", repo);
      }
      if (watch) args.push("--watch");
      if (required) args.push("--required");
      const result = await ghCmd(args);

      // Exit code 8 means checks are still pending — gh still returns valid JSON
      if (result.exitCode !== 0 && result.exitCode !== 8) {
        throw new Error(`gh pr checks failed: ${result.stderr}`);
      }

      const data = parsePrChecks(result.stdout, prNum);
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
