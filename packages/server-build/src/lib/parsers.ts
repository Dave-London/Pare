import type {
  TscResult,
  TscDiagnostic,
  BuildResult,
  EsbuildResult,
  EsbuildError,
  EsbuildWarning,
  EsbuildMetafile,
  ViteBuildResult,
  ViteOutputFile,
  WebpackResult,
  WebpackProfile,
  WebpackProfileModule,
  TurboResult,
  TurboTask,
  NxResult,
  NxTask,
  LernaResult,
  LernaPackage,
  RollupResult,
  RollupBundle,
  RollupError,
} from "../schemas/index.js";

// tsc output format: file(line,col): error TSxxxx: message
const TSC_DIAGNOSTIC_RE = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/;
const TSC_SUMMARY_RE = /^Found\s+(\d+)\s+errors?\s+in\s+(\d+)\s+files?\./;
const TSC_EMITTED_FILE_RE = /^TSFILE:\s+(.+)$/;

/** Parses TypeScript compiler (`tsc`) output into structured diagnostics with file, line, and error code. */
export function parseTscOutput(stdout: string, stderr: string, exitCode: number): TscResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: TscDiagnostic[] = [];
  const emittedFiles: string[] = [];
  let totalFiles: number | undefined;

  for (const line of lines) {
    const match = line.match(TSC_DIAGNOSTIC_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: parseInt(match[5], 10),
        severity: match[4] as "error" | "warning",
        message: match[6],
      });
      continue;
    }

    const summaryMatch = line.match(TSC_SUMMARY_RE);
    if (summaryMatch) {
      totalFiles = Number.parseInt(summaryMatch[2], 10);
      continue;
    }

    const emittedMatch = line.match(TSC_EMITTED_FILE_RE);
    if (emittedMatch) {
      emittedFiles.push(emittedMatch[1].trim());
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  const success = exitCode === 0;

  const result: TscResult = {
    success,
    diagnostics,
    totalFiles,
    emittedFiles: emittedFiles.length > 0 ? emittedFiles : undefined,
    errors,
    warnings,
  };

  // Invariant: a non-zero exit must never surface as a bare, contextless
  // result. When tsc fails without emitting any parseable diagnostics — a
  // tsconfig error (e.g. TS18003 "No inputs were found"), a crash, or an
  // npx/binary resolution failure — an empty diagnostics list reads as
  // "no errors found". Attach the raw stderr so `success:false` always carries
  // something actionable. (#965)
  if (!success && diagnostics.length === 0) {
    const detail = (stderr.trim() || stdout.trim()).trim();
    result.error = detail || `tsc exited with code ${exitCode} but produced no diagnostics.`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Improved error/warning heuristics (Gap #78)
// ---------------------------------------------------------------------------

/** Patterns that identify an error line in generic build output.
 *  Each pattern is tested against the full line (case-insensitive unless
 *  the regex already specifies flags). */
const BUILD_ERROR_PATTERNS: RegExp[] = [
  // TypeScript: error TS1234
  /\berror\s+TS\d+/i,
  // Webpack: ERROR in ./path
  /^ERROR\s+in\s+/,
  // Generic: Error: message  (capital E, colon after)
  /\bError:\s/,
  // Generic: error: message  (lowercase, colon after — compilers like clang, rustc)
  /\berror:\s/,
  // Failed / FAILED
  /\bFAILED\b/,
  // Build failed
  /\bbuild\s+failed\b/i,
  // Compilation failed
  /\bcompilation\s+failed\b/i,
  // Module not found (webpack/rollup)
  /\bModule\s+not\s+found\b/i,
  // SyntaxError
  /\bSyntaxError\b/,
  // ReferenceError, TypeError (runtime errors surfaced during build)
  /\bReferenceError\b/,
  /\bTypeError\b/,
];

/** Patterns that identify a warning line. */
const BUILD_WARNING_PATTERNS: RegExp[] = [
  // TypeScript: warning TS1234
  /\bwarning\s+TS\d+/i,
  // Webpack: WARNING in ./path
  /^WARNING\s+in\s+/,
  // Generic: Warning: message  (capital W, colon after)
  /\bWarning:\s/,
  // Generic: warning: message  (lowercase, colon after)
  /\bwarning:\s/,
  // WARN prefix (npm, pnpm, vite)
  /\bWARN\b/,
  // Vite/Rollup: (!) prefix for warnings
  /^\(\!\)\s/,
  // Deprecation warnings
  /\bDeprecationWarning\b/,
  /\bdeprecated\b/i,
];

/** Lines that should NOT be classified as errors even though they match error patterns.
 *  For example "0 errors" or "Found 0 errors". */
const BUILD_ERROR_EXCLUDE: RegExp[] = [
  /\b0\s+errors?\b/i,
  /\bno\s+errors?\b/i,
  /\berrors?:\s*0\b/i,
];

/** Lines that should NOT be classified as warnings. */
const BUILD_WARNING_EXCLUDE: RegExp[] = [
  /\b0\s+warnings?\b/i,
  /\bno\s+warnings?\b/i,
  /\bwarnings?:\s*0\b/i,
];

function matchesAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(line));
}

function isErrorLine(line: string): boolean {
  if (!matchesAny(line, BUILD_ERROR_PATTERNS)) return false;
  if (matchesAny(line, BUILD_ERROR_EXCLUDE)) return false;
  return true;
}

function isWarningLine(line: string): boolean {
  if (!matchesAny(line, BUILD_WARNING_PATTERNS)) return false;
  if (matchesAny(line, BUILD_WARNING_EXCLUDE)) return false;
  return true;
}

/** Parses generic build command output into structured results with success status, errors, and warnings. */
export function parseBuildCommandOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): BuildResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n").filter(Boolean);

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (isErrorLine(trimmed)) {
      errors.push(trimmed);
    } else if (isWarningLine(trimmed)) {
      warnings.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    duration,
    errors,
    warnings,
    stdout: stdout || undefined,
    stderr: stderr || undefined,
  };
}

