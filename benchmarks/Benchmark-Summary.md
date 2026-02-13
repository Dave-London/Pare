# Pare Benchmark Summary

**Date**: 2026-02-13
**Platform**: win32 (x64)
**Node**: v22.19.0
**Runs per scenario**: 1

## Overall

| Metric                |   Value |
| --------------------- | ------: |
| Total scenarios       |     148 |
| Total raw tokens      | 285,409 |
| Total Pare tokens     | 134,259 |
| Tokens saved          | 151,150 |
| **Overall reduction** | **53%** |

## Breakdown

| Suite               | Scenarios | Raw Tokens | Pare Tokens | Reduction |
| ------------------- | --------: | ---------: | ----------: | --------: |
| Reproducible        |       117 |    267,589 |     129,987 |       51% |
| Mutating (one-shot) |        31 |     17,820 |       4,272 |       76% |

## Top Token Savers

| Scenario         |    Raw |  Pare |  Saved |
| ---------------- | -----: | ----: | -----: |
| npm-list-d2      | 177467 | 70531 | 106936 |
| diff-full-patch  |  22873 |   725 |  22148 |
| pip-audit-vulns  |   5760 |    67 |   5693 |
| biome-violations |   5632 |   820 |   4812 |
| count-common     |   3647 |    63 |   3584 |

## Worst Overhead

| Scenario       |   Raw |  Pare | Overhead |
| -------------- | ----: | ----: | -------: |
| blame-large    | 10255 | 13409 |    +3154 |
| issue-list-all |   711 |  2031 |    +1320 |
| run-list-20    |   647 |  1526 |     +879 |
| pr-list-closed |   497 |  1300 |     +803 |
| diff-large     |   327 |  1130 |     +803 |

## Latency

Median added latency (Pare vs raw CLI): **-3 ms**

---

## Methodology

### Use Frequency

Each tool is assigned a **Use Frequency** category reflecting how often it is called during a typical AI coding agent session. Categories are defined relative to a reference session of ~200 Pare-wrappable tool calls, representing a medium-complexity coding task (30–60 minutes).

| Category  | Calls per session | Representative value | Tools |
| --------- | ----------------: | -------------------: | ----: |
| Very High |               12+ |                   16 |     5 |
| High      |              6–11 |                    8 |     4 |
| Average   |               3–5 |                    4 |     8 |
| Low       |               1–2 |                  1.5 |    20 |
| Very Low  |                <1 |                  0.5 |    63 |

**Representative values** are mid-range estimates used for calculating estimated session impact:

```
session_impact = Σ (representative_calls × avg_tokens_saved_per_call)
```

### Reference session

The 200-call reference session is an order-of-magnitude estimate, not a directly measured figure. It is informed by:

- **MCP tool call benchmarks** — MCPMark reports an average of ~17 tool calls per atomic task. A medium-complexity coding session chains 10–15 such tasks (explore, edit, test, fix, lint, commit), yielding ~170–250 tool calls.
- **Agent workflow analysis** — typical coding agent loops (explore → edit → test → fix → lint → commit) are dominated by git and build tool calls, with git status/diff/add/commit comprising the highest-frequency operations.
- **Observed Pare MCP usage** — real-world sessions using Pare tools for all git, test, build, lint, and npm operations.

Since Use Frequency categories are used for _relative_ comparison between tools (not absolute savings predictions), the exact session length has minimal impact on the conclusions — proportions remain stable across session sizes.

### Frequency assignment rationale

Tools were assigned to tiers based on the natural clustering of expected call counts:

- **Very High** — Core git read/write cycle: `status`, `diff`, `commit`, `add`, `log`. Called on nearly every iteration of an edit-test-commit loop.
- **High** — Session-level operations: `push`, `test run`, `checkout`, `npm run`. Called multiple times per session but not on every loop iteration.
- **Average** — Periodic operations: `pull`, `install`, `tsc`, `npm test`, `branch`, `show`, `build`, `lint`. Used a few times per session, often at phase transitions (start of session, before push, after major changes).
- **Low** — Situational operations: docker, coverage, formatting, blame, audit, language-specific build/test. Used when the workflow requires them, typically 1–2 times.
- **Very Low** — Occasional operations: specialized linters, package search/info, stash, compose, HTTP tools, language-specific formatters. Used less than once per average session.

### Data sources

- [MCPMark benchmark](https://github.com/yiranwu0/MCPMark) — tool call frequency data for AI coding agents
- Anthropic Claude Code documentation — agent workflow patterns
- Pare project internal usage telemetry — observed tool call distributions

### Token estimation

Tokens are estimated as `Math.ceil(text.length / 4)`, a standard heuristic for English text with code. Actual tokenizer counts may vary by ±10–15%.

---

See `Benchmark-Detailed.csv` for full per-scenario data.
See `tool-registry.csv` for the complete tool registry with Use Frequency assignments.
