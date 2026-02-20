/**
 * Security tests: verify that assertNoFlagInjection() and assertAllowedCommand()
 * prevent injection attacks on user-supplied parameters in Ruby tools.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by assertNoFlagInjection. */
const MALICIOUS_INPUTS = [
  "--eval=system('rm -rf /')",
  "-e",
  "--require=/etc/passwd",
  "-r",
  "--debug",
  "-d",
  " --eval",
  "\t-e",
  "   --require",
];

/** Safe inputs that must be accepted by assertNoFlagInjection. */
const SAFE_INPUTS = [
  "hello.rb",
  "script.rb",
  "my-gem",
  "rake_task",
  "rails",
  "bundler",
  "v1.0.0",
  "path/to/file.rb",
];

describe("security: ruby run — file validation", () => {
  it("rejects flag-like file paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "file")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe file paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "file")).not.toThrow();
    }
  });
});

describe("security: gem-install — gem name validation", () => {
  it("rejects flag-like gem names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "gem")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe gem names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "gem")).not.toThrow();
    }
  });
});

describe("security: bundle-exec — command validation", () => {
  it("rejects flag-like commands", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "command")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe commands", () => {
    const safeCommands = ["rake", "rspec", "rubocop", "rails", "irb", "puma"];
    for (const cmd of safeCommands) {
      expect(() => assertNoFlagInjection(cmd, "command")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Ruby tool schemas", () => {
  describe("file parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a file path within the limit", () => {
      expect(schema.safeParse("hello.rb").success).toBe(true);
    });

    it("rejects a file path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("gem parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a gem name within the limit", () => {
      expect(schema.safeParse("rake").success).toBe(true);
    });

    it("rejects a gem name exceeding SHORT_STRING_MAX", () => {
      const oversized = "g".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `arg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects arg exceeding STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["--verbose", "test"]).success).toBe(true);
    });
  });
});
