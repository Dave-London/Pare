import type {
  GoBuildResult,
  GoTestResult,
  GoVetResult,
  GoRunResult,
  GoModTidyResult,
  GoFmtResult,
  GoGenerateResult,
  GoEnvResult,
  GoListResult,
  GoGetResult,
  GolangciLintResult,
  GolangciLintDiagnostic,
} from "../schemas/index.js";

const GO_ERROR_RE = /^(.+?\.go):(\d+)(?::(\d+))?: (.+)$/;

/**
 * Regex to detect non-file build error lines. These are package-level or linker
 * errors that don't match the standard file:line:col format.
 * Matches: "package X is not in GOROOT", linker errors, build constraint errors, etc.
 * Ignores: blank lines, "# package" headers (captured separately as context).
 */
const GO_NON_FILE_ERROR_PATTERNS = [
  /^package .+ is not in (?:GOROOT|GOPATH|std)/,
  /^can(?:not|'t) (?:find|load) package/,
  /^no required module provides package/,
  /^build constraints exclude all Go files/,
  /^imports .+ is not in/,
  // Linker errors
  /^(?:\/[^\s]+\/)?ld[.:]/,
  /^(?:#\s+command-line-arguments|link:)/,
  /undefined reference to/,
  /multiple definition of/,
  // CGO errors
  /^cgo: /,
  // Module errors
  /^go: /,
];

/** Parses `go build` stderr output into structured error data with file locations. */
export function parseGoBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): GoBuildResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const errors: { file: string; line: number; column?: number; message: string }[] = [];
  const rawErrors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(GO_ERROR_RE);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        message: match[4],
      });
      continue;
    }

    // Only capture non-file errors when the build actually failed
    if (exitCode !== 0) {
      const isNonFileError = GO_NON_FILE_ERROR_PATTERNS.some((re) => re.test(trimmed));
      if (isNonFileError) {
        rawErrors.push(trimmed);
      }
    }
  }

  return {
    success: exitCode === 0,
    errors,
    rawErrors: rawErrors.length > 0 ? rawErrors : undefined,
  };
}

/**
 * Parses `go test -json` output.
 * Each line is a JSON object: { Time, Action, Package, Test, Elapsed, Output }
 * Actions: "run", "pause", "cont", "pass", "fail", "skip", "output"
 */
export function parseGoTestJson(stdout: string, exitCode: number): GoTestResult {
  const lines = stdout.trim().split("\n").filter(Boolean);

  // Collect output lines per test (keyed by package/test)
  const testOutputMap = new Map<string, string[]>();
  // Collect output lines per package (for package-level output)
  const pkgOutputMap = new Map<string, string[]>();

  const testMap = new Map<
    string,
    {
      package: string;
      name: string;
      parent?: string;
      status: "pass" | "fail" | "skip";
      elapsed?: number;
      output?: string;
    }
  >();

  // Track package-level failures (where event.Test is undefined)
  const pkgFailures = new Map<string, { package: string; output?: string }>();

  for (const line of lines) {
    let event: GoTestEvent;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.Test) {
      const key = `${event.Package}/${event.Test}`;

      // Collect output lines for tests (#51)
      if (event.Action === "output" && event.Output) {
        if (!testOutputMap.has(key)) {
          testOutputMap.set(key, []);
        }
        testOutputMap.get(key)!.push(event.Output);
      }

      if (event.Action === "pass" || event.Action === "fail" || event.Action === "skip") {
        const parent = deriveParentTestName(event.Test);
        testMap.set(key, {
          package: event.Package,
          name: event.Test,
          ...(parent ? { parent } : {}),
          status: event.Action,
          elapsed: event.Elapsed,
        });
      }
    } else {
      // Package-level events (no Test field) (#52)
      if (event.Action === "output" && event.Output) {
        if (!pkgOutputMap.has(event.Package)) {
          pkgOutputMap.set(event.Package, []);
        }
        pkgOutputMap.get(event.Package)!.push(event.Output);
      }

      if (event.Action === "fail") {
        pkgFailures.set(event.Package, {
          package: event.Package,
        });
      }
    }
  }

  // Attach output to failed tests (#51)
  for (const [key, entry] of testMap) {
    if (entry.status === "fail") {
      const outputLines = testOutputMap.get(key);
      if (outputLines && outputLines.length > 0) {
        entry.output = outputLines.join("").trimEnd();
      }
    }
  }

  // Attach package-level output to package failures (#52)
  for (const [pkg, failure] of pkgFailures) {
    const outputLines = pkgOutputMap.get(pkg);
    if (outputLines && outputLines.length > 0) {
      failure.output = outputLines.join("").trimEnd();
    }
  }

  // Filter out package failures that have corresponding test-level results
  // (a package "fail" event with tests means the package summary, not a build failure)
  const pkgWithTests = new Set<string>();
  for (const entry of testMap.values()) {
    pkgWithTests.add(entry.package);
  }
  const packageFailures = Array.from(pkgFailures.values()).filter(
    (f) => !pkgWithTests.has(f.package),
  );

  const tests = Array.from(testMap.values());
  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const skipped = tests.filter((t) => t.status === "skip").length;

  return {
    success: exitCode === 0,
    tests,
    packageFailures: packageFailures.length > 0 ? packageFailures : undefined,
    passed,
    failed,
    skipped,
  };
}

