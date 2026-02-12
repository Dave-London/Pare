import type {
  GoBuildResult,
  GoTestResult,
  GoVetResult,
  GoRunResult,
  GoModTidyResult,
  GoFmtResult,
  GoGenerateResult,
} from "../schemas/index.js";

/** Formats structured go build results into a human-readable error summary. */
export function formatGoBuild(data: GoBuildResult): string {
  if (data.success) return "go build: success.";

  const lines = [`go build: ${data.total} errors`];
  for (const e of data.errors ?? []) {
    const col = e.column ? `:${e.column}` : "";
    lines.push(`  ${e.file}:${e.line}${col}: ${e.message}`);
  }
  return lines.join("\n");
}

/** Formats structured go test results into a human-readable test summary with pass/fail counts. */
export function formatGoTest(data: GoTestResult): string {
  const status = data.success ? "ok" : "FAIL";
  const lines = [
    `${status}: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped`,
  ];
  for (const t of data.tests ?? []) {
    const elapsed = t.elapsed !== undefined ? ` (${t.elapsed}s)` : "";
    lines.push(`  ${t.status.padEnd(4)} ${t.package}/${t.name}${elapsed}`);
  }
  return lines.join("\n");
}

/** Formats structured go vet results into a human-readable diagnostic listing. */
export function formatGoVet(data: GoVetResult): string {
  if (data.total === 0) return "go vet: no issues found.";

  const lines = [`go vet: ${data.total} issues`];
  for (const d of data.diagnostics ?? []) {
    const col = d.column ? `:${d.column}` : "";
    lines.push(`  ${d.file}:${d.line}${col}: ${d.message}`);
  }
  return lines.join("\n");
}

/** Formats structured go run results into a human-readable output summary. */
export function formatGoRun(data: GoRunResult): string {
  const lines: string[] = [];
  if (data.success) {
    lines.push("go run: success.");
  } else {
    lines.push(`go run: exit code ${data.exitCode}.`);
  }
  if (data.stdout) lines.push(data.stdout);
  if (data.stderr) lines.push(data.stderr);
  return lines.join("\n");
}

/** Formats structured go mod tidy results into a human-readable summary. */
export function formatGoModTidy(data: GoModTidyResult): string {
  if (data.success) return `go mod tidy: ${data.summary}`;
  return `go mod tidy: FAIL\n  ${data.summary}`;
}

/** Formats structured gofmt results into a human-readable file listing. */
export function formatGoFmt(data: GoFmtResult): string {
  if (data.success && data.filesChanged === 0) return "gofmt: all files formatted.";

  const lines = [`gofmt: ${data.filesChanged} files`];
  for (const f of data.files ?? []) {
    lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

/** Formats structured go generate results into a human-readable summary. */
export function formatGoGenerate(data: GoGenerateResult): string {
  if (data.success) {
    return data.output ? `go generate: success.\n${data.output}` : "go generate: success.";
  }
  return `go generate: FAIL\n${data.output}`;
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact build: success, error/warning count. Drop full error details. */
export interface GoBuildCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactBuildMap(data: GoBuildResult): GoBuildCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatBuildCompact(data: GoBuildCompact): string {
  if (data.success) return "go build: success.";
  return `go build: ${data.total} errors`;
}

/** Compact test: total, passed, failed, skipped. Drop individual test details. */
export interface GoTestCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export function compactTestMap(data: GoTestResult): GoTestCompact {
  return {
    success: data.success,
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
  };
}

export function formatTestCompact(data: GoTestCompact): string {
  const status = data.success ? "ok" : "FAIL";
  return `${status}: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped`;
}

/** Compact vet: diagnostic count only. Drop individual file/line/message entries. */
export interface GoVetCompact {
  [key: string]: unknown;
  total: number;
}

export function compactVetMap(data: GoVetResult): GoVetCompact {
  return {
    total: data.total,
  };
}

export function formatVetCompact(data: GoVetCompact): string {
  if (data.total === 0) return "go vet: no issues found.";
  return `go vet: ${data.total} issues`;
}

/** Compact fmt: success, file count. Drop individual file list. */
export interface GoFmtCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
}

export function compactFmtMap(data: GoFmtResult): GoFmtCompact {
  return {
    success: data.success,
    filesChanged: data.filesChanged,
  };
}

export function formatFmtCompact(data: GoFmtCompact): string {
  if (data.success && data.filesChanged === 0) return "gofmt: all files formatted.";
  return `gofmt: ${data.filesChanged} files`;
}

/** Compact run: exitCode, success. Drop stdout/stderr. */
export interface GoRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
}

export function compactRunMap(data: GoRunResult): GoRunCompact {
  return {
    exitCode: data.exitCode,
    success: data.success,
  };
}

export function formatRunCompact(data: GoRunCompact): string {
  if (data.success) return "go run: success.";
  return `go run: exit code ${data.exitCode}.`;
}

/** Compact generate: success only. Drop full output. */
export interface GoGenerateCompact {
  [key: string]: unknown;
  success: boolean;
}

export function compactGenerateMap(data: GoGenerateResult): GoGenerateCompact {
  return {
    success: data.success,
  };
}

export function formatGenerateCompact(data: GoGenerateCompact): string {
  if (data.success) return "go generate: success.";
  return "go generate: FAIL";
}

/** Compact mod-tidy: success only. Drop summary text. */
export interface GoModTidyCompact {
  [key: string]: unknown;
  success: boolean;
}

export function compactModTidyMap(data: GoModTidyResult): GoModTidyCompact {
  return {
    success: data.success,
  };
}

export function formatModTidyCompact(data: GoModTidyCompact): string {
  if (data.success) return "go mod tidy: success.";
  return "go mod tidy: FAIL";
}
