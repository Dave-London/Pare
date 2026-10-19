---
"@paretools/lint": patch
---

fix(lint): `prettier-format` now reports `filesUnchanged` correctly. Prettier 3 prints already-formatted files as `file.ts 12ms (unchanged)`, and those lines were dropped, so the count was always 0 (#1161)
