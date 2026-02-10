import { z } from "zod";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { dualOutput, run } from "@paretools/shared";
import { detectFramework, type Framework } from "../lib/detect.js";
import { parsePytestOutput } from "../lib/parsers/pytest.js";
import { parseJestJson } from "../lib/parsers/jest.js";
import { parseVitestJson } from "../lib/parsers/vitest.js";
import { parseMochaJson } from "../lib/parsers/mocha.js";
import { formatTestRun } from "../lib/formatters.js";
import { TestRunSchema } from "../schemas/index.js";

function getRunCommand(framework: Framework, args: string[]): { cmd: string; cmdArgs: string[] } {
  switch (framework) {
    case "pytest":
      return { cmd: "python", cmdArgs: ["-m", "pytest", "-v", ...args] };
    case "jest":
      return { cmd: "npx", cmdArgs: ["jest", "--json", ...args] };
    case "vitest":
      return { cmd: "npx", cmdArgs: ["vitest", "run", "--reporter=json", ...args] };
    case "mocha":
      return { cmd: "npx", cmdArgs: ["mocha", "--reporter", "json", ...args] };
  }
}

export function registerRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Run Tests",
      description:
        "Auto-detects test framework (pytest/jest/vitest/mocha), runs tests, returns structured results with failures. Use instead of running pytest/jest/vitest/mocha in the terminal.",
      inputSchema: {
        path: z.string().optional().describe("Project root path (default: cwd)"),
        framework: z
          .enum(["pytest", "jest", "vitest", "mocha"])
          .optional()
          .describe("Force a specific framework instead of auto-detecting"),
        filter: z
          .string()
          .optional()
          .describe("Test filter pattern (file path or test name pattern)"),
        updateSnapshots: z
          .boolean()
          .optional()
          .default(false)
          .describe("Update snapshots (vitest/jest only, adds -u flag)"),
        args: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Additional arguments to pass to the test runner"),
      },
      outputSchema: TestRunSchema,
    },
    async ({ path, framework, filter, updateSnapshots, args }) => {
      const cwd = path || process.cwd();
      const detected = framework || (await detectFramework(cwd));
      const extraArgs = [...(args || [])];

      if (filter) {
        switch (detected) {
          case "pytest":
            extraArgs.push("-k", filter);
            break;
          case "jest":
            extraArgs.push("--testPathPattern", filter);
            break;
          case "vitest":
            extraArgs.push(filter);
            break;
          case "mocha":
            extraArgs.push("--grep", filter);
            break;
        }
      }

      // Snapshot update support (vitest/jest only)
      if (updateSnapshots && (detected === "vitest" || detected === "jest")) {
        extraArgs.push("-u");
      }

      // For vitest/jest, write JSON to a temp file instead of relying on
      // stdout capture. On Windows, npx.cmd can swallow or mangle stdout,
      // causing "No JSON output found" errors.
      // Mocha outputs JSON to stdout, so we don't use --outputFile for it.
      const useOutputFile = detected === "jest" || detected === "vitest";
      const tempPath = useOutputFile
        ? join(tmpdir(), `pare-test-${randomUUID()}.json`)
        : "";

      const { cmd, cmdArgs } = getRunCommand(detected, extraArgs);

      if (useOutputFile) {
        cmdArgs.push(`--outputFile=${tempPath}`);
      }

      const result = await run(cmd, cmdArgs, { cwd, timeout: 120_000 });

      // Combine stdout and stderr for parsing (some frameworks write to stderr)
      const output = result.stdout + "\n" + result.stderr;

      let testRun;
      switch (detected) {
        case "pytest":
          testRun = parsePytestOutput(output);
          break;
        case "jest": {
          const jsonStr = await readJsonOutput(tempPath, output);
          testRun = parseJestJson(jsonStr);
          break;
        }
        case "vitest": {
          const jsonStr = await readJsonOutput(tempPath, output);
          testRun = parseVitestJson(jsonStr);
          break;
        }
        case "mocha": {
          const jsonStr = extractJson(output);
          testRun = parseMochaJson(jsonStr);
          break;
        }
      }

      return dualOutput(testRun, formatTestRun);
    },
  );
}

/**
 * Reads JSON output from a temp file, falling back to extracting it from
 * stdout if the file was not created. Always cleans up the temp file.
 */
async function readJsonOutput(tempPath: string, output: string): Promise<string> {
  try {
    return await readFile(tempPath, "utf-8");
  } catch {
    // Temp file wasn't created — fall back to stdout extraction
    return extractJson(output);
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * Extracts the JSON object from mixed output that may include non-JSON text
 * before or after the actual JSON data.
 */
export function extractJson(output: string): string {
  // Try to find JSON object boundaries
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON output found. Ensure the test runner is configured to output JSON.");
  }

  return output.slice(start, end + 1);
}
