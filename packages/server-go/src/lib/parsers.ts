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

  const total = errors.length + rawErrors.length;

  return {
    success: exitCode === 0,
    errors,
    rawErrors: rawErrors.length > 0 ? rawErrors : undefined,
    total,
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
        testMap.set(key, {
          package: event.Package,
          name: event.Test,
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
    total: tests.length,
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

/** Parses `go vet` output into structured diagnostics with file locations, messages, and success status. */
export function parseGoVetOutput(stdout: string, stderr: string, exitCode: number): GoVetResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: { file: string; line: number; column?: number; message: string }[] = [];

  for (const line of lines) {
    const match = line.match(GO_ERROR_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        message: match[4],
      });
    }
  }

  return { success: exitCode === 0, diagnostics, total: diagnostics.length };
}

/** Parses `go run` output into structured result with stdout, stderr, and exit code. */
export function parseGoRunOutput(stdout: string, stderr: string, exitCode: number): GoRunResult {
  return {
    exitCode,
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    success: exitCode === 0,
  };
}

/** Parses `go mod tidy` output into structured result with success status and summary. */
export function parseGoModTidyOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): GoModTidyResult {
  if (exitCode === 0) {
    const combined = (stdout + "\n" + stderr).trim();
    return {
      success: true,
      summary: combined || "go.mod and go.sum are already tidy.",
    };
  }

  const combined = (stderr + "\n" + stdout).trim();
  return {
    success: false,
    summary: combined || "go mod tidy failed.",
  };
}

/** Parses `gofmt -l` or `gofmt -l -w` output into structured result with file list. */
export function parseGoFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  checkMode: boolean,
): GoFmtResult {
  // Both check mode (-l) and fix mode (-l -w) list changed files on stdout.
  // The -l flag causes gofmt to print filenames, -w causes it to also rewrite them.
  // stderr may contain error messages.
  const files = stdout
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const hasErrors = exitCode !== 0 || (checkMode && files.length > 0);

  return {
    success: !hasErrors,
    filesChanged: files.length,
    files,
  };
}

/** Parses `go generate` output into structured result with success status and output text. */
export function parseGoGenerateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): GoGenerateResult {
  const combined = (stdout + "\n" + stderr).trim();
  return {
    success: exitCode === 0,
    output: combined,
  };
}

/** Parses `go env -json` output into structured result with environment variables and key fields. */
export function parseGoEnvOutput(stdout: string): GoEnvResult {
  let vars: Record<string, string>;
  try {
    vars = JSON.parse(stdout || "{}");
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
  return {
    success: true,
    vars,
    goroot: vars.GOROOT ?? "",
    gopath: vars.GOPATH ?? "",
    goversion: vars.GOVERSION ?? "",
    goos: vars.GOOS ?? "",
    goarch: vars.GOARCH ?? "",
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
  }[] = [];

  if (!stdout.trim()) {
    return { success: exitCode === 0, packages, total: 0 };
  }

  // go list -json outputs concatenated JSON objects separated by newlines.
  // Split by detecting `}\n{` boundary and parse each object individually.
  const chunks = splitJsonObjects(stdout);

  for (const chunk of chunks) {
    try {
      const pkg = JSON.parse(chunk);
      packages.push({
        dir: pkg.Dir ?? "",
        importPath: pkg.ImportPath ?? "",
        name: pkg.Name ?? "",
        goFiles: pkg.GoFiles,
        testGoFiles: pkg.TestGoFiles,
      });
    } catch {
      // skip malformed JSON chunks
    }
  }

  return { success: exitCode === 0, packages, total: packages.length };
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
    return { diagnostics, total: 0, errors: 0, warnings: 0, byLinter: [] };
  }

  let parsed: GolangciLintJsonOutput;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    // If JSON parsing fails, return empty result
    return { diagnostics, total: 0, errors: 0, warnings: 0, byLinter: [] };
  }

  const issues = parsed.Issues ?? [];
  for (const issue of issues) {
    const severity = mapSeverity(issue.Severity);
    diagnostics.push({
      file: issue.Pos?.Filename ?? "",
      line: issue.Pos?.Line ?? 0,
      column: issue.Pos?.Column || undefined,
      linter: issue.FromLinter ?? "",
      severity,
      message: issue.Text ?? "",
      sourceLine: issue.SourceLines?.[0] || undefined,
    });
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  // Build by-linter summary
  const linterCounts = new Map<string, number>();
  for (const d of diagnostics) {
    linterCounts.set(d.linter, (linterCounts.get(d.linter) ?? 0) + 1);
  }
  const byLinter = Array.from(linterCounts.entries())
    .map(([linter, count]) => ({ linter, count }))
    .sort((a, b) => b.count - a.count);

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
    byLinter,
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
  }>;
}

/** Parses `go get` output into structured result with success status and output text. */
export function parseGoGetOutput(stdout: string, stderr: string, exitCode: number): GoGetResult {
  const combined = (stdout + "\n" + stderr).trim();
  return {
    success: exitCode === 0,
    output: combined || undefined,
  };
}
