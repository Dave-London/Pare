import { describe, it, expect } from "vitest";
import {
  compactInput,
  projectPathInput,
  repoPathInput,
  cwdPathInput,
  fixInput,
  pathInput,
  configInput,
  filePatternsInput,
} from "../src/input-schemas.js";
import { INPUT_LIMITS } from "../src/limits.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("compactInput", () => {
  it("defaults to true when omitted", () => {
    expect(compactInput.parse(undefined)).toBe(true);
  });

  it("accepts explicit false", () => {
    expect(compactInput.parse(false)).toBe(false);
  });

  it("accepts explicit true", () => {
    expect(compactInput.parse(true)).toBe(true);
  });

  it("rejects non-boolean", () => {
    expect(compactInput.safeParse("yes").success).toBe(false);
  });

  it("has the expected description", () => {
    expect(compactInput.description).toBe("Prefer compact output");
  });
});

describe("projectPathInput", () => {
  it("accepts a valid path", () => {
    expect(projectPathInput.parse("/home/user/project")).toBe("/home/user/project");
  });

  it("is optional (accepts undefined)", () => {
    expect(projectPathInput.parse(undefined)).toBeUndefined();
  });

  it("rejects paths exceeding PATH_MAX", () => {
    expect(projectPathInput.safeParse("a".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });

  it("has the expected description", () => {
    expect(projectPathInput.description).toBe("Project root path");
  });
});

describe("repoPathInput", () => {
  it("accepts a valid path", () => {
    expect(repoPathInput.parse("/home/user/repo")).toBe("/home/user/repo");
  });

  it("is optional", () => {
    expect(repoPathInput.parse(undefined)).toBeUndefined();
  });

  it("rejects paths exceeding PATH_MAX", () => {
    expect(repoPathInput.safeParse("a".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });

  it("has the expected description", () => {
    expect(repoPathInput.description).toBe("Repository path");
  });
});

describe("cwdPathInput", () => {
  it("accepts a valid path", () => {
    expect(cwdPathInput.parse("/tmp/work")).toBe("/tmp/work");
  });

  it("is optional", () => {
    expect(cwdPathInput.parse(undefined)).toBeUndefined();
  });

  it("rejects paths exceeding PATH_MAX", () => {
    expect(cwdPathInput.safeParse("a".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });

  it("has the expected description", () => {
    expect(cwdPathInput.description).toBe("Working directory");
  });
});

describe("fixInput", () => {
  it("defaults to false when omitted", () => {
    expect(fixInput.parse(undefined)).toBe(false);
  });

  it("accepts explicit true", () => {
    expect(fixInput.parse(true)).toBe(true);
  });

  it("rejects non-boolean", () => {
    expect(fixInput.safeParse(1).success).toBe(false);
  });

  it("has the expected description", () => {
    expect(fixInput.description).toBe("Auto-fix problems");
  });
});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

describe("pathInput factory", () => {
  const schema = pathInput("Custom path description");

  it("produces a schema with the given description", () => {
    expect(schema.description).toBe("Custom path description");
  });

  it("accepts a valid path", () => {
    expect(schema.parse("src/index.ts")).toBe("src/index.ts");
  });

  it("is optional", () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("rejects paths exceeding PATH_MAX", () => {
    expect(schema.safeParse("a".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });
});

describe("configInput factory", () => {
  const schema = configInput("Path to rustfmt.toml");

  it("produces a schema with the given description", () => {
    expect(schema.description).toBe("Path to rustfmt.toml");
  });

  it("accepts a valid path", () => {
    expect(schema.parse(".rustfmt.toml")).toBe(".rustfmt.toml");
  });

  it("is optional", () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("rejects paths exceeding PATH_MAX", () => {
    expect(schema.safeParse("a".repeat(INPUT_LIMITS.PATH_MAX + 1)).success).toBe(false);
  });
});

describe("filePatternsInput factory", () => {
  describe("without default", () => {
    const schema = filePatternsInput("Glob patterns to include");

    it("produces a schema with the given description", () => {
      expect(schema.description).toBe("Glob patterns to include");
    });

    it("accepts an array of patterns", () => {
      expect(schema.parse(["src/**/*.ts", "lib/**/*.ts"])).toEqual(["src/**/*.ts", "lib/**/*.ts"]);
    });

    it("is optional", () => {
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it("rejects arrays exceeding ARRAY_MAX", () => {
      const tooMany = Array.from({ length: INPUT_LIMITS.ARRAY_MAX + 1 }, (_, i) => `file-${i}`);
      expect(schema.safeParse(tooMany).success).toBe(false);
    });

    it("rejects individual paths exceeding PATH_MAX", () => {
      expect(schema.safeParse(["a".repeat(INPUT_LIMITS.PATH_MAX + 1)]).success).toBe(false);
    });
  });

  describe("with default", () => {
    const schema = filePatternsInput("Source files", ["src/**/*.ts"]);

    it("uses the default when undefined is provided", () => {
      expect(schema.parse(undefined)).toEqual(["src/**/*.ts"]);
    });

    it("accepts an explicit value", () => {
      expect(schema.parse(["lib/**/*.ts"])).toEqual(["lib/**/*.ts"]);
    });
  });
});
