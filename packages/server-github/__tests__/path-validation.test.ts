import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assertSafeFilePath } from "../src/lib/path-validation.js";

const TEST_DIR = join(tmpdir(), "pare-path-validation-test");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, "subdir"), { recursive: true });
  writeFileSync(join(TEST_DIR, "safe.txt"), "hello");
  writeFileSync(join(TEST_DIR, "subdir", "nested.txt"), "nested");
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("assertSafeFilePath", () => {
  it("accepts a simple relative file path", () => {
    expect(() => assertSafeFilePath("safe.txt", TEST_DIR)).not.toThrow();
  });

  it("accepts a nested relative file path", () => {
    expect(() => assertSafeFilePath("subdir/nested.txt", TEST_DIR)).not.toThrow();
  });

  it("rejects path with .. traversal", () => {
    expect(() => assertSafeFilePath("../../../etc/passwd", TEST_DIR)).toThrow(/path traversal/);
  });

  it("rejects path with embedded .. in the middle", () => {
    expect(() => assertSafeFilePath("subdir/../../etc/passwd", TEST_DIR)).toThrow(/path traversal/);
  });

  it("rejects absolute path outside cwd", () => {
    expect(() => assertSafeFilePath("/etc/passwd", TEST_DIR)).toThrow(
      /outside the working directory/,
    );
  });

  it("accepts absolute path inside cwd", () => {
    const absPath = join(TEST_DIR, "safe.txt");
    expect(() => assertSafeFilePath(absPath, TEST_DIR)).not.toThrow();
  });

  it.skipIf(process.platform === "win32")("rejects symlink pointing outside cwd", () => {
    const linkPath = join(TEST_DIR, "evil-link");
    symlinkSync("/etc/hosts", linkPath);

    expect(() => assertSafeFilePath("evil-link", TEST_DIR)).toThrow(/symlink resolves to/);
  });

  it.skipIf(process.platform === "win32")("accepts symlink pointing inside cwd", () => {
    const linkPath = join(TEST_DIR, "safe-link");
    symlinkSync(join(TEST_DIR, "safe.txt"), linkPath);

    expect(() => assertSafeFilePath("safe-link", TEST_DIR)).not.toThrow();
  });

  it("accepts a file that does not exist (no symlink check needed)", () => {
    // Non-existent files are OK — the traversal/absolute checks still apply
    expect(() => assertSafeFilePath("does-not-exist.txt", TEST_DIR)).not.toThrow();
  });

  it("rejects a non-existent file with .. traversal", () => {
    expect(() => assertSafeFilePath("../nonexistent.txt", TEST_DIR)).toThrow(/path traversal/);
  });
});
