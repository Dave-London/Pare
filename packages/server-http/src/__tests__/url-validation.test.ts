import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertSafeUrl,
  assertSafeResolve,
  assertSafeCookie,
  assertSafeFormValues,
  isPrivateIP,
  assertSafeHeader,
} from "../lib/url-validation.js";

/* ------------------------------------------------------------------ */
/*  assertSafeUrl — scheme checks                                     */
/* ------------------------------------------------------------------ */
describe("assertSafeUrl — scheme validation", () => {
  it("allows http:// URLs", async () => {
    await expect(assertSafeUrl("http://example.com")).resolves.toBeUndefined();
  });

  it("allows https:// URLs", async () => {
    await expect(assertSafeUrl("https://example.com")).resolves.toBeUndefined();
  });

  it("rejects empty URL", async () => {
    await expect(assertSafeUrl("")).rejects.toThrow("URL must not be empty");
  });

  it("rejects file:// scheme", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow("Unsafe URL scheme");
  });

  it("rejects ftp:// scheme", async () => {
    await expect(assertSafeUrl("ftp://example.com")).rejects.toThrow("Unsafe URL scheme");
  });

  it("rejects gopher:// scheme", async () => {
    await expect(assertSafeUrl("gopher://evil.com")).rejects.toThrow("Unsafe URL scheme");
  });
});