// ---------------------------------------------------------------------------
// esbuild
// ---------------------------------------------------------------------------

// esbuild error/warning format: ✘ [ERROR] message
//   file:line:col:
// or: > file.ts:10:5: error: message
// Simplified: capture "X [ERROR] msg" and "file:line:col:" lines
const ESBUILD_DIAG_HEADER_RE = /^[✘✗X▲]\s+\[(ERROR|WARNING)]\s+(.+)$/;
const ESBUILD_LOCATION_RE = /^\s+(.+?):(\d+):(\d+):$/;
// Alternate format from older esbuild / --log-level output
const ESBUILD_INLINE_RE = /^>\s*(.+?):(\d+):(\d+):\s+(error|warning):\s+(.+)$/;

function isLikelyEsbuildOutputFile(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.includes(" ")) return false;
  if (trimmed.startsWith("✘") || trimmed.startsWith("▲") || trimmed.startsWith(">")) return false;
  if (/^\d+\s+(errors?|warnings?)/i.test(trimmed)) return false;
  // Accept common path patterns and any extension to cover non-standard outputs.
  return /[\\/]/.test(trimmed) || /\.[A-Za-z0-9_-]+$/.test(trimmed);
}

/** Parses esbuild stderr/stdout into structured errors, warnings, and output file info. */
export function parseEsbuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  metafilePath?: string,
  metafileContent?: string,
): EsbuildResult {
  const errors: EsbuildError[] = [];
  const warnings: EsbuildWarning[] = [];
  const outputFiles = new Set<string>();

  const output = stderr + "\n" + stdout;
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for header-style diagnostics: ✘ [ERROR] message
    const headerMatch = line.match(ESBUILD_DIAG_HEADER_RE);
    if (headerMatch) {
      const severity = headerMatch[1]; // ERROR or WARNING
      const message = headerMatch[2].trim();
      let file: string | undefined;
      let lineNum: number | undefined;
      let column: number | undefined;

      // Next line may have location info
      if (i + 1 < lines.length) {
        const locMatch = lines[i + 1].match(ESBUILD_LOCATION_RE);
        if (locMatch) {
          file = locMatch[1];
          lineNum = parseInt(locMatch[2], 10);
          column = parseInt(locMatch[3], 10);
          i++; // Skip location line
        }
      }

      if (severity === "ERROR") {
        errors.push({ file, line: lineNum, column, message });
      } else {
        warnings.push({ file, line: lineNum, message });
      }
      continue;
    }

    // Check for inline-style diagnostics: > file.ts:10:5: error: message
    const inlineMatch = line.match(ESBUILD_INLINE_RE);
    if (inlineMatch) {
      const file = inlineMatch[1];
      const lineNum = parseInt(inlineMatch[2], 10);
      const severity = inlineMatch[4]; // error or warning
      const message = inlineMatch[5].trim();

      if (severity === "error") {
        errors.push({
          file,
          line: lineNum,
          column: parseInt(inlineMatch[3], 10),
          message,
        });
      } else {
        warnings.push({ file, line: lineNum, message });
      }
      continue;
    }
  }

  // Try to detect output files from stdout (esbuild prints nothing on success normally,
  // but with --metafile or verbose mode it may list output files)
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (isLikelyEsbuildOutputFile(trimmed)) {
      outputFiles.add(trimmed);
    }
  }

  // Parse metafile if provided (Gap #80)
  let metafile: EsbuildMetafile | undefined;
  if (metafileContent) {
    metafile = parseEsbuildMetafile(metafileContent);
    if (metafile) {
      for (const file of Object.keys(metafile.outputs)) {
        outputFiles.add(file);
      }
    }
  }

  return {
    success: exitCode === 0,
    errors,
    warnings,
    outputFiles: outputFiles.size > 0 ? [...outputFiles] : undefined,
    duration,
    metafile,
  };
}

