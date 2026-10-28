---
"@paretools/test": patch
---

`playwright` now passes `args` through verbatim, flags included (e.g. `["--list"]`), matching the `run` tool's passthrough `args`. Only NUL and newline characters are rejected; named params such as `project` and `grep` keep their flag guard. Tests with no results (listed by `--list`, or never run after `maxFailures`/an interruption) are now counted as skipped, as in Playwright's own stats, instead of being dropped from the totals.
