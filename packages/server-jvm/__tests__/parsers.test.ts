import { describe, it, expect } from "vitest";
import {
  parseDiagnostics,
  parseGradleBuild,
  parseGradleTest,
  parseGradleTasks,
  parseGradleDependencies,
  parseMavenBuild,
  parseMavenTest,
  parseMavenDependencies,
  parseMavenVerify,
} from "../src/lib/parsers.js";

// ── parseDiagnostics ────────────────────────────────────────────────

describe("parseDiagnostics", () => {
  it("parses Java compiler errors", () => {
    const output = [
      "src/Main.java:10: error: cannot find symbol",
      "src/Main.java:15: warning: unchecked cast",
    ].join("\n");

    const diags = parseDiagnostics(output);
    expect(diags).toHaveLength(2);
    expect(diags[0]).toEqual({
      severity: "error",
      message: "cannot find symbol",
      file: "src/Main.java",
      line: 10,
    });
    expect(diags[1]).toEqual({
      severity: "warning",
      message: "unchecked cast",
      file: "src/Main.java",
      line: 15,
    });
  });

  it("parses Kotlin compiler errors", () => {
    const output = "e: src/Main.kt: (10, 5): Unresolved reference: foo";

    const diags = parseDiagnostics(output);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toEqual({
      severity: "error",
      message: "Unresolved reference: foo",
      file: "src/Main.kt",
      line: 10,
    });
  });

  it("parses Kotlin warnings", () => {
    const output = "w: src/Util.kt: (22, 1): Unused variable 'x'";

    const diags = parseDiagnostics(output);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toBe("Unused variable 'x'");
  });

  it("parses Maven [ERROR] lines", () => {
    const output = [
      "[ERROR] Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin:3.10.1:compile",
      "[WARNING] Using deprecated API in com.example.App",
    ].join("\n");

    const diags = parseDiagnostics(output);
    expect(diags).toHaveLength(2);
    expect(diags[0].severity).toBe("error");
    expect(diags[1].severity).toBe("warning");
  });

  it("skips noisy Maven build status lines", () => {
    const output = [
      "[ERROR] BUILD FAILURE",
      "[ERROR] ",
      "[ERROR] ---",
      "[ERROR] Total time: 5s",
      "[ERROR] Finished at: 2024-01-01T00:00:00Z",
      "[ERROR] For more information about the errors",
      "[ERROR] Actual error message here",
    ].join("\n");

    const diags = parseDiagnostics(output);
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toBe("Actual error message here");
  });

  it("returns empty array for clean output", () => {
    const output = "BUILD SUCCESSFUL in 5s\n3 actionable tasks: 3 executed";
    const diags = parseDiagnostics(output);
    expect(diags).toEqual([]);
  });
});

// ── parseGradleBuild ────────────────────────────────────────────────

