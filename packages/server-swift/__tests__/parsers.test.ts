import { describe, it, expect } from "vitest";
import {
  parseBuildOutput,
  parseTestOutput,
  parseRunOutput,
  parsePackageResolveOutput,
  parsePackageUpdateOutput,
  parsePackageShowDependenciesOutput,
  parsePackageCleanOutput,
  parsePackageInitOutput,
} from "../src/lib/parsers.js";

describe("parseBuildOutput", () => {
  it("parses build with errors", () => {
    const stderr = [
      "/path/to/Sources/Main.swift:10:5: error: use of unresolved identifier 'foo'",
      "/path/to/Sources/Main.swift:15:3: warning: result of call to 'bar()' is unused",
    ].join("\n");

    const result = parseBuildOutput("", stderr, 1, 1234, false);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      file: "/path/to/Sources/Main.swift",
      line: 10,
      column: 5,
      severity: "error",
      message: "use of unresolved identifier 'foo'",
    });
    expect(result.warnings[0]).toEqual({
      file: "/path/to/Sources/Main.swift",
      line: 15,
      column: 3,
      severity: "warning",
      message: "result of call to 'bar()' is unused",
    });
    expect(result.duration).toBe(1234);
    expect(result.timedOut).toBe(false);
  });

  it("parses clean build", () => {
    const stdout = "Build complete! (0.52s)\n";
    const result = parseBuildOutput(stdout, "", 0, 520, false);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.timedOut).toBe(false);
  });

  it("handles timed out build", () => {
    const result = parseBuildOutput("", "timed out", 124, 300000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBe(124);
  });

  it("parses notes as warnings", () => {
    const stderr = "/path/to/Sources/Lib.swift:20:10: note: did you mean 'baz'?";

    const result = parseBuildOutput("", stderr, 1, 100, false);

    // Notes go into warnings array (non-error)
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].severity).toBe("note");
  });

  it("handles empty output", () => {
    const result = parseBuildOutput("", "", 0, 50, false);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("parseTestOutput", () => {
  it("parses XCTest format results", () => {
    const stdout = [
      "Test Suite 'All tests' started at 2024-01-01 00:00:00.000.",
      "Test Suite 'MyTests' started at 2024-01-01 00:00:00.000.",
      "Test Case '-[MyTests.MyTests testAdd]' passed (0.001 seconds).",
      "Test Case '-[MyTests.MyTests testSub]' passed (0.002 seconds).",
      "Test Case '-[MyTests.MyTests testDiv]' failed (0.003 seconds).",
      "Test Suite 'MyTests' failed at 2024-01-01 00:00:00.006.",
      "Test Suite 'All tests' failed at 2024-01-01 00:00:00.006.",
    ].join("\n");

    const result = parseTestOutput(stdout, "", 1, 6);

    expect(result.success).toBe(false);
    expect(result.total).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.testCases[0]).toEqual({
      name: "MyTests.MyTests testAdd",
      status: "passed",
      duration: 0.001,
    });
    expect(result.testCases[2]).toEqual({
      name: "MyTests.MyTests testDiv",
      status: "failed",
      duration: 0.003,
    });
  });

  it("parses all passing tests", () => {
    const stdout = [
      "Test Case '-[MyTests.MyTests testAdd]' passed (0.001 seconds).",
      "Test Case '-[MyTests.MyTests testSub]' passed (0.002 seconds).",
    ].join("\n");

    const result = parseTestOutput(stdout, "", 0, 3);

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("handles empty test output", () => {
    const result = parseTestOutput("", "", 0, 50);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("parses Swift Testing format", () => {
    const stdout = [
      'Test "testExample" passed after 0.005 seconds.',
      'Test "testFailing" failed after 0.002 seconds.',
    ].join("\n");

    const result = parseTestOutput(stdout, "", 1, 7);

    expect(result.total).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.testCases[0].name).toBe("testExample");
    expect(result.testCases[1].name).toBe("testFailing");
  });
});

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("Hello, World!\n", "", 0, 100, false);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Hello, World!\n");
    expect(result.stderr).toBe("");
    expect(result.timedOut).toBe(false);
  });

  it("parses failed run", () => {
    const result = parseRunOutput("", "Fatal error: Index out of range\n", 1, 200, false);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Fatal error");
  });

  it("handles timed out run", () => {
    const result = parseRunOutput("partial output", "timed out", 124, 300000, true);

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });
});

describe("parsePackageResolveOutput", () => {
  it("parses resolve output with computed packages", () => {
    const stderr = [
      "Fetching https://github.com/apple/swift-argument-parser.git from cache",
      "Fetched https://github.com/apple/swift-argument-parser.git from cache (0.34s)",
      "Computing version for swift-argument-parser",
      "Computed swift-argument-parser at 1.2.3 (0.01s)",
    ].join("\n");

    const result = parsePackageResolveOutput("", stderr, 0, 500);

    expect(result.success).toBe(true);
    expect(result.resolvedPackages).toHaveLength(1);
    expect(result.resolvedPackages[0]).toEqual({
      name: "swift-argument-parser",
      url: "https://github.com/apple/swift-argument-parser.git",
      version: "1.2.3",
    });
  });

  it("handles empty resolve", () => {
    const result = parsePackageResolveOutput("", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.resolvedPackages).toHaveLength(0);
  });

  it("handles failed resolve", () => {
    const result = parsePackageResolveOutput("", "error: unable to resolve", 1, 200);

    expect(result.success).toBe(false);
  });
});

