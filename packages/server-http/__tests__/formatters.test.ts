import { describe, it, expect } from "vitest";
import {
  formatHttpResponse,
  formatHttpHeadResponse,
  schemaResponseMap,
  schemaHeadResponseMap,
  compactResponseMap,
  formatResponseCompact,
  compactHeadResponseMap,
  formatHeadResponseCompact,
} from "../src/lib/formatters.js";
import type { HttpResponseInternal, HttpHeadResponseInternal } from "../src/schemas/index.js";

describe("formatHttpResponse", () => {
  it("formats a successful JSON response", () => {
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
        "content-length": "13",
      },
      body: '{"ok":true}',
      timing: { total: 0.25 },
      size: 13,
      contentType: "application/json",
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("HTTP 200 OK");
    expect(output).toContain("Content-Type: application/json");
    expect(output).toContain("Size: 13 bytes");
    expect(output).toContain("Time: 0.250s");
    expect(output).toContain("Headers: 2");
    expect(output).toContain('{"ok":true}');
  });

  it("formats a response without body", () => {
    const data: HttpResponseInternal = {
      status: 204,
      statusText: "No Content",
      headers: {},
      timing: { total: 0.1 },
      size: 0,
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("HTTP 204 No Content");
    expect(output).toContain("Size: 0 bytes");
    expect(output).not.toContain("Content-Type:");
  });

  it("truncates long body in human-readable output", () => {
    const longBody = "x".repeat(600);
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      body: longBody,
      timing: { total: 0.5 },
      size: 600,
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("...");
    // Body preview should be truncated to ~500 chars
    expect(output.length).toBeLessThan(longBody.length + 200);
  });

  it("formats response with expanded timing details", () => {
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: {
        total: 0.5,
        details: {
          namelookup: 0.01,
          connect: 0.05,
          appconnect: 0.12,
          pretransfer: 0.125,
          starttransfer: 0.4,
        },
      },
      size: 100,
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("Time: 0.500s");
    expect(output).toContain("dns=0.010s");
    expect(output).toContain("tcp=0.050s");
    expect(output).toContain("tls=0.120s");
    expect(output).toContain("pre=0.125s");
    expect(output).toContain("ttfb=0.400s");
  });

  it("formats response with timing details without TLS (no appconnect)", () => {
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: {
        total: 0.3,
        details: {
          namelookup: 0.005,
          connect: 0.03,
          starttransfer: 0.2,
        },
      },
      size: 50,
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("dns=0.005s");
    expect(output).toContain("tcp=0.030s");
    expect(output).not.toContain("tls=");
    expect(output).toContain("ttfb=0.200s");
  });

  it("formats version, redirect chain, and TLS metadata when present", () => {
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: {
        "content-type": "application/json",
      },
      timing: { total: 0.2 },
      size: 10,
      uploadSize: 128,
      redirectChain: [{ status: 302, location: "https://example.com/final" }],
      finalUrl: "https://example.com/final",
      scheme: "https",
      tlsVerifyResult: 0,
    };

    const output = formatHttpResponse(data);

    expect(output).toContain("HTTP/2 200 OK");
    expect(output).toContain("uploaded 128 bytes");
    expect(output).toContain("Redirects: 1");
    expect(output).toContain("302 -> https://example.com/final");
    expect(output).toContain("Final URL: https://example.com/final");
    expect(output).toContain("Scheme: https");
    expect(output).toContain("TLS verify result: 0");
  });
});

describe("formatHttpHeadResponse", () => {
  it("formats a HEAD response", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "text/html",
        "content-length": "5000",
      },
      timing: { total: 0.15 },
      contentType: "text/html",
    };

    const output = formatHttpHeadResponse(data);

    expect(output).toContain("HTTP 200 OK");
    expect(output).toContain("Content-Type: text/html");
    expect(output).toContain("Time: 0.150s");
    expect(output).toContain("Headers: 2");
    // Should NOT contain body-related content
    expect(output).not.toContain("Size:");
  });

  it("includes contentLength in human-readable output when present", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "text/html",
        "content-length": "5000",
      },
      timing: { total: 0.15 },
      contentType: "text/html",
      contentLength: 5000,
    };

    const output = formatHttpHeadResponse(data);

    expect(output).toContain("Content-Length: 5000");
  });

  it("omits contentLength line when not present", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: { total: 0.1 },
    };

    const output = formatHttpHeadResponse(data);

    expect(output).not.toContain("Content-Length:");
  });

  it("formats HEAD response with expanded timing details", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: {
        total: 0.2,
        details: {
          namelookup: 0.008,
          connect: 0.04,
          appconnect: 0.11,
        },
      },
    };

    const output = formatHttpHeadResponse(data);

    expect(output).toContain("Time: 0.200s");
    expect(output).toContain("dns=0.008s");
    expect(output).toContain("tcp=0.040s");
    expect(output).toContain("tls=0.110s");
  });

  it("formats HEAD response with HTTP version and redirect/TLS metadata", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: {},
      timing: { total: 0.2 },
      redirectChain: [{ status: 302, location: "https://example.com/final" }],
      finalUrl: "https://example.com/final",
      scheme: "https",
      tlsVerifyResult: 0,
    };

    const output = formatHttpHeadResponse(data);

    expect(output).toContain("HTTP/2 200 OK");
    expect(output).toContain("Redirects: 1");
    expect(output).toContain("Final URL: https://example.com/final");
    expect(output).toContain("Scheme: https");
    expect(output).toContain("TLS verify result: 0");
  });
});

