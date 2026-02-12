/**
 * Security tests: verify that assertNoFlagInjection() prevents flag injection
 * attacks on user-supplied parameters in Python tools.
 *
 * These tools accept user-provided strings (file targets, marker expressions,
 * package names, requirements paths) that are passed as positional arguments
 * to Python CLI tools. Without validation, a malicious input like
 * "--output=/etc/passwd" could be interpreted as a flag.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";

/** Malicious inputs that must be rejected by every guarded parameter. */
const MALICIOUS_INPUTS = [
  "--output=/etc/passwd",
  "-c",
  "--config",
  "--install-option",
  "--global-option",
  "-e",
  "--editable",
  "--pre",
  "--force-reinstall",
  // Whitespace bypass attempts
  " --output",
  "\t-c",
  "   --config",
];

/** Safe inputs that must be accepted. */
const SAFE_INPUTS = [
  "tests/",
  "src/mymodule",
  "test_file.py",
  ".",
  "requests",
  "flask",
  "numpy>=1.0",
  "requirements.txt",
  "not slow",
  "src/",
];

describe("security: pytest — targets and markers validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe targets", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "targets")).not.toThrow();
    }
  });

  it("rejects flag-like markers", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "markers")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: black — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe targets", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "targets")).not.toThrow();
    }
  });
});

describe("security: mypy — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: ruff — targets validation", () => {
  it("rejects flag-like targets", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "targets")).toThrow(/must not start with "-"/);
    }
  });
});

describe("security: pip-install — packages and requirements validation", () => {
  it("rejects flag-like packages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts safe packages", () => {
    for (const safe of SAFE_INPUTS) {
      expect(() => assertNoFlagInjection(safe, "packages")).not.toThrow();
    }
  });

  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });

  it("accepts safe requirements paths", () => {
    expect(() => assertNoFlagInjection("requirements.txt", "requirements")).not.toThrow();
    expect(() => assertNoFlagInjection("reqs/dev.txt", "requirements")).not.toThrow();
  });
});

describe("security: pip-audit — requirements validation", () => {
  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

describe("security: uv-install — packages and requirements validation", () => {
  it("rejects flag-like packages", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "packages")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like requirements path", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "requirements")).toThrow(
        /must not start with "-"/,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// uv-run tool — command[0] validation
// ---------------------------------------------------------------------------

describe("security: uv-run tool — command[0] validation", () => {
  it("accepts normal command names", () => {
    expect(() => assertNoFlagInjection("python", "command")).not.toThrow();
    expect(() => assertNoFlagInjection("flask", "command")).not.toThrow();
    expect(() => assertNoFlagInjection("pytest", "command")).not.toThrow();
    expect(() => assertNoFlagInjection("mypy", "command")).not.toThrow();
    expect(() => assertNoFlagInjection("uvicorn", "command")).not.toThrow();
  });

  it("accepts commands with paths", () => {
    expect(() => assertNoFlagInjection("/usr/bin/python3", "command")).not.toThrow();
    expect(() => assertNoFlagInjection("./venv/bin/python", "command")).not.toThrow();
  });

  it("rejects flag-like command names", () => {
    for (const malicious of MALICIOUS_INPUTS) {
      expect(() => assertNoFlagInjection(malicious, "command")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects specific dangerous flag injections as command", () => {
    expect(() => assertNoFlagInjection("--help", "command")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("-c", "command")).toThrow(/must not start with "-"/);
    expect(() => assertNoFlagInjection("--exec=rm -rf /", "command")).toThrow(
      /must not start with "-"/,
    );
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — Python tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — Python tool schemas", () => {
  describe("uv-run command array (ARRAY_MAX + STRING_MAX)", () => {
    const schema = z.array(z.string().max(INPUT_LIMITS.STRING_MAX)).max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects array exceeding ARRAY_MAX", () => {
      const oversized = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, () => "arg");
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("rejects command string exceeding STRING_MAX", () => {
      const oversized = ["a".repeat(INPUT_LIMITS.STRING_MAX + 1)];
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

  describe("packages array (SHORT_STRING_MAX)", () => {
    const schema = z
      .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
      .max(INPUT_LIMITS.ARRAY_MAX);

    it("rejects package name exceeding SHORT_STRING_MAX", () => {
      const oversized = ["x".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1)];
      expect(schema.safeParse(oversized).success).toBe(false);
    });

    it("accepts normal package names", () => {
      expect(schema.safeParse(["flask", "requests", "numpy"]).success).toBe(true);
    });
  });
});
