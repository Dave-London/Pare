import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, cwdPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseRepoClone } from "../lib/parsers.js";
import { formatRepoClone } from "../lib/formatters.js";
import { RepoCloneResultSchema } from "../schemas/index.js";

function classifyRepoCloneError(
  text: string,
): "not-found" | "permission-denied" | "already-exists" | "unknown" {
  const lower = text.toLowerCase();
  if (/not found|could not resolve|no repository/i.test(lower)) return "not-found";
  if (/forbidden|permission|403/i.test(lower)) return "permission-denied";
  if (/already exists|destination path .* already exists/i.test(lower)) return "already-exists";
  return "unknown";
}

/** Registers the `repo-clone` tool on the given MCP server. */
export function registerRepoCloneTool(server: McpServer) {
  server.registerTool(
    "repo-clone",
    {
      title: "Repo Clone",
      description:
        "Clones a GitHub repository. Returns structured data with success status, repo name, target directory, and message.",
      inputSchema: {
        repo: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("Repository in OWNER/REPO format or full URL"),
        directory: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Target directory for the clone"),
        depth: z
          .number()
          .optional()
          .describe("Create a shallow clone with this many commits (passed as -- --depth=N)"),
        path: cwdPathInput,
      },
      outputSchema: RepoCloneResultSchema,
    },
    async ({ repo, directory, depth, path }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(repo, "repo");
      if (directory) assertNoFlagInjection(directory, "directory");

      const args = ["repo", "clone", repo];
      if (directory) args.push(directory);

      // Git-passthrough args go after --
      if (depth !== undefined) {
        args.push("--", `--depth=${depth}`);
      }

      const result = await ghCmd(args, cwd);

      if (result.exitCode !== 0) {
        const combined = `${result.stdout}\n${result.stderr}`.trim();
        return dualOutput(
          {
            success: false,
            repo,
            directory: directory ?? undefined,
            message: combined || "gh repo clone failed",
            errorType: classifyRepoCloneError(combined),
            errorMessage: combined || "gh repo clone failed",
          },
          formatRepoClone,
        );
      }

      const data = parseRepoClone(result.stdout, result.stderr, repo, directory);
      return dualOutput(data, formatRepoClone);
    },
  );
}
