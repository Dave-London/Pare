import type {
  DenoTestResult,
  DenoTestCase,
  DenoLintResult,
  DenoLintDiagnostic,
  DenoFmtResult,
  DenoCheckResult,
  DenoCheckError,
  DenoTaskResult,
  DenoRunResult,
  DenoInfoResult,
  DenoDependency,
} from "../schemas/index.js";

// ── Deno Test parser ─────────────────────────────────────────────────

/**
 * Parses `deno test` output into structured test results.
 *
 * Expected output format:
 * ```
 * running 3 tests from ./test.ts
 * test example ... ok (5ms)
 * test another ... FAILED (2ms)
 * test skipped ... ignored (0ms)
 *
 * ok | 1 passed | 1 failed | 1 ignored (10ms)
 * ```
 */
export function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): DenoTestResult {
  const combined = `${stdout}\n${stderr}`;
  const tests: DenoTestCase[] = [];

  // Parse individual test results: "test <name> ... ok (Xms)" or "... FAILED" or "... ignored"
  const testRe = /^(\S+\s+)?(\S.*?)\s+\.\.\.\s+(ok|FAILED|ignored)(?:\s+\((\d+)ms\))?/gm;
  let match: RegExpExecArray | null;
  while ((match = testRe.exec(combined)) !== null) {
    const name = match[2].trim();
    const rawStatus = match[3];
    const ms = match[4] ? parseInt(match[4], 10) : undefined;

    let status: "passed" | "failed" | "ignored";
    if (rawStatus === "ok") status = "passed";
    else if (rawStatus === "FAILED") status = "failed";
    else status = "ignored";

    tests.push({ name, status, duration: ms });
  }

  // Parse summary line: "ok | N passed | N failed | N ignored (Xms)"
  // or: "FAILED | N passed | N failed | N ignored (Xms)"
  const summaryRe =
    /(?:ok|FAILED)\s*\|\s*(\d+)\s+passed\s*\|\s*(\d+)\s+failed\s*\|\s*(\d+)\s+ignored/;
  const summaryMatch = combined.match(summaryRe);

  let passed = 0;
  let failed = 0;
  let ignored = 0;

  if (summaryMatch) {
    passed = parseInt(summaryMatch[1], 10);
    failed = parseInt(summaryMatch[2], 10);
    ignored = parseInt(summaryMatch[3], 10);
  } else {
    // Fall back to counting from parsed tests
    passed = tests.filter((t) => t.status === "passed").length;
    failed = tests.filter((t) => t.status === "failed").length;
    ignored = tests.filter((t) => t.status === "ignored").length;
  }

  // Parse filtered/measured from summary if present
  const filteredRe = /(\d+)\s+filtered\s+out/;
  const filteredMatch = combined.match(filteredRe);
  const filtered = filteredMatch ? parseInt(filteredMatch[1], 10) : 0;

  const measuredRe = /(\d+)\s+measured/;
  const measuredMatch = combined.match(measuredRe);
  const measured = measuredMatch ? parseInt(measuredMatch[1], 10) : 0;

  const total = passed + failed + ignored;

  // Extract error messages for failed tests
  const errorBlocks = combined.split(/^failures:$/m);
  if (errorBlocks.length > 1) {
    const failureSection = errorBlocks[1];
    // Pattern: "---- <name> ----\n<error text>"
    const errorRe = /^-+\s+(.+?)\s+-+\n([\s\S]*?)(?=^-+\s|\n\nfailures:|$)/gm;
    let errorMatch: RegExpExecArray | null;
    while ((errorMatch = errorRe.exec(failureSection)) !== null) {
      const testName = errorMatch[1].trim();
      const errorText = errorMatch[2].trim();
      const testCase = tests.find((t) => t.name === testName && t.status === "failed");
      if (testCase) {
        testCase.error = errorText;
      }
    }
  }

  return {
    success: exitCode === 0,
    total,
    passed,
    failed,
    ignored,
    filtered,
    measured,
    duration,
    tests: tests.length > 0 ? tests : undefined,
  };
}

// ── Deno Lint parser ─────────────────────────────────────────────────

/**
 * Parses `deno lint` output into structured diagnostics.
 *
 * Deno lint JSON output format (`--json`):
 * ```json
 * {
 *   "diagnostics": [
 *     { "filename": "...", "range": { "start": { "line": 1, "col": 0 } }, "code": "...", "message": "...", "hint": "..." }
 *   ],
 *   "errors": []
 * }
 * ```
 *
 * Text output format:
 * ```
 * (no-unused-vars) `x` is never used
 *     at /path/file.ts:5:7
 *       hint: Remove the unused variable
 * ```
 */
