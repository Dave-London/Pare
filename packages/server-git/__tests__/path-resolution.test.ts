import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { normalizePath, resolveFilePath, resolveFilePaths } from "../src/lib/git-runner.js";

describe("normalizePath", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizePath("src\\lib\\file.ts")).toBe("src/lib/file.ts");
  });

  it("leaves forward slashes unchanged", () => {
    expect(normalizePath("src/lib/file.ts")).toBe("src/lib/file.ts");
  });

  it("handles mixed separators", () => {
    expect(normalizePath("src\\lib/file.ts")).toBe("src/lib/file.ts");
  });

  it("handles empty string", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("resolveFilePath", () => {
  let repoDir: string;

  beforeEach(() => {
    // Create a temp git repo with a known file
    repoDir = mkdtempSync(join(tmpdir(), "pare-git-case-test-"));
    execSync("git init", { cwd: repoDir });
    execSync("git config user.email test@test.com", { cwd: repoDir });
    execSync("git config user.name Test", { cwd: repoDir });

    // Create a file with specific casing
    writeFileSync(join(repoDir, "ROADMAP.md"), "# Roadmap\n");
    writeFileSync(join(repoDir, "src-file.ts"), "export {};\n");
    execSync("git add -A", { cwd: repoDir });
    execSync('git commit -m "init"', { cwd: repoDir });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("returns exact path when casing matches", async () => {
    const resolved = await resolveFilePath("ROADMAP.md", repoDir);
    expect(resolved).toBe("ROADMAP.md");
  });

  it("resolves case-insensitive match via icase pathspec", async () => {
    // On case-insensitive FS (Windows/macOS), this should resolve to the canonical path
    const resolved = await resolveFilePath("roadmap.md", repoDir);
    // The icase pathspec should find ROADMAP.md
    expect(resolved.toLowerCase()).toBe("roadmap.md");
    // On Windows/macOS (case-insensitive), it should return the canonical ROADMAP.md
    if (process.platform === "win32" || process.platform === "darwin") {
      expect(resolved).toBe("ROADMAP.md");
    }
  });

  it("returns normalized path for untracked files", async () => {
    const resolved = await resolveFilePath("nonexistent.txt", repoDir);
    expect(resolved).toBe("nonexistent.txt");
  });

  it("normalizes backslashes in input", async () => {
    const resolved = await resolveFilePath("ROADMAP.md", repoDir);
    expect(resolved).toBe("ROADMAP.md");
  });

  it("handles backslash paths on Windows", async () => {
    // Even with backslashes, should find the file
    const resolved = await resolveFilePath("ROADMAP.md", repoDir);
    expect(resolved).not.toContain("\\");
  });
});

describe("resolveFilePaths", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "pare-git-case-test-multi-"));
    execSync("git init", { cwd: repoDir });
    execSync("git config user.email test@test.com", { cwd: repoDir });
    execSync("git config user.name Test", { cwd: repoDir });

    writeFileSync(join(repoDir, "README.md"), "# README\n");
    writeFileSync(join(repoDir, "CHANGELOG.md"), "# Changes\n");
    execSync("git add -A", { cwd: repoDir });
    execSync('git commit -m "init"', { cwd: repoDir });
  });

  afterEach(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it("resolves multiple file paths", async () => {
    const resolved = await resolveFilePaths(["README.md", "CHANGELOG.md"], repoDir);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toBe("README.md");
    expect(resolved[1]).toBe("CHANGELOG.md");
  });

  it("resolves case-insensitive paths on case-insensitive FS", async () => {
    const resolved = await resolveFilePaths(["readme.md", "changelog.md"], repoDir);
    expect(resolved).toHaveLength(2);
    if (process.platform === "win32" || process.platform === "darwin") {
      expect(resolved[0]).toBe("README.md");
      expect(resolved[1]).toBe("CHANGELOG.md");
    }
  });
});
