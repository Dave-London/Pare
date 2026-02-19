import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, assertNoFlagInjection, INPUT_LIMITS, cwdPathInput } from "@paretools/shared";
import { ghCmd } from "../lib/gh-runner.js";
import { parseGistCreate } from "../lib/parsers.js";
import { formatGistCreate } from "../lib/formatters.js";
import { GistCreateResultSchema } from "../schemas/index.js";
import { assertSafeFilePath } from "../lib/path-validation.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function classifyGistCreateError(
  stderr: string,
): "validation" | "permission-denied" | "rate-limit" | "unknown" {
  const lower = stderr.toLowerCase();
  if (/forbidden|permission|403/.test(lower)) return "permission-denied";
  if (/rate limit|secondary rate limit|429/.test(lower)) return "rate-limit";
  if (/invalid|missing|must|required/.test(lower)) return "validation";
  return "unknown";
}

/** Registers the `gist-create` tool on the given MCP server. */
export function registerGistCreateTool(server: McpServer) {
  server.registerTool(
    "gist-create",
    {
      title: "Gist Create",
      description:
        "Creates a new GitHub gist from one or more files. Returns structured data with gist ID, URL, visibility, file names, description, and file count.",
      inputSchema: {
        files: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("File paths to include in the gist. Either files or content must be provided."),
        // P1-gap #143: Add content-based gist creation from inline content
        content: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Inline content as filename-to-content map (e.g., {'script.py': 'print(1)'}). " +
              "Creates gist from inline content instead of file paths. Either files or content must be provided.",
          ),
        description: z
          .string()
          .max(INPUT_LIMITS.STRING_MAX)
          .optional()
          .describe("Gist description"),
        public: z
          .boolean()
          .optional()
          .default(false)
          .describe("Create as public gist (default: secret)"),
        path: cwdPathInput,
      },
      outputSchema: GistCreateResultSchema,
    },
    async ({ files, content: contentMap, description, public: isPublic, path }) => {
      const cwd = path || process.cwd();

      if (description) assertNoFlagInjection(description, "description");

      // P1-gap #143: Validate that at least one of files or content is provided
      const hasFiles = files && files.length > 0;
      const hasContent = contentMap && Object.keys(contentMap).length > 0;
      if (!hasFiles && !hasContent) {
        throw new Error("Either `files` or `content` must be provided.");
      }

      // Track temp dir for cleanup
      let tempDir: string | undefined;
      let resolvedFiles: string[] = [];

      try {
        if (hasFiles) {
          // Validate all file paths are safe before passing to gh CLI
          for (const file of files!) {
            assertNoFlagInjection(file, "files");
            assertSafeFilePath(file, cwd);
          }
          resolvedFiles = files!;
        }

        if (hasContent) {
          // P1-gap #143: Write inline content to temp files
          tempDir = mkdtempSync(join(tmpdir(), "pare-gist-"));
          for (const [filename, fileContent] of Object.entries(contentMap!)) {
            assertNoFlagInjection(filename, "content filename");
            const tempPath = join(tempDir, filename);
            writeFileSync(tempPath, fileContent);
            resolvedFiles.push(tempPath);
          }
        }

        const args = ["gist", "create"];
        if (description) {
          args.push("--desc", description);
        }
        if (isPublic) {
          args.push("--public");
        }
        args.push(...resolvedFiles);

        const result = await ghCmd(args, cwd);

        if (result.exitCode !== 0) {
          const outputFiles = hasContent ? Object.keys(contentMap!) : (files ?? []);
          return dualOutput(
            {
              id: "",
              url: "",
              public: !!isPublic,
              files: outputFiles.length > 0 ? outputFiles : undefined,
              description: description ?? undefined,
              fileCount: outputFiles.length > 0 ? outputFiles.length : undefined,
              errorType: classifyGistCreateError(result.stderr || result.stdout),
              errorMessage: (result.stderr || result.stdout || "gh gist create failed").trim(),
            },
            formatGistCreate,
          );
        }

        // Build file list for output (use original filenames for content-based gists)
        const outputFiles = hasContent ? Object.keys(contentMap!) : (files ?? []);

        const data = parseGistCreate(result.stdout, !!isPublic, outputFiles, description);
        return dualOutput(data, formatGistCreate);
      } finally {
        // P1-gap #143: Clean up temp files
        if (tempDir) {
          try {
            rmSync(tempDir, { recursive: true, force: true });
          } catch {
            // Best-effort cleanup
          }
        }
      }
    },
  );
}
