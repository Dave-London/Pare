import type {
  DotnetBuildResult,
  DotnetDiagnostic,
  DotnetTestResult,
  DotnetTestCase,
  DotnetRunResult,
  DotnetPublishResult,
  DotnetRestoreResult,
  DotnetCleanResult,
  DotnetAddPackageResult,
  DotnetListPackageResult,
  DotnetProjectPackages,
  DotnetPackageEntry,
} from "../schemas/index.js";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

// MSBuild diagnostic format: path(line,col): error|warning CODE: message
const MSBUILD_DIAG_RE =
  /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+([A-Z]{1,3}\d+):\s+(.+?)(?:\s+\[.+])?$/;

// Simpler format without column: path(line): error|warning CODE: message
const MSBUILD_DIAG_SIMPLE_RE =
  /^(.+?)\((\d+)\):\s+(error|warning)\s+([A-Z]{1,3}\d+):\s+(.+?)(?:\s+\[.+])?$/;

// Build-level errors (no file): error CODE: message
const MSBUILD_BUILD_ERROR_RE = /^\s*(error|warning)\s+([A-Z]{1,3}\d+):\s+(.+?)(?:\s+\[.+])?$/;

/** Parses `dotnet build` output into structured diagnostics. */
export function parseDotnetBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetBuildResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const diagnostics: DotnetDiagnostic[] = [];

  for (const line of lines) {
    const match = line.match(MSBUILD_DIAG_RE);
    if (match) {
      diagnostics.push({
        file: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] as "error" | "warning",
        code: match[5],
        message: match[6].trim(),
      });
      continue;
    }

    const simpleMatch = line.match(MSBUILD_DIAG_SIMPLE_RE);
    if (simpleMatch) {
      diagnostics.push({
        file: simpleMatch[1].trim(),
        line: parseInt(simpleMatch[2], 10),
        severity: simpleMatch[3] as "error" | "warning",
        code: simpleMatch[4],
        message: simpleMatch[5].trim(),
      });
      continue;
    }

    const buildMatch = line.match(MSBUILD_BUILD_ERROR_RE);
    if (buildMatch) {
      diagnostics.push({
        file: "(build)",
        line: 0,
        severity: buildMatch[1] as "error" | "warning",
        code: buildMatch[2],
        message: buildMatch[3].trim(),
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

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

// dotnet test console output patterns:
//   Passed  TestNamespace.TestClass.TestMethod [42 ms]
//   Failed  TestNamespace.TestClass.TestMethod [10 ms]
//   Skipped TestNamespace.TestClass.TestMethod
const TEST_RESULT_RE = /^\s*(Passed|Failed|Skipped)\s+(.+?)(?:\s+\[([^\]]+)])?\s*$/;

// Summary line: Total: 10, Passed: 8, Failed: 1, Skipped: 1
const TEST_SUMMARY_RE = /Total:\s*(\d+).*?Passed:\s*(\d+).*?Failed:\s*(\d+).*?Skipped:\s*(\d+)/;

// Error message lines after a "Failed" test result (indented)
const TEST_ERROR_MESSAGE_RE = /^\s{2,}(Error Message|Message):\s*$/;
const TEST_ERROR_CONTENT_RE = /^\s{3,}(.+)$/;

/** Parses `dotnet test` output into structured test results. */
export function parseDotnetTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetTestResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const tests: DotnetTestCase[] = [];
  let summaryTotal: number | undefined;
  let summaryPassed: number | undefined;
  let summaryFailed: number | undefined;
  let summarySkipped: number | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const testMatch = line.match(TEST_RESULT_RE);
    if (testMatch) {
      const status = testMatch[1] as "Passed" | "Failed" | "Skipped";
      const name = testMatch[2].trim();
      const duration = testMatch[3]?.trim();
      let errorMessage: string | undefined;

      // Look ahead for error messages after a failed test
      if (status === "Failed") {
        for (let j = i + 1; j < lines.length && j < i + 20; j++) {
          if (TEST_ERROR_MESSAGE_RE.test(lines[j])) {
            const msgLines: string[] = [];
            for (let k = j + 1; k < lines.length && k < j + 10; k++) {
              const contentMatch = lines[k].match(TEST_ERROR_CONTENT_RE);
              if (contentMatch) {
                msgLines.push(contentMatch[1]);
              } else {
                break;
              }
            }
            if (msgLines.length > 0) {
              errorMessage = msgLines.join("\n");
            }
            break;
          }
          // Stop looking if we hit another test result
          if (TEST_RESULT_RE.test(lines[j])) break;
        }
      }

      tests.push({ name, status, duration, errorMessage });
      continue;
    }

    const summaryMatch = line.match(TEST_SUMMARY_RE);
    if (summaryMatch) {
      summaryTotal = parseInt(summaryMatch[1], 10);
      summaryPassed = parseInt(summaryMatch[2], 10);
      summaryFailed = parseInt(summaryMatch[3], 10);
      summarySkipped = parseInt(summaryMatch[4], 10);
    }
  }

  const passed = summaryPassed ?? tests.filter((t) => t.status === "Passed").length;
  const failed = summaryFailed ?? tests.filter((t) => t.status === "Failed").length;
  const skipped = summarySkipped ?? tests.filter((t) => t.status === "Skipped").length;
  const total = summaryTotal ?? tests.length;

  return {
    success: exitCode === 0,
    total,
    passed,
    failed,
    skipped,
    tests,
  };
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

/** Parses `dotnet run` output into a structured result. */
export function parseDotnetRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  maxOutputSize: number,
  timedOut?: boolean,
): DotnetRunResult {
  const truncatedStdout =
    stdout.length > maxOutputSize ? stdout.slice(0, maxOutputSize) + "\n[truncated]" : stdout;
  const truncatedStderr =
    stderr.length > maxOutputSize ? stderr.slice(0, maxOutputSize) + "\n[truncated]" : stderr;

  return {
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout: truncatedStdout || undefined,
    stderr: truncatedStderr || undefined,
    timedOut: timedOut || undefined,
  };
}

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

