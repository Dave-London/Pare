import { describe, it, expect } from "vitest";
import {
  formatTrivyScan,
  compactTrivyScanMap,
  formatTrivyScanCompact,
} from "../src/lib/formatters.js";
import type { TrivyScanResult } from "../src/schemas/index.js";

// -- Full formatters ----------------------------------------------------------

describe("formatTrivyScan", () => {
  it("formats scan with vulnerabilities", () => {
    const data: TrivyScanResult = {
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
    const data: TrivyScanResult = {
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
    const data: TrivyScanResult = {
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
  it("keeps summary and total, drops individual vulnerabilities", () => {
    const data: TrivyScanResult = {
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
    expect(compact.totalVulnerabilities).toBe(1);
    expect(compact.summary.critical).toBe(1);
    expect(compact).not.toHaveProperty("vulnerabilities");
  });
});

describe("formatTrivyScanCompact", () => {
  it("formats compact summary", () => {
    const output = formatTrivyScanCompact({
      target: "alpine:3.18",
      scanType: "image",
      totalVulnerabilities: 5,
      summary: { critical: 1, high: 2, medium: 1, low: 1, unknown: 0 },
    });

    expect(output).toBe("Trivy image scan: alpine:3.18 -- 5 vulnerabilities (1C/2H/1M/1L)");
  });

  it("formats compact with zero vulnerabilities", () => {
    const output = formatTrivyScanCompact({
      target: "clean:latest",
      scanType: "fs",
      totalVulnerabilities: 0,
      summary: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
    });

    expect(output).toBe("Trivy fs scan: clean:latest -- 0 vulnerabilities (0C/0H/0M/0L)");
  });
});
