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
    };

    const compact = compactHeadResponseMap(full);

    expect(compact.status).toBe(200);
    expect(compact.statusText).toBe("OK");
    expect(compact.contentType).toBe("text/html");
    expect(compact.timing.total).toBe(0.15);
    expect("headers" in compact).toBe(false);
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
});
