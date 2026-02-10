import { describe, it, expect } from "vitest";
import { parseUvInstall } from "../src/lib/parsers.js";
import { formatUvInstall } from "../src/lib/formatters.js";
import type { UvInstall } from "../src/schemas/index.js";

describe("parseUvInstall", () => {
  it("parses successful install with packages", () => {
    const stderr = [
      "Resolved 3 packages in 150ms",
      "Prepared 3 packages in 200ms",
      "Installed 3 packages in 50ms",
      " + flask==3.0.0",
      " + jinja2==3.1.2",
      " + werkzeug==3.0.1",
    ].join("\n");

    const result = parseUvInstall("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.installed).toEqual([
      { name: "flask", version: "3.0.0" },
      { name: "jinja2", version: "3.1.2" },
      { name: "werkzeug", version: "3.0.1" },
    ]);
  });

  it("parses install with duration in summary", () => {
    const stderr = [
      "Resolved 1 package in 10ms",
      "Installed 1 package in 0.5s",
      " + requests==2.31.0",
    ].join("\n");

    const result = parseUvInstall("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.installed[0]).toEqual({ name: "requests", version: "2.31.0" });
  });

  it("handles already-satisfied packages", () => {
    const stderr = "Audited 5 packages in 10ms";

    const result = parseUvInstall("", stderr, 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
  });

  it("handles install failure", () => {
    const stderr = "error: Could not find package 'nonexistent-pkg-xyz'";

    const result = parseUvInstall("", stderr, 1);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
  });

  it("handles empty output", () => {
    const result = parseUvInstall("", "", 0);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.installed).toEqual([]);
  });
});

describe("formatUvInstall", () => {
  it("formats successful install", () => {
    const data: UvInstall = {
      success: true,
      installed: [
        { name: "flask", version: "3.0.0" },
        { name: "jinja2", version: "3.1.2" },
      ],
      total: 2,
      duration: 0.5,
    };
    const output = formatUvInstall(data);

    expect(output).toContain("Installed 2 packages in 0.5s");
    expect(output).toContain("flask==3.0.0");
    expect(output).toContain("jinja2==3.1.2");
  });

  it("formats already satisfied", () => {
    const data: UvInstall = {
      success: true,
      installed: [],
      total: 0,
      duration: 0,
    };
    expect(formatUvInstall(data)).toBe("All requirements already satisfied.");
  });

  it("formats failure", () => {
    const data: UvInstall = {
      success: false,
      installed: [],
      total: 0,
      duration: 0,
    };
    expect(formatUvInstall(data)).toBe("uv install failed.");
  });
});
