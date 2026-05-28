---
"@paretools/github": patch
---

Fix `label-list` crashing with "Unexpected end of JSON input" when `--search` matches zero labels. `gh label list --search <term>` exits 0 but prints empty stdout (not `[]`); `parseLabelList` now treats empty/whitespace-only output as an empty list. Closes #903.
