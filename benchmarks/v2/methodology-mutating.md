# Mutating Tools Benchmark — Methodology

## Overview

The mutating benchmark suite tests **24 scenarios** covering tools that modify state (git commit, npm install, docker run, etc.). Each scenario runs **once** in an isolated throwaway environment, comparing raw CLI output with Pare MCP structured JSON.

## Why One-Shot?

Mutating tools change system state on each run. Running them multiple times would require full setup/teardown cycles and produce different outputs each time (e.g., different commit hashes, different download progress). A single controlled run captures the representative token comparison.

## Environment Groups

Each tool group uses an isolated throwaway workspace:

| Group      | Setup                                                           | Scenarios                                                                    |
| ---------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Git**    | Fresh repo with bare remote for push/pull                       | git-add, git-commit, git-checkout, git-stash, git-push, git-pull             |
| **npm**    | Minimal `package.json` project                                  | npm-init, npm-install                                                        |
| **Docker** | System Docker daemon; containers removed after each test        | docker-run, docker-pull, docker-exec, docker-compose-up, docker-compose-down |
| **HTTP**   | Public httpbin.org endpoint                                     | http-post                                                                    |
| **GitHub** | Real API calls to Dave-London/pare; issues created then deleted | github-issue-create, github-pr-create                                        |
| **Python** | Fresh venv                                                      | pip-install, uv-install                                                      |
| **Cargo**  | Fresh `cargo new` project                                       | cargo-add, cargo-remove, cargo-update                                        |
| **Go**     | Minimal `go.mod` module                                         | go-get, go-mod-tidy, go-generate                                             |

## Measurement

- **Raw CLI**: `execFile(cmd, args, {shell: true})` — captures stdout + stderr
- **Pare MCP**: `client.callTool()` — captures structuredContent JSON or text content
- **Token estimate**: `Math.ceil(text.length / 4)` (cl100k_base heuristic)
- **Single run** per scenario (no median — these are one-shot mutating operations)

## Running the Suite

```bash
# All 24 scenarios
npx tsx scripts/benchmark-v2-mutating.ts

# Single scenario
npx tsx scripts/benchmark-v2-mutating.ts --scenario git-add

# With verbose output
npx tsx scripts/benchmark-v2-mutating.ts --verbose
```

## Output

Results are written to `benchmarks/latest-mutating-results.csv` in the same CSV format as the reproducible detailed results. This file is tracked in git as the durable store for mutating benchmark data.

## Frequency Data Sources

Tool frequency weights are derived from five independent sources:

1. **Jerry Ng — Shell History Analysis (2024)**: git=59%, npm=6.5%, docker=6.1%, go=3.8%, make=2.7%
2. **Anthropic — "How People Prompt" (2025)**: ~21 tool calls/transcript; File Read 35-45%, Terminal 15-25%, Git 10-15%
3. **GitClear — Developer Activity (2024-2025)**: Median 2.7 commits/day; commit, push, pull most frequent
4. **Kevin Magnan — MCP Tool Usage (2025)**: ~120 MCP calls/day over 83 days
5. **SWE-bench Agent Traces (2024-2025)**: Heavy git status/diff/log for context, test:run for validation
