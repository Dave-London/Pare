import { describe, it, expect } from "vitest";
import { parseApi } from "../src/lib/parsers.js";
import { formatApi } from "../src/lib/formatters.js";
import type { ApiResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseApi", () => {
  it("parses JSON response with exit code 0 (no headers)", () => {
    const json = JSON.stringify({ login: "octocat", id: 1 });
    const result = parseApi(json, 0, "/user", "GET");

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ login: "octocat", id: 1 });
    expect(result.endpoint).toBe("/user");
    expect(result.method).toBe("GET");
  });

  it("parses JSON array response", () => {
    const json = JSON.stringify([{ number: 1 }, { number: 2 }]);
    const result = parseApi(json, 0, "repos/owner/repo/pulls", "GET");

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual([{ number: 1 }, { number: 2 }]);
    expect(result.endpoint).toBe("repos/owner/repo/pulls");
  });

  it("returns 422 status for non-zero exit code", () => {
    const result = parseApi("", 1, "/user", "GET");

    expect(result.statusCode).toBe(422);
  });

  it("falls back to raw string when stdout is not JSON", () => {
    const result = parseApi("some plain text output\n", 0, "/endpoint", "POST");

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("some plain text output\n");
  });

  it("handles empty stdout", () => {
    const result = parseApi("", 0, "repos/owner/repo/issues", "DELETE");

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("");
    expect(result.method).toBe("DELETE");
  });

  it("preserves nested JSON structures", () => {
    const json = JSON.stringify({
      data: {
        repository: {
          issues: { totalCount: 5 },
        },
      },
    });
    const result = parseApi(json, 0, "graphql", "POST");

    expect(result.statusCode).toBe(200);
    expect((result.body as Record<string, unknown>).data).toBeDefined();
  });

  it("parses real HTTP status code from --include headers (CRLF)", () => {
    const headers = "HTTP/2.0 201 Created\r\ncontent-type: application/json\r\n";
    const body = JSON.stringify({ id: 42, url: "https://api.github.com/repos/o/r/issues/42" });
    const stdout = `${headers}\r\n${body}`;
    const result = parseApi(stdout, 0, "repos/o/r/issues", "POST");

    expect(result.statusCode).toBe(201);
    expect(result.body).toEqual({ id: 42, url: "https://api.github.com/repos/o/r/issues/42" });
  });

  it("parses 404 HTTP status from --include headers", () => {
    const headers = "HTTP/1.1 404 Not Found\r\ncontent-type: application/json\r\n";
    const body = JSON.stringify({ message: "Not Found" });
    const stdout = `${headers}\r\n${body}`;
    const result = parseApi(stdout, 1, "repos/o/r/nonexistent", "GET");

    expect(result.statusCode).toBe(404);
    expect(result.body).toEqual({ message: "Not Found" });
  });

  it("parses HTTP status from LF-only headers", () => {
    const stdout = "HTTP/2.0 204 No Content\nserver: github.com\n\n";
    const result = parseApi(stdout, 0, "repos/o/r/issues/1", "DELETE");

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe("");
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatApi", () => {
  it("formats a JSON object response using statusCode", () => {
    const data: ApiResult = {
      statusCode: 200,
      body: { login: "octocat", id: 1 },
      endpoint: "/user",
      method: "GET",
    };
    const output = formatApi(data);

    expect(output).toContain("GET /user → 200");
    expect(output).toContain('"login": "octocat"');
  });

  it("formats a string body response", () => {
    const data: ApiResult = {
      statusCode: 200,
      body: "plain text",
      endpoint: "/endpoint",
      method: "POST",
    };
    const output = formatApi(data);

    expect(output).toContain("POST /endpoint → 200");
    expect(output).toContain("plain text");
  });

  it("truncates long body output", () => {
    const longBody = "x".repeat(600);
    const data: ApiResult = {
      statusCode: 200,
      body: longBody,
      endpoint: "/endpoint",
      method: "GET",
    };
    const output = formatApi(data);

    expect(output).toContain("...");
    // The body preview should be truncated at 500 chars + "..."
    expect(output.length).toBeLessThan(600);
  });

  it("formats error status using real HTTP statusCode", () => {
    const data: ApiResult = {
      statusCode: 422,
      body: { message: "Validation Failed" },
      endpoint: "repos/owner/repo/pulls",
      method: "POST",
    };
    const output = formatApi(data);

    expect(output).toContain("POST repos/owner/repo/pulls → 422");
    expect(output).toContain("Validation Failed");
  });

  it("uses real HTTP status code (201) in formatted output", () => {
    const data: ApiResult = {
      statusCode: 201,
      body: { id: 1 },
      endpoint: "repos/o/r/issues",
      method: "POST",
    };
    const output = formatApi(data);

    expect(output).toContain("POST repos/o/r/issues → 201");
  });
});

// ── P1-gap #141: Error body preservation ─────────────────────────────

describe("parseApi — error body preservation (P1 #141)", () => {
  it("preserves JSON error body from stderr", () => {
    const result = parseApi(
      "",
      1,
      "/repos/o/r/issues",
      "POST",
      '{"message":"Validation Failed","errors":[{"code":"missing_field"}]}',
    );

    expect(result.statusCode).toBe(422);
    expect(result.errorBody).toEqual({
      message: "Validation Failed",
      errors: [{ code: "missing_field" }],
    });
  });

  it("preserves plain text error from stderr", () => {
    const result = parseApi("", 1, "/user", "GET", "gh: Not Found (HTTP 404)");

    expect(result.errorBody).toBe("gh: Not Found (HTTP 404)");
  });

  it("does not include errorBody on success", () => {
    const json = JSON.stringify({ login: "octocat" });
    const result = parseApi(json, 0, "/user", "GET");

    expect(result.errorBody).toBeUndefined();
  });

  it("preserves embedded JSON from stderr with prefix message", () => {
    const stderr = 'gh: HTTP 422: {"message":"Resource not accessible by integration"}';
    const result = parseApi("", 1, "/repos/o/r/pulls", "POST", stderr);

    expect(result.errorBody).toEqual({ message: "Resource not accessible by integration" });
  });

  it("handles empty stderr gracefully", () => {
    const result = parseApi("", 1, "/user", "GET", "");

    expect(result.errorBody).toBeUndefined();
  });
});

describe("formatApi — error body display (P1 #141)", () => {
  it("includes error body in formatted output", () => {
    const data: ApiResult = {
      statusCode: 422,
      body: "",
      endpoint: "/repos/o/r/issues",
      method: "POST",
      errorBody: { message: "Validation Failed" },
    };
    const output = formatApi(data);

    expect(output).toContain("Error:");
    expect(output).toContain("Validation Failed");
  });

  it("does not include error line when no error body", () => {
    const data: ApiResult = {
      statusCode: 200,
      body: { id: 1 },
      endpoint: "/user",
      method: "GET",
    };
    const output = formatApi(data);

    expect(output).not.toContain("Error:");
  });
});
