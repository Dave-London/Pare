---
"@paretools/search": patch
---

Add pre-validation of regex patterns in search, count, and find tools. Invalid regex patterns now return a clear structured error message instead of silently returning empty results. The validation is skipped when fixedStrings mode (search/count) or glob mode (find) is active.
