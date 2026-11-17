---
"@paretools/python": patch
---

`mypy`: treat runs with only note diagnostics as successful passes without attaching `exitCode: 1` or error details, and support streaming NDJSON output parsing from `mypy --output json` (#1223).
