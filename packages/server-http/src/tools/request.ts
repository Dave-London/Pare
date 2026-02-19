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
import { parseCurlOutput, PARE_META_SEPARATOR } from "../lib/parsers.js";
import {
  formatHttpResponse,
  compactResponseMap,
  formatResponseCompact,
} from "../lib/formatters.js";
import { HttpResponseSchema } from "../schemas/index.js";
import { assertSafeUrl, assertSafeHeader } from "../lib/url-validation.js";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const HTTP_VERSIONS = ["1.0", "1.1", "2"] as const;

/** Registers the `request` tool on the given MCP server. */
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
        form: z
          .record(
            z.string().max(INPUT_LIMITS.SHORT_STRING_MAX),
            z.string().max(INPUT_LIMITS.STRING_MAX),
          )
          .optional()
          .describe(
            "Multipart form data as key-value pairs (-F). Each pair maps to `-F key=value`. For file uploads use `@filepath` as the value.",
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
            "Maximum time in seconds for connection phase only (--connect-timeout). Independent of total timeout.",
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
        httpVersion: z
          .enum(HTTP_VERSIONS)
          .optional()
          .describe("HTTP version to use: '1.0', '1.1', or '2' (--http1.0/--http1.1/--http2)"),
        cookie: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "Cookie string or cookie jar file path for session-based APIs (-b). Format: 'name=value; name2=value2'",
          ),
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
      outputSchema: HttpResponseSchema,
    },
    async ({
      url,
      method,
      headers,
      body,
      form,
      timeout,
      connectTimeout,
      followRedirects,
      insecure,
      retry,
      compressed,
      basicAuth,
      proxy,
      httpVersion,
      cookie,
      resolve,
      compact,
      path,
    }) => {
      assertSafeUrl(url);
      if (basicAuth) assertNoFlagInjection(basicAuth, "basicAuth");
      if (proxy) assertNoFlagInjection(proxy, "proxy");
      if (cookie) assertNoFlagInjection(cookie, "cookie");
      if (resolve) assertNoFlagInjection(resolve, "resolve");
      if (form) {
        for (const value of Object.values(form)) {
          assertNoFlagInjection(value, "form value");
        }
      }

      const args = buildCurlArgs({
        url,
        method: method ?? "GET",
        headers,
        body: form ? undefined : body,
        form,
        timeout: timeout ?? 30,
        connectTimeout,
        followRedirects: followRedirects ?? true,
        insecure,
        retry,
        compressed,
        basicAuth,
        proxy,
        httpVersion,
        cookie,
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

/**
 * Options for building curl arguments.
 * Shared by all HTTP tools (get, post, head, request).
 */
export interface BuildCurlArgsOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeout: number;
  connectTimeout?: number;
  followRedirects: boolean;
  insecure?: boolean;
  retry?: number;
  compressed?: boolean;
  basicAuth?: string;
  proxy?: string;
  httpVersion?: string;
  cookie?: string;
  resolve?: string;
  /** When true, use -I (--head) instead of -X HEAD for proper HEAD behavior. */
  useHeadFlag?: boolean;
  /** When true, add --post301 --post302 --post303 to preserve POST method on redirects. */
  preserveMethodOnRedirect?: boolean;
  /** URL-encoded form data items passed via --data-urlencode. */
  dataUrlencode?: string[];
  /** Multipart form data items passed via -F. Each key-value becomes -F key=value. */
  form?: Record<string, string>;
}

/**
 * Builds the curl argument array from the request parameters.
 * Exported for reuse in get/post/head tools.
 */
export function buildCurlArgs(opts: BuildCurlArgsOptions): string[] {
  const args: string[] = [
    "-s", // Silent mode (no progress)
    "-S", // Show errors
    "-i", // Include response headers in output
  ];

  // Write-out format for timing and size metadata (expanded with detailed timing)
  const writeOut = [
    `\n${PARE_META_SEPARATOR}\n`,
    "%{time_total}",
    "%{size_download}",
    "%{size_upload}",
    "%{time_namelookup}",
    "%{time_connect}",
    "%{time_appconnect}",
    "%{time_pretransfer}",
    "%{time_starttransfer}",
    "%{http_version}",
    "%{num_redirects}",
    "%{url_effective}",
    "%{scheme}",
    "%{ssl_verify_result}",
  ].join(" ");
  args.push("-w", writeOut);

  // HTTP method: use -I (--head) for HEAD requests, -X for everything else
  if (opts.useHeadFlag) {
    args.push("-I");
  } else {
    args.push("-X", opts.method);
  }

  // Timeout
  args.push("--max-time", String(opts.timeout));

  // Connection timeout (separate from total timeout)
  if (opts.connectTimeout !== undefined) {
    args.push("--connect-timeout", String(opts.connectTimeout));
  }

  // Follow redirects
  if (opts.followRedirects) {
    args.push("-L");
    // Limit redirect hops to prevent infinite loops
    args.push("--max-redirs", "10");
  }

  // Preserve POST method on redirects (prevent silent POST-to-GET conversion)
  if (opts.preserveMethodOnRedirect) {
    args.push("--post301", "--post302", "--post303");
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

  // Multipart form data (-F): takes priority over body/data-raw
  if (opts.form && Object.keys(opts.form).length > 0) {
    for (const [key, value] of Object.entries(opts.form)) {
      assertNoFlagInjection(key, "form key");
      assertNoFlagInjection(value, "form value");
      args.push("-F", `${key}=${value}`);
    }
  } else {
    // Request body
    if (opts.body) {
      args.push("--data-raw", opts.body);
    }

    // URL-encoded form data
    if (opts.dataUrlencode) {
      for (const item of opts.dataUrlencode) {
        args.push("--data-urlencode", item);
      }
    }
  }

  // Insecure TLS (self-signed certs)
  if (opts.insecure) {
    args.push("-k");
  }

  // Retry on transient failures
  if (opts.retry !== undefined) {
    args.push("--retry", String(opts.retry));
  }

  // Request compressed response
  if (opts.compressed) {
    args.push("--compressed");
  }

  // Basic authentication
  if (opts.basicAuth) {
    args.push("-u", opts.basicAuth);
  }

  // HTTP proxy
  if (opts.proxy) {
    args.push("-x", opts.proxy);
  }

  // HTTP version
  if (opts.httpVersion) {
    switch (opts.httpVersion) {
      case "1.0":
        args.push("--http1.0");
        break;
      case "1.1":
        args.push("--http1.1");
        break;
      case "2":
        args.push("--http2");
        break;
    }
  }

  // Cookie
  if (opts.cookie) {
    args.push("-b", opts.cookie);
  }

  // Custom DNS resolution
  if (opts.resolve) {
    args.push("--resolve", opts.resolve);
  }

  // URL must be last
  args.push(opts.url);

  return args;
}