interface GoTestEvent {
  Time?: string;
  Action: string;
  Package: string;
  Test?: string;
  Elapsed?: number;
  Output?: string;
}

function deriveParentTestName(testName: string): string | undefined {
  const idx = testName.lastIndexOf("/");
  if (idx <= 0) return undefined;
  return testName.slice(0, idx);
}

/**
 * Parses `go vet -json` output into structured diagnostics.
 *
 * The `-json` flag produces output grouped by package. Each package entry is a JSON
 * object keyed by package import path, containing analyzer results:
 * ```json
 * {
 *   "<package>": {
 *     "<analyzer>": {
 *       "posn": "file.go:10:5",
 *       "message": "..."
 *     }
 *     // or an array of diagnostics per analyzer
 *   }
 * }
 * ```
 *
 * Falls back to text parsing if JSON parsing fails (e.g., older Go versions).
 */
export function parseGoVetOutput(stdout: string, stderr: string, exitCode: number): GoVetResult {
  const compilationErrors = extractVetCompilationErrors(stdout, stderr);

  // Try JSON parsing first (go vet -json)
  const jsonResult = tryParseGoVetJson(stdout, stderr);
  if (jsonResult) {
    return {
      ...jsonResult,
      success: exitCode === 0,
      compilationErrors: compilationErrors.length > 0 ? compilationErrors : undefined,
    };
  }

  // Fallback: text parsing
  return parseGoVetText(stdout, stderr, exitCode, compilationErrors);
}

/**
 * Attempt to parse `go vet -json` structured output.
 * Returns null if the output doesn't look like JSON.
 *
 * go vet -json emits one JSON object per package on stdout/stderr.
 * The structure is: { "<package-path>": { "<analyzer>": <diagnostic-or-array> } }
 * Each diagnostic has: { posn: "file:line:col", message: "..." }
 */
function tryParseGoVetJson(
  stdout: string,
  stderr: string,
): { diagnostics: GoVetResult["diagnostics"] } | null {
  // go vet -json writes JSON to stdout; stderr may have non-JSON messages
  const combined = (stdout + "\n" + stderr).trim();
  if (!combined || !combined.includes("{")) return null;

  const diagnostics: {
    file: string;
    line: number;
    column?: number;
    message: string;
    analyzer?: string;
  }[] = [];

  // go vet -json outputs concatenated JSON objects (one per package)
  const chunks = splitJsonObjects(combined);
  if (chunks.length === 0) return null;

  let parsedAny = false;

  for (const chunk of chunks) {
    let pkgObj: Record<string, Record<string, unknown>>;
    try {
      pkgObj = JSON.parse(chunk);
    } catch {
      continue;
    }

    // Each top-level key is a package path
    for (const [, analyzerMap] of Object.entries(pkgObj)) {
      if (typeof analyzerMap !== "object" || analyzerMap === null) continue;

      // Each key in the analyzerMap is an analyzer name
      for (const [analyzerName, diagData] of Object.entries(
        analyzerMap as Record<string, unknown>,
      )) {
        const diagItems = Array.isArray(diagData) ? diagData : [diagData];
        for (const item of diagItems) {
          if (typeof item !== "object" || item === null) continue;
          const diag = item as { posn?: string; message?: string };
          if (!diag.posn || !diag.message) continue;

          parsedAny = true;
          const parsed = parseVetPosn(diag.posn);
          diagnostics.push({
            file: parsed.file,
            line: parsed.line,
            column: parsed.column,
            message: diag.message,
            analyzer: analyzerName,
          });
        }
      }
    }
  }

  if (!parsedAny) return null;

  return { diagnostics };
}

