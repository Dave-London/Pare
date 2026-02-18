---
"@paretools/test": patch
"@paretools/github": patch
---

Improve reliability for long-running test and GitHub CLI workflows.

- `@paretools/test`:
  - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
  - Increase package Vitest timeout to `300_000ms`
  - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
  - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
  - Document timeout and test-batching policy in README
- `@paretools/github`:
  - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
  - Add unit coverage for `gh` runner invocation options
