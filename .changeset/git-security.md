---
"@paretools/git": patch
---

fix(git): add security hardening for rebase exec, bisect run, and config set

- Gate rebase --exec parameter behind assertAllowedByPolicy
- Gate bisect run command behind assertAllowedByPolicy
- Block dangerous git config keys that execute commands (core.fsmonitor, core.editor, etc.)
