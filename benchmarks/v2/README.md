# Pare Benchmark v2

**Benchmark conducted against Pare v0.8.0 (100 tools, 14 packages) on 2026-02-13.**

This benchmark measured the token efficiency of every Pare tool at the time by comparing structured MCP output against raw CLI equivalents across 148 scenarios. The tool surface has since expanded (see the main [README](../../README.md) for current counts).

The data, methodology, and findings remain valid for the tools and scenarios covered. A future v3 benchmark may be conducted when warranted.

## Contents

| Path                               | Description                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| `Benchmark-Summary.md`             | Full results, analysis, and savings breakdown              |
| `methodology-reproducible.md`      | Methodology for read-only (non-mutating) scenarios         |
| `methodology-mutating.md`          | Methodology for mutating scenarios (git add, commit, etc.) |
| `data/Benchmark-Detailed.csv`      | Per-scenario raw data                                      |
| `data/tool-registry.csv`           | Tool registry snapshot at time of benchmark                |
| `data/latest-mutating-results.csv` | Mutating scenario results                                  |
| `temp/`                            | Intermediate pipeline output                               |
| `scripts/`                         | All benchmark scripts (runnable with `pnpm benchmark`)     |

## Running the Benchmark

From the repo root:

```bash
pnpm benchmark
```

This runs the v2 benchmark script (`benchmarks/v2/scripts/benchmark.ts`). See the script headers for additional options (filtering by scenario, adjusting run count, verbose mode, etc.).
