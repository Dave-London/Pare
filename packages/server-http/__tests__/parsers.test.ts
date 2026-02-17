import { describe, it, expect } from "vitest";
import {
  parseCurlOutput,
  parseCurlHeadOutput,
  splitHttpBlocks,
  parseHttpBlock,
  PARE_META_SEPARATOR,
} from "../src/lib/parsers.js";

describe("parseHttpBlock", () => {
  it("parses a simple HTTP/1.1 200 OK response", () => {
    const block = [
      "HTTP/1.1 200 OK",
      "Content-Type: application/json",
      "Content-Length: 27",
      "",
      '{"message":"hello world"}',
    ].join("\r\n");

    const result = parseHttpBlock(block);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["content-length"]).toBe("27");
    expect(result.body).toBe('{"message":"hello world"}');
  });

  it("parses a 404 Not Found response", () => {
    const block = [
      "HTTP/1.1 404 Not Found",
      "Content-Type: text/html",
      "",
      "<h1>Not Found</h1>",
    ].join("\r\n");

    const result = parseHttpBlock(block);

    expect(result.status).toBe(404);
    expect(result.statusText).toBe("Not Found");
    expect(result.headers["content-type"]).toBe("text/html");
    expect(result.body).toBe("<h1>Not Found</h1>");
  });

  it("parses an HTTP/2 response", () => {
    const block = ["HTTP/2 201 Created", "Content-Type: application/json", "", '{"id":1}'].join(
      "\r\n",
    );

    const result = parseHttpBlock(block);

    expect(result.status).toBe(201);
    expect(result.statusText).toBe("Created");
    expect(result.httpVersion).toBe("2");
  });

  it("handles response with no body (HEAD)", () => {
    const block = ["HTTP/1.1 200 OK", "Content-Type: text/html", "Content-Length: 1234"].join(
      "\r\n",
    );

    const result = parseHttpBlock(block);

    expect(result.status).toBe(200);
    expect(result.body).toBe("");
  });

  it("handles headers with colons in values", () => {
    const block = ["HTTP/1.1 200 OK", "Location: https://example.com:8080/path", "", ""].join(
      "\r\n",
    );

    const result = parseHttpBlock(block);

    expect(result.headers["location"]).toBe("https://example.com:8080/path");
  });

  it("parses response with LF-only line endings", () => {
    const block = ["HTTP/1.1 200 OK", "Content-Type: text/plain", "", "hello"].join("\n");

    const result = parseHttpBlock(block);

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("text/plain");
    expect(result.body).toBe("hello");
  });

  it("normalizes header keys to lowercase", () => {
    const block = [
      "HTTP/1.1 200 OK",
      "X-Custom-Header: value1",
      "CONTENT-TYPE: text/html",
      "",
      "",
    ].join("\r\n");

    const result = parseHttpBlock(block);

    expect(result.headers["x-custom-header"]).toBe("value1");
    expect(result.headers["content-type"]).toBe("text/html");
  });
});

describe("splitHttpBlocks", () => {
  it("returns a single block for a simple response", () => {
    const raw = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nhello";
    const blocks = splitHttpBlocks(raw);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("HTTP/1.1 200 OK");
  });

  it("splits redirect chains into multiple blocks", () => {
    const raw = [
      "HTTP/1.1 301 Moved Permanently",
      "Location: https://example.com/new",
      "",
      "HTTP/1.1 200 OK",
      "Content-Type: text/html",
      "",
      "<html>ok</html>",
    ].join("\r\n");

    const blocks = splitHttpBlocks(raw);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("301");
    expect(blocks[1]).toContain("200");
  });

  it("handles three redirects", () => {
    const raw = [
      "HTTP/1.1 301 Moved",
      "Location: /a",
      "",
      "HTTP/1.1 302 Found",
      "Location: /b",
      "",
      "HTTP/1.1 200 OK",
      "",
      "done",
    ].join("\r\n");

    const blocks = splitHttpBlocks(raw);

    expect(blocks).toHaveLength(3);
  });

  it("returns input as single block when no HTTP/ prefix found", () => {
    const raw = "some plain text output";
    const blocks = splitHttpBlocks(raw);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe(raw);
  });
});

