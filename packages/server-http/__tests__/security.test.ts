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

  it("includes --connect-timeout for connectTimeout", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      connectTimeout: 5,
      followRedirects: true,
    });

    const idx = args.indexOf("--connect-timeout");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("5");
  });

  it("does not include --connect-timeout when not specified", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
    });

    expect(args).not.toContain("--connect-timeout");
  });

  it("includes -u for basicAuth", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      basicAuth: "user:pass",
    });

    const idx = args.indexOf("-u");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("user:pass");
  });

  it("includes -x for proxy", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      proxy: "http://proxy:8080",
    });

    const idx = args.indexOf("-x");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("http://proxy:8080");
  });

  it("includes --http1.1 for httpVersion 1.1", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      httpVersion: "1.1",
    });

    expect(args).toContain("--http1.1");
  });

  it("includes --http2 for httpVersion 2", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      httpVersion: "2",
    });

    expect(args).toContain("--http2");
  });

  it("includes --http1.0 for httpVersion 1.0", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      httpVersion: "1.0",
    });

    expect(args).toContain("--http1.0");
  });

  it("includes -b for cookie", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      cookie: "session=abc123; theme=dark",
    });

    const idx = args.indexOf("-b");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("session=abc123; theme=dark");
  });

  it("includes --resolve for custom DNS resolution", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
      resolve: "example.com:443:127.0.0.1",
    });

    const idx = args.indexOf("--resolve");
    expect(idx).toBeGreaterThan(-1);
    expect(args[idx + 1]).toBe("example.com:443:127.0.0.1");
  });

  it("uses -I flag when useHeadFlag is true (instead of -X HEAD)", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "HEAD",
      timeout: 30,
      followRedirects: true,
      useHeadFlag: true,
    });

    expect(args).toContain("-I");
    expect(args).not.toContain("-X");
  });

  it("includes --post301/302/303 for preserveMethodOnRedirect", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "POST",
      body: '{"key":"value"}',
      timeout: 30,
      followRedirects: true,
      preserveMethodOnRedirect: true,
    });

    expect(args).toContain("--post301");
    expect(args).toContain("--post302");
    expect(args).toContain("--post303");
  });

  it("does not include --post301/302/303 when preserveMethodOnRedirect is not set", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "POST",
      body: '{"key":"value"}',
      timeout: 30,
      followRedirects: true,
    });

    expect(args).not.toContain("--post301");
    expect(args).not.toContain("--post302");
    expect(args).not.toContain("--post303");
  });

  it("includes --data-urlencode for dataUrlencode items", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "POST",
      timeout: 30,
      followRedirects: true,
      dataUrlencode: ["name=John Doe", "city=New York"],
    });

    const firstIdx = args.indexOf("--data-urlencode");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(args[firstIdx + 1]).toBe("name=John Doe");

    const secondIdx = args.indexOf("--data-urlencode", firstIdx + 1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(args[secondIdx + 1]).toBe("city=New York");
  });

  // ── Expanded -w format string tests ────────────────────────────────

  it("includes expanded timing variables in -w format string", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "GET",
      timeout: 30,
      followRedirects: true,
    });

    const wIdx = args.indexOf("-w");
    expect(wIdx).toBeGreaterThan(-1);
    const writeOut = args[wIdx + 1];

    expect(writeOut).toContain("%{time_total}");
    expect(writeOut).toContain("%{size_download}");
    expect(writeOut).toContain("%{time_namelookup}");
    expect(writeOut).toContain("%{time_connect}");
    expect(writeOut).toContain("%{time_appconnect}");
    expect(writeOut).toContain("%{time_pretransfer}");
    expect(writeOut).toContain("%{time_starttransfer}");
    expect(writeOut).toContain("%{size_upload}");
    expect(writeOut).toContain("%{http_version}");
    expect(writeOut).toContain("%{num_redirects}");
    expect(writeOut).toContain("%{url_effective}");
    expect(writeOut).toContain("%{scheme}");
    expect(writeOut).toContain("%{ssl_verify_result}");
  });

  // ── Form parameter tests ──────────────────────────────────────────

  it("includes -F flags for form data", () => {
    const args = buildCurlArgs({
      url: "https://example.com/upload",
      method: "POST",
      timeout: 30,
      followRedirects: true,
      form: {
        name: "test",
        file: "@/path/to/file.txt",
      },
    });

    const firstFIdx = args.indexOf("-F");
    expect(firstFIdx).toBeGreaterThan(-1);

    // Collect all -F values
    const formValues: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-F") {
        formValues.push(args[i + 1]);
      }
    }

    expect(formValues).toContain("name=test");
    expect(formValues).toContain("file=@/path/to/file.txt");
  });

  it("does not include --data-raw when form is provided", () => {
    const args = buildCurlArgs({
      url: "https://example.com/upload",
      method: "POST",
      body: '{"should":"be ignored"}',
      timeout: 30,
      followRedirects: true,
      form: {
        name: "test",
      },
    });

    expect(args).not.toContain("--data-raw");
    expect(args).toContain("-F");
  });

  it("does not include --data-urlencode when form is provided", () => {
    const args = buildCurlArgs({
      url: "https://example.com/upload",
      method: "POST",
      timeout: 30,
      followRedirects: true,
      dataUrlencode: ["name=John"],
      form: {
        field: "value",
      },
    });

    expect(args).not.toContain("--data-urlencode");
    expect(args).toContain("-F");
  });

  it("uses --data-raw when form is empty object", () => {
    const args = buildCurlArgs({
      url: "https://example.com",
      method: "POST",
      body: '{"key":"value"}',
      timeout: 30,
      followRedirects: true,
      form: {},
    });

    expect(args).toContain("--data-raw");
    expect(args).not.toContain("-F");
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
