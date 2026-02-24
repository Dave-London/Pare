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

  it("parses text format with transitive packages", () => {
    const stdout = [
      "Project 'MyApp' has the following package references",
      "   [net8.0]:",
      "   Top-level Package               Requested   Resolved",
      "   > Newtonsoft.Json                13.0.1      13.0.3",
      "   Transitive Package              Resolved    Latest",
      "   > System.Buffers                 4.5.1       4.5.1",
    ].join("\n");

    const result = parseDotnetListPackageOutput(stdout, "", 0);
    expect(result.projects[0].frameworks[0].topLevel).toHaveLength(1);
    expect(result.projects[0].frameworks[0].transitive).toHaveLength(1);
    expect(result.projects[0].frameworks[0].transitive![0].id).toBe("System.Buffers");
  });

  it("parses text format with deprecated (D) tag", () => {
    const stdout = [
      "Project 'MyApp' has the following package references",
      "   [net8.0]:",
      "   Top-level Package               Requested   Resolved",
      "   > OldPkg (D)                     1.0.0       1.0.0",
    ].join("\n");

    const result = parseDotnetListPackageOutput(stdout, "", 0);
    expect(result.projects[0].frameworks[0].topLevel![0].deprecated).toBe(true);
  });

  it("parses JSON format with transitive packages", () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          path: "/home/user/MyApp/MyApp.csproj",
          frameworks: [
            {
              framework: "net8.0",
              topLevelPackages: [{ id: "A", resolvedVersion: "1.0" }],
              transitivePackages: [{ id: "B", resolvedVersion: "2.0", latestVersion: "3.0" }],
            },
          ],
        },
      ],
    });

    const result = parseDotnetListPackageOutput(json, "", 0);
    expect(result.projects[0].frameworks[0].transitive).toHaveLength(1);
    expect(result.projects[0].frameworks[0].transitive![0].id).toBe("B");
    expect(result.projects[0].frameworks[0].transitive![0].latest).toBe("3.0");
  });

  it("parses JSON format with deprecated packages", () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          path: "/home/user/MyApp/MyApp.csproj",
          frameworks: [
            {
              framework: "net8.0",
              topLevelPackages: [{ id: "OldPkg", resolvedVersion: "1.0", isDeprecated: true }],
            },
          ],
        },
      ],
    });

    const result = parseDotnetListPackageOutput(json, "", 0);
    expect(result.projects[0].frameworks[0].topLevel![0].deprecated).toBe(true);
  });

  it("falls back to text parsing when JSON is invalid", () => {
    const stdout = "not valid json {{{ garbage";
    const result = parseDotnetListPackageOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.projects).toHaveLength(0);
  });

  it("falls back to text when JSON has no projects", () => {
    const json = JSON.stringify({ version: 1, data: "no projects key" });
    const result = parseDotnetListPackageOutput(json, "", 0);
    expect(result.projects).toHaveLength(0);
  });

  it("handles JSON with missing optional fields", () => {
    const json = JSON.stringify({
      version: 1,
      projects: [
        {
          frameworks: [
            {
              topLevelPackages: [{ id: "Pkg" }],
            },
          ],
        },
      ],
    });

    const result = parseDotnetListPackageOutput(json, "", 0);
    expect(result.projects[0].project).toBe("unknown");
    expect(result.projects[0].frameworks[0].framework).toBe("unknown");
    expect(result.projects[0].frameworks[0].topLevel![0].resolved).toBe("unknown");
  });
});

// ── parseDotnetBuildOutput — additional edge cases ──────────────────

