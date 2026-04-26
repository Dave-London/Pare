---
"@paretools/build": patch
---

Fix `turbo` tool reporting `passed/failed/cached` all 0 with empty `tasks: []` on modern turbo 2.x output (#830). Turbo 2.x prefixes per-task status lines with `<pkg>:<task>:` (colon) instead of the legacy `<pkg>#<task>:` (hash) the parser was matching, so every task was silently skipped. The parser now accepts both separators, treats the trailing `(duration)` as optional, recognizes `cache bypass` from `--force` runs, and parses turbo 2.x's `ERROR ...` and `Failed:` failure summary lines. The `passed + failed === totalTasks` invariant is now enforced via the summary line as a fallback when per-task lines can't be matched.