describe("parseCurlOutput", () => {
  it("parses a complete curl -i output with metadata", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: application/json\r\n",
      "Content-Length: 13\r\n",
      "\r\n",
      '{"ok":true}',
      `\n${PARE_META_SEPARATOR}\n`,
      "0.250 13 0.010 0.050 0.100 0.110 0.200",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.body).toBe('{"ok":true}');
    expect(result.timing.total).toBeCloseTo(0.25);
    expect(result.size).toBe(13);
    expect(result.contentType).toBe("application/json");
  });

  it("parses output without metadata separator", () => {
    const stdout = [
      "HTTP/1.1 500 Internal Server Error\r\n",
      "Content-Type: text/plain\r\n",
      "\r\n",
      "error occurred",
    ].join("");

    const result = parseCurlOutput(stdout, "", 1);

    expect(result.status).toBe(500);
    expect(result.statusText).toBe("Internal Server Error");
    expect(result.body).toBe("error occurred");
    expect(result.timing.total).toBe(0);
    expect(result.size).toBe(0);
  });

  it("handles redirect chain and takes the last response", () => {
    const stdout = [
      "HTTP/1.1 301 Moved Permanently\r\n",
      "Location: https://example.com/new\r\n",
      "\r\n",
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "\r\n",
      "<html>success</html>",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.500 21 0.005 0.020 0.080 0.085 0.300",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.body).toBe("<html>success</html>");
    expect(result.contentType).toBe("text/html");
  });

  it("handles empty body", () => {
    const stdout = [
      "HTTP/1.1 204 No Content\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 0 0.005 0.020 0.060 0.065 0.090",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.status).toBe(204);
    expect(result.statusText).toBe("No Content");
    expect(result.body).toBeUndefined();
    expect(result.size).toBe(0);
  });

  // ── Expanded timing tests ──────────────────────────────────────────

  it("extracts expanded timing details from metadata", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/plain\r\n",
      "\r\n",
      "hello",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.500 5 0.010 0.050 0.120 0.125 0.400",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.timing.total).toBeCloseTo(0.5);
    expect(result.timing.details).toBeDefined();
    expect(result.timing.details!.namelookup).toBeCloseTo(0.01);
    expect(result.timing.details!.connect).toBeCloseTo(0.05);
    expect(result.timing.details!.appconnect).toBeCloseTo(0.12);
    expect(result.timing.details!.pretransfer).toBeCloseTo(0.125);
    expect(result.timing.details!.starttransfer).toBeCloseTo(0.4);
  });

  it("omits appconnect when zero (HTTP, no TLS)", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "\r\n",
      "ok",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.300 2 0.005 0.030 0.000 0.035 0.200",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.timing.details).toBeDefined();
    expect(result.timing.details!.namelookup).toBeCloseTo(0.005);
    expect(result.timing.details!.connect).toBeCloseTo(0.03);
    expect(result.timing.details!.appconnect).toBeUndefined();
    expect(result.timing.details!.pretransfer).toBeCloseTo(0.035);
    expect(result.timing.details!.starttransfer).toBeCloseTo(0.2);
  });

  it("returns undefined timing details when all timing values are zero (no metadata)", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "\r\n",
      "ok",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 2 0.000 0.000 0.000 0.000 0.000",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.timing.details).toBeUndefined();
  });

  it("returns undefined timing details for old 2-field meta format", () => {
    // Backward compatibility: old format only had time_total and size_download
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "\r\n",
      "ok",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 2",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.timing.total).toBeCloseTo(0.1);
    expect(result.timing.details).toBeUndefined();
  });

  it("parses extended curl write-out metadata fields", () => {
    const stdout = [
      "HTTP/2 200 OK\r\n",
      "Content-Type: application/json\r\n",
      "\r\n",
      '{"ok":true}',
      `\n${PARE_META_SEPARATOR}\n`,
      "0.410 11 128 0.003 0.020 0.090 0.095 0.300 2 1 https://example.com/final https 0",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.httpVersion).toBe("2");
    expect(result.uploadSize).toBe(128);
    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.scheme).toBe("https");
    expect(result.tlsVerifyResult).toBe(0);
  });

  it("captures redirect chain from intermediate response blocks", () => {
    const stdout = [
      "HTTP/1.1 302 Found\r\n",
      "Location: https://example.com/step-2\r\n",
      "\r\n",
      "HTTP/1.1 301 Moved Permanently\r\n",
      "Location: https://example.com/final\r\n",
      "\r\n",
      "HTTP/2 200 OK\r\n",
      "Content-Type: text/plain\r\n",
      "\r\n",
      "done",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.520 4 0 0.003 0.020 0.090 0.095 0.300 2 2 https://example.com/final https 0",
    ].join("");

    const result = parseCurlOutput(stdout, "", 0);

    expect(result.redirectChain).toEqual([
      { status: 302, location: "https://example.com/step-2" },
      { status: 301, location: "https://example.com/final" },
    ]);
  });
});

