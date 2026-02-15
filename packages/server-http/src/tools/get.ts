import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { curlCmd } from "../lib/curl-runner.js";
import { parseCurlOutput } from "../lib/parsers.js";
import {
  formatHttpResponse,
  compactResponseMap,
  formatResponseCompact,
} from "../lib/formatters.js";
import { HttpResponseSchema } from "../schemas/index.js";
import { assertSafeUrl } from "../lib/url-validation.js";
import { buildCurlArgs } from "./request.js";

/** Registers the `get` tool on the given MCP server. */
export function registerGetTool(server: McpServer) {
  server.registerTool(
    "get",
    {
      title: "HTTP GET",
      description:
        "Makes an HTTP GET request via curl and returns structured response data. Convenience wrapper for the request tool.",
      inputSchema: {
        url: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("The URL to request (http:// or https:// only)"),
        headers: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe("Request headers as key-value pairs"),
        timeout: z
          .number()
          .min(1)
          .max(300)
          .optional()
          .default(30)
          .describe("Request timeout in seconds (default: 30)"),
        followRedirects: z
          .boolean()
          .optional()
          .default(true)
          .describe("Follow HTTP redirects (default: true)"),
        compact: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Auto-compact when structured output exceeds raw CLI tokens. Set false to always get full schema.",
          ),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory (default: cwd)"),
      },
      outputSchema: HttpResponseSchema,
    },
    async ({ url, headers, timeout, followRedirects, compact, path }) => {
      assertSafeUrl(url);

      const args = buildCurlArgs({
        url,
        method: "GET",
        headers,
        timeout: timeout ?? 30,
        followRedirects: followRedirects ?? true,
      });

      const cwd = path || process.cwd();
      const result = await curlCmd(args, cwd);
      const data = parseCurlOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatHttpResponse,
        compactResponseMap,
        formatResponseCompact,
        compact === false,
      );
    },
  );
}