describe("parseGradleBuild", () => {
  it("parses successful build", () => {
    const stdout = [
      "> Task :compileJava UP-TO-DATE",
      "> Task :processResources NO-SOURCE",
      "> Task :classes UP-TO-DATE",
      "> Task :jar",
      "> Task :assemble",
      "> Task :compileTestJava UP-TO-DATE",
      "> Task :test UP-TO-DATE",
      "> Task :check UP-TO-DATE",
      "> Task :build",
      "",
      "BUILD SUCCESSFUL in 5s",
      "8 actionable tasks: 2 executed, 6 up-to-date",
    ].join("\n");

    const result = parseGradleBuild(stdout, "", 0, 5000);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBe(5000);
    expect(result.timedOut).toBe(false);
    expect(result.tasksExecuted).toBe(2);
    expect(result.tasksFailed).toBeUndefined();
    expect(result.diagnostics).toBeUndefined();
  });

  it("parses failed build with errors", () => {
    const stdout = [
      "> Task :compileJava FAILED",
      "",
      "src/Main.java:10: error: cannot find symbol",
      "    System.out.println(foo);",
      "                       ^",
      "",
      "FAILURE: Build failed with an exception.",
    ].join("\n");

    const result = parseGradleBuild(stdout, "", 1, 3000);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.tasksFailed).toBe(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics![0].severity).toBe("error");
    expect(result.diagnostics![0].file).toBe("src/Main.java");
    expect(result.diagnostics![0].line).toBe(10);
  });

  it("handles timed out build", () => {
    const result = parseGradleBuild(
      "partial output",
      'Command "gradle" timed out after 300000ms.',
      124,
      300000,
      true,
    );
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("handles empty output", () => {
    const result = parseGradleBuild("", "", 0, 100);
    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

// ── parseGradleTest ─────────────────────────────────────────────────

describe("parseGradleTest", () => {
  it("parses successful test run", () => {
    const stdout = [
      "> Task :compileJava UP-TO-DATE",
      "> Task :compileTestJava",
      "> Task :test",
      "",
      "AppTest > testAddition PASSED",
      "AppTest > testSubtraction PASSED",
      "AppTest > testMultiplication PASSED (0.02s)",
      "",
      "3 tests completed, 0 failed",
      "",
      "BUILD SUCCESSFUL in 10s",
    ].join("\n");

    const result = parseGradleTest(stdout, "", 0, 10000);
    expect(result.success).toBe(true);
    expect(result.totalTests).toBe(3);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.tests).toHaveLength(3);
    expect(result.tests![0]).toEqual({
      name: "testAddition",
      className: "AppTest",
      passed: true,
    });
    expect(result.tests![2].duration).toBe("0.02s");
  });

  it("parses test run with failures", () => {
    const stdout = [
      "> Task :test",
      "",
      "AppTest > testAddition PASSED",
      "AppTest > testDivision FAILED",
      "",
      "2 tests completed, 1 failed",
      "",
      "FAILURE: Build failed with an exception.",
    ].join("\n");

    const result = parseGradleTest(stdout, "", 1, 5000);
    expect(result.success).toBe(false);
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.tests).toHaveLength(2);
    expect(result.tests![1].passed).toBe(false);
  });

  it("parses test run with skipped tests", () => {
    const stdout = ["5 tests completed, 1 failed, 2 skipped"].join("\n");

    const result = parseGradleTest(stdout, "", 1, 3000);
    expect(result.totalTests).toBe(5);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(2);
  });

  it("handles timed out test", () => {
    const result = parseGradleTest("", "timed out", 124, 300000, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.totalTests).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseGradleTest("", "", 0, 500);
    expect(result.success).toBe(true);
    expect(result.totalTests).toBe(0);
    expect(result.tests).toBeUndefined();
  });

  it("parses alternative Surefire-style format", () => {
    const stdout = "Tests run: 10, Failures: 2, Errors: 1, Skipped: 3";

    const result = parseGradleTest(stdout, "", 1, 2000);
    expect(result.totalTests).toBe(10);
    expect(result.passed).toBe(4);
    expect(result.failed).toBe(3); // 2 + 1
    expect(result.skipped).toBe(3);
  });
});

// ── parseGradleTasks ────────────────────────────────────────────────

describe("parseGradleTasks", () => {
  it("parses tasks with groups and descriptions", () => {
    const stdout = [
      "> Task :tasks",
      "",
      "------------------------------------------------------------",
      "Tasks runnable from root project 'myproject'",
      "------------------------------------------------------------",
      "",
      "Build tasks",
      "-----------",
      "assemble - Assembles the outputs of this project.",
      "build - Assembles and tests this project.",
      "clean - Deletes the build directory.",
      "",
      "Help tasks",
      "----------",
      "tasks - Displays the tasks runnable from root project.",
      "help - Displays a help message.",
      "",
    ].join("\n");

    const result = parseGradleTasks(stdout);
    expect(result.total).toBe(5);
    expect(result.tasks[0]).toEqual({
      name: "assemble",
      description: "Assembles the outputs of this project.",
      group: "Build",
    });
    expect(result.tasks[2]).toEqual({
      name: "clean",
      description: "Deletes the build directory.",
      group: "Build",
    });
    expect(result.tasks[3]).toEqual({
      name: "tasks",
      description: "Displays the tasks runnable from root project.",
      group: "Help",
    });
  });

  it("handles empty output", () => {
    const result = parseGradleTasks("");
    expect(result.total).toBe(0);
    expect(result.tasks).toEqual([]);
  });

  it("parses tasks without groups", () => {
    const stdout = [
      "> Task :tasks",
      "",
      "assemble - Assembles the outputs.",
      "build - Builds the project.",
      "",
    ].join("\n");

    const result = parseGradleTasks(stdout);
    expect(result.total).toBe(2);
    expect(result.tasks[0].group).toBeUndefined();
  });
});

// ── parseGradleDependencies ─────────────────────────────────────────

describe("parseGradleDependencies", () => {
  it("parses dependency tree", () => {
    const stdout = [
      "> Task :dependencies",
      "",
      "------------------------------------------------------------",
      "Root project 'myproject'",
      "------------------------------------------------------------",
      "",
      "compileClasspath - Compile classpath for source set 'main'.",
      "+--- org.springframework:spring-core:5.3.20",
      "+--- com.google.guava:guava:31.1-jre",
      "\\--- org.slf4j:slf4j-api:1.7.36",
      "",
      "runtimeClasspath - Runtime classpath of source set 'main'.",
      "+--- org.springframework:spring-core:5.3.20",
      "\\--- com.google.guava:guava:31.1-jre",
      "",
    ].join("\n");

    const result = parseGradleDependencies(stdout);
    expect(result.configurations).toHaveLength(2);
    expect(result.configurations[0].configuration).toBe("compileClasspath");
    expect(result.configurations[0].dependencies).toHaveLength(3);
    expect(result.configurations[0].dependencies[0]).toEqual({
      group: "org.springframework",
      artifact: "spring-core",
      version: "5.3.20",
    });
    expect(result.configurations[1].configuration).toBe("runtimeClasspath");
    expect(result.configurations[1].dependencies).toHaveLength(2);
    expect(result.totalDependencies).toBe(5);
  });

  it("handles version arrows (upgrades)", () => {
    const stdout = ["compileClasspath", "+--- org.slf4j:slf4j-api:1.7.25 -> 1.7.36", ""].join("\n");

    const result = parseGradleDependencies(stdout);
    // The version should be the declared version, stripping " -> ..."
    expect(result.configurations[0].dependencies[0].version).toBe("1.7.25");
  });

  it("deduplicates dependencies within a configuration", () => {
    const stdout = [
      "compileClasspath",
      "+--- org.slf4j:slf4j-api:1.7.36",
      "|    \\--- org.slf4j:slf4j-api:1.7.36",
      "",
    ].join("\n");

    const result = parseGradleDependencies(stdout);
    expect(result.configurations[0].dependencies).toHaveLength(1);
  });

  it("handles empty output", () => {
    const result = parseGradleDependencies("");
    expect(result.configurations).toEqual([]);
    expect(result.totalDependencies).toBe(0);
  });

  it("filters out configurations with no dependencies", () => {
    const stdout = [
      "annotationProcessor - No dependencies",
      "",
      "compileClasspath",
      "+--- com.google.guava:guava:31.1-jre",
      "",
    ].join("\n");

    const result = parseGradleDependencies(stdout);
    expect(result.configurations).toHaveLength(1);
    expect(result.configurations[0].configuration).toBe("compileClasspath");
  });
});

// ── parseMavenBuild ─────────────────────────────────────────────────

describe("parseMavenBuild", () => {
  it("parses successful build", () => {
    const stdout = [
      "[INFO] Scanning for projects...",
      "[INFO] --- maven-compiler-plugin:3.10.1:compile (default-compile) @ myproject ---",
      "[INFO] Nothing to compile - all classes are up to date",
      "[INFO] --- maven-jar-plugin:3.3.0:jar (default-jar) @ myproject ---",
      "[INFO] Building jar: /target/myproject-1.0.jar",
      "[INFO] BUILD SUCCESS",
      "[INFO] Total time: 2.5 s",
    ].join("\n");

    const result = parseMavenBuild(stdout, "", 0, 2500);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBe(2500);
    expect(result.timedOut).toBe(false);
    expect(result.diagnostics).toBeUndefined();
  });

  it("parses failed build with errors", () => {
    const stdout = [
      "[ERROR] Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin:3.10.1:compile",
      "[ERROR] Compilation failure",
    ].join("\n");

    const result = parseMavenBuild(stdout, "", 1, 3000);
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
  });

  it("handles timed out build", () => {
    const result = parseMavenBuild("", "timed out", 124, 300000, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

// ── parseMavenTest ──────────────────────────────────────────────────

describe("parseMavenTest", () => {
  it("parses Surefire test summary", () => {
    const stdout = [
      "[INFO] -------------------------------------------------------",
      "[INFO]  T E S T S",
      "[INFO] -------------------------------------------------------",
      "[INFO] Running com.example.AppTest",
      "[INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 1, Time elapsed: 0.123 s",
      "[INFO]",
      "[INFO] Results:",
      "[INFO]",
      "[INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 1",
    ].join("\n");

    const result = parseMavenTest(stdout, "", 1, 5000);
    expect(result.success).toBe(false);
    expect(result.totalTests).toBe(5);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("parses successful test run", () => {
    const stdout = ["[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0"].join("\n");

    const result = parseMavenTest(stdout, "", 0, 3000);
    expect(result.success).toBe(true);
    expect(result.totalTests).toBe(12);
    expect(result.passed).toBe(12);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("parses test run with errors and failures", () => {
    const stdout = "Tests run: 10, Failures: 2, Errors: 1, Skipped: 0";

    const result = parseMavenTest(stdout, "", 1, 4000);
    expect(result.totalTests).toBe(10);
    expect(result.passed).toBe(7);
    expect(result.failed).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("takes the last summary when multiple appear", () => {
    const stdout = [
      "[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.05 s - in com.example.FooTest",
      "[INFO] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.01 s - in com.example.BarTest",
      "[INFO] Results:",
      "[INFO] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0",
    ].join("\n");

    const result = parseMavenTest(stdout, "", 1, 2000);
    expect(result.totalTests).toBe(5);
    expect(result.failed).toBe(1);
    expect(result.passed).toBe(4);
  });

  it("handles timed out test", () => {
    const result = parseMavenTest("", "timed out", 124, 300000, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.totalTests).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseMavenTest("", "", 0, 100);
    expect(result.success).toBe(true);
    expect(result.totalTests).toBe(0);
    expect(result.tests).toBeUndefined();
  });

  it("parses individual failing test names", () => {
    const stdout = [
      "  testDivision(com.example.AppTest)  Time elapsed: 0.001 s  <<< FAILURE!",
      "  testNull(com.example.AppTest)  Time elapsed: 0.002 s  <<< ERROR!",
      "Tests run: 5, Failures: 1, Errors: 1, Skipped: 0",
    ].join("\n");

    const result = parseMavenTest(stdout, "", 1, 3000);
    expect(result.tests).toHaveLength(2);
    expect(result.tests![0].name).toBe("testDivision");
    expect(result.tests![0].className).toBe("com.example.AppTest");
    expect(result.tests![0].passed).toBe(false);
    expect(result.tests![0].failure).toBe("FAILURE");
    expect(result.tests![1].name).toBe("testNull");
    expect(result.tests![1].failure).toBe("ERROR");
  });
});

// ── parseMavenDependencies ──────────────────────────────────────────

describe("parseMavenDependencies", () => {
  it("parses dependency tree", () => {
    const stdout = [
      "[INFO] --- dependency:3.6.0:tree (default-cli) @ myproject ---",
      "[INFO] com.example:myproject:jar:1.0-SNAPSHOT",
      "[INFO] +- org.springframework:spring-core:jar:5.3.20:compile",
      "[INFO] +- com.google.guava:guava:jar:31.1-jre:compile",
      "[INFO] \\- org.slf4j:slf4j-api:jar:1.7.36:runtime",
      "[INFO] BUILD SUCCESS",
    ].join("\n");

    const result = parseMavenDependencies(stdout);
    expect(result.total).toBe(3);
    expect(result.dependencies[0]).toEqual({
      groupId: "org.springframework",
      artifactId: "spring-core",
      version: "5.3.20",
      scope: "compile",
    });
    expect(result.dependencies[2]).toEqual({
      groupId: "org.slf4j",
      artifactId: "slf4j-api",
      version: "1.7.36",
      scope: "runtime",
    });
  });

  it("deduplicates transitive dependencies", () => {
    const stdout = [
      "[INFO] com.example:myproject:jar:1.0-SNAPSHOT",
      "[INFO] +- org.slf4j:slf4j-api:jar:1.7.36:compile",
      "[INFO] |  \\- org.slf4j:slf4j-api:jar:1.7.36:compile",
      "",
    ].join("\n");

    const result = parseMavenDependencies(stdout);
    expect(result.total).toBe(1);
  });

  it("handles dependencies without scope", () => {
    const stdout = ["[INFO] +- org.junit:junit:jar:4.13.2"].join("\n");

    const result = parseMavenDependencies(stdout);
    expect(result.total).toBe(1);
    expect(result.dependencies[0].scope).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseMavenDependencies("");
    expect(result.total).toBe(0);
    expect(result.dependencies).toEqual([]);
  });

  it("handles nested transitive dependencies", () => {
    const stdout = [
      "[INFO] com.example:app:jar:1.0",
      "[INFO] +- org.springframework:spring-web:jar:5.3.20:compile",
      "[INFO] |  +- org.springframework:spring-beans:jar:5.3.20:compile",
      "[INFO] |  \\- org.springframework:spring-core:jar:5.3.20:compile",
      "[INFO] \\- org.slf4j:slf4j-api:jar:1.7.36:compile",
    ].join("\n");

    const result = parseMavenDependencies(stdout);
    expect(result.total).toBe(4);
  });
});

// ── parseMavenVerify ────────────────────────────────────────────────

describe("parseMavenVerify", () => {
  it("parses successful verify", () => {
    const stdout = [
      "[INFO] --- maven-compiler-plugin:3.10.1:compile (default-compile) @ myproject ---",
      "[INFO] --- maven-surefire-plugin:3.0.0:test (default-test) @ myproject ---",
      "[INFO] BUILD SUCCESS",
    ].join("\n");

    const result = parseMavenVerify(stdout, "", 0, 8000);
    expect(result.success).toBe(true);
    expect(result.duration).toBe(8000);
    expect(result.diagnostics).toBeUndefined();
  });

  it("parses failed verify with errors", () => {
    const stdout = [
      "[ERROR] Failed to execute goal org.apache.maven.plugins:maven-failsafe-plugin:3.0.0:verify",
      "[ERROR] There are test failures",
    ].join("\n");

    const result = parseMavenVerify(stdout, "", 1, 10000);
    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics![0].severity).toBe("error");
  });

  it("handles timed out verify", () => {
    const result = parseMavenVerify("", "timed out", 124, 300000, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});
