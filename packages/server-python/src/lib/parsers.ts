import type {
  PipInstall,
  MypyResult,
  MypyDiagnosticSchema,
  RuffResult,
  PipAuditResult,
  PytestResult,
  UvInstall,
  UvRun,
  BlackResult,
  PipList,
  PipShow,
  RuffFormatResult,
  CondaList,
  CondaInfo,
  CondaEnvList,
  PyenvResult,
} from "../schemas/index.js";
import { z } from "zod";

type MypyDiagnostic = z.infer<typeof MypyDiagnosticSchema>;

/** Parses `pip install` output into structured data with installed packages and satisfaction status. */
export function parsePipInstall(stdout: string, stderr: string, exitCode: number): PipInstall {
  const output = stdout + "\n" + stderr;
  const alreadySatisfied = output.includes("already satisfied");

  const installed: { name: string; version: string }[] = [];
  const installMatch = output.match(/Successfully installed (.+)/);
  if (installMatch) {
    const packages = installMatch[1].trim().split(/\s+/);
    for (const pkg of packages) {
      const lastDash = pkg.lastIndexOf("-");
      if (lastDash > 0) {
        installed.push({
          name: pkg.slice(0, lastDash),
          version: pkg.slice(lastDash + 1),
        });
      }
    }
  }

  return {
    success: exitCode === 0,
    installed,
    alreadySatisfied,
    total: installed.length,
  };
}

const MYPY_RE = /^(.+?):(\d+)(?::(\d+))?: (error|warning|note): (.+?)(?:\s+\[([^\]]+)\])?$/;

/** Parses mypy type-checker output into structured diagnostics with file locations and error codes. */
export function parseMypyOutput(stdout: string, exitCode: number): MypyResult {
  const lines = stdout.split("\n");
  const diagnostics: MypyDiagnostic[] = [];

  for (const line of lines) {
    const match = line.match(MYPY_RE);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        severity: match[4] as "error" | "warning" | "note",
        message: match[5],
        code: match[6] || undefined,
      });
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter(
    (d) => d.severity === "warning" || d.severity === "note",
  ).length;

  return {
    success: exitCode === 0,
    diagnostics,
    total: diagnostics.length,
    errors,
    warnings,
  };
}

/** Parses `ruff check --output-format json` output into structured lint diagnostics with fixability info. */
export function parseRuffJson(stdout: string): RuffResult {
  let entries: RuffJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    return { diagnostics: [], total: 0, fixable: 0 };
  }

  const diagnostics = entries.map((e) => ({
    file: e.filename,
    line: e.location.row,
    column: e.location.column,
    endLine: e.end_location?.row,
    endColumn: e.end_location?.column,
    code: e.code,
    message: e.message,
    fixable: !!e.fix,
  }));

  const fixable = diagnostics.filter((d) => d.fixable).length;

  return { diagnostics, total: diagnostics.length, fixable };
}

interface RuffJsonEntry {
  code: string;
  message: string;
  filename: string;
  location: { row: number; column: number };
  end_location?: { row: number; column: number };
  fix?: unknown;
}

/** Parses `pip-audit --format json` output into structured vulnerability data with fix versions. */
export function parsePipAuditJson(stdout: string): PipAuditResult {
  let data: PipAuditJson;
  try {
    data = JSON.parse(stdout);
  } catch {
    return { vulnerabilities: [], total: 0 };
  }

  const vulnerabilities = (data.dependencies ?? []).flatMap((dep) =>
    (dep.vulns ?? []).map((v) => ({
      name: dep.name,
      version: dep.version,
      id: v.id,
      description: v.description ?? "",
      fixVersions: v.fix_versions ?? [],
    })),
  );

  return { vulnerabilities, total: vulnerabilities.length };
}

interface PipAuditJson {
  dependencies?: {
    name: string;
    version: string;
    vulns?: {
      id: string;
      description?: string;
      fix_versions?: string[];
    }[];
  }[];
}

const PYTEST_DURATION_RE = /in ([\d.]+)s/;

