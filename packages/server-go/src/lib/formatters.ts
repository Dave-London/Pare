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
} from "../schemas/index.js";

/** Formats structured go build results into a human-readable error summary. */
export function formatGoBuild(data: GoBuildResult): string {
  if (data.success) return "go build: success.";

  const lines = [`go build: ${data.total} errors`];
  for (const e of data.errors ?? []) {
    const col = e.column ? `:${e.column}` : "";
    lines.push(`  ${e.file}:${e.line}${col}: ${e.message}`);
  }
  for (const raw of data.rawErrors ?? []) {
    lines.push(`  ${raw}`);
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
    if (t.output) {
      for (const outputLine of t.output.split("\n")) {
        lines.push(`       ${outputLine}`);
      }
    }
  }
  if (data.packageFailures && data.packageFailures.length > 0) {
    lines.push("");
    lines.push("Package failures:");
    for (const pf of data.packageFailures) {
      lines.push(`  FAIL ${pf.package}`);
      if (pf.output) {
        for (const outputLine of pf.output.split("\n")) {
          lines.push(`       ${outputLine}`);
        }
      }
    }
  }
  return lines.join("\n");
}

/** Formats structured go vet results into a human-readable diagnostic listing. */
export function formatGoVet(data: GoVetResult): string {
  if (data.total === 0) return "go vet: no issues found.";

  const lines = [`go vet: ${data.total} issues`];
  for (const d of data.diagnostics ?? []) {
    const col = d.column ? `:${d.column}` : "";
    const analyzer = d.analyzer ? ` (${d.analyzer})` : "";
    lines.push(`  ${d.file}:${d.line}${col}: ${d.message}${analyzer}`);
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
  if (data.stdout) {
    if (data.stdoutTruncated) {
      lines.push(data.stdout + "\n[stdout truncated]");
    } else {
      lines.push(data.stdout);
    }
  }
  if (data.stderr) {
    if (data.stderrTruncated) {
      lines.push(data.stderr + "\n[stderr truncated]");
    } else {
      lines.push(data.stderr);
    }
  }
  return lines.join("\n");
}

/** Formats structured go mod tidy results into a human-readable summary. */
export function formatGoModTidy(data: GoModTidyResult): string {
  if (data.success) {
    const changesNote =
      data.madeChanges === true
        ? " (changes made)"
        : data.madeChanges === false
          ? " (already tidy)"
          : "";
    return `go mod tidy: ${data.summary}${changesNote}`;
  }
  return `go mod tidy: FAIL\n  ${data.summary}`;
}

/** Formats structured gofmt results into a human-readable file listing. */
export function formatGoFmt(data: GoFmtResult): string {
  const lines: string[] = [];

  if (data.success && data.filesChanged === 0 && !data.parseErrors?.length) {
    return "gofmt: all files formatted.";
  }

  if (data.filesChanged > 0) {
    lines.push(`gofmt: ${data.filesChanged} files`);
    for (const f of data.files ?? []) {
      lines.push(`  ${f}`);
    }
  }

  if (data.parseErrors && data.parseErrors.length > 0) {
    if (lines.length === 0) {
      lines.push(`gofmt: ${data.parseErrors.length} parse errors`);
    }
    for (const pe of data.parseErrors) {
      const col = pe.column ? `:${pe.column}` : "";
      lines.push(`  ${pe.file}:${pe.line}${col}: ${pe.message}`);
    }
  }

  if (lines.length === 0) {
    return "gofmt: all files formatted.";
  }

  return lines.join("\n");
}

/** Formats structured go generate results into a human-readable summary. */
export function formatGoGenerate(data: GoGenerateResult): string {
  const lines: string[] = [];

  if (data.success) {
    lines.push("go generate: success.");
  } else {
    lines.push("go generate: FAIL");
  }

  if (data.directives && data.directives.length > 0) {
    for (const d of data.directives) {
      const lineNum = d.line ? `:${d.line}` : "";
      const status = d.status ? ` [${d.status}]` : "";
      lines.push(`  ${d.file}${lineNum}: ${d.command}${status}`);
    }
  } else if (data.output) {
    lines.push(data.output);
  }

  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Compact build: success + count, with errors preserved when non-empty. */
export interface GoBuildCompact {
  [key: string]: unknown;
  success: boolean;
  errors?: GoBuildResult["errors"];
  rawErrors?: string[];
  total: number;
}

export function compactBuildMap(data: GoBuildResult): GoBuildCompact {
  const compact: GoBuildCompact = {
    success: data.success,
    total: data.total,
  };
  if (data.errors?.length) compact.errors = data.errors;
  if (data.rawErrors?.length) compact.rawErrors = data.rawErrors;
  return compact;
}

export function formatBuildCompact(data: GoBuildCompact): string {
  if (data.success) return "go build: success.";
  return `go build: ${data.total} errors`;
}

/** Compact test: total, passed, failed, skipped. Drop individual test details but keep package failures. */
export interface GoTestCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  packageFailures?: GoTestResult["packageFailures"];
}

export function compactTestMap(data: GoTestResult): GoTestCompact {
  const compact: GoTestCompact = {
    success: data.success,
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
  };
  if (data.packageFailures?.length) compact.packageFailures = data.packageFailures;
  return compact;
}

export function formatTestCompact(data: GoTestCompact): string {
  const status = data.success ? "ok" : "FAIL";
  return `${status}: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped`;
}

/** Compact vet: success + diagnostic count only. Drop individual file/line/message entries. */
export interface GoVetCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactVetMap(data: GoVetResult): GoVetCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatVetCompact(data: GoVetCompact): string {
  if (data.total === 0) return "go vet: no issues found.";
  return `go vet: ${data.total} issues`;
}

/** Compact fmt: success, file count. Drop individual file list and parse errors. */
export interface GoFmtCompact {
  [key: string]: unknown;
  success: boolean;
  filesChanged: number;
  parseErrorCount?: number;
}

export function compactFmtMap(data: GoFmtResult): GoFmtCompact {
  const compact: GoFmtCompact = {
    success: data.success,
    filesChanged: data.filesChanged,
  };
  if (data.parseErrors?.length) compact.parseErrorCount = data.parseErrors.length;
  return compact;
}

export function formatFmtCompact(data: GoFmtCompact): string {
  if (data.success && data.filesChanged === 0) return "gofmt: all files formatted.";
  const parts = [`gofmt: ${data.filesChanged} files`];
  if (data.parseErrorCount) parts.push(`${data.parseErrorCount} parse errors`);
  return parts.join(", ");
}

/** Compact run: exitCode, success, truncation flags. Drop stdout/stderr. */
export interface GoRunCompact {
  [key: string]: unknown;
  exitCode: number;
  success: boolean;
  stdoutTruncated?: boolean;
  stderrTruncated?: boolean;
}

export function compactRunMap(data: GoRunResult): GoRunCompact {
  const compact: GoRunCompact = {
    exitCode: data.exitCode,
    success: data.success,
  };
  if (data.stdoutTruncated) compact.stdoutTruncated = true;
  if (data.stderrTruncated) compact.stderrTruncated = true;
  return compact;
}

export function formatRunCompact(data: GoRunCompact): string {
  if (data.success) return "go run: success.";
  return `go run: exit code ${data.exitCode}.`;
}

/** Compact generate: success. Output included when non-empty. */
export interface GoGenerateCompact {
  [key: string]: unknown;
  success: boolean;
  output?: string;
  directiveCount?: number;
}

export function compactGenerateMap(data: GoGenerateResult): GoGenerateCompact {
  const compact: GoGenerateCompact = {
    success: data.success,
  };
  if (data.output) compact.output = data.output;
  if (data.directives?.length) compact.directiveCount = data.directives.length;
  return compact;
}

export function formatGenerateCompact(data: GoGenerateCompact): string {
  if (data.success) return "go generate: success.";
  return "go generate: FAIL";
}

/** Compact mod-tidy: success. Summary included when non-empty. */
export interface GoModTidyCompact {
  [key: string]: unknown;
  success: boolean;
  summary?: string;
  madeChanges?: boolean;
}

export function compactModTidyMap(data: GoModTidyResult): GoModTidyCompact {
  const compact: GoModTidyCompact = {
    success: data.success,
  };
  if (data.summary) compact.summary = data.summary;
  if (data.madeChanges !== undefined) compact.madeChanges = data.madeChanges;
  return compact;
}

export function formatModTidyCompact(data: GoModTidyCompact): string {
  if (data.success) {
    if (data.madeChanges === true) return "go mod tidy: success (changes made).";
    if (data.madeChanges === false) return "go mod tidy: success (already tidy).";
    return "go mod tidy: success.";
  }
  return "go mod tidy: FAIL";
}

// ── env ──────────────────────────────────────────────────────────────

/** Formats structured go env results into a human-readable environment listing. */
export function formatGoEnv(data: GoEnvResult): string {
  if (!data.success) return "go env: FAIL — could not parse environment output.";

  const lines = [
    `GOROOT=${data.goroot}`,
    `GOPATH=${data.gopath}`,
    `GOVERSION=${data.goversion}`,
    `GOOS=${data.goos}`,
    `GOARCH=${data.goarch}`,
  ];
  const vars = data.vars ?? {};
  const otherKeys = Object.keys(vars).filter(
    (k) => !["GOROOT", "GOPATH", "GOVERSION", "GOOS", "GOARCH"].includes(k),
  );
  for (const k of otherKeys) {
    lines.push(`${k}=${vars[k]}`);
  }
  return lines.join("\n");
}

/** Compact env: key fields only, plus any queried vars. Drop full vars map. */
export interface GoEnvCompact {
  [key: string]: unknown;
  success: boolean;
  goroot: string;
  gopath: string;
  goversion: string;
  goos: string;
  goarch: string;
}

/**
 * Compact env mapper. When queriedVars are specified, the compact output includes
 * those queried variables in addition to the default key fields (Gap #150).
 */
export function compactEnvMap(data: GoEnvResult, queriedVars?: string[]): GoEnvCompact {
  const compact: GoEnvCompact = {
    success: data.success,
    goroot: data.goroot,
    gopath: data.gopath,
    goversion: data.goversion,
    goos: data.goos,
    goarch: data.goarch,
  };

  // Include queried variables in compact mode (Gap #150)
  if (queriedVars && queriedVars.length > 0 && data.vars) {
    for (const v of queriedVars) {
      if (
        data.vars[v] !== undefined &&
        !["GOROOT", "GOPATH", "GOVERSION", "GOOS", "GOARCH"].includes(v)
      ) {
        compact[v] = data.vars[v];
      }
    }
  }

  return compact;
}

export function formatEnvCompact(data: GoEnvCompact): string {
  if (!data.success) return "go env: FAIL";
  return `go env: ${data.goversion} ${data.goos}/${data.goarch}`;
}

// ── list ─────────────────────────────────────────────────────────────

/** Formats structured go list results into a human-readable listing. */
export function formatGoList(data: GoListResult): string {
  // Module mode
  if (data.modules && data.modules.length > 0) {
    const lines = [`go list: ${data.total} modules`];
    for (const mod of data.modules) {
      const version = mod.version ? `@${mod.version}` : "";
      const flags: string[] = [];
      if (mod.main) flags.push("main");
      if (mod.indirect) flags.push("indirect");
      const suffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
      lines.push(`  ${mod.path}${version}${suffix}`);
    }
    return lines.join("\n");
  }

  // Package mode
  if (data.total === 0) return "go list: no packages found.";

  const lines = [`go list: ${data.total} packages`];
  for (const pkg of data.packages ?? []) {
    const importsCount = pkg.imports?.length ?? 0;
    const importsSuffix = importsCount > 0 ? ` [${importsCount} imports]` : "";
    const errorSuffix = pkg.error ? ` ERROR: ${pkg.error.err}` : "";
    lines.push(`  ${pkg.importPath} (${pkg.name})${importsSuffix}${errorSuffix}`);
  }
  return lines.join("\n");
}

/** Compact list: success + total count only. Drop individual package/module details. */
export interface GoListCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
}

