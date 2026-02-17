import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, INPUT_LIMITS } from "@paretools/shared";
import { curlCmd } from "../lib/curl-runner.js";
import { parseCurlHeadOutput } from "../lib/parsers.js";
import {
  formatHttpHeadResponse,
  compactHeadResponseMap,
  formatHeadResponseCompact,
} from "../lib/formatters.js";
import { HttpHeadResponseSchema } from "../schemas/index.js";
import { assertSafeUrl } from "../lib/url-validation.js";
import { buildCurlArgs } from "./request.js";

export function registerHeadTool(server: McpServer) {
  server.registerTool(
    "head",
    {
      title: "HTTP HEAD",
      description:
        "Makes an HTTP HEAD request via curl and returns structured response headers (no body). Use to check resource existence, content type, or cache headers.",
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
            "Prefer compact output",
          ),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Working directory"),
      },
      outputSchema: HttpHeadResponseSchema,
    },
    async ({ url, headers, timeout, followRedirects, compact, path }) => {
      assertSafeUrl(url);

      const args = buildCurlArgs({
        url,
        method: "HEAD",
        headers,
        timeout: timeout ?? 30,
        followRedirects: followRedirects ?? true,
      });

      const cwd = path || process.cwd();
      const result = await curlCmd(args, cwd);
      const data = parseCurlHeadOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return compactDualOutput(
        data,
        rawOutput,
        formatHttpHeadResponse,
        compactHeadResponseMap,
        formatHeadResponseCompact,
        compact === false,
      );
    },
  );
}
