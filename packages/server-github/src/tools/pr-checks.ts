import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrChecks } from "../lib/parsers.js";
import { formatPrChecks, compactPrChecksMap, formatPrChecksCompact } from "../lib/formatters.js";
import { PrChecksResultSchema } from "../schemas/index.js";

// S-gap P1: Add isRequired and conclusion to checks fields
const PR_CHECKS_FIELDS =
  "name,state,bucket,description,event,workflow,link,startedAt,completedAt,isRequired,conclusion";

/** Registers the `pr-checks` tool on the given MCP server. */
export function registerPrChecksTool(server: McpServer) {
  server.registerTool(
    "pr-checks",
    {
      title: "PR Checks",
      description:
        "Lists check/status results for a pull request. Returns structured data with check names, states, conclusions, required status, URLs, and summary counts (passed, failed, pending). Use instead of running `gh pr checks` in the terminal.",
      inputSchema: {
        // S-gap P1: Accept PR by number, URL, or branch via union
        pr: z
          .union([z.number(), z.string().max(INPUT_LIMITS.STRING_MAX)])
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
    async ({ pr, repo, watch, required, compact }) => {
      if (repo) assertNoFlagInjection(repo, "repo");
      if (typeof pr === "string") assertNoFlagInjection(pr, "pr");

      const selector = String(pr);
      const prNum = typeof pr === "number" ? pr : 0;

      const args = ["pr", "checks", selector, "--json", PR_CHECKS_FIELDS];
      if (repo) {
        args.push("--repo", repo);
      }
      if (watch) args.push("--watch");
      if (required) args.push("--required");
      const result = await ghCmd(args);

      if (result.exitCode !== 0) {
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
