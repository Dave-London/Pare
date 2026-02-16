---
"@paretools/git": patch
"@paretools/github": patch
"@paretools/test": patch
---

Fix tool bugs found while dogfooding:

- Add `admin` option to pr-merge for bypassing branch protection
- Fix pull tool divergent branches by always passing explicit merge strategy
- Fix push tool setUpstream by auto-detecting current branch name
- Add `coverage` boolean to test run tool for running tests with coverage