function extractCount(line: string, label: RegExp): number {
  const m = line.match(label);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parses pytest output into structured test results with pass/fail/error/skip counts and failure details. */
export function parsePytestOutput(stdout: string, stderr: string, exitCode: number): PytestResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  // Find the summary line (e.g., "=== 3 passed, 1 failed in 0.52s ===")
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;
  let duration = 0;

  for (const line of lines) {
    // Match lines containing pytest summary markers (== ... in Xs ==) or standalone counts
    if (/\d+ (?:passed|failed|error|skipped)/.test(line) || /in [\d.]+s/.test(line)) {
      passed = Math.max(passed, extractCount(line, /(\d+) passed/));
      failed = Math.max(failed, extractCount(line, /(\d+) failed/));
      errors = Math.max(errors, extractCount(line, /(\d+) errors?/));
      skipped = Math.max(skipped, extractCount(line, /(\d+) skipped/));

      const durationMatch = line.match(PYTEST_DURATION_RE);
      if (durationMatch) {
        duration = parseFloat(durationMatch[1]);
      }
    }
  }

  // Check for "no tests ran" case
  const noTests = output.includes("no tests ran");
  if (noTests && passed === 0 && failed === 0 && errors === 0) {
    return {
      success: exitCode === 0 || exitCode === 5,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      total: 0,
      duration,
      failures: [],
    };
  }

  // Parse failure blocks from short traceback
  const failures: { test: string; message: string }[] = [];
  const failureBlockRe = /_{3,}\s+(.+?)\s+_{3,}/g;
  let failMatch: RegExpExecArray | null;
  while ((failMatch = failureBlockRe.exec(output)) !== null) {
    const testName = failMatch[1].trim();
    const startIdx = failMatch.index + failMatch[0].length;

    // Find the end of this failure block (next FAILED marker, next separator, or end)
    const remaining = output.slice(startIdx);
    const endMatch = remaining.match(/(?:_{3,}|={3,})/);
    const block = endMatch ? remaining.slice(0, endMatch.index) : remaining;

    // Extract the most relevant error line
    const blockLines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let message = "";

    // Look for assertion errors, E lines, or the last meaningful line
    for (const bLine of blockLines) {
      if (bLine.startsWith("E ")) {
        message = message ? message + "\n" + bLine.slice(2).trim() : bLine.slice(2).trim();
      }
    }
    if (!message && blockLines.length > 0) {
      message = blockLines[blockLines.length - 1];
    }

    failures.push({ test: testName, message });
  }

  const total = passed + failed + errors + skipped;

  return {
    success: exitCode === 0,
    passed,
    failed,
    errors,
    skipped,
    total,
    duration,
    failures,
  };
}

// Matches uv install output lines like: " + package==version" or "Installed N packages in Ns"
const UV_INSTALLED_PKG_RE = /^\s*\+\s+(\S+)==(\S+)/;
const UV_SUMMARY_RE = /Installed (\d+) packages? in ([\d.]+)/;

/** Parses uv pip install output into structured data with installed packages. */
export function parseUvInstall(stdout: string, stderr: string, exitCode: number): UvInstall {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const installed: { name: string; version: string }[] = [];
  let duration = 0;

  for (const line of lines) {
    const pkgMatch = line.match(UV_INSTALLED_PKG_RE);
    if (pkgMatch) {
      installed.push({ name: pkgMatch[1], version: pkgMatch[2] });
    }
    const summaryMatch = line.match(UV_SUMMARY_RE);
    if (summaryMatch) {
      duration = parseFloat(summaryMatch[2]);
    }
  }

  return {
    success: exitCode === 0,
    installed,
    total: installed.length,
    duration,
  };
}

/** Parses uv run output into structured result with exit code, stdout, stderr. */
export function parseUvRun(
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
): UvRun {
  return {
    exitCode,
    stdout,
    stderr,
    success: exitCode === 0,
    duration: Math.round(durationMs) / 1000,
  };
}

const BLACK_REFORMAT_RE = /^would reformat (.+)$/;
const BLACK_REFORMATTED_RE = /^reformatted (.+)$/;
const BLACK_SUMMARY_RE =
  /(\d+) files? (?:would be )?reformatted(?:,\s*(\d+) files? (?:would be )?left unchanged)?|(\d+) files? (?:would be )?left unchanged/;

