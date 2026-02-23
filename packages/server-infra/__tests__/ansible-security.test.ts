import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected. */
const MALICIOUS_INPUTS = [
  "--eval=rm -rf /",
  "-e",
  "--flag",
  " --flag",
  "\t-f",
  "--extra-vars=malicious",
  "-C",
  "--syntax-check",
];

/** Safe inputs that must be accepted. */
const SAFE_PLAYBOOK_NAMES = [
  "playbook.yml",
  "site.yml",
  "roles/webserver/tasks/main.yml",
  "deploy.yaml",
  "my-playbook.yml",
  "playbooks/setup_db.yml",
];

const SAFE_INVENTORY_NAMES = [
  "inventory.ini",
  "hosts",
  "staging",
  "production/hosts.yml",
  "inventories/dev.ini",
];

const SAFE_COLLECTION_NAMES = [
  "community.general",
  "amazon.aws",
  "ansible.posix",
  "my_namespace.my_collection",
  "geerlingguy.nginx",
];

describe("security: ansible-playbook — flag injection", () => {
  it("rejects flag-like playbook names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "playbook")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe playbook names", () => {
    for (const safe of SAFE_PLAYBOOK_NAMES) {
      expect(() => assertNoFlagInjection(safe, "playbook")).not.toThrow();
    }
  });
});

describe("security: ansible-inventory — flag injection", () => {
  it("rejects flag-like inventory names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "inventory")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe inventory names", () => {
    for (const safe of SAFE_INVENTORY_NAMES) {
      expect(() => assertNoFlagInjection(safe, "inventory")).not.toThrow();
    }
  });
});

describe("security: ansible-galaxy — flag injection", () => {
  it("rejects flag-like collection/role names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "name")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe collection/role names", () => {
    for (const safe of SAFE_COLLECTION_NAMES) {
      expect(() => assertNoFlagInjection(safe, "name")).not.toThrow();
    }
  });
});

describe("Zod .max() constraints — Ansible playbook path", () => {
  const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

  it("accepts a path within the limit", () => {
    expect(schema.safeParse("playbook.yml").success).toBe(true);
  });

  it("rejects a path exceeding PATH_MAX", () => {
    const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
    expect(schema.safeParse(oversized).success).toBe(false);
  });
});

describe("Zod .max() constraints — Ansible host/limit string", () => {
  const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

  it("accepts a host name within the limit", () => {
    expect(schema.safeParse("webservers").success).toBe(true);
  });

  it("rejects a host name exceeding SHORT_STRING_MAX", () => {
    const oversized = "h".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
    expect(schema.safeParse(oversized).success).toBe(false);
  });
});

describe("Zod .max() constraints — Ansible extra-vars string", () => {
  const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

  it("accepts a normal extra-vars string", () => {
    expect(schema.safeParse('{"key": "value"}').success).toBe(true);
  });

  it("rejects an extra-vars string exceeding STRING_MAX", () => {
    const oversized = "x".repeat(INPUT_LIMITS.STRING_MAX + 1);
    expect(schema.safeParse(oversized).success).toBe(false);
  });
});
