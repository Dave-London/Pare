import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS, compactInput, repoPathInput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseShow } from "../lib/parsers.js";
import { formatShow, compactShowMap, formatShowCompact } from "../lib/formatters.js";
import type { GitShow } from "../schemas/index.js";
import { GitShowSchema } from "../schemas/index.js";

// Use NUL byte as field delimiter to prevent corruption when commit messages
// or diffs contain "@@" (e.g. diff hunk headers). NUL bytes cannot appear in
// commit messages or file content, making them a safe delimiter. (Gap #138)
const NUL = "%x00";
const SHOW_FORMAT = `%H${NUL}%an <%ae>${NUL}%ar${NUL}%B`;

/** Registers the `show` tool on the given MCP server. */
export function registerShowTool(server: McpServer) {
  server.registerTool(
    "show",
    {
      title: "Git Show",
      description: "Shows commit details and diff statistics for a given ref.",
      inputSchema: {
        path: repoPathInput,
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("HEAD")
          .describe("Commit hash, branch, or tag (default: HEAD)"),
        dateFormat: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Date format (--date), e.g. short, iso, relative, format:%Y-%m-%d"),
        diffFilter: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Filter diff output by change type (--diff-filter), e.g. A, M, D"),
        patch: z.boolean().optional().describe("Include patch content in output (-p/--patch)"),
        ignoreWhitespace: z.boolean().optional().describe("Filter whitespace-only changes (-w)"),
        nameStatus: z.boolean().optional().describe("Show file status with name (--name-status)"),
        showSignature: z
          .boolean()
          .optional()
          .describe("GPG signature verification (--show-signature)"),
        notes: z.boolean().optional().describe("Include git notes (--notes)"),
        compact: compactInput,
      },
      outputSchema: GitShowSchema,
    },
    async ({
      path,
      ref,
      dateFormat,
      diffFilter,
      patch,
      ignoreWhitespace,
      nameStatus,
      showSignature,
      notes,
      compact,
    }) => {
      const cwd = path || process.cwd();
      const commitRef = ref || "HEAD";
      assertNoFlagInjection(commitRef, "ref");
      if (dateFormat) assertNoFlagInjection(dateFormat, "dateFormat");
      if (diffFilter) assertNoFlagInjection(diffFilter, "diffFilter");

      const typeResult = await git(["cat-file", "-t", commitRef], cwd);
      const objectType: GitShow["objectType"] =
        typeResult.exitCode === 0
          ? (typeResult.stdout.trim() as "commit" | "tag" | "tree" | "blob")
          : "unknown";

      // Support non-commit objects (tag/tree/blob) with structured metadata.
      if (objectType !== "commit") {
        const contentResult = await git(["cat-file", "-p", commitRef], cwd);
        if (contentResult.exitCode !== 0) {
          throw new Error(`git show failed: ${contentResult.stderr}`);
        }
        const sizeResult = await git(["cat-file", "-s", commitRef], cwd);
        const objectSize =
          sizeResult.exitCode === 0 ? parseInt(sizeResult.stdout.trim(), 10) : undefined;
        const payload = contentResult.stdout.trimEnd();
        const show: GitShow = {
          objectType,
          objectName: commitRef,
          ...(Number.isFinite(objectSize) ? { objectSize } : {}),
          message: payload || `${objectType} object`,
        };
        return compactDualOutput(
          show,
          payload,
          formatShow,
          compactShowMap,
          formatShowCompact,
          compact === false,
        );
      }

      // Build format string — use --date if dateFormat specified
      const showFormat = dateFormat ? `%H${NUL}%an <%ae>${NUL}%ad${NUL}%B` : SHOW_FORMAT;

      // Get commit info
      const infoArgs = ["show", "--no-patch", `--format=${showFormat}`];
      if (dateFormat) infoArgs.push(`--date=${dateFormat}`);
      if (showSignature) infoArgs.push("--show-signature");
      if (notes) infoArgs.push("--notes");
      infoArgs.push(commitRef);
      const infoResult = await git(infoArgs, cwd);
      if (infoResult.exitCode !== 0) {
        throw new Error(`git show failed: ${infoResult.stderr}`);
      }

      // Get diff stats
      const diffArgs = ["show", "--numstat", "--format="];
      if (patch) diffArgs.push("--patch");
      if (ignoreWhitespace) diffArgs.push("-w");
      if (nameStatus) diffArgs.push("--name-status");
      if (diffFilter) diffArgs.push(`--diff-filter=${diffFilter}`);
      diffArgs.push(commitRef);
      const diffResult = await git(diffArgs, cwd);

      const show = parseShow(infoResult.stdout, diffResult.stdout);
      const rawStdout = `${infoResult.stdout}\n${diffResult.stdout}`;
      return compactDualOutput(
        show,
        rawStdout,
        formatShow,
        compactShowMap,
        formatShowCompact,
        compact === false,
      );
    },
  );
}
