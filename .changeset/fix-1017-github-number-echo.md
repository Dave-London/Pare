---
"@paretools/github": patch
---

Fix PR/issue mutation tools echoing `number`/`prNumber` as `0` when the `number` input is passed as a string. A new `resolveNumber` helper resolves numeric strings, `#123` references, and PR/issue URLs to the actual number; branch names still resolve to `0`.
