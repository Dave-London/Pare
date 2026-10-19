---
"@paretools/test": patch
---

fix(test): `coverage` now reports a run whose test runner exited non-zero (a failed test, a suite that failed to load, a hook that threw, or a missed `failUnder` / configured threshold) with an `error` field and the runner's output, instead of a clean-looking coverage result. A missed `failUnder` is named as the cause (#1177)
