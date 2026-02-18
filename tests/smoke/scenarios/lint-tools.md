# Smoke Test Scenarios: lint server (9 tools)

---

## Tool: `@paretools/lint` → `lint`

### Implementation: `packages/server-lint/src/tools/lint.ts`

### Schema: `LintResultSchema`

### Input params

| Param         | Type                                                     | Required | Notes                          |
| ------------- | -------------------------------------------------------- | -------- | ------------------------------ |
| `path`        | string                                                   | no       | Project root path              |
| `patterns`    | string[]                                                 | no       | File patterns (default: ["."]) |
| `fix`         | boolean                                                  | no       | Auto-fix (default: false)      |
| `quiet`       | boolean                                                  | no       | Errors only                    |
| `noIgnore`    | boolean                                                  | no       | Disable ignore patterns        |
| `cache`       | boolean                                                  | no       | Cache results                  |
| `fixDryRun`   | boolean                                                  | no       | Preview fixes                  |
| `maxWarnings` | number                                                   | no       | Warning limit                  |
| `config`      | string                                                   | no       | Config file path               |
| `fixType`     | ("problem" \| "suggestion" \| "layout" \| "directive")[] | no       | Fix types                      |
| `rule`        | string[]                                                 | no       | Rule overrides                 |
| `compact`     | boolean                                                  | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                               | Params                                | Expected Output                        | Priority | Status   |
| --- | -------------------------------------- | ------------------------------------- | -------------------------------------- | -------- | -------- |
| 1   | Clean project, no lint errors          | `{ path }`                            | `total: 0`, `errors: 0`, `warnings: 0` | P0       | complete |
| 2   | Project with lint errors               | `{ path }`                            | `diagnostics` populated, `errors > 0`  | P0       | complete |
| 3   | ESLint not installed                   | `{ path: "/tmp/empty" }`              | Error thrown                           | P0       | mocked   |
| 4   | Flag injection via patterns            | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws         | P0       | mocked   |
| 5   | Flag injection via config              | `{ path, config: "--exec=evil" }`     | `assertNoFlagInjection` throws         | P0       | mocked   |
| 6   | Flag injection via rule                | `{ path, rule: ["--exec=evil"] }`     | `assertNoFlagInjection` throws         | P0       | mocked   |
| 7   | Diagnostic has file/line/rule/severity | `{ path }` (with errors)              | Each diagnostic has required fields    | P1       | mocked   |
| 8   | fix: true applies fixes                | `{ path, fix: true }`                 | Files modified, fixable counts reduced | P1       | mocked   |
| 9   | quiet: true suppresses warnings        | `{ path, quiet: true }`               | `warnings: 0`                          | P1       | mocked   |
| 10  | maxWarnings: 0                         | `{ path, maxWarnings: 0 }`            | Fails if any warnings                  | P1       | mocked   |
| 11  | cache: true                            | `{ path, cache: true }`               | Faster subsequent runs                 | P2       | mocked   |
| 12  | fixDryRun: true                        | `{ path, fixDryRun: true }`           | Preview fixes without writing          | P2       | mocked   |
| 13  | Schema validation                      | all                                   | Zod parse succeeds                     | P0       | mocked   |

---

## Tool: `@paretools/lint` → `format-check`

### Implementation: `packages/server-lint/src/tools/format-check.ts`

### Schema: `FormatCheckResultSchema`

### Input params