// "project -> outputPath" pattern from dotnet publish
const PUBLISH_OUTPUT_RE = /^\s*\S+\s+->\s+(.+)$/;

/** Parses `dotnet publish` output into structured results. */
export function parseDotnetPublishOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetPublishResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const warnings: string[] = [];
  const errors: string[] = [];
  let outputPath: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    const publishMatch = line.match(PUBLISH_OUTPUT_RE);
    if (publishMatch) {
      outputPath = publishMatch[1].trim();
      continue;
    }

    if (MSBUILD_DIAG_RE.test(trimmed) || MSBUILD_BUILD_ERROR_RE.test(trimmed)) {
      if (/\berror\b/i.test(trimmed)) {
        errors.push(trimmed);
      } else if (/\bwarning\b/i.test(trimmed)) {
        warnings.push(trimmed);
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    outputPath,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

// "Restored path/to/project.csproj" pattern
const RESTORE_PROJECT_RE = /Restored\s+(.+\.(?:csproj|fsproj|vbproj))/i;

/** Parses `dotnet restore` output into structured results. */
export function parseDotnetRestoreOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetRestoreResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const warnings: string[] = [];
  const errors: string[] = [];
  const restoredSet = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    const restoreMatch = trimmed.match(RESTORE_PROJECT_RE);
    if (restoreMatch) {
      restoredSet.add(restoreMatch[1].trim());
      continue;
    }

    if (/\bwarning\b/i.test(trimmed) && !/\b0\s+warnings?\b/i.test(trimmed)) {
      if (MSBUILD_DIAG_RE.test(trimmed) || /\bwarning\s+[A-Z]{1,3}\d+:/i.test(trimmed)) {
        warnings.push(trimmed);
      }
    }
    if (/\berror\b/i.test(trimmed) && !/\b0\s+errors?\b/i.test(trimmed)) {
      if (MSBUILD_DIAG_RE.test(trimmed) || /\berror\s+[A-Z]{1,3}\d+:/i.test(trimmed)) {
        errors.push(trimmed);
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    restoredProjects: restoredSet.size > 0 ? restoredSet.size : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

/** Parses `dotnet clean` output into a structured result. */
export function parseDotnetCleanOutput(exitCode: number): DotnetCleanResult {
  return {
    success: exitCode === 0,
    exitCode,
  };
}

// ---------------------------------------------------------------------------
// add-package
// ---------------------------------------------------------------------------

// "PackageReference for 'PackageName' version 'X.Y.Z' added" pattern
const ADD_PACKAGE_VERSION_RE = /PackageReference\s+for\s+'([^']+)'\s+version\s+'([^']+)'/i;

/** Parses `dotnet add package` output into structured results. */
export function parseDotnetAddPackageOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  packageName: string,
): DotnetAddPackageResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const errors: string[] = [];
  let version: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    const versionMatch = trimmed.match(ADD_PACKAGE_VERSION_RE);
    if (versionMatch) {
      version = versionMatch[2];
      continue;
    }

    if (/\berror\b/i.test(trimmed) && !/\b0\s+errors?\b/i.test(trimmed)) {
      errors.push(trimmed);
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    package: packageName,
    version,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ---------------------------------------------------------------------------
// list-package
// ---------------------------------------------------------------------------

// dotnet list package text output format:
// Project 'MyProject' has the following package references
//    [net8.0]:
//    Top-level Package               Requested   Resolved
//    > Newtonsoft.Json                13.0.1      13.0.1
//    > Microsoft.Extensions.Logging   8.0.0       8.0.1

const LIST_PROJECT_RE = /^Project\s+'([^']+)'/;
const LIST_FRAMEWORK_RE = /^\s+\[([^\]]+)]/;
const LIST_PACKAGE_RE = /^\s+>\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?/;
const LIST_TRANSITIVE_HEADER_RE = /Transitive Package/i;
const LIST_TOPLEVEL_HEADER_RE = /Top-level Package/i;
const LIST_DEPRECATED_RE = /\(D\)/;

// JSON format (dotnet list package --format json)
interface ListPackageJson {
  version?: number;
  projects?: Array<{
    path?: string;
    frameworks?: Array<{
      framework?: string;
      topLevelPackages?: Array<{
        id?: string;
        requestedVersion?: string;
        resolvedVersion?: string;
        latestVersion?: string;
        isDeprecated?: boolean;
      }>;
      transitivePackages?: Array<{
        id?: string;
        resolvedVersion?: string;
        latestVersion?: string;
        isDeprecated?: boolean;
      }>;
    }>;
  }>;
}

/** Parses `dotnet list package` output (text or JSON) into structured results. */
export function parseDotnetListPackageOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetListPackageResult {
  // Try JSON format first
  const jsonResult = tryParseListPackageJson(stdout);
  if (jsonResult) {
    return { success: exitCode === 0, exitCode, projects: jsonResult };
  }

  // Fall back to text parsing
  return parseListPackageText(stdout, stderr, exitCode);
}

function tryParseListPackageJson(stdout: string): DotnetProjectPackages[] | undefined {
  try {
    const jsonStart = stdout.indexOf("{");
    if (jsonStart < 0) return undefined;
    const raw = JSON.parse(stdout.slice(jsonStart)) as ListPackageJson;
    if (!raw.projects || !Array.isArray(raw.projects)) return undefined;

    return raw.projects.map((proj) => ({
      project: proj.path ?? "unknown",
      frameworks: (proj.frameworks ?? []).map((fw) => ({
        framework: fw.framework ?? "unknown",
        topLevel: fw.topLevelPackages?.map(
          (pkg): DotnetPackageEntry => ({
            id: pkg.id ?? "unknown",
            resolved: pkg.resolvedVersion ?? pkg.requestedVersion ?? "unknown",
            latest: pkg.latestVersion,
            deprecated: pkg.isDeprecated || undefined,
          }),
        ),
        transitive: fw.transitivePackages?.map(
          (pkg): DotnetPackageEntry => ({
            id: pkg.id ?? "unknown",
            resolved: pkg.resolvedVersion ?? "unknown",
            latest: pkg.latestVersion,
            deprecated: pkg.isDeprecated || undefined,
          }),
        ),
      })),
    }));
  } catch {
    return undefined;
  }
}

function parseListPackageText(
  stdout: string,
  stderr: string,
  exitCode: number,
): DotnetListPackageResult {
  const output = stdout + "\n" + stderr;
  const lines = output.split("\n");
  const projects: DotnetProjectPackages[] = [];
  let currentProject: DotnetProjectPackages | undefined;
  let currentFramework: string | undefined;
  let inTransitive = false;

  for (const line of lines) {
    const projectMatch = line.match(LIST_PROJECT_RE);
    if (projectMatch) {
      currentProject = { project: projectMatch[1], frameworks: [] };
      projects.push(currentProject);
      inTransitive = false;
      continue;
    }

    const fwMatch = line.match(LIST_FRAMEWORK_RE);
    if (fwMatch && currentProject) {
      currentFramework = fwMatch[1];
      currentProject.frameworks.push({
        framework: currentFramework,
        topLevel: [],
        transitive: [],
      });
      inTransitive = false;
      continue;
    }

    if (LIST_TRANSITIVE_HEADER_RE.test(line)) {
      inTransitive = true;
      continue;
    }

    if (LIST_TOPLEVEL_HEADER_RE.test(line)) {
      inTransitive = false;
      continue;
    }

    const pkgMatch = line.match(LIST_PACKAGE_RE);
    if (pkgMatch && currentProject && currentProject.frameworks.length > 0) {
      const fw = currentProject.frameworks[currentProject.frameworks.length - 1];
      const entry: DotnetPackageEntry = {
        id: pkgMatch[1],
        resolved: pkgMatch[3],
        latest: pkgMatch[4] || undefined,
        deprecated: LIST_DEPRECATED_RE.test(line) || undefined,
      };

      if (inTransitive) {
        fw.transitive = fw.transitive ?? [];
        fw.transitive.push(entry);
      } else {
        fw.topLevel = fw.topLevel ?? [];
        fw.topLevel.push(entry);
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    projects,
  };
}
