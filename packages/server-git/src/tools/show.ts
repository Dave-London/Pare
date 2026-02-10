import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput } from "@paretools/shared";
import { assertNoFlagInjection } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseShow } from "../lib/parsers.js";
import { formatShow } from "../lib/formatters.js";
import { GitShowSchema } from "../schemas/index.js";

const DELIMITER = "\x1f";
const SHOW_FORMAT = `%H${DELIMITER}%an${DELIMITER}%ae${DELIMITER}%ar${DELIMITER}%B`;

export function registerShowTool(server: McpServer) {
  server.registerTool(
    "show",
    {
      title: "Git Show",
      description:
        "Shows commit details and diff statistics for a given ref. Use instead of running `git show` in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Repository path (default: cwd)"),
        ref: z
          .string()
          .optional()
          .default("HEAD")
          .describe("Commit hash, branch, or tag (default: HEAD)"),
      },
      outputSchema: GitShowSchema,
    },
    async ({ path, ref }) => {
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
      return dualOutput(show, formatShow);
    },
  );
}
