import { describe, it, expect } from "vitest";
import { parseTrivyJson, parseSemgrepJson, parseGitleaksJson } from "../src/lib/parsers.js";

describe("parseTrivyJson", () => {
  it("parses a full Trivy JSON output with vulnerabilities", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "alpine:3.18 (alpine 3.18.6)",
          Vulnerabilities: [
            {
              VulnerabilityID: "CVE-2024-0001",
              Severity: "CRITICAL",
              PkgName: "libcrypto3",
              InstalledVersion: "3.1.4-r1",
              FixedVersion: "3.1.4-r5",
              Title: "OpenSSL buffer overflow",
            },
            {
              VulnerabilityID: "CVE-2024-0002",
              Severity: "HIGH",
              PkgName: "libssl3",
              InstalledVersion: "3.1.4-r1",
              FixedVersion: "3.1.4-r5",
              Title: "OpenSSL denial of service",
            },
            {
              VulnerabilityID: "CVE-2024-0003",
              Severity: "LOW",
              PkgName: "busybox",
              InstalledVersion: "1.36.1-r2",
              Title: "Minor issue",
            },
          ],
        },
      ],
    });

    const result = parseTrivyJson(json, "alpine:3.18", "image");

    expect(result.target).toBe("alpine:3.18");
    expect(result.scanType).toBe("image");
    expect(result.totalVulnerabilities).toBe(3);
    expect(result.vulnerabilities).toHaveLength(3);

    expect(result.vulnerabilities[0]).toEqual({
      id: "CVE-2024-0001",
      severity: "CRITICAL",
      package: "libcrypto3",
      installedVersion: "3.1.4-r1",
      fixedVersion: "3.1.4-r5",
      title: "OpenSSL buffer overflow",
    });

    expect(result.vulnerabilities[2].fixedVersion).toBeUndefined();

    expect(result.summary).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      low: 1,
      unknown: 0,
    });
  });

  it("handles empty Results array", () => {
    const json = JSON.stringify({ Results: [] });
    const result = parseTrivyJson(json, "clean-image:latest", "image");

    expect(result.target).toBe("clean-image:latest");
    expect(result.totalVulnerabilities).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
    expect(result.summary).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    });
  });

  it("handles null Vulnerabilities in a result", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "node:18",
          Vulnerabilities: null,
        },
      ],
    });

    const result = parseTrivyJson(json, "node:18", "image");
    expect(result.totalVulnerabilities).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseTrivyJson("not valid json", "target", "fs");

    expect(result.target).toBe("target");
    expect(result.scanType).toBe("fs");
    expect(result.totalVulnerabilities).toBe(0);
    expect(result.vulnerabilities).toEqual([]);
  });

  it("handles null Results", () => {
    const json = JSON.stringify({ Results: null });
    const result = parseTrivyJson(json, "myimage", "image");

    expect(result.totalVulnerabilities).toBe(0);
  });

  it("flattens vulnerabilities from multiple results", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "layer1",
          Vulnerabilities: [
            {
              VulnerabilityID: "CVE-2024-1111",
              Severity: "HIGH",
              PkgName: "pkg1",
              InstalledVersion: "1.0",
            },
          ],
        },
        {
          Target: "layer2",
          Vulnerabilities: [
            {
              VulnerabilityID: "CVE-2024-2222",
              Severity: "MEDIUM",
              PkgName: "pkg2",
              InstalledVersion: "2.0",
              FixedVersion: "2.1",
            },
          ],
        },
      ],
    });

    const result = parseTrivyJson(json, "multi-layer:latest", "image");

    expect(result.totalVulnerabilities).toBe(2);
    expect(result.summary.high).toBe(1);
    expect(result.summary.medium).toBe(1);
  });

  it("normalizes severity strings to uppercase", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "test",
          Vulnerabilities: [
            {
              VulnerabilityID: "CVE-2024-0001",
              Severity: "critical",
              PkgName: "pkg",
              InstalledVersion: "1.0",
            },
            {
              VulnerabilityID: "CVE-2024-0002",
              Severity: "High",
              PkgName: "pkg2",
              InstalledVersion: "2.0",
            },
          ],
        },
      ],
    });

    const result = parseTrivyJson(json, "test", "fs");

    expect(result.vulnerabilities[0].severity).toBe("CRITICAL");
    expect(result.vulnerabilities[1].severity).toBe("HIGH");
    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(1);
  });

  it("handles missing fields with defaults", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "test",
          Vulnerabilities: [
            {
              // Minimal: no VulnerabilityID, no PkgName, no InstalledVersion
            },
          ],
        },
      ],
    });

    const result = parseTrivyJson(json, "test", "image");

    expect(result.vulnerabilities[0]).toEqual({
      id: "UNKNOWN",
      severity: "UNKNOWN",
      package: "unknown",
      installedVersion: "unknown",
      fixedVersion: undefined,
      title: undefined,
    });
    expect(result.summary.unknown).toBe(1);
  });

  it("parses misconfigurations from config scans", () => {
    const json = JSON.stringify({
      Results: [
        {
          Target: "Dockerfile",
          Misconfigurations: [
            {
              ID: "DS001",
              Severity: "HIGH",
              Type: "dockerfile",
              Title: "Running as root",
              Message: "Specify a non-root user",
            },
            {
              ID: "DS002",
              Severity: "MEDIUM",
              Type: "dockerfile",
              Title: "COPY with ADD",
            },
          ],
        },
      ],
    });

    const result = parseTrivyJson(json, "./", "config");

    expect(result.scanType).toBe("config");
    expect(result.totalVulnerabilities).toBe(2);
    expect(result.vulnerabilities[0]).toEqual({
      id: "DS001",
      severity: "HIGH",
      package: "dockerfile",
      installedVersion: "N/A",
      fixedVersion: undefined,
      title: "Running as root",
    });
    expect(result.summary.high).toBe(1);
    expect(result.summary.medium).toBe(1);
  });
});