/** Parses an esbuild metafile JSON string into a structured metafile object. */
export function parseEsbuildMetafile(content: string): EsbuildMetafile | undefined {
  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const inputs: Record<string, { bytes: number }> = {};
    const outputs: Record<string, { bytes: number }> = {};

    const rawInputs = raw.inputs as Record<string, Record<string, unknown>> | undefined;
    if (rawInputs && typeof rawInputs === "object") {
      for (const [key, val] of Object.entries(rawInputs)) {
        inputs[key] = { bytes: typeof val.bytes === "number" ? val.bytes : 0 };
      }
    }

    const rawOutputs = raw.outputs as Record<string, Record<string, unknown>> | undefined;
    if (rawOutputs && typeof rawOutputs === "object") {
      for (const [key, val] of Object.entries(rawOutputs)) {
        outputs[key] = { bytes: typeof val.bytes === "number" ? val.bytes : 0 };
      }
    }

    return { inputs, outputs };
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// vite-build
// ---------------------------------------------------------------------------

// Vite output format: dist/assets/index-abc123.js  12.34 kB │ gzip: 4.56 kB
// or: dist/index.html                 0.45 kB │ gzip: 0.29 kB
const VITE_OUTPUT_RE =
  /^\s*(.+?)\s{2,}(\d+[\d.]*\s*[kKmMgG]?[bB])(?:\s*[|│]\s*gzip:\s*(\d+[\d.]*\s*[kKmMgG]?[bB]))?/;

/** Advisory (non-fatal) notices emitted by Vite / rolldown-vite that must be
 *  classified as warnings — never errors — and must NEVER flip `success`.
 *  These are surfaced by successful builds (exit 0) and are purely informational.
 *  See #915 (rolldown-vite@8 advisory stderr misreported as a failure). */
const VITE_ADVISORY_PATTERNS: RegExp[] = [
  // rolldown-vite: "[INEFFECTIVE_DYNAMIC_IMPORT] <file> is dynamically imported ..."
  /^\[INEFFECTIVE_DYNAMIC_IMPORT]/,
  // Mixed static/dynamic import notice (may appear with or without the code prefix)
  /dynamically imported by .+ but also statically imported/i,
  // Chunk-size advisory, with or without the leading "(!)" prefix
  /chunks are larger than\s+\d+/i,
];

function isViteAdvisoryLine(line: string): boolean {
  return matchesAny(line, VITE_ADVISORY_PATTERNS);
}

/** Extracts fallback error text from a failed Vite build whose diagnostics did
 *  not match any known error heuristic (e.g. rolldown-vite's error format).
 *  Guarantees a non-empty, actionable `errors[]` so a `success:false` result is
 *  never internally inconsistent. See #915. */
function extractViteFallbackErrors(stderr: string, stdout: string): string[] {
  const source = stderr.trim() ? stderr : stdout;
  const candidates = source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !isViteAdvisoryLine(l) && !isWarningLine(l))
    .filter((l) => !VITE_OUTPUT_RE.test(l));
  if (candidates.length === 0) {
    return ["Vite build failed with a non-zero exit code."];
  }
  return candidates;
}

/** Parses a human-readable size string (e.g. "45.2 kB", "1.5 MB", "320 B") into bytes.
 *  Returns undefined if the string cannot be parsed. */
export function parseSizeToBytes(sizeStr: string): number | undefined {
  const match = sizeStr.trim().match(/^(\d+(?:\.\d+)?)\s*([kKmMgG]?[bB])$/);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "b":
      return Math.round(value);
    case "kb":
      return Math.round(value * 1000);
    case "mb":
      return Math.round(value * 1_000_000);
    case "gb":
      return Math.round(value * 1_000_000_000);
    default:
      return undefined;
  }
}

