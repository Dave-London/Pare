import { describe, it, expect } from "vitest";
import {
  parseRunOutput,
  parseJustList,
  parseMakeTargets,
  enrichMakeTargetDescriptions,
  buildListResult,
} from "../src/lib/parsers.js";

describe("parseRunOutput", () => {
  it("parses successful run", () => {
    const result = parseRunOutput("build", "Build complete\n", "", 0, 1234, "make");

    expect(result.target).toBe("build");
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Build complete");
    expect(result.stderr).toBeUndefined();
    expect(result.duration).toBe(1234);
    expect(result.tool).toBe("make");
  });

  it("parses failed run", () => {
    const result = parseRunOutput("test", "", "make: *** [test] Error 2\n", 2, 567, "make");

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBe("make: *** [test] Error 2");
    expect(result.tool).toBe("make");
  });

  it("parses run with both stdout and stderr", () => {
    const result = parseRunOutput(
      "deploy",
      "Deploying...\nDone.",
      "Warning: slow connection",
      0,
      5000,
      "just",
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Deploying...\nDone.");
    expect(result.stderr).toBe("Warning: slow connection");
    expect(result.tool).toBe("just");
  });

  it("handles empty stdout and stderr", () => {
    const result = parseRunOutput("clean", "", "", 0, 100, "make");

    expect(result.success).toBe(true);
    expect(result.stdout).toBeUndefined();
    expect(result.stderr).toBeUndefined();
  });
});

describe("parseJustList", () => {
  it("parses just --list output with descriptions", () => {
    const stdout = [
      "Available recipes:",
      "    build  # Build the project",
      "    test   # Run tests",
      "    clean",
      "",
    ].join("\n");

    const result = parseJustList(stdout);

    expect(result.total).toBe(3);
    expect(result.targets).toEqual([
      { name: "build", description: "Build the project" },
      { name: "test", description: "Run tests" },
      { name: "clean", description: undefined },
    ]);
  });

  it("parses just --list output without descriptions", () => {
    const stdout = ["Available recipes:", "    build", "    test", "    deploy", ""].join("\n");

    const result = parseJustList(stdout);

    expect(result.total).toBe(3);
    expect(result.targets[0]).toEqual({ name: "build", description: undefined });
    expect(result.targets[1]).toEqual({ name: "test", description: undefined });
    expect(result.targets[2]).toEqual({ name: "deploy", description: undefined });
  });

  it("handles empty output", () => {
    const result = parseJustList("");

    expect(result.total).toBe(0);
    expect(result.targets).toEqual([]);
  });

  it("handles output with only header", () => {
    const result = parseJustList("Available recipes:\n");

    expect(result.total).toBe(0);
    expect(result.targets).toEqual([]);
  });

  it("handles mixed targets with and without descriptions", () => {
    const stdout = [
      "Available recipes:",
      "    build   # Compile everything",
      "    clean",
      "    lint    # Check code style",
      "",
    ].join("\n");

    const result = parseJustList(stdout);

    expect(result.total).toBe(3);
    expect(result.targets[0].description).toBe("Compile everything");
    expect(result.targets[1].description).toBeUndefined();
    expect(result.targets[2].description).toBe("Check code style");
  });
});

describe("parseMakeTargets", () => {
  it("parses make database output for targets", () => {
    const stdout = [
      "# GNU Make 4.3",
      "# Built for x86_64-pc-linux-gnu",
      "",
      "# Files",
      "",
      "build:",
      "\tgcc -o main main.c",
      "",
      "test: build",
      "\t./run-tests.sh",
      "",
      "clean:",
      "\trm -rf *.o",
      "",
    ].join("\n");

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(3);
    expect(result.targets.map((t) => t.name)).toEqual(["build", "test", "clean"]);
  });

  it("skips built-in targets starting with dot", () => {
    const stdout = [
      ".PHONY: build test",
      ".DEFAULT_GOAL := build",
      ".SUFFIXES:",
      "build:",
      "\techo building",
      "",
    ].join("\n");

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(1);
    expect(result.targets[0].name).toBe("build");
  });

  it("skips Makefile as target", () => {
    const stdout = ["Makefile:", "build:", "\techo building", ""].join("\n");

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(1);
    expect(result.targets[0].name).toBe("build");
  });

  it("handles empty output", () => {
    const result = parseMakeTargets("");

    expect(result.total).toBe(0);
    expect(result.targets).toEqual([]);
  });

  it("deduplicates targets", () => {
    const stdout = ["build: dep1", "build: dep2", "test:", ""].join("\n");

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(2);
    expect(result.targets.map((t) => t.name)).toEqual(["build", "test"]);
  });

  it("handles targets with hyphens and numbers", () => {
    const stdout = ["build-all:", "test-unit:", "deploy-v2:", "step3:", ""].join("\n");

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(4);
    expect(result.targets.map((t) => t.name)).toEqual([
      "build-all",
      "test-unit",
      "deploy-v2",
      "step3",
    ]);
  });

  it("skips comment lines", () => {
    const stdout = ["# This is a comment", "# Another comment: with colon", "build:", ""].join(
      "\n",
    );

    const result = parseMakeTargets(stdout);

    expect(result.total).toBe(1);
    expect(result.targets[0].name).toBe("build");
  });
});

describe("enrichMakeTargetDescriptions", () => {
  it("parses ## descriptions from Makefile source", () => {
    const makefileSource = [
      ".PHONY: build test clean",
      "",
      "build: ## Build the project",
      "\tgo build ./...",
      "",
      "test: build ## Run all tests",
      "\tgo test ./...",
      "",
      "clean: ## Remove build artifacts",
      "\trm -rf dist/",
    ].join("\n");

    const targets = [{ name: "build" }, { name: "test" }, { name: "clean" }];

    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched).toHaveLength(3);
    expect(enriched[0]).toEqual({ name: "build", description: "Build the project" });
    expect(enriched[1]).toEqual({ name: "test", description: "Run all tests" });
    expect(enriched[2]).toEqual({ name: "clean", description: "Remove build artifacts" });
  });

  it("leaves targets without ## comments unchanged", () => {
    const makefileSource = [
      "build: deps",
      "\tgcc -o main main.c",
      "",
      "test: ## Run tests",
      "\t./run-tests.sh",
      "",
      "clean:",
      "\trm -rf *.o",
    ].join("\n");

    const targets = [{ name: "build" }, { name: "test" }, { name: "clean" }];

    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched[0].description).toBeUndefined();
    expect(enriched[1].description).toBe("Run tests");
    expect(enriched[2].description).toBeUndefined();
  });

  it("handles empty Makefile source", () => {
    const targets = [{ name: "build" }, { name: "test" }];

    const enriched = enrichMakeTargetDescriptions(targets, "");

    expect(enriched[0].description).toBeUndefined();
    expect(enriched[1].description).toBeUndefined();
  });

  it("handles empty targets array", () => {
    const makefileSource = "build: ## Build it\n\techo build";

    const enriched = enrichMakeTargetDescriptions([], makefileSource);

    expect(enriched).toEqual([]);
  });

  it("handles ## with extra spaces around description", () => {
    const makefileSource = "build:  ##   Build the project   \n\techo build";

    const targets = [{ name: "build" }];
    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched[0].description).toBe("Build the project");
  });

  it("does not confuse single # comments with ## descriptions", () => {
    const makefileSource = [
      "# This is a regular comment",
      "build: # This is a regular inline comment, not ##",
      "\techo build",
    ].join("\n");

    const targets = [{ name: "build" }];
    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched[0].description).toBeUndefined();
  });

  it("handles targets with dependencies before ##", () => {
    const makefileSource = ["deploy: build test ## Deploy to production", "\t./deploy.sh"].join(
      "\n",
    );

    const targets = [{ name: "deploy" }];
    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched[0].description).toBe("Deploy to production");
  });

  it("only enriches targets that exist in the targets array", () => {
    const makefileSource = [
      "build: ## Build it",
      "test: ## Test it",
      "secret: ## Secret target",
    ].join("\n");

    const targets = [{ name: "build" }, { name: "test" }];
    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched).toHaveLength(2);
    expect(enriched[0].description).toBe("Build it");
    expect(enriched[1].description).toBe("Test it");
  });

  it("handles targets with dots, hyphens, and slashes in names", () => {
    const makefileSource = [
      "build-all: ## Build everything",
      "test.unit: ## Run unit tests",
      "deploy/prod: ## Deploy to prod",
    ].join("\n");

    const targets = [{ name: "build-all" }, { name: "test.unit" }, { name: "deploy/prod" }];
    const enriched = enrichMakeTargetDescriptions(targets, makefileSource);

    expect(enriched[0].description).toBe("Build everything");
    expect(enriched[1].description).toBe("Run unit tests");
    expect(enriched[2].description).toBe("Deploy to prod");
  });
});

describe("buildListResult", () => {
  it("builds full result for just", () => {
    const parsed = {
      targets: [{ name: "build", description: "Build it" }, { name: "test" }],
      total: 2,
    };

    const result = buildListResult(parsed, "just");

    expect(result.tool).toBe("just");
    expect(result.total).toBe(2);
    expect(result.targets).toEqual(parsed.targets);
  });

  it("builds full result for make", () => {
    const parsed = {
      targets: [{ name: "all" }, { name: "clean" }],
      total: 2,
    };

    const result = buildListResult(parsed, "make");

    expect(result.tool).toBe("make");
    expect(result.total).toBe(2);
  });
});
