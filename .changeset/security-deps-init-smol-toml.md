---
"@paretools/init": patch
---

fix(deps): require `smol-toml` 1.9.0 or newer, which fixes a quadratic-time `parse()` on documents with many keys (GHSA-r4xh-jqrq-34v2)
