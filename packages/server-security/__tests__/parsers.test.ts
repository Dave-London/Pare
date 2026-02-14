import { describe, it, expect } from "vitest";
import { parseTrivyJson } from "../src/lib/parsers.js";

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
