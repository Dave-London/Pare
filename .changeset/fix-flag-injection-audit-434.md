---
"@paretools/shared": patch
"@paretools/git": patch
"@paretools/security": patch
"@paretools/build": patch
---

Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.