/** Parse a posn string like "file.go:10:5" or "file.go:10" into components. */
function parseVetPosn(posn: string): { file: string; line: number; column?: number } {
  // posn format: "file.go:line:col" or "file.go:line"
  const parts = posn.split(":");
  if (parts.length >= 3) {
    return {
      file: parts.slice(0, -2).join(":"),
      line: parseInt(parts[parts.length - 2], 10) || 0,
      column: parseInt(parts[parts.length - 1], 10) || undefined,
    };
  }
  if (parts.length === 2) {
    return {
      file: parts[0],
      line: parseInt(parts[1], 10) || 0,
    };
  }
  return { file: posn, line: 0 };
}

/** Fallback text parser for go vet output (non-JSON mode). */
function parseGoVetText(
  stdout: string,
  stderr: string,
  exitCode: number,
  knownCompilationErrors: string[] = [],
): GoVetResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: { file: string; line: number; column?: number; message: string }[] = [];
  const compilationErrors = [...knownCompilationErrors];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isCompilationErrorLine(trimmed)) {
      if (!compilationErrors.includes(trimmed)) {
        compilationErrors.push(trimmed);
      }
      continue;
    }

    const match = trimmed.match(GO_ERROR_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        message: match[4],
      });
    }
  }

  return {
    success: exitCode === 0,
    diagnostics,
    compilationErrors: compilationErrors.length > 0 ? compilationErrors : undefined,
  };
}

function extractVetCompilationErrors(stdout: string, stderr: string): string[] {
  const lines = (stdout + "\n" + stderr)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const line of lines) {
    if (isCompilationErrorLine(line) && !seen.has(line)) {
      seen.add(line);
      errors.push(line);
    }
  }
  return errors;
}

function isCompilationErrorLine(line: string): boolean {
  return (
    line.startsWith("# ") ||
    line.includes("undefined:") ||
    line.includes("could not import") ||
    line.includes("build constraints exclude") ||
    (line.includes("package ") && line.includes(" is not in ")) ||
    line.includes("cannot find package")
  );
}

/** Parses `go run` output into structured result with stdout, stderr, and exit code. */
export function parseGoRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  timedOut: boolean = false,
  _signal?: string,
): GoRunResult {
  return {
    exitCode,
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    ...(timedOut ? { timedOut: true } : {}),
    success: exitCode === 0 && !timedOut,
  };
}

/**
 * Parses `go mod tidy` output into structured result with success status, summary,
 * and whether changes were made.
 *
 * @param goModHashBefore - MD5/hash of go.mod before tidy (optional, for change detection)
 * @param goModHashAfter - MD5/hash of go.mod after tidy (optional, for change detection)
 * @param goSumHashBefore - MD5/hash of go.sum before tidy (optional, for change detection)
 * @param goSumHashAfter - MD5/hash of go.sum after tidy (optional, for change detection)
 */
export function parseGoModTidyOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  goModHashBefore?: string,
  goModHashAfter?: string,
  goSumHashBefore?: string,
  goSumHashAfter?: string,
  addedModules: string[] = [],
  removedModules: string[] = [],
): GoModTidyResult {
  if (exitCode === 0) {
    const combined = (stdout + "\n" + stderr).trim();

    // Determine whether changes were made
    let madeChanges: boolean | undefined;
    if (goModHashBefore !== undefined && goModHashAfter !== undefined) {
      const modChanged = goModHashBefore !== goModHashAfter;
      const sumChanged =
        goSumHashBefore !== undefined &&
        goSumHashAfter !== undefined &&
        goSumHashBefore !== goSumHashAfter;
      madeChanges = modChanged || sumChanged;
    } else if (combined) {
      // If we have output (e.g., "go: downloading..."), changes were likely made
      madeChanges = true;
    } else {
      // No output and no hashes: assume no changes
      madeChanges = false;
    }

    return {
      success: true,
      summary: combined || "go.mod and go.sum are already tidy.",
      ...(addedModules.length > 0 ? { addedModules } : {}),
      ...(removedModules.length > 0 ? { removedModules } : {}),
      madeChanges,
    };
  }

  const combined = (stderr + "\n" + stdout).trim();
  const errorType = categorizeGoModTidyError(combined);
  return {
    success: false,
    summary: combined || "go mod tidy failed.",
    errorType,
  };
}

