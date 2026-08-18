# unconfigured-project

Fixture with **no** linter/formatter config files (no `biome.json`, no `.prettierrc`,
no `eslint.config.*`). Used by tests that exercise "tool is not configured" code
paths. Because some formatters (Biome 2.x) happily format without a config, tests
must copy this fixture to a temp dir before running any write/fix mode against it.