/** Parses Black code formatter output into structured result with file counts. */
export function parseBlackOutput(stdout: string, stderr: string, exitCode: number): BlackResult {
  // Black writes most output to stderr
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const wouldReformat: string[] = [];
  let filesChanged = 0;
  let filesUnchanged = 0;

  for (const line of lines) {
    const wouldMatch = line.match(BLACK_REFORMAT_RE);
    if (wouldMatch) {
      wouldReformat.push(wouldMatch[1].trim());
    }
    const reformattedMatch = line.match(BLACK_REFORMATTED_RE);
    if (reformattedMatch) {
      wouldReformat.push(reformattedMatch[1].trim());
    }
  }

  // Parse summary line
  for (const line of lines) {
    const summaryMatch = line.match(BLACK_SUMMARY_RE);
    if (summaryMatch) {
      if (summaryMatch[1]) {
        filesChanged = parseInt(summaryMatch[1], 10);
        filesUnchanged = summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
      } else if (summaryMatch[3]) {
        filesChanged = 0;
        filesUnchanged = parseInt(summaryMatch[3], 10);
      }
    }
  }

  // If we found "would reformat" lines but no summary, use those counts
  if (filesChanged === 0 && wouldReformat.length > 0) {
    filesChanged = wouldReformat.length;
  }

  const filesChecked = filesChanged + filesUnchanged;

  // In check mode, success means no files need reformatting
  // In format mode, success is always true (exitCode 0) unless black errors
  // exitCode 1 in check mode = files would be reformatted
  // exitCode 123 = internal error
  const success = exitCode === 0;

  return {
    filesChanged,
    filesUnchanged,
    filesChecked,
    success,
    wouldReformat,
  };
}

/** Parses `pip list --format json` output into structured package list. */
export function parsePipListJson(stdout: string): PipList {
  let entries: { name: string; version: string }[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    return { packages: [], total: 0 };
  }

  if (!Array.isArray(entries)) {
    return { packages: [], total: 0 };
  }

  const packages = entries.map((e) => ({
    name: e.name,
    version: e.version,
  }));

  return { packages, total: packages.length };
}

/** Parses `pip show <package>` key-value output into structured package metadata. */
export function parsePipShowOutput(stdout: string): PipShow {
  const lines = stdout.split("\n");
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(": ");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 2).trim();
      data[key] = value;
    }
  }

  const requires =
    data["Requires"] && data["Requires"].trim()
      ? data["Requires"].split(",").map((r) => r.trim())
      : [];

  return {
    name: data["Name"] || "",
    version: data["Version"] || "",
    summary: data["Summary"] || "",
    homepage: data["Home-page"] || undefined,
    author: data["Author"] || undefined,
    license: data["License"] || undefined,
    location: data["Location"] || undefined,
    requires,
  };
}

/** Parses `pyenv` command output into structured version management data. */
export function parsePyenvOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  action: "versions" | "version" | "install" | "local" | "global",
): PyenvResult {
  const output = stdout + "\n" + stderr;

  if (exitCode !== 0) {
    const errorMsg = stderr.trim() || stdout.trim() || "pyenv command failed";
    return { action, success: false, error: errorMsg };
  }

  switch (action) {
    case "versions": {
      const versions: string[] = [];
      let current: string | undefined;
      for (const line of stdout.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Lines starting with * indicate current version
        if (trimmed.startsWith("*")) {
          const ver = trimmed
            .replace(/^\*\s*/, "")
            .replace(/\s+\(.*\)$/, "")
            .trim();
          if (ver) {
            versions.push(ver);
            current = ver;
          }
        } else {
          const ver = trimmed.replace(/\s+\(.*\)$/, "").trim();
          if (ver) versions.push(ver);
        }
      }
      return { action, success: true, versions, current };
    }
    case "version": {
      const ver = stdout
        .trim()
        .replace(/\s+\(.*\)$/, "")
        .trim();
      return { action, success: true, current: ver || undefined };
    }
    case "install": {
      // pyenv install outputs to stderr typically
      const installed =
        output.match(/Installed Python-(\S+)/)?.[1] || output.match(/Installing Python-(\S+)/)?.[1];
      return {
        action,
        success: true,
        installed: installed || undefined,
      };
    }
    case "local": {
      return { action, success: true, localVersion: stdout.trim() || undefined };
    }
    case "global": {
      return { action, success: true, globalVersion: stdout.trim() || undefined };
    }
  }
}

