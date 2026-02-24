import { describe, it, expect } from "vitest";
import {
  formatTrivyScan,
  compactTrivyScanMap,
  formatTrivyScanCompact,
  formatSemgrepScan,
  compactSemgrepScanMap,
  formatSemgrepScanCompact,
  formatGitleaksScan,
  compactGitleaksScanMap,
  formatGitleaksScanCompact,
} from "../src/lib/formatters.js";
import type {
  TrivyScanResultInternal,
  SemgrepScanResultInternal,
  GitleaksScanResultInternal,
} from "../src/schemas/index.js";

// -- Full formatters ----------------------------------------------------------

describe("formatTrivyScan", () => {
  it("formats scan with vulnerabilities", () => {
    const data: TrivyScanResultInternal = {
      target: "alpine:3.18",
      scanType: "image",
      vulnerabilities: [
        {
          id: "CVE-2024-0001",
          severity: "CRITICAL",
          package: "libcrypto3",
          installedVersion: "3.1.4-r1",
          fixedVersion: "3.1.4-r5",
          title: "Buffer overflow",
        },
        {
          id: "CVE-2024-0002",
          severity: "HIGH",
          package: "libssl3",
          installedVersion: "3.1.4-r1",
        },
      ],
      summary: { critical: 1, high: 1, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 2,
    };

    const output = formatTrivyScan(data);

    expect(output).toContain("Trivy image scan: alpine:3.18");
    expect(output).toContain("Found 2 vulnerabilities");
    expect(output).toContain("1 critical");
    expect(output).toContain("1 high");
    expect(output).toContain(
      "[CRITICAL] CVE-2024-0001: libcrypto3@3.1.4-r1 -> 3.1.4-r5 - Buffer overflow",
    );
    expect(output).toContain("[HIGH] CVE-2024-0002: libssl3@3.1.4-r1");
    // No fixed version or title for second vuln
    expect(output).not.toContain("CVE-2024-0002: libssl3@3.1.4-r1 ->");
  });

  it("formats scan with no vulnerabilities", () => {
    const data: TrivyScanResultInternal = {
      target: "clean-image:latest",
      scanType: "image",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 0,
    };

    const output = formatTrivyScan(data);

    expect(output).toContain("Trivy image scan: clean-image:latest");
    expect(output).toContain("Found 0 vulnerabilities");
    // Should NOT have individual vulnerability lines
    expect(output).not.toContain("[");
  });

  it("formats filesystem scan", () => {
    const data: TrivyScanResultInternal = {
      target: "/app",
      scanType: "fs",
      vulnerabilities: [
        {
          id: "CVE-2024-1234",
          severity: "MEDIUM",
          package: "lodash",
          installedVersion: "4.17.20",
          fixedVersion: "4.17.21",
          title: "Prototype pollution",
        },
      ],
      summary: { critical: 0, high: 0, medium: 1, low: 0, unknown: 0 },
      totalVulnerabilities: 1,
    };

    const output = formatTrivyScan(data);

    expect(output).toContain("Trivy fs scan: /app");
    expect(output).toContain("1 medium");
  });
});

// -- Compact mappers and formatters -------------------------------------------

describe("compactTrivyScanMap", () => {
  it("keeps target, scanType, summary; drops vulnerabilities and totalVulnerabilities", () => {
    const data: TrivyScanResultInternal = {
      target: "alpine:3.18",
      scanType: "image",
      vulnerabilities: [
        {
          id: "CVE-2024-0001",
          severity: "CRITICAL",
          package: "libcrypto3",
          installedVersion: "3.1.4-r1",
          fixedVersion: "3.1.4-r5",
          title: "Buffer overflow",
        },
      ],
      summary: { critical: 1, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 1,
    };

    const compact = compactTrivyScanMap(data);

    expect(compact.target).toBe("alpine:3.18");
    expect(compact.scanType).toBe("image");
    expect(compact.summary.critical).toBe(1);
    expect(compact).not.toHaveProperty("vulnerabilities");
    expect(compact).not.toHaveProperty("totalVulnerabilities");
  });
});

describe("formatTrivyScanCompact", () => {
  it("formats compact summary (derives total from summary)", () => {
    const output = formatTrivyScanCompact({
      target: "alpine:3.18",
      scanType: "image",
      summary: { critical: 1, high: 2, medium: 1, low: 1, unknown: 0 },
    });

    expect(output).toBe("Trivy image scan: alpine:3.18 -- 5 vulnerabilities (1C/2H/1M/1L)");
  });

  it("formats compact with zero vulnerabilities", () => {
    const output = formatTrivyScanCompact({
      target: "clean:latest",
      scanType: "fs",
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    });

    expect(output).toBe("Trivy fs scan: clean:latest -- 0 vulnerabilities (0C/0H/0M/0L)");
  });
});

// -- Semgrep formatters -------------------------------------------------------

describe("formatSemgrepScan", () => {
  it("formats scan with findings", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 2,
      findings: [
        {
          ruleId: "python.lang.security.audit.exec-detected",
          path: "app/main.py",
          startLine: 42,
          endLine: 42,
          message: "Detected use of exec(). This is dangerous.",
          severity: "ERROR",
          category: "security",
        },
        {
          ruleId: "python.lang.best-practice.open-never-closed",
          path: "app/utils.py",
          startLine: 10,
          endLine: 10,
          message: "File opened but never closed.",
          severity: "WARNING",
        },
      ],
      summary: { error: 1, warning: 1, info: 0 },
      config: "auto",
    };

    const output = formatSemgrepScan(data);

    expect(output).toContain("Semgrep scan (config: auto)");
    expect(output).toContain("Found 2 findings");
    expect(output).toContain("1 error");
    expect(output).toContain("1 warning");
    expect(output).toContain(
      "[ERROR] python.lang.security.audit.exec-detected: app/main.py:42-42 [security]",
    );
    expect(output).toContain("Detected use of exec(). This is dangerous.");
    expect(output).toContain(
      "[WARNING] python.lang.best-practice.open-never-closed: app/utils.py:10-10",
    );
    // No category on second finding
    expect(output).not.toContain("open-never-closed: app/utils.py:10-10 [");
  });

  it("formats scan with no findings", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 0,
      findings: [],
      summary: { error: 0, warning: 0, info: 0 },
      config: "p/security-audit",
    };

    const output = formatSemgrepScan(data);

    expect(output).toContain("Semgrep scan (config: p/security-audit)");
    expect(output).toContain("Found 0 findings");
    expect(output).not.toContain("[");
  });
});

