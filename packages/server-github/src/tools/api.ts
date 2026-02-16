import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseApi } from "../lib/parsers.js";
import { formatApi } from "../lib/formatters.js";
import { ApiResultSchema } from "../schemas/index.js";

/** Registers the `api` tool on the given MCP server. */
export function registerApiTool(server: McpServer) {
  server.registerTool(
    "api",
    {
      title: "GitHub API",
      description:
        "Makes arbitrary GitHub API calls via `gh api`. Supports all HTTP methods, request bodies, field parameters, pagination, and jq filtering. Returns structured data with status, parsed JSON body, endpoint, and method. Use instead of running `gh api` in the terminal.",
      inputSchema: {
        endpoint: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .describe("GitHub API endpoint (e.g., repos/owner/repo/pulls, /user)"),
        method: z
          .enum(["GET", "POST", "PATCH", "DELETE", "PUT"])
          .optional()
          .default("GET")
          .describe("HTTP method (default: GET)"),
        body: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("JSON request body as key-value pairs (sent via --input)"),
        fields: z
          .record(z.string(), z.string())
          .optional()
          .describe("Key-value pairs sent as --raw-field parameters"),
        // S-gap P1: Add typedFields for --field (typed field input)
        typedFields: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Key-value pairs sent as --field parameters (typed: booleans, numbers, null parsed by gh)",
          ),
        paginate: z
          .boolean()
          .optional()
          .default(false)
          .describe("Enable pagination (--paginate). Fetches all pages."),
        jq: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("jq filter expression to apply to the response"),
        slurp: z
          .boolean()
          .optional()
          .describe("Combine paginated JSON arrays into a single array (--slurp)"),
        include: z
          .boolean()
          .optional()
          .describe("Include response headers in output (-i/--include)"),
        silent: z.boolean().optional().describe("Suppress response body output (--silent)"),
        verbose: z.boolean().optional().describe("Show verbose debug output (--verbose)"),
        // S-gap P0: Add headers param
        headers: z
          .record(z.string(), z.string())
          .optional()
          .describe("Custom HTTP headers as key-value pairs (each maps to -H/--header)"),
        // S-gap P1: Add hostname for GitHub Enterprise
        hostname: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("GitHub Enterprise hostname (--hostname)"),
        // S-gap P1: Add cache TTL
        cache: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Cache TTL for responses, e.g. '5m', '1h' (--cache)"),
        // S-gap P2: Add preview for API preview features
        preview: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("API preview feature name (--preview)"),
        // S-gap P2: Add inputFile for reading body from file
        inputFile: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Read request body from file (--input). Mutually exclusive with body."),
        // P1-gap #142: GraphQL support
        query: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe(
            "GraphQL query string. When provided, makes a GraphQL request via `gh api graphql`.",
          ),
        variables: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("GraphQL variables as key-value pairs. Only used with `query` parameter."),
        path: z
          .string()
          .max(INPUT_LIMITS.PATH_MAX)
          .optional()
          .describe("Repository path (default: cwd)"),
      },
      outputSchema: ApiResultSchema,
    },
    async ({
      endpoint,
      method,
      body,
      fields,
      typedFields,
      paginate,
      jq,
      slurp,
      include: _include,
      silent,
      verbose,
      headers,
      hostname,
      cache,
      preview,
      inputFile,
      query,
      variables,
      path,
    }) => {
      const cwd = path || process.cwd();

      assertNoFlagInjection(endpoint, "endpoint");
      if (jq) assertNoFlagInjection(jq, "jq");
      if (hostname) assertNoFlagInjection(hostname, "hostname");
      if (cache) assertNoFlagInjection(cache, "cache");
      if (preview) assertNoFlagInjection(preview, "preview");
      if (inputFile) assertNoFlagInjection(inputFile, "inputFile");

      // P1-gap #142: Handle GraphQL queries
      if (query) {
        const gqlArgs = ["api", "graphql", "-f", `query=${query}`];
        if (variables) {
          for (const [key, value] of Object.entries(variables)) {
            gqlArgs.push(
              "-f",
              `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`,
            );
          }
        }
        if (hostname) gqlArgs.push("--hostname", hostname);
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            gqlArgs.push("-H", `${key}:${value}`);
          }
        }
        if (jq) gqlArgs.push("--jq", jq);
        if (paginate) gqlArgs.push("--paginate");
        if (slurp) gqlArgs.push("--slurp");
        gqlArgs.push("--include");

        const gqlResult = await ghCmd(gqlArgs, { cwd });
        if (gqlResult.exitCode !== 0 && !gqlResult.stdout && gqlResult.stderr) {
          const data = parseApi("", gqlResult.exitCode, "graphql", "POST", gqlResult.stderr);
          return dualOutput(data, formatApi);
        }
        const data = parseApi(
          gqlResult.stdout,
          gqlResult.exitCode,
          "graphql",
          "POST",
          gqlResult.stderr,
        );
        return dualOutput(data, formatApi);
      }

      const args = ["api", endpoint, "--method", method!];

      if (paginate) {
        args.push("--paginate");
      }

      if (jq) {
        args.push("--jq", jq);
      }

      if (slurp) args.push("--slurp");
      // Always include response headers so we can parse the real HTTP status code.
      // The --include flag is always set; the user's `include` param is redundant but harmless.
      args.push("--include");
      if (silent) args.push("--silent");
      if (verbose) args.push("--verbose");
      if (hostname) args.push("--hostname", hostname);
      if (cache) args.push("--cache", cache);
      if (preview) args.push("--preview", preview);

      // S-gap P0: Add custom headers
      if (headers) {
        for (const [key, value] of Object.entries(headers)) {
          args.push("-H", `${key}:${value}`);
        }
      }

      // Add --raw-field for each field entry
      if (fields) {
        for (const [key, value] of Object.entries(fields)) {
          args.push("--raw-field", `${key}=${value}`);
        }
      }

      // S-gap P1: Add --field for each typed field entry
      if (typedFields) {
        for (const [key, value] of Object.entries(typedFields)) {
          args.push("--field", `${key}=${value}`);
        }
      }

      // Pass JSON body via stdin using --input -
      let stdin: string | undefined;
      if (body) {
        args.push("--input", "-");
        stdin = JSON.stringify(body);
      } else if (inputFile) {
        // S-gap P2: Read body from file
        args.push("--input", inputFile);
      }

      const result = await ghCmd(args, { cwd, stdin });

      // P1-gap #141: Pass stderr to parser for error body preservation
      // Only throw if there's no stdout at all (completely failed)
      if (result.exitCode !== 0 && !result.stdout && result.stderr) {
        // Still try to parse — pass stderr for error body
        const data = parseApi("", result.exitCode, endpoint, method!, result.stderr);
        return dualOutput(data, formatApi);
      }

      const data = parseApi(result.stdout, result.exitCode, endpoint, method!, result.stderr);
      return dualOutput(data, formatApi);
    },
  );
}
