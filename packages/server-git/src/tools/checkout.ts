import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCheckout, parseCheckoutError } from "../lib/parsers.js";
import { formatCheckout } from "../lib/formatters.js";
import { GitCheckoutSchema } from "../schemas/index.js";

/** Registers the `checkout` tool on the given MCP server. */
export function registerCheckoutTool(server: McpServer) {
  server.registerTool(
    "checkout",
    {
      title: "Git Checkout",
      description:
        "Switches branches or restores files. Returns structured data with ref, previous ref, whether a new branch was created, and detached HEAD status.",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .describe("Branch name, tag, or commit to checkout"),
        create: z.boolean().optional().default(false).describe("Create a new branch (-b)"),
        startPoint: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Start point for new branch creation (commit, tag, or branch)"),
        orphan: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Create a new orphan branch with this name (--orphan)"),
        force: z.boolean().optional().describe("Force checkout discarding local changes (-f)"),
        track: z.boolean().optional().describe("Set up tracking for remote branches (--track)"),
        forceCreate: z.boolean().optional().describe("Force-create branch even if it exists (-B)"),
        detach: z.boolean().optional().describe("Detach HEAD at target (--detach)"),
        useSwitch: z
          .boolean()
          .optional()
          .default(true)
          .describe("Use git switch for branch operations when possible"),
      },
      outputSchema: GitCheckoutSchema,
    },
    async ({
      path,
      ref,
      create,
      startPoint,
      orphan,
      force,
      track,
      forceCreate,
      detach,
      useSwitch,
    }) => {
      const cwd = path || process.cwd();
      const preferSwitch = useSwitch !== false;

      assertNoFlagInjection(ref, "ref");
      if (startPoint) assertNoFlagInjection(startPoint, "startPoint");
      if (orphan) assertNoFlagInjection(orphan, "orphan");

      // Get current branch/ref before checkout
      const prevResult = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
      const previousRef = prevResult.exitCode === 0 ? prevResult.stdout.trim() : "unknown";

      // Handle orphan branch creation
      if (orphan) {
        const args = [preferSwitch ? "switch" : "checkout", "--orphan", orphan];
        if (force) args.push("--force");
        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          const checkoutResult = parseCheckoutError(
            result.stdout,
            result.stderr,
            orphan,
            previousRef,
          );
          return dualOutput(checkoutResult, formatCheckout);
        }
        const checkoutResult = parseCheckout(
          result.stdout,
          result.stderr,
          orphan,
          previousRef,
          true,
        );
        return dualOutput(checkoutResult, formatCheckout);
      }

      // Build branch switch args; prefer git switch for modern branch operations.
      const args = [preferSwitch ? "switch" : "checkout"];
      if (force) args.push("--force");
      if (forceCreate) args.push(preferSwitch ? "-C" : "-B");
      else if (create) args.push(preferSwitch ? "-c" : "-b");
      if (track) args.push("--track");
      if (detach) args.push("--detach");
      args.push(ref);
      if (startPoint && (create || forceCreate)) args.push(startPoint);

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        const checkoutResult = parseCheckoutError(result.stdout, result.stderr, ref, previousRef);
        return dualOutput(checkoutResult, formatCheckout);
      }

      // Estimate changed scope between previous and new refs for impact visibility.
      const currentRefResult = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
      const currentRef = currentRefResult.exitCode === 0 ? currentRefResult.stdout.trim() : "";
      let modifiedFiles: string[] | undefined;
      if (previousRef !== "unknown" && currentRef && currentRef !== previousRef) {
        const diffResult = await git(["diff", "--name-only", `${previousRef}..${currentRef}`], cwd);
        if (diffResult.exitCode === 0) {
          const files = diffResult.stdout
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          if (files.length > 0) modifiedFiles = files;
        }
      }

      const checkoutResult = parseCheckout(
        result.stdout,
        result.stderr,
        ref,
        previousRef,
        create,
        modifiedFiles,
      );
      return dualOutput(checkoutResult, formatCheckout);
    },
  );
}
