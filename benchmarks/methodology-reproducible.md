# Reproducible Benchmark Suite — Methodology

## Overview

The reproducible benchmark suite measures token efficiency of Pare MCP structured JSON output versus raw CLI text output. It runs deterministic, read-only scenarios that produce consistent output across repeated runs.

## What It Measures

Each scenario pairs a **raw CLI command** (e.g., `git log --oneline -5`) with its equivalent **Pare MCP tool call** (e.g., `callTool("log", {maxCount: 5})`). The suite captures:

- **Raw CLI tokens**: stdout + stderr from `execFile`, estimated as tokens
- **Pare Regular tokens**: structured JSON output with full schema fields
- **Pare Compact tokens**: structured JSON with compact mode (omits empty/default fields)
- **Latency**: wall-clock time for both raw CLI and Pare MCP calls

## Token Estimation

Tokens are estimated using the cl100k_base heuristic:

```
Math.ceil(text.length / 4)
```

This approximation is consistent across all measurements, making relative comparisons valid even if absolute token counts differ slightly from actual tokenizer output.

## Scenario Structure

- **117 scenarios** across **76 tools** from **14 packages**
- Some tools have multiple variants (A/B/C) spanning the output-size spectrum:
  - **A** = minimal / small output
  - **B** = typical / moderate output
  - **C** = large / complex output
- Many tools have a single representative scenario
- Each scenario is mapped to a row in `tool-registry.csv` via its registry number

## Measurement

- **N runs** per scenario (configurable via `--runs`), **median** reported
- Both compact and regular Pare modes are tested on every run
- Results are written to `benchmarks/temp/` as intermediates, then combined with mutating results into `benchmarks/Benchmark-Detailed.csv`

## Tool Availability

Scenarios auto-skip when the raw CLI tool is not installed on the system. For example:

- `rg` (ripgrep) scenarios skip if ripgrep is not on PATH
- `make` scenarios skip if make is not available
- `docker` scenarios skip if Docker daemon is not running

Skipped scenarios are listed in the output summary.

## Running the Suite

```bash
# Full suite (1 run per scenario)
npx tsx scripts/benchmark-v2.ts

# Multiple runs for statistical stability
npx tsx scripts/benchmark-v2.ts --runs 5

# Single scenario
npx tsx scripts/benchmark-v2.ts --scenario log-5

# Multiple scenarios
npx tsx scripts/benchmark-v2.ts --scenario log-5,log-20

# By registry number
npx tsx scripts/benchmark-v2.ts --scenario 5A

# Substring match
npx tsx scripts/benchmark-v2.ts --scenario blame
```

## Output Files

| File                     | Location           | Description                                         |
| ------------------------ | ------------------ | --------------------------------------------------- |
| `results-detailed.csv`   | `benchmarks/temp/` | Per-scenario reproducible results (intermediate)    |
| `results-overall.csv`    | `benchmarks/temp/` | Aggregate reproducible stats (intermediate)         |
| `Benchmark-Detailed.csv` | `benchmarks/`      | Combined: reproducible + mutating results (tracked) |
| `Benchmark-Summary.md`   | `benchmarks/`      | Overall analysis and conclusions (tracked)          |

## Frequency Data Sources

Tool frequency weights are derived from five independent sources:

1. **Jerry Ng — Shell History Analysis (2024)**: git=59%, npm=6.5%, docker=6.1%, go=3.8%, make=2.7%
2. **Anthropic — "How People Prompt" (2025)**: ~21 tool calls/transcript; File Read 35-45%, Terminal 15-25%, Git 10-15%
3. **GitClear — Developer Activity (2024-2025)**: Median 2.7 commits/day; commit, push, pull most frequent
4. **Kevin Magnan — MCP Tool Usage (2025)**: ~120 MCP calls/day over 83 days
5. **SWE-bench Agent Traces (2024-2025)**: Heavy git status/diff/log for context, test:run for validation
