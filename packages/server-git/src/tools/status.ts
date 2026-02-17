import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { git } from "../lib/git-runner.js";
import { parseStatus, parseStatusV2 } from "../lib/parsers.js";
import { formatStatus } from "../lib/formatters.js";
import { GitStatusSchema } from "../schemas/index.js";

/** Registers the `status` tool on the given MCP server. */
export function registerStatusTool(server: McpServer) {
  server.registerTool(
    "status",
    {
      title: "Git Status",
      description:
        "Returns the working tree status as structured data (branch, staged, modified, untracked, conflicts).",
      inputSchema: {
        path: z.string().max(INPUT_LIMITS.PATH_MAX).optional().describe("Repository path"),
        pathspec: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Filter status to specific paths (-- <pathspec>)"),
        untrackedFiles: z
          .enum(["no", "normal", "all"])
          .optional()
          .describe("Control untracked file display mode (-u/--untracked-files)"),
        ignoreSubmodules: z
          .enum(["none", "untracked", "dirty", "all"])
          .optional()
          .describe("Ignore submodule changes (--ignore-submodules)"),
        showStash: z.boolean().optional().describe("Include stash count (--show-stash)"),
        renames: z
          .boolean()
          .optional()
          .describe("Enable rename detection (--renames). Set to false with noRenames."),
        noRenames: z.boolean().optional().describe("Disable rename detection (--no-renames)"),
        noLockIndex: z.boolean().optional().describe("Do not lock the index (--no-lock-index)"),
        showIgnored: z.boolean().optional().describe("Show ignored files (--ignored)"),
        porcelainVersion: z
          .enum(["v1", "v2"])
          .optional()
          .default("v1")
          .describe("Porcelain output version (--porcelain=v1|v2)"),
      },
      outputSchema: GitStatusSchema,
    },
    async ({
      path,
      pathspec,
      untrackedFiles,
      ignoreSubmodules,
      showStash,
      renames,
      noRenames,
      noLockIndex,
      showIgnored,
      porcelainVersion,
    }) => {
      const cwd = path || process.cwd();
      const porcelain = porcelainVersion || "v1";
      const statusArgs = ["status", `--porcelain=${porcelain}`, "--branch"];
      if (showStash) statusArgs.push("--show-stash");
      if (renames) statusArgs.push("--renames");
      if (noRenames) statusArgs.push("--no-renames");
      if (noLockIndex) statusArgs.push("--no-lock-index");
      if (showIgnored) statusArgs.push("--ignored");
      if (untrackedFiles) statusArgs.push(`--untracked-files=${untrackedFiles}`);
      if (ignoreSubmodules) statusArgs.push(`--ignore-submodules=${ignoreSubmodules}`);
      if (pathspec && pathspec.length > 0) {
        for (const p of pathspec) {
          assertNoFlagInjection(p, "pathspec");
        }
        statusArgs.push("--", ...pathspec);
      }
      const result = await git(statusArgs, cwd);

      if (result.exitCode !== 0) {
        throw new Error(`git status failed: ${result.stderr}`);
      }

      if (porcelain === "v2") {
        const status = parseStatusV2(result.stdout);
        return dualOutput(status, formatStatus);
      }

      const lines = result.stdout.split("\n").filter(Boolean);
      const branchLine = lines.find((l) => l.startsWith("## ")) ?? "## unknown";
      const fileLines = lines.filter((l) => !l.startsWith("## ")).join("\n");

      const status = parseStatus(fileLines, branchLine);
      return dualOutput(status, formatStatus);
    },
  );
}
