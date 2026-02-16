---
"@paretools/go": minor
---

feat(go): improve env, fmt, generate, get, list, vet, golangci-lint, mod-tidy output (P1)

- Improve env compact mode for filtered queries
- Capture fmt stderr parse errors
- Parse generate per-directive output
- Add per-package status to get output
- Capture golangci-lint Replacement/fix data
- Capture list Error field per package
- Distinguish mod-tidy "already tidy" from "made changes"
- Add analyzer name to vet diagnostics
