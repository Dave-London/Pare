import { describe, it, expect } from "vitest";
import { estimateTokens, compactDualOutput } from "../src/output.js";

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
