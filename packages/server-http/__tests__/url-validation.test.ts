import { describe, it, expect } from "vitest";
import { assertSafeUrl, assertSafeHeader } from "../src/lib/url-validation.js";

describe("assertSafeUrl", () => {
  describe("accepts valid HTTP URLs", () => {
    const validUrls = [
      "http://example.com",
      "https://example.com",
      "http://localhost:3000",
      "https://api.example.com/v1/users",
      "http://192.168.1.1:8080/path",
      "https://example.com/path?query=1&foo=bar",
      "https://user:pass@example.com/path",
      "HTTP://EXAMPLE.COM",
      "HTTPS://EXAMPLE.COM",
      "https://example.com/path#fragment",
    ];

    for (const url of validUrls) {
      it(`accepts "${url}"`, () => {
        expect(() => assertSafeUrl(url)).not.toThrow();
      });
    }
  });

  describe("rejects dangerous URL schemes", () => {
    const dangerousUrls = [
      "file:///etc/passwd",
      "ftp://evil.com/file",
      "gopher://evil.com/",
      "dict://evil.com/",
      "data:text/html,<script>alert(1)</script>",
      "javascript:alert(1)",
      "ldap://evil.com/",
      "sftp://evil.com/file",
      "telnet://evil.com",
    ];

    for (const url of dangerousUrls) {
      it(`rejects "${url}"`, () => {
        expect(() => assertSafeUrl(url)).toThrow(/Unsafe URL scheme/);
      });
    }
  });

  describe("rejects malformed inputs", () => {
    it("rejects empty string", () => {
      expect(() => assertSafeUrl("")).toThrow(/must not be empty/);
    });

    it("rejects whitespace-only string", () => {
      expect(() => assertSafeUrl("   ")).toThrow(/must not be empty/);
    });

    it("rejects string without scheme", () => {
      expect(() => assertSafeUrl("example.com")).toThrow(/Unsafe URL scheme/);
    });

    it("rejects relative path", () => {
      expect(() => assertSafeUrl("/path/to/file")).toThrow(/Unsafe URL scheme/);
    });
  });

  it("trims whitespace before validation", () => {
    expect(() => assertSafeUrl("  https://example.com  ")).not.toThrow();
  });

  it("is case-insensitive for scheme", () => {
    expect(() => assertSafeUrl("HTTPS://example.com")).not.toThrow();
    expect(() => assertSafeUrl("Http://example.com")).not.toThrow();
  });
});

describe("assertSafeHeader", () => {
  it("accepts normal header key-value pairs", () => {
    expect(() => assertSafeHeader("Content-Type", "application/json")).not.toThrow();
    expect(() => assertSafeHeader("Authorization", "Bearer token123")).not.toThrow();
    expect(() => assertSafeHeader("X-Custom", "some value")).not.toThrow();
  });

  it("rejects header key with newline", () => {
    expect(() => assertSafeHeader("Bad\nKey", "value")).toThrow(/header key/i);
  });

  it("rejects header key with carriage return", () => {
    expect(() => assertSafeHeader("Bad\rKey", "value")).toThrow(/header key/i);
  });

  it("rejects header key with null byte", () => {
    expect(() => assertSafeHeader("Bad\x00Key", "value")).toThrow(/header key/i);
  });

  it("rejects header value with newline", () => {
    expect(() => assertSafeHeader("Key", "bad\nvalue")).toThrow(/header value/i);
  });

  it("rejects header value with carriage return", () => {
    expect(() => assertSafeHeader("Key", "bad\rvalue")).toThrow(/header value/i);
  });

  it("rejects header value with null byte", () => {
    expect(() => assertSafeHeader("Key", "bad\x00value")).toThrow(/header value/i);
  });
});
