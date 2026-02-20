import { describe, it, expect } from "vitest";
import {
  PareErrorCategory,
  PareErrorSchema,
  classifyError,
  errorOutput,
  invalidInputError,
  isCommandNotFound,
  isPermissionDenied,
  isTimeout,
  isNetworkError,
  isAuthError,
  isConflict,
  isNotFound,
  isAlreadyExists,
  isConfigurationError,
} from "../src/errors.js";
import type { RunResult } from "../src/runner.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<RunResult> = {}): RunResult {
  return { exitCode: 1, stdout: "", stderr: "", ...overrides };
}

// ---------------------------------------------------------------------------
// PareErrorCategory schema
// ---------------------------------------------------------------------------

describe("PareErrorCategory", () => {
  it("accepts every defined category", () => {
    const categories = [
      "command-not-found",
      "permission-denied",
      "timeout",
      "invalid-input",
      "not-found",
      "network-error",
      "authentication-error",
      "conflict",
      "configuration-error",
      "already-exists",
      "command-failed",
    ];
    for (const cat of categories) {
      expect(PareErrorCategory.parse(cat)).toBe(cat);
    }
  });

  it("rejects unknown categories", () => {
    expect(() => PareErrorCategory.parse("banana")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PareErrorSchema
// ---------------------------------------------------------------------------

describe("PareErrorSchema", () => {
  it("validates a full error object", () => {
    const parsed = PareErrorSchema.parse({
      isError: true,
      category: "command-not-found",
      message: "git: command not found",
      command: "git status",
      exitCode: 127,
      suggestion: 'Ensure "git status" is installed and available in your PATH.',
    });
    expect(parsed.isError).toBe(true);
    expect(parsed.category).toBe("command-not-found");
  });

  it("validates a minimal error (optional fields omitted)", () => {
    const parsed = PareErrorSchema.parse({
      isError: true,
      category: "command-failed",
      message: "something went wrong",
    });
    expect(parsed.command).toBeUndefined();
    expect(parsed.exitCode).toBeUndefined();
    expect(parsed.suggestion).toBeUndefined();
  });

  it("rejects isError: false", () => {
    expect(() =>
      PareErrorSchema.parse({
        isError: false,
        category: "command-failed",
        message: "x",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Individual detector helpers
// ---------------------------------------------------------------------------

describe("isCommandNotFound", () => {
  it.each([
    "bash: git: command not found",
    "'eslint' is not recognized as an internal or external command",
    "Error: ENOENT: no such file or directory, spawn eslint",
    "No such file or directory",
  ])("returns true for: %s", (text) => {
    expect(isCommandNotFound(text)).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(isCommandNotFound("fatal: bad revision")).toBe(false);
  });
});

describe("isPermissionDenied", () => {
  it.each([
    "permission denied",
    "Error: EACCES: permission denied, open '/etc/shadow'",
    "EPERM: operation not permitted",
    "Access denied",
    "Operation not permitted",
  ])("returns true for: %s", (text) => {
    expect(isPermissionDenied(text)).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(isPermissionDenied("fatal: bad revision")).toBe(false);
  });
});

describe("isTimeout", () => {
  it.each(["Command timed out after 30000ms", "error: timeout waiting for lock"])(
    "returns true for: %s",
    (text) => {
      expect(isTimeout(text)).toBe(true);
    },
  );
});

describe("isNetworkError", () => {
  it.each([
    "Error: connect ECONNREFUSED 127.0.0.1:3000",
    "ETIMEDOUT",
    "ECONNRESET",
    "ENETUNREACH",
    "Could not resolve host: github.com",
    "Network is unreachable",
    "DNS resolution failed",
    "Connection refused",
  ])("returns true for: %s", (text) => {
    expect(isNetworkError(text)).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(isNetworkError("fatal: bad revision")).toBe(false);
  });
});

describe("isAuthError", () => {
  it.each([
    "fatal: Authentication failed for 'https://github.com/foo/bar.git'",
    "HTTP 401: Unauthorized",
    "HTTP 403: Forbidden",
    "invalid credentials",
    "bad credentials",
    "Permission denied (publickey,gssapi-keyex)",
    "Login required",
    "not authenticated",
    "credential helper returned an error",
  ])("returns true for: %s", (text) => {
    expect(isAuthError(text)).toBe(true);
  });

  it("returns false for unrelated text", () => {
    expect(isAuthError("fatal: bad revision")).toBe(false);
  });
});

describe("isConflict", () => {
  it.each([
    "CONFLICT (content): Merge conflict in src/index.ts",
    "error: merge conflict in package.json",
    "fatal: Unable to create lock file: already locked",
    "lock file exists",
  ])("returns true for: %s", (text) => {
    expect(isConflict(text)).toBe(true);
  });
});

describe("isNotFound", () => {
  it.each([
    "fatal: Not found",
    "error: pathspec 'foo' did not match any file(s) known to git",
    "HTTP 404: Not Found",
    "branch 'foo' does not exist",
    "unknown revision or path not in the working tree",
    "No such remote 'origin'",
  ])("returns true for: %s", (text) => {
    expect(isNotFound(text)).toBe(true);
  });
});

describe("isAlreadyExists", () => {
  it.each([
    "fatal: A branch named 'main' already exists",
    "error: tag 'v1.0.0' already exists",
    "File already exist",
  ])("returns true for: %s", (text) => {
    expect(isAlreadyExists(text)).toBe(true);
  });
});

describe("isConfigurationError", () => {
  it.each([
    "Error: missing config file",
    "Configuration error: invalid JSON",
    "Config file not found",
    "Invalid configuration",
    "No configuration file found",
    "Cannot read config: .eslintrc",
    "error: could not read config tsconfig.json",
  ])("returns true for: %s", (text) => {
    expect(isConfigurationError(text)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe("classifyError", () => {
  it("classifies command-not-found from stderr", () => {
    const result = makeResult({ stderr: "bash: foobar: command not found" });
    const err = classifyError(result, "foobar");
    expect(err.category).toBe("command-not-found");
    expect(err.isError).toBe(true);
    expect(err.command).toBe("foobar");
    expect(err.exitCode).toBe(1);
    expect(err.suggestion).toContain("foobar");
  });

  it("classifies permission-denied", () => {
    const result = makeResult({ stderr: "Error: EACCES: permission denied, open '/etc/shadow'" });
    const err = classifyError(result, "cat");
    expect(err.category).toBe("permission-denied");
  });

  it("classifies timeout from exit code 124", () => {
    const result = makeResult({ exitCode: 124, stderr: "" });
    const err = classifyError(result, "sleep");
    expect(err.category).toBe("timeout");
  });

  it("classifies timeout from stderr text", () => {
    const result = makeResult({ stderr: "Command timed out after 30000ms" });
    const err = classifyError(result, "webpack");
    expect(err.category).toBe("timeout");
  });

  it("classifies network-error", () => {
    const result = makeResult({ stderr: "Error: connect ECONNREFUSED 127.0.0.1:3000" });
    const err = classifyError(result, "curl");
    expect(err.category).toBe("network-error");
  });

  it("classifies authentication-error", () => {
    const result = makeResult({
      stderr: "fatal: Authentication failed for 'https://github.com/foo/bar.git'",
    });
    const err = classifyError(result, "git push");
    expect(err.category).toBe("authentication-error");
  });

  it("classifies authentication-error over permission-denied for publickey messages", () => {
    const result = makeResult({
      stderr: "Permission denied (publickey,gssapi-keyex,gssapi-with-mic)",
    });
    const err = classifyError(result, "git push");
    expect(err.category).toBe("authentication-error");
  });

  it("classifies conflict", () => {
    const result = makeResult({
      stderr: "CONFLICT (content): Merge conflict in src/index.ts",
    });
    const err = classifyError(result, "git merge");
    expect(err.category).toBe("conflict");
  });

  it("classifies not-found", () => {
    const result = makeResult({
      stderr: "fatal: pathspec 'nonexistent' did not match any file(s) known to git",
    });
    const err = classifyError(result, "git checkout");
    expect(err.category).toBe("not-found");
  });

  it("classifies already-exists", () => {
    const result = makeResult({ stderr: "fatal: A branch named 'main' already exists" });
    const err = classifyError(result, "git branch");
    expect(err.category).toBe("already-exists");
  });

  it("classifies configuration-error", () => {
    const result = makeResult({ stderr: "Error: No configuration file found" });
    const err = classifyError(result, "eslint");
    expect(err.category).toBe("configuration-error");
  });

  it("falls back to command-failed for unknown errors", () => {
    const result = makeResult({ stderr: "some obscure error nobody recognises" });
    const err = classifyError(result, "whatever");
    expect(err.category).toBe("command-failed");
  });

  it("uses stdout when stderr is empty", () => {
    const result = makeResult({ stderr: "", stdout: "bash: foobar: command not found" });
    const err = classifyError(result, "foobar");
    expect(err.category).toBe("command-not-found");
  });

  it("generates a fallback message when text is empty", () => {
    const result = makeResult({ exitCode: 42, stderr: "", stdout: "" });
    const err = classifyError(result, "mystery");
    expect(err.message).toBe("mystery failed with exit code 42");
    expect(err.category).toBe("command-failed");
  });

  it("always includes a suggestion", () => {
    const result = makeResult({ stderr: "something failed" });
    const err = classifyError(result, "cmd");
    expect(err.suggestion).toBeTruthy();
  });

  it("result validates against PareErrorSchema", () => {
    const result = makeResult({ stderr: "Error: EACCES: permission denied" });
    const err = classifyError(result, "npm install");
    expect(() => PareErrorSchema.parse(err)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// errorOutput
// ---------------------------------------------------------------------------

describe("errorOutput", () => {
  it("returns a ToolOutput with isError: true at the top level", () => {
    const err = classifyError(makeResult({ stderr: "not found" }), "git show");
    const output = errorOutput(err);

    expect(output.isError).toBe(true);
    expect(output.content).toHaveLength(1);
    expect(output.content[0].type).toBe("text");
    expect(output.content[0].text).toContain("not-found");
    expect(output.structuredContent.isError).toBe(true);
    expect(output.structuredContent.category).toBe("not-found");
  });

  it("includes command, exit code, and suggestion in the text", () => {
    const err = classifyError(
      makeResult({ exitCode: 128, stderr: "fatal: not a git repository" }),
      "git status",
    );
    const output = errorOutput(err);
    const text = output.content[0].text;

    expect(text).toContain("Command: git status");
    expect(text).toContain("Exit code: 128");
    expect(text).toContain("Suggestion:");
  });
});

// ---------------------------------------------------------------------------
// invalidInputError
// ---------------------------------------------------------------------------

describe("invalidInputError", () => {
  it("returns an invalid-input error output", () => {
    const output = invalidInputError("branch name must not contain spaces");
    expect(output.structuredContent.category).toBe("invalid-input");
    expect(output.structuredContent.message).toBe("branch name must not contain spaces");
    expect(output.isError).toBe(true);
  });
});
