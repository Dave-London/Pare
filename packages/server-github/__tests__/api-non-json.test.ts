/**
 * #1256: `api` on non-JSON responses. Every fixture is real `gh api --include`
 * output captured with gh 2.79.0 on 2026-11-17 (see fixtures/gh-api):
 *
 * - logs-plain: GET repos/Dave-London/Pare/actions/jobs/133805015395/logs
 *   (GitHub redirects to a text/plain blob that starts with a UTF-8 BOM).
 * - logs-jq: the same request with `--jq .`; gh prints the headers, then fails
 *   decoding the body and prints no body.
 * - gql-html: `gh api graphql --hostname example.com`; an HTML page with
 *   HTTP 405 on the graphql path.
 * - raw-404: a text/plain 404 from raw.githubusercontent.com.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseApi } from "../src/lib/parsers.js";
import { formatApi } from "../src/lib/formatters.js";

const FIXTURES = join(import.meta.dirname, "fixtures", "gh-api");
const read = (name: string) => readFileSync(join(FIXTURES, name), "utf-8");

describe("parseApi — non-JSON bodies (#1256)", () => {
  it("returns a text/plain job log as a string body with its status and content type", () => {
    const result = parseApi(
      read("logs-plain.stdout"),
      0,
      "repos/Dave-London/Pare/actions/jobs/133805015395/logs",
      "GET",
    );

    expect(result.statusCode).toBe(200);
    expect(result.responseHeaders?.["content-type"]).toBe("text/plain");
    expect(typeof result.body).toBe("string");
    const body = result.body as string;
    // The BOM is stripped; the log starts at its first timestamp.
    expect(body.startsWith("2026-11-17T03:52:51.6693632Z Current runner version")).toBe(true);
    expect(body).toContain("All required checks passed!");
    // Whole body: Content-Length counts the 3-byte BOM that was stripped.
    expect(Buffer.byteLength(body, "utf-8") + 3).toBe(
      Number(result.responseHeaders?.["content-length"]),
    );
    expect(result.errorMessage).toBeUndefined();
    expect(result.bodyTruncated).toBeUndefined();
  });

  it("explains a gh JSON-decode failure (jq on a text log) with status and content type", () => {
    const result = parseApi(
      read("logs-jq.stdout"),
      1,
      "repos/Dave-London/Pare/actions/jobs/133805015395/logs",
      "GET",
      read("logs-jq.stderr"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("");
    expect(result.errorMessage).toContain("gh could not parse the response as JSON");
    expect(result.errorMessage).toContain("HTTP 200");
    expect(result.errorMessage).toContain("content-type text/plain");
    expect(result.errorMessage).toContain("invalid character 'ï' looking for beginning of value");
    expect(result.errorMessage).toContain("Call again without jq");
  });

  it("explains a graphql 502 HTML page that gh failed to decode", () => {
    // Shape of the reported failure: gh printed the 502 headers, then its decoder
    // error. Built from the real logs-jq capture with the status line and content
    // type of a GitHub 502 page, because a 502 cannot be produced on demand.
    const stdout = read("logs-jq.stdout")
      .replace(/^HTTP\/1\.1 200 OK/, "HTTP/2.0 502 Bad Gateway")
      .replace("Content-Type: text/plain", "Content-Type: application/json");
    const result = parseApi(
      stdout,
      1,
      "graphql",
      "POST",
      "invalid character '<' looking for beginning of value\n",
    );

    expect(result.statusCode).toBe(502);
    expect(result.errorMessage).toContain("HTTP 502");
    expect(result.errorMessage).toContain("invalid character '<'");
    expect(result.errorMessage).toContain("not valid JSON");
  });

  it("names 'HTTP status unknown' instead of inventing one when gh printed no headers", () => {
    const result = parseApi(
      "",
      1,
      "graphql",
      "POST",
      "invalid character '<' looking for beginning of value\n",
    );

    expect(result.errorMessage).toContain("HTTP status unknown");
  });

  it("keeps a snippet of an HTML error page on the graphql path, with status and full length", () => {
    const stdout = read("gql-html.stdout");
    const result = parseApi(stdout, 1, "graphql", "POST", read("gql-html.stderr"));

    expect(result.statusCode).toBe(405);
    expect(result.responseHeaders?.["content-type"]).toBe("text/html");
    expect(result.bodyTruncated).toBe(true);
    expect(typeof result.body).toBe("string");
    expect((result.body as string).startsWith("<!doctype html>")).toBe(true);
    expect((result.body as string).length).toBe(500);
    expect(result.bodyLength).toBeGreaterThan(500);
    expect(result.errorBody).toBe("gh: HTTP 405");

    const text = formatApi(result);
    expect(text).toContain("POST graphql → 405 (text/html)");
    expect(text).toContain(`cut to 500 of ${result.bodyLength} characters`);
  });

  it("keeps a short text error body whole", () => {
    const result = parseApi(
      read("raw-404.stdout"),
      1,
      "https://raw.githubusercontent.com/Dave-London/Pare/main/no-such-file-xyz.txt",
      "GET",
      read("raw-404.stderr"),
    );

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe("404: Not Found");
    expect(result.bodyTruncated).toBeUndefined();
  });

  it("takes the status from gh's error text when no headers were printed", () => {
    const result = parseApi("", 1, "repos/o/r", "GET", "gh: Not Found (HTTP 404)\n");
    expect(result.statusCode).toBe(404);
  });

  it("leaves JSON error bodies alone", () => {
    const headers = "HTTP/2.0 404 Not Found\r\nContent-Type: application/json; charset=utf-8\r\n";
    const json = JSON.stringify({ message: "Not Found", documentation_url: "x".repeat(600) });
    const result = parseApi(
      `${headers}\r\n${json}`,
      1,
      "repos/o/r",
      "GET",
      "gh: Not Found (HTTP 404)",
    );
    expect(result.body).toEqual(JSON.parse(json));
    expect(result.bodyTruncated).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
  });

  it("formats the decode failure with errorMessage, not gh's bare decoder text", () => {
    const result = parseApi(
      read("logs-jq.stdout"),
      1,
      "repos/Dave-London/Pare/actions/jobs/133805015395/logs",
      "GET",
      read("logs-jq.stderr"),
    );
    const text = formatApi(result);
    expect(text).toContain("Error: gh could not parse the response as JSON (HTTP 200");
  });
});
