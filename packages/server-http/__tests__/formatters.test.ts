import { describe, it, expect } from "vitest";
import {
  formatHttpResponse,
  formatHttpHeadResponse,
  compactResponseMap,
  formatResponseCompact,
  compactHeadResponseMap,
  formatHeadResponseCompact,
} from "../src/lib/formatters.js";
import type { HttpResponse, HttpHeadResponse } from "../src/schemas/index.js";

describe("formatHttpResponse", () => {
  it("formats a successful JSON response", () => {
    const data: HttpResponse = {
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
    const data: HttpResponse = {
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
    const data: HttpResponse = {
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
    const data: HttpResponse = {
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
    const data: HttpResponse = {
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
});

describe("formatHttpHeadResponse", () => {
  it("formats a HEAD response", () => {
    const data: HttpHeadResponse = {
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
    const data: HttpHeadResponse = {
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
    const data: HttpHeadResponse = {
      status: 200,
      statusText: "OK",
      headers: {},
      timing: { total: 0.1 },
    };

    const output = formatHttpHeadResponse(data);

    expect(output).not.toContain("Content-Length:");
  });

  it("formats HEAD response with expanded timing details", () => {
    const data: HttpHeadResponse = {
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
});

describe("compactResponseMap", () => {
  it("maps full response to compact form (no headers, no body)", () => {
    const full: HttpResponse = {
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

  it("preserves timing details in compact form", () => {
    const full: HttpResponse = {
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

    expect(compact.timing.details).toBeDefined();
    expect(compact.timing.details!.namelookup).toBe(0.01);
    expect(compact.timing.details!.connect).toBe(0.05);
    expect(compact.timing.details!.starttransfer).toBe(0.4);
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
});

describe("compactHeadResponseMap", () => {
  it("maps full HEAD response to compact form (no headers)", () => {
    const full: HttpHeadResponse = {
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

  it("preserves essential headers in compact HEAD mode", () => {
    const full: HttpHeadResponse = {
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

    // Essential headers should be preserved
    expect(compact.essentialHeaders).toBeDefined();
    expect(compact.essentialHeaders!["content-type"]).toBe("text/html");
    expect(compact.essentialHeaders!["content-length"]).toBe("5000");
    expect(compact.essentialHeaders!["cache-control"]).toBe("max-age=3600");
    expect(compact.essentialHeaders!["etag"]).toBe('"abc123"');
    expect(compact.essentialHeaders!["last-modified"]).toBe("Wed, 21 Oct 2025 07:28:00 GMT");

    // Non-essential headers should NOT be preserved
    expect(compact.essentialHeaders!["x-request-id"]).toBeUndefined();
    expect(compact.essentialHeaders!["x-powered-by"]).toBeUndefined();
    expect(compact.essentialHeaders!["server"]).toBeUndefined();
  });

  it("omits essentialHeaders when none of the essential headers are present", () => {
    const full: HttpHeadResponse = {
      status: 200,
      statusText: "OK",
      headers: {
        "x-request-id": "req-12345",
        server: "nginx",
      },
      timing: { total: 0.1 },
    };

    const compact = compactHeadResponseMap(full);

    expect(compact.essentialHeaders).toBeUndefined();
  });

  it("handles missing headers gracefully", () => {
    const full: HttpHeadResponse = {
      status: 200,
      statusText: "OK",
      timing: { total: 0.1 },
    };

    const compact = compactHeadResponseMap(full);

    expect(compact.essentialHeaders).toBeUndefined();
  });

  it("preserves timing details in compact HEAD form", () => {
    const full: HttpHeadResponse = {
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

    expect(compact.timing.details).toBeDefined();
    expect(compact.timing.details!.namelookup).toBe(0.008);
    expect(compact.timing.details!.appconnect).toBe(0.11);
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

  it("includes essential headers (excluding content-type and content-length) in compact output", () => {
    const compact = {
      status: 200,
      statusText: "OK",
      contentType: "text/html",
      contentLength: 5000,
      timing: { total: 0.1 },
      essentialHeaders: {
        "content-type": "text/html",
        "content-length": "5000",
        "cache-control": "max-age=3600",
        etag: '"abc123"',
      },
    };

    const output = formatHeadResponseCompact(compact);

    // First line should have status and size
    expect(output).toContain("HTTP 200 OK (text/html) | 5000 bytes | 0.100s");
    // Additional lines for cache-control and etag (content-type and content-length are excluded since shown above)
    expect(output).toContain("cache-control: max-age=3600");
    expect(output).toContain('etag: "abc123"');
    // content-type and content-length should NOT appear again in header lines
    const lines = output.split("\n");
    const headerLines = lines.slice(1);
    expect(headerLines.some((l) => l.includes("content-type:"))).toBe(false);
    expect(headerLines.some((l) => l.includes("content-length:"))).toBe(false);
  });
});
