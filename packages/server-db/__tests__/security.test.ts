/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in DB tools.
 *
 * These tools accept user-provided strings (database names, hosts, users, Redis
 * commands) that are passed as positional arguments to CLI tools. Without
 * validation, a malicious input like "--eval=..." could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--eval=rm -rf /",
  "-f",
  "--file=/etc/passwd",
  "-e",
  "--host=evil.com",
  "-h",
  "--password=secret",
  "-U",
  "--username=admin",
  // Whitespace bypass attempts
  " --eval",
  "\t-f",
  "   --host",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "mydb",
  "test_database",
  "localhost",
  "192.168.1.1",
  "postgres",
  "root",
  "GET",
  "SET",
  "PING",
  "db.users.find()",
  "mongodb://localhost:27017/mydb",
];

describe("security: psql — database/host/user validation", () => {
  it("rejects flag-like database names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "database")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe database names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "database")).not.toThrow();
    }
  });
});

describe("security: mysql — database/host/user validation", () => {
  it("rejects flag-like values", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "host")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe values", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "host")).not.toThrow();
    }
  });
});

describe("security: redis — command/host validation", () => {
  it("rejects flag-like commands", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "command")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe commands", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "command")).not.toThrow();
    }
  });
});

describe("security: mongosh — uri validation", () => {
  it("rejects flag-like URIs", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "uri")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe URIs", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "uri")).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — DB tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — DB tool schemas", () => {
  describe("query parameter (STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a query within the limit", () => {
      expect(schema.safeParse("SELECT * FROM users").success).toBe(true);
    });

    it("rejects a query exceeding STRING_MAX", () => {
      const oversized = "q".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("database parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a database name within the limit", () => {
      expect(schema.safeParse("mydb").success).toBe(true);
    });

    it("rejects a database name exceeding SHORT_STRING_MAX", () => {
      const oversized = "d".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("host parameter (SHORT_STRING_MAX)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a host within the limit", () => {
      expect(schema.safeParse("localhost").success).toBe(true);
    });

    it("rejects a host exceeding SHORT_STRING_MAX", () => {
      const oversized = "h".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("args array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `arg${i}`);
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal args", () => {
      expect(schema.safeParse(["key1", "value1"]).success).toBe(true);
    });
  });
});