| Param           | Type                                              | Required | Notes                          |
| --------------- | ------------------------------------------------- | -------- | ------------------------------ |
| `path`          | string                                            | no       | Project root path              |
| `patterns`      | string[]                                          | no       | File patterns (default: ["."]) |
| `ignoreUnknown` | boolean                                           | no       | Ignore unparseable files       |
| `cache`         | boolean                                           | no       | Cache results                  |
| `noConfig`      | boolean                                           | no       | No config lookup               |
| `logLevel`      | "silent" \| "error" \| "warn" \| "log" \| "debug" | no       | Log level                      |
| `config`        | string                                            | no       | Config file path               |
| `ignorePath`    | string                                            | no       | Custom ignore file             |
| `parser`        | string                                            | no       | Force parser                   |
| `tabWidth`      | number                                            | no       | Spaces per indent              |
| `singleQuote`   | boolean                                           | no       | Use single quotes              |
| `trailingComma` | "all" \| "es5" \| "none"                          | no       | Trailing commas                |
| `printWidth`    | number                                            | no       | Line length                    |
| `compact`       | boolean                                           | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                      | Params                                 | Expected Output                                    | Priority | Status   |
| --- | ----------------------------- | -------------------------------------- | -------------------------------------------------- | -------- | -------- |
| 1   | All files formatted           | `{ path }`                             | `formatted: true`, `files: []`, `total: 0`         | P0       | complete |
| 2   | Unformatted files exist       | `{ path }`                             | `formatted: false`, `files` populated, `total > 0` | P0       | complete |
| 3   | Prettier not installed        | `{ path: "/tmp/empty" }`               | Error thrown                                       | P0       | mocked   |
| 4   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }`  | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 5   | Flag injection via config     | `{ path, config: "--exec=evil" }`      | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 6   | Flag injection via ignorePath | `{ path, ignorePath: "--exec=evil" }`  | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 7   | Flag injection via parser     | `{ path, parser: "--exec=evil" }`      | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 8   | ignoreUnknown: true           | `{ path, ignoreUnknown: true }`        | Unknown files skipped                              | P1       | mocked   |
| 9   | Custom config path            | `{ path, config: ".prettierrc.json" }` | Uses specified config                              | P1       | mocked   |
| 10  | tabWidth: 4                   | `{ path, tabWidth: 4 }`                | Checks with 4-space indent                         | P2       | mocked   |
| 11  | singleQuote: true             | `{ path, singleQuote: true }`          | Checks for single quotes                           | P2       | mocked   |
| 12  | Schema validation             | all                                    | Zod parse succeeds                                 | P0       | mocked   |

---

## Tool: `@paretools/lint` → `prettier-format`

### Implementation: `packages/server-lint/src/tools/prettier-format.ts`

### Schema: `FormatWriteResultSchema`

### Input params

| Param           | Type                                              | Required | Notes                          |
| --------------- | ------------------------------------------------- | -------- | ------------------------------ |
| `path`          | string                                            | no       | Project root path              |
| `patterns`      | string[]                                          | no       | File patterns (default: ["."]) |
| `ignoreUnknown` | boolean                                           | no       | Ignore unparseable files       |
| `cache`         | boolean                                           | no       | Cache results                  |
| `noConfig`      | boolean                                           | no       | No config lookup               |
| `logLevel`      | "silent" \| "error" \| "warn" \| "log" \| "debug" | no       | Log level                      |
| `endOfLine`     | "lf" \| "crlf" \| "cr" \| "auto"                  | no       | Line ending                    |
| `tabWidth`      | number                                            | no       | Spaces per indent              |
| `singleQuote`   | boolean                                           | no       | Use single quotes              |
| `trailingComma` | "all" \| "es5" \| "none"                          | no       | Trailing commas                |
| `printWidth`    | number                                            | no       | Line length                    |
| `config`        | string                                            | no       | Config file path               |
| `compact`       | boolean                                           | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                            | Params                                | Expected Output                                        | Priority | Status |
| --- | ----------------------------------- | ------------------------------------- | ------------------------------------------------------ | -------- | ------ |
| 1   | Format files (some need formatting) | `{ path }`                            | `success: true`, `filesChanged > 0`, `files` populated | P0       | mocked |
| 2   | All already formatted               | `{ path }`                            | `success: true`, `filesChanged: 0`                     | P0       | mocked |
| 3   | Prettier not installed              | `{ path: "/tmp/empty" }`              | Error thrown                                           | P0       | mocked |
| 4   | Flag injection via patterns         | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws                         | P0       | mocked |
| 5   | Flag injection via config           | `{ path, config: "--exec=evil" }`     | `assertNoFlagInjection` throws                         | P0       | mocked |
| 6   | ignoreUnknown: true                 | `{ path, ignoreUnknown: true }`       | Unknown files skipped                                  | P1       | mocked |
| 7   | endOfLine: "lf"                     | `{ path, endOfLine: "lf" }`           | LF line endings enforced                               | P1       | mocked |
| 8   | cache: true                         | `{ path, cache: true }`               | Faster subsequent runs                                 | P2       | mocked |
| 9   | Schema validation                   | all                                   | Zod parse succeeds                                     | P0       | mocked |

---

## Tool: `@paretools/lint` → `biome-check`

### Implementation: `packages/server-lint/src/tools/biome-check.ts`

### Schema: `LintResultSchema`

### Input params

| Param              | Type                        | Required | Notes                          |
| ------------------ | --------------------------- | -------- | ------------------------------ |
| `path`             | string                      | no       | Project root path              |
| `patterns`         | string[]                    | no       | File patterns (default: ["."]) |
| `apply`            | boolean                     | no       | Apply safe fixes               |
| `applyUnsafe`      | boolean                     | no       | Apply unsafe fixes             |
| `diagnosticLevel`  | "info" \| "warn" \| "error" | no       | Min diagnostic level           |
| `changed`          | boolean                     | no       | VCS-changed files only         |
| `staged`           | boolean                     | no       | Staged files only              |
| `since`            | string                      | no       | Changed since git ref          |
| `configPath`       | string                      | no       | Biome config path              |
| `linterEnabled`    | boolean                     | no       | Enable/disable linter          |
| `formatterEnabled` | boolean                     | no       | Enable/disable formatter       |
| `maxDiagnostics`   | number                      | no       | Max diagnostics                |
| `skip`             | string[]                    | no       | Rules to skip                  |
| `compact`          | boolean                     | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                      | Params                                | Expected Output                        | Priority | Status |
| --- | ----------------------------- | ------------------------------------- | -------------------------------------- | -------- | ------ |
| 1   | Clean project                 | `{ path }`                            | `total: 0`, `errors: 0`, `warnings: 0` | P0       | mocked |
| 2   | Project with issues           | `{ path }`                            | `diagnostics` populated, `total > 0`   | P0       | mocked |
| 3   | Biome not installed           | `{ path: "/tmp/empty" }`              | Error thrown                           | P0       | mocked |
| 4   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws         | P0       | mocked |
| 5   | Flag injection via since      | `{ path, since: "--exec=evil" }`      | `assertNoFlagInjection` throws         | P0       | mocked |
| 6   | Flag injection via configPath | `{ path, configPath: "--exec=evil" }` | `assertNoFlagInjection` throws         | P0       | mocked |
| 7   | Flag injection via skip       | `{ path, skip: ["--exec=evil"] }`     | `assertNoFlagInjection` throws         | P0       | mocked |
| 8   | apply: true fixes issues      | `{ path, apply: true }`               | Issues fixed, counts reduced           | P1       | mocked |
| 9   | diagnosticLevel: "error"      | `{ path, diagnosticLevel: "error" }`  | Only errors reported                   | P1       | mocked |
| 10  | changed: true                 | `{ path, changed: true }`             | Only VCS-changed files checked         | P1       | mocked |
| 11  | linterEnabled: false          | `{ path, linterEnabled: false }`      | Only format checks                     | P1       | mocked |
| 12  | maxDiagnostics: 5             | `{ path, maxDiagnostics: 5 }`         | At most 5 diagnostics                  | P2       | mocked |
| 13  | Schema validation             | all                                   | Zod parse succeeds                     | P0       | mocked |

---

## Tool: `@paretools/lint` → `biome-format`

### Implementation: `packages/server-lint/src/tools/biome-format.ts`

### Schema: `FormatWriteResultSchema`

### Input params

| Param         | Type                   | Required | Notes                          |
| ------------- | ---------------------- | -------- | ------------------------------ |
| `path`        | string                 | no       | Project root path              |
| `patterns`    | string[]               | no       | File patterns (default: ["."]) |
| `changed`     | boolean                | no       | VCS-changed files only         |
| `staged`      | boolean                | no       | Staged files only              |
| `since`       | string                 | no       | Changed since git ref          |
| `configPath`  | string                 | no       | Biome config path              |
| `indentStyle` | "tab" \| "space"       | no       | Indent style                   |
| `lineWidth`   | number                 | no       | Line width                     |
| `quoteStyle`  | "single" \| "double"   | no       | Quote style                    |
| `semicolons`  | "always" \| "asNeeded" | no       | Semicolon style                |
| `lineEnding`  | "lf" \| "crlf" \| "cr" | no       | Line ending                    |
| `compact`     | boolean                | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                      | Params                                | Expected Output                     | Priority | Status |
| --- | ----------------------------- | ------------------------------------- | ----------------------------------- | -------- | ------ |
| 1   | Format files (changes needed) | `{ path }`                            | `success: true`, `filesChanged > 0` | P0       | mocked |
| 2   | All already formatted         | `{ path }`                            | `success: true`, `filesChanged: 0`  | P0       | mocked |
| 3   | Biome not installed           | `{ path: "/tmp/empty" }`              | Error thrown                        | P0       | mocked |
| 4   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws      | P0       | mocked |
| 5   | Flag injection via since      | `{ path, since: "--exec=evil" }`      | `assertNoFlagInjection` throws      | P0       | mocked |
| 6   | Flag injection via configPath | `{ path, configPath: "--exec=evil" }` | `assertNoFlagInjection` throws      | P0       | mocked |
| 7   | indentStyle: "tab"            | `{ path, indentStyle: "tab" }`        | Tab indentation applied             | P1       | mocked |
| 8   | quoteStyle: "single"          | `{ path, quoteStyle: "single" }`      | Single quotes applied               | P1       | mocked |
| 9   | changed: true                 | `{ path, changed: true }`             | Only VCS-changed files formatted    | P1       | mocked |
| 10  | lineWidth: 120                | `{ path, lineWidth: 120 }`            | 120 char line width                 | P2       | mocked |
| 11  | Schema validation             | all                                   | Zod parse succeeds                  | P0       | mocked |

---

## Tool: `@paretools/lint` → `oxlint`

### Implementation: `packages/server-lint/src/tools/oxlint.ts`

### Schema: `LintResultSchema`

### Input params

| Param            | Type     | Required | Notes                          |
| ---------------- | -------- | -------- | ------------------------------ |
| `path`           | string   | no       | Project root path              |
| `patterns`       | string[] | no       | File patterns (default: ["."]) |
| `fix`            | boolean  | no       | Auto-fix                       |
| `quiet`          | boolean  | no       | Errors only                    |
| `fixSuggestions` | boolean  | no       | Apply suggestions              |
| `threads`        | number   | no       | Parallel threads               |
| `noIgnore`       | boolean  | no       | Disable ignores                |
| `config`         | string   | no       | Config file path               |
| `deny`           | string[] | no       | Rules to error                 |
| `warn`           | string[] | no       | Rules to warn                  |
| `allow`          | string[] | no       | Rules to disable               |
| `plugins`        | string[] | no       | Plugin categories              |
| `tsconfig`       | string   | no       | tsconfig for type rules        |
| `ignorePath`     | string   | no       | Alternate ignore file          |
| `compact`        | boolean  | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                      | Params                                | Expected Output                | Priority | Status |
| --- | ----------------------------- | ------------------------------------- | ------------------------------ | -------- | ------ |
| 1   | Clean project                 | `{ path }`                            | `total: 0`, `errors: 0`        | P0       | mocked |
| 2   | Project with issues           | `{ path }`                            | `diagnostics` populated        | P0       | mocked |
| 3   | Oxlint not installed          | `{ path: "/tmp/empty" }`              | Error thrown                   | P0       | mocked |
| 4   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws | P0       | mocked |
| 5   | Flag injection via config     | `{ path, config: "--exec=evil" }`     | `assertNoFlagInjection` throws | P0       | mocked |
| 6   | Flag injection via deny       | `{ path, deny: ["--exec=evil"] }`     | `assertNoFlagInjection` throws | P0       | mocked |
| 7   | Flag injection via warn       | `{ path, warn: ["--exec=evil"] }`     | `assertNoFlagInjection` throws | P0       | mocked |
| 8   | Flag injection via allow      | `{ path, allow: ["--exec=evil"] }`    | `assertNoFlagInjection` throws | P0       | mocked |
| 9   | Flag injection via plugins    | `{ path, plugins: ["--exec=evil"] }`  | `assertNoFlagInjection` throws | P0       | mocked |
| 10  | Flag injection via tsconfig   | `{ path, tsconfig: "--exec=evil" }`   | `assertNoFlagInjection` throws | P0       | mocked |
| 11  | Flag injection via ignorePath | `{ path, ignorePath: "--exec=evil" }` | `assertNoFlagInjection` throws | P0       | mocked |
| 12  | fix: true                     | `{ path, fix: true }`                 | Issues fixed                   | P1       | mocked |
| 13  | quiet: true                   | `{ path, quiet: true }`               | Only errors reported           | P1       | mocked |
| 14  | deny specific rules           | `{ path, deny: ["no-console"] }`      | Rule enforced as error         | P1       | mocked |
| 15  | Schema validation             | all                                   | Zod parse succeeds             | P0       | mocked |

---

## Tool: `@paretools/lint` → `hadolint`

### Implementation: `packages/server-lint/src/tools/hadolint.ts`

### Schema: `LintResultSchema`

### Input params

| Param               | Type                                                            | Required | Notes                                      |
| ------------------- | --------------------------------------------------------------- | -------- | ------------------------------------------ |
| `path`              | string                                                          | no       | Project root path                          |
| `patterns`          | string[]                                                        | no       | Dockerfile paths (default: ["Dockerfile"]) |
| `trustedRegistries` | string[]                                                        | no       | Trusted registries                         |
| `ignoreRules`       | string[]                                                        | no       | Rules to ignore                            |
| `failureThreshold`  | "error" \| "warning" \| "info" \| "style" \| "ignore" \| "none" | no       | Min severity for nonzero exit              |
| `noFail`            | boolean                                                         | no       | Always exit 0                              |
| `strictLabels`      | boolean                                                         | no       | Enforce label schema                       |
| `verbose`           | boolean                                                         | no       | Verbose output                             |
| `config`            | string                                                          | no       | Config file path                           |
| `requireLabel`      | string[]                                                        | no       | Required labels                            |
| `shell`             | string                                                          | no       | Default shell                              |
| `errorRules`        | string[]                                                        | no       | Rules as errors                            |
| `warningRules`      | string[]                                                        | no       | Rules as warnings                          |
| `infoRules`         | string[]                                                        | no       | Rules as info                              |
| `compact`           | boolean                                                         | no       | Compact output (default: true)             |

### Scenarios

| #   | Scenario                             | Params                                         | Expected Output                      | Priority | Status |
| --- | ------------------------------------ | ---------------------------------------------- | ------------------------------------ | -------- | ------ |
| 1   | Clean Dockerfile                     | `{ path }`                                     | `total: 0`, `errors: 0`              | P0       | mocked |
| 2   | Dockerfile with issues               | `{ path }`                                     | `diagnostics` populated, `total > 0` | P0       | mocked |
| 3   | Hadolint not installed               | `{ path: "/tmp/empty" }`                       | Error thrown                         | P0       | mocked |
| 4   | No Dockerfile found                  | `{ path }` (no Dockerfile)                     | Error thrown                         | P0       | mocked |
| 5   | Flag injection via patterns          | `{ path, patterns: ["--exec=evil"] }`          | `assertNoFlagInjection` throws       | P0       | mocked |
| 6   | Flag injection via trustedRegistries | `{ path, trustedRegistries: ["--exec=evil"] }` | `assertNoFlagInjection` throws       | P0       | mocked |
| 7   | Flag injection via ignoreRules       | `{ path, ignoreRules: ["--exec=evil"] }`       | `assertNoFlagInjection` throws       | P0       | mocked |
| 8   | Flag injection via config            | `{ path, config: "--exec=evil" }`              | `assertNoFlagInjection` throws       | P0       | mocked |
| 9   | Flag injection via requireLabel      | `{ path, requireLabel: ["--exec=evil"] }`      | `assertNoFlagInjection` throws       | P0       | mocked |
| 10  | Flag injection via shell             | `{ path, shell: "--exec=evil" }`               | `assertNoFlagInjection` throws       | P0       | mocked |
| 11  | Flag injection via errorRules        | `{ path, errorRules: ["--exec=evil"] }`        | `assertNoFlagInjection` throws       | P0       | mocked |
| 12  | Flag injection via warningRules      | `{ path, warningRules: ["--exec=evil"] }`      | `assertNoFlagInjection` throws       | P0       | mocked |
| 13  | Flag injection via infoRules         | `{ path, infoRules: ["--exec=evil"] }`         | `assertNoFlagInjection` throws       | P0       | mocked |
| 14  | ignoreRules: ["DL3008"]              | `{ path, ignoreRules: ["DL3008"] }`            | DL3008 not in output                 | P1       | mocked |
| 15  | failureThreshold: "error"            | `{ path, failureThreshold: "error" }`          | Only errors cause nonzero exit       | P1       | mocked |
| 16  | noFail: true                         | `{ path, noFail: true }`                       | Exit 0 always                        | P2       | mocked |
| 17  | Schema validation                    | all                                            | Zod parse succeeds                   | P0       | mocked |

---

## Tool: `@paretools/lint` → `shellcheck`

### Implementation: `packages/server-lint/src/tools/shellcheck.ts`

### Schema: `LintResultSchema`

### Input params

| Param             | Type                                      | Required | Notes                             |
| ----------------- | ----------------------------------------- | -------- | --------------------------------- |
| `path`            | string                                    | no       | Project root path                 |
| `patterns`        | string[]                                  | no       | File paths/globs (default: ["."]) |
| `severity`        | "error" \| "warning" \| "info" \| "style" | no       | Min severity                      |
| `shell`           | "sh" \| "bash" \| "dash" \| "ksh"         | no       | Shell dialect                     |
| `externalSources` | boolean                                   | no       | Follow source statements          |
| `checkSourced`    | boolean                                   | no       | Check sourced files               |
| `norc`            | boolean                                   | no       | Disable .shellcheckrc             |
| `exclude`         | string[]                                  | no       | Codes to exclude                  |
| `enable`          | string[]                                  | no       | Optional checks to enable         |
| `include`         | string[]                                  | no       | Only these codes                  |
| `rcfile`          | string                                    | no       | Custom config file                |
| `sourcePath`      | string                                    | no       | Source resolution path            |
| `compact`         | boolean                                   | no       | Compact output (default: true)    |

### Scenarios

| #   | Scenario                      | Params                                                        | Expected Output                | Priority | Status |
| --- | ----------------------------- | ------------------------------------------------------------- | ------------------------------ | -------- | ------ |
| 1   | Clean shell script            | `{ path, patterns: ["script.sh"] }`                           | `total: 0`, `errors: 0`        | P0       | mocked |
| 2   | Script with issues            | `{ path, patterns: ["bad.sh"] }`                              | `diagnostics` populated        | P0       | mocked |
| 3   | No shell files found          | `{ path }` (no .sh files)                                     | `total: 0`, `filesChecked: 0`  | P0       | mocked |
| 4   | ShellCheck not installed      | `{ path, patterns: ["script.sh"] }`                           | Error thrown                   | P0       | mocked |
| 5   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws | P0       | mocked |
| 6   | Flag injection via exclude    | `{ path, patterns: ["script.sh"], exclude: ["--exec=evil"] }` | `assertNoFlagInjection` throws | P0       | mocked |
| 7   | Flag injection via enable     | `{ path, patterns: ["script.sh"], enable: ["--exec=evil"] }`  | `assertNoFlagInjection` throws | P0       | mocked |
| 8   | Flag injection via include    | `{ path, patterns: ["script.sh"], include: ["--exec=evil"] }` | `assertNoFlagInjection` throws | P0       | mocked |
| 9   | Flag injection via rcfile     | `{ path, rcfile: "--exec=evil" }`                             | `assertNoFlagInjection` throws | P0       | mocked |
| 10  | Flag injection via sourcePath | `{ path, sourcePath: "--exec=evil" }`                         | `assertNoFlagInjection` throws | P0       | mocked |
| 11  | severity: "error"             | `{ path, patterns: ["bad.sh"], severity: "error" }`           | Only errors reported           | P1       | mocked |
| 12  | shell: "bash"                 | `{ path, patterns: ["script.sh"], shell: "bash" }`            | Bash dialect used              | P1       | mocked |
| 13  | exclude: ["SC2086"]           | `{ path, patterns: ["script.sh"], exclude: ["SC2086"] }`      | SC2086 not reported            | P1       | mocked |
| 14  | Directory expansion           | `{ path, patterns: ["."] }`                                   | Auto-expands to \*.sh files    | P1       | mocked |
| 15  | Schema validation             | all                                                           | Zod parse succeeds             | P0       | mocked |

---

## Tool: `@paretools/lint` → `stylelint`

### Implementation: `packages/server-lint/src/tools/stylelint.ts`

### Schema: `LintResultSchema`

### Input params

| Param                    | Type     | Required | Notes                          |
| ------------------------ | -------- | -------- | ------------------------------ |
| `path`                   | string   | no       | Project root path              |
| `patterns`               | string[] | no       | File patterns (default: ["."]) |
| `fix`                    | boolean  | no       | Auto-fix (default: false)      |
| `quiet`                  | boolean  | no       | Errors only                    |
| `allowEmptyInput`        | boolean  | no       | No error on empty match        |
| `cache`                  | boolean  | no       | Cache results                  |
| `reportNeedlessDisables` | boolean  | no       | Report unnecessary disables    |
| `ignoreDisables`         | boolean  | no       | Ignore disable comments        |
| `maxWarnings`            | number   | no       | Warning limit                  |
| `config`                 | string   | no       | Config file path               |
| `ignorePath`             | string   | no       | Custom ignore file             |
| `compact`                | boolean  | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                      | Params                                                         | Expected Output                | Priority | Status |
| --- | ----------------------------- | -------------------------------------------------------------- | ------------------------------ | -------- | ------ |
| 1   | Clean CSS files               | `{ path, patterns: ["*.css"] }`                                | `total: 0`, `errors: 0`        | P0       | mocked |
| 2   | CSS with issues               | `{ path, patterns: ["*.css"] }`                                | `diagnostics` populated        | P0       | mocked |
| 3   | Stylelint not installed       | `{ path: "/tmp/empty" }`                                       | Error thrown                   | P0       | mocked |
| 4   | Flag injection via patterns   | `{ path, patterns: ["--exec=evil"] }`                          | `assertNoFlagInjection` throws | P0       | mocked |
| 5   | Flag injection via config     | `{ path, config: "--exec=evil" }`                              | `assertNoFlagInjection` throws | P0       | mocked |
| 6   | Flag injection via ignorePath | `{ path, ignorePath: "--exec=evil" }`                          | `assertNoFlagInjection` throws | P0       | mocked |
| 7   | fix: true                     | `{ path, patterns: ["*.css"], fix: true }`                     | Issues fixed                   | P1       | mocked |
| 8   | quiet: true                   | `{ path, patterns: ["*.css"], quiet: true }`                   | Warnings suppressed            | P1       | mocked |
| 9   | allowEmptyInput: true         | `{ path, patterns: ["*.nonexistent"], allowEmptyInput: true }` | No error on empty              | P1       | mocked |
| 10  | maxWarnings: 0                | `{ path, patterns: ["*.css"], maxWarnings: 0 }`                | Fails on warnings              | P1       | mocked |
| 11  | cache: true                   | `{ path, patterns: ["*.css"], cache: true }`                   | Faster subsequent runs         | P2       | mocked |
| 12  | Schema validation             | all                                                            | Zod parse succeeds             | P0       | mocked |

---

## Grand Summary

| Tool            | P0     | P1     | P2    | Total   |
| --------------- | ------ | ------ | ----- | ------- |
| lint            | 5      | 4      | 2     | 11      |
| format-check    | 7      | 2      | 2     | 11      |
| prettier-format | 5      | 2      | 1     | 8       |
| biome-check     | 7      | 4      | 1     | 12      |
| biome-format    | 6      | 3      | 1     | 10      |
| oxlint          | 11     | 3      | 0     | 14      |
| hadolint        | 13     | 2      | 1     | 16      |
| shellcheck      | 10     | 4      | 0     | 14      |
| stylelint       | 6      | 4      | 1     | 11      |
| **Total**       | **70** | **28** | **9** | **107** |
