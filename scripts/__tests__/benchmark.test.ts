import { describe, it, expect } from "vitest";
import {
  computeMedian,
  parseArgs,
  loadScenarios,
  groupByClass,
  formatClassTable,
  formatOverallSummary,
  estimateTokens,
  isToolAvailable,
  type BenchmarkConfig,
  type ScenarioSummary,
} from "../benchmark.js";
import { SCENARIOS, type BenchmarkScenario } from "../benchmark-scenarios.js";
import {
  TOOL_REGISTRY,
  linkScenariosToRegistry,
  computeSessionProjection,
  formatRegistryTable,
  formatSessionProjection,
  type ToolRegistryEntry,
  type FrequencyCategory,
} from "../benchmark-registry.js";

// ─── computeMedian ────────────────────────────────────────────────

describe("computeMedian", () => {
  it("returns the middle value for an odd-length array", () => {
    expect(computeMedian([3, 1, 2])).toBe(2);
  });

  it("returns the average of two middle values for an even-length array", () => {
    expect(computeMedian([4, 1, 3, 2])).toBe(2.5);
  });

  it("returns the single element for a one-element array", () => {
    expect(computeMedian([42])).toBe(42);
  });

  it("returns 0 for an empty array", () => {
    expect(computeMedian([])).toBe(0);
  });

  it("handles negative values", () => {
    expect(computeMedian([-10, -5, 0, 5, 10])).toBe(0);
  });

  it("does not mutate the input array", () => {
    const arr = [3, 1, 2];
    computeMedian(arr);
    expect(arr).toEqual([3, 1, 2]);
  });
});

// ─── estimateTokens ───────────────────────────────────────────────

describe("estimateTokens", () => {
  it("returns ceil(length / 4)", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("a")).toBe(1);
  });
});

// ─── parseArgs ────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const config = parseArgs([]);
    expect(config).toEqual({
      class: "all",
      runs: 3,
      output: null,
      verbose: false,
      skipUnavailable: true,
    });
  });

  it("parses --class verbose", () => {
    const config = parseArgs(["--class", "verbose"]);
    expect(config.class).toBe("verbose");
  });

  it("parses --class compact", () => {
    const config = parseArgs(["--class", "compact"]);
    expect(config.class).toBe("compact");
  });

  it("parses --runs 10", () => {
    const config = parseArgs(["--runs", "10"]);
    expect(config.runs).toBe(10);
  });

  it("parses --output path", () => {
    const config = parseArgs(["--output", "BENCHMARK.md"]);
    expect(config.output).toBe("BENCHMARK.md");
  });

  it("parses --verbose", () => {
    const config = parseArgs(["--verbose"]);
    expect(config.verbose).toBe(true);
  });

  it("parses multiple flags together", () => {
    const config = parseArgs([
      "--class",
      "compact",
      "--runs",
      "3",
      "--verbose",
      "--output",
      "out.md",
    ]);
    expect(config.class).toBe("compact");
    expect(config.runs).toBe(3);
    expect(config.verbose).toBe(true);
    expect(config.output).toBe("out.md");
  });

  it("throws on invalid --class value", () => {
    expect(() => parseArgs(["--class", "invalid"])).toThrow(/Invalid --class value/);
  });

  it("throws on invalid --runs value", () => {
    expect(() => parseArgs(["--runs", "abc"])).toThrow(/Invalid --runs value/);
  });

  it("throws on negative --runs", () => {
    expect(() => parseArgs(["--runs", "-1"])).toThrow(/Invalid --runs value/);
  });
});

// ─── loadScenarios ────────────────────────────────────────────────

