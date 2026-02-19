import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  cwdPathInput,
} from "@paretools/shared";
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

/** Registers the `post` tool on the given MCP server. */
export function registerPostTool(server: McpServer) {
  server.registerTool(
    "post",
    {
      title: "HTTP POST",
      description:
        "Makes an HTTP POST request via curl and returns structured response data. Convenience wrapper for the request tool with required body.",
      inputSchema: {
        url: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("The URL to request (http:// or https:// only)"),
        body: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Request body. Ignored when `form` is provided."),
        headers: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe("Request headers as key-value pairs"),
        contentType: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .default("application/json")
          .describe(
            "Content-Type header (default: application/json). Ignored when `form` is provided.",
          ),
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
        preserveMethodOnRedirect: z
          .boolean()
          .optional()
          .describe(
            "Preserve POST method on 301/302/303 redirects instead of converting to GET (--post301/--post302/--post303)",
          ),
        insecure: z
          .boolean()
          .optional()
          .describe("Allow insecure TLS connections, e.g. self-signed certificates (-k)"),
        accept: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Expected response format via Accept header (e.g., 'application/json')"),
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
        dataUrlencode: z
          .array(z.string().max(INPUT_LIMITS.STRING_MAX))
          .optional()
          .describe(
            "URL-encoded form data items (--data-urlencode). Each item is 'key=value'. Use instead of manual URL encoding.",
          ),
        form: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe(
            "Multipart form data as key-value pairs (-F). Each pair maps to `-F key=value`. For file uploads use `@filepath` as the value. When provided, `body` and `contentType` are ignored.",
          ),
        httpVersion: z
          .enum(HTTP_VERSIONS)
          .optional()
          .describe("HTTP version to use: '1.0', '1.1', or '2' (--http1.0/--http1.1/--http2)"),
        compact: compactInput,
        path: cwdPathInput,
      },
      outputSchema: HttpResponseSchema,
    },
    async ({
      url,
      body,
      headers,
      contentType,
      timeout,
      connectTimeout,
      followRedirects,
      preserveMethodOnRedirect,
      insecure,
      accept,
      compressed,
      basicAuth,
      proxy,
      dataUrlencode,
      form,
      httpVersion,
      compact,
      path,
    }) => {
      assertSafeUrl(url);
      if (accept) assertNoFlagInjection(accept, "accept");
      if (basicAuth) assertNoFlagInjection(basicAuth, "basicAuth");
      if (proxy) assertNoFlagInjection(proxy, "proxy");
      if (dataUrlencode) {
        for (const item of dataUrlencode) {
          assertNoFlagInjection(item, "dataUrlencode");
        }
      }
      if (form) {
        for (const value of Object.values(form)) {
          assertNoFlagInjection(value, "form value");
        }
      }

      // When form is provided, don't set Content-Type (curl sets multipart/form-data automatically)
      const mergedHeaders: Record<string, string> = form
        ? { ...headers }
        : {
            "Content-Type": contentType ?? "application/json",
            ...headers,
          };

      if (accept) {
        mergedHeaders["Accept"] = accept;
      }

      const args = buildCurlArgs({
        url,
        method: "POST",
        headers: mergedHeaders,
        body: form ? undefined : body,
        timeout: timeout ?? 30,
        connectTimeout,
        followRedirects: followRedirects ?? true,
        insecure,
        compressed,
        basicAuth,
        proxy,
        httpVersion,
        preserveMethodOnRedirect,
        dataUrlencode: form ? undefined : dataUrlencode,
        form,
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