describe("parsePackageUpdateOutput", () => {
  it("parses update output with version changes", () => {
    const stderr = [
      "Updating https://github.com/apple/swift-argument-parser.git",
      "Updated swift-argument-parser from 1.2.3 to 1.3.0",
    ].join("\n");

    const result = parsePackageUpdateOutput("", stderr, 0, 800);

    expect(result.success).toBe(true);
    expect(result.updatedPackages).toHaveLength(1);
    expect(result.updatedPackages[0]).toEqual({
      name: "swift-argument-parser",
      oldVersion: "1.2.3",
      newVersion: "1.3.0",
    });
  });

  it("handles update with URL-only references", () => {
    const stderr = "Updating https://github.com/apple/swift-log.git\n";

    const result = parsePackageUpdateOutput("", stderr, 0, 300);

    expect(result.success).toBe(true);
    expect(result.updatedPackages).toHaveLength(1);
    expect(result.updatedPackages[0].name).toBe("swift-log");
  });

  it("handles no updates needed", () => {
    const result = parsePackageUpdateOutput("Everything is already up-to-date", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.updatedPackages).toHaveLength(0);
  });
});

describe("parsePackageShowDependenciesOutput", () => {
  it("parses text tree format", () => {
    const stdout = [
      ".",
      "├── swift-argument-parser https://github.com/apple/swift-argument-parser.git @ 1.2.3",
      "│   └── swift-system https://github.com/apple/swift-system.git @ 1.0.0",
      "└── swift-log https://github.com/apple/swift-log.git @ 1.5.0",
    ].join("\n");

    const result = parsePackageShowDependenciesOutput(stdout, "", 0);

    expect(result.success).toBe(true);
    expect(result.dependencies).toHaveLength(3);
    expect(result.dependencies[0]).toEqual({
      name: "swift-argument-parser",
      url: "https://github.com/apple/swift-argument-parser.git",
      version: "1.2.3",
    });
  });

  it("parses JSON format", () => {
    const json = {
      name: "MyPackage",
      url: "file:///path/to/MyPackage",
      version: "unspecified",
      path: "/path/to/MyPackage",
      dependencies: [
        {
          name: "swift-log",
          url: "https://github.com/apple/swift-log.git",
          version: "1.5.0",
          dependencies: [],
        },
      ],
    };

    const result = parsePackageShowDependenciesOutput(JSON.stringify(json), "", 0);

    expect(result.success).toBe(true);
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies[0].name).toBe("MyPackage");
    expect(result.dependencies[1].name).toBe("swift-log");
  });

  it("handles no dependencies", () => {
    const result = parsePackageShowDependenciesOutput(".\n", "", 0);

    expect(result.success).toBe(true);
    expect(result.dependencies).toHaveLength(0);
  });

  it("handles failure", () => {
    const result = parsePackageShowDependenciesOutput("", "error: not a package", 1);

    expect(result.success).toBe(false);
    expect(result.dependencies).toHaveLength(0);
  });
});

describe("parsePackageCleanOutput", () => {
  it("parses successful clean", () => {
    const result = parsePackageCleanOutput(0, 150);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBe(150);
  });

  it("parses failed clean", () => {
    const result = parsePackageCleanOutput(1, 50);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});

describe("parsePackageInitOutput", () => {
  it("parses init output with created files", () => {
    const stdout = [
      "Creating library package: MyLib",
      "Creating Package.swift",
      "Creating .gitignore",
      "Creating Sources/",
      "Creating Sources/MyLib/MyLib.swift",
      "Creating Tests/",
      "Creating Tests/MyLibTests/MyLibTests.swift",
    ].join("\n");

    const result = parsePackageInitOutput(stdout, "", 0, 500);

    expect(result.success).toBe(true);
    expect(result.createdFiles).toEqual([
      "Package.swift",
      ".gitignore",
      "Sources/",
      "Sources/MyLib/MyLib.swift",
      "Tests/",
      "Tests/MyLibTests/MyLibTests.swift",
    ]);
    expect(result.duration).toBe(500);
  });

  it("handles empty init output", () => {
    const result = parsePackageInitOutput("", "", 0, 100);

    expect(result.success).toBe(true);
    expect(result.createdFiles).toHaveLength(0);
  });

  it("handles failed init", () => {
    const result = parsePackageInitOutput("", "error: directory not empty", 1, 50);

    expect(result.success).toBe(false);
  });
});
