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
} from "../schemas/index.js";

const GO_ERROR_RE = /^(.+?\.go):(\d+)(?::(\d+))?: (.+)$/;

/** Parses `go build` stderr output into structured error data with file locations. */
export function parseGoBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): GoBuildResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const errors: { file: string; line: number; column?: number; message: string }[] = [];

  for (const line of lines) {
    const match = line.match(GO_ERROR_RE);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        message: match[4],
      });
    }
  }

  return {
    success: exitCode === 0,
    errors,
    total: errors.length,
  };
}

/**
 * Parses `go test -json` output.
 * Each line is a JSON object: { Time, Action, Package, Test, Elapsed, Output }
 * Actions: "run", "pause", "cont", "pass", "fail", "skip", "output"
 */
export function parseGoTestJson(stdout: string, exitCode: number): GoTestResult {
  const lines = stdout.trim().split("\n").filter(Boolean);
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

  for (const line of lines) {
    let event: GoTestEvent;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (!event.Test) continue;

    const key = `${event.Package}/${event.Test}`;

    if (event.Action === "pass" || event.Action === "fail" || event.Action === "skip") {
      testMap.set(key, {
        package: event.Package,
        name: event.Test,
        status: event.Action,
        elapsed: event.Elapsed,
      });
    }
  }

  const tests = Array.from(testMap.values());
  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const skipped = tests.filter((t) => t.status === "skip").length;

  return {
    success: exitCode === 0,
    tests,
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

/** Parses `go vet` output into structured diagnostics with file locations and messages. */
export function parseGoVetOutput(stdout: string, stderr: string): GoVetResult {
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

  return { diagnostics, total: diagnostics.length };
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

/** Parses `gofmt -l` or `gofmt -w` output into structured result with file list. */
export function parseGoFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  checkMode: boolean,
): GoFmtResult {
  // In check mode (-l), stdout lists files that need formatting (one per line).
  // In fix mode (-w), stdout is typically empty (files are rewritten in place).
  // stderr may contain error messages.
  const output = checkMode ? stdout : stdout;
  const files = output
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
  const vars: Record<string, string> = JSON.parse(stdout || "{}");
  return {
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
export function parseGoListOutput(stdout: string): GoListResult {
  const packages: { dir: string; importPath: string; name: string; goFiles?: string[] }[] = [];

  if (!stdout.trim()) {
    return { packages, total: 0 };
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
      });
    } catch {
      // skip malformed JSON chunks
    }
  }

  return { packages, total: packages.length };
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

/** Parses `go get` output into structured result with success status and output text. */
export function parseGoGetOutput(stdout: string, stderr: string, exitCode: number): GoGetResult {
  const combined = (stdout + "\n" + stderr).trim();
  return {
    success: exitCode === 0,
    output: combined || undefined,
  };
}
