import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveSearchPath } from "../src/lib/search-runner.js";

describe("resolveSearchPath", () => {
  let root: string;
  let nestedDir: string;
  let filePath: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "pare-search-resolve-"));
    nestedDir = join(root, "nested");
    mkdirSync(nestedDir);
    filePath = join(root, "data.txt");
    writeFileSync(filePath, "hello\nworld\n");
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns process.cwd() and '.' when path is undefined", () => {
    const resolved = resolveSearchPath(undefined);
    expect(resolved.cwd).toBe(process.cwd());
    expect(resolved.target).toBe(".");
    expect(resolved.isFile).toBe(false);
  });

  it("treats a directory path as cwd with target '.'", () => {
    const resolved = resolveSearchPath(nestedDir);
    expect(resolved.cwd).toBe(nestedDir);
    expect(resolved.target).toBe(".");
    expect(resolved.isFile).toBe(false);
  });

  it("treats a file path by using its parent dir as cwd and the file as target", () => {
    const resolved = resolveSearchPath(filePath);
    expect(resolved.cwd).toBe(root);
    expect(resolved.target).toBe(filePath);
    expect(resolved.isFile).toBe(true);
  });

  it("throws a clear error when the path does not exist", () => {
    const missing = join(root, "does-not-exist.txt");
    expect(() => resolveSearchPath(missing)).toThrow(/path does not exist/);
    // Crucially, it must NOT leak the raw `spawn ENOTDIR` error type.
    expect(() => resolveSearchPath(missing)).not.toThrow(/ENOTDIR/);
  });

  it("resolves relative paths against process.cwd()", () => {
    // "." is always a valid directory relative to cwd
    const resolved = resolveSearchPath(".");
    expect(resolved.isFile).toBe(false);
    expect(resolved.target).toBe(".");
  });
});
