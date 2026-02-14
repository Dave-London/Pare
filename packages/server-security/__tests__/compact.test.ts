import { describe, it, expect } from "vitest";
import {
  compactTrivyScanMap,
  formatTrivyScanCompact,
  compactSemgrepScanMap,
  formatSemgrepScanCompact,
  compactGitleaksScanMap,
  formatGitleaksScanCompact,
} from "../src/lib/formatters.js";
import type {
  TrivyScanResult,
  SemgrepScanResult,
  GitleaksScanResult,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// compactTrivyScanMap
// ---------------------------------------------------------------------------

describe("compactTrivyScanMap", () => {
  it("keeps target, scanType, totalVulnerabilities, summary; drops vulnerabilities array", () => {
    const data: TrivyScanResult = {
      target: "alpine:3.18",
      scanType: "image",
      vulnerabilities: [
        {
          id: "CVE-2023-1234",
          severity: "CRITICAL",
          package: "openssl",
          installedVersion: "1.1.1t-r0",
          fixedVersion: "1.1.1u-r0",
          title: "Buffer overflow in OpenSSL",
        },
        {
          id: "CVE-2023-5678",
          severity: "HIGH",
          package: "curl",
          installedVersion: "8.0.0-r0",
          fixedVersion: "8.1.0-r0",
        },
      ],
      summary: { critical: 1, high: 1, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 2,
    };

    const compact = compactTrivyScanMap(data);

    expect(compact.target).toBe("alpine:3.18");
    expect(compact.scanType).toBe("image");
    expect(compact.totalVulnerabilities).toBe(2);
    expect(compact.summary).toEqual({ critical: 1, high: 1, medium: 0, low: 0, unknown: 0 });
    // Verify dropped fields
    expect(compact).not.toHaveProperty("vulnerabilities");
  });

  it("handles zero vulnerabilities", () => {
    const data: TrivyScanResult = {
      target: "./",
      scanType: "fs",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 0,
    };

    const compact = compactTrivyScanMap(data);

    expect(compact.totalVulnerabilities).toBe(0);
    expect(compact).not.toHaveProperty("vulnerabilities");
  });
});

describe("formatTrivyScanCompact", () => {
  it("formats compact trivy scan output", () => {
    const compact = {
      target: "nginx:latest",
      scanType: "image" as const,
      totalVulnerabilities: 5,
      summary: { critical: 1, high: 2, medium: 1, low: 1, unknown: 0 },
    };
    const output = formatTrivyScanCompact(compact);
    expect(output).toContain("Trivy image scan: nginx:latest");
    expect(output).toContain("5 vulnerabilities");
    expect(output).toContain("1C/2H/1M/1L");
  });

  it("formats zero-vulnerability scan", () => {
    const compact = {
      target: "./",
      scanType: "fs" as const,
      totalVulnerabilities: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    };
    const output = formatTrivyScanCompact(compact);
    expect(output).toContain("0 vulnerabilities");
  });
});

// ---------------------------------------------------------------------------
// compactSemgrepScanMap
// ---------------------------------------------------------------------------

describe("compactSemgrepScanMap", () => {
  it("keeps totalFindings, summary, config; drops findings array", () => {
    const data: SemgrepScanResult = {
      totalFindings: 3,
      findings: [
        {
          ruleId: "python.lang.security.audit.dangerous-system-call",
          path: "src/app.py",
          startLine: 10,
          endLine: 10,
          message: "Avoid dangerous system calls",
          severity: "ERROR",
          category: "security",
        },
        {
          ruleId: "python.lang.best-practice.open-never-closed",
          path: "src/utils.py",
          startLine: 25,
          endLine: 25,
          message: "File handle never closed",
          severity: "WARNING",
        },
        {
          ruleId: "python.lang.style.useless-pass",
          path: "src/models.py",
          startLine: 42,
          endLine: 42,
          message: "Useless pass statement",
          severity: "INFO",
        },
      ],
      summary: { error: 1, warning: 1, info: 1 },
      config: "auto",
    };

    const compact = compactSemgrepScanMap(data);

    expect(compact.totalFindings).toBe(3);
    expect(compact.summary).toEqual({ error: 1, warning: 1, info: 1 });
    expect(compact.config).toBe("auto");
    // Verify dropped fields
    expect(compact).not.toHaveProperty("findings");
  });

  it("handles zero findings", () => {
    const data: SemgrepScanResult = {
      totalFindings: 0,
      findings: [],
      summary: { error: 0, warning: 0, info: 0 },
      config: "p/security-audit",
    };

    const compact = compactSemgrepScanMap(data);

    expect(compact.totalFindings).toBe(0);
    expect(compact.config).toBe("p/security-audit");
    expect(compact).not.toHaveProperty("findings");
  });
});

describe("formatSemgrepScanCompact", () => {
  it("formats compact semgrep scan output", () => {
    const compact = {
      totalFindings: 5,
      summary: { error: 2, warning: 2, info: 1 },
      config: "auto",
    };
    const output = formatSemgrepScanCompact(compact);
    expect(output).toContain("Semgrep scan (config: auto)");
    expect(output).toContain("5 findings");
    expect(output).toContain("2E/2W/1I");
  });
});

// ---------------------------------------------------------------------------
// compactGitleaksScanMap
// ---------------------------------------------------------------------------

describe("compactGitleaksScanMap", () => {
  it("keeps totalFindings; drops findings array", () => {
    const data: GitleaksScanResult = {
      totalFindings: 2,
      findings: [
        {
          ruleID: "generic-api-key",
          description: "Generic API Key",
          match: "API_KEY=abc123secret",
          secret: "abc123secret",
          file: ".env",
          startLine: 3,
          endLine: 3,
          commit: "abc123def456789012345678901234567890abcd",
          author: "dev@example.com",
          date: "2024-01-15",
        },
        {
          ruleID: "aws-access-key-id",
          description: "AWS Access Key ID",
          match: "AKIAIOSFODNN7EXAMPLE",
          secret: "AKIAIOSFODNN7EXAMPLE",
          file: "config/aws.yml",
          startLine: 10,
          endLine: 10,
          commit: "def456ghi789012345678901234567890abcdef12",
          author: "admin@example.com",
          date: "2024-02-20",
        },
      ],
      summary: { totalFindings: 2 },
    };

    const compact = compactGitleaksScanMap(data);

    expect(compact.totalFindings).toBe(2);
    // Verify dropped fields
    expect(compact).not.toHaveProperty("findings");
    expect(compact).not.toHaveProperty("summary");
  });

  it("handles zero findings", () => {
    const data: GitleaksScanResult = {
      totalFindings: 0,
      findings: [],
      summary: { totalFindings: 0 },
    };

    const compact = compactGitleaksScanMap(data);

    expect(compact.totalFindings).toBe(0);
    expect(compact).not.toHaveProperty("findings");
  });
});

describe("formatGitleaksScanCompact", () => {
  it("formats compact gitleaks scan output", () => {
    const compact = { totalFindings: 3 };
    const output = formatGitleaksScanCompact(compact);
    expect(output).toContain("Gitleaks scan");
    expect(output).toContain("3 secret(s) detected");
  });

  it("formats zero findings", () => {
    const compact = { totalFindings: 0 };
    const output = formatGitleaksScanCompact(compact);
    expect(output).toContain("0 secret(s) detected");
  });
});
