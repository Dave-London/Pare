import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  surfaceEmptyFailure,
  EmptyFailureSchemaFields,
  SURFACE_EMPTY_FAILURE_MAX_BYTES,
} from "../src/diagnostics.js";

interface FakeRun {
  summary: { total: number; failed: number };
  error?: string;
}

const emptyData: FakeRun = { summary: { total: 0, failed: 0 } };
const isEmpty = (d: FakeRun) => d.summary.total === 0 && d.summary.failed === 0;

describe("surfaceEmptyFailure", () => {
  it("attaches error and exitCode when the CLI failed and nothing was parsed", () => {
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 2, stdout: "", stderr: "SyntaxError: unexpected token" },
      { isEmpty },
    );
    expect(result.error).toBe("SyntaxError: unexpected token");
    expect(result.exitCode).toBe(2);
    expect(result.summary).toEqual({ total: 0, failed: 0 });
  });

  it("does not fire on exit code 0", () => {
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 0, stdout: "", stderr: "some warning" },
      { isEmpty },
    );
    expect(result).toBe(emptyData);
    expect(result.error).toBeUndefined();
  });

  it("does not fire when results were parsed", () => {
    const data: FakeRun = { summary: { total: 3, failed: 1 } };
    const result = surfaceEmptyFailure(
      data,
      { exitCode: 1, stdout: "", stderr: "2 tests failed" },
      { isEmpty },
    );
    expect(result).toBe(data);
    expect(result.error).toBeUndefined();
  });

  it("does not overwrite an existing error field", () => {
    const data: FakeRun = { summary: { total: 0, failed: 0 }, error: "parser exploded" };
    const result = surfaceEmptyFailure(
      data,
      { exitCode: 1, stdout: "", stderr: "other detail" },
      { isEmpty },
    );
    expect(result).toBe(data);
    expect(result.error).toBe("parser exploded");
    expect(result.exitCode).toBeUndefined();
  });

  it("prefers stderr over stdout when both have content", () => {
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "stdout detail", stderr: "stderr detail" },
      { isEmpty },
    );
    expect(result.error).toBe("stderr detail");
  });

  it("falls back to stdout when stderr is whitespace-only", () => {
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "  stdout detail  ", stderr: "   \n  " },
      { isEmpty },
    );
    expect(result.error).toBe("stdout detail");
  });

  it("uses a fallback message when both streams are empty", () => {
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 7, stdout: "", stderr: "" },
      { isEmpty },
    );
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("exited with code 7");
    expect(result.exitCode).toBe(7);
  });

  it("keeps the tail (not the head) when the detail exceeds maxBytes", () => {
    const detail = `${"x".repeat(100)}END-OF-OUTPUT`;
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "", stderr: detail },
      { isEmpty, maxBytes: 20 },
    );
    expect(result.error).toBe(`… (output truncated)\n${detail.slice(-20)}`);
    expect(result.error).toContain("END-OF-OUTPUT");
    expect(result.error).not.toContain("x".repeat(30));
  });

  it("does not truncate a detail exactly at maxBytes", () => {
    const detail = "y".repeat(30);
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "", stderr: detail },
      { isEmpty, maxBytes: 30 },
    );
    expect(result.error).toBe(detail);
  });

  it("defaults maxBytes to 4096", () => {
    expect(SURFACE_EMPTY_FAILURE_MAX_BYTES).toBe(4096);
    const detail = "z".repeat(5000);
    const result = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "", stderr: detail },
      { isEmpty },
    );
    expect(result.error).toBe(`… (output truncated)\n${"z".repeat(4096)}`);
  });

  it("returns a new object (does not mutate the input) when it fires", () => {
    const data: FakeRun = { summary: { total: 0, failed: 0 } };
    const result = surfaceEmptyFailure(
      data,
      { exitCode: 1, stdout: "", stderr: "boom" },
      { isEmpty },
    );
    expect(result).not.toBe(data);
    expect(data.error).toBeUndefined();
    expect("exitCode" in data).toBe(false);
  });
});

describe("EmptyFailureSchemaFields", () => {
  const schema = z.object({
    summary: z.object({ total: z.number(), failed: z.number() }),
    ...EmptyFailureSchemaFields,
  });

  it("validates an augmented result", () => {
    const augmented = surfaceEmptyFailure(
      emptyData,
      { exitCode: 1, stdout: "", stderr: "boom" },
      { isEmpty },
    );
    expect(schema.parse(augmented)).toEqual(augmented);
  });

  it("validates a result without the optional fields", () => {
    expect(schema.safeParse({ summary: { total: 5, failed: 0 } }).success).toBe(true);
  });

  it("rejects wrong types", () => {
    expect(
      schema.safeParse({ summary: { total: 0, failed: 0 }, error: 42, exitCode: "1" }).success,
    ).toBe(false);
  });
});
