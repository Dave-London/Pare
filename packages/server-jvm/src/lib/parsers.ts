import type {
  GradleBuildResult,
  GradleTestResult,
  GradleTestCase,
  GradleTask,
  GradleTasksResult,
  GradleDependenciesResult,
  GradleDependencyConfig,
  GradleDependency,
  MavenBuildResult,
  MavenTestResult,
  MavenTestCase,
  MavenDependenciesResult,
  MavenDependency,
  MavenVerifyResult,
  BuildDiagnostic,
} from "../schemas/index.js";

// ── Shared helpers ──────────────────────────────────────────────────

/** Extracts compiler errors and warnings from combined output. */
export function parseDiagnostics(output: string): BuildDiagnostic[] {
  const diagnostics: BuildDiagnostic[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Java compiler: src/Main.java:10: error: cannot find symbol
    const javaMatch = line.match(/^(.+\.java):(\d+):\s*(error|warning):\s*(.+)$/);
    if (javaMatch) {
      diagnostics.push({
        severity: javaMatch[3] as "error" | "warning",
        message: javaMatch[4].trim(),
        file: javaMatch[1],
        line: parseInt(javaMatch[2], 10),
      });
      continue;
    }

    // Kotlin compiler: e: src/Main.kt: (10, 5): Unresolved reference
    const kotlinMatch = line.match(/^([ew]):\s*(.+\.kts?)\s*:\s*\((\d+),\s*\d+\):\s*(.+)$/);
    if (kotlinMatch) {
      diagnostics.push({
        severity: kotlinMatch[1] === "e" ? "error" : "warning",
        message: kotlinMatch[4].trim(),
        file: kotlinMatch[2],
        line: parseInt(kotlinMatch[3], 10),
      });
      continue;
    }

    // Maven [ERROR] / [WARNING] with file reference
    const mavenMatch = line.match(
      /^\[(?:ERROR|WARNING)\]\s*(.+\.java):\[(\d+),\d+\]\s*(error|warning)?:?\s*(.+)$/,
    );
    if (mavenMatch) {
      diagnostics.push({
        severity: line.startsWith("[ERROR]") ? "error" : "warning",
        message: mavenMatch[4].trim(),
        file: mavenMatch[1],
        line: parseInt(mavenMatch[2], 10),
      });
      continue;
    }

    // Generic [ERROR] / [WARNING] lines (Maven style)
    const genericMavenMatch = line.match(/^\[(ERROR|WARNING)\]\s*(.+)$/);
    if (genericMavenMatch) {
      const severity = genericMavenMatch[1] === "ERROR" ? "error" : "warning";
      const msg = genericMavenMatch[2].trim();
      // Skip noisy build-status lines
      if (
        msg.startsWith("BUILD FAILURE") ||
        msg.startsWith("BUILD SUCCESS") ||
        msg === "" ||
        msg.startsWith("---") ||
        msg.startsWith("Total time") ||
        msg.startsWith("Finished at") ||
        msg.startsWith("For more information")
      ) {
        continue;
      }
      diagnostics.push({ severity, message: msg });
    }
  }

  return diagnostics;
}

// ── Gradle parsers ──────────────────────────────────────────────────

