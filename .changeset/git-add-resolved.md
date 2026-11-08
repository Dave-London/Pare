---
"@paretools/git": minor
---

Add an optional resolved mode to Git add for native conflict-resolution staging on Git 2.56+.
Preserve Git's conflict-marker refusal without a fallback, reject all/update combinations, and omit still-unmerged paths from staged-file results.
Fix option ordering for ordinary Git add with explicit files so modifiers such as dryRun and force are treated as options rather than file paths.
