import { describe, it, expect } from "vitest";
import {
  COMPACT_MAX_FINDINGS,
  compactTrivyScanMap,
  formatTrivyScanCompact,
  compactSemgrepScanMap,
  formatSemgrepScanCompact,
  compactGitleaksScanMap,
  formatGitleaksScanCompact,
} from "../src/lib/formatters.js";
import {
  TrivyScanResultSchema,
  SemgrepScanResultSchema,
  GitleaksScanResultSchema,
} from "../src/schemas/index.js";
import type {
  TrivyScanResultInternal,
  TrivyVulnerabilityInternal,
  SemgrepScanResultInternal,
  SemgrepFindingInternal,
  GitleaksScanResultInternal,
  GitleaksFindingInternal,
} from "../src/schemas/index.js";

function makeTrivyVuln(i: number, severity: string): TrivyVulnerabilityInternal {
  return {
    id: `CVE-2023-${1000 + i}`,
    severity,
    package: `pkg${i}`,
    installedVersion: "1.0.0",
    fixedVersion: "1.0.1",
    title: `Vuln ${i}`,
  };
}

function makeSemgrepFinding(i: number, severity: string): SemgrepFindingInternal {
  return {
    ruleId: `rule.${i}`,
    path: `src/file${i}.py`,
    startLine: i,
    endLine: i,
    message: `Finding ${i}`,
    severity,
  };
}

function makeGitleaksFinding(i: number): GitleaksFindingInternal {
  return {
    ruleID: `rule-${i}`,
    description: `Rule ${i}`,
    match: `MATCH_${i}=secretvalue`,
    secret: "abc***xyz",
    file: `src/file${i}.env`,
    startLine: i,
    endLine: i,
    commit: "abc123def456789012345678901234567890abcd",
    author: "dev@example.com",
    date: "2024-01-15",
  };
}

// ---------------------------------------------------------------------------
// compactTrivyScanMap
// ---------------------------------------------------------------------------

