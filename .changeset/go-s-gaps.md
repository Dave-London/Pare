---
"@paretools/go": minor
---

Add S-complexity gap implementations for Go tools:

- build: add tags, ldflags, output, buildmode, gcflags params
- env: add JSON parse error handling with success field, fix filtered vars mode
- generate: add run, skip, tags params
- get: add update enum param (all | patch)
- golangci-lint: add newFromRev, enable/disable, timeout, buildTags, concurrency, maxIssuesPerLinter, maxSameIssues, presets params; add resultsTruncated schema field
- list: add success field to schema, tags param, testGoFiles to package schema
- mod-tidy: add goVersion, compat params
- run: add tags, timeout, exec, maxOutput params; clarify buildArgs interaction with assertNoFlagInjection
- test: add timeout, count, cover, coverprofile, tags, parallel, shuffle params
- vet: add success field to schema, analyzers, tags, contextLines, vettool params
