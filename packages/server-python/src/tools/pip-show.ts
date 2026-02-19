import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
import { pip } from "../lib/python-runner.js";
import { parsePipShowOutput } from "../lib/parsers.js";
import { formatPipShow, compactPipShowMap, formatPipShowCompact } from "../lib/formatters.js";
import { PipShowSchema } from "../schemas/index.js";

/** Registers the `pip-show` tool on the given MCP server. */
export function registerPipShowTool(server: McpServer) {
  server.registerTool(
    "pip-show",
    {
      title: "pip Show",
      description:
        "Runs pip show and returns structured package metadata (name, version, summary, dependencies). " +
        "Supports multiple packages in a single call.",
      inputSchema: {
        package: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Single package name to show (for backward compatibility)"),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Package names to show (supports multiple packages)"),
        path: cwdPathInput,
        files: z
          .boolean()
          .optional()
          .default(false)
          .describe("List installed files for the package (-f, --files)"),
        compact: compactInput,
      },
      outputSchema: PipShowSchema,
    },
    async (input) => {
      const singlePkg = input["package"] as string | undefined;
      const multiPkgs = input["packages"] as string[] | undefined;
      const path = input["path"] as string | undefined;
      const files = input["files"] as boolean | undefined;
      const compact = input["compact"] as boolean | undefined;
      const cwd = path || process.cwd();

      // Merge single package and packages array
      const pkgList: string[] = [];
      if (singlePkg) {
        assertNoFlagInjection(singlePkg, "package");
        pkgList.push(singlePkg);
      }
      for (const p of multiPkgs ?? []) {
        assertNoFlagInjection(p, "packages");
        if (!pkgList.includes(p)) {
          pkgList.push(p);
        }
      }

      if (pkgList.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: at least one package name is required (use 'package' or 'packages')",
            },
          ],
          isError: true,
        };
      }

      const args = ["show"];
      if (files) args.push("--files");
      args.push(...pkgList);
      const result = await pip(args, cwd);
      const data = parsePipShowOutput(result.stdout, result.exitCode);
      return compactDualOutput(
        data,
        result.stdout,
        formatPipShow,
        compactPipShowMap,
        formatPipShowCompact,
        compact === false,
      );
    },
  );
}