describe("compactTrivyScanMap", () => {
  it("keeps target, scanType, summary and the critical/high vulnerabilities", () => {
    const data: TrivyScanResultInternal = {
      target: "alpine:3.18",
      scanType: "image",
      vulnerabilities: [
        makeTrivyVuln(1, "CRITICAL"),
        makeTrivyVuln(2, "HIGH"),
        makeTrivyVuln(3, "MEDIUM"),
        makeTrivyVuln(4, "LOW"),
      ],
      summary: { critical: 1, high: 1, medium: 1, low: 1, unknown: 0 },
      totalVulnerabilities: 4,
    };

    const compact = compactTrivyScanMap(data);

    expect(compact.target).toBe("alpine:3.18");
    expect(compact.scanType).toBe("image");
    expect(compact.summary).toEqual({ critical: 1, high: 1, medium: 1, low: 1, unknown: 0 });
    // Critical/high kept with actionable fields
    expect(compact.vulnerabilities).toEqual([
      {
        id: "CVE-2023-1001",
        severity: "CRITICAL",
        package: "pkg1",
        installedVersion: "1.0.0",
        fixedVersion: "1.0.1",
      },
      {
        id: "CVE-2023-1002",
        severity: "HIGH",
        package: "pkg2",
        installedVersion: "1.0.0",
        fixedVersion: "1.0.1",
      },
    ]);
    // Medium/low dropped -> truncation flag set
    expect(compact.vulnerabilitiesTruncated).toBe(true);
    // Display-only fields stripped
    expect(compact.vulnerabilities?.[0]).not.toHaveProperty("title");
    expect(compact).not.toHaveProperty("totalVulnerabilities");
  });

  it("caps critical/high vulnerabilities at COMPACT_MAX_FINDINGS", () => {
    const vulns = Array.from({ length: 30 }, (_, i) => makeTrivyVuln(i, "CRITICAL"));
    const data: TrivyScanResultInternal = {
      target: "img",
      scanType: "image",
      vulnerabilities: vulns,
      summary: { critical: 30, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 30,
    };

    const compact = compactTrivyScanMap(data);
    expect(compact.vulnerabilities).toHaveLength(COMPACT_MAX_FINDINGS);
    expect(compact.vulnerabilitiesTruncated).toBe(true);
  });

  it("handles zero vulnerabilities without truncation flag", () => {
    const data: TrivyScanResultInternal = {
      target: "./",
      scanType: "fs",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 0,
    };

    const compact = compactTrivyScanMap(data);

    expect(compact.summary.critical).toBe(0);
    expect(compact).not.toHaveProperty("vulnerabilities");
    expect(compact).not.toHaveProperty("vulnerabilitiesTruncated");
  });

  it("passes through error and exitCode", () => {
    const data: TrivyScanResultInternal = {
      target: "img",
      scanType: "image",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      totalVulnerabilities: 0,
      error: "FATAL: image not found",
      exitCode: 1,
    };

    const compact = compactTrivyScanMap(data);
    expect(compact.error).toBe("FATAL: image not found");
    expect(compact.exitCode).toBe(1);
  });

  it("produces schema-valid output", () => {
    const data: TrivyScanResultInternal = {
      target: "img",
      scanType: "image",
      vulnerabilities: [makeTrivyVuln(1, "CRITICAL"), makeTrivyVuln(2, "MEDIUM")],
      summary: { critical: 1, high: 0, medium: 1, low: 0, unknown: 0 },
      totalVulnerabilities: 2,
      error: "boom",
      exitCode: 1,
    };
    expect(() => TrivyScanResultSchema.parse(compactTrivyScanMap(data))).not.toThrow();
  });
});

describe("formatTrivyScanCompact", () => {
  it("formats summary line and kept vulnerabilities", () => {
    const compact = compactTrivyScanMap({
      target: "nginx:latest",
      scanType: "image",
      vulnerabilities: [makeTrivyVuln(1, "CRITICAL"), makeTrivyVuln(2, "MEDIUM")],
      summary: { critical: 1, high: 0, medium: 1, low: 0, unknown: 0 },
      totalVulnerabilities: 2,
    });
    const output = formatTrivyScanCompact(compact);
    expect(output).toContain("Trivy image scan: nginx:latest");
    expect(output).toContain("2 vulnerabilities");
    expect(output).toContain("1C/0H/1M/0L");
    expect(output).toContain("[CRITICAL] CVE-2023-1001: pkg1@1.0.0 -> 1.0.1");
    expect(output).toContain("truncated");
  });

  it("formats zero-vulnerability scan", () => {
    const compact = {
      target: "./",
      scanType: "fs" as const,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    };
    const output = formatTrivyScanCompact(compact);
    expect(output).toContain("0 vulnerabilities");
  });

  it("surfaces error in text output", () => {
    const output = formatTrivyScanCompact({
      target: "img",
      scanType: "image",
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      error: "FATAL: image not found",
      exitCode: 1,
    });
    expect(output).toContain("Scan failed");
    expect(output).toContain("exit code 1");
    expect(output).toContain("FATAL: image not found");
  });
});

// ---------------------------------------------------------------------------
// compactSemgrepScanMap
// ---------------------------------------------------------------------------

describe("compactSemgrepScanMap", () => {
  it("keeps summary and the top findings; drops totalFindings and config", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 2,
      findings: [
        { ...makeSemgrepFinding(1, "ERROR"), category: "security" },
        makeSemgrepFinding(2, "WARNING"),
      ],
      summary: { error: 1, warning: 1, info: 0 },
      config: "auto",
    };

    const compact = compactSemgrepScanMap(data);

    expect(compact.summary).toEqual({ error: 1, warning: 1, info: 0 });
    expect(compact.findings).toEqual([
      {
        ruleId: "rule.1",
        path: "src/file1.py",
        startLine: 1,
        endLine: 1,
        message: "Finding 1",
        severity: "ERROR",
      },
      {
        ruleId: "rule.2",
        path: "src/file2.py",
        startLine: 2,
        endLine: 2,
        message: "Finding 2",
        severity: "WARNING",
      },
    ]);
    expect(compact).not.toHaveProperty("findingsTruncated");
    expect(compact).not.toHaveProperty("totalFindings");
    expect(compact).not.toHaveProperty("config");
  });

  it("caps findings at COMPACT_MAX_FINDINGS with truncation flag", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 30,
      findings: Array.from({ length: 30 }, (_, i) => makeSemgrepFinding(i, "ERROR")),
      summary: { error: 30, warning: 0, info: 0 },
      config: "auto",
    };

    const compact = compactSemgrepScanMap(data);
    expect(compact.findings).toHaveLength(COMPACT_MAX_FINDINGS);
    expect(compact.findingsTruncated).toBe(true);
  });

  it("always passes through errors[]", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 0,
      findings: [],
      errors: [{ type: "ParseError", message: "invalid syntax", path: "bad.py" }],
      summary: { error: 0, warning: 0, info: 0 },
      config: "auto",
    };

    const compact = compactSemgrepScanMap(data);
    expect(compact.errors).toEqual([
      { type: "ParseError", message: "invalid syntax", path: "bad.py" },
    ]);
  });

  it("passes through error and exitCode", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 0,
      findings: [],
      summary: { error: 0, warning: 0, info: 0 },
      config: "auto",
      error: "semgrep: command crashed",
      exitCode: 2,
    };

    const compact = compactSemgrepScanMap(data);
    expect(compact.error).toBe("semgrep: command crashed");
    expect(compact.exitCode).toBe(2);
  });

  it("produces schema-valid output", () => {
    const data: SemgrepScanResultInternal = {
      totalFindings: 1,
      findings: [makeSemgrepFinding(1, "ERROR")],
      errors: [{ message: "warn" }],
      summary: { error: 1, warning: 0, info: 0 },
      config: "auto",
      error: "boom",
      exitCode: 2,
    };
    expect(() => SemgrepScanResultSchema.parse(compactSemgrepScanMap(data))).not.toThrow();
  });
});