export function parseLintJson(jsonOutput: string): DenoLintResult {
  const data = JSON.parse(jsonOutput);
  const diagnostics: DenoLintDiagnostic[] = [];

  if (Array.isArray(data.diagnostics)) {
    for (const d of data.diagnostics) {
      diagnostics.push({
        file: d.filename ?? d.file ?? "",
        line: d.range?.start?.line ?? d.line ?? 0,
        column: d.range?.start?.col ?? d.column ?? undefined,
        code: d.code ?? undefined,
        message: d.message ?? "",
        hint: d.hint ?? undefined,
      });
    }
  }

  // Also include errors from the "errors" array if present
  if (Array.isArray(data.errors)) {
    for (const e of data.errors) {
      diagnostics.push({
        file: e.filename ?? e.file ?? "",
        line: e.range?.start?.line ?? e.line ?? 0,
        column: e.range?.start?.col ?? e.column ?? undefined,
        code: e.code ?? undefined,
        message: e.message ?? "",
      });
    }
  }

  const total = diagnostics.length;
  return {
    success: total === 0,
    total,
    errors: total,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}

/**
 * Parses `deno lint` text output (non-JSON fallback).
 *
 * Format:
 * ```
 * (no-unused-vars) `x` is never used
 *     at /path/file.ts:5:7
 *       hint: If this is intentional, prefix with underscore
 * Found 3 problems
 * ```
 */
export function parseLintText(stdout: string, stderr: string, exitCode: number): DenoLintResult {
  const combined = `${stdout}\n${stderr}`;
  const diagnostics: DenoLintDiagnostic[] = [];

  // Match pattern: "(code) message\n    at file:line:col"
  const diagRe = /\(([^)]+)\)\s+(.+)\n\s+at\s+(\S+):(\d+):(\d+)(?:\n\s+hint:\s*(.+))?/g;
  let match: RegExpExecArray | null;
  while ((match = diagRe.exec(combined)) !== null) {
    diagnostics.push({
      file: match[3],
      line: parseInt(match[4], 10),
      column: parseInt(match[5], 10),
      code: match[1],
      message: match[2].trim(),
      hint: match[6]?.trim() || undefined,
    });
  }

  const total = diagnostics.length;
  return {
    success: exitCode === 0 && total === 0,
    total,
    errors: total,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
  };
}

// ── Deno Fmt parser ──────────────────────────────────────────────────

/**
 * Parses `deno fmt --check` output to find unformatted files.
 *
 * When files need formatting, deno fmt --check writes to stderr:
 * ```
 * error: Found 2 not formatted files in 3 files
 * from ./src/main.ts
 * from ./src/utils.ts
 * ```
 *
 * Or on older versions:
 * ```
 * ./src/main.ts
 * ./src/utils.ts
 * ```
 */
export function parseFmtCheck(stdout: string, stderr: string, exitCode: number): DenoFmtResult {
  const combined = `${stdout}\n${stderr}`;
  const files: string[] = [];

  // Pattern 1: "from <filepath>" lines
  const fromRe = /^from\s+(\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(combined)) !== null) {
    files.push(match[1]);
  }

  // Pattern 2: If no "from" lines, look for standalone file paths in stderr
  if (files.length === 0 && exitCode !== 0) {
    for (const line of stderr.split("\n")) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("error:") &&
        !trimmed.startsWith("Checked") &&
        (trimmed.endsWith(".ts") ||
          trimmed.endsWith(".tsx") ||
          trimmed.endsWith(".js") ||
          trimmed.endsWith(".jsx") ||
          trimmed.endsWith(".json") ||
          trimmed.endsWith(".md"))
      ) {
        files.push(trimmed);
      }
    }
  }

  return {
    success: exitCode === 0,
    mode: "check",
    files: files.length > 0 ? files : undefined,
    total: files.length,
  };
}

/**
 * Parses `deno fmt` (write mode) output to find formatted files.
 *
 * Deno fmt writes which files it formatted to stderr:
 * ```
 * Checked 5 files
 * ```
 * Or on older versions just lists the files it changed.
 */
export function parseFmtWrite(stdout: string, stderr: string, exitCode: number): DenoFmtResult {
  const combined = `${stdout}\n${stderr}`;
  const files: string[] = [];

  // Look for file paths that were formatted
  for (const line of combined.split("\n")) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith("Checked") &&
      !trimmed.startsWith("error:") &&
      (trimmed.endsWith(".ts") ||
        trimmed.endsWith(".tsx") ||
        trimmed.endsWith(".js") ||
        trimmed.endsWith(".jsx") ||
        trimmed.endsWith(".json") ||
        trimmed.endsWith(".md"))
    ) {
      files.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    mode: "write",
    files: files.length > 0 ? files : undefined,
    total: files.length,
  };
}

// ── Deno Check parser ────────────────────────────────────────────────

/**
 * Parses `deno check` output for type errors.
 *
 * Format:
 * ```
 * Check file:///path/to/main.ts
 * error: TS2322 [ERROR]: Type 'string' is not assignable to type 'number'.
 *     at file:///path/to/main.ts:5:3
 * ```
 *
 * Or:
 * ```
 * error: TS2322 [ERROR]: Type 'string' is not assignable to type 'number'.
 *  --> /path/to/file.ts:10:5
 * ```
 */
