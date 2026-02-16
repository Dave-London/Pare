---
"@paretools/make": minor
---

feat(make): add just JSON dump, phony targets, dependencies, and timeout detection (P1)

- Use `just --dump-format json` for more reliable recipe parsing
- Extract `.PHONY` targets and add `isPhony` field to target entries
- Add `dependencies` field to target entries
- Add `timedOut` detection to run tool output
