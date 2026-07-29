import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { estimateTokens, compactDualOutput, strippedCompactDualOutput } from "../src/output.js";
import {
  truncateStream,
  compactStreamFields,
  CompactStreamSchemaFields,
  COMPACT_HEAD_LINES,
  COMPACT_TAIL_LINES,
  COMPACT_BYTE_CAP,
} from "../src/compact.js";

describe("estimateTokens", () => {
  it("returns 1 for a 4-char string", () => {
    expect(estimateTokens("abcd")).toBe(1);
  });

  it("rounds up for non-multiples of 4", () => {
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles long strings", () => {
    const text = "x".repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});

describe("compactDualOutput", () => {
  const fullData = { items: [{ id: 1, name: "a", extra: "verbose" }], total: 1 };
  const formatFull = (d: typeof fullData) => `Full: ${d.total} items`;
  const compactMap = (d: typeof fullData) => ({
    items: d.items.map((i) => ({ id: i.id })),
    total: d.total,
  });
  const formatCompact = (d: ReturnType<typeof compactMap>) => `Compact: ${d.total} items`;

  it("returns full data when forceFullSchema is true", () => {
    const result = compactDualOutput(
      fullData,
      "short",
      formatFull,
      compactMap,
      formatCompact,
      true,
    );
    expect(result.structuredContent).toBe(fullData);
    expect(result.content[0].text).toBe("Full: 1 items");
  });

  it("returns compact data when structured tokens >= raw tokens", () => {
    // Make rawStdout very short so structured JSON will exceed it
    const result = compactDualOutput(fullData, "x", formatFull, compactMap, formatCompact, false);
    expect(result.structuredContent).toEqual({ items: [{ id: 1 }], total: 1 });
    expect(result.content[0].text).toBe("Compact: 1 items");
  });

  it("returns full data when structured tokens < raw tokens", () => {
    // Make rawStdout much larger than the structured JSON
    const longRaw = "x".repeat(10000);
    const result = compactDualOutput(
      fullData,
      longRaw,
      formatFull,
      compactMap,
      formatCompact,
      false,
    );
    expect(result.structuredContent).toBe(fullData);
    expect(result.content[0].text).toBe("Full: 1 items");
  });

  it("uses compact when structured and raw tokens are equal", () => {
    // JSON.stringify(fullData) length determines structured tokens
    const jsonStr = JSON.stringify(fullData);
    // Make raw stdout exactly the same length so structured >= raw
    const rawStdout = "x".repeat(jsonStr.length);
    const result = compactDualOutput(
      fullData,
      rawStdout,
      formatFull,
      compactMap,
      formatCompact,
      false,
    );
    expect(result.structuredContent).toEqual({ items: [{ id: 1 }], total: 1 });
  });
});

describe("compactDualOutput dev-mode validation", () => {
  let origNodeEnv: string | undefined;
  let origPareDebug: string | undefined;

  beforeEach(() => {
    origNodeEnv = process.env.NODE_ENV;
    origPareDebug = process.env.PARE_DEBUG;
    // Ensure dev mode is active for most tests
    delete process.env.NODE_ENV;
    delete process.env.PARE_DEBUG;
  });

  afterEach(() => {
    if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv;
    else delete process.env.NODE_ENV;
    if (origPareDebug !== undefined) process.env.PARE_DEBUG = origPareDebug;
    else delete process.env.PARE_DEBUG;
  });

  const schema = z.object({
    items: z.array(z.object({ id: z.number(), name: z.string() })),
    total: z.number(),
  });

  const fullData = { items: [{ id: 1, name: "a", extra: "verbose" }], total: 1 };
  const formatFull = (d: typeof fullData) => `Full: ${d.total} items`;

  it("passes when compact output matches schema", () => {
    const validCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id, name: i.name })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof validCompactMap>) => `Compact: ${d.total}`;

    // Force compact path (short rawStdout)
    expect(() =>
      compactDualOutput(fullData, "x", formatFull, validCompactMap, formatCompact, false, schema),
    ).not.toThrow();
  });

  it("throws when compact output omits a required field", () => {
    // compactMap omits the required 'name' field
    const badCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof badCompactMap>) => `Compact: ${d.total}`;

    expect(() =>
      compactDualOutput(fullData, "x", formatFull, badCompactMap, formatCompact, false, schema),
    ).toThrow(/compactDualOutput \(compact\): structured output does not match outputSchema/);
  });

  it("throws with descriptive field path in error message", () => {
    const badCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof badCompactMap>) => `Compact: ${d.total}`;

    expect(() =>
      compactDualOutput(fullData, "x", formatFull, badCompactMap, formatCompact, false, schema),
    ).toThrow(/items\.0\.name/);
  });

  it("validates full data path when forceFullSchema is true", () => {
    // Schema requires 'name' to be a string, but full data has it — should pass
    const noopCompact = () => ({});
    const noopFormat = () => "";

    expect(() =>
      compactDualOutput(fullData, "x", formatFull, noopCompact, noopFormat, true, schema),
    ).not.toThrow();
  });

  it("validates full data path when structured tokens < raw tokens", () => {
    const badSchema = z.object({
      items: z.array(z.object({ id: z.number(), name: z.string() })),
      total: z.number(),
      required_field: z.string(), // not in fullData
    });

    const noopCompact = () => ({});
    const noopFormat = () => "";
    const longRaw = "x".repeat(10000);

    expect(() =>
      compactDualOutput(fullData, longRaw, formatFull, noopCompact, noopFormat, false, badSchema),
    ).toThrow(/compactDualOutput \(full\)/);
  });

  it("skips validation in production mode (NODE_ENV=production)", () => {
    process.env.NODE_ENV = "production";
    delete process.env.PARE_DEBUG;

    const badCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof badCompactMap>) => `Compact: ${d.total}`;

    // Should NOT throw even with a bad compact map
    expect(() =>
      compactDualOutput(fullData, "x", formatFull, badCompactMap, formatCompact, false, schema),
    ).not.toThrow();
  });

  it("validates in production when PARE_DEBUG is set", () => {
    process.env.NODE_ENV = "production";
    process.env.PARE_DEBUG = "1";

    const badCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof badCompactMap>) => `Compact: ${d.total}`;

    expect(() =>
      compactDualOutput(fullData, "x", formatFull, badCompactMap, formatCompact, false, schema),
    ).toThrow(/compactDualOutput/);
  });

  it("skips validation when no outputSchema is provided", () => {
    const badCompactMap = (d: typeof fullData) => ({
      items: d.items.map((i) => ({ id: i.id })),
      total: d.total,
    });
    const formatCompact = (d: ReturnType<typeof badCompactMap>) => `Compact: ${d.total}`;

    // No schema → no validation → no error
    expect(() =>
      compactDualOutput(fullData, "x", formatFull, badCompactMap, formatCompact, false),
    ).not.toThrow();
  });
});