/** Parses Vite production build output into structured file list with sizes. */
export function parseViteBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): ViteBuildResult {
  // `success` tracks the `vite build` process EXIT CODE only. Advisory stderr
  // (chunk-size notice, ineffective-dynamic-import, etc.) must never flip this.
  const success = exitCode === 0;

  const outputs: ViteOutputFile[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  for (const line of lines) {
    // Parse output file lines
    const outputMatch = line.match(VITE_OUTPUT_RE);
    if (outputMatch) {
      const file = outputMatch[1].trim();
      const size = outputMatch[2].trim();
      const gzipSize = outputMatch[3]?.trim();
      // Skip lines that are clearly not file outputs (e.g. header lines)
      if (file && !file.startsWith("vite") && !file.startsWith("building")) {
        const sizeBytes = parseSizeToBytes(size);
        const gzipBytes = gzipSize ? parseSizeToBytes(gzipSize) : undefined;
        outputs.push({ file, size, sizeBytes, gzipSize, gzipBytes });
        continue;
      }
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Advisory notices and warnings are collected regardless of exit code and
    // are NEVER treated as errors.
    if (isViteAdvisoryLine(trimmed) || isWarningLine(trimmed)) {
      warnings.push(trimmed);
      continue;
    }

    // Only classify error lines on a genuine failure. On a successful build
    // (exit 0) stray "error"-looking text must not surface as an error — the
    // result would otherwise be internally inconsistent (success:true + errors).
    if (!success && isErrorLine(trimmed)) {
      errors.push(trimmed);
    }
  }

  // A failed build must always surface at least one actionable error, even when
  // Vite/rolldown's error text doesn't match our line heuristics. This keeps a
  // `success:false` result from ever being emitted with an empty `errors[]`.
  if (!success && errors.length === 0) {
    errors.push(...extractViteFallbackErrors(stderr, stdout));
  }

  return {
    success,
    duration,
    outputs,
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// webpack
// ---------------------------------------------------------------------------

/** Parses webpack --json output into structured assets, errors, warnings, and module count. */
export function parseWebpackOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  profileEnabled?: boolean,
): WebpackResult {
  // webpack --json outputs a JSON stats object to stdout
  // Try to parse it; fall back to basic error extraction if it fails
  let jsonStats: Record<string, unknown> | undefined;

  try {
    // webpack may prefix output with non-JSON text; find the JSON object
    const jsonStart = stdout.indexOf("{");
    if (jsonStart >= 0) {
      const jsonStr = stdout.slice(jsonStart);
      jsonStats = JSON.parse(jsonStr) as Record<string, unknown>;
    }
  } catch {
    // JSON parsing failed; fall back to text parsing
  }

  if (jsonStats) {
    return parseWebpackJson(jsonStats, exitCode, duration, profileEnabled);
  }

  // Fallback: parse as text output
  return parseWebpackText(stdout, stderr, exitCode, duration);
}

function parseWebpackJson(
  stats: Record<string, unknown>,
  exitCode: number,
  duration: number,
  profileEnabled?: boolean,
): WebpackResult {
  const rawAssets = Array.isArray(stats.assets) ? stats.assets : [];
  const assets = rawAssets.map((a: Record<string, unknown>) => ({
    name: String(a.name ?? ""),
    size: typeof a.size === "number" ? a.size : 0,
  }));

  const rawErrors = Array.isArray(stats.errors) ? stats.errors : [];
  const errors = rawErrors.map((e: unknown) => {
    if (typeof e === "string") return e;
    if (typeof e === "object" && e !== null && "message" in e) {
      return String((e as Record<string, unknown>).message);
    }
    return String(e);
  });

  const rawWarnings = Array.isArray(stats.warnings) ? stats.warnings : [];
  const warnings = rawWarnings.map((w: unknown) => {
    if (typeof w === "string") return w;
    if (typeof w === "object" && w !== null && "message" in w) {
      return String((w as Record<string, unknown>).message);
    }
    return String(w);
  });

  let modules: number | undefined;
  if (typeof stats.modules === "number") {
    modules = stats.modules;
  } else if (Array.isArray(stats.modules)) {
    modules = stats.modules.length;
  }

  const rawChunks = Array.isArray(stats.chunks) ? stats.chunks : [];
  const chunks = rawChunks.map((chunk) => {
    const c = chunk as Record<string, unknown>;
    return {
      id: typeof c.id === "string" || typeof c.id === "number" ? c.id : undefined,
      names: Array.isArray(c.names)
        ? c.names.filter((n): n is string => typeof n === "string")
        : undefined,
      entry: typeof c.entry === "boolean" ? c.entry : undefined,
      files: Array.isArray(c.files)
        ? c.files.filter((f): f is string => typeof f === "string")
        : undefined,
    };
  });

  const errorsCount = typeof stats.errorsCount === "number" ? stats.errorsCount : undefined;

  // Parse profile data from modules when --profile is enabled (Gap #85)
  let profile: WebpackProfile | undefined;
  if (profileEnabled && Array.isArray(stats.modules)) {
    profile = parseWebpackProfile(stats.modules as Record<string, unknown>[]);
  }

  return {
    success:
      exitCode === 0 && errors.length === 0 && (errorsCount === undefined || errorsCount === 0),
    duration,
    assets,
    chunks: chunks.length > 0 ? chunks : undefined,
    errors,
    warnings,
    modules,
    profile,
  };
}

/** Extracts timing data from webpack modules when --profile is enabled. */
export function parseWebpackProfile(
  modules: Record<string, unknown>[],
): WebpackProfile | undefined {
  const profileModules: WebpackProfileModule[] = [];

  for (const mod of modules) {
    const name = typeof mod.name === "string" ? mod.name : String(mod.name ?? "");
    // webpack --profile adds profile.total (or profile.building) to each module
    let time = 0;
    const profileData = mod.profile as Record<string, unknown> | undefined;
    if (profileData && typeof profileData === "object") {
      // webpack profile object has: factory, building, dependencies, etc.
      // The total time is the sum of factory + building + dependencies
      const factory = typeof profileData.factory === "number" ? profileData.factory : 0;
      const building = typeof profileData.building === "number" ? profileData.building : 0;
      const dependencies =
        typeof profileData.dependencies === "number" ? profileData.dependencies : 0;
      time = factory + building + dependencies;
    } else if (typeof mod.time === "number") {
      time = mod.time;
    }

    if (name && time > 0) {
      profileModules.push({ name, time });
    }
  }

  if (profileModules.length === 0) return undefined;
  return { modules: profileModules };
}

function parseWebpackText(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): WebpackResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n").filter(Boolean);

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (isErrorLine(trimmed)) {
      errors.push(trimmed);
    } else if (isWarningLine(trimmed)) {
      warnings.push(trimmed);
    }
  }

  return {
    success: exitCode === 0 && errors.length === 0,
    duration,
    assets: [],
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// turbo
// ---------------------------------------------------------------------------

// Turbo task line format: <package>:<task> (modern turbo 2.x) or <package>#<task> (legacy).
// Modern turbo (2.x) prefixes log lines with "<pkg>:<task>:" and emits the
// status line as part of the same prefix:
//   "@paretools/shared:build: cache hit, replaying logs abc123"
//   "@paretools/shared:build: cache miss, executing abc123"
//   "@paretools/shared:build: cache bypass, force executing abc123"
// Older turbo versions used "#" and frequently appended a "(duration)" suffix:
//   "@scope/pkg#test: cache miss, executing abc123 (2.5s)"
//   "myapp#lint: cache bypass (5.1s)"
// Failure summary lines (still emitted with "#" today):
//   " ERROR  @scope/pkg#build: command (...) ... exited (1)"
//   " Failed:    @scope/pkg#build"
// Summary lines:
//   "Tasks:    5 successful, 5 total"
//   "Cached:   3 cached, 5 total"

// Match per-task status lines. Accepts either ":" or "#" between package and
// task name and treats the trailing "(duration)" as optional, so it works for
// both legacy and modern turbo CLIs.
const TURBO_TASK_RE = /^(.+?)[#:](\S+):\s+cache\s+(hit|miss|bypass)(?:,[^(]*)?(?:\(([^)]+)\))?/;

// Failure lines from the per-task ERROR summary that turbo prints near the end
// of a failed run. Modern turbo emits:
//   " ERROR  @scope/pkg#build: command (...) ... exited (2)"
// and a one-per-line "Failed:" listing:
//   " Failed:    @scope/pkg#build"
const TURBO_ERROR_LINE_RE = /(?:^|\s)ERROR\s+(.+?)#(\S+):.*exited\s*\(\d+\)/;
const TURBO_FAILED_LIST_RE = /^\s*Failed:\s+(.+?)#(\S+)\s*$/;
// Legacy/inline task failure lines:
//   "@scope/pkg#build: command ... exited (1)"
//   "pkg#test: ERROR ... (500ms)"
const TURBO_TASK_FAIL_RE = /^(.+?)#(\S+):.*(?:exited\s*\(\d+\)|ERROR)/;

// Summary lines
const TURBO_TASKS_SUMMARY_RE = /Tasks:\s+(\d+)\s+successful,\s+(\d+)\s+total/;
const TURBO_CACHED_RE = /Cached:\s+(\d+)\s+cached,\s+(\d+)\s+total/;

/** Parses a duration string like "100ms", "2.5s", "1m30s" into milliseconds. */
export function parseDurationToMs(durationStr: string): number | undefined {
  // Try ms format: "100ms", "1234ms"
  const msMatch = durationStr.match(/^(\d+(?:\.\d+)?)\s*ms$/i);
  if (msMatch) return Math.round(parseFloat(msMatch[1]));

  // Try seconds format: "2.5s", "10s"
  const sMatch = durationStr.match(/^(\d+(?:\.\d+)?)\s*s$/i);
  if (sMatch) return Math.round(parseFloat(sMatch[1]) * 1000);

  // Try minutes+seconds: "1m30s"
  const minsMatch = durationStr.match(/^(\d+)m(\d+(?:\.\d+)?)s$/i);
  if (minsMatch) {
    return Math.round(parseInt(minsMatch[1], 10) * 60_000 + parseFloat(minsMatch[2]) * 1000);
  }

  // Try minutes only: "2m"
  const mOnlyMatch = durationStr.match(/^(\d+(?:\.\d+)?)\s*m$/i);
  if (mOnlyMatch) return Math.round(parseFloat(mOnlyMatch[1]) * 60_000);

  return undefined;
}

/** Parses Turborepo `turbo run` output into structured per-package task results with cache info. */
export function parseTurboOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  summaryJsonContent?: string,
): TurboResult {
  const taskMap = new Map<string, TurboTask>();
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  let summaryTotal = 0;
  let summarySuccessful = 0;
  let summaryCached = 0;
  let sawSummaryLine = false;

  const upsertTask = (pkg: string, task: string, patch: Partial<TurboTask>) => {
    const key = `${pkg}#${task}`;
    const existing = taskMap.get(key);
    if (existing) {
      // Failure information takes precedence over a previously-seen success line.
      if (patch.status === "fail") existing.status = "fail";
      if (patch.cache !== undefined && existing.cache === undefined) existing.cache = patch.cache;
      if (patch.duration !== undefined && existing.duration === undefined)
        existing.duration = patch.duration;
      if (patch.durationMs !== undefined && existing.durationMs === undefined)
        existing.durationMs = patch.durationMs;
      return;
    }
    taskMap.set(key, {
      package: pkg,
      task: task,
      status: patch.status ?? "pass",
      duration: patch.duration,
      durationMs: patch.durationMs,
      cache: patch.cache,
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for failure lines first so the ERROR/Failed prefix wins over any
    // earlier "cache bypass" status line for the same task.
    const errorMatch = trimmed.match(TURBO_ERROR_LINE_RE);
    if (errorMatch) {
      upsertTask(errorMatch[1], errorMatch[2], { status: "fail", cache: "miss" });
      continue;
    }

    const failedListMatch = trimmed.match(TURBO_FAILED_LIST_RE);
    if (failedListMatch) {
      upsertTask(failedListMatch[1], failedListMatch[2], { status: "fail", cache: "miss" });
      continue;
    }

    // Per-task status line (covers both legacy "#" and modern ":" separators).
    const taskMatch = trimmed.match(TURBO_TASK_RE);
    if (taskMatch) {
      const durationStr = taskMatch[4];
      const durationMs = durationStr ? parseDurationToMs(durationStr) : undefined;
      upsertTask(taskMatch[1], taskMatch[2], {
        status: "pass",
        duration: durationStr,
        durationMs,
        // Treat both "miss" and "bypass" as a cache miss for accounting.
        cache: taskMatch[3] === "hit" ? "hit" : "miss",
      });
      continue;
    }

    // Inline failure line (legacy turbo format).
    const failMatch = trimmed.match(TURBO_TASK_FAIL_RE);
    if (failMatch) {
      upsertTask(failMatch[1], failMatch[2], { status: "fail", cache: "miss" });
      continue;
    }

    // Summary lines
    const summaryMatch = trimmed.match(TURBO_TASKS_SUMMARY_RE);
    if (summaryMatch) {
      summarySuccessful = parseInt(summaryMatch[1], 10);
      summaryTotal = parseInt(summaryMatch[2], 10);
      sawSummaryLine = true;
      continue;
    }

    const cachedMatch = trimmed.match(TURBO_CACHED_RE);
    if (cachedMatch) {
      summaryCached = parseInt(cachedMatch[1], 10);
    }
  }

  const tasks = Array.from(taskMap.values());

  // Prefer the explicit summary line counts when available — they are the
  // ground truth from turbo and let us preserve the
  // `passed + failed === totalTasks` invariant even if individual per-task
  // status lines couldn't be matched (e.g. log truncation, future format
  // changes).
  let passed = tasks.filter((t) => t.status === "pass").length;
  let failed = tasks.filter((t) => t.status === "fail").length;
  let totalTasks = tasks.length;
  if (sawSummaryLine) {
    totalTasks = summaryTotal;
    passed = summarySuccessful;
    failed = Math.max(0, summaryTotal - summarySuccessful);
  }

  // Cached: prefer the summary "Cached: N cached" line; fall back to counting
  // per-task hits.
  const cachedFromTasks = tasks.filter((t) => t.cache === "hit").length;
  const cached = sawSummaryLine ? summaryCached : cachedFromTasks;

  let summary: Record<string, unknown> | undefined;
  if (summaryJsonContent) {
    try {
      const parsed = JSON.parse(summaryJsonContent);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        summary = parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore invalid summarize JSON content.
    }
  }

  return {
    success: exitCode === 0,
    duration,
    tasks,
    totalTasks,
    passed,
    failed,
    cached,
    summary,
  };
}

// ---------------------------------------------------------------------------
// nx
// ---------------------------------------------------------------------------

// Nx task line format (from `nx run-many` / `nx affected`):
//   ✔  nx run project:target  [local cache]        (1.2s)
//   ✔  nx run project:target                        (3.4s)
//   ✖  nx run project:target                        (0.5s)
//   >  NX   Successfully ran target build for 3 projects (5.2s)
//   >  NX   Ran target build for 5 projects (10.1s)
// Also matches lines without duration or cache indicator.
const NX_TASK_RE =
  /^\s*[✔✓✗✖]\s+nx run\s+([\w@/.:-]+):([\w-]+)\s*(?:\[([^\]]+)])?\s*(?:\((\d+(?:\.\d+)?)\s*s\))?/i;
const NX_SKIPPED_TASK_RE = /^\s*(?:-|•|\*)\s+nx run\s+([\w@/.:-]+):([\w-]+).*skipp(?:ed|ing)/i;
const NX_AFFECTED_PROJECTS_RE = /affected projects?:\s*(.+)$/i;

// Cache hit summary: "N out of N tasks were retrieved from cache"
// or individual [local cache] / [remote cache] on task lines (handled inline)

/** Parses Nx workspace command output into structured per-project task results. */
export function parseNxOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  affectedMode?: boolean,
): NxResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  const tasks: NxTask[] = [];
  const affectedProjects = new Set<string>();

  for (const line of lines) {
    const taskMatch = line.match(NX_TASK_RE);
    if (taskMatch) {
      const project = taskMatch[1];
      const target = taskMatch[2];
      const cacheInfo = taskMatch[3]; // e.g. "local cache", "remote cache"
      const dur = taskMatch[4] ? parseFloat(taskMatch[4]) : undefined;

      // Determine status from the leading character
      const trimmed = line.trimStart();
      const isFailure = trimmed.startsWith("✖") || trimmed.startsWith("✗");
      const status: "success" | "failure" | "skipped" = isFailure ? "failure" : "success";

      // Distinguish local vs remote cache (Gap #81)
      let cache: "local" | "remote" | "miss" | undefined;
      if (cacheInfo) {
        const lower = cacheInfo.toLowerCase();
        if (lower.includes("remote")) {
          cache = "remote";
        } else if (lower.includes("local")) {
          cache = "local";
        } else {
          // Unknown cache type — treat as local
          cache = "local";
        }
      }
      // Tasks without cache info: no cache field (undefined means not cached)

      tasks.push({
        project,
        target,
        status,
        duration: dur,
        cache,
      });
      if (affectedMode) {
        affectedProjects.add(project);
      }
      continue;
    }

    const skippedMatch = line.match(NX_SKIPPED_TASK_RE);
    if (skippedMatch) {
      const project = skippedMatch[1];
      const target = skippedMatch[2];
      tasks.push({
        project,
        target,
        status: "skipped",
        cache: "miss",
      });
      if (affectedMode) {
        affectedProjects.add(project);
      }
      continue;
    }

    const affectedMatch = line.match(NX_AFFECTED_PROJECTS_RE);
    if (affectedMatch) {
      const projects = affectedMatch[1]
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const project of projects) {
        affectedProjects.add(project);
      }
      continue;
    }
  }

  const passed = tasks.filter((t) => t.status === "success").length;
  const failed = tasks.filter((t) => t.status === "failure").length;
  const cached = tasks.filter((t) => t.cache !== undefined).length;

  return {
    success: exitCode === 0,
    duration,
    tasks,
    passed,
    failed,
    cached,
    affectedProjects: affectedProjects.size > 0 ? [...affectedProjects] : undefined,
  };
}

// ---------------------------------------------------------------------------
// lerna
// ---------------------------------------------------------------------------

/** Parses Lerna JSON output (from --json flag) into structured package list. */
export function parseLernaOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  action: "list" | "run" | "changed" | "version",
): LernaResult {
  const packages: LernaPackage[] = [];
  const errors: string[] = [];

  // For list/changed, lerna --json outputs a JSON array
  if (action === "list" || action === "changed") {
    try {
      const jsonStart = stdout.indexOf("[");
      if (jsonStart >= 0) {
        const jsonStr = stdout.slice(jsonStart);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>[];
        for (const pkg of parsed) {
          packages.push({
            name: String(pkg.name ?? ""),
            version: String(pkg.version ?? ""),
            location: typeof pkg.location === "string" ? pkg.location : undefined,
            private: typeof pkg.private === "boolean" ? pkg.private : undefined,
          });
        }
      }
    } catch {
      // JSON parsing failed; fall back to error extraction
    }
  }

  // Collect error lines from stderr
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n").filter(Boolean);
  for (const line of lines) {
    const trimmed = line.trim();
    if (isErrorLine(trimmed)) {
      errors.push(trimmed);
    }
  }

  // For run/version, capture the full output as a string
  const output = action === "run" || action === "version" ? stdout || undefined : undefined;

  return {
    success: exitCode === 0,
    action,
    packages: packages.length > 0 ? packages : undefined,
    output,
    errors: errors.length > 0 ? errors : undefined,
    duration,
  };
}

