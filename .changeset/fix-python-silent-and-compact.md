---
"@paretools/python": patch
---

Surface silent tool failures and restore compact-mode payloads (part of #1022 and #1024).

- pip-audit, mypy, ruff-check, ruff-format, pip-install, and poetry now attach `error` and `exitCode` when a run fails without producing parseable output, instead of returning a silent zeroed result — a crashed pip-audit no longer reads as "0 vulnerabilities", and pip's `ERROR:` lines are captured.
- Compact mode now keeps the actionable payload: mypy/ruff diagnostics (first 20 + severity/fixable counts), pip-audit severity counts + vulnerability identities, pip-list name/version pairs, poetry package/artifact/message entries, pyenv version lists, and uv-run truncated stdout/stderr via the shared compact-stream budget.