describe("strippedCompactDualOutput dev-mode validation", () => {
  let origNodeEnv: string | undefined;

  beforeEach(() => {
    origNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    delete process.env.PARE_DEBUG;
  });

  afterEach(() => {
    if (origNodeEnv !== undefined) process.env.NODE_ENV = origNodeEnv;
    else delete process.env.NODE_ENV;
  });

  const schema = z.object({ id: z.number(), label: z.string() });

  const internalData = { id: 1, label: "test", _internal: "hidden" };
  const formatFull = () => "full text";
  const schemaMap = (d: typeof internalData) => ({ id: d.id, label: d.label });

  it("throws when compact output mismatches schema", () => {
    const badCompact = () => ({ id: 1 }); // missing 'label'
    const formatCompact = () => "compact";

    expect(() =>
      strippedCompactDualOutput(
        internalData,
        "x",
        formatFull,
        schemaMap,
        badCompact,
        formatCompact,
        false,
        schema,
      ),
    ).toThrow(/compactDualOutput \(compact\)/);
  });

  it("passes when outputs match schema", () => {
    const validCompact = (d: typeof internalData) => ({ id: d.id, label: d.label });
    const formatCompact = () => "compact";

    expect(() =>
      strippedCompactDualOutput(
        internalData,
        "x",
        formatFull,
        schemaMap,
        validCompact,
        formatCompact,
        false,
        schema,
      ),
    ).not.toThrow();
  });
});

