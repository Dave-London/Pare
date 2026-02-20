import type {
  BazelBuildResult,
  BazelTestResult,
  BazelQueryResult,
  BazelInfoResult,
  BazelRunResult,
  BazelCleanResult,
  BazelFetchResult,
  BazelResult,
} from "../schemas/index.js";

// ── Build ────────────────────────────────────────────────────────────

export function formatBazelBuild(data: BazelBuildResult): string {
  const status = data.success ? "success" : "failed";
  const duration = data.durationMs ? ` (${data.durationMs}ms)` : "";
  const lines = [
    `bazel build: ${status}${duration} — ${data.summary.totalTargets} targets (${data.summary.successTargets} ok, ${data.summary.failedTargets} failed)`,
  ];
  for (const e of data.errors ?? []) {
    const loc = e.file ? `${e.file}${e.line ? `:${e.line}` : ""}` : (e.target ?? "");
    lines.push(`  ${loc ? `${loc}: ` : ""}${e.message}`);
  }
  return lines.join("\n");
}

export interface BazelBuildCompact {
  [key: string]: unknown;
  action: "build";
  success: boolean;
  totalTargets: number;
  successTargets: number;
  failedTargets: number;
  errors?: BazelBuildResult["errors"];
  exitCode: number;
}

export function compactBazelBuildMap(data: BazelBuildResult): BazelBuildCompact {
  const compact: BazelBuildCompact = {
    action: "build",
    success: data.success,
    totalTargets: data.summary.totalTargets,
    successTargets: data.summary.successTargets,
    failedTargets: data.summary.failedTargets,
    exitCode: data.exitCode,
  };
  if (data.errors?.length) compact.errors = data.errors;
  return compact;
}

export function formatBazelBuildCompact(data: BazelBuildCompact): string {
  const status = data.success ? "success" : "failed";
  return `bazel build: ${status} (${data.totalTargets} targets, ${data.failedTargets} failed)`;
}

// ── Test ─────────────────────────────────────────────────────────────

export function formatBazelTest(data: BazelTestResult): string {
  const status = data.success ? "ok" : "FAILED";
  const duration = data.durationMs ? ` (${data.durationMs}ms)` : "";
  const lines = [
    `bazel test: ${status}${duration} — ${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.timeout} timeout, ${data.summary.flaky} flaky`,
  ];
  for (const t of data.tests) {
    const dur = t.durationMs ? ` (${t.durationMs}ms)` : "";
    lines.push(`  ${t.status.padEnd(9)} ${t.label}${dur}`);
    if (t.failureMessage) {
      for (const line of t.failureMessage.split("\n")) {
        lines.push(`           ${line}`);
      }
    }
  }
  return lines.join("\n");
}

export interface BazelTestCompact {
  [key: string]: unknown;
  action: "test";
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  timeout: number;
  flaky: number;
  failedTests?: Array<{ label: string; durationMs?: number }>;
  exitCode: number;
}

export function compactBazelTestMap(data: BazelTestResult): BazelTestCompact {
  const failedTests = data.tests
    .filter((t) => t.status === "failed" || t.status === "timeout")
    .map((t) => ({ label: t.label, durationMs: t.durationMs }));
  const compact: BazelTestCompact = {
    action: "test",
    success: data.success,
    totalTests: data.summary.totalTests,
    passed: data.summary.passed,
    failed: data.summary.failed,
    timeout: data.summary.timeout,
    flaky: data.summary.flaky,
    exitCode: data.exitCode,
  };
  if (failedTests.length > 0) compact.failedTests = failedTests;
  return compact;
}

export function formatBazelTestCompact(data: BazelTestCompact): string {
  const status = data.success ? "ok" : "FAILED";
  return `bazel test: ${status}. ${data.passed} passed; ${data.failed} failed; ${data.timeout} timeout`;
}

// ── Query ────────────────────────────────────────────────────────────

export function formatBazelQuery(data: BazelQueryResult): string {
  if (data.count === 0) return "bazel query: no results.";
  const lines = [`bazel query: ${data.count} results`];
  for (const r of data.results) {
    lines.push(`  ${r}`);
  }
  return lines.join("\n");
}

export interface BazelQueryCompact {
  [key: string]: unknown;
  action: "query";
  success: boolean;
  count: number;
  results: string[];
  exitCode: number;
}

export function compactBazelQueryMap(data: BazelQueryResult): BazelQueryCompact {
  return {
    action: "query",
    success: data.success,
    count: data.count,
    results: data.results,
    exitCode: data.exitCode,
  };
}

export function formatBazelQueryCompact(data: BazelQueryCompact): string {
  if (data.count === 0) return "bazel query: no results.";
  return `bazel query: ${data.count} results`;
}

// ── Info ─────────────────────────────────────────────────────────────

export function formatBazelInfo(data: BazelInfoResult): string {
  const entries = Object.entries(data.info);
  if (entries.length === 0) return "bazel info: no data.";
  const lines = [`bazel info:`];
  for (const [key, value] of entries) {
    lines.push(`  ${key}: ${value}`);
  }
  return lines.join("\n");
}

