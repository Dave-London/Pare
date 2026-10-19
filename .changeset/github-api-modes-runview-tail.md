---
"@paretools/github": patch
---

fix(github): `api` now rejects combining `jq`, `silent` and `verbose` with a clear message before calling gh, which accepts only one of them and refused the request with a usage error (#1109). `run-view` with `log`/`logFailed` gains `tailLines` to return only the end of the log (with `logsTotalLines`), and its text preview keeps the tail of a long log, where test failures and tracebacks are, instead of only the first 2000 characters (#1108)