// ── truncateStream / compactStreamFields (extracted from server-process #1020) ──

/** Builds a string of `count` numbered lines joined with the given separator. */
function makeLines(count: number, sep = "\n"): string {
  return Array.from({ length: count }, (_, i) => `line ${i + 1}`).join(sep);
}

describe("truncateStream", () => {
  it("exports the #1020 default budget constants", () => {
    expect(COMPACT_HEAD_LINES).toBe(40);
    expect(COMPACT_TAIL_LINES).toBe(10);
    expect(COMPACT_BYTE_CAP).toBe(8192);
  });

  it("returns empty text unchanged (one line per String.split semantics)", () => {
    expect(truncateStream("")).toEqual({ text: "", truncated: false, totalLines: 1 });
  });

  it("returns short text unchanged", () => {
    const text = makeLines(5);
    expect(truncateStream(text)).toEqual({ text, truncated: false, totalLines: 5 });
  });

  it("does not truncate at exactly head + tail lines", () => {
    const text = makeLines(COMPACT_HEAD_LINES + COMPACT_TAIL_LINES);
    const result = truncateStream(text);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe(text);
    expect(result.totalLines).toBe(50);
  });

  it("truncates at one line over the budget with an omission marker", () => {
    const text = makeLines(51);
    const result = truncateStream(text);
    expect(result.truncated).toBe(true);
    expect(result.totalLines).toBe(51);
    const lines = result.text.split("\n");
    expect(lines).toHaveLength(51); // 40 head + 1 marker + 10 tail
    expect(lines[0]).toBe("line 1");
    expect(lines[39]).toBe("line 40");
    expect(lines[40]).toBe("... (1 lines omitted) ...");
    expect(lines[41]).toBe("line 42");
    expect(lines[50]).toBe("line 51");
  });

  it("reports the omitted line count in the marker", () => {
    const result = truncateStream(makeLines(150));
    expect(result.text).toContain("... (100 lines omitted) ...");
    expect(result.totalLines).toBe(150);
  });

  it("counts a trailing newline as an extra (empty) line", () => {
    const result = truncateStream("a\nb\n");
    expect(result.totalLines).toBe(3);
    expect(result.truncated).toBe(false);
  });

  it("does not apply the byte cap at exactly the cap", () => {
    const text = "x".repeat(COMPACT_BYTE_CAP);
    const result = truncateStream(text);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe(text);
  });

  it("applies the byte cap at one character over", () => {
    const text = "x".repeat(COMPACT_BYTE_CAP + 1);
    const result = truncateStream(text);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("x".repeat(COMPACT_BYTE_CAP) + "\n... (truncated)");
    expect(result.totalLines).toBe(1);
  });

  it("applies the byte cap after line trimming when trimmed text is still too large", () => {
    // 60 lines of 190 chars: line-trimmed to 40 head + marker + 10 tail (~9.6KB),
    // so the marker lands inside the 8KB cap but the trimmed text still exceeds it.
    const text = Array.from({ length: 60 }, () => "y".repeat(190)).join("\n");
    const result = truncateStream(text);
    expect(result.truncated).toBe(true);
    expect(result.text.endsWith("\n... (truncated)")).toBe(true);
    expect(result.text).toContain("... (10 lines omitted) ...");
    expect(result.text.length).toBe(COMPACT_BYTE_CAP + "\n... (truncated)".length);
    expect(result.totalLines).toBe(60);
  });

  it("honors custom headLines/tailLines", () => {
    const result = truncateStream(makeLines(10), { headLines: 2, tailLines: 1 });
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("line 1\nline 2\n... (7 lines omitted) ...\nline 10");
    expect(result.totalLines).toBe(10);
  });

  it("honors a custom byteCap", () => {
    const result = truncateStream("abcdef", { byteCap: 4 });
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("abcd\n... (truncated)");
  });

  it("splits CRLF input on \\n, preserving carriage returns", () => {
    const text = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\r\n");
    const result = truncateStream(text, { headLines: 2, tailLines: 1 });
    expect(result.totalLines).toBe(10);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("line 1\r\nline 2\r\n... (7 lines omitted) ...\nline 10");
  });
});

