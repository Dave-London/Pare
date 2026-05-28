---
"@paretools/github": patch
---

Guard list/view parsers against empty stdout from `gh` commands (e.g. `gh pr list --search`, `gh issue list`) that exit 0 with no output, instead of throwing "Unexpected end of JSON input". Closes #905.
