import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseShow } from "../lib/parsers.js";
import { formatShow, compactShowMap, formatShowCompact } from "../lib/formatters.js";
import { GitShowSchema } from "../schemas/index.js";

const DELIMITER = "@@";
const SHOW_FORMAT = `%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%B`;

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
    async ({ path, ref, compact }) => {
      const cwd = path || process.cwd();
      const commitRef = ref || "HEAD";
      assertNoFlagInjection(commitRef, "ref");

      // Get commit info
      const infoResult = await git(
        ["show", "--no-patch", `--format=${SHOW_FORMAT}`, commitRef],
        cwd,
      );
      if (infoResult.exitCode !== 0) {
        throw new Error(`git show failed: ${infoResult.stderr}`);
      }

      // Get diff stats
      const diffResult = await git(["show", "--numstat", "--format=", commitRef], cwd);

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
