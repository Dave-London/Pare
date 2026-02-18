# Smoke Test Scenarios: Python Server (14 tools)

---

## Tool: `black`

### Implementation: `packages/server-python/src/tools/black.ts`

### Schema: `BlackResultSchema`

### Input params

| Param                     | Type     | Required | Notes                 |
| ------------------------- | -------- | -------- | --------------------- |
| `path`                    | string   | no       | Project root path     |
| `targets`                 | string[] | no       | Default: ["."]        |
| `check`                   | boolean  | no       | Default: false        |
| `lineLength`              | number   | no       | Line length override  |
| `targetVersion`           | string   | no       | Python version target |
| `diff`                    | boolean  | no       | Default: false        |
| `skipStringNormalization` | boolean  | no       | Default: false        |
| `preview`                 | boolean  | no       | Default: false        |
| `config`                  | string   | no       | Config file path      |
| `compact`                 | boolean  | no       | Default: true         |

### Scenarios

| #   | Scenario                          | Params                             | Expected Output                                                       | Priority | Status   |
| --- | --------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | -------- | -------- |
| 1   | Format clean project (no changes) | `{ path }`                         | `{ filesChanged: 0, success: true }`                                  | P0       | complete |
| 2   | Format project with changes       | `{ path }`                         | `{ filesChanged: N, success: true }`                                  | P0       | complete |
| 3   | Check mode with violations        | `{ path, check: true }`            | `{ success: false, errorType: "check_failed", wouldReformat: [...] }` | P0       | mocked   |
| 4   | No Python files found             | `{ path: "/tmp/empty" }`           | `{ filesChecked: 0, success: true }`                                  | P0       | mocked   |
| 5   | Flag injection on `targets`       | `{ targets: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                        | P0       | mocked   |
| 6   | Flag injection on `targetVersion` | `{ targetVersion: "--exec=evil" }` | `assertNoFlagInjection` throws                                        | P0       | mocked   |
| 7   | Flag injection on `config`        | `{ config: "--exec=evil" }`        | `assertNoFlagInjection` throws                                        | P0       | mocked   |
| 8   | Syntax error in file              | `{ path }` (bad syntax)            | `{ success: false, errorType: "internal_error", diagnostics: [...] }` | P1       | mocked   |
| 9   | Custom line length                | `{ path, lineLength: 120 }`        | `{ success: true }`                                                   | P1       | mocked   |
| 10  | Diff mode                         | `{ path, diff: true }`             | `{ success: true }`                                                   | P2       | mocked   |
| 11  | Schema validation                 | all                                | Zod parse succeeds against `BlackResultSchema`                        | P0       | mocked   |

### Summary: 11 scenarios (P0: 7, P1: 2, P2: 1)

---

## Tool: `conda`

### Implementation: `packages/server-python/src/tools/conda.ts`

### Schema: `CondaResultSchema` (discriminated union by action)

### Input params

| Param           | Type                                                               | Required | Notes                  |
| --------------- | ------------------------------------------------------------------ | -------- | ---------------------- |
| `action`        | "list" \| "info" \| "env-list" \| "create" \| "remove" \| "update" | yes      | Conda action           |
| `name`          | string                                                             | no       | Environment name       |
| `prefix`        | string                                                             | no       | Env prefix path        |
| `packageFilter` | string                                                             | no       | Regex filter for list  |
| `packages`      | string[]                                                           | no       | Packages for mutations |
| `all`           | boolean                                                            | no       | Update all packages    |
| `path`          | string                                                             | no       | Working directory      |
| `compact`       | boolean                                                            | no       | Default: true          |

### Scenarios

| #   | Scenario                          | Params                                                    | Expected Output                                            | Priority | Status |
| --- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- | -------- | ------ |
| 1   | List packages in base env         | `{ action: "list" }`                                      | `{ action: "list", packages: [...], total: N }`            | P0       | mocked |
| 2   | Get conda info                    | `{ action: "info" }`                                      | `{ action: "info", condaVersion: "...", platform: "..." }` | P0       | mocked |
| 3   | List environments                 | `{ action: "env-list" }`                                  | `{ action: "env-list", environments: [...], total: N }`    | P0       | mocked |
| 4   | Conda not installed               | any                                                       | Error thrown                                               | P0       | mocked |
| 5   | Flag injection on `name`          | `{ action: "list", name: "--exec=evil" }`                 | `assertNoFlagInjection` throws                             | P0       | mocked |
| 6   | Flag injection on `prefix`        | `{ action: "list", prefix: "--exec=evil" }`               | `assertNoFlagInjection` throws                             | P0       | mocked |
| 7   | Flag injection on `packageFilter` | `{ action: "list", packageFilter: "--exec=evil" }`        | `assertNoFlagInjection` throws                             | P0       | mocked |
| 8   | Flag injection on `packages`      | `{ action: "create", packages: ["--exec=evil"] }`         | `assertNoFlagInjection` throws                             | P0       | mocked |
| 9   | List in named env                 | `{ action: "list", name: "myenv" }`                       | `{ environment: "myenv", packages: [...] }`                | P1       | mocked |
| 10  | Create environment                | `{ action: "create", name: "test", packages: ["numpy"] }` | `{ action: "create", success: true }`                      | P1       | mocked |
| 11  | Remove packages                   | `{ action: "remove", name: "test", packages: ["numpy"] }` | `{ action: "remove", success: true }`                      | P1       | mocked |
| 12  | Update all                        | `{ action: "update", all: true }`                         | `{ action: "update", success: true }`                      | P2       | mocked |
| 13  | Schema validation                 | all                                                       | Zod parse succeeds against `CondaResultSchema`             | P0       | mocked |

### Summary: 13 scenarios (P0: 8, P1: 3, P2: 1)

---

## Tool: `mypy`

### Implementation: `packages/server-python/src/tools/mypy.ts`

### Schema: `MypyResultSchema`

### Input params

| Param                    | Type     | Required | Notes              |
| ------------------------ | -------- | -------- | ------------------ |
| `path`                   | string   | no       | Project root       |
| `targets`                | string[] | no       | Default: ["."]     |
| `strict`                 | boolean  | no       | Default: false     |
| `ignoreMissingImports`   | boolean  | no       | Default: false     |
| `noIncremental`          | boolean  | no       | Default: false     |
| `configFile`             | string   | no       | Config file path   |
| `pythonVersion`          | string   | no       | Python version     |
| `exclude`                | string   | no       | Exclude regex      |
| `followImports`          | enum     | no       | Import handling    |
| `module`                 | string   | no       | Module to check    |
| `package`                | string   | no       | Package to check   |
| `installTypes`           | boolean  | no       | Auto-install stubs |
| `disallowUntypedDefs`    | boolean  | no       | Default: false     |
| `disallowIncompleteDefs` | boolean  | no       | Default: false     |
| `disallowUntypedCalls`   | boolean  | no       | Default: false     |
| `disallowAnyGenerics`    | boolean  | no       | Default: false     |
| `warnReturnAny`          | boolean  | no       | Default: false     |
| `warnUnusedIgnores`      | boolean  | no       | Default: false     |
| `warnRedundantCasts`     | boolean  | no       | Default: false     |
| `warnUnreachable`        | boolean  | no       | Default: false     |
| `compact`                | boolean  | no       | Default: true      |

### Scenarios

| #   | Scenario                          | Params                             | Expected Output                                                            | Priority | Status   |
| --- | --------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- | -------- | -------- |
| 1   | Clean project (no errors)         | `{ path }`                         | `{ success: true, total: 0, errors: 0 }`                                   | P0       | complete |
| 2   | Project with type errors          | `{ path }`                         | `{ success: false, diagnostics: [{ severity: "error", ... }], errors: N }` | P0       | complete |
| 3   | No Python files                   | `{ path: "/tmp/empty" }`           | `{ success: true, total: 0 }`                                              | P0       | mocked   |
| 4   | Flag injection on `targets`       | `{ targets: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 5   | Flag injection on `configFile`    | `{ configFile: "--exec=evil" }`    | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 6   | Flag injection on `pythonVersion` | `{ pythonVersion: "--exec=evil" }` | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 7   | Flag injection on `exclude`       | `{ exclude: "--exec=evil" }`       | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 8   | Flag injection on `module`        | `{ module: "--exec=evil" }`        | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 9   | Flag injection on `package`       | `{ package: "--exec=evil" }`       | `assertNoFlagInjection` throws                                             | P0       | mocked   |
| 10  | Strict mode                       | `{ path, strict: true }`           | More diagnostics than non-strict                                           | P1       | mocked   |
| 11  | Check specific module             | `{ path, module: "mymodule" }`     | Diagnostics scoped to module                                               | P1       | mocked   |
| 12  | With warnings and notes           | `{ path }`                         | `{ warnings: N, notes: N }` counts separated                               | P1       | mocked   |
| 13  | Schema validation                 | all                                | Zod parse succeeds against `MypyResultSchema`                              | P0       | mocked   |

### Summary: 13 scenarios (P0: 9, P1: 3, P2: 0)

---

## Tool: `pip-audit`

### Implementation: `packages/server-python/src/tools/pip-audit.ts`

### Schema: `PipAuditResultSchema`

### Input params

| Param                  | Type            | Required | Notes             |
| ---------------------- | --------------- | -------- | ----------------- |
| `path`                 | string          | no       | Project root      |
| `requirements`         | string          | no       | Requirements file |
| `fix`                  | boolean         | no       | Default: false    |
| `dryRun`               | boolean         | no       | Default: false    |
| `strict`               | boolean         | no       | Default: false    |
| `noDeps`               | boolean         | no       | Default: false    |
| `skipEditable`         | boolean         | no       | Default: false    |
| `local`                | boolean         | no       | Default: false    |
| `ignoreVuln`           | string[]        | no       | IDs to suppress   |
| `vulnerabilityService` | "osv" \| "pypi" | no       | Service to query  |
| `indexUrl`             | string          | no       | Custom index URL  |
| `compact`              | boolean         | no       | Default: true     |

### Scenarios

| #   | Scenario                         | Params                                       | Expected Output                                        | Priority | Status |
| --- | -------------------------------- | -------------------------------------------- | ------------------------------------------------------ | -------- | ------ |
| 1   | No vulnerabilities               | `{ path }`                                   | `{ success: true, total: 0, vulnerabilities: [] }`     | P0       | mocked |
| 2   | Vulnerabilities found            | `{ path }`                                   | `{ success: false, total: N, vulnerabilities: [...] }` | P0       | mocked |
| 3   | pip-audit not installed          | `{ path }`                                   | Error thrown                                           | P0       | mocked |
| 4   | Flag injection on `requirements` | `{ requirements: "--exec=evil" }`            | `assertNoFlagInjection` throws                         | P0       | mocked |
| 5   | Flag injection on `indexUrl`     | `{ indexUrl: "--exec=evil" }`                | `assertNoFlagInjection` throws                         | P0       | mocked |
| 6   | Flag injection on `ignoreVuln`   | `{ ignoreVuln: ["--exec=evil"] }`            | `assertNoFlagInjection` throws                         | P0       | mocked |
| 7   | Audit from requirements file     | `{ path, requirements: "requirements.txt" }` | `{ success: true/false }`                              | P1       | mocked |
| 8   | Ignore specific vuln             | `{ path, ignoreVuln: ["PYSEC-2023-001"] }`   | That vuln excluded from results                        | P1       | mocked |
| 9   | Dry run fix                      | `{ path, fix: true, dryRun: true }`          | `{ success: true }` without modifying                  | P2       | mocked |
| 10  | Schema validation                | all                                          | Zod parse succeeds against `PipAuditResultSchema`      | P0       | mocked |

### Summary: 10 scenarios (P0: 7, P1: 2, P2: 1)

---

## Tool: `pip-install`

### Implementation: `packages/server-python/src/tools/pip-install.ts`

### Schema: `PipInstallSchema`

### Input params

| Param            | Type     | Required | Notes                 |
| ---------------- | -------- | -------- | --------------------- |
| `packages`       | string[] | no       | Packages to install   |
| `requirements`   | string   | no       | Requirements file     |
| `path`           | string   | no       | Working directory     |
| `dryRun`         | boolean  | no       | Default: false        |
| `upgrade`        | boolean  | no       | Default: false        |
| `noDeps`         | boolean  | no       | Default: false        |
| `pre`            | boolean  | no       | Default: false        |
| `forceReinstall` | boolean  | no       | Default: false        |
| `constraint`     | string   | no       | Constraints file      |
| `editable`       | string   | no       | Editable install path |
| `indexUrl`       | string   | no       | Package index URL     |
| `extraIndexUrl`  | string[] | no       | Extra index URLs      |
| `target`         | string   | no       | Target directory      |
| `report`         | string   | no       | JSON report path      |
| `compact`        | boolean  | no       | Default: true         |

### Scenarios

| #   | Scenario                              | Params                                      | Expected Output                                       | Priority | Status |
| --- | ------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | -------- | ------ |
| 1   | Install single package                | `{ packages: ["requests"] }`                | `{ success: true, installed: [...], total: N }`       | P0       | mocked |
| 2   | Already satisfied                     | `{ packages: ["pip"] }`                     | `{ success: true, alreadySatisfied: true, total: 0 }` | P0       | mocked |
| 3   | Package not found                     | `{ packages: ["nonexistent-pkg-zzz"] }`     | `{ success: false }`                                  | P0       | mocked |
| 4   | No packages or requirements specified | `{}`                                        | Falls back to `requirements.txt`                      | P0       | mocked |
| 5   | Flag injection on `packages`          | `{ packages: ["--exec=evil"] }`             | `assertNoFlagInjection` throws                        | P0       | mocked |
| 6   | Flag injection on `requirements`      | `{ requirements: "--exec=evil" }`           | `assertNoFlagInjection` throws                        | P0       | mocked |
| 7   | Flag injection on `constraint`        | `{ constraint: "--exec=evil" }`             | `assertNoFlagInjection` throws                        | P0       | mocked |
| 8   | Flag injection on `editable`          | `{ editable: "--exec=evil" }`               | `assertNoFlagInjection` throws                        | P0       | mocked |
| 9   | Flag injection on `indexUrl`          | `{ indexUrl: "--exec=evil" }`               | `assertNoFlagInjection` throws                        | P0       | mocked |
| 10  | Flag injection on `target`            | `{ target: "--exec=evil" }`                 | `assertNoFlagInjection` throws                        | P0       | mocked |
| 11  | Flag injection on `report`            | `{ report: "--exec=evil" }`                 | `assertNoFlagInjection` throws                        | P0       | mocked |
| 12  | Flag injection on `extraIndexUrl`     | `{ extraIndexUrl: ["--exec=evil"] }`        | `assertNoFlagInjection` throws                        | P0       | mocked |
| 13  | Dry run                               | `{ packages: ["requests"], dryRun: true }`  | `{ dryRun: true }`                                    | P1       | mocked |
| 14  | Upgrade mode                          | `{ packages: ["requests"], upgrade: true }` | `{ success: true }`                                   | P1       | mocked |
| 15  | Schema validation                     | all                                         | Zod parse succeeds against `PipInstallSchema`         | P0       | mocked |

### Summary: 15 scenarios (P0: 13, P1: 2, P2: 0)

---

## Tool: `pip-list`

### Implementation: `packages/server-python/src/tools/pip-list.ts`

### Schema: `PipListSchema`

### Input params

| Param             | Type     | Required | Notes               |
| ----------------- | -------- | -------- | ------------------- |
| `path`            | string   | no       | Working directory   |
| `local`           | boolean  | no       | Default: false      |
| `user`            | boolean  | no       | Default: false      |
| `notRequired`     | boolean  | no       | Default: false      |
| `editable`        | boolean  | no       | Default: false      |
| `excludeEditable` | boolean  | no       | Default: false      |
| `outdated`        | boolean  | no       | Default: false      |
| `exclude`         | string[] | no       | Packages to exclude |
| `compact`         | boolean  | no       | Default: true       |

### Scenarios

| #   | Scenario                    | Params                               | Expected Output                                | Priority | Status   |
| --- | --------------------------- | ------------------------------------ | ---------------------------------------------- | -------- | -------- |
| 1   | List all packages           | `{}`                                 | `{ success: true, packages: [...], total: N }` | P0       | complete |
| 2   | Empty environment           | `{}`                                 | `{ success: true, packages: [], total: 0 }`    | P0       | mocked   |
| 3   | Flag injection on `exclude` | `{ exclude: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                 | P0       | mocked   |
| 4   | Outdated packages           | `{ outdated: true }`                 | `packages[].latestVersion` populated           | P1       | mocked   |
| 5   | Exclude specific packages   | `{ exclude: ["pip", "setuptools"] }` | Those packages absent                          | P1       | mocked   |
| 6   | Not-required packages       | `{ notRequired: true }`              | Only top-level packages                        | P2       | mocked   |
| 7   | Schema validation           | all                                  | Zod parse succeeds against `PipListSchema`     | P0       | mocked   |

### Summary: 7 scenarios (P0: 4, P1: 2, P2: 1)

---

## Tool: `pip-show`

### Implementation: `packages/server-python/src/tools/pip-show.ts`

### Schema: `PipShowSchema`

### Input params

| Param      | Type     | Required | Notes               |
| ---------- | -------- | -------- | ------------------- |
| `package`  | string   | no       | Single package name |
| `packages` | string[] | no       | Multiple packages   |
| `path`     | string   | no       | Working directory   |
| `files`    | boolean  | no       | Default: false      |
| `compact`  | boolean  | no       | Default: true       |

### Scenarios

| #   | Scenario                     | Params                                | Expected Output                                           | Priority | Status   |
| --- | ---------------------------- | ------------------------------------- | --------------------------------------------------------- | -------- | -------- |
| 1   | Show single package          | `{ package: "pip" }`                  | `{ success: true, name: "pip", version: "..." }`          | P0       | complete |
| 2   | Package not found            | `{ package: "nonexistent-zzz" }`      | `{ success: false }` or error                             | P0       | mocked   |
| 3   | No package specified         | `{}`                                  | Error: "at least one package name is required"            | P0       | mocked   |
| 4   | Flag injection on `package`  | `{ package: "--exec=evil" }`          | `assertNoFlagInjection` throws                            | P0       | mocked   |
| 5   | Flag injection on `packages` | `{ packages: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                            | P0       | mocked   |
| 6   | Multiple packages            | `{ packages: ["pip", "setuptools"] }` | `{ packages: [{ name: "pip" }, { name: "setuptools" }] }` | P1       | mocked   |
| 7   | Show with files              | `{ package: "pip", files: true }`     | File listing included                                     | P2       | mocked   |
| 8   | Schema validation            | all                                   | Zod parse succeeds against `PipShowSchema`                | P0       | mocked   |

### Summary: 8 scenarios (P0: 6, P1: 1, P2: 1)

---

## Tool: `poetry`

### Implementation: `packages/server-python/src/tools/poetry.ts`

### Schema: `PoetryResultSchema`

### Input params

| Param           | Type               | Required | Notes                                                  |
| --------------- | ------------------ | -------- | ------------------------------------------------------ |
| `action`        | enum               | yes      | install/add/remove/show/build/update/lock/check/export |
| `packages`      | string[]           | no       | For add/remove/update                                  |
| `group`         | string             | no       | Dependency group                                       |
| `format`        | "sdist" \| "wheel" | no       | Build format                                           |
| `exportFormat`  | enum               | no       | Default: requirements.txt                              |
| `output`        | string             | no       | Export output file                                     |
| `withoutHashes` | boolean            | no       | Default: false                                         |
| `path`          | string             | no       | Working directory                                      |
| `dryRun`        | boolean            | no       | Default: false                                         |
| `outdated`      | boolean            | no       | Default: false                                         |
| `latest`        | boolean            | no       | Default: false                                         |
| `tree`          | boolean            | no       | Default: false                                         |
| `compact`       | boolean            | no       | Default: true                                          |

### Scenarios

| #   | Scenario                     | Params                                         | Expected Output                                      | Priority | Status |
| --- | ---------------------------- | ---------------------------------------------- | ---------------------------------------------------- | -------- | ------ |
| 1   | Install dependencies         | `{ action: "install", path }`                  | `{ success: true, action: "install" }`               | P0       | mocked |
| 2   | Show packages                | `{ action: "show", path }`                     | `{ success: true, action: "show", packages: [...] }` | P0       | mocked |
| 3   | No pyproject.toml            | `{ action: "install", path: "/tmp/empty" }`    | Error thrown                                         | P0       | mocked |
| 4   | Flag injection on `packages` | `{ action: "add", packages: ["--exec=evil"] }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 5   | Flag injection on `group`    | `{ action: "add", group: "--exec=evil" }`      | `assertNoFlagInjection` throws                       | P0       | mocked |
| 6   | Flag injection on `output`   | `{ action: "export", output: "--exec=evil" }`  | `assertNoFlagInjection` throws                       | P0       | mocked |
| 7   | Add package                  | `{ action: "add", packages: ["requests"] }`    | `{ success: true, action: "add" }`                   | P1       | mocked |
| 8   | Build wheel                  | `{ action: "build", format: "wheel" }`         | `{ success: true, artifacts: [...] }`                | P1       | mocked |
| 9   | Check project                | `{ action: "check" }`                          | `{ success: true, action: "check" }`                 | P1       | mocked |
| 10  | Dry run install              | `{ action: "install", dryRun: true }`          | `{ success: true }`                                  | P2       | mocked |
| 11  | Schema validation            | all                                            | Zod parse succeeds against `PoetryResultSchema`      | P0       | mocked |

### Summary: 11 scenarios (P0: 6, P1: 3, P2: 1)

---

## Tool: `pyenv`

### Implementation: `packages/server-python/src/tools/pyenv.ts`

### Schema: `PyenvResultSchema` (discriminated union by action)

### Input params

| Param          | Type    | Required | Notes                                                                    |
| -------------- | ------- | -------- | ------------------------------------------------------------------------ |
| `action`       | enum    | yes      | versions/version/install/installList/local/global/uninstall/which/rehash |
| `version`      | string  | no       | Python version string                                                    |
| `command`      | string  | no       | Command for `which`                                                      |
| `path`         | string  | no       | Working directory                                                        |
| `skipExisting` | boolean | no       | Default: false                                                           |
| `force`        | boolean | no       | Default: false                                                           |
| `unset`        | boolean | no       | Default: false                                                           |
| `compact`      | boolean | no       | Default: true                                                            |

### Scenarios

| #   | Scenario                    | Params                                          | Expected Output                                           | Priority | Status |
| --- | --------------------------- | ----------------------------------------------- | --------------------------------------------------------- | -------- | ------ |
| 1   | List versions               | `{ action: "versions" }`                        | `{ action: "versions", versions: [...], current: "..." }` | P0       | mocked |
| 2   | Get current version         | `{ action: "version" }`                         | `{ action: "version", current: "..." }`                   | P0       | mocked |
| 3   | pyenv not installed         | any                                             | Error thrown                                              | P0       | mocked |
| 4   | Install without version     | `{ action: "install" }`                         | Error: "version is required"                              | P0       | mocked |
| 5   | Uninstall without version   | `{ action: "uninstall" }`                       | Error: "version is required"                              | P0       | mocked |
| 6   | Which without command       | `{ action: "which" }`                           | Error: "command is required"                              | P0       | mocked |
| 7   | Flag injection on `version` | `{ action: "install", version: "--exec=evil" }` | `assertNoFlagInjection` throws                            | P0       | mocked |
| 8   | Flag injection on `command` | `{ action: "which", command: "--exec=evil" }`   | `assertNoFlagInjection` throws                            | P0       | mocked |
| 9   | Install list                | `{ action: "installList" }`                     | `{ action: "installList", availableVersions: [...] }`     | P1       | mocked |
| 10  | Local version               | `{ action: "local" }`                           | `{ action: "local", localVersion: "..." }`                | P1       | mocked |
| 11  | Rehash                      | `{ action: "rehash" }`                          | `{ action: "rehash", success: true }`                     | P2       | mocked |
| 12  | Schema validation           | all                                             | Zod parse succeeds against `PyenvResultSchema`            | P0       | mocked |

### Summary: 12 scenarios (P0: 8, P1: 2, P2: 1)

---

## Tool: `pytest`

### Implementation: `packages/server-python/src/tools/pytest.ts`

### Schema: `PytestResultSchema`

### Input params

| Param            | Type     | Required | Notes             |
| ---------------- | -------- | -------- | ----------------- |
| `path`           | string   | no       | Project root      |
| `targets`        | string[] | no       | Test files/dirs   |
| `markers`        | string   | no       | Marker expression |
| `keyword`        | string   | no       | Keyword filter    |
| `tracebackStyle` | enum     | no       | Default: short    |
| `verbose`        | boolean  | no       | Default: false    |
| `exitFirst`      | boolean  | no       | Default: false    |
| `maxFail`        | number   | no       | Max failures      |
| `collectOnly`    | boolean  | no       | Default: false    |
| `lastFailed`     | boolean  | no       | Default: false    |
| `noCapture`      | boolean  | no       | Default: false    |
| `coverage`       | string   | no       | Coverage source   |
| `parallel`       | number   | no       | xdist workers     |
| `configFile`     | string   | no       | Config file path  |
| `compact`        | boolean  | no       | Default: true     |

### Scenarios

| #   | Scenario                       | Params                               | Expected Output                                                   | Priority | Status   |
| --- | ------------------------------ | ------------------------------------ | ----------------------------------------------------------------- | -------- | -------- |
| 1   | All tests pass                 | `{ path }`                           | `{ success: true, passed: N, failed: 0, total: N }`               | P0       | complete |
| 2   | Tests with failures            | `{ path }`                           | `{ success: false, failures: [{ test: "...", message: "..." }] }` | P0       | complete |
| 3   | No tests found                 | `{ path: "/tmp/empty" }`             | `{ success: true, total: 0 }` or no-tests exit                    | P0       | mocked   |
| 4   | Flag injection on `targets`    | `{ targets: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 5   | Flag injection on `markers`    | `{ markers: "--exec=evil" }`         | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 6   | Flag injection on `keyword`    | `{ keyword: "--exec=evil" }`         | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 7   | Flag injection on `coverage`   | `{ coverage: "--exec=evil" }`        | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 8   | Flag injection on `configFile` | `{ configFile: "--exec=evil" }`      | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 9   | Exit on first failure          | `{ path, exitFirst: true }`          | `{ failed: 1 }` (stops at first)                                  | P1       | mocked   |
| 10  | Keyword filter                 | `{ path, keyword: "test_specific" }` | Only matching tests                                               | P1       | mocked   |
| 11  | Collect only                   | `{ path, collectOnly: true }`        | Test list without execution                                       | P1       | mocked   |
| 12  | With coverage                  | `{ path, coverage: "src" }`          | `{ success: true }` with coverage data                            | P2       | mocked   |
| 13  | Schema validation              | all                                  | Zod parse succeeds against `PytestResultSchema`                   | P0       | mocked   |

### Summary: 13 scenarios (P0: 9, P1: 3, P2: 1)

---

## Tool: `ruff-check`

### Implementation: `packages/server-python/src/tools/ruff.ts`

### Schema: `RuffResultSchema`

### Input params

| Param           | Type     | Required | Notes                  |
| --------------- | -------- | -------- | ---------------------- |
| `path`          | string   | no       | Project root           |
| `targets`       | string[] | no       | Default: ["."]         |
| `fix`           | boolean  | no       | Default: false         |
| `unsafeFixes`   | boolean  | no       | Default: false         |
| `diff`          | boolean  | no       | Default: false         |
| `preview`       | boolean  | no       | Default: false         |
| `lineLength`    | number   | no       | Line length override   |
| `noCache`       | boolean  | no       | Default: false         |
| `statistics`    | boolean  | no       | Default: false         |
| `select`        | string[] | no       | Rule codes to enable   |
| `ignore`        | string[] | no       | Rule codes to suppress |
| `config`        | string   | no       | Config file path       |
| `targetVersion` | string   | no       | Python version         |
| `exclude`       | string[] | no       | Exclude patterns       |
| `compact`       | boolean  | no       | Default: true          |

### Scenarios

| #   | Scenario                          | Params                             | Expected Output                                    | Priority | Status   |
| --- | --------------------------------- | ---------------------------------- | -------------------------------------------------- | -------- | -------- |
| 1   | Clean project                     | `{ path }`                         | `{ success: true, total: 0, fixable: 0 }`          | P0       | complete |
| 2   | Project with violations           | `{ path }`                         | `{ success: false, diagnostics: [...], total: N }` | P0       | complete |
| 3   | No Python files                   | `{ path: "/tmp/empty" }`           | `{ success: true, total: 0 }`                      | P0       | mocked   |
| 4   | Flag injection on `targets`       | `{ targets: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 5   | Flag injection on `config`        | `{ config: "--exec=evil" }`        | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 6   | Flag injection on `targetVersion` | `{ targetVersion: "--exec=evil" }` | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 7   | Flag injection on `select`        | `{ select: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 8   | Flag injection on `ignore`        | `{ ignore: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 9   | Flag injection on `exclude`       | `{ exclude: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 10  | Select specific rules             | `{ path, select: ["E", "F401"] }`  | Only selected rule violations                      | P1       | mocked   |
| 11  | Fix mode                          | `{ path, fix: true }`              | `{ fixedCount: N }`                                | P1       | mocked   |
| 12  | Fixable count                     | `{ path }`                         | `{ fixable: N }` correctly counted                 | P1       | mocked   |
| 13  | Schema validation                 | all                                | Zod parse succeeds against `RuffResultSchema`      | P0       | mocked   |

### Summary: 13 scenarios (P0: 9, P1: 3, P2: 0)

---

## Tool: `ruff-format`

### Implementation: `packages/server-python/src/tools/ruff-format.ts`

### Schema: `RuffFormatResultSchema`

### Input params

| Param           | Type                 | Required | Notes                 |
| --------------- | -------------------- | -------- | --------------------- |
| `patterns`      | string[]             | no       | Default: ["."]        |
| `check`         | boolean              | no       | Default: false        |
| `diff`          | boolean              | no       | Default: false        |
| `lineLength`    | number               | no       | Line length override  |
| `preview`       | boolean              | no       | Default: false        |
| `noCache`       | boolean              | no       | Default: false        |
| `isolated`      | boolean              | no       | Default: false        |
| `indentWidth`   | number               | no       | Indent width override |
| `path`          | string               | no       | Project root          |
| `config`        | string               | no       | Config file path      |
| `targetVersion` | string               | no       | Python version        |
| `exclude`       | string[]             | no       | Exclude patterns      |
| `range`         | string               | no       | Line range            |
| `quoteStyle`    | "single" \| "double" | no       | Quote style           |
| `compact`       | boolean              | no       | Default: true         |

### Scenarios

| #   | Scenario                          | Params                             | Expected Output                                     | Priority | Status |
| --- | --------------------------------- | ---------------------------------- | --------------------------------------------------- | -------- | ------ |
| 1   | Format clean project              | `{ path }`                         | `{ success: true, filesChanged: 0 }`                | P0       | mocked |
| 2   | Format with changes               | `{ path }`                         | `{ success: true, filesChanged: N, files: [...] }`  | P0       | mocked |
| 3   | Check mode with unformatted       | `{ path, check: true }`            | `{ success: false, checkMode: true }`               | P0       | mocked |
| 4   | No Python files                   | `{ path: "/tmp/empty" }`           | `{ success: true, filesChanged: 0 }`                | P0       | mocked |
| 5   | Flag injection on `patterns`      | `{ patterns: ["--exec=evil"] }`    | `assertNoFlagInjection` throws                      | P0       | mocked |
| 6   | Flag injection on `config`        | `{ config: "--exec=evil" }`        | `assertNoFlagInjection` throws                      | P0       | mocked |
| 7   | Flag injection on `targetVersion` | `{ targetVersion: "--exec=evil" }` | `assertNoFlagInjection` throws                      | P0       | mocked |
| 8   | Flag injection on `range`         | `{ range: "--exec=evil" }`         | `assertNoFlagInjection` throws                      | P0       | mocked |
| 9   | Flag injection on `exclude`       | `{ exclude: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                      | P0       | mocked |
| 10  | Custom line length                | `{ path, lineLength: 120 }`        | `{ success: true }`                                 | P1       | mocked |
| 11  | Diff mode                         | `{ path, diff: true }`             | `{ success: true }`                                 | P2       | mocked |
| 12  | Schema validation                 | all                                | Zod parse succeeds against `RuffFormatResultSchema` | P0       | mocked |

### Summary: 12 scenarios (P0: 9, P1: 1, P2: 1)

---

## Tool: `uv-install`

### Implementation: `packages/server-python/src/tools/uv-install.ts`

### Schema: `UvInstallSchema`

### Input params

| Param          | Type     | Required | Notes                 |
| -------------- | -------- | -------- | --------------------- |
| `path`         | string   | no       | Working directory     |
| `packages`     | string[] | no       | Packages to install   |
| `requirements` | string   | no       | Requirements file     |
| `dryRun`       | boolean  | no       | Default: false        |
| `verifyHashes` | boolean  | no       | Default: false        |
| `upgrade`      | boolean  | no       | Default: false        |
| `noDeps`       | boolean  | no       | Default: false        |
| `reinstall`    | boolean  | no       | Default: false        |
| `editable`     | string   | no       | Editable install path |
| `constraint`   | string   | no       | Constraints file      |
| `indexUrl`     | string   | no       | Package index URL     |
| `python`       | string   | no       | Python version        |
| `extras`       | string[] | no       | Package extras        |
| `compact`      | boolean  | no       | Default: true         |

### Scenarios

| #   | Scenario                         | Params                                                   | Expected Output                                 | Priority | Status |
| --- | -------------------------------- | -------------------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | Install packages                 | `{ packages: ["requests"] }`                             | `{ success: true, installed: [...], total: N }` | P0       | mocked |
| 2   | Already satisfied                | `{ packages: ["pip"] }`                                  | `{ success: true, alreadySatisfied: true }`     | P0       | mocked |
| 3   | uv not installed                 | `{ packages: ["requests"] }`                             | Error thrown                                    | P0       | mocked |
| 4   | Flag injection on `packages`     | `{ packages: ["--exec=evil"] }`                          | `assertNoFlagInjection` throws                  | P0       | mocked |
| 5   | Flag injection on `requirements` | `{ requirements: "--exec=evil" }`                        | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection on `editable`     | `{ editable: "--exec=evil" }`                            | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | Flag injection on `constraint`   | `{ constraint: "--exec=evil" }`                          | `assertNoFlagInjection` throws                  | P0       | mocked |
| 8   | Flag injection on `indexUrl`     | `{ indexUrl: "--exec=evil" }`                            | `assertNoFlagInjection` throws                  | P0       | mocked |
| 9   | Flag injection on `python`       | `{ python: "--exec=evil" }`                              | `assertNoFlagInjection` throws                  | P0       | mocked |
| 10  | Flag injection on `extras`       | `{ extras: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                  | P0       | mocked |
| 11  | Dry run                          | `{ packages: ["requests"], dryRun: true }`               | Preview without installing                      | P1       | mocked |
| 12  | Resolution conflict              | `{ packages: ["pkg1==1.0", "pkg2==2.0"] }` (conflicting) | `{ resolutionConflicts: [...] }`                | P1       | mocked |
| 13  | Schema validation                | all                                                      | Zod parse succeeds against `UvInstallSchema`    | P0       | mocked |

### Summary: 13 scenarios (P0: 10, P1: 2, P2: 0)

---

## Tool: `uv-run`

### Implementation: `packages/server-python/src/tools/uv-run.ts`

### Schema: `UvRunSchema`

### Input params

| Param          | Type     | Required | Notes                          |
| -------------- | -------- | -------- | ------------------------------ |
| `path`         | string   | no       | Working directory              |
| `command`      | string[] | yes      | Command and arguments (min: 1) |
| `isolated`     | boolean  | no       | Default: false                 |
| `module`       | boolean  | no       | Default: false                 |
| `noSync`       | boolean  | no       | Default: false                 |
| `locked`       | boolean  | no       | Default: false                 |
| `frozen`       | boolean  | no       | Default: false                 |
| `withPackages` | string[] | no       | Additional packages            |
| `python`       | string   | no       | Python version                 |
| `envFile`      | string   | no       | Env file path                  |
| `outputLimit`  | number   | no       | Default: 20000                 |
| `compact`      | boolean  | no       | Default: true                  |

### Scenarios

| #   | Scenario                         | Params                                                                         | Expected Output                                | Priority | Status |
| --- | -------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- | -------- | ------ |
| 1   | Run simple command               | `{ command: ["python", "-c", "print('hi')"] }`                                 | `{ exitCode: 0, success: true, stdout: "hi" }` | P0       | mocked |
| 2   | Command failure                  | `{ command: ["python", "-c", "raise Exception()"] }`                           | `{ exitCode: 1, success: false }`              | P0       | mocked |
| 3   | uv not installed                 | `{ command: ["python", "--version"] }`                                         | Error thrown                                   | P0       | mocked |
| 4   | Flag injection on `command[0]`   | `{ command: ["--exec=evil"] }`                                                 | `assertNoFlagInjection` throws                 | P0       | mocked |
| 5   | Flag injection on `python`       | `{ command: ["python"], python: "--exec=evil" }`                               | `assertNoFlagInjection` throws                 | P0       | mocked |
| 6   | Flag injection on `envFile`      | `{ command: ["python"], envFile: "--exec=evil" }`                              | `assertNoFlagInjection` throws                 | P0       | mocked |
| 7   | Flag injection on `withPackages` | `{ command: ["python"], withPackages: ["--exec=evil"] }`                       | `assertNoFlagInjection` throws                 | P0       | mocked |
| 8   | With injected packages           | `{ command: ["python", "-c", "import requests"], withPackages: ["requests"] }` | `{ exitCode: 0 }`                              | P1       | mocked |
| 9   | Output truncation                | `{ command: ["python", "-c", "print('x'*100000)"], outputLimit: 100 }`         | `{ truncated: true }`                          | P1       | mocked |
| 10  | Module mode                      | `{ command: ["http.server"], module: true }`                                   | Runs as `python -m http.server`                | P2       | mocked |
| 11  | Schema validation                | all                                                                            | Zod parse succeeds against `UvRunSchema`       | P0       | mocked |

### Summary: 11 scenarios (P0: 7, P1: 2, P2: 1)

---

## Grand Summary

| Tool        | P0      | P1     | P2     | Total   |
| ----------- | ------- | ------ | ------ | ------- |
| black       | 7       | 2      | 1      | 11      |
| conda       | 8       | 3      | 1      | 13      |
| mypy        | 9       | 3      | 0      | 13      |
| pip-audit   | 7       | 2      | 1      | 10      |
| pip-install | 13      | 2      | 0      | 15      |
| pip-list    | 4       | 2      | 1      | 7       |
| pip-show    | 6       | 1      | 1      | 8       |
| poetry      | 6       | 3      | 1      | 11      |
| pyenv       | 8       | 2      | 1      | 12      |
| pytest      | 9       | 3      | 1      | 13      |
| ruff-check  | 9       | 3      | 0      | 13      |
| ruff-format | 9       | 1      | 1      | 12      |
| uv-install  | 10      | 2      | 0      | 13      |
| uv-run      | 7       | 2      | 1      | 11      |
| **Total**   | **112** | **31** | **10** | **162** |
