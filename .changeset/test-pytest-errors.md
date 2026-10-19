---
"@paretools/test": patch
---

fix(test): `run` with pytest now reports tests that ERROR in setup or teardown, and modules that fail to collect. They are listed in `failures` and `tests` and counted in `summary.failed`, with the new optional `summary.errors` giving how many were errors, so a run with errors no longer reads as `failed: 0` (#1178). The summary-rule parsing is also linear now on long lines of `=` (#1182)
