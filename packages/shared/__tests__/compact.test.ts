import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { estimateTokens, compactDualOutput, strippedCompactDualOutput } from "../src/output.js";

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
