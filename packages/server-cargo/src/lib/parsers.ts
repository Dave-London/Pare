import type {
  CargoBuildResult,
  CargoTestResult,
  CargoClippyResult,
  CargoRunResult,
  CargoAddResult,
  CargoRemoveResult,
  CargoFmtResult,
  CargoDocResult,
} from "../schemas/index.js";

interface CargoMessage {
  reason: string;
  message?: {
    code?: { code: string } | null;
    level: string;
    message: string;
    spans: { file_name: string; line_start: number; column_start: number }[];
  };
}

/**
 * Parses `cargo build --message-format=json` output.
 * Each line is a JSON object with a "reason" field.
 * We care about reason="compiler-message" entries.
 */
export function parseCargoBuildJson(stdout: string, exitCode: number): CargoBuildResult {
  const diagnostics = parseCompilerMessages(stdout);
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
  };
}

/**
 * Parses `cargo test` output.
 * Format: "test name ... ok/FAILED/ignored"
 * Summary: "test result: ok/FAILED. X passed; Y failed; Z ignored"
 */
export function parseCargoTestOutput(stdout: string, exitCode: number): CargoTestResult {
  const lines = stdout.split("\n");
  const tests: { name: string; status: "ok" | "FAILED" | "ignored"; duration?: string }[] = [];

  for (const line of lines) {
    const match = line.match(/^test (.+?) \.\.\. (ok|FAILED|ignored)$/);
    if (match) {
      tests.push({
        name: match[1],
        status: match[2] as "ok" | "FAILED" | "ignored",
      });
    }
  }

  const passed = tests.filter((t) => t.status === "ok").length;
  const failed = tests.filter((t) => t.status === "FAILED").length;
  const ignored = tests.filter((t) => t.status === "ignored").length;

  return {
    success: exitCode === 0,
    tests,
    total: tests.length,
    passed,
    failed,
    ignored,
  };
}

/**
 * Parses `cargo clippy --message-format=json` output.
 * Same JSON format as cargo build.
 */
export function parseCargoClippyJson(stdout: string): CargoClippyResult {
  const diagnostics = parseCompilerMessages(stdout);
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
  };
}

/**
 * Parses `cargo run` output.
 * Returns exit code, stdout, stderr, and success flag.
 */
export function parseCargoRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoRunResult {
  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
  };
}

/**
 * Parses `cargo add` output.
 * Lines like: "      Adding serde v1.0.217 to dependencies"
 * Also handles: "      Adding serde v1.0.217 to dev-dependencies"
 */
export function parseCargoAddOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoAddResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const added: { name: string; version: string }[] = [];

  for (const line of lines) {
    const match = line.match(/Adding\s+(\S+)\s+v(\S+)\s+to\s+/);
    if (match) {
      added.push({ name: match[1], version: match[2] });
    }
  }

  return {
    success: exitCode === 0,
    added,
    total: added.length,
  };
}

/**
 * Parses `cargo remove` output.
 * Lines like: "      Removing serde from dependencies"
 */
export function parseCargoRemoveOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): CargoRemoveResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const removed: string[] = [];

  for (const line of lines) {
    const match = line.match(/Removing\s+(\S+)\s+from\s+/);
    if (match) {
      removed.push(match[1]);
    }
  }

  return {
    success: exitCode === 0,
    removed,
    total: removed.length,
  };
}

/**
 * Parses `cargo fmt --check` output.
 * In check mode, lists files with formatting differences (one path per line).
 * In fix mode, returns empty list (files are reformatted in place).
 */
export function parseCargoFmtOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  checkMode: boolean,
): CargoFmtResult {
  const files: string[] = [];

  if (checkMode) {
    // In check mode, cargo fmt --check outputs "Diff in <file>:" lines to stdout
    // or just lists file paths. It may also output raw diff lines.
    const combined = stdout + "\n" + stderr;
    const lines = combined.split("\n");

    for (const line of lines) {
      // Match "Diff in <path> at line N:" format
      const diffMatch = line.match(/^Diff in (.+?) at line/);
      if (diffMatch) {
        const file = diffMatch[1];
        if (!files.includes(file)) {
          files.push(file);
        }
        continue;
      }

      // Some versions just list the file path directly
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("+") && !trimmed.startsWith("-") && !trimmed.startsWith("@") && trimmed.endsWith(".rs")) {
        if (!files.includes(trimmed)) {
          files.push(trimmed);
        }
      }
    }
  }

  return {
    success: exitCode === 0,
    filesChanged: files.length,
    files,
  };
}

/**
 * Parses `cargo doc` output.
 * Counts "warning:" or "warning[" lines from stderr,
 * excluding the summary line "warning: N warnings emitted".
 */
export function parseCargoDocOutput(
  stderr: string,
  exitCode: number,
): CargoDocResult {
  const lines = stderr.split("\n");
  let warnings = 0;

  for (const line of lines) {
    if (line.match(/\bwarning\b(\[|:)/) && !line.match(/\d+ warnings? emitted/)) {
      warnings++;
    }
  }

  return {
    success: exitCode === 0,
    warnings,
  };
}

function parseCompilerMessages(stdout: string) {
  const lines = stdout.trim().split("\n").filter(Boolean);
  const diagnostics: {
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning" | "note" | "help";
    code?: string;
    message: string;
  }[] = [];

  for (const line of lines) {
    let msg: CargoMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }

    if (msg.reason !== "compiler-message" || !msg.message) continue;

    const span = msg.message.spans[0];
    if (!span) continue;

    const severity = (
      ["error", "warning", "note", "help"].includes(msg.message.level)
        ? msg.message.level
        : "warning"
    ) as "error" | "warning" | "note" | "help";

    diagnostics.push({
      file: span.file_name,
      line: span.line_start,
      column: span.column_start,
      severity,
      code: msg.message.code?.code || undefined,
      message: msg.message.message,
    });
  }

  return diagnostics;
}
