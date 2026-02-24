import { describe, it, expect } from "vitest";
import { parseRunOutput } from "../src/lib/parsers.js";
import { formatRun } from "../src/lib/formatters.js";
import type { DockerRun } from "../src/schemas/index.js";

describe("parseRunOutput", () => {
  it("parses detached container output", () => {
    const stdout = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n";
    const result = parseRunOutput(stdout, "nginx:latest", true, "my-web");

    expect(result.containerId).toBe("a1b2c3d4e5f6");
    expect(result.detached).toBe(true);
    expect(result.name).toBe("my-web");
  });

  it("parses output without container name", () => {
    const stdout = "abc123def456abc123def456abc123def456abc123def456abc123def456abc123de\n";
    const result = parseRunOutput(stdout, "ubuntu:22.04", true);

    expect(result.containerId).toBe("abc123def456");
    expect(result.detached).toBe(true);
    expect(result.name).toBeUndefined();
  });

  it("parses attached mode output", () => {
    const stdout = "Hello from container\nfedcba987654fedcba987654\n";
    const result = parseRunOutput(stdout, "alpine", false);

    expect(result.containerId).toBe("fedcba987654");
    expect(result.detached).toBe(false);
  });

  it("handles empty output gracefully", () => {
    const result = parseRunOutput("", "nginx", true);

    expect(result.containerId).toBe("");
    expect(result.detached).toBe(true);
  });

  it("truncates container ID to 12 chars", () => {
    const longId = "a".repeat(64);
    const result = parseRunOutput(longId, "myapp:v1", true);

    expect(result.containerId).toBe("aaaaaaaaaaaa");
    expect(result.containerId.length).toBe(12);
  });

  it("handles error output with exit code 125 (docker daemon error)", () => {
    // When docker run fails (e.g., invalid image), stderr contains the error
    // and stdout may be empty. The parser still returns a result.
    const stdout = "";
    const result = parseRunOutput(stdout, "invalid!!!image", true);

    expect(result.containerId).toBe("");
    expect(result.detached).toBe(true);
  });

  it("handles exit code 127 (command not found in container)", () => {
    // docker run exits 127 when the entrypoint/cmd is not found
    const stdout = "";
    const result = parseRunOutput(stdout, "alpine", false);

    expect(result.containerId).toBe("");
    expect(result.detached).toBe(false);
  });

  it("handles missing container ID when output has only error text", () => {
    const stdout = "docker: Error response from daemon: No such image: fake:latest\n";
    const result = parseRunOutput(stdout, "fake:latest", true);

    // Last line after trim is the error message, not a container ID
    expect(result.containerId.length).toBe(12);
  });

  it("handles multi-line error output (attached mode)", () => {
    const stdout = [
      "Error: Unable to locate package xyz",
      "E: Package 'xyz' has no installation candidate",
    ].join("\n");
    const result = parseRunOutput(stdout, "ubuntu:22.04", false);

    // Last line is the error message, sliced to 12 chars
    expect(result.containerId.length).toBe(12);
    expect(result.detached).toBe(false);
  });
});

describe("formatRun", () => {
  it("formats detached container with name", () => {
    const data: DockerRun = {
      containerId: "a1b2c3d4e5f6",
      detached: true,
      name: "my-web",
    };
    const output = formatRun(data);
    expect(output).toContain("a1b2c3d4e5f6");
    expect(output).toContain("my-web");
    expect(output).toContain("detached");
  });

  it("formats attached container without name", () => {
    const data: DockerRun = {
      containerId: "abc123def456",
      detached: false,
    };
    const output = formatRun(data);
    expect(output).toContain("abc123def456");
    expect(output).toContain("attached");
  });
});