describe("formatSemgrepScanCompact", () => {
  it("formats summary, findings, errors, and surfaced failure", () => {
    const compact = compactSemgrepScanMap({
      totalFindings: 1,
      findings: [makeSemgrepFinding(1, "ERROR")],
      errors: [{ type: "ParseError", message: "invalid syntax", path: "bad.py" }],
      summary: { error: 1, warning: 0, info: 0 },
      config: "auto",
      error: "semgrep crashed",
      exitCode: 2,
    });
    const output = formatSemgrepScanCompact(compact);
    expect(output).toContain("Semgrep scan");
    expect(output).toContain("1 findings");
    expect(output).toContain("[ERROR] rule.1: src/file1.py:1-1");
    expect(output).toContain("Finding 1");
    expect(output).toContain("[ParseError] invalid syntax (bad.py)");
    expect(output).toContain("Scan failed");
    expect(output).toContain("semgrep crashed");
  });

  it("formats plain summary when nothing else is present", () => {
    const output = formatSemgrepScanCompact({ summary: { error: 2, warning: 2, info: 1 } });
    expect(output).toContain("5 findings");
    expect(output).toContain("2E/2W/1I");
  });
});

// ---------------------------------------------------------------------------
// compactGitleaksScanMap
// ---------------------------------------------------------------------------

describe("compactGitleaksScanMap", () => {
  it("keeps totalFindings and rule/file/line per finding; drops match/secret/commit", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 2,
      findings: [makeGitleaksFinding(1), makeGitleaksFinding(2)],
      summary: { totalFindings: 2 },
    };

    const compact = compactGitleaksScanMap(data);

    expect(compact.totalFindings).toBe(2);
    expect(compact.findings).toEqual([
      { ruleID: "rule-1", file: "src/file1.env", startLine: 1, endLine: 1 },
      { ruleID: "rule-2", file: "src/file2.env", startLine: 2, endLine: 2 },
    ]);
    expect(compact.findings?.[0]).not.toHaveProperty("match");
    expect(compact.findings?.[0]).not.toHaveProperty("secret");
    expect(compact.findings?.[0]).not.toHaveProperty("commit");
    expect(compact).not.toHaveProperty("findingsTruncated");
  });

  it("caps findings at COMPACT_MAX_FINDINGS with truncation flag", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 25,
      findings: Array.from({ length: 25 }, (_, i) => makeGitleaksFinding(i)),
      summary: { totalFindings: 25 },
    };

    const compact = compactGitleaksScanMap(data);
    expect(compact.totalFindings).toBe(25);
    expect(compact.findings).toHaveLength(COMPACT_MAX_FINDINGS);
    expect(compact.findingsTruncated).toBe(true);
  });

  it("handles zero findings", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 0,
      findings: [],
      summary: { totalFindings: 0 },
    };

    const compact = compactGitleaksScanMap(data);

    expect(compact.totalFindings).toBe(0);
    expect(compact).not.toHaveProperty("findings");
  });

  it("passes through error and exitCode", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 0,
      findings: [],
      summary: { totalFindings: 0 },
      error: "gitleaks: bad config",
      exitCode: 1,
    };

    const compact = compactGitleaksScanMap(data);
    expect(compact.error).toBe("gitleaks: bad config");
    expect(compact.exitCode).toBe(1);
  });

  it("produces schema-valid output", () => {
    const data: GitleaksScanResultInternal = {
      totalFindings: 2,
      findings: [makeGitleaksFinding(1), makeGitleaksFinding(2)],
      summary: { totalFindings: 2 },
      error: "boom",
      exitCode: 1,
    };
    expect(() => GitleaksScanResultSchema.parse(compactGitleaksScanMap(data))).not.toThrow();
  });
});

describe("formatGitleaksScanCompact", () => {
  it("formats finding count and per-finding lines", () => {
    const compact = compactGitleaksScanMap({
      totalFindings: 2,
      findings: [makeGitleaksFinding(1), makeGitleaksFinding(2)],
      summary: { totalFindings: 2 },
    });
    const output = formatGitleaksScanCompact(compact);
    expect(output).toContain("Gitleaks scan -- 2 secret(s) found");
    expect(output).toContain("[rule-1] src/file1.env:1-1");
    expect(output).toContain("[rule-2] src/file2.env:2-2");
  });

  it("surfaces error in text output", () => {
    const output = formatGitleaksScanCompact({
      totalFindings: 0,
      error: "gitleaks: bad config",
      exitCode: 1,
    });
    expect(output).toContain("0 secret(s)");
    expect(output).toContain("Scan failed");
    expect(output).toContain("gitleaks: bad config");
  });
});
