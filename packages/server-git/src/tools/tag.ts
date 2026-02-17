import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, dualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseTagOutput } from "../lib/parsers.js";
import { formatTag, compactTagMap, formatTagCompact, formatTagMutate } from "../lib/formatters.js";
import { GitTagSchema } from "../schemas/index.js";

/** Registers the `tag` tool on the given MCP server. */
export function registerTagTool(server: McpServer) {
  server.registerTool(
    "tag",
    {
      title: "Git Tag",
      description:
        "Manages git tags. Supports list (default), create, and delete actions. List returns structured tag data with name, date, and message. Create supports lightweight and annotated tags. Use instead of running `git tag` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        action: z
          .enum(["list", "create", "delete"])
          .optional()
          .default("list")
          .describe("Tag action to perform (default: list)"),
        name: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Tag name (required for create and delete actions)"),
        message: z
          .string()
          .max(INPUT_LIMITS.MESSAGE_MAX)
          .optional()
          .describe("Tag message for annotated tags (used with create action, triggers -a -m)"),
        commit: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Commit to tag (used with create action, default: HEAD)"),
        pattern: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter tags by pattern (e.g. 'v1.*')"),
        contains: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter tags containing a commit (--contains)"),
        pointsAt: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter tags pointing at a commit (--points-at)"),
        sortBy: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Sort tag list (--sort), e.g. -creatordate, version:refname"),
        force: z.boolean().optional().describe("Force tag creation (-f)"),
        sign: z.boolean().optional().describe("Sign tag with GPG (-s)"),
        verify: z.boolean().optional().describe("Verify tag signature (-v)"),
        merged: z.boolean().optional().describe("Filter to tags merged into HEAD (--merged)"),
        noMerged: z
          .boolean()
          .optional()
          .describe("Filter to tags not merged into HEAD (--no-merged)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitTagSchema,
    },
    async ({
      path,
      action,
      name,
      message,
      commit,
      pattern,
      contains,
      pointsAt,
      sortBy,
      force,
      sign,
      verify,
      merged,
      noMerged,
      compact,
    }) => {
      const cwd = path || process.cwd();

      if (action === "create") {
        if (!name) {
          throw new Error("The 'name' parameter is required for tag create");
        }
        assertNoFlagInjection(name, "name");
        if (commit) assertNoFlagInjection(commit, "commit");

        const args = ["tag"];
        if (message) {
          // Annotated tag
          args.push("-a");
          args.push(name);
          args.push("-m", message);
        } else {
          // Lightweight tag
          args.push(name);
        }
        if (force) args.push("--force");
        if (sign) args.push("-s");
        if (commit) args.push(commit);

        const result = await git(args, cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git tag create failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            success: true,
            action: "create" as const,
            name,
            message: message
              ? `Annotated tag '${name}' created${commit ? ` at ${commit}` : ""}`
              : `Lightweight tag '${name}' created${commit ? ` at ${commit}` : ""}`,
            ...(commit ? { commit } : {}),
            annotated: !!message,
          },
          formatTagMutate,
        );
      }

      if (action === "delete") {
        if (!name) {
          throw new Error("The 'name' parameter is required for tag delete");
        }
        assertNoFlagInjection(name, "name");

        const result = await git(["tag", "-d", name], cwd);
        if (result.exitCode !== 0) {
          throw new Error(`git tag delete failed: ${result.stderr}`);
        }

        return dualOutput(
          {
            success: true,
            action: "delete" as const,
            name,
            message: `Tag '${name}' deleted`,
          },
          formatTagMutate,
        );
      }

      // Default: list
      const sortFlag = sortBy || "-creatordate";
      if (sortBy) assertNoFlagInjection(sortBy, "sortBy");

      const args = [
        "tag",
        "-l",
        `--sort=${sortFlag}`,
        "--format=%(refname:short)\t%(creatordate:iso-strict)\t%(subject)\t%(*objecttype)",
      ];
      if (force) args.push("--force");
      if (sign) args.push("--sign");
      if (verify) args.push("--verify");
      if (merged) args.push("--merged");
      if (noMerged) args.push("--no-merged");
      if (contains) {
        assertNoFlagInjection(contains, "contains");
        args.push(`--contains=${contains}`);
      }
      if (pointsAt) {
        assertNoFlagInjection(pointsAt, "pointsAt");
        args.push(`--points-at=${pointsAt}`);
      }
      if (pattern) {
        assertNoFlagInjection(pattern, "pattern");
        args.push(pattern);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git tag failed: ${result.stderr}`);
      }

      const tags = parseTagOutput(result.stdout);
      return compactDualOutput(
        tags,
        result.stdout,
        formatTag,
        compactTagMap,
        formatTagCompact,
        compact === false,
      );
    },
  );
}
