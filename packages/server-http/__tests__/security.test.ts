/**
 * Security tests for the HTTP server package.
 * Verifies URL scheme validation, header injection prevention,
 * flag injection protection, and input limit constraints.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { assertNoFlagInjection, INPUT_LIMITS } from "@paretools/shared";
import { assertSafeUrl, assertSafeHeader } from "../src/lib/url-validation.js";
import { buildCurlArgs } from "../src/tools/request.js";

/** Malicious inputs that must be rejected by flag injection checks. */
const MALICIOUS_FLAG_INPUTS = [
  "--output=/etc/passwd",
  "-o /tmp/evil",
  "--proxy=evil.com:1234",
  "--upload-file=/etc/shadow",
  "-T /etc/shadow",
  "--create-dirs",
  "--config=/tmp/evil.conf",
  "-K /tmp/evil.conf",
  " --output=test",
  "\t-o /tmp/x",
];

describe("security: URL scheme validation", () => {
  it("allows http:// and https:// only", () => {
    expect(() => assertSafeUrl("http://api.example.com")).not.toThrow();
    expect(() => assertSafeUrl("https://api.example.com")).not.toThrow();
  });

  it("blocks file:// scheme (SSRF / LFI)", () => {
    expect(() => assertSafeUrl("file:///etc/passwd")).toThrow(/Unsafe URL scheme/);
    expect(() => assertSafeUrl("FILE:///etc/passwd")).toThrow(/Unsafe URL scheme/);
  });

  it("blocks ftp:// scheme", () => {
    expect(() => assertSafeUrl("ftp://evil.com/file")).toThrow(/Unsafe URL scheme/);
  });

  it("blocks gopher:// scheme (SSRF)", () => {
    expect(() => assertSafeUrl("gopher://evil.com/")).toThrow(/Unsafe URL scheme/);
  });

  it("blocks dict:// scheme", () => {
    expect(() => assertSafeUrl("dict://evil.com/")).toThrow(/Unsafe URL scheme/);
  });

  it("blocks data: scheme (XSS vector)", () => {
    expect(() => assertSafeUrl("data:text/html,<script>alert(1)</script>")).toThrow(
      /Unsafe URL scheme/,
    );
  });

  it("blocks javascript: scheme", () => {
    expect(() => assertSafeUrl("javascript:alert(1)")).toThrow(/Unsafe URL scheme/);
  });
});

describe("security: header key/value injection", () => {
  it("rejects headers with CRLF injection in keys", () => {
    expect(() => assertSafeHeader("X-Evil\r\nInject: bad", "value")).toThrow();
  });

  it("rejects headers with CRLF injection in values", () => {
    expect(() => assertSafeHeader("X-Normal", "value\r\nX-Injected: evil")).toThrow();
  });

  it("rejects headers with null bytes", () => {
    expect(() => assertSafeHeader("Key\x00Evil", "value")).toThrow();
    expect(() => assertSafeHeader("Key", "value\x00evil")).toThrow();
  });
});

describe("security: flag injection in header keys/values", () => {
  it("rejects flag-like header keys", () => {
    for (const input of MALICIOUS_FLAG_INPUTS) {
      expect(() => assertNoFlagInjection(input, "header key")).toThrow(/must not start with "-"/);
    }
  });

  it("rejects flag-like header values", () => {
    for (const input of MALICIOUS_FLAG_INPUTS) {
      expect(() => assertNoFlagInjection(input, "header value")).toThrow(/must not start with "-"/);
    }
  });

  it("accepts normal header keys and values", () => {
    expect(() => assertNoFlagInjection("Content-Type", "header key")).not.toThrow();
    expect(() => assertNoFlagInjection("application/json", "header value")).not.toThrow();
    expect(() => assertNoFlagInjection("Bearer abc123", "header value")).not.toThrow();
  });
});

describe("security: buildCurlArgs safety", () => {
  it("always includes -s and -S flags (silent + show errors)", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
    });

    expect(args).toContain("-s");
    expect(args).toContain("-S");
  });

  it("includes -i flag for response headers", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
    });

    expect(args).toContain("-i");
  });

  it("includes --max-time for timeout", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 10,
      followRedirects: true,
    });

    const idx = args.indexOf("--max-time");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("10");
  });

  it("limits redirects to 10 hops", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
    });

    const idx = args.indexOf("--max-redirs");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("10");
  });

  it("does not follow redirects when followRedirects is false", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: false,
    });

    expect(args).not.toContain("-L");
    expect(args).not.toContain("--max-redirs");
  });

  it("places URL as the last argument", () => {
    const args = buildCurlArgs({
      url: "https://example.com/api",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"key":"value"}',
      timeout: 30,
      followRedirects: true,
    });

    expect(args[args.length - 1]).toBe("https://example.com/api");
  });

  it("uses --data-raw for body (not --data)", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "POST",
      body: '{"key":"value"}',
      timeout: 30,
      followRedirects: true,
    });

    expect(args).toContain("--data-raw");
    expect(args).not.toContain("--data");
  });
});

// ---------------------------------------------------------------------------
// Zod .max() input-limit constraints — HTTP tool schemas
// ---------------------------------------------------------------------------

describe("Zod .max() constraints — HTTP tool schemas", () => {
  describe("URL (STRING_MAX = 65,536)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a normal URL", () => {
      expect(schema.safeParse("https://api.example.com/v1/users").success).toBe(true);
    });

    it("rejects a URL exceeding STRING_MAX", () => {
      const oversized = "https://example.com/" + "a".repeat(INPUT_LIMITS.STRING_MAX);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("body (STRING_MAX = 65,536)", () => {
    const schema = z.string().max(INPUT_LIMITS.STRING_MAX);

    it("accepts a normal request body", () => {
      expect(schema.safeParse('{"key":"value"}').success).toBe(true);
    });

    it("rejects a body exceeding STRING_MAX", () => {
      const oversized = "x".repeat(INPUT_LIMITS.STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("header key (SHORT_STRING_MAX = 255)", () => {
    const schema = z.string().max(INPUT_LIMITS.SHORT_STRING_MAX);

    it("accepts a normal header key", () => {
      expect(schema.safeParse("Content-Type").success).toBe(true);
    });

    it("rejects a header key exceeding SHORT_STRING_MAX", () => {
      const oversized = "H".repeat(INPUT_LIMITS.SHORT_STRING_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });

  describe("path (PATH_MAX = 4,096)", () => {
    const schema = z.string().max(INPUT_LIMITS.PATH_MAX);

    it("accepts a normal path", () => {
      expect(schema.safeParse("/home/user/project").success).toBe(true);
    });

    it("rejects a path exceeding PATH_MAX", () => {
      const oversized = "p".repeat(INPUT_LIMITS.PATH_MAX + 1);
      expect(schema.safeParse(oversized).success).toBe(false);
    });
  });
});
