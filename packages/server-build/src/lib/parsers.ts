import type {
  TscResult,
  TscDiagnostic,
  BuildResult,
  EsbuildResult,
  EsbuildError,
  EsbuildWarning,
  ViteBuildResult,
  ViteOutputFile,
  WebpackResult,
} from "../schemas/index.js";

// tsc output format: file(line,col): error TSxxxx: message
const TSC_DIAGNOSTIC_RE = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)$/;

/** Parses TypeScript compiler (`tsc`) output into structured diagnostics with file, line, and error code. */
export function parseTscOutput(stdout: string, stderr: string, exitCode: number): TscResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: TscDiagnostic[] = [];

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
    }
  }

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
    const lower = line.toLowerCase();
    if (lower.includes("error") && !lower.includes("0 error")) {
      errors.push(line.trim());
    } else if (lower.includes("warn") && !lower.includes("0 warn")) {
      warnings.push(line.trim());
    }
  }

  return {
    success: exitCode === 0,
    duration,
    errors,
    warnings,
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

/** Parses esbuild stderr/stdout into structured errors, warnings, and output file info. */
export function parseEsbuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): EsbuildResult {
  const errors: EsbuildError[] = [];
  const warnings: EsbuildWarning[] = [];
  const outputFiles: string[] = [];

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
    if (trimmed && /\.(js|mjs|cjs|css|map)$/.test(trimmed) && !trimmed.includes(" ")) {
      outputFiles.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    errors,
    warnings,
    outputFiles: outputFiles.length > 0 ? outputFiles : undefined,
    duration,
  };
}

// ---------------------------------------------------------------------------
// vite-build
// ---------------------------------------------------------------------------

// Vite output format: dist/assets/index-abc123.js  12.34 kB │ gzip: 4.56 kB
// or: dist/index.html                 0.45 kB │ gzip: 0.29 kB
const VITE_OUTPUT_RE = /^\s*(.+?)\s{2,}(\d+[\d.]*\s*[kKmMgG]?[bB])\s/;

/** Parses Vite production build output into structured file list with sizes. */
export function parseViteBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): ViteBuildResult {
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
      // Skip lines that are clearly not file outputs (e.g. header lines)
      if (file && !file.startsWith("vite") && !file.startsWith("building")) {
        outputs.push({ file, size });
        continue;
      }
    }

    // Collect error and warning lines
    const lower = line.toLowerCase();
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (lower.includes("error") && !lower.includes("0 error")) {
      errors.push(trimmed);
    } else if (lower.includes("warn") && !lower.includes("0 warn")) {
      warnings.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
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
    return parseWebpackJson(jsonStats, exitCode, duration);
  }

  // Fallback: parse as text output
  return parseWebpackText(stdout, stderr, exitCode, duration);
}

function parseWebpackJson(
  stats: Record<string, unknown>,
  exitCode: number,
  duration: number,
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

  return {
    success: exitCode === 0 && errors.length === 0,
    duration,
    assets,
    errors,
    warnings,
    modules,
  };
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
    const lower = line.toLowerCase();
    const trimmed = line.trim();
    if (lower.includes("error") && !lower.includes("0 error")) {
      errors.push(trimmed);
    } else if (lower.includes("warn") && !lower.includes("0 warn")) {
      warnings.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    duration,
    assets: [],
    errors,
    warnings,
  };
}
