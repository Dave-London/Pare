import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected. */
const MALICIOUS_INPUTS = [
  "--evil",
  "-destroy",
  "--machine=hack",
  "-f",
  "--force",
  " --evil",
  "\t-flag",
];

/** Safe machine names that must be accepted. */
const SAFE_INPUTS = ["default", "web-server", "db_primary", "app01", "my-vm"];

describe("security: vagrant machine name — flag injection", () => {
  it("rejects flag-like machine names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "machine")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe machine names", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "machine")).not.toThrow();
    }
  });
});

describe("Zod .max() constraints — Vagrant machine name", () => {
  const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

  it("accepts a name within the limit", () => {
    expect(schema.safeParse("default").success).toBe(true);
  });

  it("rejects a name exceeding SHORT_STRING_MAX", () => {
    const oversized = "m".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
    expect(schema.safeParse(oversized).success).toBe(false);
  });
});
