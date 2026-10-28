/**
 * Tests for #1094 — `config` may set `core.hooksPath` only to a directory of
 * tracked files inside the working tree, at local/worktree scope. Real temp repos
 * (no git mocking), because the check resolves paths and asks git what is tracked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerConfigTool } from "../src/tools/config.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown;
  structuredContent: Record<string, unknown>;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function run(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function localHooksPath(cwd: string): string {
  try {
    return run(["config", "--local", "core.hooksPath"], cwd).trim();
  } catch {
    return "";
  }
}

describe("config core.hooksPath (#1094)", () => {
  let repoDir: string;
  let outsideDir: string;
  let handler: ToolHandler;

  const set = (value: string, scope?: string) =>
    handler({ path: repoDir, action: "set", key: "core.hooksPath", value, scope });

  beforeEach(() => {
    repoDir = mkdtempSync(join(tmpdir(), "pare-git-hookspath-"));
    outsideDir = mkdtempSync(join(tmpdir(), "pare-git-hookspath-outside-"));
    // If a guard regressed, the global/system cases must not touch real config.
    vi.stubEnv("GIT_CONFIG_GLOBAL", join(outsideDir, "global.gitconfig"));
    vi.stubEnv("GIT_CONFIG_SYSTEM", join(outsideDir, "system.gitconfig"));
    run(["init"], repoDir);
    run(["config", "user.email", "test@test.com"], repoDir);
    run(["config", "user.name", "Test"], repoDir);

    mkdirSync(join(repoDir, ".githooks"));
    writeFileSync(join(repoDir, ".githooks", "pre-commit"), "#!/bin/sh\nexit 0\n");
    mkdirSync(join(repoDir, "untracked-hooks"));
    writeFileSync(join(repoDir, "untracked-hooks", "pre-commit"), "#!/bin/sh\nexit 0\n");
    mkdirSync(join(repoDir, "src"));
    writeFileSync(join(repoDir, "src", "a.txt"), "a\n");
    run(["add", ".githooks", "src"], repoDir);
    run(["commit", "-m", "init"], repoDir);

    const server = new FakeServer();
    registerConfigTool(server as never);
    handler = server.tools.get("config")!.handler;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(repoDir, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  });

  it("allows a tracked in-repo directory at default (local) scope", async () => {
    const result = await set(".githooks");
    expect(result.structuredContent.success).toBe(true);
    expect(localHooksPath(repoDir)).toBe(".githooks");
  });

  it("allows it at explicit local and worktree scope, and from a subdirectory", async () => {
    await set(".githooks", "local");
    expect(localHooksPath(repoDir)).toBe(".githooks");

    const sub = await handler({
      path: join(repoDir, "src"),
      action: "set",
      key: "core.hooksPath",
      value: "./.githooks/",
    });
    expect(sub.structuredContent.success).toBe(true);
  });

  it.each([
    ["global scope", ".githooks", "global"],
    ["system scope", ".githooks", "system"],
    ["an absolute path", "__OUTSIDE__", undefined],
    ["a path escaping the repo", "../escape", undefined],
    ["an untracked directory", "untracked-hooks", undefined],
    ["a missing directory", "no-such-dir", undefined],
    ["the repo root itself", ".", undefined],
    ["a file instead of a directory", ".githooks/pre-commit", undefined],
    ["a home-relative path", "~/hooks", undefined],
  ])("blocks %s", async (_label, value, scope) => {
    const v = value === "__OUTSIDE__" ? outsideDir : value;
    await expect(set(v, scope)).rejects.toThrow(/core\.hooksPath" is blocked/);
    expect(localHooksPath(repoDir)).toBe("");
  });

  it("blocks a symlink inside the repo that points outside it", async () => {
    try {
      symlinkSync(outsideDir, join(repoDir, "linked-hooks"), "junction");
    } catch {
      return; // symlinks unavailable on this host
    }
    await expect(set("linked-hooks")).rejects.toThrow(/is blocked/);
    expect(localHooksPath(repoDir)).toBe("");
  });

  it("keeps blocking the other dangerous keys", async () => {
    await expect(
      handler({ path: repoDir, action: "set", key: "core.fsmonitor", value: "true" }),
    ).rejects.toThrow(/can execute arbitrary commands/);
  });
});
