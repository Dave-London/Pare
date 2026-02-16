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
    expect(result.stderr).toBeUndefined();
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

  it("includes stderr when provided", () => {
    const result = parseInitOutput(
      false,
      "unknown",
      "0.0.0",
      "/tmp/bad-dir/package.json",
      "npm ERR! EACCES: permission denied, open '/tmp/bad-dir/package.json'",
    );

    expect(result.success).toBe(false);
    expect(result.stderr).toBe(
      "npm ERR! EACCES: permission denied, open '/tmp/bad-dir/package.json'",
    );
  });

  it("omits stderr when it is empty", () => {
    const result = parseInitOutput(true, "my-pkg", "1.0.0", "/tmp/pkg/package.json", "");

    expect(result.success).toBe(true);
    expect(result.stderr).toBeUndefined();
  });

  it("omits stderr when it is only whitespace", () => {
    const result = parseInitOutput(true, "my-pkg", "1.0.0", "/tmp/pkg/package.json", "   \n  ");

    expect(result.stderr).toBeUndefined();
  });

  it("trims stderr whitespace", () => {
    const result = parseInitOutput(
      false,
      "unknown",
      "0.0.0",
      "/tmp/x/package.json",
      "  npm ERR! code ENOENT  \n",
    );

    expect(result.stderr).toBe("npm ERR! code ENOENT");
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

  it("formats failed init without stderr", () => {
    const data: NpmInit = {
      success: false,
      packageName: "unknown",
      version: "0.0.0",
      path: "/tmp/bad-dir/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe("Failed to initialize package.json at /tmp/bad-dir/package.json");
  });

  it("formats failed init with stderr", () => {
    const data: NpmInit = {
      success: false,
      packageName: "unknown",
      version: "0.0.0",
      path: "/tmp/bad-dir/package.json",
      stderr: "npm ERR! EACCES: permission denied",
    };
    const output = formatInit(data);
    expect(output).toContain("Failed to initialize package.json at /tmp/bad-dir/package.json");
    expect(output).toContain("stderr:");
    expect(output).toContain("npm ERR! EACCES: permission denied");
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

  it("does not include stderr on success even if present", () => {
    const data: NpmInit = {
      success: true,
      packageName: "my-pkg",
      version: "1.0.0",
      path: "/tmp/pkg/package.json",
      stderr: "npm WARN some warning",
    };
    const output = formatInit(data);
    expect(output).toBe("Created my-pkg@1.0.0 at /tmp/pkg/package.json");
    expect(output).not.toContain("stderr");
  });
});

// ─── Error path tests ────────────────────────────────────────────────────────

describe("parseInitOutput error paths", () => {
  it("handles permission denied (read-only directory)", () => {
    const result = parseInitOutput(false, "unknown", "0.0.0", "/readonly/package.json");

    expect(result.success).toBe(false);
    expect(result.packageName).toBe("unknown");
    expect(result.version).toBe("0.0.0");
    expect(result.path).toBe("/readonly/package.json");
  });

  it("handles non-existent directory", () => {
    const result = parseInitOutput(false, "unknown", "0.0.0", "/nonexistent/path/package.json");

    expect(result.success).toBe(false);
    expect(result.path).toBe("/nonexistent/path/package.json");
  });

  it("handles existing package.json overwrite", () => {
    const result = parseInitOutput(true, "existing-project", "2.0.0", "/project/package.json");

    expect(result.success).toBe(true);
    expect(result.packageName).toBe("existing-project");
    expect(result.version).toBe("2.0.0");
  });
});

describe("formatInit error paths", () => {
  it("formats failure with long path", () => {
    const data: NpmInit = {
      success: false,
      packageName: "unknown",
      version: "0.0.0",
      path: "/very/deeply/nested/directory/structure/package.json",
    };
    const output = formatInit(data);
    expect(output).toBe(
      "Failed to initialize package.json at /very/deeply/nested/directory/structure/package.json",
    );
  });

  it("formats failure with stderr explaining the error", () => {
    const data: NpmInit = {
      success: false,
      packageName: "unknown",
      version: "0.0.0",
      path: "/readonly/package.json",
      stderr: "npm ERR! code EACCES\nnpm ERR! syscall open",
    };
    const output = formatInit(data);
    expect(output).toContain("Failed to initialize package.json at /readonly/package.json");
    expect(output).toContain("npm ERR! code EACCES");
    expect(output).toContain("npm ERR! syscall open");
  });
});
