/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in SSH/rsync tools.
 *
 * These tools accept user-provided strings (hostnames, usernames, paths) that are
 * passed as positional arguments to ssh/rsync. Without validation, a malicious
 * input like "--proxy-command=..." could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--proxy-command=rm -rf /",
  "-o ProxyCommand=evil",
  "--rsh=evil",
  "-e evil-shell",
  "--delete",
  "-f",
  "--include-from=/etc/passwd",
  // Whitespace bypass attempts
  " --proxy-command",
  "\t-o",
  "   --rsh",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "server.example.com",
  "192.168.1.100",
  "deploy",
  "root",
  "my-project/src/",
  "/var/www/html/",
  "user@host:/path/to/files",
  "v1.0.0",
];

describe("security: ssh-run — host validation", () => {
  it("rejects flag-like hosts", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "host")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe hostnames", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "host")).not.toThrow();
    }
  });
});

describe("security: ssh-run — user validation", () => {
  it("rejects flag-like usernames", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "user")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe usernames", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "user")).not.toThrow();
    }
  });
});

describe("security: rsync — source/destination validation", () => {
  it("rejects flag-like source paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "source")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like destination paths", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "destination")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe paths", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "source")).not.toThrow();
      expect(() => assertNoFlagInjection(safe, "destination")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Remote tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Remote tool schemas", () => {
  describe("host parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a host within the limit", () => {
      expect(schema.safeParse("server.example.com").success).toBe(true);
    });

    it("rejects a host exceeding SHORT_STRING_MAX", () => {
      const oversized = "h".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("command parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a command within the limit", () => {
      expect(schema.safeParse("uptime && df -h").success).toBe(true);
    });

    it("rejects a command exceeding STRING_MAX", () => {
      const oversized = "c".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("path parameter (PATH_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a path within the limit", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("options array (ARRAY_MAX + SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `opt${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects option exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal options", () => {
      expect(schema.safeParse(["StrictHostKeyChecking=no", "ConnectTimeout=10"]).success).toBe(
        true,
      );
    });
  });
});