// -- Schema maps (strip Internal-only fields for structuredContent) -----------

describe("schemaResponseMap", () => {
  it("keeps schema fields and strips Internal-only fields (uploadSize, scheme, tlsVerifyResult)", () => {
    const data: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
      timing: {
        total: 0.5,
        details: { namelookup: 0.01, connect: 0.05 },
      },
      size: 13,
      contentType: "application/json",
      uploadSize: 128,
      scheme: "https",
      tlsVerifyResult: 0,
      tlsVerified: true,
      redirectChain: [{ status: 302, location: "https://example.com/final" }],
      finalUrl: "https://example.com/final",
    };

    const result = schemaResponseMap(data);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.httpVersion).toBe("2");
    expect(result.headers).toEqual({ "content-type": "application/json" });
    expect(result.body).toBe('{"ok":true}');
    expect(result.size).toBe(13);
    expect(result.contentType).toBe("application/json");
    expect(result.tlsVerified).toBe(true);
    expect(result.redirectChain).toHaveLength(1);
    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.timing.total).toBe(0.5);
    // Internal-only fields stripped
    expect(result).not.toHaveProperty("uploadSize");
    expect(result).not.toHaveProperty("scheme");
    expect(result).not.toHaveProperty("tlsVerifyResult");
  });

  it("handles minimal response without optional fields", () => {
    const data: HttpResponseInternal = {
      status: 204,
      statusText: "No Content",
      headers: {},
      timing: { total: 0.1 },
      size: 0,
    };

    const result = schemaResponseMap(data);

    expect(result.status).toBe(204);
    expect(result.size).toBe(0);
    expect(result.body).toBeUndefined();
    expect(result.redirectChain).toBeUndefined();
    expect(result.finalUrl).toBeUndefined();
    expect(result.tlsVerified).toBeUndefined();
  });
});

describe("schemaHeadResponseMap", () => {
  it("keeps schema fields and strips Internal-only fields (scheme, tlsVerifyResult)", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: { "content-type": "text/html" },
      timing: {
        total: 0.15,
        details: { namelookup: 0.01, connect: 0.03 },
      },
      contentType: "text/html",
      contentLength: 5000,
      scheme: "https",
      tlsVerifyResult: 0,
      tlsVerified: true,
      redirectChain: [{ status: 301, location: "https://example.com/" }],
      finalUrl: "https://example.com/",
    };

    const result = schemaHeadResponseMap(data);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.httpVersion).toBe("2");
    expect(result.headers).toEqual({ "content-type": "text/html" });
    expect(result.contentType).toBe("text/html");
    expect(result.contentLength).toBe(5000);
    expect(result.tlsVerified).toBe(true);
    expect(result.redirectChain).toHaveLength(1);
    expect(result.finalUrl).toBe("https://example.com/");
    expect(result.timing.total).toBe(0.15);
    // Internal-only fields stripped
    expect(result).not.toHaveProperty("scheme");
    expect(result).not.toHaveProperty("tlsVerifyResult");
  });

  it("handles minimal HEAD response without optional fields", () => {
    const data: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: { total: 0.1 },
    };

    const result = schemaHeadResponseMap(data);

    expect(result.status).toBe(200);
    expect(result.contentType).toBeUndefined();
    expect(result.contentLength).toBeUndefined();
    expect(result.redirectChain).toBeUndefined();
    expect(result.tlsVerified).toBeUndefined();
  });
});

// -- Compact mappers and formatters -------------------------------------------

