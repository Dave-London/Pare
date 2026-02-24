import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  strippedCompactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
import { curlCmd } from "../lib/curl-runner.js";
import { parseCurlHeadOutput } from "../lib/parsers.js";
import {
  formatHttpHeadResponse,
  schemaHeadResponseMap,
  compactHeadResponseMap,
  formatHeadResponseCompact,
} from "../lib/formatters.js";
import { HttpHeadResponseSchema } from "../schemas/index.js";
import { assertSafeUrl } from "../lib/url-validation.js";
import { buildCurlArgs } from "./request.js";

const HTTP_VERSIONS = ["1.0", "1.1", "2"] as const;

/** Registers the `head` tool on the given MCP server. */
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
        connectTimeout: z
          .number()
          .min(1)
          .max(300)
          .optional()
          .describe(
            "Maximum time in seconds for connection phase only (--connect-timeout). Fast failure for availability probing.",
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
        compact: compactInput,
        path: cwdPathInput,
      },
      outputSchema: HttpHeadResponseSchema,
    },
    async ({
      url,
      headers,
      timeout,
      connectTimeout,
      followRedirects,
      insecure,
      retry,
      basicAuth,
      proxy,
      httpVersion,
      resolve,
      compact,
      path,
    }) => {
      assertSafeUrl(url);
      if (basicAuth) assertNoFlagInjection(basicAuth, "basicAuth");
      if (proxy) assertNoFlagInjection(proxy, "proxy");
      if (resolve) assertNoFlagInjection(resolve, "resolve");

      const args = buildCurlArgs({
        url,
        method: "HEAD",
        headers,
        timeout: timeout ?? 30,
        connectTimeout,
        followRedirects: followRedirects ?? true,
        insecure,
        retry,
        basicAuth,
        proxy,
        httpVersion,
        resolve,
        useHeadFlag: true, // Use -I instead of -X HEAD to avoid potential hangs
      });

      const cwd = path || process.cwd();
      const result = await curlCmd(args, cwd);
      const data = parseCurlHeadOutput(result.stdout, result.stderr, result.exitCode);
      const rawOutput = (result.stdout + "\n" + result.stderr).trim();

      return strippedCompactDualOutput(
        data,
        rawOutput,
        formatHttpHeadResponse,
        schemaHeadResponseMap,
        compactHeadResponseMap,
        formatHeadResponseCompact,
        compact === false,
      );
    },
  );
}