export function compactListMap(data: GoListResult): GoListCompact {
  return {
    success: data.success,
    total: data.total,
  };
}

export function formatListCompact(data: GoListCompact): string {
  if (data.total === 0) return "go list: no packages found.";
  return `go list: ${data.total} packages`;
}

// ── get ──────────────────────────────────────────────────────────────

/** Formats structured go get results into a human-readable summary. */
export function formatGoGet(data: GoGetResult): string {
  if (data.success) {
    const lines = ["go get: success."];
    if (data.resolvedPackages && data.resolvedPackages.length > 0) {
      for (const rp of data.resolvedPackages) {
        if (rp.previousVersion) {
          lines.push(`  ${rp.package} ${rp.previousVersion} => ${rp.newVersion}`);
        } else {
          lines.push(`  ${rp.package} ${rp.newVersion} (added)`);
        }
      }
    } else if (data.output) {
      lines.push(data.output);
    }
    // Show per-package errors if any
    if (data.packages) {
      for (const pkg of data.packages) {
        if (pkg.error) {
          lines.push(`  ${pkg.path}: ${pkg.error}`);
        }
      }
    }
    return lines.join("\n");
  }

  const lines = ["go get: FAIL"];
  if (data.packages) {
    for (const pkg of data.packages) {
      if (pkg.error) {
        lines.push(`  ${pkg.path}: ${pkg.error}`);
      }
    }
  }
  if (data.output && (!data.packages || data.packages.length === 0)) {
    lines.push(data.output);
  }
  return lines.join("\n");
}

