import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PROFILES, resolveProfile, _resetProfileCache } from "../src/profiles.js";
import { shouldRegisterTool } from "../src/tool-filter.js";
import type { ProfileName } from "../src/profiles.js";

describe("profiles", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.PARE_PROFILE = process.env.PARE_PROFILE;
    savedEnv.PARE_TOOLS = process.env.PARE_TOOLS;
    savedEnv.PARE_GIT_TOOLS = process.env.PARE_GIT_TOOLS;
    savedEnv.PARE_NPM_TOOLS = process.env.PARE_NPM_TOOLS;
    delete process.env.PARE_PROFILE;
    delete process.env.PARE_TOOLS;
    delete process.env.PARE_GIT_TOOLS;
    delete process.env.PARE_NPM_TOOLS;
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

  describe("resolveProfile()", () => {
    it("returns null when no env var is set", () => {
      expect(resolveProfile()).toBeNull();
    });

    it("returns null when env var is empty string", () => {
      process.env.PARE_PROFILE = "";
      expect(resolveProfile()).toBeNull();
    });

    it("returns null when env var is whitespace only", () => {
      process.env.PARE_PROFILE = "   ";
      expect(resolveProfile()).toBeNull();
    });

    it('returns null for "full" profile', () => {
      process.env.PARE_PROFILE = "full";
      expect(resolveProfile()).toBeNull();
    });

    it("returns Set for valid profiles", () => {
      for (const name of ["minimal", "web", "python", "devops", "rust", "go"] as ProfileName[]) {
        _resetProfileCache();
        process.env.PARE_PROFILE = name;
        const result = resolveProfile();
        expect(result).toBeInstanceOf(Set);
        expect(result!.size).toBeGreaterThan(0);
      }
    });

    it("logs warning and returns null for unknown profile", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      process.env.PARE_PROFILE = "nonexistent";
      const result = resolveProfile();
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown profile "nonexistent"'),
      );
      warnSpy.mockRestore();
    });

    it("is case-insensitive", () => {
      process.env.PARE_PROFILE = "MINIMAL";
      const upper = resolveProfile();
      expect(upper).toBeInstanceOf(Set);

      _resetProfileCache();
      process.env.PARE_PROFILE = "Minimal";
      const mixed = resolveProfile();
      expect(mixed).toBeInstanceOf(Set);

      _resetProfileCache();
      process.env.PARE_PROFILE = "minimal";
      const lower = resolveProfile();
      expect(lower).toBeInstanceOf(Set);

      // All should contain the same tools
      expect(upper!.size).toBe(lower!.size);
      expect(mixed!.size).toBe(lower!.size);
    });

    it("caches the result across calls", () => {
      process.env.PARE_PROFILE = "minimal";
      const first = resolveProfile();
      const second = resolveProfile();
      expect(first).toBe(second); // Same reference
    });
  });

  describe("PROFILES definitions", () => {
    it('all entries match "server:tool" format', () => {
      const pattern = /^[a-z][a-z0-9]*:[a-z][a-z0-9-]*$/;
      for (const [name, tools] of Object.entries(PROFILES)) {
        if (tools === null) continue; // "full"
        for (const entry of tools) {
          expect(entry, `${name}: "${entry}" must match server:tool`).toMatch(pattern);
        }
      }
    });

    it('"full" profile is null', () => {
      expect(PROFILES.full).toBeNull();
    });

    it('"minimal" is a subset of "web"', () => {
      const minimal = new Set(PROFILES.minimal!);
      const web = new Set(PROFILES.web!);
      for (const tool of minimal) {
        expect(web.has(tool), `web should contain ${tool}`).toBe(true);
      }
    });

    it("all profiles contain git:status and git:commit", () => {
      for (const [name, tools] of Object.entries(PROFILES)) {
        if (tools === null) continue;
        const set = new Set(tools);
        expect(set.has("git:status"), `${name} should have git:status`).toBe(true);
        expect(set.has("git:commit"), `${name} should have git:commit`).toBe(true);
      }
    });

    it("has expected profile count", () => {
      expect(Object.keys(PROFILES)).toHaveLength(7);
    });
  });

  describe("shouldRegisterTool with PARE_PROFILE", () => {
    it("filters tools by profile", () => {
      process.env.PARE_PROFILE = "minimal";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(true);
      expect(shouldRegisterTool("docker", "ps")).toBe(false);
      expect(shouldRegisterTool("cargo", "build")).toBe(false);
    });

    it("PARE_TOOLS overrides PARE_PROFILE", () => {
      process.env.PARE_TOOLS = "git:status";
      process.env.PARE_PROFILE = "web";
      // PARE_TOOLS wins — only git:status allowed
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "log")).toBe(false);
      expect(shouldRegisterTool("npm", "install")).toBe(false);
    });

    it("PARE_PROFILE overrides per-server PARE_{SERVER}_TOOLS", () => {
      process.env.PARE_PROFILE = "minimal";
      process.env.PARE_GIT_TOOLS = "status,log,diff,show,blame";
      // Profile wins — blame is not in minimal
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("git", "blame")).toBe(false);
    });

    it('"full" profile enables all tools (same as no profile)', () => {
      process.env.PARE_PROFILE = "full";
      expect(shouldRegisterTool("git", "status")).toBe(true);
      expect(shouldRegisterTool("docker", "ps")).toBe(true);
      expect(shouldRegisterTool("cargo", "build")).toBe(true);
    });
  });
});