describe("compactStreamFields", () => {
  it("returns an empty object for undefined streams", () => {
    expect(compactStreamFields(undefined, undefined)).toEqual({});
  });

  it("omits empty-string streams entirely", () => {
    const fields = compactStreamFields("", "");
    expect(Object.keys(fields)).toEqual([]);
  });

  it("keeps a short stdout without truncation metadata", () => {
    const fields = compactStreamFields("hello\nworld", undefined);
    expect(fields).toEqual({ stdout: "hello\nworld" });
    expect("stdoutTruncated" in fields).toBe(false);
    expect("stdoutTotalLines" in fields).toBe(false);
  });

  it("sets stdoutTruncated and stdoutTotalLines only when stdout is truncated", () => {
    const fields = compactStreamFields(makeLines(60), "err");
    expect(fields.stdoutTruncated).toBe(true);
    expect(fields.stdoutTotalLines).toBe(60);
    expect(fields.stderr).toBe("err");
    expect("stderrTruncated" in fields).toBe(false);
    expect("stderrTotalLines" in fields).toBe(false);
  });

  it("sets stderrTruncated and stderrTotalLines only when stderr is truncated", () => {
    const fields = compactStreamFields("out", makeLines(60));
    expect(fields.stdout).toBe("out");
    expect(fields.stderrTruncated).toBe(true);
    expect(fields.stderrTotalLines).toBe(60);
    expect("stdoutTruncated" in fields).toBe(false);
  });

  it("handles both streams truncated independently", () => {
    const fields = compactStreamFields(makeLines(70), makeLines(90));
    expect(fields.stdoutTruncated).toBe(true);
    expect(fields.stdoutTotalLines).toBe(70);
    expect(fields.stderrTruncated).toBe(true);
    expect(fields.stderrTotalLines).toBe(90);
  });

  it("passes budget overrides through to truncateStream", () => {
    const fields = compactStreamFields("a\nb\nc\nd", undefined, { headLines: 1, tailLines: 1 });
    expect(fields.stdoutTruncated).toBe(true);
    expect(fields.stdoutTotalLines).toBe(4);
    expect(fields.stdout).toBe("a\n... (2 lines omitted) ...\nd");
  });
});

describe("CompactStreamSchemaFields", () => {
  const schema = z.object({
    stdout: z.string().optional(),
    stderr: z.string().optional(),
    ...CompactStreamSchemaFields,
  });

  it("validates compactStreamFields output with truncation metadata", () => {
    const fields = compactStreamFields(makeLines(60), makeLines(60));
    expect(schema.parse(fields)).toEqual(fields);
  });

  it("validates compactStreamFields output without truncation metadata", () => {
    const fields = compactStreamFields("short", undefined);
    expect(schema.parse(fields)).toEqual(fields);
  });

  it("matches the server-process #1020 field shape", () => {
    // Same field names and types declared by ProcessRunResultSchema.
    expect(
      schema.safeParse({
        stdoutTruncated: true,
        stderrTruncated: true,
        stdoutTotalLines: 123,
        stderrTotalLines: 456,
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ stdoutTotalLines: "123" }).success).toBe(false);
    expect(schema.safeParse({ stdoutTruncated: "yes" }).success).toBe(false);
  });
});
