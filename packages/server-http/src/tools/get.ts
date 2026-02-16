import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { compactDualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
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

const HTTP_VERSIONS = ["1.0", "1.1", "2"] as const;

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
        connectTimeout: z
          .number()
          .min(1)
          .max(300)
          .optional()
          .describe(
            "Maximum time in seconds for connection phase only (--connect-timeout). Detects connection failures fast.",
          ),
        followRedirects: z
          .boolean()
          .optional()
          .default(true)
          .describe("Follow HTTP redirects (default: true)"),
        insecure: z
          .boolean()
          .optional()
          .describe("Allow insecure TLS connections, e.g. self-signed certificates (-k)"),
        retry: z
          .number()
          .min(0)
          .max(10)
          .optional()
          .describe("Number of retries on transient failures (--retry)"),
        compressed: z
          .boolean()
          .optional()
          .describe("Request compressed response and decompress automatically (--compressed)"),
        basicAuth: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Basic auth credentials as 'user:password' (-u)"),
        proxy: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Proxy URL (e.g., http://proxy:8080) (-x)"),
        queryParams: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe(
            "Query parameters as key-value pairs. URL-encoded and appended to the URL automatically.",
          ),
        httpVersion: z
          .enum(HTTP_VERSIONS)
          .optional()
          .describe("HTTP version to use: '1.0', '1.1', or '2' (--http1.0/--http1.1/--http2)"),
        resolve: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Custom DNS resolution (--resolve). Format: 'host:port:addr' (e.g., 'example.com:443:127.0.0.1')",
          ),
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
    async ({
      url,
      headers,
      timeout,
      connectTimeout,
      followRedirects,
      insecure,
      retry,
      compressed,
      basicAuth,
      proxy,
      queryParams,
      httpVersion,
      resolve,
      compact,
      path,
    }) => {
      // Build URL with query params if provided
      let finalUrl = url;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams)) {
          params.append(key, value);
        }
        const separator = url.includes("?") ? "&" : "?";
        finalUrl = `${url}${separator}${params.toString()}`;
      }

      assertSafeUrl(finalUrl);
      if (basicAuth) assertNoFlagInjection(basicAuth, "basicAuth");
      if (proxy) assertNoFlagInjection(proxy, "proxy");
      if (resolve) assertNoFlagInjection(resolve, "resolve");

      const args = buildCurlArgs({
        url: finalUrl,
        method: "GET",
        headers,
        timeout: timeout ?? 30,
        connectTimeout,
        followRedirects: followRedirects ?? true,
        insecure,
        retry,
        compressed,
        basicAuth,
        proxy,
        httpVersion,
        resolve,
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
