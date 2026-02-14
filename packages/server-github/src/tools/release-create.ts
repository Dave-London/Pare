import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseReleaseCreate } from "../lib/parsers.js";
import { formatReleaseCreate } from "../lib/formatters.js";
import { ReleaseCreateResultSchema } from "../schemas/index.js";

export function registerReleaseCreateTool(server: McpServer) {
  server.registerTool(
    "release-create",
    {
      title: "Release Create",
      description:
        "Creates a new GitHub release. Returns structured data with tag, URL, draft, and prerelease status. Use instead of running `gh release create` in the terminal.",
      inputSchema: {
        tag: z.string().max(INPUT_LIMITS.SHORT_STRING_MAX).describe("Tag name for the release"),
        title: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Release title (default: tag name)"),
        notes: z.string().max(INPUT_LIMITS.STRING_MAX).optional().describe("Release notes/body"),
        draft: z.boolean().optional().default(false).describe("Create as draft release"),
        prerelease: z.boolean().optional().default(false).describe("Mark as prerelease"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Target commitish (branch or commit SHA)"),
        repo: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Repository in owner/repo format (default: current repo)"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: ReleaseCreateResultSchema,
    },
    async ({ tag, title, notes, draft, prerelease, target, repo, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(tag, "tag");
      if (title) assertNoFlagInjection(title, "title");
      if (target) assertNoFlagInjection(target, "target");
      if (repo) assertNoFlagInjection(repo, "repo");

      const args = ["release", "create", tag];
      if (title) args.push("--title", title);
      if (notes !== undefined) args.push("--notes", notes);
      if (draft) args.push("--draft");
      if (prerelease) args.push("--prerelease");
      if (target) args.push("--target", target);
      if (repo) args.push("--repo", repo);

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`gh release create failed: ${result.stderr}`);
      }

      const data = parseReleaseCreate(result.stdout, tag, !!draft, !!prerelease);
      return dualOutput(data, formatReleaseCreate);
    },
  );
}
