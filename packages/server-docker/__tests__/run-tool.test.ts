import { describe, it, expect } from "vitest";
import { parseRunOutput } from "../src/lib/parsers.js";
import { formatRun } from "../src/lib/formatters.js";
import type { DockerRun } from "../src/schemas/index.js";

describe("parseRunOutput", () => {
  it("parses detached container output", () => {
    const stdout =
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n";
    const result = parseRunOutput(stdout, "nginx:latest", true, "my-web");

    expect(result.containerId).toBe("a1b2c3d4e5f6");
    expect(result.image).toBe("nginx:latest");
    expect(result.detached).toBe(true);
    expect(result.name).toBe("my-web");
  });

  it("parses output without container name", () => {
    const stdout = "abc123def456abc123def456abc123def456abc123def456abc123def456abc123de\n";
    const result = parseRunOutput(stdout, "ubuntu:22.04", true);

    expect(result.containerId).toBe("abc123def456");
    expect(result.image).toBe("ubuntu:22.04");
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
    expect(result.image).toBe("nginx");
    expect(result.detached).toBe(true);
  });

  it("truncates container ID to 12 chars", () => {
    const longId = "a".repeat(64);
    const result = parseRunOutput(longId, "myapp:v1", true);

    expect(result.containerId).toBe("aaaaaaaaaaaa");
    expect(result.containerId.length).toBe(12);
  });
});

describe("formatRun", () => {
  it("formats detached container with name", () => {
    const data: DockerRun = {
      containerId: "a1b2c3d4e5f6",
      image: "nginx:latest",
      detached: true,
      name: "my-web",
    };
    const output = formatRun(data);
    expect(output).toBe("Container a1b2c3d4e5f6 (my-web) started from nginx:latest [detached]");
  });

  it("formats attached container without name", () => {
    const data: DockerRun = {
      containerId: "abc123def456",
      image: "ubuntu:22.04",
      detached: false,
    };
    const output = formatRun(data);
    expect(output).toBe("Container abc123def456 started from ubuntu:22.04 [attached]");
  });
});
