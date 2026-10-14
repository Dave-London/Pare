---
"@paretools/test": patch
---

fix(test): stop reporting a run as passing when the runner exits non-zero with no failed test. A Vitest suite whose `beforeAll`/`afterAll` throws, or a file that fails to load while others pass, now sets `error` and appears in `failures` instead of returning `failed: 0` with nothing else
