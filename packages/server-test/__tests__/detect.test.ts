import { describe, it, expect } from "vitest";
import { detectFramework } from "../src/lib/detect.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("detectFramework", () => {
  let tempDir: string;

  async function createTempDir() {
    tempDir = await mkdtemp(join(tmpdir(), "pare-test-"));
    return tempDir;
  }

  async function cleanup() {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }

  it("detects vitest from config file", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, "vitest.config.ts"), "export default {}");

    const result = await detectFramework(dir);
    expect(result).toBe("vitest");
    await cleanup();
  });

  it("detects vitest from package.json", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { vitest: "^1.0.0" } }),
    );

    const result = await detectFramework(dir);
    expect(result).toBe("vitest");
    await cleanup();
  });

  it("detects jest from config file", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, "jest.config.js"), "module.exports = {}");

    const result = await detectFramework(dir);
    expect(result).toBe("jest");
    await cleanup();
  });

  it("detects jest from package.json", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { jest: "^29.0.0" } }),
    );

    const result = await detectFramework(dir);
    expect(result).toBe("jest");
    await cleanup();
  });

  it("detects pytest from pyproject.toml", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, "pyproject.toml"), "[tool.pytest]");

    const result = await detectFramework(dir);
    expect(result).toBe("pytest");
    await cleanup();
  });

  it("detects pytest from conftest.py", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, "conftest.py"), "# pytest config");

    const result = await detectFramework(dir);
    expect(result).toBe("pytest");
    await cleanup();
  });

  it("detects mocha from .mocharc.yml", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, ".mocharc.yml"), "timeout: 5000");

    const result = await detectFramework(dir);
    expect(result).toBe("mocha");
    await cleanup();
  });

  it("detects mocha from .mocharc.json", async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, ".mocharc.json"), JSON.stringify({ timeout: 5000 }));

    const result = await detectFramework(dir);
    expect(result).toBe("mocha");
    await cleanup();
  });

  it("detects mocha from package.json dependency", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { mocha: "^10.0.0" } }),
    );

    const result = await detectFramework(dir);
    expect(result).toBe("mocha");
    await cleanup();
  });

  it("throws for unknown framework", async () => {
    const dir = await createTempDir();
    // Empty dir — no framework markers

    await expect(detectFramework(dir)).rejects.toThrow("No supported test framework detected");
    await cleanup();
  });

  it("prioritizes vitest over jest when both present", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { vitest: "^1.0.0", jest: "^29.0.0" } }),
    );

    const result = await detectFramework(dir);
    expect(result).toBe("vitest");
    await cleanup();
  });

  it("prioritizes jest over mocha when both present", async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { jest: "^29.0.0", mocha: "^10.0.0" } }),
    );

    const result = await detectFramework(dir);
    expect(result).toBe("jest");
    await cleanup();
  });
});