// ---------------------------------------------------------------------------
// rollup
// ---------------------------------------------------------------------------

// Rollup output format:
//   src/index.js → dist/bundle.js...
//   created dist/bundle.js in 1.2s
// or with format info:
//   src/index.js → dist/bundle.cjs.js, dist/bundle.esm.js...
// Error format:
//   [!] Error: Could not resolve './missing' from src/index.js
//   src/index.js (10:5)
// or:
//   [!] (plugin xyz) Error: message
// Warning format:
//   (!) Unresolved dependencies
//   (!) Missing exports

const ROLLUP_BUNDLE_RE = /^(.+?)\s+→\s+(.+?)\.{3}$/;
const ROLLUP_ERROR_HEADER_RE = /^\[!]\s+(?:\(.+?\)\s+)?(?:Error:\s+)?(.+)$/;
const ROLLUP_ERROR_LOCATION_RE = /^(.+?)\s+\((\d+):(\d+)\)$/;
const ROLLUP_WARNING_RE = /^\(\!\)\s+(.+)$/;

/** Parses Rollup bundler output into structured bundles, errors, and warnings. */
export function parseRollupOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): RollupResult {
  const bundles: RollupBundle[] = [];
  const errors: RollupError[] = [];
  const warnings: string[] = [];

  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match bundle lines: src/index.js → dist/bundle.js...
    const bundleMatch = trimmed.match(ROLLUP_BUNDLE_RE);
    if (bundleMatch) {
      const input = bundleMatch[1].trim();
      const outputParts = bundleMatch[2].split(",").map((p) => p.trim());
      for (const outputFile of outputParts) {
        bundles.push({
          input,
          output: outputFile,
        });
      }
      continue;
    }

    // Match error header: [!] Error: message or [!] (plugin x) Error: message
    const errorMatch = trimmed.match(ROLLUP_ERROR_HEADER_RE);
    if (errorMatch) {
      const message = errorMatch[1].trim();
      let file: string | undefined;
      let lineNum: number | undefined;
      let column: number | undefined;

      // Next line may have location info: file.js (10:5)
      if (i + 1 < lines.length) {
        const locMatch = lines[i + 1].trim().match(ROLLUP_ERROR_LOCATION_RE);
        if (locMatch) {
          file = locMatch[1];
          lineNum = parseInt(locMatch[2], 10);
          column = parseInt(locMatch[3], 10);
          i++; // Skip location line
        }
      }

      errors.push({ file, line: lineNum, column, message });
      continue;
    }

    // Match warning lines: (!) Warning message
    const warnMatch = trimmed.match(ROLLUP_WARNING_RE);
    if (warnMatch) {
      warnings.push(warnMatch[1].trim());
      continue;
    }
  }

  return {
    success: exitCode === 0,
    bundles: bundles.length > 0 ? bundles : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    duration,
  };
}