function categorizeGoModTidyError(message: string): "network" | "checksum" | "syntax" | "unknown" {
  const lower = message.toLowerCase();
  if (
    lower.includes("dial tcp") ||
    lower.includes("i/o timeout") ||
    lower.includes("connection refused") ||
    lower.includes("no such host")
  ) {
    return "network";
  }
  if (lower.includes("checksum mismatch") || lower.includes("sumdb")) {
    return "checksum";
  }
  if (lower.includes("syntax error") || lower.includes("invalid go version")) {
    return "syntax";
  }
  return "unknown";
}

/**
 * Regex for gofmt stderr parse errors.
 * Matches patterns like: "file.go:10:5: expected ..." or "file.go:10: expected ..."
 */
const GOFMT_ERROR_RE = /^(.+?):(\d+)(?::(\d+))?: (.+)$/;

/** Parses `gofmt -l` or `gofmt -l -w` output into structured result with file list. */
export function parseGoFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  checkMode: boolean,
): GoFmtResult {
  // Both check mode (-l) and fix mode (-l -w) list changed files on stdout.
  // With -d enabled, stdout may contain unified diffs.
  const changes = parseGofmtChanges(stdout);
  const filesFromDiff = changes.map((c) => c.file);
  const filesFromList = stdout
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => !!f && !f.startsWith("diff ") && !f.startsWith("--- ") && !f.startsWith("+++ "));
  const files = filesFromDiff.length > 0 ? Array.from(new Set(filesFromDiff)) : filesFromList;

  const hasErrors = exitCode !== 0 || (checkMode && files.length > 0);

  // Parse stderr for parse errors (Gap #151)
  const parseErrors: { file: string; line: number; column?: number; message: string }[] = [];
  if (stderr) {
    const stderrLines = stderr.split("\n");
    for (const line of stderrLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(GOFMT_ERROR_RE);
      if (match) {
        parseErrors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: match[3] ? parseInt(match[3], 10) : undefined,
          message: match[4],
        });
      }
    }
  }

  return {
    success: !hasErrors,
    filesChanged: files.length,
    files,
    changes: changes.length > 0 ? changes : undefined,
    parseErrors: parseErrors.length > 0 ? parseErrors : undefined,
  };
}

function parseGofmtChanges(stdout: string): Array<{ file: string; diff: string }> {
  if (!stdout.includes("\ndiff ") && !stdout.startsWith("diff ")) {
    return [];
  }

  const blocks = stdout
    .split(/^diff /m)
    .map((b) => b.trim())
    .filter(Boolean);

  const changes: Array<{ file: string; diff: string }> = [];
  for (const block of blocks) {
    const diffText = `diff ${block}`;
    const firstLine = diffText.split("\n")[0] ?? "";
    const fileMatch = firstLine.match(/^diff\s+\S+\s+(\S+)/);
    const file = fileMatch?.[1];
    if (!file) continue;
    changes.push({ file, diff: diffText });
  }
  return changes;
}

/**
 * Regex for go generate -v output: prints package name as it's processed.
 * Format: "mypackage" (just package name on stderr when -v is used)
 *
 * Regex for go generate -x output: prints the command being executed.
 * Format on stderr: "cd /path/to/pkg; <command>" or just the command
 *
 * Combined regex for go generate verbose output lines indicating per-directive status.
 * Patterns:
 *   - `<file>:<line>: running "<command>"...` (from -v, not always present)
 *   - `<file>.go:<line>: <command>` (from stderr with -x)
 *   - `cd /path; <command>` (from -x)
 */
const GO_GENERATE_DIRECTIVE_RE = /^(.+\.go):(\d+): running "(.+?)"$/;
const GO_GENERATE_X_FILE_RE = /^(.+\.go):(\d+): (.+)$/;

