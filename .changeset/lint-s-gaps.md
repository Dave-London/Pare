---
"@paretools/lint": minor
---

Add S-complexity gap params and output schema enhancements across all lint tools:

- biome-check: since, configPath, linterEnabled/formatterEnabled, maxDiagnostics, skip
- biome-format: since, configPath
- format-check: config, ignorePath, parser
- hadolint: config, requireLabel, shell, errorRules/warningRules/infoRules severity overrides
- lint (eslint): maxWarnings, config, fixType, rule
- oxlint: config, deny/warn/allow, plugins, tsconfig, ignorePath
- prettier-format: config
- shellcheck: exclude, enable, include, rcfile, sourcePath
- stylelint: maxWarnings, config, ignorePath
- Output schema: column in diagnostics (eslint, stylelint, oxlint, shellcheck, hadolint, biome), fixableErrorCount/fixableWarningCount (eslint), wikiUrl for hadolint DL rules
