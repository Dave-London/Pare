import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parsePush, parsePushError } from "../lib/parsers.js";
import { formatPush } from "../lib/formatters.js";
import { GitPushSchema } from "../schemas/index.js";

/** Registers the `push` tool on the given MCP server. */
export function registerPushTool(server: McpServer) {
  server.registerTool(
    "push",
    {
      title: "Git Push",
      description:
        "Pushes commits to a remote repository. Returns structured data with success status, remote, branch, summary, and whether the remote branch was newly created. Use instead of running `git push` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        remote: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("origin")
          .describe('Remote name (default: "origin")'),
        branch: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Branch to push (default: current branch)"),
        refspec: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Explicit refspec (e.g. 'HEAD:refs/heads/branch')"),
        force: z.boolean().optional().default(false).describe("Force push (--force)"),
        setUpstream: z.boolean().optional().default(false).describe("Set upstream tracking (-u)"),
        dryRun: z.boolean().optional().describe("Preview push without executing (--dry-run)"),
        forceWithLease: z.boolean().optional().describe("Safe force push (--force-with-lease)"),
        tags: z.boolean().optional().describe("Push all tags (--tags)"),
        followTags: z
          .boolean()
          .optional()
          .describe("Push annotated tags with commits (--follow-tags)"),
        delete: z.boolean().optional().describe("Delete remote branch/tag (--delete)"),
        noVerify: z.boolean().optional().describe("Bypass pre-push hook (--no-verify)"),
        atomic: z.boolean().optional().describe("Atomic push (--atomic)"),
        pushOption: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Push options (-o/--push-option), e.g. 'ci.skip'"),
      },
      outputSchema: GitPushSchema,
    },
    async ({
      path,
      remote,
      branch,
      refspec,
      force,
      setUpstream,
      dryRun,
      forceWithLease,
      tags,
      followTags,
      delete: deleteBranch,
      noVerify,
      atomic,
      pushOption,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(remote, "remote");
      if (branch) {
        assertNoFlagInjection(branch, "branch");
      }
      if (refspec) {
        assertNoFlagInjection(refspec, "refspec");
      }
      if (pushOption) {
        for (const opt of pushOption) {
          assertNoFlagInjection(opt, "pushOption");
        }
      }

      const args = ["push"];
      if (force) args.push("--force");
      if (forceWithLease) args.push("--force-with-lease");
      if (setUpstream) args.push("-u");
      if (dryRun) args.push("--dry-run");
      if (tags) args.push("--tags");
      if (followTags) args.push("--follow-tags");
      if (deleteBranch) args.push("--delete");
      if (noVerify) args.push("--no-verify");
      if (atomic) args.push("--atomic");
      if (pushOption) {
        for (const opt of pushOption) {
          args.push("-o", opt);
        }
      }
      args.push(remote);

      if (refspec) {
        args.push(refspec);
      } else if (branch) {
        args.push(branch);
      } else if (setUpstream) {
        // When setting upstream without an explicit branch, git needs the
        // current branch name to create the remote tracking reference.
        const branchResult = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
        const currentBranch = branchResult.stdout.trim();
        if (currentBranch) args.push(currentBranch);
      }

      const result = await git(args, cwd);

      if (result.exitCode !== 0) {
        const pushResult = parsePushError(result.stdout, result.stderr, remote, branch || "");
        return dualOutput(pushResult, formatPush);
      }

      const pushResult = parsePush(result.stdout, result.stderr, remote, branch || "");
      return dualOutput(pushResult, formatPush);
    },
  );
}
