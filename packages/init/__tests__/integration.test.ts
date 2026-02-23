import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const INIT_PATH = resolve(__dirname, "../dist/index.js");
const DOCTOR_PATH = resolve(__dirname, "../dist/doctor.js");

describe("pare-init CLI", () => {
  it("shows help with --help", () => {
    const output = execFileSync("node", [INIT_PATH, "--help"], { encoding: "utf-8" });
    expect(output).toContain("Usage: pare-init");
    expect(output).toContain("--client");
    expect(output).toContain("--preset");
    expect(output).toContain("--dry-run");
  });

  it("shows version with --version", () => {
    const output = execFileSync("node", [INIT_PATH, "--version"], { encoding: "utf-8" });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("runs dry-run for claude-code with web preset", () => {
    const output = execFileSync(
      "node",
      [INIT_PATH, "--client", "claude-code", "--preset", "web", "--dry-run"],
      { encoding: "utf-8" },
    );
    expect(output).toContain("[dry-run]");
    expect(output).toContain("mcpServers");
    expect(output).toContain("pare-git");
    expect(output).toContain("pare-npm");
    expect(output).toContain("pare-build");
    expect(output).toContain("pare-lint");
    expect(output).toContain("pare-test");
  });

  it("runs dry-run for vscode with full preset", () => {
    const output = execFileSync(
      "node",
      [INIT_PATH, "--client", "vscode", "--preset", "full", "--dry-run"],
      { encoding: "utf-8" },
    );
    expect(output).toContain("[dry-run]");
    expect(output).toContain('"servers"');
    expect(output).toContain('"type": "stdio"');
  });

  it("runs dry-run for codex with web preset", () => {
    const output = execFileSync(
      "node",
      [INIT_PATH, "--client", "codex", "--preset", "web", "--dry-run"],
      { encoding: "utf-8" },
    );
    expect(output).toContain("[dry-run]");
    expect(output).toContain("pare-git");
  });

  it("runs dry-run for continue with python preset", () => {
    const output = execFileSync(
      "node",
      [INIT_PATH, "--client", "continue", "--preset", "python", "--dry-run"],
      { encoding: "utf-8" },
    );
    expect(output).toContain("[dry-run]");
    expect(output).toContain("pare-git");
    expect(output).toContain("pare-python");
  });

  it("exits with error for unknown client", () => {
    expect(() =>
      execFileSync("node", [INIT_PATH, "--client", "unknown-client", "--preset", "web"], {
        encoding: "utf-8",
        stdio: "pipe",
      }),
    ).toThrow();
  });

  it("exits with error for unknown preset", () => {
    expect(() =>
      execFileSync("node", [INIT_PATH, "--client", "claude-code", "--preset", "unknown-preset"], {
        encoding: "utf-8",
        stdio: "pipe",
      }),
    ).toThrow();
  });
});

describe("pare-doctor CLI", () => {
  it("shows help with --help", () => {
    const output = execFileSync("node", [DOCTOR_PATH, "--help"], { encoding: "utf-8" });
    expect(output).toContain("Usage: pare-doctor");
    expect(output).toContain("--client");
  });

  it("shows version with --version", () => {
    const output = execFileSync("node", [DOCTOR_PATH, "--version"], { encoding: "utf-8" });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