describe("compactResponseMap", () => {
  it("maps full response to compact form (no headers, no body)", () => {
    const full: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
        "x-custom": "value",
      },
      body: '{"data":"large payload"}',
      timing: { total: 0.3 },
      size: 24,
      contentType: "application/json",
    };

    const compact = compactResponseMap(full);

    expect(compact.status).toBe(200);
    expect(compact.statusText).toBe("OK");
    expect(compact.contentType).toBe("application/json");
    expect(compact.size).toBe(24);
    expect(compact.timing.total).toBe(0.3);
    // Should NOT have headers or body
    expect("headers" in compact).toBe(false);
    expect("body" in compact).toBe(false);
  });

  it("drops timing details in compact form (only total preserved)", () => {
    const full: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: {
        total: 0.5,
        details: {
          namelookup: 0.01,
          connect: 0.05,
          starttransfer: 0.4,
        },
      },
      size: 100,
    };

    const compact = compactResponseMap(full);

    expect(compact.timing.total).toBe(0.5);
    expect(compact.timing.details).toBeUndefined();
  });

  it("preserves httpVersion in compact form", () => {
    const full: HttpResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: {},
      timing: { total: 0.1 },
      size: 1,
    };

    const compact = compactResponseMap(full);
    expect(compact.httpVersion).toBe("2");
  });
});

describe("formatResponseCompact", () => {
  it("formats compact response as single line", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      contentType: "application/json",
      size: 42,
      timing: { total: 0.123 },
    };

    const output = formatResponseCompact(compact);

    expect(output).toBe("HTTP 200 OK (application/json) | 42 bytes | 0.123s");
  });

  it("formats compact response without content type", () => {
    const compact = {
      status: 204,
      statusText: "No Content",
      size: 0,
      timing: { total: 0.05 },
    };

    const output = formatResponseCompact(compact);

    expect(output).toBe("HTTP 204 No Content | 0 bytes | 0.050s");
  });

  it("formats compact response with HTTP version", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      size: 42,
      timing: { total: 0.123 },
    };

    const output = formatResponseCompact(compact);

    expect(output).toBe("HTTP/2 200 OK | 42 bytes | 0.123s");
  });
});

describe("compactHeadResponseMap", () => {
  it("maps full HEAD response to compact form (no headers)", () => {
    const full: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "text/html",
        "content-length": "5000",
      },
      timing: { total: 0.15 },
      contentType: "text/html",
      contentLength: 5000,
    };

    const compact = compactHeadResponseMap(full);

    expect(compact.status).toBe(200);
    expect(compact.statusText).toBe("OK");
    expect(compact.contentType).toBe("text/html");
    expect(compact.contentLength).toBe(5000);
    expect(compact.timing.total).toBe(0.15);
  });

  it("drops headers in compact HEAD mode (no essentialHeaders)", () => {
    const full: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "text/html",
        "content-length": "5000",
        "cache-control": "max-age=3600",
        etag: '"abc123"',
        "last-modified": "Wed, 21 Oct 2025 07:28:00 GMT",
        "x-request-id": "req-12345",
        "x-powered-by": "Express",
        server: "nginx",
      },
      timing: { total: 0.15 },
      contentType: "text/html",
      contentLength: 5000,
    };

    const compact = compactHeadResponseMap(full);

    // Headers are only in human-readable output, not in compact structuredContent
    expect(compact).not.toHaveProperty("essentialHeaders");
    expect(compact).not.toHaveProperty("headers");
    expect(compact.status).toBe(200);
    expect(compact.contentType).toBe("text/html");
    expect(compact.contentLength).toBe(5000);
  });

  it("handles missing headers gracefully", () => {
    const full: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      timing: { total: 0.1 },
    };

    const compact = compactHeadResponseMap(full);

    expect(compact).not.toHaveProperty("essentialHeaders");
    expect(compact).not.toHaveProperty("headers");
  });

  it("drops timing details in compact HEAD form (only total preserved)", () => {
    const full: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: {
        total: 0.2,
        details: {
          namelookup: 0.008,
          connect: 0.04,
          appconnect: 0.11,
        },
      },
    };

    const compact = compactHeadResponseMap(full);

    expect(compact.timing.total).toBe(0.2);
    expect(compact.timing.details).toBeUndefined();
  });

  it("preserves httpVersion in compact HEAD form", () => {
    const full: HttpHeadResponseInternal = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      headers: {},
      timing: { total: 0.1 },
    };

    const compact = compactHeadResponseMap(full);
    expect(compact.httpVersion).toBe("2");
  });
});

describe("formatHeadResponseCompact", () => {
  it("formats compact HEAD response as single line", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      contentType: "text/html",
      timing: { total: 0.1 },
    };

    const output = formatHeadResponseCompact(compact);

    expect(output).toBe("HTTP 200 OK (text/html) | 0.100s");
  });

  it("includes contentLength in compact HEAD response", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      contentType: "text/html",
      contentLength: 5000,
      timing: { total: 0.1 },
    };

    const output = formatHeadResponseCompact(compact);

    expect(output).toBe("HTTP 200 OK (text/html) | 5000 bytes | 0.100s");
  });

  it("formats compact HEAD response with HTTP version", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      httpVersion: "2",
      timing: { total: 0.1 },
    };

    const output = formatHeadResponseCompact(compact);

    expect(output).toBe("HTTP/2 200 OK | 0.100s");
  });
});