/** Parses `go generate` output into structured result with success status and output text. */
export function parseGoGenerateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  timedOut: boolean = false,
): GoGenerateResult {
  const combined = (stdout + "\n" + stderr).trim();

  // Parse per-directive output from -v/-x flags (Gap #152)
  const directives: {
    file: string;
    line?: number;
    command: string;
    status?: "running" | "completed" | "failed";
  }[] = [];

  const allLines = combined.split("\n");
  for (const line of allLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match "file.go:10: running "command""
    const verboseMatch = trimmed.match(GO_GENERATE_DIRECTIVE_RE);
    if (verboseMatch) {
      directives.push({
        file: verboseMatch[1],
        line: parseInt(verboseMatch[2], 10),
        command: verboseMatch[3],
        status: exitCode === 0 ? "completed" : "running",
      });
      continue;
    }

    // Match "file.go:10: <command>" from -x output
    const xMatch = trimmed.match(GO_GENERATE_X_FILE_RE);
    if (xMatch) {
      // Avoid matching error messages that look like file:line: patterns
      const command = xMatch[3];
      // Skip lines that look like error messages (contain "exec:", "not found", etc.)
      if (
        !command.startsWith("running ") &&
        !command.includes("executable file not found") &&
        !command.startsWith("bad flag syntax")
      ) {
        directives.push({
          file: xMatch[1],
          line: parseInt(xMatch[2], 10),
          command: command,
          status: exitCode === 0 ? "completed" : undefined,
        });
      }
    }
  }

  return {
    success: exitCode === 0 && !timedOut,
    output: combined,
    ...(timedOut ? { timedOut: true } : {}),
    directives: directives.length > 0 ? directives : undefined,
  };
}

/**
 * Parses `go env -json` output into structured result with environment variables and key fields.
 * When specific vars are queried, the result only contains those vars from the JSON output.
 * The queriedVars parameter is used to ensure compact mode includes the queried variables.
 */
export function parseGoEnvOutput(stdout: string, _queriedVars?: string[]): GoEnvResult {
  let allVars: Record<string, string>;
  try {
    allVars = JSON.parse(stdout || "{}");
  } catch {
    return {
      success: false,
      vars: undefined,
      goroot: "",
      gopath: "",
      goversion: "",
      goos: "",
      goarch: "",
    };
  }
  const queriedVars = _queriedVars ?? [];
  const includeVars = _queriedVars === undefined ? true : queriedVars.length > 0;
  const vars = includeVars ? allVars : undefined;

  const cgoRaw = allVars.CGO_ENABLED;
  const cgoEnabled = cgoRaw !== undefined ? cgoRaw === "1" : undefined;
  return {
    success: true,
    vars,
    goroot: allVars.GOROOT ?? "",
    gopath: allVars.GOPATH ?? "",
    goversion: allVars.GOVERSION ?? "",
    goos: allVars.GOOS ?? "",
    goarch: allVars.GOARCH ?? "",
    ...(cgoEnabled !== undefined ? { cgoEnabled } : {}),
    // Store queriedVars for compact mode usage (handled in formatter)
  };
}

/**
 * Parses `go list -json` output into structured result with package list and total count.
 * go list -json emits concatenated JSON objects (JSONL), one per package.
 */
export function parseGoListOutput(stdout: string, exitCode: number): GoListResult {
  const packages: {
    dir: string;
    importPath: string;
    name: string;
    goFiles?: string[];
    testGoFiles?: string[];
    imports?: string[];
    standard?: boolean;
    stale?: boolean;
    module?: { path?: string; version?: string };
    error?: { err: string };
  }[] = [];

  if (!stdout.trim()) {
    return { success: exitCode === 0, packages };
  }

  // go list -json outputs concatenated JSON objects separated by newlines.
  // Split by detecting `}\n{` boundary and parse each object individually.
  const chunks = splitJsonObjects(stdout);

  for (const chunk of chunks) {
    try {
      const pkg = JSON.parse(chunk);
      const entry: {
        dir: string;
        importPath: string;
        name: string;
        goFiles?: string[];
        testGoFiles?: string[];
        imports?: string[];
        standard?: boolean;
        stale?: boolean;
        module?: { path?: string; version?: string };
        error?: { err: string };
      } = {
        dir: pkg.Dir ?? "",
        importPath: pkg.ImportPath ?? "",
        name: pkg.Name ?? "",
        goFiles: pkg.GoFiles,
        testGoFiles: pkg.TestGoFiles,
        imports: pkg.Imports,
        standard: typeof pkg.Standard === "boolean" ? pkg.Standard : undefined,
        stale: typeof pkg.Stale === "boolean" ? pkg.Stale : undefined,
        module:
          pkg.Module && typeof pkg.Module === "object"
            ? {
                path: typeof pkg.Module.Path === "string" ? pkg.Module.Path : undefined,
                version: typeof pkg.Module.Version === "string" ? pkg.Module.Version : undefined,
              }
            : undefined,
      };

      // Capture Error field (Gap #155)
      if (pkg.Error && typeof pkg.Error === "object" && pkg.Error.Err) {
        entry.error = { err: String(pkg.Error.Err) };
      }

      packages.push(entry);
    } catch {
      // skip malformed JSON chunks
    }
  }

  return { success: exitCode === 0, packages };
}

