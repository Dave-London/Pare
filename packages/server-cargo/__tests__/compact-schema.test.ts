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
  compactClippyMap,
  compactRunMap,
  compactAddMap,
  compactRemoveMap,
  compactFmtMap,
  compactDocMap,
  compactUpdateMap,
  compactTreeMap,
  compactAuditMap,
} from "../src/lib/formatters.js";
import {
  CargoBuildResultSchema,
  CargoTestResultSchema,
  CargoClippyResultSchema,
  CargoRunResultSchema,
  CargoAddResultSchema,
  CargoRemoveResultSchema,
  CargoFmtResultSchema,
  CargoDocResultSchema,
  CargoUpdateResultSchema,
  CargoTreeResultSchema,
  CargoAuditResultSchema,
} from "../src/schemas/index.js";
import type { CargoAuditResult } from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

const diagnostic = {
  file: "src/main.rs",
  line: 3,
  column: 5,
  severity: "error" as const,
  code: "E0425",
  message: "cannot find value `foo`",
  suggestion: "did you mean `for`?",
};

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("build", () => {
    expectValid(
      CargoBuildResultSchema,
      compactBuildMap({
        success: false,
        diagnostics: [diagnostic],
        timings: { generated: true, format: "html", reportPath: "target/cargo-timings.html" },
        error: "tail",
        exitCode: 101,
      }),
    );
  });

  it("test", () => {
    expectValid(
      CargoTestResultSchema,
      compactTestMap({
        success: false,
        tests: [
          { name: "tests::works", status: "ok" },
          { name: "tests::broken", status: "FAILED", output: "assertion failed" },
        ],
        passed: 1,
        failed: 1,
        ignored: 0,
        compilationDiagnostics: [diagnostic],
        error: "tail",
        exitCode: 101,
      }),
    );
  });

  it("clippy", () => {
    expectValid(
      CargoClippyResultSchema,
      compactClippyMap({
        success: false,
        diagnostics: [diagnostic],
        error: "tail",
        exitCode: 101,
      }),
    );
  });

  it("run", () => {
    expectValid(
      CargoRunResultSchema,
      compactRunMap({
        exitCode: 1,
        success: false,
        stdout: "line\n".repeat(500),
        stderr: "err\n".repeat(500),
        failureType: "runtime",
        stdoutTruncated: true,
      }),
    );
  });

  it("add (compact packages field)", () => {
    const compact = compactAddMap({
      success: true,
      added: [
        { name: "serde", version: "1.0.200", featuresActivated: ["derive"] },
        { name: "tokio", version: "1.40.0" },
      ],
      dependencyType: "dev",
      dryRun: true,
    });
    expect(compact.packages).toEqual(["serde", "tokio"]);
    expectValid(CargoAddResultSchema, compact);
  });

  it("remove", () => {
    expectValid(
      CargoRemoveResultSchema,
      compactRemoveMap({
        success: false,
        removed: ["serde"],
        partialSuccess: true,
        failedPackages: ["tokio"],
        dependencyType: "normal",
        error: "not found",
      }),
    );
  });

  it("fmt", () => {
    expectValid(
      CargoFmtResultSchema,
      compactFmtMap({ success: false, needsFormatting: true, filesChanged: 3 }),
    );
  });

  it("doc", () => {
    expectValid(
      CargoDocResultSchema,
      compactDocMap({
        success: true,
        warnings: 1,
        warningDetails: [{ file: "src/lib.rs", line: 10, message: "missing docs" }],
      }),
    );
  });

  it("update", () => {
    expectValid(
      CargoUpdateResultSchema,
      compactUpdateMap({
        success: true,
        updated: [{ name: "serde", from: "1.0.199", to: "1.0.200" }],
        totalUpdated: 1,
      }),
    );
  });

  it("tree", () => {
    expectValid(
      CargoTreeResultSchema,
      compactTreeMap({
        success: true,
        dependencies: [{ name: "serde", version: "1.0.200", depth: 1 }],
        packages: 42,
      }),
    );
  });

  it("audit (truncation + top-level severity counts)", () => {
    const data: CargoAuditResult = {
      success: false,
      vulnerabilities: Array.from({ length: 15 }, (_, i) => ({
        id: `RUSTSEC-2024-${String(i).padStart(4, "0")}`,
        package: `crate${i}`,
        version: "1.0.0",
        severity: i % 2 === 0 ? ("high" as const) : ("medium" as const),
        title: `vuln ${i}`,
        patched: [">=1.0.1"],
        cvssScore: 7.5,
      })),
      summary: { total: 15, critical: 0, high: 8, medium: 7, low: 0, informational: 0, unknown: 0 },
      fixesApplied: 2,
      error: "tail",
      exitCode: 1,
    };
    const compact = compactAuditMap(data);
    expect(compact.omittedVulnerabilities).toBe(5);
    expect(compact.total).toBe(15);
    expectValid(CargoAuditResultSchema, compact);
  });
});
