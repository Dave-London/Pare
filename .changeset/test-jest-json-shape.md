---
"@paretools/test": patch
---

fix(test): `run` with Jest now parses real `jest --json` output (`name` / `assertionResults` per file). It read keys Jest never writes, so a passing run returned a tool error and a failing run came back as "0 tests". A file that fails to run (for example a missing module) is reported as a suite-level failure, ANSI codes are stripped from failure messages, and the duration comes from the report instead of the parse time (#1176)