/** Compact get: success + resolved package count. Drop individual details. */
export interface GoGetCompact {
  [key: string]: unknown;
  success: boolean;
  resolvedCount: number;
  output?: string;
}

export function compactGetMap(data: GoGetResult): GoGetCompact {
  const compact: GoGetCompact = {
    success: data.success,
    resolvedCount: data.resolvedPackages?.length ?? 0,
  };
  if (!data.resolvedPackages?.length && data.output) compact.output = data.output;
  return compact;
}

export function formatGetCompact(data: GoGetCompact): string {
  if (data.success) {
    if (data.resolvedCount > 0) return `go get: success, ${data.resolvedCount} packages resolved.`;
    return "go get: success.";
  }
  return "go get: FAIL";
}

// ── golangci-lint ────────────────────────────────────────────────────

/** Formats structured golangci-lint results into a human-readable diagnostic listing. */
export function formatGolangciLint(data: GolangciLintResult): string {
  if (data.total === 0) return "golangci-lint: no issues found.";

  const lines = [
    `golangci-lint: ${data.total} issues (${data.errors} errors, ${data.warnings} warnings)`,
  ];

  if (data.resultsTruncated) {
    lines.push("  (results truncated by linter limits)");
  }

  for (const d of data.diagnostics ?? []) {
    const col = d.column ? `:${d.column}` : "";
    const fixNote = d.fix ? " [fix available]" : "";
    lines.push(`  ${d.file}:${d.line}${col}: ${d.message} (${d.linter})${fixNote}`);
  }

  if (data.byLinter && data.byLinter.length > 0) {
    lines.push("");
    lines.push("By linter:");
    for (const entry of data.byLinter) {
      lines.push(`  ${entry.linter}: ${entry.count}`);
    }
  }

  return lines.join("\n");
}

/** Compact golangci-lint: total, errors, warnings. Drop individual diagnostics. */
export interface GolangciLintCompact {
  [key: string]: unknown;
  total: number;
  errors: number;
  warnings: number;
  resultsTruncated?: boolean;
}

export function compactGolangciLintMap(data: GolangciLintResult): GolangciLintCompact {
  const compact: GolangciLintCompact = {
    total: data.total,
    errors: data.errors,
    warnings: data.warnings,
  };
  if (data.resultsTruncated) compact.resultsTruncated = true;
  return compact;
}

export function formatGolangciLintCompact(data: GolangciLintCompact): string {
  if (data.total === 0) return "golangci-lint: no issues found.";
  const truncated = data.resultsTruncated ? " (truncated)" : "";
  return `golangci-lint: ${data.total} issues (${data.errors} errors, ${data.warnings} warnings)${truncated}`;
}
