/**
 * Regression tests for #1022/#1025: compact mapper outputs must validate
 * against the registered Zod outputSchema the way the MCP SDK does (JSON
 * Schema with additionalProperties: false + AJV). Zod .parse() strips unknown
 * keys silently, so it cannot catch compact-only fields missing from schemas.
 */
import { describe, it, expect } from "vitest";
import { validateToolOutput } from "@paretools/shared/testing";
import {
  compactTrivyScanMap,
  compactSemgrepScanMap,
  compactGitleaksScanMap,
} from "../src/lib/formatters.js";
import {
  TrivyScanResultSchema,
  SemgrepScanResultSchema,
  GitleaksScanResultSchema,
} from "../src/schemas/index.js";
import type {
  TrivyScanResultInternal,
  SemgrepScanResultInternal,
  GitleaksScanResultInternal,
} from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("trivy (truncation triggered)", () => {
    const data: TrivyScanResultInternal = {
      target: "alpine:3.18",
      scanType: "image",
      vulnerabilities: Array.from({ length: 25 }, (_, i) => ({
        id: `CVE-2024-${1000 + i}`,
        severity: i % 2 === 0 ? "CRITICAL" : "HIGH",
        package: `libfoo${i}`,
        installedVersion: "1.0.0",
        fixedVersion: "1.0.1",
        title: `vuln ${i}`,
      })),
      totalVulnerabilities: 25,
      summary: { critical: 13, high: 12, medium: 0, low: 0, unknown: 0 },
      error: "tail",
      exitCode: 1,
    };
    const compact = compactTrivyScanMap(data);
    expect(compact.vulnerabilitiesTruncated).toBe(true);
    expectValid(TrivyScanResultSchema, compact);
  });

  it("semgrep (truncation triggered)", () => {
    const data: SemgrepScanResultInternal = {
      findings: Array.from({ length: 25 }, (_, i) => ({
        ruleId: `rule.${i}`,
        path: `src/file${i}.py`,
        startLine: i + 1,
        endLine: i + 2,
        message: `finding ${i}`,
        severity: "ERROR",
        category: "security",
      })),
      totalFindings: 25,
      config: "auto",
      errors: [{ type: "ParseError", message: "could not parse", path: "src/bad.py" }],
      summary: { error: 25, warning: 0, info: 0 },
      error: "tail",
      exitCode: 1,
    };
    const compact = compactSemgrepScanMap(data);
    expect(compact.findingsTruncated).toBe(true);
    expectValid(SemgrepScanResultSchema, compact);
  });

  it("gitleaks (truncation triggered)", () => {
    const data: GitleaksScanResultInternal = {
      findings: Array.from({ length: 25 }, (_, i) => ({
        ruleID: "generic-api-key",
        match: `key=${i}`,
        secret: `secret${i}`,
        file: `src/config${i}.ts`,
        startLine: i + 1,
        endLine: i + 1,
        commit: "abc123",
        description: "Generic API key",
        author: "dev",
        date: "2026-01-01",
      })),
      totalFindings: 25,
      error: "tail",
      exitCode: 1,
    };
    const compact = compactGitleaksScanMap(data);
    expect(compact.findingsTruncated).toBe(true);
    expectValid(GitleaksScanResultSchema, compact);
  });
});
