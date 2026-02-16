---
"@paretools/build": minor
---

Add S-complexity gap params and output schema enhancements across all build tools:

- build: exitCode in output schema, timeout param, stdout/stderr/outputLines in schema
- esbuild: target, external, sourcemap enum expansion, tsconfig, drop
- nx: configuration, head, projects, exclude
- tsc: declaration/declarationDir, pretty (--pretty false for parser normalization)
- turbo: args with assertNoFlagInjection, outputLogs enum
- vite-build: outDir, config, sourcemap, base, ssr
- webpack: entry, target, devtool, analyze
