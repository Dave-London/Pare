import { describe, it, expect } from "vitest";
import { compactListMap, formatListCompact, COMPACT_LIST_MAX_DEPS } from "../src/lib/formatters.js";
import { NpmListSchema, type NpmList } from "../src/schemas/index.js";

describe("compactListMap", () => {
  it("keeps name, version, dependencyCount, and flattened top-level deps (#1022)", () => {
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
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.version).toBe("1.0.0");
    expect(compact.dependencyCount).toBe(2);
    expect(compact.dependencies).toEqual({
      express: { version: "4.18.2" },
      lodash: { version: "4.17.21" },
    });
    expect(compact.omittedDependencyCount).toBeUndefined();
  });

  it("handles empty dependencies", () => {
    const list: NpmList = {
      name: "empty-app",
      version: "0.0.1",
      dependencies: {},
    };

    const compact = compactListMap(list);

    expect(compact.dependencyCount).toBe(0);
    expect(compact).not.toHaveProperty("dependencies");
  });

  it("handles list without dependencies field (optional in schema)", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
    };

    const compact = compactListMap(list);

    expect(compact.name).toBe("my-app");
    expect(compact.version).toBe("1.0.0");
    expect(compact.dependencyCount).toBe(0);
    expect(compact).not.toHaveProperty("dependencies");
  });

  it("counts nested dependencies but flattens them out of the compact tree", () => {
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
    };

    const compact = compactListMap(list);

    // total count includes nested deps
    expect(compact.dependencyCount).toBe(5);
    // only top-level deps are kept, without their nested trees
    expect(Object.keys(compact.dependencies ?? {})).toEqual(["express", "lodash"]);
    expect(compact.dependencies?.express).toEqual({ version: "4.18.2" });
  });

  it("caps top-level deps at COMPACT_LIST_MAX_DEPS and reports the omitted count", () => {
    const deps: NpmList["dependencies"] = {};
    for (let i = 0; i < COMPACT_LIST_MAX_DEPS + 5; i++) {
      deps[`pkg-${String(i).padStart(2, "0")}`] = { version: `1.0.${i}` };
    }
    const list: NpmList = { name: "big-app", version: "1.0.0", dependencies: deps };

    const compact = compactListMap(list);

    expect(compact.dependencyCount).toBe(COMPACT_LIST_MAX_DEPS + 5);
    expect(Object.keys(compact.dependencies ?? {})).toHaveLength(COMPACT_LIST_MAX_DEPS);
    expect(compact.omittedDependencyCount).toBe(5);
  });

  it("always keeps problems (#1022)", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      dependencies: { express: { version: "4.18.2" } },
      problems: ["missing: lodash@^4.0.0, required by my-app@1.0.0"],
    };

    const compact = compactListMap(list);

    expect(compact.problems).toEqual(["missing: lodash@^4.0.0, required by my-app@1.0.0"]);
  });

  it("preserves packageManager and dependency types", () => {
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      packageManager: "pnpm",
      dependencies: {
        vitest: { version: "3.0.0", type: "devDependency" },
      },
    };

    const compact = compactListMap(list);

    expect(compact.packageManager).toBe("pnpm");
    expect(compact.dependencies?.vitest).toEqual({ version: "3.0.0", type: "devDependency" });
  });

  it("produces output that validates against NpmListSchema", () => {
    const deps: NpmList["dependencies"] = {};
    for (let i = 0; i < COMPACT_LIST_MAX_DEPS + 3; i++) {
      deps[`pkg-${i}`] = { version: "1.0.0", type: "dependency" };
    }
    const list: NpmList = {
      name: "my-app",
      version: "1.0.0",
      packageManager: "npm",
      dependencies: deps,
      problems: ["extraneous: foo@1.0.0"],
    };

    const compact = compactListMap(list);

    const parsed = NpmListSchema.safeParse(compact);
    expect(parsed.success).toBe(true);
  });
});

describe("formatListCompact", () => {
  it("formats compact list output with dependency count and top-level deps", () => {
    const output = formatListCompact({
      name: "my-app",
      version: "1.0.0",
      dependencyCount: 2,
      dependencies: {
        express: { version: "4.18.2" },
        lodash: { version: "4.17.21" },
      },
    });

    expect(output).toContain("my-app@1.0.0 (2 dependencies)");
    expect(output).toContain("express@4.18.2");
    expect(output).toContain("lodash@4.17.21");
  });

  it("formats empty compact list", () => {
    const output = formatListCompact({
      name: "empty-app",
      version: "0.0.1",
      dependencyCount: 0,
    });

    expect(output).toBe("empty-app@0.0.1 (0 dependencies)");
  });

  it("shows problems and the omitted-dependency marker", () => {
    const output = formatListCompact({
      name: "my-app",
      version: "1.0.0",
      dependencyCount: 30,
      dependencies: { express: { version: "4.18.2" } },
      omittedDependencyCount: 9,
      problems: ["missing: lodash@^4.0.0"],
    });

    expect(output).toContain("Problems (1):");
    expect(output).toContain("missing: lodash@^4.0.0");
    expect(output).toContain("... and 9 more top-level dependencies");
  });
});
