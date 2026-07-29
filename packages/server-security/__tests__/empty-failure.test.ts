import { describe, it, expect } from "vitest";
import { surfaceEmptyFailure } from "@paretools/shared";
import { parseTrivyJson, parseSemgrepJson, parseGitleaksJson } from "../src/lib/parsers.js";
import {
  schemaTrivyScanMap,
  schemaSemgrepScanMap,
  schemaGitleaksScanMap,
  formatTrivyScan,
  formatSemgrepScan,
  formatGitleaksScan,
} from "../src/lib/formatters.js";
import {
  TrivyScanResultSchema,
  SemgrepScanResultSchema,
  GitleaksScanResultSchema,
} from "../src/schemas/index.js";

// These tests replicate the exact composition used in each tool handler:
// surfaceEmptyFailure(parseX(result.stdout), result, { isEmpty: parseFailed && no findings })
// covering the two critical cases per tool (epic #1024):
//   1. findings-found: non-zero exit with a parseable report -> NO error attached
//   2. crash: non-zero exit with unparseable output -> error + exitCode attached

// ---------------------------------------------------------------------------
// Trivy
// ---------------------------------------------------------------------------

describe("trivy silent-failure surfacing", () => {
  const trivyReportWithVulns = JSON.stringify({
    Results: [
      {
        Target: "alpine:3.18",
        Vulnerabilities: [
          {
            VulnerabilityID: "CVE-2023-1234",
            Severity: "CRITICAL",
            PkgName: "openssl",
            InstalledVersion: "1.1.1t-r0",
            FixedVersion: "1.1.1u-r0",
          },
        ],
      },
    ],
  });

  it("does not attach error when vulnerabilities are found with --exit-code (successful scan)", () => {
    // trivy --exit-code 1 exits 1 when vulnerabilities are found
    const result = { exitCode: 1, stdout: trivyReportWithVulns, stderr: "" };
    const data = surfaceEmptyFailure(
      parseTrivyJson(result.stdout, "alpine:3.18", "image"),
      result,
      {
        isEmpty: (d) => d.parseFailed === true && d.totalVulnerabilities === 0,
      },
    );

    expect(data.totalVulnerabilities).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("attaches stderr tail when trivy crashes without a report", () => {
    const result = {
      exitCode: 1,
      stdout: "",
      stderr: "FATAL image scan error: unable to find the specified image",
    };
    const data = surfaceEmptyFailure(parseTrivyJson(result.stdout, "nosuch:img", "image"), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalVulnerabilities === 0,
    });

    expect(data.error).toContain("unable to find the specified image");
    expect(data.exitCode).toBe(1);
    // Full-mode structured output carries the error and stays schema-valid
    const structured = schemaTrivyScanMap(data);
    expect(structured.error).toContain("unable to find the specified image");
    expect(() => TrivyScanResultSchema.parse(structured)).not.toThrow();
    expect(structured).not.toHaveProperty("parseFailed");
    // Text channel surfaces the failure
    expect(formatTrivyScan(data)).toContain("Scan failed");
  });

  it("does not attach error on a clean scan (exit 0, empty report)", () => {
    const result = { exitCode: 0, stdout: JSON.stringify({ Results: [] }), stderr: "" };
    const data = surfaceEmptyFailure(parseTrivyJson(result.stdout, "img", "image"), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalVulnerabilities === 0,
    });
    expect(data.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Semgrep
// ---------------------------------------------------------------------------

describe("semgrep silent-failure surfacing", () => {
  const semgrepReportWithFindings = JSON.stringify({
    results: [
      {
        check_id: "python.lang.security.audit.dangerous-system-call",
        path: "src/app.py",
        start: { line: 10 },
        end: { line: 10 },
        extra: { message: "Avoid dangerous system calls", severity: "ERROR" },
      },
    ],
  });

  it("does not attach error when findings are found with non-zero exit (--error semantics)", () => {
    // semgrep --error exits 1 when findings are present
    const result = { exitCode: 1, stdout: semgrepReportWithFindings, stderr: "" };
    const data = surfaceEmptyFailure(parseSemgrepJson(result.stdout, "auto"), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    expect(data.totalFindings).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("does not attach error when a valid report carries its own errors[]", () => {
    const report = JSON.stringify({
      results: [],
      errors: [{ type: "ParseError", message: "invalid syntax", path: "bad.py" }],
    });
    const result = { exitCode: 2, stdout: report, stderr: "" };
    const data = surfaceEmptyFailure(parseSemgrepJson(result.stdout, "auto"), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    // Report parsed fine; failure detail is already in errors[]
    expect(data.error).toBeUndefined();
    expect(data.errors).toHaveLength(1);
  });

  it("attaches stderr tail when semgrep crashes without a report", () => {
    const result = {
      exitCode: 2,
      stdout: "",
      stderr: "[ERROR] Invalid rule schema in config 'broken.yml'",
    };
    const data = surfaceEmptyFailure(parseSemgrepJson(result.stdout, "broken.yml"), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    expect(data.error).toContain("Invalid rule schema");
    expect(data.exitCode).toBe(2);
    const structured = schemaSemgrepScanMap(data);
    expect(structured.error).toContain("Invalid rule schema");
    expect(() => SemgrepScanResultSchema.parse(structured)).not.toThrow();
    expect(formatSemgrepScan(data)).toContain("Scan failed");
  });
});

// ---------------------------------------------------------------------------
// Gitleaks
// ---------------------------------------------------------------------------

describe("gitleaks silent-failure surfacing", () => {
  const gitleaksReportWithLeaks = JSON.stringify([
    {
      RuleID: "aws-access-key-id",
      Description: "AWS Access Key ID",
      Match: "AKIAIOSFODNN7EXAMPLE",
      Secret: "AKIAIOSFODNN7EXAMPLE",
      File: "config/aws.yml",
      StartLine: 10,
      EndLine: 10,
      Commit: "def456",
      Author: "admin@example.com",
      Date: "2024-02-20",
    },
  ]);

  it("does not attach error when leaks are found (exit 1 is a successful scan)", () => {
    // gitleaks exits 1 when leaks ARE found — that is a successful scan
    const result = { exitCode: 1, stdout: gitleaksReportWithLeaks, stderr: "" };
    const data = surfaceEmptyFailure(parseGitleaksJson(result.stdout), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    expect(data.totalFindings).toBe(1);
    expect(data.error).toBeUndefined();
  });

  it("attaches stderr tail when gitleaks crashes without a report", () => {
    const result = {
      exitCode: 1,
      stdout: "",
      stderr: "ERR failed to load config: yaml: unmarshal errors",
    };
    const data = surfaceEmptyFailure(parseGitleaksJson(result.stdout), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    expect(data.error).toContain("failed to load config");
    expect(data.exitCode).toBe(1);
    const structured = schemaGitleaksScanMap(data);
    expect(structured.error).toContain("failed to load config");
    expect(() => GitleaksScanResultSchema.parse(structured)).not.toThrow();
    expect(structured).not.toHaveProperty("parseFailed");
    expect(formatGitleaksScan(data)).toContain("Scan failed");
  });

  it("does not attach error on a clean scan (exit 0, empty array)", () => {
    const result = { exitCode: 0, stdout: "[]", stderr: "" };
    const data = surfaceEmptyFailure(parseGitleaksJson(result.stdout), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });
    expect(data.error).toBeUndefined();
  });

  it("uses a fallback message when both streams are empty", () => {
    const result = { exitCode: 126, stdout: "", stderr: "" };
    const data = surfaceEmptyFailure(parseGitleaksJson(result.stdout), result, {
      isEmpty: (d) => d.parseFailed === true && d.totalFindings === 0,
    });

    expect(data.error).toContain("exited with code 126");
    expect(data.exitCode).toBe(126);
  });
});