describe("parseDotnetBuildOutput — edge cases", () => {
  it("parses simple format diagnostic without column", () => {
    const stdout = "Program.cs(10): error CS1002: ; expected [/home/user/MyApp/MyApp.csproj]";

    const result = parseDotnetBuildOutput(stdout, "", 1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe("Program.cs");
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBeUndefined();
    expect(result.diagnostics[0].code).toBe("CS1002");
  });

  it("parses build-level warning without file location", () => {
    const stderr = "  warning NU1603: Some nuget warning [/home/user/MyApp/MyApp.csproj]";

    const result = parseDotnetBuildOutput("", stderr, 0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe("warning");
    expect(result.diagnostics[0].file).toBe("(build)");
  });
});

// ── parseDotnetTestOutput — additional edge cases ───────────────────

describe("parseDotnetTestOutput — edge cases", () => {
  it("falls back to counting tests when no summary line", () => {
    const stdout = ["  Passed  Test1 [1 ms]", "  Failed  Test2 [2 ms]", "  Skipped Test3"].join(
      "\n",
    );

    const result = parseDotnetTestOutput(stdout, "", 1);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.total).toBe(3);
  });

  it("handles failed test where error message section has no content lines", () => {
    const stdout = [
      "  Failed  MyApp.Tests.MathTests.FailingTest [5 ms]",
      "  Error Message:",
      "",
      "Total: 1, Passed: 0, Failed: 1, Skipped: 0",
    ].join("\n");

    const result = parseDotnetTestOutput(stdout, "", 1);
    expect(result.tests[0].errorMessage).toBeUndefined();
  });

  it("stops looking for error message when hitting another test result", () => {
    const stdout = [
      "  Failed  Test1 [5 ms]",
      "  Passed  Test2 [1 ms]",
      "",
      "Total: 2, Passed: 1, Failed: 1, Skipped: 0",
    ].join("\n");

    const result = parseDotnetTestOutput(stdout, "", 1);
    expect(result.tests[0].errorMessage).toBeUndefined();
    expect(result.tests[0].status).toBe("Failed");
  });
});

// ── parseDotnetRunOutput — additional edge cases ────────────────────

describe("parseDotnetRunOutput — edge cases", () => {
  it("truncates large stderr", () => {
    const large = "e".repeat(100);
    const result = parseDotnetRunOutput("", large, 1, 50);
    expect(result.stderr).toContain("[truncated]");
    expect(result.stderr!.length).toBeLessThan(large.length + 20);
  });

  it("returns timedOut as undefined when not timed out", () => {
    const result = parseDotnetRunOutput("ok", "", 0, 1048576);
    expect(result.timedOut).toBeUndefined();
  });
});

// ── parseDotnetPublishOutput — edge cases ───────────────────────────

describe("parseDotnetPublishOutput — edge cases", () => {
  it("parses publish with warnings", () => {
    const stdout = [
      "  MyApp -> /out/publish/",
      "Program.cs(5,3): warning CS0168: unused var [/home/user/MyApp.csproj]",
    ].join("\n");

    const result = parseDotnetPublishOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe("/out/publish/");
    expect(result.warnings).toHaveLength(1);
  });

  it("parses publish with errors", () => {
    const stdout = ["Program.cs(5,3): error CS1234: bad code [/home/user/MyApp.csproj]"].join("\n");

    const result = parseDotnetPublishOutput(stdout, "", 1);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("parses publish with build-level error", () => {
    const stderr = "  error NU1301: Unable to load service index";

    const result = parseDotnetPublishOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });
});

// ── parseDotnetRestoreOutput — edge cases ───────────────────────────

describe("parseDotnetRestoreOutput — edge cases", () => {
  it("parses restore with warnings", () => {
    const stdout = [
      "  Restored /home/user/MyApp.csproj",
      "Program.cs(5,3): warning CS0168: unused var [/home/user/MyApp.csproj]",
    ].join("\n");

    const result = parseDotnetRestoreOutput(stdout, "", 0);
    expect(result.success).toBe(true);
    expect(result.restoredProjects).toBe(1);
    expect(result.warnings).toHaveLength(1);
  });

  it("parses restore with errors", () => {
    const stderr = "Program.cs(5,3): error CS1234: bad code [/home/user/MyApp.csproj]";

    const result = parseDotnetRestoreOutput("", stderr, 1);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("parses restore with warning code format", () => {
    const stderr = "  warning NU1603: SomePackage 1.0.0 depends on OtherPkg";

    const result = parseDotnetRestoreOutput("", stderr, 0);
    expect(result.warnings).toHaveLength(1);
  });

  it("parses restore with error code format", () => {
    const stderr = "  error NU1301: Unable to load service index";

    const result = parseDotnetRestoreOutput("", stderr, 1);
    expect(result.errors).toHaveLength(1);
  });

  it("ignores 0 warnings and 0 errors in summary lines", () => {
    const stdout = ["  0 Warning(s)", "  0 Error(s)", "  Restored /home/user/MyApp.csproj"].join(
      "\n",
    );

    const result = parseDotnetRestoreOutput(stdout, "", 0);
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
    expect(result.restoredProjects).toBe(1);
  });

  it("parses fsproj and vbproj projects", () => {
    const stdout = [
      "  Restored /home/user/MyApp.fsproj",
      "  Restored /home/user/MyApp.vbproj",
    ].join("\n");

    const result = parseDotnetRestoreOutput(stdout, "", 0);
    expect(result.restoredProjects).toBe(2);
  });
});

// ── parseDotnetAddPackageOutput — edge cases ────────────────────────

describe("parseDotnetAddPackageOutput — edge cases", () => {
  it("parses add without version match", () => {
    const stdout = "Some output without PackageReference";
    const result = parseDotnetAddPackageOutput(stdout, "", 0, "MyPkg");
    expect(result.success).toBe(true);
    expect(result.version).toBeUndefined();
  });

  it("ignores 0 errors in summary lines", () => {
    const stdout = ["  0 Error(s)", "info : PackageReference for 'A' version '1.0' added"].join(
      "\n",
    );

    const result = parseDotnetAddPackageOutput(stdout, "", 0, "A");
    expect(result.errors).toBeUndefined();
    expect(result.version).toBe("1.0");
  });
});