export interface BazelInfoCompact {
  [key: string]: unknown;
  action: "info";
  success: boolean;
  info: Record<string, string>;
  exitCode: number;
}

export function compactBazelInfoMap(data: BazelInfoResult): BazelInfoCompact {
  return {
    action: "info",
    success: data.success,
    info: data.info,
    exitCode: data.exitCode,
  };
}

export function formatBazelInfoCompact(data: BazelInfoCompact): string {
  const count = Object.keys(data.info).length;
  if (count === 0) return "bazel info: no data.";
  if (count === 1) {
    const [key, value] = Object.entries(data.info)[0];
    return `bazel info: ${key}=${value}`;
  }
  return `bazel info: ${count} keys`;
}

// ── Run ──────────────────────────────────────────────────────────────

export function formatBazelRun(data: BazelRunResult): string {
  const status = data.success ? "success" : "failed";
  const lines = [`bazel run ${data.target}: ${status} (exit code ${data.exitCode})`];
  if (data.stdout) lines.push(`stdout:\n${data.stdout}`);
  if (data.stderr) lines.push(`stderr:\n${data.stderr}`);
  return lines.join("\n");
}

export interface BazelRunCompact {
  [key: string]: unknown;
  action: "run";
  success: boolean;
  target: string;
  exitCode: number;
}

export function compactBazelRunMap(data: BazelRunResult): BazelRunCompact {
  return {
    action: "run",
    success: data.success,
    target: data.target,
    exitCode: data.exitCode,
  };
}

export function formatBazelRunCompact(data: BazelRunCompact): string {
  const status = data.success ? "success" : "failed";
  return `bazel run ${data.target}: ${status} (exit code ${data.exitCode})`;
}

// ── Clean ────────────────────────────────────────────────────────────

export function formatBazelClean(data: BazelCleanResult): string {
  const status = data.success ? "success" : "failed";
  const expunged = data.expunged ? " (expunged)" : "";
  return `bazel clean: ${status}${expunged}`;
}

export interface BazelCleanCompact {
  [key: string]: unknown;
  action: "clean";
  success: boolean;
  expunged: boolean;
  exitCode: number;
}

export function compactBazelCleanMap(data: BazelCleanResult): BazelCleanCompact {
  return {
    action: "clean",
    success: data.success,
    expunged: data.expunged,
    exitCode: data.exitCode,
  };
}

export function formatBazelCleanCompact(data: BazelCleanCompact): string {
  const status = data.success ? "success" : "failed";
  const expunged = data.expunged ? " (expunged)" : "";
  return `bazel clean: ${status}${expunged}`;
}

// ── Fetch ────────────────────────────────────────────────────────────

export function formatBazelFetch(data: BazelFetchResult): string {
  return data.success ? "bazel fetch: success" : `bazel fetch: failed (exit code ${data.exitCode})`;
}

export interface BazelFetchCompact {
  [key: string]: unknown;
  action: "fetch";
  success: boolean;
  exitCode: number;
}

export function compactBazelFetchMap(data: BazelFetchResult): BazelFetchCompact {
  return {
    action: "fetch",
    success: data.success,
    exitCode: data.exitCode,
  };
}

export function formatBazelFetchCompact(data: BazelFetchCompact): string {
  return data.success ? "bazel fetch: success" : `bazel fetch: failed (exit code ${data.exitCode})`;
}

// ── Dispatch formatters ──────────────────────────────────────────────

type CompactResult =
  | BazelBuildCompact
  | BazelTestCompact
  | BazelQueryCompact
  | BazelInfoCompact
  | BazelRunCompact
  | BazelCleanCompact
  | BazelFetchCompact;

export function formatBazelResult(data: BazelResult): string {
  switch (data.action) {
    case "build":
      return formatBazelBuild(data);
    case "test":
      return formatBazelTest(data);
    case "query":
      return formatBazelQuery(data);
    case "info":
      return formatBazelInfo(data);
    case "run":
      return formatBazelRun(data);
    case "clean":
      return formatBazelClean(data);
    case "fetch":
      return formatBazelFetch(data);
  }
}

export function compactBazelResultMap(data: BazelResult): CompactResult {
  switch (data.action) {
    case "build":
      return compactBazelBuildMap(data);
    case "test":
      return compactBazelTestMap(data);
    case "query":
      return compactBazelQueryMap(data);
    case "info":
      return compactBazelInfoMap(data);
    case "run":
      return compactBazelRunMap(data);
    case "clean":
      return compactBazelCleanMap(data);
    case "fetch":
      return compactBazelFetchMap(data);
  }
}

export function formatBazelResultCompact(data: CompactResult): string {
  switch (data.action) {
    case "build":
      return formatBazelBuildCompact(data as BazelBuildCompact);
    case "test":
      return formatBazelTestCompact(data as BazelTestCompact);
    case "query":
      return formatBazelQueryCompact(data as BazelQueryCompact);
    case "info":
      return formatBazelInfoCompact(data as BazelInfoCompact);
    case "run":
      return formatBazelRunCompact(data as BazelRunCompact);
    case "clean":
      return formatBazelCleanCompact(data as BazelCleanCompact);
    case "fetch":
      return formatBazelFetchCompact(data as BazelFetchCompact);
  }
}
