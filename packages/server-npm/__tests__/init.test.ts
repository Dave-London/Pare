import { describe, it, expect } from "vitest";
import { parseInitOutput } from "../src/lib/parsers.js";
import { formatInit } from "../src/lib/formatters.js";
import type { NpmInit } from "../src/schemas/index.js";

describe("parseInitOutput", () => {
  it("parses successful init result", () => {
    const result = parseInitOutput(true, "my-project", "1.0.0", "/tmp/my-project/package.json");

    expect(result.success).toBe(true);
    expect(result.packageName).toBe("my-project");
    expect(result.version).toBe("1.0.0");
    expect(result.path).toBe("/tmp/my-project/package.json");
  });

  it("parses failed init result", () => {
    const result = parseInitOutput(false, "unknown", "0.0.0", "/tmp/bad-dir/package.json");

    expect(result.success).toBe(false);
    expect(result.packageName).toBe("unknown");
    expect(result.version).toBe("0.0.0");
    expect(result.path).toBe("/tmp/bad-dir/package.json");
  });

  it("parses scoped package init result", () => {
    const result = parseInitOutput(true, "@myorg/utils", "1.0.0", "/tmp/utils/package.json");

    expect(result.success).toBe(true);
    expect(result.packageName).toBe("@myorg/utils");
    expect(result.version).toBe("1.0.0");
  });

  it("preserves the full package.json path", () => {
    const longPath = "/home/user/projects/deep/nested/dir/package.json";
    const result = parseInitOutput(true, "nested-project", "0.1.0", longPath);

    expect(result.path).toBe(longPath);
  });

  it("handles default version from npm init -y", () => {
    const result = parseInitOutput(true, "my-app", "1.0.0", "/tmp/my-app/package.json");

    expect(result.version).toBe("1.0.0");
  });
});

describe("formatInit", () => {
  it("formats successful init", () => {
    const data: NpmInit = {
      success: true,
      packageName: "my-project",
      version: "1.0.0",
      path: "/tmp/my-project/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe("Created my-project@1.0.0 at /tmp/my-project/package.json");
  });

  it("formats failed init", () => {
    const data: NpmInit = {
      success: false,
      packageName: "unknown",
      version: "0.0.0",
      path: "/tmp/bad-dir/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe("Failed to initialize package.json at /tmp/bad-dir/package.json");
  });

  it("formats scoped package init", () => {
    const data: NpmInit = {
      success: true,
      packageName: "@myorg/utils",
      version: "1.0.0",
      path: "/tmp/utils/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe("Created @myorg/utils@1.0.0 at /tmp/utils/package.json");
  });
});
