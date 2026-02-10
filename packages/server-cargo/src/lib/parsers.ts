import type { CargoBuildResult, CargoTestResult, CargoClippyResult } from "../schemas/index.js";

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
