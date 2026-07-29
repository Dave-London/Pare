/**
 * Regression tests for #1022/#1025: every compact mapper's output must
 * validate against the tool's registered Zod outputSchema the way the MCP SDK
 * does (JSON Schema with additionalProperties: false + AJV). Zod's .parse()
 * silently strips unknown keys, so plain parse() assertions cannot catch
 * compact-only fields missing from the schema.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateToolOutput } from "@paretools/shared/testing";
import {
  compactPytestMap,
  compactMypyMap,
  compactRuffMap,
  compactBlackMap,
  compactPipInstallMap,
  compactPipAuditMap,
  compactUvInstallMap,
  compactUvRunMap,
  compactPipListMap,
  compactPipShowMap,
  compactRuffFormatMap,
  compactCondaResultMap,
  compactPyenvMap,
  compactPoetryMap,
} from "../src/lib/formatters.js";
import {
  PytestResultSchema,
  MypyResultSchema,
  RuffResultSchema,
  BlackResultSchema,
  PipInstallSchema,
  PipAuditResultSchema,
  UvInstallSchema,
  UvRunSchema,
  PipListSchema,
  PipShowSchema,
  RuffFormatResultSchema,
  PoetryResultSchema,
} from "../src/schemas/index.js";
import type {
  PytestResult,
  MypyResult,
  RuffResult,
  PipAuditResult,
  PipList,
  PipShow,
  PoetryResult,
  CondaResult,
  PyenvResult,
} from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("pytest", () => {
    const data: PytestResult = {
      success: false,
      passed: 1,
      failed: 2,
      errors: 0,
      skipped: 1,
      warnings: 1,
      failures: [
        { test: "tests/test_a.py::test_one", message: "assert 1 == 2" },
        { test: "tests/test_a.py::test_two", message: "boom" },
      ],
      exitCode: 1,
      errorOutput: "tail of output",
    };
    expectValid(PytestResultSchema, compactPytestMap(data));
  });

  it("mypy (truncation triggered)", () => {
    const data: MypyResult = {
      success: false,
      diagnostics: Array.from({ length: 25 }, (_, i) => ({
        file: `src/mod_${i}.py`,
        line: i + 1,
        column: 3,
        severity: "error" as const,
        message: `bad type ${i}`,
        code: "arg-type",
      })),
      error: "tail",
      exitCode: 1,
    };
    const compact = compactMypyMap(data);
    expect(compact.truncated).toBe(true);
    expectValid(MypyResultSchema, compact);
  });

  it("ruff (truncation triggered)", () => {
    const data: RuffResult = {
      success: false,
      diagnostics: Array.from({ length: 25 }, (_, i) => ({
        file: `src/mod_${i}.py`,
        line: i + 1,
        column: 2,
        code: "E501",
        message: "line too long",
        fixable: i % 2 === 0,
      })),
      fixedCount: 2,
      error: "tail",
      exitCode: 1,
    };
    const compact = compactRuffMap(data);
    expect(compact.truncated).toBe(true);
    expectValid(RuffResultSchema, compact);
  });

  it("black", () => {
    expectValid(
      BlackResultSchema,
      compactBlackMap({
        success: false,
        filesChanged: 2,
        filesUnchanged: 5,
        errorType: "check_failed",
      }),
    );
  });

  it("pip-install", () => {
    expectValid(
      PipInstallSchema,
      compactPipInstallMap({
        success: false,
        alreadySatisfied: false,
        dryRun: true,
        error: "resolver error",
        exitCode: 1,
      }),
    );
  });

  it("pip-audit (truncation triggered)", () => {
    const data: PipAuditResult = {
      success: false,
      vulnerabilities: Array.from({ length: 12 }, (_, i) => ({
        name: `pkg${i}`,
        version: "1.0.0",
        id: `GHSA-${i}`,
        description: "x".repeat(200),
        fixVersions: ["1.0.1"],
        severity: i % 2 === 0 ? "HIGH" : undefined,
      })),
      skipped: [{ name: "local-pkg", reason: "not on PyPI" }],
      error: "tail",
      exitCode: 1,
    };
    const compact = compactPipAuditMap(data);
    expect(compact.truncated).toBe(true);
    expect(compact.skippedCount).toBe(1);
    expectValid(PipAuditResultSchema, compact);
  });

  it("uv-install", () => {
    expectValid(
      UvInstallSchema,
      compactUvInstallMap({
        success: false,
        error: "conflict",
        resolutionConflicts: [{ package: "numpy", constraint: ">=2" }],
      }),
    );
  });

  it("uv-run", () => {
    expectValid(
      UvRunSchema,
      compactUvRunMap({
        exitCode: 1,
        success: false,
        stdout: "line\n".repeat(500),
        stderr: "err\n".repeat(500),
        commandStderr: "err\n".repeat(500),
        truncated: true,
      }),
    );
  });

  it("pip-list (truncation triggered — the #1025 failure)", () => {
    const data: PipList = {
      success: true,
      packages: Array.from({ length: 60 }, (_, i) => ({
        name: `pkg${i}`,
        version: "1.0.0",
        latestVersion: i % 3 === 0 ? "2.0.0" : undefined,
      })),
    };
    const compact = compactPipListMap(data);
    expect(compact.total).toBe(60);
    expect(compact.truncated).toBe(true);
    expectValid(PipListSchema, compact);
  });

  it("pip-list (error path)", () => {
    expectValid(PipListSchema, compactPipListMap({ success: false, error: "invalid JSON output" }));
  });

  it("pip-show", () => {
    const data: PipShow = {
      success: true,
      name: "requests",
      version: "2.31.0",
      summary: "HTTP for Humans",
      requires: ["urllib3", "idna"],
      packages: [
        { name: "requests", version: "2.31.0", summary: "HTTP for Humans" },
        { name: "urllib3", version: "2.0.0", summary: "HTTP client" },
      ],
    };
    const compact = compactPipShowMap(data);
    expect(compact.packageCount).toBe(2);
    expectValid(PipShowSchema, compact);
  });

  it("ruff-format", () => {
    expectValid(
      RuffFormatResultSchema,
      compactRuffFormatMap({
        success: false,
        filesChanged: 0,
        filesUnchanged: 3,
        checkMode: true,
        error: "tail",
        exitCode: 2,
      }),
    );
  });

  it("poetry (truncation triggered)", () => {
    const data: PoetryResult = {
      success: true,
      packages: Array.from({ length: 60 }, (_, i) => ({
        name: `pkg${i}`,
        version: "1.0.0",
        description: "desc",
      })),
      artifacts: Array.from({ length: 60 }, (_, i) => ({ file: `dist/pkg-${i}.whl` })),
      messages: Array.from({ length: 25 }, (_, i) => `message ${i}`),
      error: "tail",
      exitCode: 1,
    };
    const compact = compactPoetryMap(data);
    expect(compact.truncated).toBe(true);
    expectValid(PoetryResultSchema, compact);
  });

  // conda and pyenv register a passthrough outputSchema, so extra compact-only
  // fields are allowed — locked here so a future schema tightening is caught.
  const passthroughSchema = z.object({ action: z.string() }).passthrough();

  it("conda (passthrough outputSchema)", () => {
    const data: CondaResult = {
      action: "list",
      packages: [{ name: "numpy", version: "2.0.0", channel: "defaults" }],
      total: 1,
      environment: "base",
    };
    expectValid(passthroughSchema, compactCondaResultMap(data));
  });

  it("pyenv (passthrough outputSchema)", () => {
    const data: PyenvResult = {
      action: "installList",
      success: true,
      availableVersions: Array.from({ length: 60 }, (_, i) => `3.${i}.0`),
    };
    const compact = compactPyenvMap(data);
    expect(compact.truncated).toBe(true);
    expectValid(passthroughSchema, compact);
  });
});
