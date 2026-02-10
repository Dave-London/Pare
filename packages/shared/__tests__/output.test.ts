import { describe, it, expect } from "vitest";
import { dualOutput } from "../src/output.js";

describe("dualOutput", () => {
  it("returns content and structuredContent", () => {
    const data = { count: 42, items: ["a", "b"] };
    const result = dualOutput(data, (d) => `Count: ${d.count}`);

    expect(result.content).toEqual([{ type: "text", text: "Count: 42" }]);
    expect(result.structuredContent).toBe(data);
  });

  it("passes data to formatter function", () => {
    const data = { name: "test" };
    const result = dualOutput(data, (d) => d.name.toUpperCase());

    expect(result.content[0].text).toBe("TEST");
  });

  it("preserves data reference in structuredContent", () => {
    const data = { nested: { value: true } };
    const result = dualOutput(data, () => "text");

    expect(result.structuredContent).toBe(data);
    expect(result.structuredContent.nested.value).toBe(true);
  });
});