describe("compactSemgrepScanMap", () => {
  it("keeps summary; drops findings, totalFindings, config", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 2,
      findings: [
        {
          ruleId: "rule1",
          path: "test.py",
          startLine: 1,
          endLine: 1,
          message: "msg",
          severity: "ERROR",
        },
        {
          ruleId: "rule2",
          path: "test.py",
          startLine: 2,
          endLine: 2,
          message: "msg",
          severity: "WARNING",
        },
      ],
      summary: { error: 1, warning: 1, info: 0 },
      config: "auto",
    };

    const compact = compactSemgrepScanMap(data);

    expect(compact.summary.error).toBe(1);
    expect(compact.summary.warning).toBe(1);
    expect(compact).not.toHaveProperty("findings");
    expect(compact).not.toHaveProperty("totalFindings");
    expect(compact).not.toHaveProperty("config");
  });
});

describe("formatSemgrepScanCompact", () => {
  it("formats compact summary (derives total from summary)", () => {
    const output = formatSemgrepScanCompact({
      summary: { error: 2, warning: 2, info: 1 },
    });

    expect(output).toBe("Semgrep scan -- 5 findings (2E/2W/1I)");
  });

  it("formats compact with zero findings", () => {
    const output = formatSemgrepScanCompact({
      summary: { error: 0, warning: 0, info: 0 },
    });

    expect(output).toBe("Semgrep scan -- 0 findings (0E/0W/0I)");
  });
});

// -- Gitleaks formatters ------------------------------------------------------

describe("formatGitleaksScan", () => {
  it("formats scan with findings", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 2,
      findings: [
        {
          ruleID: "generic-api-key",
          description: "Generic API Key",
          match: 'apiKey = "AKI***PLE"',
          secret: "AKI***PLE",
          file: "config/settings.py",
          startLine: 15,
          endLine: 15,
          commit: "abc123def456789",
          author: "dev@example.com",
          date: "2024-01-15T10:30:00Z",
        },
        {
          ruleID: "aws-secret-access-key",
          description: "AWS Secret Access Key",
          match: 'secret_key = "wJa***KEY"',
          secret: "wJa***KEY",
          file: ".env",
          startLine: 3,
          endLine: 3,
          commit: "def456abc789012",
          author: "admin@example.com",
          date: "2024-02-20T14:00:00Z",
        },
      ],
      summary: { totalFindings: 2 },
    };

    const output = formatGitleaksScan(data);

    expect(output).toContain("Gitleaks secret detection scan");
    expect(output).toContain("Found 2 secret(s)");
    expect(output).toContain("[generic-api-key] config/settings.py:15-15 (commit: abc123de)");
    expect(output).toContain("Generic API Key -- secret: AKI***PLE");
    expect(output).toContain("[aws-secret-access-key] .env:3-3 (commit: def456ab)");
  });

  it("formats scan with no findings", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 0,
      findings: [],
      summary: { totalFindings: 0 },
    };

    const output = formatGitleaksScan(data);

    expect(output).toContain("Gitleaks secret detection scan");
    expect(output).toContain("Found 0 secret(s)");
    expect(output).not.toContain("[");
  });
});

describe("compactGitleaksScanMap", () => {
  it("returns empty object; drops findings and totalFindings", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 2,
      findings: [
        {
          ruleID: "rule1",
          description: "desc",
          match: "match",
          secret: "***",
          file: "test.py",
          startLine: 1,
          endLine: 1,
          commit: "abc123",
          author: "dev",
          date: "2024-01-01",
        },
      ],
      summary: { totalFindings: 2 },
    };

    const compact = compactGitleaksScanMap(data);

    expect(compact).not.toHaveProperty("findings");
    expect(compact).not.toHaveProperty("totalFindings");
    expect(compact).not.toHaveProperty("summary");
  });
});

describe("formatGitleaksScanCompact", () => {
  it("formats compact summary", () => {
    const output = formatGitleaksScanCompact({});
    expect(output).toContain("Gitleaks scan");
  });
});
