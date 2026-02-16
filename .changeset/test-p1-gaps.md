---
"@paretools/test": minor
---

feat(test): add meetsThreshold, playwright flaky detection, and timeout param (P1)

- Add `meetsThreshold` boolean to coverage output when `failUnder` is specified
- Add `flaky` count to Playwright test results from JSON stats
- Add `timeout` parameter to test run tool with per-framework mapping
