import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shouldRegisterTool, _resetProfileCache } from "../src/tool-filter.js";

describe("shouldRegisterTool", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save current env vars
    savedEnv.PARE_TOOLS = process.env.PARE_TOOLS;
    savedEnv.PARE_PROFILE = process.env.PARE_PROFILE;
    savedEnv.PARE_GIT_TOOLS = process.env.PARE_GIT_TOOLS;
    savedEnv.PARE_NPM_TOOLS = process.env.PARE_NPM_TOOLS;
    savedEnv.PARE_DOCKER_TOOLS = process.env.PARE_DOCKER_TOOLS;
    // Clean slate
    delete process.env.PARE_TOOLS;
    delete process.env.PARE_PROFILE;
    delete process.env.PARE_GIT_TOOLS;
    delete process.env.PARE_NPM_TOOLS;
    delete process.env.PARE_DOCKER_TOOLS;
    _resetProfileCache();
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
    _resetProfileCache();
  });

  describe("default behavior (no env vars)", () => {
    it("enables all tools when no env vars are set", () => {
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(true);
      expect(shouldRegisterTool("npm", "install")).toBe(true);
      expect(shouldRegisterTool("docker", "ps")).toBe(true);
    });
  });

  describe("universal filter (PARE_TOOLS)", () => {
    it("enables only specified tools", () => {
      process.env.PARE_TOOLS = "git:status,git:log";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(true);
      expect(shouldRegisterTool("git", "diff")).toBe(false);
      expect(shouldRegisterTool("npm", "install")).toBe(false);
    });

    it("handles whitespace in tool list", () => {
      process.env.PARE_TOOLS = "git:status , npm:install , docker:ps";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("npm", "install")).toBe(true);
      expect(shouldRegisterTool("docker", "ps")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(false);
    });

    it("disables everything when set to empty string", () => {
      process.env.PARE_TOOLS = "";
      expect(shouldRegisterTool("git", "status")).toBe(false);
      expect(shouldRegisterTool("npm", "install")).toBe(false);
    });

    it("disables everything when set to whitespace only", () => {
      process.env.PARE_TOOLS = "   ";
      expect(shouldRegisterTool("git", "status")).toBe(false);
    });

    it("overrides per-server filter", () => {
      process.env.PARE_TOOLS = "git:status";
      process.env.PARE_GIT_TOOLS = "status,log,diff";
      // Universal takes precedence — only git:status allowed
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(false);
      expect(shouldRegisterTool("git", "diff")).toBe(false);
    });
  });

  describe("per-server filter (PARE_{SERVER}_TOOLS)", () => {
    it("enables only specified tools for that server", () => {
      process.env.PARE_GIT_TOOLS = "status,log";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(true);
      expect(shouldRegisterTool("git", "diff")).toBe(false);
    });

    it("does not affect other servers", () => {
      process.env.PARE_GIT_TOOLS = "status";
      // npm has no filter set → all enabled
      expect(shouldRegisterTool("npm", "install")).toBe(true);
      expect(shouldRegisterTool("npm", "audit")).toBe(true);
    });

    it("handles whitespace in tool list", () => {
      process.env.PARE_GIT_TOOLS = " status , log ";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(true);
      expect(shouldRegisterTool("git", "diff")).toBe(false);
    });

    it("disables all tools for server when set to empty string", () => {
      process.env.PARE_GIT_TOOLS = "";
      expect(shouldRegisterTool("git", "status")).toBe(false);
      expect(shouldRegisterTool("git", "log")).toBe(false);
    });

    it("handles hyphenated server names", () => {
      // e.g., server name "my-server" → PARE_MY_SERVER_TOOLS
      process.env.PARE_MY_SERVER_TOOLS = "tool-a";
      expect(shouldRegisterTool("my-server", "tool-a")).toBe(true);
      expect(shouldRegisterTool("my-server", "tool-b")).toBe(false);
    });

    it("supports multiple per-server filters simultaneously", () => {
      process.env.PARE_GIT_TOOLS = "status";
      process.env.PARE_NPM_TOOLS = "install";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(false);
      expect(shouldRegisterTool("npm", "install")).toBe(true);
      expect(shouldRegisterTool("npm", "audit")).toBe(false);
    });
  });
});