describe("parseSemgrepJson", () => {
  it("parses a full Semgrep JSON output with findings", () => {
    const json = JSON.stringify({
      results: [
        {
          check_id: "python.lang.security.audit.exec-detected",
          path: "app/main.py",
          start: { line: 42, col: 1 },
          end: { line: 42, col: 20 },
          extra: {
            message: "Detected use of exec(). This is dangerous.",
            severity: "ERROR",
            metadata: { category: "security" },
          },
        },
        {
          check_id: "python.lang.best-practice.open-never-closed",
          path: "app/utils.py",
          start: { line: 10, col: 5 },
          end: { line: 10, col: 30 },
          extra: {
            message: "File opened but never closed.",
            severity: "WARNING",
            metadata: { category: "best-practice" },
          },
        },
        {
          check_id: "python.lang.correctness.useless-comparison",
          path: "app/logic.py",
          start: { line: 5, col: 1 },
          end: { line: 5, col: 15 },
          extra: {
            message: "Useless comparison detected.",
            severity: "INFO",
          },
        },
      ],
    });

    const result = parseSemgrepJson(json, "auto");

    expect(result.config).toBe("auto");
    expect(result.totalFindings).toBe(3);
    expect(result.findings).toHaveLength(3);

    expect(result.findings[0]).toEqual({
      ruleId: "python.lang.security.audit.exec-detected",
      path: "app/main.py",
      startLine: 42,
      endLine: 42,
      message: "Detected use of exec(). This is dangerous.",
      severity: "ERROR",
      category: "security",
    });

    expect(result.findings[2].category).toBeUndefined();

    expect(result.summary).toEqual({
      error: 1,
      warning: 1,
      info: 1,
    });
  });

  it("handles empty results array", () => {
    const json = JSON.stringify({ results: [] });
    const result = parseSemgrepJson(json, "p/security-audit");

    expect(result.config).toBe("p/security-audit");
    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
    expect(result.summary).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("handles null results", () => {
    const json = JSON.stringify({ results: null });
    const result = parseSemgrepJson(json, "auto");

    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseSemgrepJson("not valid json", "auto");

    expect(result.config).toBe("auto");
    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
    expect(result.summary).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("normalizes severity strings to uppercase", () => {
    const json = JSON.stringify({
      results: [
        {
          check_id: "rule1",
          path: "test.py",
          start: { line: 1, col: 1 },
          end: { line: 1, col: 10 },
          extra: { message: "msg", severity: "error" },
        },
        {
          check_id: "rule2",
          path: "test.py",
          start: { line: 2, col: 1 },
          end: { line: 2, col: 10 },
          extra: { message: "msg", severity: "Warning" },
        },
      ],
    });

    const result = parseSemgrepJson(json, "auto");

    expect(result.findings[0].severity).toBe("ERROR");
    expect(result.findings[1].severity).toBe("WARNING");
    expect(result.summary.error).toBe(1);
    expect(result.summary.warning).toBe(1);
  });

  it("handles missing fields with defaults", () => {
    const json = JSON.stringify({
      results: [
        {
          // Minimal: no fields
        },
      ],
    });

    const result = parseSemgrepJson(json, "auto");

    expect(result.findings[0]).toEqual({
      ruleId: "unknown",
      path: "unknown",
      startLine: 0,
      endLine: 0,
      message: "",
      severity: "INFO",
      category: undefined,
    });
    expect(result.summary.info).toBe(1);
  });

  it("handles missing severity by defaulting to INFO", () => {
    const json = JSON.stringify({
      results: [
        {
          check_id: "rule1",
          path: "test.py",
          start: { line: 1, col: 1 },
          end: { line: 1, col: 10 },
          extra: { message: "No severity" },
        },
      ],
    });

    const result = parseSemgrepJson(json, "auto");
    expect(result.findings[0].severity).toBe("INFO");
    expect(result.summary.info).toBe(1);
  });
});

describe("parseGitleaksJson", () => {
  it("parses a full Gitleaks JSON output with findings", () => {
    const json = JSON.stringify([
      {
        RuleID: "generic-api-key",
        Description: "Generic API Key",
        Match: 'apiKey = "AKIAIOSFODNN7EXAMPLE"',
        Secret: "AKIAIOSFODNN7EXAMPLE",
        File: "config/settings.py",
        StartLine: 15,
        EndLine: 15,
        Commit: "abc123def456789",
        Author: "dev@example.com",
        Date: "2024-01-15T10:30:00Z",
      },
      {
        RuleID: "aws-secret-access-key",
        Description: "AWS Secret Access Key",
        Match: 'secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
        Secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        File: ".env",
        StartLine: 3,
        EndLine: 3,
        Commit: "def456abc789012",
        Author: "admin@example.com",
        Date: "2024-02-20T14:00:00Z",
      },
    ]);

    const result = parseGitleaksJson(json);

    expect(result.totalFindings).toBe(2);
    expect(result.findings).toHaveLength(2);

    expect(result.findings[0]).toEqual({
      ruleID: "generic-api-key",
      description: "Generic API Key",
      match: 'apiKey = "AKIAIOSFODNN7EXAMPLE"',
      secret: "AKI***PLE",
      file: "config/settings.py",
      startLine: 15,
      endLine: 15,
      commit: "abc123def456789",
      author: "dev@example.com",
      date: "2024-01-15T10:30:00Z",
    });

    // Secret should be redacted
    expect(result.findings[1].secret).toBe("wJa***KEY");

    expect(result.summary).toEqual({ totalFindings: 2 });
  });

  it("handles empty array", () => {
    const json = JSON.stringify([]);
    const result = parseGitleaksJson(json);

    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
    expect(result.summary).toEqual({ totalFindings: 0 });
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseGitleaksJson("not valid json");

    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
    expect(result.summary).toEqual({ totalFindings: 0 });
  });

  it("handles non-array JSON gracefully", () => {
    const json = JSON.stringify({ notAnArray: true });
    const result = parseGitleaksJson(json);

    expect(result.totalFindings).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it("handles missing fields with defaults", () => {
    const json = JSON.stringify([{}]);
    const result = parseGitleaksJson(json);

    expect(result.findings[0]).toEqual({
      ruleID: "unknown",
      description: "",
      match: "",
      secret: "***",
      file: "unknown",
      startLine: 0,
      endLine: 0,
      commit: "",
      author: "",
      date: "",
    });
  });

  it("redacts short secrets completely", () => {
    const json = JSON.stringify([
      {
        RuleID: "test-rule",
        Description: "Test",
        Secret: "abc",
        File: "test.txt",
        StartLine: 1,
        EndLine: 1,
      },
    ]);

    const result = parseGitleaksJson(json);
    expect(result.findings[0].secret).toBe("***");
  });

  it("redacts secrets of exactly 8 characters completely", () => {
    const json = JSON.stringify([
      {
        RuleID: "test-rule",
        Description: "Test",
        Secret: "12345678",
        File: "test.txt",
        StartLine: 1,
        EndLine: 1,
      },
    ]);

    const result = parseGitleaksJson(json);
    expect(result.findings[0].secret).toBe("***");
  });

  it("partially redacts secrets longer than 8 characters", () => {
    const json = JSON.stringify([
      {
        RuleID: "test-rule",
        Description: "Test",
        Secret: "123456789",
        File: "test.txt",
        StartLine: 1,
        EndLine: 1,
      },
    ]);

    const result = parseGitleaksJson(json);
    expect(result.findings[0].secret).toBe("123***789");
  });
});