describe("parseCurlHeadOutput", () => {
  it("returns response without body field", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "Content-Length: 5000\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.150 0 0.005 0.025 0.080 0.085 0.140",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers["content-type"]).toBe("text/html");
    expect(result.headers["content-length"]).toBe("5000");
    expect(result.timing.total).toBeCloseTo(0.15);
    expect(result.contentType).toBe("text/html");
    // HEAD response should not have a body field
    expect("body" in result).toBe(false);
  });

  it("extracts contentLength as a numeric field from Content-Length header", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "Content-Length: 12345\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 0 0.005 0.020 0.060 0.065 0.090",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.contentLength).toBe(12345);
  });

  it("returns undefined contentLength when Content-Length header is missing", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 0 0.005 0.020 0.060 0.065 0.090",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.contentLength).toBeUndefined();
  });

  it("returns undefined contentLength for non-numeric Content-Length", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Length: invalid\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.100 0 0.005 0.020 0.060 0.065 0.090",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.contentLength).toBeUndefined();
  });

  it("handles zero Content-Length", () => {
    const stdout = [
      "HTTP/1.1 204 No Content\r\n",
      "Content-Length: 0\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.050 0 0.003 0.015 0.040 0.042 0.048",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.contentLength).toBe(0);
  });

  it("includes expanded timing details for HEAD responses", () => {
    const stdout = [
      "HTTP/1.1 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.200 0 0.008 0.040 0.110 0.115 0.190",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.timing.details).toBeDefined();
    expect(result.timing.details!.namelookup).toBeCloseTo(0.008);
    expect(result.timing.details!.connect).toBeCloseTo(0.04);
    expect(result.timing.details!.appconnect).toBeCloseTo(0.11);
  });

  it("includes http version, redirect chain, and TLS metadata for HEAD responses", () => {
    const stdout = [
      "HTTP/1.1 302 Found\r\n",
      "Location: https://example.com/final\r\n",
      "\r\n",
      "HTTP/2 200 OK\r\n",
      "Content-Type: text/html\r\n",
      "Content-Length: 123\r\n",
      "\r\n",
      `\n${PARE_META_SEPARATOR}\n`,
      "0.200 0 0 0.008 0.040 0.110 0.115 0.190 2 1 https://example.com/final https 0",
    ].join("");

    const result = parseCurlHeadOutput(stdout, "", 0);

    expect(result.httpVersion).toBe("2");
    expect(result.redirectChain).toEqual([{ status: 302, location: "https://example.com/final" }]);
    expect(result.finalUrl).toBe("https://example.com/final");
    expect(result.scheme).toBe("https");
    expect(result.tlsVerifyResult).toBe(0);
  });
});
