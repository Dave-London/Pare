---
"@paretools/build": minor
---

Add XS-complexity gap items across all build tools:

- build: Add `assertNoFlagInjection` on `args[]` elements; document command allowlist in description
- esbuild: Add `splitting`, `legalComments`, and `logLevel` params
- nx: Add `parallel`, `skipNxCache`, `nxBail`, `verbose`, `dryRun`, `outputStyle`, and `graph` params
- tsc: Add `incremental`, `skipLibCheck`, and `emitDeclarationOnly` params; document compact-mode field loss
- turbo: Add `force`, `continue`, `dryRun`, `affected`, `graph`, `logOrder`, and `profile` params
- vite-build: Add `manifest`, `minify`, `logLevel`, `emptyOutDir`, and `reportCompressedSize` params
- webpack: Add `bail` and `cache` params; append `--no-color` to prevent ANSI in text fallback
