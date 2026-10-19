---
"@paretools/test": patch
---

fix(test): `run` with `testNamePattern` and Vitest now passes `--testNamePattern`. It used to pass `--grep`, a Mocha flag that Vitest rejects, so no tests ran (#1172)
