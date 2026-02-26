import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isLazyEnabled, _resetProfileCache } from "../src/tool-filter.js";
import { isCoreToolForServer } from "../src/profiles.js";

describe("isLazyEnabled", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.PARE_LAZY = process.env.PARE_LAZY;
    savedEnv.PARE_TOOLS = process.env.PARE_TOOLS;
    savedEnv.PARE_PROFILE = process.env.PARE_PROFILE;
    delete process.env.PARE_LAZY;
    delete process.env.PARE_TOOLS;
    delete process.env.PARE_PROFILE;
    _resetProfileCache();
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
    _resetProfileCache();
  });

  it("returns false by default (no env vars)", () => {
    expect(isLazyEnabled()).toBe(false);
  });

  it("returns true when PARE_LAZY=true", () => {
    process.env.PARE_LAZY = "true";
    expect(isLazyEnabled()).toBe(true);
  });

  it("is case-insensitive", () => {
    process.env.PARE_LAZY = "TRUE";
    expect(isLazyEnabled()).toBe(true);

    process.env.PARE_LAZY = "True";
    expect(isLazyEnabled()).toBe(true);
  });

  it("handles whitespace", () => {
    process.env.PARE_LAZY = "  true  ";
    expect(isLazyEnabled()).toBe(true);
  });

  it("returns false for non-true values", () => {
    process.env.PARE_LAZY = "false";
    expect(isLazyEnabled()).toBe(false);

    process.env.PARE_LAZY = "1";
    expect(isLazyEnabled()).toBe(false);

    process.env.PARE_LAZY = "yes";
    expect(isLazyEnabled()).toBe(false);
  });

  it("returns false when PARE_TOOLS is set (explicit filter takes precedence)", () => {
    process.env.PARE_LAZY = "true";
    process.env.PARE_TOOLS = "git:status";
    expect(isLazyEnabled()).toBe(false);
  });

  it("returns false when PARE_PROFILE=full is set", () => {
    process.env.PARE_LAZY = "true";
    process.env.PARE_PROFILE = "full";
    expect(isLazyEnabled()).toBe(false);
  });

  it("returns true when PARE_PROFILE is a non-full profile", () => {
    process.env.PARE_LAZY = "true";
    process.env.PARE_PROFILE = "minimal";
    expect(isLazyEnabled()).toBe(true);
  });
});

describe("isCoreToolForServer", () => {
  it("returns true for core git tools", () => {
    expect(isCoreToolForServer("git", "status")).toBe(true);
    expect(isCoreToolForServer("git", "log")).toBe(true);
    expect(isCoreToolForServer("git", "diff")).toBe(true);
    expect(isCoreToolForServer("git", "commit")).toBe(true);
    expect(isCoreToolForServer("git", "push")).toBe(true);
    expect(isCoreToolForServer("git", "pull")).toBe(true);
    expect(isCoreToolForServer("git", "checkout")).toBe(true);
    expect(isCoreToolForServer("git", "branch")).toBe(true);
    expect(isCoreToolForServer("git", "add")).toBe(true);
  });

  it("returns false for extended git tools", () => {
    expect(isCoreToolForServer("git", "bisect")).toBe(false);
    expect(isCoreToolForServer("git", "worktree")).toBe(false);
    expect(isCoreToolForServer("git", "submodule")).toBe(false);
    expect(isCoreToolForServer("git", "archive")).toBe(false);
    expect(isCoreToolForServer("git", "clean")).toBe(false);
    expect(isCoreToolForServer("git", "config")).toBe(false);
    expect(isCoreToolForServer("git", "reflog")).toBe(false);
  });

  it("returns true for core github tools", () => {
    expect(isCoreToolForServer("github", "pr-view")).toBe(true);
    expect(isCoreToolForServer("github", "pr-list")).toBe(true);
    expect(isCoreToolForServer("github", "issue-view")).toBe(true);
  });

  it("returns false for extended github tools", () => {
    expect(isCoreToolForServer("github", "gist-create")).toBe(false);
    expect(isCoreToolForServer("github", "release-create")).toBe(false);
    expect(isCoreToolForServer("github", "discussion-list")).toBe(false);
    expect(isCoreToolForServer("github", "api")).toBe(false);
  });

  it("returns true for core npm tools", () => {
    expect(isCoreToolForServer("npm", "install")).toBe(true);
    expect(isCoreToolForServer("npm", "run")).toBe(true);
    expect(isCoreToolForServer("npm", "test")).toBe(true);
  });

  it("returns false for extended npm tools", () => {
    expect(isCoreToolForServer("npm", "init")).toBe(false);
    expect(isCoreToolForServer("npm", "nvm")).toBe(false);
    expect(isCoreToolForServer("npm", "search")).toBe(false);
  });

  it("treats all tools as core for unknown servers", () => {
    expect(isCoreToolForServer("unknown-server", "any-tool")).toBe(true);
  });
});
