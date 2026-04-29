---
"@paretools/npm": patch
"@paretools/test": patch
"@paretools/build": patch
---

Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See #842.

- `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
- `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
- `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.
