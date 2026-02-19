import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCommit } from "../lib/parsers.js";
import { formatCommit } from "../lib/formatters.js";
import { GitCommitSchema } from "../schemas/index.js";

/** Registers the `commit` tool on the given MCP server. */
export function registerCommitTool(server: McpServer) {
  server.registerTool(
    "commit",
    {
      title: "Git Commit",
      description:
        "Creates a commit with the given message. Returns structured data with hash, message, and change statistics.",
      inputSchema: {
        path: repoPathInput,
        message: z.string().max(INPUT_LIMITS.MESSAGE_MAX).describe("Commit message"),
        amend: z.boolean().optional().default(false).describe("Amend the previous commit"),
        noVerify: z
          .boolean()
          .optional()
          .describe("Bypass pre-commit and commit-msg hooks (--no-verify)"),
        allowEmpty: z.boolean().optional().describe("Allow commit with no changes (--allow-empty)"),
        all: z
          .boolean()
          .optional()
          .describe("Auto-stage tracked modified/deleted files (-a/--all)"),
        signoff: z.boolean().optional().describe("Add Signed-off-by trailer (-s/--signoff)"),
        noEdit: z.boolean().optional().describe("Keep existing message with --amend (--no-edit)"),
        dryRun: z.boolean().optional().describe("Preview commit without executing (--dry-run)"),
        gpgSign: z.boolean().optional().describe("GPG sign the commit (-S/--gpg-sign)"),
        resetAuthor: z
          .boolean()
          .optional()
          .describe("Reset author info on amended commits (--reset-author)"),
        trailer: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Trailer strings to append (--trailer), e.g. 'Signed-off-by: Name <email>'"),
        author: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Override author (--author), e.g. 'Name <email>'"),
        date: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Override author date (--date)"),
        fixup: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Create fixup commit for autosquash (--fixup=<commit>)"),
        cleanup: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "Control message whitespace handling (--cleanup), e.g. strip, whitespace, verbatim, scissors, default",
          ),
        reuseMessage: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Reuse message from existing commit (-C <commit>)"),
      },
      outputSchema: GitCommitSchema,
    },
    async ({
      path,
      message,
      amend,
      noVerify,
      allowEmpty,
      all,
      signoff,
      noEdit,
      dryRun,
      gpgSign,
      resetAuthor,
      trailer,
      author,
      date,
      fixup,
      cleanup,
      reuseMessage,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(message, "commit message");
      if (author) assertNoFlagInjection(author, "author");
      if (date) assertNoFlagInjection(date, "date");
      if (fixup) assertNoFlagInjection(fixup, "fixup");
      if (cleanup) assertNoFlagInjection(cleanup, "cleanup");
      if (reuseMessage) assertNoFlagInjection(reuseMessage, "reuseMessage");
      if (trailer) {
        for (const t of trailer) {
          assertNoFlagInjection(t, "trailer");
        }
      }

      // Use --file - to pipe the message via stdin instead of -m.
      // This avoids cmd.exe argument escaping issues on Windows where
      // newlines, parentheses, and special characters in the message
      // break the command line. Works identically on all platforms.
      const args = ["commit"];
      if (amend) args.push("--amend");
      if (noVerify) args.push("--no-verify");
      if (allowEmpty) args.push("--allow-empty");
      if (all) args.push("--all");
      if (signoff) args.push("--signoff");
      if (noEdit) args.push("--no-edit");
      if (dryRun) args.push("--dry-run");
      if (gpgSign) args.push("--gpg-sign");
      if (resetAuthor) args.push("--reset-author");
      if (author) args.push(`--author=${author}`);
      if (date) args.push(`--date=${date}`);
      if (fixup) args.push(`--fixup=${fixup}`);
      if (cleanup) args.push(`--cleanup=${cleanup}`);
      if (reuseMessage) args.push(`-C`, reuseMessage);
      if (trailer) {
        for (const t of trailer) {
          args.push("--trailer", t);
        }
      }
      args.push("--file", "-");

      const result = await git(args, cwd, { stdin: message });

      if (result.exitCode !== 0) {
        throw new Error(`git commit failed: ${result.stderr}`);
      }

      const commitResult = parseCommit(result.stdout);
      return dualOutput(commitResult, formatCommit);
    },
  );
}
