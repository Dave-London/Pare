import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
} from "@paretools/shared";
import { mongoshCmd } from "../lib/db-runner.js";
import { parseMongoshEval } from "../lib/parsers.js";
import {
  formatMongoshEval,
  compactMongoshEvalMap,
  formatMongoshEvalCompact,
} from "../lib/formatters.js";
import { MongoshEvalResultSchema } from "../schemas/index.js";

/** Registers the `mongosh-eval` tool on the given MCP server. */
export function registerMongoshEvalTool(server: McpServer) {
  server.registerTool(
    "mongosh-eval",
    {
      title: "MongoDB Eval",
      description:
        "Evaluates a MongoDB expression via mongosh and returns the output. " +
        "WARNING: The expression is executed as-is — do not pass untrusted input.",
      inputSchema: {
        expression: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("JavaScript expression to evaluate in mongosh"),
        uri: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("MongoDB connection URI (e.g., mongodb://localhost:27017/mydb)"),
        compact: compactInput,
      },
      outputSchema: MongoshEvalResultSchema,
    },
    async ({ expression, uri, compact }) => {
      if (uri) assertNoFlagInjection(uri, "uri");

      const args: string[] = ["--quiet", "--eval", expression];
      if (uri) args.push(uri);

      const start = Date.now();
      const result = await mongoshCmd(args);
      const duration = Date.now() - start;

      const data = parseMongoshEval(result.stdout, result.stderr, result.exitCode, duration);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();
      return compactDualOutput(
        data,
        rawOutput,
        formatMongoshEval,
        compactMongoshEvalMap,
        formatMongoshEvalCompact,
        compact === false,
      );
    },
  );
}
