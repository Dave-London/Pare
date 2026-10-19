---
"@paretools/infra": patch
---

feat(infra): `init` accepts `backend: false`, mapping to `terraform init -backend=false`, so a validate-only workflow (`init` then `validate`) no longer fails on backend credentials (#1103)