/** Parses Gradle build output into structured result. */
export function parseGradleBuild(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): GradleBuildResult {
  const success = exitCode === 0 && !timedOut;
  const combined = `${stdout}\n${stderr}`;

  // Extract task counts: "BUILD SUCCESSFUL in 5s" or "N actionable tasks: M executed, K up-to-date"
  let tasksExecuted: number | undefined;
  let tasksFailed: number | undefined;

  const actionableMatch = combined.match(
    /(\d+)\s+actionable\s+tasks?:\s*(\d+)\s+executed(?:,\s*(\d+)\s+up-to-date)?/,
  );
  if (actionableMatch) {
    tasksExecuted = parseInt(actionableMatch[2], 10);
  }

  if (!success) {
    // Count FAILED task markers
    const failedMatches = combined.match(/> Task .+ FAILED/g);
    tasksFailed = failedMatches ? failedMatches.length : undefined;
  }

  const diagnostics = parseDiagnostics(combined);

  return {
    success,
    exitCode,
    duration,
    timedOut,
    tasksExecuted,
    tasksFailed,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

/** Parses Gradle test output into structured result. */
export function parseGradleTest(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): GradleTestResult {
  const success = exitCode === 0 && !timedOut;
  const combined = `${stdout}\n${stderr}`;

  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const tests: GradleTestCase[] = [];

  // Parse test result summary: "TEST RESULT: SUCCESS (12 tests, 10 successes, 1 failures, 1 skipped)"
  // Or: "X tests completed, Y failed, Z skipped"
  const resultMatch = combined.match(
    /(\d+)\s+tests?\s+completed?,\s*(\d+)\s+failed(?:,\s*(\d+)\s+skipped)?/,
  );
  if (resultMatch) {
    totalTests = parseInt(resultMatch[1], 10);
    failed = parseInt(resultMatch[2], 10);
    skipped = resultMatch[3] ? parseInt(resultMatch[3], 10) : 0;
    passed = totalTests - failed - skipped;
  }

  // Alternative format: "Tests run: N, Failures: N, Errors: N, Skipped: N"
  const altMatch = combined.match(
    /Tests\s+run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/,
  );
  if (altMatch && totalTests === 0) {
    totalTests = parseInt(altMatch[1], 10);
    failed = parseInt(altMatch[2], 10) + parseInt(altMatch[3], 10);
    skipped = parseInt(altMatch[4], 10);
    passed = totalTests - failed - skipped;
  }

  // Parse individual test lines: "ClassName > testName PASSED" or "FAILED"
  const testLineRe = /^(\S+)\s+>\s+(\S+(?:\(.*?\))?)\s+(PASSED|FAILED|SKIPPED)(?:\s+\((.+)\))?$/gm;
  let match;
  while ((match = testLineRe.exec(combined)) !== null) {
    const testCase: GradleTestCase = {
      name: match[2],
      className: match[1],
      passed: match[3] === "PASSED",
    };
    if (match[4]) {
      testCase.duration = match[4];
    }
    if (match[3] === "FAILED") {
      // Try to find failure message after this test line
      const failIdx = combined.indexOf(match[0]);
      const afterTest = combined.slice(failIdx + match[0].length, failIdx + match[0].length + 500);
      const failMsgMatch = afterTest.match(/^\s+(.+?)(?:\n\s*\n|\n\S)/s);
      if (failMsgMatch) {
        testCase.failure = failMsgMatch[1].trim();
      }
    }
    tests.push(testCase);
  }

  // If we got individual tests but no summary, compute from tests
  if (totalTests === 0 && tests.length > 0) {
    totalTests = tests.length;
    passed = tests.filter((t) => t.passed).length;
    failed = tests.filter((t) => !t.passed && t.failure !== undefined).length;
    skipped = totalTests - passed - failed;
  }

  return {
    success,
    exitCode,
    duration,
    timedOut,
    totalTests,
    passed,
    failed,
    skipped,
    tests: tests.length > 0 ? tests : undefined,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

/**
 * Parses `gradle tasks --all --console=plain` output into structured task data.
 *
 * Expected format:
 * ```
 * > Task :tasks
 *
 * ------------------------------------------------------------
 * Tasks runnable from root project 'myproject'
 * ------------------------------------------------------------
 *
 * Build tasks
 * -----------
 * assemble - Assembles the outputs of this project.
 * build - Assembles and tests this project.
 *
 * Help tasks
 * ----------
 * tasks - Displays the tasks runnable from root project.
 * ```
 */
export function parseGradleTasks(stdout: string): GradleTasksResult {
  const tasks: GradleTask[] = [];
  let currentGroup: string | undefined;

  const lines = stdout.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Group header: "Build tasks" followed by "----------"
    if (i + 1 < lines.length && lines[i + 1].trim().match(/^-{3,}$/)) {
      currentGroup = trimmed.replace(/\s+tasks?$/i, "").trim();
      i++; // skip the separator line
      continue;
    }

    // Skip separator lines and other headers
    if (
      trimmed.match(/^-{3,}$/) ||
      trimmed.startsWith("> Task") ||
      trimmed.startsWith("Tasks runnable")
    ) {
      continue;
    }

    // Task line: "taskName - Description" or just "taskName"
    const taskMatch = trimmed.match(/^(\S+)\s+-\s+(.+)$/);
    if (taskMatch) {
      tasks.push({
        name: taskMatch[1],
        description: taskMatch[2].trim(),
        group: currentGroup,
      });
      continue;
    }

    // Task with no description (usually in --all output): just a name with optional leading colon
    const bareTaskMatch = trimmed.match(/^(:[a-zA-Z][\w:.-]*)$/);
    if (bareTaskMatch) {
      tasks.push({
        name: bareTaskMatch[1],
        group: currentGroup,
      });
    }
  }

  return { tasks, total: tasks.length };
}

/**
 * Parses `gradle dependencies --console=plain` output.
 *
 * Expected format:
 * ```
 * > Task :dependencies
 *
 * ------------------------------------------------------------
 * Root project 'myproject'
 * ------------------------------------------------------------
 *
 * compileClasspath - Compile classpath for source set 'main'.
 * +--- org.springframework:spring-core:5.3.20
 * +--- com.google.guava:guava:31.1-jre
 * \--- org.slf4j:slf4j-api:1.7.36
 *
 * runtimeClasspath - Runtime classpath of source set 'main'.
 * +--- org.springframework:spring-core:5.3.20
 * \--- org.slf4j:slf4j-api:1.7.36
 * ```
 */
export function parseGradleDependencies(stdout: string): GradleDependenciesResult {
  const configurations: GradleDependencyConfig[] = [];
  let currentConfig: GradleDependencyConfig | undefined;
  const seen = new Set<string>();

  const lines = stdout.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, headers, and separators
    if (
      !trimmed ||
      trimmed.startsWith("> Task") ||
      trimmed.match(/^-{3,}$/) ||
      trimmed.startsWith("Root project")
    ) {
      continue;
    }

    // Configuration header: "compileClasspath - Description" or just "compileClasspath"
    const configMatch = trimmed.match(/^([a-zA-Z][\w]*)(?:\s+-\s+(.+))?$/);
    if (
      configMatch &&
      !trimmed.startsWith("+") &&
      !trimmed.startsWith("\\") &&
      !trimmed.startsWith("|")
    ) {
      // Check that the next non-empty line is a dependency tree line or "No dependencies"
      currentConfig = {
        configuration: configMatch[1],
        dependencies: [],
      };
      seen.clear();
      configurations.push(currentConfig);
      continue;
    }

    // Dependency line: "+--- group:artifact:version" or "\--- group:artifact:version"
    if (currentConfig) {
      const depMatch = trimmed.match(/[+\\|]-{3}\s+(\S+):(\S+):(\S+?)(?:\s.*)?$/);
      if (depMatch) {
        const key = `${depMatch[1]}:${depMatch[2]}:${depMatch[3]}`;
        if (!seen.has(key)) {
          seen.add(key);
          const dep: GradleDependency = {
            group: depMatch[1],
            artifact: depMatch[2],
            version: depMatch[3].replace(/\s*->.*$/, "").replace(/\s*\(.*\)$/, ""),
          };
          currentConfig.dependencies.push(dep);
        }
        continue;
      }

      // "No dependencies" line
      if (trimmed === "No dependencies") {
        continue;
      }

      // "(c)" or "(*)" markers — just skip
      if (trimmed.match(/^\|/)) {
        continue;
      }
    }
  }

  // Filter out configurations with no dependencies
  const filtered = configurations.filter((c) => c.dependencies.length > 0);
  const totalDependencies = filtered.reduce((sum, c) => sum + c.dependencies.length, 0);

  return { configurations: filtered, totalDependencies };
}

// ── Maven parsers ───────────────────────────────────────────────────

/** Parses Maven build (package) output into structured result. */
export function parseMavenBuild(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): MavenBuildResult {
  const success = exitCode === 0 && !timedOut;
  const combined = `${stdout}\n${stderr}`;
  const diagnostics = parseDiagnostics(combined);

  return {
    success,
    exitCode,
    duration,
    timedOut,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

/**
 * Parses Maven Surefire test output.
 *
 * Expected format:
 * ```
 * [INFO] -------------------------------------------------------
 * [INFO]  T E S T S
 * [INFO] -------------------------------------------------------
 * [INFO] Running com.example.AppTest
 * [INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 1, Time elapsed: 0.123 s
 * [INFO]
 * [INFO] Results:
 * [INFO]
 * [INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 1
 * ```
 */
export function parseMavenTest(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): MavenTestResult {
  const success = exitCode === 0 && !timedOut;
  const combined = `${stdout}\n${stderr}`;

  let totalTests = 0;
  let failedCount = 0;
  let errors = 0;
  let skipped = 0;
  const tests: MavenTestCase[] = [];

  // Parse final summary: "Tests run: N, Failures: N, Errors: N, Skipped: N"
  // Take the LAST occurrence (which is the overall summary)
  const summaryMatches = [
    ...combined.matchAll(
      /Tests\s+run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/g,
    ),
  ];
  if (summaryMatches.length > 0) {
    const last = summaryMatches[summaryMatches.length - 1];
    totalTests = parseInt(last[1], 10);
    failedCount = parseInt(last[2], 10);
    errors = parseInt(last[3], 10);
    skipped = parseInt(last[4], 10);
  }

  const passed = totalTests - failedCount - errors - skipped;

  // Parse individual failing test names from Surefire output
  // "[ERROR] testMethodName(com.example.AppTest) -- In SomeTest"
  // or "  testMethodName(com.example.AppTest)  Time elapsed: 0.001 s  <<< FAILURE!"
  const failRe = /^\s*(\w[\w$]*)\(([^)]+)\)\s+(?:Time elapsed:.*?<<<\s*(FAILURE|ERROR)!|--)/gm;
  let failMatch;
  while ((failMatch = failRe.exec(combined)) !== null) {
    tests.push({
      name: failMatch[1],
      className: failMatch[2],
      passed: false,
      failure: failMatch[3] || "FAILURE",
    });
  }

  return {
    success,
    exitCode,
    duration,
    timedOut,
    totalTests,
    passed: Math.max(0, passed),
    failed: failedCount,
    errors,
    skipped,
    tests: tests.length > 0 ? tests : undefined,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}

/**
 * Parses `mvn dependency:tree` output.
 *
 * Expected format:
 * ```
 * [INFO] --- dependency:3.6.0:tree (default-cli) @ myproject ---
 * [INFO] com.example:myproject:jar:1.0-SNAPSHOT
 * [INFO] +- org.springframework:spring-core:jar:5.3.20:compile
 * [INFO] +- com.google.guava:guava:jar:31.1-jre:compile
 * [INFO] \- org.slf4j:slf4j-api:jar:1.7.36:compile
 * ```
 */
export function parseMavenDependencies(stdout: string): MavenDependenciesResult {
  const dependencies: MavenDependency[] = [];
  const seen = new Set<string>();

  const lines = stdout.split("\n");

  for (const line of lines) {
    // Strip [INFO] prefix
    const stripped = line.replace(/^\[INFO\]\s*/, "").trim();

    // Dependency lines: "+- group:artifact:type:version:scope" or "\- ..."
    // Maven format: groupId:artifactId:packaging:version[:scope]
    // Tree indentation uses |, +, \, - and spaces
    const depMatch = stripped.match(
      /[+\\]-\s+([^:\s]+):([^:\s]+):([^:\s]+):([^:\s]+)(?::([^:\s]+))?(?:\s.*)?$/,
    );
    if (depMatch) {
      const key = `${depMatch[1]}:${depMatch[2]}`;
      if (!seen.has(key)) {
        seen.add(key);
        dependencies.push({
          groupId: depMatch[1],
          artifactId: depMatch[2],
          version: depMatch[4],
          scope: depMatch[5],
        });
      }
    }
  }

  return { dependencies, total: dependencies.length };
}

/** Parses Maven verify output (same structure as build). */
export function parseMavenVerify(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
  timedOut: boolean = false,
): MavenVerifyResult {
  const success = exitCode === 0 && !timedOut;
  const combined = `${stdout}\n${stderr}`;
  const diagnostics = parseDiagnostics(combined);

  return {
    success,
    exitCode,
    duration,
    timedOut,
    diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    stdout: stdout.trimEnd() || undefined,
    stderr: stderr.trimEnd() || undefined,
  };
}
