import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { poetry } from "../lib/python-runner.js";
import { parsePoetryOutput } from "../lib/parsers.js";
import { formatPoetry, compactPoetryMap, formatPoetryCompact } from "../lib/formatters.js";
import { PoetryResultSchema } from "../schemas/index.js";

export function registerPoetryTool(server: McpServer) {
  server.registerTool(
    "poetry",
    {
      title: "Poetry",
      description:
        "Runs Poetry commands and returns structured output. " +
        "Supports install, add, remove, show, and build actions. ",
      inputSchema: {
        action: z
          .enum(["install", "add", "remove", "show", "build"])
          .describe(
            "Poetry action: install (poetry install), add (poetry add <packages>), " +
              "remove (poetry remove <packages>), show (poetry show), build (poetry build)",
          ),
        packages: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Packages for add/remove actions"),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Prefer compact output",
          ),
      },
      outputSchema: PoetryResultSchema,
    },
    async ({ action, packages, path, compact }) => {
      const cwd = path || process.cwd();
      for (const p of packages ?? []) {
        assertNoFlagInjection(p, "packages");
      }

      const args: string[] = [action];

      if (action === "show") {
        args.push("--no-ansi");
      }

      if ((action === "add" || action === "remove") && packages && packages.length > 0) {
        args.push(...packages);
      }

      const result = await poetry(args, cwd);
      const data = parsePoetryOutput(result.stdout, result.stderr, result.exitCode, action);
      return compactDualOutput(
        data,
        result.stdout,
        formatPoetry,
        compactPoetryMap,
        formatPoetryCompact,
        compact === false,
      );
    },
  );
}
