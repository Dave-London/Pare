---
"@paretools/test": minor
---

Add XS-complexity missing flags across all test tools:

- **playwright**: `workers` (--workers), `retries` (--retries), `maxFailures` (--max-failures), `timeout` (--timeout), `lastFailed` (--last-failed), `onlyChanged` (--only-changed), `forbidOnly` (--forbid-only), `passWithNoTests` (--pass-with-no-tests)
- **run**: `onlyChanged` (--lf / --onlyChanged / --changed), `exitFirst` (-x / --bail=1 / -b), `passWithNoTests` (--passWithNoTests)
- **coverage**: `branch` (--cov-branch), `all` (--coverage.all / --all)
