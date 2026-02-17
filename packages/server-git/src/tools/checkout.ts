import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCheckout } from "../lib/parsers.js";
import { formatCheckout } from "../lib/formatters.js";
import { GitCheckoutSchema } from "../schemas/index.js";

export function registerCheckoutTool(server: McpServer) {
  server.registerTool(
    "checkout",
    {
      title: "Git Checkout",
      description:
        "Switches branches or restores files. Returns structured data with ref, previous ref, and whether a new branch was created.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Branch name, tag, or commit to checkout"),
        create: z.boolean().optional().default(false).describe("Create a new branch (-b)"),
      },
      outputSchema: GitCheckoutSchema,
    },
    async ({ path, ref, create }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(ref, "ref");

      // Get current branch/ref before checkout
      const prevResult = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
      const previousRef = prevResult.exitCode === 0 ? prevResult.stdout.trim() : "unknown";

      // Build checkout args
      const args = ["checkout"];
      if (create) args.push("-b");
      args.push(ref);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git checkout failed: ${result.stderr}`);
      }

      const checkoutResult = parseCheckout(result.stdout, result.stderr, ref, previousRef, create);
      return dualOutput(checkoutResult, formatCheckout);
    },
  );
}