export function parseCheckOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DenoCheckResult {
  const combined = `${stdout}\n${stderr}`;
  const errors: DenoCheckError[] = [];

  // Pattern 1: "error: TS<code> [ERROR]: <message>\n    at <file>:<line>:<col>"
  const errorRe1 =
    /error:\s+TS(\d+)\s+\[ERROR\]:\s+(.+)\n\s+(?:at\s+)?(?:file:\/\/\/)?(\S+?):(\d+):(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = errorRe1.exec(combined)) !== null) {
    errors.push({
      file: match[3],
      line: parseInt(match[4], 10),
      column: parseInt(match[5], 10),
      code: `TS${match[1]}`,
      message: match[2].trim(),
    });
  }

  // Pattern 2: "error: TS<code> [ERROR]: <message>\n --> <file>:<line>:<col>"
  if (errors.length === 0) {
    const errorRe2 =
      /error:\s+TS(\d+)\s+\[ERROR\]:\s+(.+)\n\s+-->\s+(?:file:\/\/\/)?(\S+?):(\d+):(\d+)/g;
    while ((match = errorRe2.exec(combined)) !== null) {
      errors.push({
        file: match[3],
        line: parseInt(match[4], 10),
        column: parseInt(match[5], 10),
        code: `TS${match[1]}`,
        message: match[2].trim(),
      });
    }
  }

  // Pattern 3: generic "error[code]: message at file:line:col"
  if (errors.length === 0) {
    const errorRe3 = /error(?:\[([^\]]+)\])?:\s+(.+)\n\s+(?:at|-->)\s+(\S+?):(\d+):(\d+)/g;
    while ((match = errorRe3.exec(combined)) !== null) {
      errors.push({
        file: match[3],
        line: parseInt(match[4], 10),
        column: parseInt(match[5], 10),
        code: match[1] || undefined,
        message: match[2].trim(),
      });
    }
  }

  return {
    success: exitCode === 0,
    total: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ── Deno Task parser ─────────────────────────────────────────────────

/**
 * Parses `deno task <name>` output into structured result.
 */
export function parseTaskOutput(
  task: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): DenoTaskResult {
  return {
    task,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── Deno Run parser ──────────────────────────────────────────────────

/**
 * Parses `deno run <file>` output into structured result.
 */
export function parseRunOutput(
  file: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): DenoRunResult {
  return {
    file,
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
    duration,
    timedOut,
  };
}

// ── Deno Info parser ─────────────────────────────────────────────────

/**
 * Parses `deno info --json` output into structured dependency info.
 *
 * JSON output shape:
 * ```json
 * {
 *   "roots": ["file:///..."],
 *   "modules": [{ "specifier": "...", "size": 123, ... }],
 *   ...
 * }
 * ```
 */
export function parseInfoJson(jsonOutput: string, module?: string): DenoInfoResult {
  const data = JSON.parse(jsonOutput);
  const dependencies: DenoDependency[] = [];
  let totalSize = 0;

  if (Array.isArray(data.modules)) {
    for (const mod of data.modules) {
      const specifier: string = mod.specifier ?? "";
      const size: number | undefined = mod.size ?? undefined;

      let type: "local" | "remote" | "npm" | undefined;
      if (specifier.startsWith("file://")) type = "local";
      else if (specifier.startsWith("http://") || specifier.startsWith("https://")) type = "remote";
      else if (specifier.startsWith("npm:")) type = "npm";

      dependencies.push({ specifier, type, size });
      if (size) totalSize += size;
    }
  }

  return {
    success: true,
    module: module ?? data.roots?.[0] ?? undefined,
    type: data.modules?.[0]?.mediaType ?? undefined,
    local: data.modules?.[0]?.local ?? undefined,
    totalDependencies: dependencies.length,
    totalSize: totalSize > 0 ? totalSize : undefined,
    dependencies: dependencies.length > 0 ? dependencies : undefined,
  };
}

/**
 * Parses `deno info` text output (non-JSON fallback).
 */
export function parseInfoText(
  stdout: string,
  stderr: string,
  exitCode: number,
  module?: string,
): DenoInfoResult {
  if (exitCode !== 0) {
    return {
      success: false,
      module,
      totalDependencies: 0,
    };
  }

  const dependencies: DenoDependency[] = [];
  const depRe = /^[│├└─\s]*((?:https?:\/\/|file:\/\/\/|npm:)\S+)/gm;
  let match: RegExpExecArray | null;
  while ((match = depRe.exec(stdout)) !== null) {
    const specifier = match[1];
    let type: "local" | "remote" | "npm" | undefined;
    if (specifier.startsWith("file://")) type = "local";
    else if (specifier.startsWith("http://") || specifier.startsWith("https://")) type = "remote";
    else if (specifier.startsWith("npm:")) type = "npm";
    dependencies.push({ specifier, type });
  }

  // Parse "type:" and "local:" from the header
  const typeMatch = stdout.match(/^type:\s+(.+)$/m);
  const localMatch = stdout.match(/^local:\s+(.+)$/m);

  return {
    success: true,
    module,
    type: typeMatch?.[1]?.trim() ?? undefined,
    local: localMatch?.[1]?.trim() ?? undefined,
    totalDependencies: dependencies.length,
    dependencies: dependencies.length > 0 ? dependencies : undefined,
  };
}
