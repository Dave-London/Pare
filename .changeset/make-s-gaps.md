---
"@paretools/make": minor
---

Implement S-complexity gaps for make tools:

**list**: Add `file` param (maps to `make -f` / `just --justfile`) for non-default makefiles/justfiles. Add `filter` param for client-side regex filtering on target names.

**run**: Add `file` param (maps to `make -f` / `just --justfile`) for non-default makefiles/justfiles. Add `env` param (Record<string, string>) for environment variable passthrough to target execution.
