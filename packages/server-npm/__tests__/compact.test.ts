import { describe, it, expect } from "vitest";
import { compactListMap, formatListCompact } from "../src/lib/formatters.js";
import type { NpmList } from "../src/schemas/index.js";

describe("compactListMap", () => {
  it("keeps name, version, and total; drops dependencies tree", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: {
          version: "4.18.2",
        },
        lodash: {
          version: "4.17.21",
        },
      },
      total: 2,
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.version).toBe("1.0.0");
    expect(compact.total).toBe(2);
    // dependencies tree is dropped in compact mode (shape incompatible with schema)
    expect(compact).not.toHaveProperty("dependencies");
  });

  it("handles empty dependencies", () => {
    const list: NpmList = {
      name: "empty-app",
      version: "0.0.1",
      dependencies: {},
      total: 0,
    };

    const compact = compactListMap(list);

    expect(compact).not.toHaveProperty("dependencies");
    expect(compact.total).toBe(0);
  });

  it("handles list without dependencies field (optional in schema)", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      total: 0,
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.version).toBe("1.0.0");
    expect(compact.total).toBe(0);
    expect(compact).not.toHaveProperty("dependencies");
  });

  it("handles nested dependencies without leaking tree into compact", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: {
        express: {
          version: "4.18.2",
          dependencies: {
            "body-parser": {
              version: "1.20.1",
              dependencies: {
                bytes: { version: "3.1.2" },
              },
            },
            "content-type": { version: "1.0.5" },
          },
        },
        lodash: { version: "4.17.21" },
      },
      total: 5,
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.total).toBe(5);
    expect(compact).not.toHaveProperty("dependencies");
  });
});

describe("formatListCompact", () => {
  it("formats compact list output as summary line", () => {
    const compact = {
      name: "my-app",
      version: "1.0.0",
      total: 2,
    };

    const output = formatListCompact(compact);

    expect(output).toBe("my-app@1.0.0 (2 dependencies)");
  });

  it("formats empty compact list", () => {
    const compact = {
      name: "empty-app",
      version: "0.0.1",
      total: 0,
    };

    const output = formatListCompact(compact);

    expect(output).toBe("empty-app@0.0.1 (0 dependencies)");
  });
});
