import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, repoPathInput } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseCommit } from "../lib/parsers.js";
import { formatCommit } from "../lib/formatters.js";
import { GitCommitSchema } from "../schemas/index.js";

function isNonEmptyMessage(message: string | undefined): message is string {
  return message !== undefined && message.trim() !== "";
}

/**
 * Checks that exactly one source supplies the commit message (#1255).
 * `noEdit`, `reuseMessage` (-C) and `fixup` each take the message from somewhere
 * other than `message`. git rejects -F with -C or --fixup, but silently lets -F
 * win over --no-edit, so a `message` passed alongside `noEdit` used to overwrite
 * the message the caller asked to keep. An empty `message` counts as absent.
 * Returns an error string, or undefined when the combination is valid.
 */
export function validateCommitMessageArgs(opts: {
  message?: string;
  noEdit?: boolean;
  reuseMessage?: string;
  fixup?: string;
}): string | undefined {
  const others = [
    opts.noEdit ? "noEdit" : undefined,
    opts.reuseMessage ? "reuseMessage" : undefined,
    opts.fixup ? "fixup" : undefined,
  ].filter((o): o is string => o !== undefined);

  if (isNonEmptyMessage(opts.message)) {
    if (others.length > 0) {
      return (
        `'message' cannot be combined with ${others.map((o) => `'${o}'`).join(", ")}: ` +
        `${others[0]} supplies the commit message itself. Omit 'message' to keep that message, ` +
        `or drop '${others[0]}' to use 'message'.`
      );
    }
    return undefined;
  }

  if (others.length === 0) {
    return "'message' is required unless 'noEdit', 'reuseMessage' or 'fixup' supplies the commit message";
  }
  return undefined;
}

/** Registers the `commit` tool on the given MCP server. */
export function registerCommitTool(server: McpServer) {
  server.registerTool(
    "commit",
    {
      title: "Git Commit",
      description:
        "Creates a commit with the given message (or, with noEdit/reuseMessage/fixup, the message git takes from there; message is then rejected). Returns structured data with hash, message, and change statistics. Pass `path` to target a specific repo or worktree — when omitted, operates on the server's own working directory, not the caller's (see #876).",
      annotations: { readOnlyHint: false },
      inputSchema: {
        path: repoPathInput,
        message: z
          .string()
          .max(INPUT_LIMITS.MESSAGE_MAX)
          .optional()
          .describe(
            "Commit message. Required unless noEdit, reuseMessage or fixup supplies the message; rejected together with them.",
          ),
        amend: z.boolean().optional().default(false).describe("Amend the previous commit"),
        noVerify: z
          .boolean()
          .optional()
          .describe("Bypass pre-commit and commit-msg hooks (--no-verify)"),
        allowEmpty: z.coerce
          .boolean()
          .optional()
          .describe("Allow commit with no changes (--allow-empty)"),
        all: z
          .boolean()
          .optional()
          .describe("Auto-stage tracked modified/deleted files (-a/--all)"),
        signoff: z.boolean().optional().describe("Add Signed-off-by trailer (-s/--signoff)"),
        noEdit: z.coerce
          .boolean()
          .optional()
          .describe(
            "Keep the existing message (--no-edit): with amend, the previous commit's message; otherwise a prepared message such as MERGE_MSG. Do not pass message with it.",
          ),
        dryRun: z.coerce
          .boolean()
          .optional()
          .describe("Preview commit without executing (--dry-run)"),
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

      const validationError = validateCommitMessageArgs({ message, noEdit, reuseMessage, fixup });
      if (validationError) {
        throw new Error(validationError);
      }
      const hasMessage = isNonEmptyMessage(message);

      if (hasMessage) assertNoFlagInjection(message, "commit message");
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

      const args = ["commit"];
      if (amend) args.push("--amend");
      if (noVerify) args.push("--no-verify");
      if (allowEmpty) args.push("--allow-empty");
      if (all) args.push("--all");
      if (signoff) args.push("--signoff");
      // Without a message, never let git open an editor (it would hang the
      // server: e.g. --fixup=amend:<commit> edits by default).
      if (noEdit || !hasMessage) args.push("--no-edit");
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
      // Use --file - to pipe the message via stdin instead of -m.
      // This avoids cmd.exe argument escaping issues on Windows where
      // newlines, parentheses, and special characters in the message
      // break the command line. Works identically on all platforms.
      // Only sent when a message is given: with noEdit, reuseMessage or fixup
      // git takes the message from elsewhere, and -F would override it (#1255).
      if (hasMessage) args.push("--file", "-");

      const result = await git(args, cwd, hasMessage ? { stdin: message } : undefined);

      if (result.exitCode !== 0) {
        throw new Error(`git commit failed: ${result.stderr}`);
      }

      const commitResult = parseCommit(result.stdout);
      return dualOutput(commitResult, formatCommit);
    },
  );
}
