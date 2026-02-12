import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parsePrCreate } from "../lib/parsers.js";
import { formatPrCreate } from "../lib/formatters.js";
import { PrCreateResultSchema } from "../schemas/index.js";

export function registerPrCreateTool(server: McpServer) {
  server.registerTool(
    "pr-create",
    {
      title: "PR Create",
      description:
        "Creates a new pull request. Returns structured data with PR number and URL. Use instead of running `gh pr create` in the terminal.",
      inputSchema: {
        title: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Pull request title"),
        body: z.string().max(INPUT_LIMITS.STRING_MAX).describe("Pull request body/description"),
        base: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Base branch (default: repo default branch)"),
        head: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Head branch (default: current branch)"),
        draft: z.boolean().optional().default(false).describe("Create as draft PR"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: PrCreateResultSchema,
    },
    async ({ title, body, base, head, draft, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(title, "title");
      if (base) assertNoFlagInjection(base, "base");
      if (head) assertNoFlagInjection(head, "head");

      const args = ["pr", "create", "--title", title, "--body", body];
      if (base) args.push("--base", base);
      if (head) args.push("--head", head);
      if (draft) args.push("--draft");

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh pr create failed: ${result.stderr}`);
      }

      const data = parsePrCreate(result.stdout);
      return dualOutput(data, formatPrCreate);
    },
  );
}
