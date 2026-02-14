import { describe, it, expect } from "vitest";
import { parseApi } from "../src/lib/parsers.js";
import { formatApi } from "../src/lib/formatters.js";
import type { ApiResult } from "../src/schemas/index.js";

// ── Parser tests ────────────────────────────────────────────────────

describe("parseApi", () => {
  it("parses JSON response with exit code 0", () => {
    const json = JSON.stringify({ login: "octocat", id: 1 });
    const result = parseApi(json, 0, "/user", "GET");

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ login: "octocat", id: 1 });
    expect(result.endpoint).toBe("/user");
    expect(result.method).toBe("GET");
  });

  it("parses JSON array response", () => {
    const json = JSON.stringify([{ number: 1 }, { number: 2 }]);
    const result = parseApi(json, 0, "repos/owner/repo/pulls", "GET");

    expect(result.status).toBe(200);
    expect(result.body).toEqual([{ number: 1 }, { number: 2 }]);
    expect(result.endpoint).toBe("repos/owner/repo/pulls");
  });

  it("returns 422 status for non-zero exit code", () => {
    const result = parseApi("", 1, "/user", "GET");

    expect(result.status).toBe(422);
  });

  it("falls back to raw string when stdout is not JSON", () => {
    const result = parseApi("some plain text output\n", 0, "/endpoint", "POST");

    expect(result.status).toBe(200);
    expect(result.body).toBe("some plain text output\n");
  });

  it("handles empty stdout", () => {
    const result = parseApi("", 0, "repos/owner/repo/issues", "DELETE");

    expect(result.status).toBe(200);
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

    expect(result.status).toBe(200);
    expect((result.body as Record<string, unknown>).data).toBeDefined();
  });
});

// ── Formatter tests ─────────────────────────────────────────────────

describe("formatApi", () => {
  it("formats a JSON object response", () => {
    const data: ApiResult = {
      status: 200,
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
      status: 200,
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
      status: 200,
      body: longBody,
      endpoint: "/endpoint",
      method: "GET",
    };
    const output = formatApi(data);

    expect(output).toContain("...");
    // The body preview should be truncated at 500 chars + "..."
    expect(output.length).toBeLessThan(600);
  });

  it("formats error status", () => {
    const data: ApiResult = {
      status: 422,
      body: { message: "Validation Failed" },
      endpoint: "repos/owner/repo/pulls",
      method: "POST",
    };
    const output = formatApi(data);

    expect(output).toContain("POST repos/owner/repo/pulls → 422");
    expect(output).toContain("Validation Failed");
  });
});
