---
"@paretools/python": minor
---

Add S-complexity gap implementations for Python tools:

- pip-audit: Add `success` output field, `ignoreVuln`, `vulnerabilityService`, and `indexUrl` params
- pip-list: Add `success` output field, `location` and `editableProject` per-package fields, `exclude` param
- pip-show: Add `success`, `requiredBy`, `authorEmail`, `metadataVersion`, `classifiers` output fields; fix key-value parser to split on first `: ` only
- pip-install: Add `constraint`, `editable`, `indexUrl`, `extraIndexUrl`, `target`, `report` params
- pytest: Add `keyword`, `tracebackStyle`, `coverage`, `parallel`, `configFile` params
- ruff-check: Add `success` and `url` output fields, `select`, `ignore`, `config`, `targetVersion`, `exclude` params
- ruff-format: Add `config`, `targetVersion`, `exclude`, `range`, `quoteStyle` params
- mypy: Add `configFile`, `pythonVersion`, `exclude`, `followImports`, `module`, `package`, `installTypes` params
- black: Add `config` param
- conda: Add `prefix` and `packageFilter` params
- poetry: Add `description` to show output, `group` and `format` params
- uv-install: Add `editable`, `constraint`, `indexUrl`, `python`, `extras` params
- uv-run: Add `withPackages`, `python`, `envFile` params
