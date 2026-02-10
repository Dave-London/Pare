import type { GoBuildResult, GoTestResult, GoVetResult } from "../schemas/index.js";

// go build errors: file.go:line:col: message
const GO_ERROR_RE = /^(.+?\.go):(\d+)(?::(\d+))?: (.+)$/;

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

// go vet output: file.go:line:col: message
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