const RUFF_FORMAT_FILE_RE = /^(?:Would reformat|reformatted): (.+)$/;

/** Parses `ruff format` output into structured result with file counts. */
export function parseRuffFormatOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): RuffFormatResult {
  // ruff format writes file-level output to stderr
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");

  const files: string[] = [];

  for (const line of lines) {
    const match = line.match(RUFF_FORMAT_FILE_RE);
    if (match) {
      files.push(match[1].trim());
    }
  }

  // Parse summary line: "N files reformatted" or "N files would be reformatted" or "N files left unchanged"
  const reformattedMatch = output.match(/(\d+) files? (?:would be )?reformatted/);
  const filesChanged = reformattedMatch ? parseInt(reformattedMatch[1], 10) : files.length;

  return {
    success: exitCode === 0,
    filesChanged: filesChanged || files.length,
    files: files.length > 0 ? files : undefined,
  };
}

// ── conda parsers ────────────────────────────────────────────────────

interface CondaListJsonEntry {
  name: string;
  version: string;
  channel: string;
  build_string?: string;
}

/** Parses `conda list --json` output into structured package list. */
export function parseCondaListJson(stdout: string, envName?: string): CondaList {
  let entries: CondaListJsonEntry[];
  try {
    entries = JSON.parse(stdout);
  } catch {
    return { action: "list", packages: [], total: 0, environment: envName };
  }

  if (!Array.isArray(entries)) {
    return { action: "list", packages: [], total: 0, environment: envName };
  }

  const packages = entries.map((e) => ({
    name: e.name,
    version: e.version,
    channel: e.channel,
    buildString: e.build_string || undefined,
  }));

  return { action: "list", packages, total: packages.length, environment: envName };
}

interface CondaInfoJson {
  conda_version?: string;
  platform?: string;
  python_version?: string;
  default_prefix?: string;
  active_prefix?: string;
  active_prefix_name?: string;
  channels?: string[];
  envs_dirs?: string[];
  pkgs_dirs?: string[];
}

/** Parses `conda info --json` output into structured conda metadata. */
export function parseCondaInfoJson(stdout: string): CondaInfo {
  let data: CondaInfoJson;
  try {
    data = JSON.parse(stdout);
  } catch {
    return {
      action: "info",
      condaVersion: "",
      platform: "",
      pythonVersion: "",
      defaultPrefix: "",
      channels: [],
      envsDirs: [],
      pkgsDirs: [],
    };
  }

  return {
    action: "info",
    condaVersion: data.conda_version ?? "",
    platform: data.platform ?? "",
    pythonVersion: data.python_version ?? "",
    defaultPrefix: data.default_prefix ?? "",
    activePrefix: data.active_prefix || undefined,
    channels: data.channels ?? [],
    envsDirs: data.envs_dirs ?? [],
    pkgsDirs: data.pkgs_dirs ?? [],
  };
}

interface CondaEnvListJson {
  envs?: string[];
}

/** Parses `conda env list --json` output into structured environment list. */
export function parseCondaEnvListJson(stdout: string, activePrefix?: string): CondaEnvList {
  let data: CondaEnvListJson;
  try {
    data = JSON.parse(stdout);
  } catch {
    return { action: "env-list", environments: [], total: 0 };
  }

  const envs = (data.envs ?? []).map((envPath) => {
    // Extract name from the last path segment, or "base" for the root env
    const segments = envPath.replace(/\\/g, "/").split("/");
    const name = segments[segments.length - 1] || "base";
    return {
      name,
      path: envPath,
      active: activePrefix ? envPath === activePrefix : false,
    };
  });

  return { action: "env-list", environments: envs, total: envs.length };
}
