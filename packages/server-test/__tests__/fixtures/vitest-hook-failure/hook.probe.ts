import { beforeAll, describe, expect, it } from "vitest";

describe("suite with a failing hook", () => {
  beforeAll(() => {
    throw new Error("beforeAll exploded");
  });

  it("never runs", () => {
    expect(1).toBe(1);
  });
});
