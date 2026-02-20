import { describe, it, expect } from "vitest";
import {
  parseDotnetBuildOutput,
  parseDotnetTestOutput,
  parseDotnetRunOutput,
  parseDotnetPublishOutput,
  parseDotnetRestoreOutput,
  parseDotnetCleanOutput,
  parseDotnetAddPackageOutput,
  parseDotnetListPackageOutput,
} from "../src/lib/parsers.js";

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

describe("parseDotnetBuildOutput", () => {
  it("parses build with errors and warnings", () => {
    const stdout = [
      "Microsoft (R) Build Engine version 17.8.0",
      "  Determining projects to restore...",
      "  All projects are up-to-date for restore.",
      "Program.cs(10,5): error CS1002: ; expected [/home/user/MyApp/MyApp.csproj]",
      "Program.cs(15,9): warning CS0168: The variable 'x' is declared but never used [/home/user/MyApp/MyApp.csproj]",
      "Build FAILED.",
    ].join("\n");

    const result = parseDotnetBuildOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.diagnostics[0]).toEqual({
      file: "Program.cs",
      line: 10,
      column: 5,
      severity: "error",
      code: "CS1002",
      message: "; expected",
    });
    expect(result.diagnostics[1]).toEqual({
      file: "Program.cs",
      line: 15,
      column: 9,
      severity: "warning",
      code: "CS0168",
      message: "The variable 'x' is declared but never used",
    });
  });

  it("parses clean build with no diagnostics", () => {
    const stdout = [
      "Microsoft (R) Build Engine version 17.8.0",
      "  Determining projects to restore...",
      "  All projects are up-to-date for restore.",
      "  MyApp -> /home/user/MyApp/bin/Debug/net8.0/MyApp.dll",
      "",
      "Build succeeded.",
      "    0 Warning(s)",
      "    0 Error(s)",
    ].join("\n");

    const result = parseDotnetBuildOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.warnings).toBe(0);
  });

  it("parses build-level errors without file location", () => {
    const stderr =
      "  error NU1301: Unable to load the service index for source https://broken.example.com [/home/user/MyApp/MyApp.csproj]";

    const result = parseDotnetBuildOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.total).toBe(1);
    expect(result.diagnostics[0].file).toBe("(build)");
    expect(result.diagnostics[0].code).toBe("NU1301");
  });

  it("handles empty output", () => {
    const result = parseDotnetBuildOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

describe("parseDotnetTestOutput", () => {
  it("parses test results with pass, fail, and skip", () => {
    const stdout = [
      "Starting test execution, please wait...",
      "A total of 1 test files matched the specified pattern.",
      "  Passed  MyApp.Tests.CalculatorTests.Add_ReturnsSum [42 ms]",
      "  Failed  MyApp.Tests.CalculatorTests.Divide_ByZero [10 ms]",
      "  Skipped MyApp.Tests.CalculatorTests.Pending_Feature",
      "",
      "Total: 3, Passed: 1, Failed: 1, Skipped: 1",
    ].join("\n");

    const result = parseDotnetTestOutput(stdout, "", 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.tests).toHaveLength(3);
    expect(result.tests[0]).toEqual({
      name: "MyApp.Tests.CalculatorTests.Add_ReturnsSum",
      status: "Passed",
      duration: "42 ms",
      errorMessage: undefined,
    });
    expect(result.tests[1].status).toBe("Failed");
    expect(result.tests[2].status).toBe("Skipped");
  });

  it("parses all passing tests", () => {
    const stdout = [
      "  Passed  Test1 [1 ms]",
      "  Passed  Test2 [2 ms]",
      "",
      "Total: 2, Passed: 2, Failed: 0, Skipped: 0",
    ].join("\n");

    const result = parseDotnetTestOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("handles empty test output", () => {
    const result = parseDotnetTestOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.tests).toHaveLength(0);
  });

  it("parses test with error message", () => {
    const stdout = [
      "  Failed  MyApp.Tests.MathTests.FailingTest [5 ms]",
      "  Error Message:",
      "    Assert.Equal() Failure",
      "    Expected: 4",
      "    Actual:   5",
      "",
      "Total: 1, Passed: 0, Failed: 1, Skipped: 0",
    ].join("\n");

    const result = parseDotnetTestOutput(stdout, "", 1);
    expect(result.tests[0].errorMessage).toBe("Assert.Equal() Failure\nExpected: 4\nActual:   5");
  });
});

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

describe("parseDotnetRunOutput", () => {
  it("parses successful run output", () => {
    const result = parseDotnetRunOutput("Hello, World!", "", 0, 1048576);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!");
  });

  it("truncates large output", () => {
    const large = "x".repeat(100);
    const result = parseDotnetRunOutput(large, "", 0, 50);
    expect(result.stdout).toContain("[truncated]");
    expect(result.stdout!.length).toBeLessThan(large.length + 20);
  });

  it("handles timeout", () => {
    const result = parseDotnetRunOutput("", "timed out", 1, 1048576, true);
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("returns undefined for empty stdout/stderr", () => {
    const result = parseDotnetRunOutput("", "", 0, 1048576);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// publish
// ---------------------------------------------------------------------------

describe("parseDotnetPublishOutput", () => {
  it("parses successful publish with output path", () => {
    const stdout = [
      "  Determining projects to restore...",
      "  All projects are up-to-date for restore.",
      "  MyApp -> /home/user/MyApp/bin/Release/net8.0/MyApp.dll",
      "  MyApp -> /home/user/MyApp/bin/Release/net8.0/publish/",
    ].join("\n");

    const result = parseDotnetPublishOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe("/home/user/MyApp/bin/Release/net8.0/publish/");
  });

  it("parses failed publish", () => {
    const result = parseDotnetPublishOutput("", "Build failed.", 1);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// restore
// ---------------------------------------------------------------------------

describe("parseDotnetRestoreOutput", () => {
  it("parses successful restore", () => {
    const stdout = [
      "  Determining projects to restore...",
      "  Restored /home/user/MyApp/MyApp.csproj (in 1.2 sec).",
      "  Restored /home/user/MyApp.Tests/MyApp.Tests.csproj (in 0.5 sec).",
    ].join("\n");

    const result = parseDotnetRestoreOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.restoredProjects).toBe(2);
  });

  it("handles restore with no projects", () => {
    const result = parseDotnetRestoreOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.restoredProjects).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

describe("parseDotnetCleanOutput", () => {
  it("parses successful clean", () => {
    const result = parseDotnetCleanOutput(0);
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("parses failed clean", () => {
    const result = parseDotnetCleanOutput(1);
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// add-package
// ---------------------------------------------------------------------------

describe("parseDotnetAddPackageOutput", () => {
  it("parses successful package addition with version", () => {
    const stdout = [
      "  Determining projects to restore...",
      "  Writing /tmp/tmpXYZ.tmp",
      "info : PackageReference for 'Newtonsoft.Json' version '13.0.3' added to '/home/user/MyApp/MyApp.csproj'.",
      "  Restoring packages...",
    ].join("\n");

    const result = parseDotnetAddPackageOutput(stdout, "", 0, "Newtonsoft.Json");
    expect(result.success).toBe(true);
    expect(result.package).toBe("Newtonsoft.Json");
    expect(result.version).toBe("13.0.3");
  });

  it("parses failed package addition", () => {
    const stderr = "error: Unable to find package 'NonExistent.Package'";

    const result = parseDotnetAddPackageOutput("", stderr, 1, "NonExistent.Package");
    expect(result.success).toBe(false);
    expect(result.package).toBe("NonExistent.Package");
    expect(result.errors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// list-package
// ---------------------------------------------------------------------------

describe("parseDotnetListPackageOutput", () => {
  it("parses text format listing", () => {
    const stdout = [
      "Project 'MyApp' has the following package references",
      "   [net8.0]:",
      "   Top-level Package               Requested   Resolved",
      "   > Newtonsoft.Json                13.0.1      13.0.3",
      "   > Microsoft.Extensions.Logging   8.0.0       8.0.1",
    ].join("\n");

    const result = parseDotnetListPackageOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].project).toBe("MyApp");
    expect(result.projects[0].frameworks).toHaveLength(1);
    expect(result.projects[0].frameworks[0].framework).toBe("net8.0");
    expect(result.projects[0].frameworks[0].topLevel).toHaveLength(2);
    expect(result.projects[0].frameworks[0].topLevel![0]).toEqual({
      id: "Newtonsoft.Json",
      resolved: "13.0.3",
      latest: undefined,
      deprecated: undefined,
    });
  });

  it("parses JSON format listing", () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          path: "/home/user/MyApp/MyApp.csproj",
          frameworks: [
            {
              framework: "net8.0",
              topLevelPackages: [
                {
                  id: "Newtonsoft.Json",
                  requestedVersion: "13.0.1",
                  resolvedVersion: "13.0.3",
                  latestVersion: "13.0.3",
                },
              ],
            },
          ],
        },
      ],
    });

    const result = parseDotnetListPackageOutput(json, "", 0);
    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].frameworks[0].topLevel![0].id).toBe("Newtonsoft.Json");
    expect(result.projects[0].frameworks[0].topLevel![0].resolved).toBe("13.0.3");
    expect(result.projects[0].frameworks[0].topLevel![0].latest).toBe("13.0.3");
  });

  it("handles empty output", () => {
    const result = parseDotnetListPackageOutput("", "", 0);
    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(0);
  });

  it("parses text format with outdated column", () => {
    const stdout = [
      "Project 'MyApp' has the following package references",
      "   [net8.0]:",
      "   Top-level Package               Requested   Resolved   Latest",
      "   > Newtonsoft.Json                13.0.1      13.0.1     13.0.3",
    ].join("\n");

    const result = parseDotnetListPackageOutput(stdout, "", 0);
    expect(result.projects[0].frameworks[0].topLevel![0].latest).toBe("13.0.3");
  });
});