describe("loadScenarios", () => {
  const baseConfig: BenchmarkConfig = {
    class: "all",
    runs: 5,
    output: null,
    verbose: false,
    skipUnavailable: true,
  };

  it("returns all scenarios for class=all", () => {
    const result = loadScenarios({ ...baseConfig, class: "all" });
    expect(result.length).toBe(SCENARIOS.length);
  });

  it("returns only compact scenarios for class=compact", () => {
    const result = loadScenarios({ ...baseConfig, class: "compact" });
    expect(result.every((s) => s.class === "compact")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns only verbose scenarios for class=verbose", () => {
    const result = loadScenarios({ ...baseConfig, class: "verbose" });
    expect(result.every((s) => s.class === "verbose")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a copy, not a reference", () => {
    const result = loadScenarios({ ...baseConfig, class: "all" });
    result.pop();
    expect(loadScenarios({ ...baseConfig, class: "all" }).length).toBe(SCENARIOS.length);
  });
});

// ─── groupByClass ─────────────────────────────────────────────────

describe("groupByClass", () => {
  const makeSummary = (id: string, cls: "compact" | "verbose"): ScenarioSummary => ({
    scenario: {
      id,
      class: cls,
      description: "test",
      rawCommand: "echo",
      rawArgs: [],
      pareServer: "server-git",
      pareTool: "status",
      pareArgs: {},
      parityNotes: "test",
    },
    medianRawTokens: 100,
    medianPareTokens: 50,
    medianPareRegularTokens: 50,
    medianReduction: 50,
    medianRawLatencyMs: 10,
    medianPareLatencyMs: 20,
    runs: [],
  });

  it("correctly groups by class", () => {
    const summaries = [
      makeSummary("a", "compact"),
      makeSummary("b", "verbose"),
      makeSummary("c", "compact"),
      makeSummary("d", "verbose"),
    ];
    const { compact, verbose } = groupByClass(summaries);
    expect(compact.length).toBe(2);
    expect(verbose.length).toBe(2);
    expect(compact.every((s) => s.scenario.class === "compact")).toBe(true);
    expect(verbose.every((s) => s.scenario.class === "verbose")).toBe(true);
  });

  it("handles empty input", () => {
    const { compact, verbose } = groupByClass([]);
    expect(compact.length).toBe(0);
    expect(verbose.length).toBe(0);
  });
});

// ─── formatClassTable ─────────────────────────────────────────────

describe("formatClassTable", () => {
  const makeSummary = (overrides: Partial<ScenarioSummary> = {}): ScenarioSummary => ({
    scenario: {
      id: "test-scenario",
      class: "compact",
      description: "Test scenario",
      rawCommand: "echo",
      rawArgs: [],
      pareServer: "server-git",
      pareTool: "status",
      pareArgs: {},
      parityNotes: "test",
    },
    medianRawTokens: 100,
    medianPareTokens: 50,
    medianPareRegularTokens: 50,
    medianReduction: 50,
    medianRawLatencyMs: 10,
    medianPareLatencyMs: 20,
    runs: [],
    ...overrides,
  });

  it("generates a valid markdown table", () => {
    const table = formatClassTable([makeSummary()], "Compact");
    expect(table).toContain("## Compact Class (1 scenarios)");
    expect(table).toContain("| Scenario |");
    expect(table).toContain("|---|---|");
    expect(table).toContain("`test-scenario`");
    expect(table).toContain("**50%**");
    expect(table).toContain("**Compact class median reduction:");
  });

  it("shows negative reduction without bold", () => {
    const table = formatClassTable([makeSummary({ medianReduction: -30 })], "Compact");
    expect(table).toContain("-30%");
    expect(table).not.toContain("**-30%**");
  });

  it("includes latency columns", () => {
    const table = formatClassTable([makeSummary()], "Verbose");
    expect(table).toContain("10ms");
    expect(table).toContain("20ms");
  });
});

// ─── formatOverallSummary ─────────────────────────────────────────

describe("formatOverallSummary", () => {
  const makeSummary = (
    id: string,
    cls: "compact" | "verbose",
    rawTokens: number,
    pareTokens: number,
    reduction: number,
  ): ScenarioSummary => ({
    scenario: {
      id,
      class: cls,
      description: "test",
      rawCommand: "echo",
      rawArgs: [],
      pareServer: "server-git",
      pareTool: "status",
      pareArgs: {},
      parityNotes: "test",
    },
    medianRawTokens: rawTokens,
    medianPareTokens: pareTokens,
    medianPareRegularTokens: pareTokens,
    medianReduction: reduction,
    medianRawLatencyMs: 10,
    medianPareLatencyMs: 20,
    runs: [],
  });

  it("generates overall summary with all three columns", () => {
    const compact = [makeSummary("a", "compact", 100, 130, -30)];
    const verbose = [makeSummary("b", "verbose", 500, 100, 80)];
    const summary = formatOverallSummary(compact, verbose);

    expect(summary).toContain("## Overall Summary");
    expect(summary).toContain("| Metric | Compact | Verbose | All |");
    expect(summary).toContain("| Scenarios | 1 | 1 | 2 |");
    expect(summary).toContain("**Headline**");
  });

  it("calculates weighted avg reduction correctly", () => {
    // 100 raw -> 130 pare (compact) = -30% weighted
    // 500 raw -> 100 pare (verbose) = 80% weighted
    // total: 600 raw -> 230 pare = 62% weighted
    const compact = [makeSummary("a", "compact", 100, 130, -30)];
    const verbose = [makeSummary("b", "verbose", 500, 100, 80)];
    const summary = formatOverallSummary(compact, verbose);

    // Weighted avg for all: (1 - 230/600) * 100 = 62%
    expect(summary).toContain("62%");
  });
});

// ─── isToolAvailable ──────────────────────────────────────────────

describe("isToolAvailable", () => {
  it("returns true for git (should be installed)", async () => {
    const result = await isToolAvailable("git");
    expect(result).toBe(true);
  });

  it("returns false for a nonexistent tool", async () => {
    const result = await isToolAvailable("nonexistent-tool-xyz-123456");
    expect(result).toBe(false);
  });
});

// ─── Scenario manifest validation ────────────────────────────────

describe("scenario manifest", () => {
  it("has unique IDs", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least one compact and one verbose scenario", () => {
    expect(SCENARIOS.some((s) => s.class === "compact")).toBe(true);
    expect(SCENARIOS.some((s) => s.class === "verbose")).toBe(true);
  });

  it("all scenarios have required fields", () => {
    for (const s of SCENARIOS) {
      expect(s.id).toBeTruthy();
      expect(s.class).toMatch(/^(compact|verbose)$/);
      expect(s.description).toBeTruthy();
      expect(s.rawCommand).toBeTruthy();
      expect(Array.isArray(s.rawArgs)).toBe(true);
      expect(s.pareServer).toBeTruthy();
      expect(s.pareTool).toBeTruthy();
      expect(typeof s.pareArgs).toBe("object");
      expect(s.parityNotes).toBeTruthy();
    }
  });
});

// ─── Tool Registry ───────────────────────────────────────────────

describe("tool registry", () => {
  it("has exactly 100 entries", () => {
    expect(TOOL_REGISTRY.length).toBe(100);
  });

  it("has unique IDs", () => {
    const ids = TOOL_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all IDs follow package:tool format", () => {
    for (const e of TOOL_REGISTRY) {
      expect(e.id).toBe(`${e.package}:${e.tool}`);
    }
  });

  it("frequency weights sum to approximately 100%", () => {
    const total = TOOL_REGISTRY.reduce((sum, e) => sum + e.frequencyWeight, 0);
    expect(total).toBeGreaterThanOrEqual(95);
    expect(total).toBeLessThanOrEqual(105);
  });

  it("every entry has a valid frequency category", () => {
    const validCategories: FrequencyCategory[] = ["very-high", "high", "medium", "low"];
    for (const e of TOOL_REGISTRY) {
      expect(validCategories).toContain(e.frequency);
    }
  });

  it("frequency weights are in expected ranges per category", () => {
    for (const e of TOOL_REGISTRY) {
      switch (e.frequency) {
        case "very-high":
          expect(e.frequencyWeight).toBeGreaterThanOrEqual(5);
          expect(e.frequencyWeight).toBeLessThanOrEqual(15);
          break;
        case "high":
          expect(e.frequencyWeight).toBeGreaterThanOrEqual(1);
          expect(e.frequencyWeight).toBeLessThanOrEqual(4);
          break;
        case "medium":
          expect(e.frequencyWeight).toBeGreaterThanOrEqual(0.3);
          expect(e.frequencyWeight).toBeLessThanOrEqual(1);
          break;
        case "low":
          expect(e.frequencyWeight).toBeGreaterThanOrEqual(0.05);
          expect(e.frequencyWeight).toBeLessThanOrEqual(0.3);
          break;
      }
    }
  });

  it("every entry has a non-empty frequency source", () => {
    for (const e of TOOL_REGISTRY) {
      expect(e.frequencySource.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a valid status", () => {
    for (const e of TOOL_REGISTRY) {
      expect(["tested", "pending", "skip"]).toContain(e.status);
    }
  });

  it("skip entries have a skip reason", () => {
    const skips = TOOL_REGISTRY.filter((e) => e.status === "skip");
    expect(skips.length).toBeGreaterThan(0);
    for (const e of skips) {
      expect(e.skipReason).toBeTruthy();
    }
  });

  it("tested entries have a scenarioId", () => {
    const tested = TOOL_REGISTRY.filter((e) => e.status === "tested");
    expect(tested.length).toBeGreaterThan(0);
    for (const e of tested) {
      expect(e.scenarioId).toBeTruthy();
    }
  });

  it("mutating git tools are marked as skip", () => {
    const mutating = ["git:commit", "git:add", "git:push", "git:pull", "git:checkout", "git:stash"];
    for (const id of mutating) {
      const entry = TOOL_REGISTRY.find((e) => e.id === id);
      expect(entry).toBeDefined();
      expect(entry!.status).toBe("skip");
      expect(entry!.skipReason).toContain("Mutating");
    }
  });

  it("covers all 13 tool-bearing packages", () => {
    const packages = new Set(TOOL_REGISTRY.map((e) => e.package));
    // 14 packages total but "shared" is a utility, not a tool server
    expect(packages.size).toBe(13);
    const expected = [
      "git",
      "github",
      "search",
      "test",
      "npm",
      "build",
      "lint",
      "http",
      "make",
      "python",
      "docker",
      "cargo",
      "go",
    ];
    for (const pkg of expected) {
      expect(packages.has(pkg)).toBe(true);
    }
  });
});

// ─── linkScenariosToRegistry ─────────────────────────────────────

describe("linkScenariosToRegistry", () => {
  const makeSummary = (
    scenarioId: string,
    rawTokens: number,
    pareTokens: number,
  ): ScenarioSummary => ({
    scenario: {
      id: scenarioId,
      class: "compact",
      description: "test",
      rawCommand: "git",
      rawArgs: ["status"],
      pareServer: "server-git",
      pareTool: "status",
      pareArgs: {},
      parityNotes: "test",
    },
    medianRawTokens: rawTokens,
    medianPareTokens: pareTokens,
    medianPareRegularTokens: pareTokens,
    medianReduction: Math.round((1 - pareTokens / rawTokens) * 100),
    medianRawLatencyMs: 10,
    medianPareLatencyMs: 20,
    runs: [],
  });

  it("links matching scenarios to registry entries", () => {
    const summaries = [makeSummary("git-status-clean", 100, 60)];
    const linked = linkScenariosToRegistry(TOOL_REGISTRY, summaries);

    const statusEntry = linked.find((e) => e.id === "git:status");
    expect(statusEntry).toBeDefined();
    expect(statusEntry!.status).toBe("tested");
    expect(statusEntry!.results).not.toBeNull();
    expect(statusEntry!.results!.rawTokens).toBe(100);
    expect(statusEntry!.results!.pareTokens).toBe(60);
    expect(statusEntry!.results!.tokensSaved).toBe(40);
  });

  it("does not modify entries without matching scenarios", () => {
    const summaries = [makeSummary("git-status-clean", 100, 60)];
    const linked = linkScenariosToRegistry(TOOL_REGISTRY, summaries);

    const npmSearch = linked.find((e) => e.id === "npm:search");
    expect(npmSearch).toBeDefined();
    expect(npmSearch!.status).toBe("pending");
    expect(npmSearch!.results).toBeNull();
  });

  it("does not modify skip entries", () => {
    const summaries: ScenarioSummary[] = [];
    const linked = linkScenariosToRegistry(TOOL_REGISTRY, summaries);

    const gitCommit = linked.find((e) => e.id === "git:commit");
    expect(gitCommit).toBeDefined();
    expect(gitCommit!.status).toBe("skip");
    expect(gitCommit!.results).toBeNull();
  });

  it("does not mutate the original registry", () => {
    const summaries = [makeSummary("git-status-clean", 100, 60)];
    const original = TOOL_REGISTRY.find((e) => e.id === "git:status");
    linkScenariosToRegistry(TOOL_REGISTRY, summaries);
    expect(original!.results).toBeNull();
  });
});

// ─── computeSessionProjection ────────────────────────────────────

describe("computeSessionProjection", () => {
  it("returns correct projection with tested tools", () => {
    const registry: ToolRegistryEntry[] = [
      {
        id: "test:a",
        package: "test",
        tool: "a",
        frequency: "high",
        frequencyWeight: 60,
        frequencySource: "test",
        status: "tested",
        scenarioId: "s1",
        results: { rawTokens: 200, pareTokens: 50, reduction: 75, tokensSaved: 150 },
      },
      {
        id: "test:b",
        package: "test",
        tool: "b",
        frequency: "medium",
        frequencyWeight: 40,
        frequencySource: "test",
        status: "pending",
        scenarioId: null,
        results: null,
      },
    ];

    const projection = computeSessionProjection(registry, 100);

    // Only test:a is modeled (60% weight)
    expect(projection.totalCallsModeled).toBe(60);
    expect(projection.coveragePercent).toBe(60);
    // 60 calls * 200 raw = 12,000 raw tokens
    expect(projection.projectedRawTokens).toBe(12000);
    // 60 calls * 50 pare = 3,000 pare tokens
    expect(projection.projectedPareTokens).toBe(3000);
    expect(projection.projectedSavings).toBe(9000);
    expect(projection.projectedReduction).toBe(75);
  });

  it("includes skip tools estimated from package averages", () => {
    const registry: ToolRegistryEntry[] = [
      {
        id: "pkg:tested",
        package: "pkg",
        tool: "tested",
        frequency: "high",
        frequencyWeight: 50,
        frequencySource: "test",
        status: "tested",
        scenarioId: "s1",
        results: { rawTokens: 100, pareTokens: 50, reduction: 50, tokensSaved: 50 },
      },
      {
        id: "pkg:skipped",
        package: "pkg",
        tool: "skipped",
        frequency: "high",
        frequencyWeight: 50,
        frequencySource: "test",
        status: "skip",
        skipReason: "Mutating",
        scenarioId: null,
        results: null,
      },
    ];

    const projection = computeSessionProjection(registry, 100);

    // Both tools should be modeled (100% coverage)
    expect(projection.totalCallsModeled).toBe(100);
    expect(projection.coveragePercent).toBe(100);
    // Skip tool uses package average: 50% reduction, same avg raw tokens (100)
    expect(projection.projectedRawTokens).toBe(10000); // 50*100 + 50*100
    expect(projection.projectedPareTokens).toBe(5000); // 50*50 + 50*50
  });

  it("returns zero projection for empty registry", () => {
    const projection = computeSessionProjection([], 100);
    expect(projection.projectedRawTokens).toBe(0);
    expect(projection.projectedPareTokens).toBe(0);
    expect(projection.projectedSavings).toBe(0);
  });
});

// ─── formatRegistryTable ─────────────────────────────────────────

describe("formatRegistryTable", () => {
  it("generates valid markdown with correct column count", () => {
    const table = formatRegistryTable(TOOL_REGISTRY);
    const lines = table.split("\n").filter((l) => l.startsWith("|"));

    // Header + separator + 100 data rows = 102 lines
    expect(lines.length).toBe(102);

    // Each row should have 10 columns (11 pipes)
    for (const line of lines) {
      if (line.startsWith("|---")) continue; // separator
      const pipes = line.split("|").length - 1;
      expect(pipes).toBeGreaterThanOrEqual(10);
    }
  });

  it("contains the heading", () => {
    const table = formatRegistryTable(TOOL_REGISTRY);
    expect(table).toContain("## Tool Coverage Registry (100 tools)");
  });

  it("shows tested/skip/pending counts", () => {
    const table = formatRegistryTable(TOOL_REGISTRY);
    expect(table).toContain("tested");
    expect(table).toContain("skipped (mutating)");
    expect(table).toContain("pending");
  });

  it("sorts by frequency weight descending", () => {
    const table = formatRegistryTable(TOOL_REGISTRY);
    const dataLines = table.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| #"));
    // First data row should have the highest weight tool
    expect(dataLines[0]).toContain("git");
    expect(dataLines[0]).toContain("status");
  });
});

// ─── formatSessionProjection ─────────────────────────────────────

describe("formatSessionProjection", () => {
  it("generates projection section with key metrics", () => {
    const output = formatSessionProjection(TOOL_REGISTRY, 100);
    expect(output).toContain("## Session Projection");
    expect(output).toContain("Calls modeled");
    expect(output).toContain("Projected raw tokens");
    expect(output).toContain("Projected Pare tokens");
    expect(output).toContain("Projected savings");
    expect(output).toContain("Coverage");
  });

  it("includes frequency data sources", () => {
    const output = formatSessionProjection(TOOL_REGISTRY, 100);
    expect(output).toContain("Jerry Ng");
    expect(output).toContain("Anthropic");
    expect(output).toContain("GitClear");
    expect(output).toContain("SWE-bench");
  });
});
