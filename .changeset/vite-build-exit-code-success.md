---
"@paretools/build": patch
---

fix(build): vite-build success now tracks the process exit code; advisory stderr (rolldown-vite chunk-size / ineffective-dynamic-import) maps to warnings and never flips success, and a failed build always populates errors[]
