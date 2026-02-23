import type {
  SwiftBuildResult,
  SwiftDiagnostic,
  SwiftTestResult,
  SwiftTestCase,
  SwiftRunResult,
  SwiftPackageResolveResult,
  SwiftResolvedPackage,
  SwiftPackageUpdateResult,
  SwiftUpdatedPackage,
  SwiftPackageShowDependenciesResult,
  SwiftDependency,
  SwiftPackageCleanResult,
  SwiftPackageInitResult,
} from "../schemas/index.js";

/**
 * Parses Swift compiler diagnostic lines.
 * Format: file.swift:line:column: error: message
 *         file.swift:line:column: warning: message
 *         file.swift:line:column: note: message
 */
function parseDiagnostics(output: string): {
  errors: SwiftDiagnostic[];
  warnings: SwiftDiagnostic[];
} {
  const errors: SwiftDiagnostic[] = [];
  const warnings: SwiftDiagnostic[] = [];

  const lines = output.split("\n");
  for (const line of lines) {
    const match = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/);
    if (match) {
      const diagnostic: SwiftDiagnostic = {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] as "error" | "warning" | "note",
        message: match[5],
      };

      if (diagnostic.severity === "error") {
        errors.push(diagnostic);
      } else {
        warnings.push(diagnostic);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Parses `swift build` output.
 * Extracts compiler errors and warnings from stderr.
 */
export function parseBuildOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean,
): SwiftBuildResult {
  const combined = stdout + "\n" + stderr;
  const { errors, warnings } = parseDiagnostics(combined);

  return {
    success: exitCode === 0 && !timedOut,
    exitCode,
    errors,
    warnings,
    duration,
    timedOut,
  };
}

/**
 * Parses `swift test` output.
 * Looks for individual test lines:
 *   Test Case '-[ModuleTests.SomeTest testExample]' passed (0.001 seconds).
 *   Test Case '-[ModuleTests.SomeTest testFail]' failed (0.002 seconds).
 *   Test case 'SomeTest.testExample' passed on ...
 * Also parses the Swift Testing format:
 *   Test testExample passed after 0.001 seconds.
 *   Test testFail failed after 0.002 seconds.
 * And the summary line:
 *   Test Suite 'All tests' passed at ...
 *   Executed N tests, with M failures
 */
export function parseTestOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): SwiftTestResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const testCases: SwiftTestCase[] = [];

  for (const line of lines) {
    // XCTest format: Test Case '-[Module.Class testMethod]' passed (0.001 seconds).
    const xcMatch = line.match(
      /Test Case ['']-?\[(.+?)\]['']\s+(passed|failed)\s+\(([0-9.]+)\s+seconds\)/,
    );
    if (xcMatch) {
      testCases.push({
        name: xcMatch[1],
        status: xcMatch[2] === "passed" ? "passed" : "failed",
        duration: parseFloat(xcMatch[3]),
      });
      continue;
    }

    // Swift Testing format: Test "testName" passed after 0.001 seconds.
    // or: ◇ Test testName started.  ✔ Test testName passed after 0.001 seconds.
    const stMatch = line.match(
      /Test\s+[""]?(.+?)[""]?\s+(passed|failed)\s+after\s+([0-9.]+)\s+seconds/,
    );
    if (stMatch) {
      testCases.push({
        name: stMatch[1],
        status: stMatch[2] === "passed" ? "passed" : "failed",
        duration: parseFloat(stMatch[3]),
      });
      continue;
    }

    // Swift package test output: test case 'ClassName.testMethod' passed on ...
    const pkgMatch = line.match(/test case [''"](.+?)[''"][\s]+(passed|failed)/i);
    if (pkgMatch) {
      // Avoid duplicates - check if we already have this test
      const name = pkgMatch[1];
      if (!testCases.some((t) => t.name === name)) {
        testCases.push({
          name,
          status: pkgMatch[2] === "passed" ? "passed" : "failed",
        });
      }
    }
  }

  const passed = testCases.filter((t) => t.status === "passed").length;
  const failed = testCases.filter((t) => t.status === "failed").length;
  const skipped = testCases.filter((t) => t.status === "skipped").length;

  return {
    success: exitCode === 0,
    exitCode,
    passed,
    failed,
    skipped,
    total: testCases.length,
    testCases,
    duration,
  };
}

/**
 * Parses `swift run` output.
 * Returns exit code, stdout, stderr, and duration.
 */
export function parseRunOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean,
): SwiftRunResult {
  return {
    success: exitCode === 0 && !timedOut,
    exitCode,
    stdout,
    stderr,
    duration,
    timedOut,
  };
}

/**
 * Parses `swift package resolve` output.
 * Looks for lines like:
 *   Fetching https://github.com/apple/swift-argument-parser.git from cache
 *   Fetched https://github.com/apple/swift-argument-parser.git from cache (0.34s)
 *   Computing version for swift-argument-parser
 *   Computed swift-argument-parser at 1.2.3 (0.01s)
 *   Resolving https://github.com/apple/swift-argument-parser.git at 1.2.3
 */
