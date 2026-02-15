# Pare Benchmark Summary

## Overall

Pare is a suite of MCP (Model Context Protocol) server packages that wrap standard developer CLI tools with structured, token-efficient JSON output. This benchmark measures the token efficiency of Pare's 147 tools across 16 packages by comparing the output of each Pare tool against its raw CLI equivalent.

Each of Pare's **147 tools** is tested through one or more **benchmark scenarios** that exercise different output sizes and configurations. For each scenario, both the raw CLI command and the equivalent Pare MCP tool call are executed, and their output token counts are compared.

**Date**: 2026-02-13
**Platform**: win32 (x64)
**Node**: v22.19.0
**Coding agent**: Claude Code (Claude Opus 4.6 / Sonnet 4.5)
**Tested scenarios**: 148
**Runs per scenario**: 1
**Total tokens consumed in tests**: 419,668

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
session_impact = Σ (representative_calls × avg_tokens_per_call)
```

### Per-tool averaging

When a tool has multiple benchmark scenarios (e.g., git diff has small, large, and full-patch variants), the per-tool token count is a **simple average** across all its scenarios. This treats each scenario as equally likely, which is a simplifying assumption — in practice, small outputs are more common than large ones. Simple averaging was chosen for transparency and reproducibility; if this proves insufficiently nuanced, scenario-type weighting (e.g., higher weight for typical-sized output) can be introduced later.

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

## Estimated Session Impact

Per-tool token usage weighted by Use Frequency representative values. Each tool's avg tokens are a simple average across its benchmark scenarios. Session values = avg tokens × representative calls.

|   # | Tool                 | Use Frequency | Avg Raw | Raw / Session | Avg Pare | Pare / Session |
| --: | -------------------- | ------------- | ------: | ------------: | -------: | -------------: |
|   1 | git/status           | Very High     |     321 |         5,136 |      239 |          3,824 |
|   2 | git/diff             | Very High     |   7,802 |       124,832 |      860 |         13,760 |
|   3 | git/commit           | Very High     |      48 |           768 |       69 |          1,104 |
|   4 | git/add              | Very High     |       0 |             0 |       22 |            352 |
|   5 | git/log              | Very High     |     459 |         7,344 |      509 |          8,144 |
|   6 | git/push             | High          |      74 |           592 |       79 |            632 |
|   7 | test/run             | High          |     521 |         4,168 |       40 |            320 |
|   8 | git/checkout         | High          |      17 |           136 |       21 |            168 |
|   9 | npm/run              | High          |     242 |         1,936 |      208 |          1,664 |
|  10 | git/pull             | Average       |      77 |           308 |       54 |            216 |
|  11 | npm/install          | Average       |      45 |           180 |       53 |            212 |
|  12 | build/tsc            | Average       |     512 |         2,048 |       22 |             88 |
|  13 | npm/test             | Average       |     512 |         2,048 |      350 |          1,400 |
|  14 | git/branch           | Average       |     641 |         2,564 |      735 |          2,940 |
|  15 | git/show             | Average       |     380 |         1,520 |       11 |             44 |
|  16 | build/build          | Average       |      36 |           144 |       20 |             80 |
|  17 | lint/lint            | Average       |     564 |         2,256 |      478 |          1,912 |
|  18 | docker/ps            | Low           |     389 |           584 |      928 |          1,392 |
|  19 | python/pytest        | Low           |      72 |           108 |       64 |             96 |
|  20 | docker/images        | Low           |     158 |           237 |      323 |            485 |
|  21 | lint/format-check    | Low           |     149 |           224 |       11 |             17 |
|  22 | docker/build         | Low           |      69 |           104 |       64 |             96 |
|  23 | github/pr-view       | Low           |     484 |           726 |      783 |          1,175 |
|  24 | git/blame            | Low           |   5,464 |         8,196 |    6,694 |         10,041 |
|  25 | npm/audit            | Low           |     176 |           264 |       36 |             54 |
|  26 | test/coverage        | Low           |     846 |         1,269 |      220 |            330 |
|  27 | lint/prettier-format | Low           |     298 |           447 |       15 |             23 |
|  28 | docker/logs          | Low           |      15 |            23 |       63 |             95 |
|  29 | docker/run           | Low           |      81 |           122 |       19 |             29 |
|  30 | github/pr-list       | Low           |     259 |           389 |      684 |          1,026 |
|  31 | search/search        | Low           |     117 |           176 |      294 |            441 |
|  32 | make/run             | Low           |      13 |            20 |       24 |             36 |
|  33 | python/pip-install   | Low           |     105 |           158 |       21 |             32 |
|  34 | cargo/build          | Low           |      18 |            27 |       23 |             35 |
|  35 | cargo/test           | Low           |      18 |            27 |       25 |             38 |
|  36 | go/build             | Low           |      23 |            35 |       13 |             20 |
|  37 | go/test              | Low           |      33 |            50 |       25 |             38 |
|  38 | git/tag              | Very Low      |     232 |           116 |      261 |            131 |
|  39 | npm/outdated         | Very Low      |     131 |            66 |       92 |             46 |
|  40 | npm/list (\*)        | Very Low      |   6,027 |         3,014 |    5,434 |          2,717 |
|  41 | build/esbuild        | Very Low      |     109 |            55 |       19 |             10 |
|  42 | build/vite-build     | Very Low      |      51 |            26 |       19 |             10 |
|  43 | docker/exec          | Very Low      |      19 |            10 |      106 |             53 |
|  44 | docker/compose-up    | Very Low      |      60 |            30 |       65 |             33 |
|  45 | github/pr-create     | Very Low      |      12 |             6 |       19 |             10 |
|  46 | github/issue-view    | Very Low      |     264 |           132 |      298 |            149 |
|  47 | search/find          | Very Low      |   1,686 |           843 |       45 |             23 |
|  48 | python/mypy          | Very Low      |      85 |            43 |       44 |             22 |
|  49 | python/ruff-check    | Very Low      |     593 |           297 |      307 |            154 |
|  50 | cargo/clippy         | Very Low      |     982 |           491 |       93 |             47 |
|  51 | cargo/check          | Very Low      |      18 |             9 |       23 |             12 |
|  52 | git/remote           | Very Low      |      28 |            14 |       13 |              7 |
|  53 | npm/info             | Very Low      |     311 |           156 |      169 |             85 |
|  54 | docker/compose-down  | Very Low      |      67 |            34 |       14 |              7 |
|  55 | github/issue-list    | Very Low      |     490 |           245 |    1,381 |            691 |
|  56 | http/request         | Very Low      |     157 |            79 |       93 |             47 |
|  57 | go/vet               | Very Low      |      23 |            12 |       10 |              5 |
|  58 | http/get             | Very Low      |      84 |            42 |      159 |             80 |
|  59 | python/ruff-format   | Very Low      |      14 |             7 |       11 |              6 |
|  60 | go/fmt               | Very Low      |      23 |            12 |       11 |              6 |
|  61 | git/stash-list       | Very Low      |       0 |             0 |        9 |              5 |
|  62 | build/webpack        | Very Low      |     109 |            55 |       19 |             10 |
|  63 | lint/biome-check     | Very Low      |   2,858 |         1,429 |      838 |            419 |
|  64 | docker/pull          | Very Low      |      49 |            25 |       37 |             19 |
|  65 | docker/inspect       | Very Low      |      10 |             5 |       15 |              8 |
|  66 | github/issue-create  | Very Low      |     257 |           129 |      268 |            134 |
|  67 | github/run-view      | Very Low      |     702 |           351 |      329 |            165 |
|  68 | github/run-list      | Very Low      |     483 |           242 |    1,152 |            576 |
|  69 | search/count         | Very Low      |   1,832 |           916 |       63 |             32 |
|  70 | make/list            | Very Low      |   3,340 |         1,670 |       34 |             17 |
|  71 | python/pip-list      | Very Low      |     968 |           484 |    1,665 |            833 |
|  72 | cargo/run            | Very Low      |      18 |             9 |       21 |             11 |
|  73 | cargo/fmt            | Very Low      |     219 |           110 |       15 |              8 |
|  74 | go/run               | Very Low      |      27 |            14 |       10 |              5 |
|  75 | go/mod-tidy          | Very Low      |       0 |             0 |        6 |              3 |
|  76 | git/stash            | Very Low      |      26 |            13 |       51 |             26 |
|  77 | npm/search           | Very Low      |   1,445 |           723 |      994 |            497 |
|  78 | lint/biome-format    | Very Low      |      84 |            42 |       11 |              6 |
|  79 | docker/network-ls    | Very Low      |      70 |            35 |      125 |             63 |
|  80 | docker/volume-ls     | Very Low      |      42 |            21 |      192 |             96 |
|  81 | docker/compose-ps    | Very Low      |      11 |             6 |        9 |              5 |
|  82 | http/post            | Very Low      |      90 |            45 |       60 |             30 |
|  83 | python/pip-show      | Very Low      |      73 |            37 |       56 |             28 |
|  84 | python/pip-audit     | Very Low      |   2,885 |         1,443 |       44 |             22 |
|  85 | python/uv-install    | Very Low      |      48 |            24 |       66 |             33 |
|  86 | python/uv-run        | Very Low      |       4 |             2 |       61 |             31 |
|  87 | python/black         | Very Low      |      22 |            11 |       47 |             24 |
|  88 | cargo/add            | Very Low      |      81 |            41 |       61 |             31 |
|  89 | npm/init             | Very Low      |     114 |            57 |       46 |             23 |
|  90 | lint/stylelint       | Very Low      |     296 |           148 |       22 |             11 |
|  91 | lint/oxlint          | Very Low      |     107 |            54 |       27 |             14 |
|  92 | http/head            | Very Low      |      59 |            30 |      114 |             57 |
|  93 | cargo/remove         | Very Low      |      10 |             5 |       62 |             31 |
|  94 | cargo/doc            | Very Low      |      18 |             9 |       10 |              5 |
|  95 | cargo/update         | Very Low      |      24 |            12 |       64 |             32 |
|  96 | cargo/tree           | Very Low      |      18 |             9 |       23 |             12 |
|  97 | go/generate          | Very Low      |       0 |             0 |        6 |              3 |
|  98 | go/env               | Very Low      |     303 |           152 |      422 |            211 |
|  99 | go/list              | Very Low      |      23 |            12 |        9 |              5 |
| 100 | go/get               | Very Low      |      28 |            14 |        6 |              3 |
|     | **Total**            |               |         |   **183,289** |          |     **60,254** |

**Estimated savings per coding session:**

Using Pare tools, a coding agent's input token consumption is reduced by an estimated **123,035 tokens** relative to standard CLI tool use — a **67% reduction** per session.

### Estimated Cost Savings

An active developer using AI coding agents runs an estimated **8–12 sessions per week** (24–48 per month), where each session involves ~200 tool calls. This estimate is derived from polling three frontier LLMs for their assessment of typical CLI agent usage patterns and should be treated as a rough approximation — actual usage varies widely by workflow and role.

Token pricing varies by model. Sonnet-class models cost ~$3/MTok while Opus-class models cost ~$15/MTok. Since most coding agent usage skews toward faster, cheaper models, we use a usage-weighted estimate of **$4.50 per million tokens**.

At this rate, 123,035 tokens saved per session = **$0.55 per session**, or **$13.3 to $26.6 per developer per month**.

These are input token savings only — the measurable floor. The harder-to-quantify benefits of structured MCP output (reduced context window consumption, fewer parsing failures, more deterministic agent behavior) are likely worth more than the raw token cost savings but cannot be derived from this benchmark alone. Pare is a free, open source toolset that requires no workflow changes — it wraps the same CLI tools already in use, so these savings come at zero cost and zero friction.

&nbsp;

_(\*) npm/list excludes the depth=2 scenario (40C) from its session average. While npm-list-d2 shows a large 60% reduction (177,467 → 70,531 tokens), depth=2 output is an outlier — it is rarely requested by coding agents and its extreme size (177K tokens from a single call) would disproportionately inflate the session estimate. The scenario is retained in the detailed benchmark data for transparency. Excluding it has minimal effect on the overall reduction (67% vs 66%) but yields a more representative session estimate._

---

## Breakdown

| Suite               | Scenarios | Raw Tokens | Pare Tokens | Reduction |
| ------------------- | --------: | ---------: | ----------: | --------: |
| Reproducible        |       117 |    267,589 |     129,987 |       51% |
| Mutating (one-shot) |        31 |     17,820 |       4,272 |       76% |

## Top Token Savers

| Scenario         |   Raw | Pare |  Saved |
| ---------------- | ----: | ---: | -----: |
| diff-full-patch  | 22873 |  725 | 22,148 |
| pip-audit-vulns  |  5760 |   67 |  5,693 |
| biome-violations |  5632 |  820 |  4,812 |
| count-common     |  3647 |   63 |  3,584 |
| find-all-ts      |  3548 |   63 |  3,485 |

## Worst Overhead

| Scenario       |   Raw |  Pare | Overhead |
| -------------- | ----: | ----: | -------: |
| blame-large    | 10255 | 13409 |    +3154 |
| issue-list-all |   711 |  2031 |    +1320 |
| run-list-20    |   647 |  1526 |     +879 |
| pr-list-closed |   497 |  1300 |     +803 |
| diff-large     |   327 |  1130 |     +803 |

## Latency

The median difference in execution time between Pare and raw CLI is **-6 ms**, which is negligible given that the 148 benchmark scenarios span a range of **21 ms to 21,839 ms** with a median execution time of **430 ms**. Pare's structured parsing and schema validation add no meaningful overhead to tool execution.

---

See `Benchmark-Detailed.csv` for full per-scenario data. _Scenarios marked with (\*) are excluded from session impact averages — see footnote in Estimated Session Impact above._
See `tool-registry.csv` for the complete tool registry with Use Frequency assignments.
