---
"@paretools/python": minor
---

feat(python): improve mypy, pip, poetry, pyenv, pytest, ruff output (P1)

- Switch mypy to JSON output for reliable parsing
- Separate notes from warnings in mypy output
- Add severity/aliases to pip-audit vulnerabilities
- Surface pip-list parse errors
- Support multiple packages in pip-show
- Tighten poetry show regex
- Add pyenv uninstall action
- Add warnings count to pytest output
- Capture ruff-check fix applicability