/**
 * Parses `go list -json -m` output into structured result with module list and total count.
 * go list -json -m emits concatenated JSON objects, one per module.
 */
export function parseGoListModulesOutput(stdout: string, exitCode: number): GoListResult {
  const modules: {
    path: string;
    version?: string;
    dir?: string;
    goMod?: string;
    goVersion?: string;
    main?: boolean;
    indirect?: boolean;
  }[] = [];

  if (!stdout.trim()) {
    return { success: exitCode === 0, modules };
  }

  const chunks = splitJsonObjects(stdout);

  for (const chunk of chunks) {
    try {
      const mod = JSON.parse(chunk);
      modules.push({
        path: mod.Path ?? "",
        version: mod.Version || undefined,
        dir: mod.Dir || undefined,
        goMod: mod.GoMod || undefined,
        goVersion: mod.GoVersion || undefined,
        main: mod.Main || undefined,
        indirect: mod.Indirect || undefined,
      });
    } catch {
      // skip malformed JSON chunks
    }
  }

  return { success: exitCode === 0, modules };
}

/** Splits concatenated JSON objects from go list -json output. */
function splitJsonObjects(text: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results;
}

/**
 * Parses `golangci-lint run --out-format json` output into structured diagnostics.
 * The JSON output has the shape: { Issues: [...], Report: { Linters: [...] } }
 */
export function parseGolangciLintJson(stdout: string, _exitCode: number): GolangciLintResult {
  const diagnostics: GolangciLintDiagnostic[] = [];

  if (!stdout.trim()) {
    return { diagnostics, errors: 0, warnings: 0 };
  }

  let parsed: GolangciLintJsonOutput;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // If JSON parsing fails, return empty result
    return { diagnostics, errors: 0, warnings: 0 };
  }

  const issues = parsed.Issues ?? [];
  for (const issue of issues) {
    const severity = mapSeverity(issue.Severity);
    const diag: GolangciLintDiagnostic = {
      file: issue.Pos?.Filename ?? "",
      line: issue.Pos?.Line ?? 0,
      column: issue.Pos?.Column || undefined,
      linter: issue.FromLinter ?? "",
      severity,
      message: issue.Text ?? "",
    };

    // Capture Replacement/fix data (Gap #154)
    if (issue.Replacement) {
      const replacement = issue.Replacement;
      if (replacement.NeedOnlyDelete || replacement.NewLines !== undefined) {
        const fix: GolangciLintDiagnostic["fix"] = {
          text: replacement.NeedOnlyDelete ? "" : (replacement.NewLines ?? []).join("\n"),
        };

        // Include range if inline fix info is present
        if (replacement.Inline) {
          fix.range = {
            start: {
              line: replacement.Inline.StartLine ?? issue.Pos?.Line ?? 0,
              column: replacement.Inline.StartCol,
            },
            end: {
              line: replacement.Inline.EndLine ?? issue.Pos?.Line ?? 0,
              column: replacement.Inline.EndCol,
            },
          };
        }

        diag.fix = fix;
      } else if (typeof replacement.NewLines === "undefined" && !replacement.NeedOnlyDelete) {
        // Some replacements only have NewLines without inline info
        // If Replacement exists but has no expected structure, still try to capture it
      }
    }

    diagnostics.push(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    errors,
    warnings,
  };
}

function mapSeverity(severity?: string): "error" | "warning" | "info" {
  if (!severity) return "warning";
  const lower = severity.toLowerCase();
  if (lower === "error") return "error";
  if (lower === "info") return "info";
  return "warning";
}

interface GolangciLintJsonOutput {
  Issues?: Array<{
    FromLinter?: string;
    Text?: string;
    Severity?: string;
    SourceLines?: string[];
    Pos?: {
      Filename?: string;
      Line?: number;
      Column?: number;
    };
    Replacement?: {
      NeedOnlyDelete?: boolean;
      NewLines?: string[];
      Inline?: {
        StartLine?: number;
        StartCol?: number;
        EndLine?: number;
        EndCol?: number;
      };
    };
  }>;
}

