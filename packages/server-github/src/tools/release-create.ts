import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseReleaseCreate } from "../lib/parsers.js";
import { formatReleaseCreate } from "../lib/formatters.js";
import { ReleaseCreateResultSchema } from "../schemas/index.js";

function classifyReleaseCreateError(
  text: string,
): "tag-conflict" | "permission-denied" | "no-new-commits" | "unknown" {
  const lower = text.toLowerCase();
  if (/already exists|tag .* exists|reference already exists/.test(lower)) return "tag-conflict";
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/no commits|no new commits/.test(lower)) return "no-new-commits";
  return "unknown";
}

/** Registers the `release-create` tool on the given MCP server. */
export function registerReleaseCreateTool(server: McpServer) {
  server.registerTool(
    "release-create",
    {
      title: "Release Create",
      description:
        "Creates a new GitHub release with optional asset uploads. Returns structured data with tag, URL, draft, prerelease status, and assets uploaded count.",
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
        generateNotes: z
          .boolean()
          .optional()
          .describe("Auto-generate release notes (--generate-notes)"),
        verifyTag: z
          .boolean()
          .optional()
          .describe("Verify the tag exists before creating release (--verify-tag)"),
        notesFromTag: z
          .boolean()
          .optional()
          .describe("Use the annotated tag message as release notes (--notes-from-tag)"),
        latest: z
          .boolean()
          .optional()
          .describe('Control the "Latest" badge on the release (--latest/--latest=false)'),
        failOnNoCommits: z
          .boolean()
          .optional()
          .describe("Fail if no commits since last release (--fail-on-no-commits)"),
        // S-gap P0: Add assets for release asset uploads
        assets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File paths to upload as release assets (positional args after tag)"),
        // S-gap P1: Add notesFile for reading notes from file
        notesFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read release notes from file (--notes-file). Mutually exclusive with notes."),
        // S-gap P1: Add notesStartTag
        notesStartTag: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Scope auto-generated notes to commits since this tag (--notes-start-tag)"),
        // S-gap P2: Add discussionCategory
        discussionCategory: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Start a release discussion in this category (--discussion-category)"),
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
      },
      outputSchema: ReleaseCreateResultSchema,
    },
    async ({
      tag,
      title,
      notes,
      draft,
      prerelease,
      target,
      repo,
      generateNotes,
      verifyTag,
      notesFromTag,
      latest,
      failOnNoCommits,
      assets,
      notesFile,
      notesStartTag,
      discussionCategory,
      path,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(tag, "tag");
      if (title) assertNoFlagInjection(title, "title");
      if (target) assertNoFlagInjection(target, "target");
      if (repo) assertNoFlagInjection(repo, "repo");
      if (notesFile) assertNoFlagInjection(notesFile, "notesFile");
      if (notesStartTag) assertNoFlagInjection(notesStartTag, "notesStartTag");
      if (discussionCategory) assertNoFlagInjection(discussionCategory, "discussionCategory");
      if (assets) {
        for (const asset of assets) {
          assertNoFlagInjection(asset, "assets");
        }
      }

      const args = ["release", "create", tag];
      if (title) args.push("--title", title);
      if (notes !== undefined) args.push("--notes", notes);
      if (draft) args.push("--draft");
      if (prerelease) args.push("--prerelease");
      if (target) args.push("--target", target);
      if (repo) args.push("--repo", repo);
      if (generateNotes) args.push("--generate-notes");
      if (verifyTag) args.push("--verify-tag");
      if (notesFromTag) args.push("--notes-from-tag");
      if (latest !== undefined) args.push(`--latest=${String(latest)}`);
      if (failOnNoCommits) args.push("--fail-on-no-commits");
      if (notesFile) args.push("--notes-file", notesFile);
      if (notesStartTag) args.push("--notes-start-tag", notesStartTag);
      if (discussionCategory) args.push("--discussion-category", discussionCategory);

      // S-gap P0: Assets are positional args after the tag
      if (assets && assets.length > 0) {
        args.push(...assets);
      }

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            tag,
            url: "",
            draft: !!draft,
            prerelease: !!prerelease,
            title: title ?? undefined,
            assetsUploaded: assets?.length ?? undefined,
            errorType: classifyReleaseCreateError(combined),
            errorMessage: combined || "gh release create failed",
          },
          formatReleaseCreate,
        );
      }

      // S-gap: Pass title and assets count for echo in output
      const data = parseReleaseCreate(
        result.stdout,
        tag,
        !!draft,
        !!prerelease,
        title,
        assets?.length,
      );
      return dualOutput(data, formatReleaseCreate);
    },
  );
}
