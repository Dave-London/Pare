import { describe, it, expect } from "vitest";
import { compactListMap, formatListCompact } from "../src/lib/formatters.js";
import type { NpmList } from "../src/schemas/index.js";

describe("compactListMap", () => {
  it("reduces dependencies to name → version string map", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: {
          version: "4.18.2",
          resolved: "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
        },
        lodash: {
          version: "4.17.21",
          resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
        },
      },
      total: 2,
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.version).toBe("1.0.0");
    expect(compact.total).toBe(2);
    expect(compact.dependencies).toEqual({
      express: "4.18.2",
      lodash: "4.17.21",
    });
  });

  it("handles empty dependencies", () => {
    const list: NpmList = {
      name: "empty-app",
      version: "0.0.1",
      dependencies: {},
      total: 0,
    };

    const compact = compactListMap(list);

    expect(compact.dependencies).toEqual({});
    expect(compact.total).toBe(0);
  });

  it("handles dependencies without resolved field", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: { version: "4.18.2" },
      },
      total: 1,
    };

    const compact = compactListMap(list);

    expect(compact.dependencies).toEqual({ express: "4.18.2" });
  });
});

describe("formatListCompact", () => {
  it("formats compact list output", () => {
    const compact = {
      name: "my-app",
      version: "1.0.0",
      dependencies: { express: "4.18.2", lodash: "4.17.21" },
      total: 2,
    };

    const output = formatListCompact(compact);

    expect(output).toContain("my-app@1.0.0 (2 dependencies)");
    expect(output).toContain("  express@4.18.2");
    expect(output).toContain("  lodash@4.17.21");
  });

  it("formats empty compact list", () => {
    const compact = {
      name: "empty-app",
      version: "0.0.1",
      dependencies: {},
      total: 0,
    };

    const output = formatListCompact(compact);

    expect(output).toBe("empty-app@0.0.1 (0 dependencies)");
  });
});
