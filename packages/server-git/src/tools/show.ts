import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseShow } from "../lib/parsers.js";
import { formatShow, compactShowMap, formatShowCompact } from "../lib/formatters.js";
import { GitShowSchema } from "../schemas/index.js";

const DELIMITER = "@@";
const SHOW_FORMAT = `%H${DELIMITER}%an <%ae>${DELIMITER}%ar${DELIMITER}%B`;

/** Registers the `show` tool on the given MCP server. */
export function registerShowTool(server: McpServer) {
  server.registerTool(
    "show",
    {
      title: "Git Show",
      description:
        "Shows commit details and diff statistics for a given ref. Use instead of running `git show` in the terminal.",
      inputSchema: {
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
        ref: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("HEAD")
          .describe("Commit hash, branch, or tag (default: HEAD)"),
        patch: z.boolean().optional().describe("Include patch content in output (-p/--patch)"),
        ignoreWhitespace: z.boolean().optional().describe("Filter whitespace-only changes (-w)"),
        nameStatus: z.boolean().optional().describe("Show file status with name (--name-status)"),
        showSignature: z
          .boolean()
          .optional()
          .describe("GPG signature verification (--show-signature)"),
        notes: z.boolean().optional().describe("Include git notes (--notes)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
      },
      outputSchema: GitShowSchema,
    },
    async ({ path, ref, patch, ignoreWhitespace, nameStatus, showSignature, notes, compact }) => {
      const cwd = path || process.cwd();
      const commitRef = ref || "HEAD";
      assertNoFlagInjection(commitRef, "ref");

      // Get commit info
      const infoArgs = ["show", "--no-patch", `--format=${SHOW_FORMAT}`];
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