/**
 * Regex patterns for go get output lines that indicate version resolution.
 * Matches lines like:
 *   go: upgraded golang.org/x/text v0.3.7 => v0.14.0
 *   go: added github.com/pkg/errors v0.9.1
 *   go: downgraded golang.org/x/net v0.10.0 => v0.8.0
 */
const GO_GET_UPGRADED_RE = /^go: (?:upgraded|downgraded)\s+(\S+)\s+(\S+)\s+=>\s+(\S+)$/;
const GO_GET_ADDED_RE = /^go: added\s+(\S+)\s+(\S+)$/;
/**
 * Regex for go get error lines per package.
 * Examples:
 *   go: module github.com/nonexistent/pkg: no matching versions for query "latest"
 *   go: github.com/some/pkg@v1.0.0: verifying module: ...
 */
const GO_GET_ERROR_RE = /^go: (?:module\s+)?(\S+?)(?:@(\S+))?:\s+(.+)$/;

/** Parses `go get` output into structured result with success status, output text, resolved packages, and per-package status. */
export function parseGoGetOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  requestedPackages?: string[],
): GoGetResult {
  const combined = (stdout + "\n" + stderr).trim();
  const resolvedPackages: {
    package: string;
    previousVersion?: string;
    newVersion: string;
  }[] = [];

  // Per-package status tracking (Gap #153)
  const packageStatuses = new Map<
    string,
    {
      path: string;
      version?: string;
      error?: string;
      errorType?: "timeout" | "dns" | "authentication" | "network" | "unknown";
    }
  >();

  const lines = combined.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // Match "go: upgraded <pkg> <old> => <new>" or "go: downgraded <pkg> <old> => <new>"
    const upgradeMatch = trimmed.match(GO_GET_UPGRADED_RE);
    if (upgradeMatch) {
      resolvedPackages.push({
        package: upgradeMatch[1],
        previousVersion: upgradeMatch[2],
        newVersion: upgradeMatch[3],
      });
      packageStatuses.set(upgradeMatch[1], {
        path: upgradeMatch[1],
        version: upgradeMatch[3],
      });
      continue;
    }

    // Match "go: added <pkg> <version>"
    const addedMatch = trimmed.match(GO_GET_ADDED_RE);
    if (addedMatch) {
      resolvedPackages.push({
        package: addedMatch[1],
        newVersion: addedMatch[2],
      });
      packageStatuses.set(addedMatch[1], {
        path: addedMatch[1],
        version: addedMatch[2],
      });
      continue;
    }

    // Match per-package error lines (Gap #153)
    const errorMatch = trimmed.match(GO_GET_ERROR_RE);
    if (errorMatch) {
      const pkgPath = errorMatch[1];
      const errMsg = errorMatch[3];
      // Skip "downloading" lines which are progress, not errors
      if (!errMsg.startsWith("downloading ")) {
        const errorType = categorizeGoGetError(errMsg);
        packageStatuses.set(pkgPath, {
          path: pkgPath,
          version: errorMatch[2] || undefined,
          error: errMsg,
          errorType,
        });
      }
    }
  }

  // If we have requestedPackages but some aren't in statuses, add them as successful (no error, no explicit status)
  if (requestedPackages) {
    for (const reqPkg of requestedPackages) {
      // Strip version suffix from request (e.g., "github.com/pkg/errors@latest" -> "github.com/pkg/errors")
      const pkgPath = reqPkg.replace(/@.*$/, "");
      if (!packageStatuses.has(pkgPath)) {
        // If the overall command succeeded, mark as successful
        if (exitCode === 0) {
          packageStatuses.set(pkgPath, { path: pkgPath });
        }
      }
    }
  }

  const packages = packageStatuses.size > 0 ? Array.from(packageStatuses.values()) : undefined;

  return {
    success: exitCode === 0,
    resolvedPackages: resolvedPackages.length > 0 ? resolvedPackages : undefined,
    packages,
  };
}

function categorizeGoGetError(
  message: string,
): "timeout" | "dns" | "authentication" | "network" | "unknown" {
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("context deadline exceeded")) {
    return "timeout";
  }
  if (lower.includes("no such host") || lower.includes("lookup ")) {
    return "dns";
  }
  if (
    lower.includes("authentication required") ||
    lower.includes("permission denied") ||
    lower.includes("access denied") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return "authentication";
  }
  if (lower.includes("dial tcp") || lower.includes("connection refused") || lower.includes("tls")) {
    return "network";
  }
  return "unknown";
}
