import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { curlCmd } from "../lib/curl-runner.js";
import { parseCurlOutput, PARE_META_SEPARATOR } from "../lib/parsers.js";
import {
  formatHttpResponse,
  compactResponseMap,
  formatResponseCompact,
} from "../lib/formatters.js";
import { HttpResponseSchema } from "../schemas/index.js";
import { assertSafeUrl, assertSafeHeader } from "../lib/url-validation.js";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export function registerRequestTool(server: McpServer) {
  server.registerTool(
    "request",
    {
      title: "HTTP Request",
      description:
        "Makes an HTTP request via curl and returns structured response data (status, headers, body, timing).",
      inputSchema: {
        url: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("The URL to request (http:// or https:// only)"),
        method: z.enum(METHODS).optional().default("GET").describe("HTTP method (default: GET)"),
        headers: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe("Request headers as key-value pairs"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Request body (for POST, PUT, PATCH)"),
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
          .describe("Working directory (default: cwd)"),
      },
      outputSchema: HttpResponseSchema,
    },
    async ({ url, method, headers, body, timeout, followRedirects, compact, path }) => {
      assertSafeUrl(url);

      const args = buildCurlArgs({
        url,
        method: method ?? "GET",
        headers,
        body,
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

/**
 * Builds the curl argument array from the request parameters.
 * Exported for reuse in get/post/head tools.
 */
export function buildCurlArgs(opts: {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeout: number;
  followRedirects: boolean;
}): string[] {
  const args: string[] = [
    "-s", // Silent mode (no progress)
    "-S", // Show errors
    "-i", // Include response headers in output
  ];

  // Write-out format for timing and size metadata
  const writeOut = `\n${PARE_META_SEPARATOR}\n%{time_total} %{size_download}`;
  args.push("-w", writeOut);

  // HTTP method
  args.push("-X", opts.method);

  // Timeout
  args.push("--max-time", String(opts.timeout));

  // Follow redirects
  if (opts.followRedirects) {
    args.push("-L");
    // Limit redirect hops to prevent infinite loops
    args.push("--max-redirs", "10");
  }

  // Custom headers
  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      assertNoFlagInjection(key, "header key");
      assertNoFlagInjection(value, "header value");
      assertSafeHeader(key, value);
      args.push("-H", `${key}: ${value}`);
    }
  }

  // Request body
  if (opts.body) {
    args.push("--data-raw", opts.body);
  }

  // URL must be last
  args.push(opts.url);

  return args;
}
