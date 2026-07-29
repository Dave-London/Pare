---
"@paretools/lint": patch
---

Surface linter config failures and keep the actionable payload in compact output.

- All six linters (eslint, biome-check, stylelint, shellcheck, hadolint, oxlint) now attach `error` and `exitCode` when the CLI exits non-zero with zero parsed diagnostics, instead of reporting a false "clean" result on config errors or crashes (#1024). Exits caused by found violations are unaffected.
- `format-check` surfaces prettier failures (exit > 1) as `error` instead of a silent `{formatted: false, files: []}` (#1024).
- Compact lint output now keeps the first 25 diagnostics plus `diagnosticsTruncated`/`omittedCount` and the fixable counts, instead of dropping every diagnostic (#1022).
- Compact `format-check` output now includes the failing file list (capped at 50 with `filesTruncated`) and `total` (#1021).
- Compact `prettier-format`/`biome-format` output now includes the list of reformatted files (capped at 50 with `filesTruncated`) (#1022).
