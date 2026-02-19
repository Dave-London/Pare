import { describe, it, expect } from "vitest";
import { validateRegexPattern } from "../src/lib/validation.js";

describe("validateRegexPattern", () => {
  it("accepts valid regex patterns", () => {
    const validPatterns = [
      "hello",
      "function\\s+\\w+",
      "import.*from",
      "\\d{3}-\\d{4}",
      "^export",
      "TODO|FIXME|HACK",
      "[a-zA-Z_]\\w*",
      "\\bconst\\b",
      "foo\\.bar",
      "a+b*c?",
      "(abc|def)",
      "(?:group)",
    ];

    for (const pattern of validPatterns) {
      expect(() => validateRegexPattern(pattern)).not.toThrow();
    }
  });

  it("rejects unmatched opening parenthesis", () => {
    expect(() => validateRegexPattern("(abc")).toThrow(/Invalid regex pattern/);
  });

  it("rejects unmatched closing parenthesis", () => {
    expect(() => validateRegexPattern("abc)")).toThrow(/Invalid regex pattern/);
  });

  it("rejects unmatched opening bracket", () => {
    expect(() => validateRegexPattern("[abc")).toThrow(/Invalid regex pattern/);
  });

  it("rejects invalid quantifier", () => {
    expect(() => validateRegexPattern("*abc")).toThrow(/Invalid regex pattern/);
    expect(() => validateRegexPattern("+")).toThrow(/Invalid regex pattern/);
    expect(() => validateRegexPattern("?")).toThrow(/Invalid regex pattern/);
  });

  it("rejects invalid escape sequences", () => {
    // Trailing backslash is invalid
    expect(() => validateRegexPattern("abc\\")).toThrow(/Invalid regex pattern/);
  });

  it("rejects invalid repetition range", () => {
    expect(() => validateRegexPattern("a{3,1}")).toThrow(/Invalid regex pattern/);
  });

  it("includes the pattern in the error message", () => {
    try {
      validateRegexPattern("(unclosed");
      expect.fail("should have thrown");
    } catch (err: unknown) {
      expect((err as Error).message).toContain('"(unclosed"');
    }
  });

  it("includes fixedStrings hint in the error message", () => {
    try {
      validateRegexPattern("(unclosed");
      expect.fail("should have thrown");
    } catch (err: unknown) {
      expect((err as Error).message).toContain("fixedStrings: true");
    }
  });

  it("accepts empty string as valid regex", () => {
    expect(() => validateRegexPattern("")).not.toThrow();
  });

  it("accepts complex but valid regex", () => {
    expect(() => validateRegexPattern("(?<=@)\\w+\\.\\w+")).not.toThrow();
    expect(() => validateRegexPattern("(?:a|b){2,5}")).not.toThrow();
    expect(() => validateRegexPattern("^(?!.*secret)")).not.toThrow();
  });
});
