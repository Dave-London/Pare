/**
 * Regression tests for #1022/#1025: compact mapper outputs must validate
 * against the registered Zod outputSchema the way the MCP SDK does (JSON
 * Schema with additionalProperties: false + AJV). Zod .parse() strips unknown
 * keys silently, so it cannot catch compact-only fields missing from schemas.
 */
import { describe, it, expect } from "vitest";
import { validateToolOutput } from "@paretools/shared/testing";
import {
  compactBuildMap,
  compactTestMap,
  compactVetMap,
  compactFmtMap,
  compactRunMap,
  compactGenerateMap,
  compactModTidyMap,
  compactEnvMap,
  compactListMap,
  compactGetMap,
  compactGolangciLintMap,
} from "../src/lib/formatters.js";
import {
  GoBuildResultSchema,
  GoTestResultSchema,
  GoVetResultSchema,
  GoFmtResultSchema,
  GoRunResultSchema,
  GoGenerateResultSchema,
  GoModTidyResultSchema,
  GoEnvResultSchema,
  GoListResultSchema,
  GoGetResultSchema,
  GolangciLintResultSchema,
} from "../src/schemas/index.js";
import type { GoEnvResult, GolangciLintResult } from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("build", () => {
    expectValid(
      GoBuildResultSchema,
      compactBuildMap({
        success: false,
        errors: [{ file: "main.go", line: 3, column: 5, message: "undefined: foo" }],
        rawErrors: ["package x is not in std"],
        buildCache: { estimatedHits: 3, estimatedMisses: 1, totalPackages: 4 },
      }),
    );
  });

  it("test", () => {
    expectValid(
      GoTestResultSchema,
      compactTestMap({
        success: false,
        passed: 3,
        failed: 1,
        skipped: 0,
        packageFailures: [{ package: "example.com/pkg", output: "build failed" }],
        error: "go: cannot find main module",
        exitCode: 1,
      }),
    );
  });

  it("vet", () => {
    expectValid(
      GoVetResultSchema,
      compactVetMap({
        success: false,
        diagnostics: [{ file: "main.go", line: 10, message: "printf verb mismatch" }],
      }),
    );
  });

  it("fmt", () => {
    expectValid(
      GoFmtResultSchema,
      compactFmtMap({
        success: false,
        filesChanged: 2,
        parseErrors: [{ file: "bad.go", line: 1, column: 1, message: "expected 'package'" }],
      }),
    );
  });

  it("run", () => {
    expectValid(
      GoRunResultSchema,
      compactRunMap({
        exitCode: 1,
        success: false,
        stdout: "line\n".repeat(500),
        stderr: "err\n".repeat(500),
        timedOut: true,
        stdoutTruncated: true,
      }),
    );
  });

  it("generate (directiveCount)", () => {
    const compact = compactGenerateMap({
      success: true,
      output: "generated",
      directives: [
        { file: "gen.go", line: 3, command: "stringer", status: "completed" },
        { file: "gen.go", line: 9, command: "mockgen", status: "completed" },
      ],
    });
    expect(compact.directiveCount).toBe(2);
    expectValid(GoGenerateResultSchema, compact);
  });

  it("mod-tidy (module counts)", () => {
    const compact = compactModTidyMap({
      success: true,
      summary: "tidied",
      madeChanges: true,
      addedModules: ["example.com/a v1.0.0", "example.com/b v2.0.0"],
      removedModules: ["example.com/c v0.1.0"],
    });
    expect(compact.addedModuleCount).toBe(2);
    expect(compact.removedModuleCount).toBe(1);
    expectValid(GoModTidyResultSchema, compact);
  });

  it("env (queried vars surface as top-level keys)", () => {
    const data: GoEnvResult = {
      success: true,
      vars: { GOCACHE: "/home/u/.cache/go-build", GOFLAGS: "-mod=mod" },
      goroot: "/usr/local/go",
      gopath: "/home/u/go",
      goversion: "go1.24.0",
      goos: "linux",
      goarch: "amd64",
      cgoEnabled: true,
    };
    const compact = compactEnvMap(data, ["GOCACHE", "GOFLAGS"]);
    expect(compact.GOCACHE).toBe("/home/u/.cache/go-build");
    expectValid(GoEnvResultSchema, compact);
  });

  it("list (packageCount)", () => {
    const compact = compactListMap({
      success: true,
      packages: [{ dir: "/p", importPath: "example.com/p", name: "p" }],
      modules: [{ path: "example.com/m", version: "v1.0.0" }],
    });
    expect(compact.packageCount).toBe(2);
    expectValid(GoListResultSchema, compact);
  });

  it("get (resolvedCount + failing packages)", () => {
    const compact = compactGetMap({
      success: false,
      resolvedPackages: [{ package: "example.com/a", newVersion: "v1.2.3" }],
      packages: [
        { path: "example.com/b", error: "connection timed out", errorType: "timeout" },
        { path: "example.com/a", version: "v1.2.3" },
      ],
    });
    expect(compact.resolvedCount).toBe(1);
    expectValid(GoGetResultSchema, compact);
  });

  it("golangci-lint (truncation triggered)", () => {
    const data: GolangciLintResult = {
      errors: 20,
      warnings: 5,
      resultsTruncated: true,
      diagnostics: Array.from({ length: 25 }, (_, i) => ({
        file: `pkg/file${i}.go`,
        line: i + 1,
        column: 2,
        linter: "govet",
        severity: i % 2 === 0 ? ("error" as const) : ("warning" as const),
        message: `issue ${i}`,
        fix: { text: "replacement" },
      })),
      error: "tail",
      exitCode: 1,
    };
    const compact = compactGolangciLintMap(data);
    expect(compact.diagnosticsOmitted).toBe(5);
    expectValid(GolangciLintResultSchema, compact);
  });
});
