/**
 * Regression tests for #1022/#1025: compact mapper outputs must validate
 * against the registered Zod outputSchema the way the MCP SDK does (JSON
 * Schema with additionalProperties: false + AJV). Zod .parse() strips unknown
 * keys silently, so it cannot catch compact-only fields missing from schemas.
 */
import { describe, it, expect } from "vitest";
import { validateToolOutput } from "@paretools/shared/testing";
import { compactListMap, compactInfoMap, compactSearchMap } from "../src/lib/formatters.js";
import { NpmListSchema, NpmInfoSchema, NpmSearchSchema } from "../src/schemas/index.js";
import type { NpmList, NpmInfo, NpmSearch } from "../src/schemas/index.js";

function expectValid(schema: unknown, payload: unknown) {
  const result = validateToolOutput(schema, payload);
  expect(result.errorMessage ?? "valid").toBe("valid");
  expect(result.valid).toBe(true);
}

describe("compact outputs validate against registered outputSchemas (SDK-style)", () => {
  it("list (truncation triggered)", () => {
    const data: NpmList = {
      packageManager: "npm",
      name: "my-app",
      version: "1.0.0",
      dependencies: Object.fromEntries(
        Array.from({ length: 25 }, (_, i) => [
          `pkg${i}`,
          {
            version: "1.0.0",
            type: "dependency" as const,
            dependencies: { [`nested${i}`]: { version: "0.1.0" } },
          },
        ]),
      ),
      problems: ["missing: left-pad@1.0.0"],
    };
    const compact = compactListMap(data);
    expect(compact.omittedDependencyCount).toBe(5);
    expect(compact.dependencyCount).toBe(50);
    expectValid(NpmListSchema, compact);
  });

  it("info", () => {
    const data: NpmInfo = {
      packageManager: "npm",
      name: "react",
      version: "19.0.0",
      description: "React library",
      license: "MIT",
      homepage: "https://react.dev",
      isDeprecated: false,
      dependencies: { "loose-envify": "^1.1.0" },
      versions: ["18.0.0", "19.0.0"],
    };
    expectValid(NpmInfoSchema, compactInfoMap(data));
  });

  it("search", () => {
    const data: NpmSearch = {
      packageManager: "npm",
      packages: [
        {
          name: "react",
          version: "19.0.0",
          description: "React library",
          author: "meta",
          date: "2026-01-01",
          keywords: ["ui"],
          score: 0.9,
          links: { npm: "https://npmjs.com/react" },
          scope: "unscoped",
        },
      ],
    };
    expectValid(NpmSearchSchema, compactSearchMap(data));
  });
});
