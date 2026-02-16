import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { resolveShellcheckPatterns, validateShellcheckPatterns } from "../src/lib/parsers.js";

const TEST_DIR = join("/tmp", "pare-shellcheck-test-" + process.pid);

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("validateShellcheckPatterns", () => {
  it("returns null for valid file patterns", () => {
    expect(validateShellcheckPatterns(["deploy.sh", "build.sh"])).toBeNull();
  });

  it("returns error for bare dot directory", () => {
    const result = validateShellcheckPatterns(["."]);
    expect(result).toContain("ShellCheck requires file paths, not directories");
    expect(result).toContain(".");
  });

  it("returns error for dot-dot directory", () => {
    const result = validateShellcheckPatterns([".."]);
    expect(result).toContain("ShellCheck requires file paths, not directories");
  });

  it("returns error for trailing-slash directories", () => {
    const result = validateShellcheckPatterns(["src/"]);
    expect(result).toContain("ShellCheck requires file paths, not directories");
    expect(result).toContain("src/");
  });

  it("does not flag glob patterns as directories", () => {
    expect(validateShellcheckPatterns(["src/**/*.sh"])).toBeNull();
  });

  it("does not flag patterns without trailing slash", () => {
    expect(validateShellcheckPatterns(["deploy.sh", "scripts/build.sh"])).toBeNull();
  });

  it("returns error listing multiple bare directories", () => {
    const result = validateShellcheckPatterns([".", "src/", ".."]);
    expect(result).toContain(".");
    expect(result).toContain("src/");
    expect(result).toContain("..");
  });
});

describe("resolveShellcheckPatterns", () => {
  it("resolves a single shell file path", async () => {
    const filePath = join(TEST_DIR, "test.sh");
    await writeFile(filePath, "#!/bin/bash\necho hello\n");

    const result = await resolveShellcheckPatterns(["test.sh"], TEST_DIR);

    expect(result).toEqual([filePath]);
  });

  it("resolves an absolute file path", async () => {
    const filePath = join(TEST_DIR, "test.sh");
    await writeFile(filePath, "#!/bin/bash\necho hello\n");

    const result = await resolveShellcheckPatterns([filePath], TEST_DIR);

    expect(result).toEqual([filePath]);
  });

  it("expands a directory to shell script files", async () => {
    const subDir = join(TEST_DIR, "scripts");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "deploy.sh"), "#!/bin/bash\n");
    await writeFile(join(subDir, "build.bash"), "#!/bin/bash\n");
    await writeFile(join(subDir, "not-a-script.txt"), "hello\n");

    const result = await resolveShellcheckPatterns(["scripts"], TEST_DIR);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(join(subDir, "deploy.sh"));
    expect(result).toContainEqual(join(subDir, "build.bash"));
  });

  it("recursively expands nested directories", async () => {
    const nested = join(TEST_DIR, "scripts", "nested");
    await mkdir(nested, { recursive: true });
    await writeFile(join(TEST_DIR, "scripts", "top.sh"), "#!/bin/bash\n");
    await writeFile(join(nested, "deep.sh"), "#!/bin/bash\n");

    const result = await resolveShellcheckPatterns(["scripts"], TEST_DIR);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(join(TEST_DIR, "scripts", "top.sh"));
    expect(result).toContainEqual(join(nested, "deep.sh"));
  });

  it("returns empty array for directory with no shell scripts", async () => {
    const subDir = join(TEST_DIR, "empty");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "readme.md"), "# hello\n");

    const result = await resolveShellcheckPatterns(["empty"], TEST_DIR);

    expect(result).toEqual([]);
  });

  it("passes through non-existent patterns as-is", async () => {
    const result = await resolveShellcheckPatterns(["nonexistent.sh"], TEST_DIR);

    expect(result).toEqual(["nonexistent.sh"]);
  });

  it("handles multiple patterns including directories and files", async () => {
    const subDir = join(TEST_DIR, "scripts");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "build.sh"), "#!/bin/bash\n");
    const singleFile = join(TEST_DIR, "deploy.sh");
    await writeFile(singleFile, "#!/bin/bash\n");

    const result = await resolveShellcheckPatterns(["deploy.sh", "scripts"], TEST_DIR);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(singleFile);
    expect(result).toContainEqual(join(subDir, "build.sh"));
  });

  it("supports .zsh and .ksh extensions", async () => {
    const subDir = join(TEST_DIR, "shells");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "config.zsh"), "#!/bin/zsh\n");
    await writeFile(join(subDir, "init.ksh"), "#!/bin/ksh\n");

    const result = await resolveShellcheckPatterns(["shells"], TEST_DIR);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(join(subDir, "config.zsh"));
    expect(result).toContainEqual(join(subDir, "init.ksh"));
  });
});
