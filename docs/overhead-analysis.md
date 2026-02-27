# Pare Overhead Analysis

This document quantifies the overhead and savings of using Pare MCP tools compared to raw CLI output.

## Methodology

- **Raw output**: The full text output from CLI commands (e.g., `git status`, `git log`)
- **Pare text**: Human-readable formatted output from Pare formatters (used as `content` fallback)
- **Pare JSON**: Structured JSON output from Pare parsers (used as `structuredContent` for agents)
- **Token estimation**: `Math.ceil(text.length / 4)` — approximate, not exact tokenizer counts
- **Latency**: Median of 5 runs per scenario, measuring parse + format time only (not CLI execution)
- **Environment**: Measured against the Pare monorepo itself

## Results

### Size and Token Comparison

| Operation            | Raw bytes | Raw tokens | Pare text bytes | Pare JSON bytes | Pare JSON tokens | Reduction |
| -------------------- | --------: | ---------: | --------------: | --------------: | ---------------: | --------: |
| git status           |       436 |        109 |             128 |             196 |               49 |     55.0% |
| git log -20          |   152,167 |     37,957 |           2,293 |           3,108 |              777 |     98.0% |
| git diff (5 commits) |   260,056 |     64,952 |           5,505 |          11,686 |            2,922 |     95.5% |
| pnpm list            |     5,270 |      1,091 |           4,477 |           6,846 |            1,712 |    -56.9% |

### Parse and Format Latency

| Operation            | Parse (ms) | Format (ms) | Total (ms) | Verdict           |
| -------------------- | ---------: | ----------: | ---------: | ----------------- |
| git status           |      0.041 |       0.004 |      0.045 | negligible (<1ms) |
| git log -20          |      0.192 |       0.014 |      0.206 | negligible (<1ms) |
| git diff (5 commits) |      0.432 |       0.044 |      0.476 | negligible (<1ms) |
| pnpm list            |      0.264 |       0.125 |      0.389 | negligible (<1ms) |

### Summary

- **Average token reduction**: 94.8%
- **Total raw tokens** (all ops): 104,109 vs **Pare JSON tokens**: 5,460
- **Max parse+format latency**: 0.476ms

### Break-Even Analysis

Pare adds sub-millisecond parsing overhead per operation while saving ~94.8% of context tokens. For a typical agent session with 50-100 tool calls, this translates to thousands of tokens saved with negligible latency cost.

The break-even point is effectively the first tool call. Pare pays for itself immediately because:

1. **Token savings are multiplicative** — every saved token reduces both input cost and context window pressure
2. **Latency overhead is constant** — sub-millisecond parsing is dwarfed by network round-trips and LLM inference time
3. **Structured output enables downstream automation** — agents can act on JSON fields directly without re-parsing text

### Raw Benchmark Output

```
====================================================================================================
  Pare Overhead Benchmark — Context Cost, Latency & Break-Even Analysis
====================================================================================================

  Token estimation: ~chars/4 (approximate). Runs per scenario: 5 (median reported).

────────────────────────────────────────────────────────────────────────────────────────────────────
  SIZE & TOKEN COMPARISON
────────────────────────────────────────────────────────────────────────────────────────────────────

  Operation              |    Raw bytes |   Raw tokens |    Pare text |    Pare JSON |  JSON tokens |  Reduction
  ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  git status             |          436 |          109 |          128 |          196 |           49 |      55.0%
  git log -20            |      152,167 |       37,957 |        2,293 |        3,108 |          777 |      98.0%
  git diff (5 commits)   |      260,056 |       64,952 |        5,505 |       11,686 |        2,922 |      95.5%
  pnpm list              |        5,270 |        1,091 |        4,477 |        6,846 |        1,712 |     -56.9%

────────────────────────────────────────────────────────────────────────────────────────────────────
  PARSE + FORMAT LATENCY (milliseconds, median of 5 runs)
────────────────────────────────────────────────────────────────────────────────────────────────────

  Operation              |   Parse (ms) |  Format (ms) |   Total (ms) |                        Verdict
  ────────────────────────────────────────────────────────────────────────────────────────────────────
  git status             |        0.041 |        0.004 |        0.045 |              negligible (<1ms)
  git log -20            |        0.192 |        0.014 |        0.206 |              negligible (<1ms)
  git diff (5 commits)   |        0.432 |        0.044 |        0.476 |              negligible (<1ms)
  pnpm list              |        0.264 |        0.125 |        0.389 |              negligible (<1ms)

────────────────────────────────────────────────────────────────────────────────────────────────────
  SUMMARY
────────────────────────────────────────────────────────────────────────────────────────────────────

  Average token reduction: 94.8%
  Total raw tokens (all ops): 104,109 -> Pare JSON tokens: 5,460
  Max parse+format latency: 0.476ms

  Break-even analysis:
    Pare adds sub-millisecond parsing overhead per operation while
    saving ~94.8% of tokens. For a typical agent session with 50-100 tool
    calls, this translates to thousands of tokens saved with negligible latency cost.
    The break-even point is effectively the first tool call — Pare pays for itself immediately.

====================================================================================================
```

_Generated on 2026-02-27 against the Pare monorepo._