export function parsePackageResolveOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): SwiftPackageResolveResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const packages = new Map<string, SwiftResolvedPackage>();

  for (const line of lines) {
    // Match "Computed <name> at <version>"
    const computedMatch = line.match(/Computed\s+(\S+)\s+at\s+(\S+)/);
    if (computedMatch) {
      const name = computedMatch[1];
      packages.set(name, {
        name,
        version: computedMatch[2],
        ...(packages.get(name)?.url ? { url: packages.get(name)!.url } : {}),
      });
      continue;
    }

    // Match "Fetching <url>" or "Fetched <url>"
    const fetchMatch = line.match(/Fetch(?:ing|ed)\s+(\S+)/);
    if (fetchMatch) {
      const url = fetchMatch[1];
      // Extract name from URL
      const nameMatch = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (nameMatch) {
        const name = nameMatch[1];
        const existing = packages.get(name);
        packages.set(name, {
          name,
          url,
          ...(existing?.version ? { version: existing.version } : {}),
        });
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    resolvedPackages: Array.from(packages.values()),
    duration,
  };
}

/**
 * Parses `swift package update` output.
 * Looks for lines like:
 *   Updating https://github.com/apple/swift-argument-parser.git
 *   Resolved swift-argument-parser at 1.3.0 (was 1.2.3)
 *   Updated swift-argument-parser from 1.2.3 to 1.3.0
 */
export function parsePackageUpdateOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): SwiftPackageUpdateResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const packageMap = new Map<string, SwiftUpdatedPackage>();

  for (const line of lines) {
    // Match "Updated <name> from <old> to <new>"
    const updatedMatch = line.match(/Updated\s+(\S+)\s+from\s+(\S+)\s+to\s+(\S+)/);
    if (updatedMatch) {
      packageMap.set(updatedMatch[1], {
        name: updatedMatch[1],
        oldVersion: updatedMatch[2],
        newVersion: updatedMatch[3],
      });
      continue;
    }

    // Match "Updating <url>" as a general package reference
    const urlMatch = line.match(/Updating\s+(https?:\/\/\S+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      const nameMatch = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (nameMatch) {
        const name = nameMatch[1];
        // Only add if we haven't already captured this from "Updated" line
        if (!packageMap.has(name)) {
          packageMap.set(name, { name });
        }
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    updatedPackages: Array.from(packageMap.values()),
    duration,
  };
}

/**
 * Parses `swift package show-dependencies` output.
 * Supports both text format (tree) and JSON format.
 *
 * Text format example:
 *   .
 *   ├── swift-argument-parser https://github.com/apple/swift-argument-parser.git @ 1.2.3
 *   │   └── swift-system https://github.com/apple/swift-system.git @ 1.0.0
 *   └── swift-log https://github.com/apple/swift-log.git @ 1.5.0
 *
 * JSON format: standard SwiftPM dependency graph JSON.
 */
export function parsePackageShowDependenciesOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): SwiftPackageShowDependenciesResult {
  const dependencies: SwiftDependency[] = [];

  if (exitCode !== 0) {
    return { success: false, exitCode, dependencies };
  }

  // Try JSON format first
  try {
    const json = JSON.parse(stdout);
    if (json && typeof json === "object") {
      collectDependenciesFromJson(json, dependencies);
      return { success: true, exitCode, dependencies };
    }
  } catch {
    // Not JSON, try text format
  }

  // Parse text/tree format
  const lines = stdout.split("\n");
  for (const line of lines) {
    // Match lines like: "├── name url @ version" or "name url @ version"
    const match = line.match(/(?:[│├└─\s]*)\s*(\S+)\s+(https?:\/\/\S+)\s+@\s+(\S+)/);
    if (match) {
      dependencies.push({
        name: match[1],
        url: match[2],
        version: match[3],
      });
      continue;
    }

    // Match simpler format: "name @ version (path)"
    const simpleMatch = line.match(/(?:[│├└─\s]*)\s*(\S+)\s+@\s+(\S+)(?:\s+\((.+)\))?/);
    if (simpleMatch) {
      const dep: SwiftDependency = {
        name: simpleMatch[1],
        version: simpleMatch[2],
      };
      if (simpleMatch[3]) dep.path = simpleMatch[3];
      dependencies.push(dep);
    }
  }

  return { success: true, exitCode, dependencies };
}

/**
 * Recursively collects dependencies from SwiftPM JSON dependency graph.
 */
function collectDependenciesFromJson(node: Record<string, unknown>, deps: SwiftDependency[]): void {
  if (node.name && typeof node.name === "string") {
    const dep: SwiftDependency = { name: node.name };
    if (node.url && typeof node.url === "string") dep.url = node.url;
    if (node.version && typeof node.version === "string") dep.version = node.version;
    if (node.path && typeof node.path === "string") dep.path = node.path;
    deps.push(dep);
  }

  const children = node.dependencies as Record<string, unknown>[] | undefined;
  if (Array.isArray(children)) {
    for (const child of children) {
      collectDependenciesFromJson(child, deps);
    }
  }
}

/**
 * Parses `swift package clean` output.
 */
export function parsePackageCleanOutput(
  exitCode: number,
  duration: number,
): SwiftPackageCleanResult {
  return {
    success: exitCode === 0,
    exitCode,
    duration,
  };
}

/**
 * Parses `swift package init` output.
 * Looks for lines like:
 *   Creating library package: MyLib
 *   Creating Package.swift
 *   Creating .gitignore
 *   Creating Sources/
 *   Creating Sources/MyLib/MyLib.swift
 *   Creating Tests/
 *   Creating Tests/MyLibTests/MyLibTests.swift
 */
export function parsePackageInitOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): SwiftPackageInitResult {
  const combined = stdout + "\n" + stderr;
  const lines = combined.split("\n");
  const createdFiles: string[] = [];

  for (const line of lines) {
    const match = line.match(/Creating\s+(.+)/);
    if (match) {
      const file = match[1].trim();
      // Skip the "Creating <type> package:" summary line
      if (!file.includes("package:") && file.length > 0) {
        createdFiles.push(file);
      }
    }
  }

  return {
    success: exitCode === 0,
    exitCode,
    createdFiles,
    duration,
  };
}