/* ------------------------------------------------------------------ */
/*  assertSafeUrl — SSRF private IP blocking                          */
/* ------------------------------------------------------------------ */
describe("assertSafeUrl — SSRF protection", () => {
  // Save and restore env
  let origAllow: string | undefined;
  beforeEach(() => {
    origAllow = process.env.PARE_HTTP_ALLOW_PRIVATE;
    delete process.env.PARE_HTTP_ALLOW_PRIVATE;
  });
  afterEach(() => {
    if (origAllow !== undefined) process.env.PARE_HTTP_ALLOW_PRIVATE = origAllow;
    else delete process.env.PARE_HTTP_ALLOW_PRIVATE;
  });

  it("blocks 127.0.0.1 (loopback)", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 127.0.0.2 (loopback range)", async () => {
    await expect(assertSafeUrl("http://127.0.0.2/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 10.0.0.1 (RFC 1918)", async () => {
    await expect(assertSafeUrl("http://10.0.0.1/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 172.16.0.1 (RFC 1918)", async () => {
    await expect(assertSafeUrl("http://172.16.0.1/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 192.168.1.1 (RFC 1918)", async () => {
    await expect(assertSafeUrl("http://192.168.1.1/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 169.254.169.254 (link-local / cloud metadata)", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks 0.0.0.0", async () => {
    await expect(assertSafeUrl("http://0.0.0.0/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks [::1] (IPv6 loopback)", async () => {
    await expect(assertSafeUrl("http://[::1]/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks metadata.google.internal", async () => {
    await expect(assertSafeUrl("http://metadata.google.internal/")).rejects.toThrow(
      "metadata hostname",
    );
  });

  it("blocks metadata.internal", async () => {
    await expect(assertSafeUrl("http://metadata.internal/")).rejects.toThrow("metadata hostname");
  });

  // IP obfuscation
  it("blocks decimal IP 2130706433 (127.0.0.1)", async () => {
    await expect(assertSafeUrl("http://2130706433/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks hex IP 0x7f000001 (127.0.0.1)", async () => {
    await expect(assertSafeUrl("http://0x7f000001/")).rejects.toThrow("private/reserved IP");
  });

  it("blocks octal IP 0177.0.0.1 (127.0.0.1)", async () => {
    await expect(assertSafeUrl("http://0177.0.0.1/")).rejects.toThrow("private/reserved IP");
  });

  // Opt-out
  it("allows private IPs when PARE_HTTP_ALLOW_PRIVATE=true", async () => {
    process.env.PARE_HTTP_ALLOW_PRIVATE = "true";
    await expect(assertSafeUrl("http://127.0.0.1/")).resolves.toBeUndefined();
  });

  it("does NOT allow private IPs when PARE_HTTP_ALLOW_PRIVATE is set to other values", async () => {
    process.env.PARE_HTTP_ALLOW_PRIVATE = "yes";
    await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toThrow("private/reserved IP");
  });
});

/* ------------------------------------------------------------------ */
/*  isPrivateIP                                                        */
/* ------------------------------------------------------------------ */
describe("isPrivateIP", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.0.1",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
  ])("returns true for private IP %s", (ip) => {
    expect(isPrivateIP(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34"])("returns false for public IP %s", (ip) => {
    expect(isPrivateIP(ip)).toBe(false);
  });

  // Obfuscated forms
  it("detects decimal 2130706433 as private (127.0.0.1)", () => {
    expect(isPrivateIP("2130706433")).toBe(true);
  });

  it("detects hex 0x7f000001 as private (127.0.0.1)", () => {
    expect(isPrivateIP("0x7f000001")).toBe(true);
  });

  it("detects octal 0177.0.0.1 as private (127.0.0.1)", () => {
    expect(isPrivateIP("0177.0.0.1")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  assertSafeResolve — DNS rebinding protection                       */
/* ------------------------------------------------------------------ */
describe("assertSafeResolve", () => {
  let origAllow: string | undefined;
  beforeEach(() => {
    origAllow = process.env.PARE_HTTP_ALLOW_PRIVATE;
    delete process.env.PARE_HTTP_ALLOW_PRIVATE;
  });
  afterEach(() => {
    if (origAllow !== undefined) process.env.PARE_HTTP_ALLOW_PRIVATE = origAllow;
    else delete process.env.PARE_HTTP_ALLOW_PRIVATE;
  });

  it("allows public IP in resolve", () => {
    expect(() => assertSafeResolve("example.com:443:93.184.216.34")).not.toThrow();
  });

  it("blocks 127.0.0.1 in resolve", () => {
    expect(() => assertSafeResolve("example.com:443:127.0.0.1")).toThrow("private/reserved IP");
  });

  it("blocks 10.0.0.1 in resolve", () => {
    expect(() => assertSafeResolve("example.com:443:10.0.0.1")).toThrow("private/reserved IP");
  });

  it("blocks 192.168.1.1 in resolve", () => {
    expect(() => assertSafeResolve("example.com:443:192.168.1.1")).toThrow("private/reserved IP");
  });

  it("blocks 169.254.169.254 in resolve (metadata endpoint)", () => {
    expect(() => assertSafeResolve("example.com:80:169.254.169.254")).toThrow(
      "private/reserved IP",
    );
  });

  it("blocks multiple addresses if any is private", () => {
    expect(() => assertSafeResolve("example.com:443:93.184.216.34,127.0.0.1")).toThrow(
      "private/reserved IP",
    );
  });

  it("allows when PARE_HTTP_ALLOW_PRIVATE=true", () => {
    process.env.PARE_HTTP_ALLOW_PRIVATE = "true";
    expect(() => assertSafeResolve("example.com:443:127.0.0.1")).not.toThrow();
  });

  it("passes through malformed resolve (lets curl handle it)", () => {
    expect(() => assertSafeResolve("nocolon")).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/*  assertSafeCookie — file path rejection                             */
/* ------------------------------------------------------------------ */
describe("assertSafeCookie", () => {
  it("allows standard cookie string", () => {
    expect(() => assertSafeCookie("session=abc123")).not.toThrow();
  });

  it("allows multiple cookies", () => {
    expect(() => assertSafeCookie("a=1; b=2")).not.toThrow();
  });

  it("rejects file path (no = sign)", () => {
    expect(() => assertSafeCookie("/etc/passwd")).toThrow('must be in "name=value" format');
  });

  it("rejects bare cookie jar filename", () => {
    expect(() => assertSafeCookie("cookies.txt")).toThrow('must be in "name=value" format');
  });

  it("rejects Windows file path", () => {
    expect(() => assertSafeCookie("C:\\Users\\cookies.txt")).toThrow(
      'must be in "name=value" format',
    );
  });
});

/* ------------------------------------------------------------------ */
/*  assertSafeFormValues — file exfiltration protection                */
/* ------------------------------------------------------------------ */
describe("assertSafeFormValues", () => {
  let origAllow: string | undefined;
  beforeEach(() => {
    origAllow = process.env.PARE_HTTP_ALLOW_FILE_UPLOAD;
    delete process.env.PARE_HTTP_ALLOW_FILE_UPLOAD;
  });
  afterEach(() => {
    if (origAllow !== undefined) process.env.PARE_HTTP_ALLOW_FILE_UPLOAD = origAllow;
    else delete process.env.PARE_HTTP_ALLOW_FILE_UPLOAD;
  });

  it("allows normal form values", () => {
    expect(() => assertSafeFormValues({ name: "John", age: "30" })).not.toThrow();
  });

  it("blocks @filepath in form value", () => {
    expect(() => assertSafeFormValues({ file: "@/etc/passwd" })).toThrow("file upload");
  });

  it("blocks @filepath for Windows paths", () => {
    expect(() => assertSafeFormValues({ file: "@C:\\secrets.txt" })).toThrow("file upload");
  });

  it("allows @filepath when PARE_HTTP_ALLOW_FILE_UPLOAD=true", () => {
    process.env.PARE_HTTP_ALLOW_FILE_UPLOAD = "true";
    expect(() => assertSafeFormValues({ file: "@/etc/passwd" })).not.toThrow();
  });

  it("reports the field name in the error", () => {
    expect(() => assertSafeFormValues({ avatar: "@photo.png" })).toThrow('"avatar"');
  });
});

/* ------------------------------------------------------------------ */
/*  assertSafeHeader — unchanged behavior                              */
/* ------------------------------------------------------------------ */
describe("assertSafeHeader", () => {
  it("allows normal headers", () => {
    expect(() => assertSafeHeader("Content-Type", "application/json")).not.toThrow();
  });

  it("rejects newline in key", () => {
    expect(() => assertSafeHeader("Bad\nKey", "value")).toThrow("must not contain newlines");
  });

  it("rejects newline in value", () => {
    expect(() => assertSafeHeader("Key", "bad\r\nvalue")).toThrow("must not contain newlines");
  });

  it("rejects null byte in value", () => {
    expect(() => assertSafeHeader("Key", "bad\x00value")).toThrow("must not contain newlines");
  });
});
