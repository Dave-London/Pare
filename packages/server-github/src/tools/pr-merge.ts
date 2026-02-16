import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrMerge } from "../lib/parsers.js";
import { formatPrMerge } from "../lib/formatters.js";
import { PrMergeResultSchema } from "../schemas/index.js";

/** Registers the `pr-merge` tool on the given MCP server. */
export function registerPrMergeTool(server: McpServer) {
  server.registerTool(
    "pr-merge",
    {
      title: "PR Merge",
      description:
        "Merges a pull request by number. Returns structured data with merge status, method, and URL. Use instead of running `gh pr merge` in the terminal.",
      inputSchema: {
        number: z.number().describe("Pull request number"),
        method: z
          .enum(["squash", "merge", "rebase"])
          .optional()
          .default("squash")
          .describe("Merge method (default: squash)"),
        deleteBranch: z.boolean().optional().default(false).describe("Delete branch after merge"),
        admin: z
          .boolean()
          .optional()
          .default(false)
          .describe("Bypass branch protection rules (--admin)"),
        auto: z
          .boolean()
          .optional()
          .describe("Enable auto-merge when requirements are met (--auto)"),
        disableAuto: z
          .boolean()
          .optional()
          .describe("Disable auto-merge for this PR (--disable-auto)"),
        subject: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Commit subject for merge commit (--subject)"),
        commitBody: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Commit body for merge commit (--body)"),
        authorEmail: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Author email for merge commit (--author-email)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: PrMergeResultSchema,
    },
    async ({
      number,
      method,
      deleteBranch,
      admin,
      auto,
      disableAuto,
      subject,
      commitBody,
      authorEmail,
      path,
    }) => {
      const cwd = path || process.cwd();

      if (subject) assertNoFlagInjection(subject, "subject");
      if (authorEmail) assertNoFlagInjection(authorEmail, "authorEmail");

      const args = ["pr", "merge", String(number), `--${method}`];
      if (deleteBranch) args.push("--delete-branch");
      if (admin) args.push("--admin");
      if (auto) args.push("--auto");
      if (disableAuto) args.push("--disable-auto");
      if (subject) args.push("--subject", subject);
      if (commitBody) args.push("--body", commitBody);
      if (authorEmail) args.push("--author-email", authorEmail);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr merge failed: ${result.stderr}`);
      }

      const data = parsePrMerge(result.stdout, number, method);
      return dualOutput(data, formatPrMerge);
    },
  );
}
