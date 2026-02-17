# Smoke Test Scenarios: npm server (10 tools)

---

## Tool: `@paretools/npm` → `audit`

### Implementation: `packages/server-npm/src/tools/audit.ts`

### Schema: `NpmAuditSchema`

### Input params

| Param             | Type                                                  | Required | Notes                               |
| ----------------- | ----------------------------------------------------- | -------- | ----------------------------------- |
| `path`            | string                                                | no       | Project root path                   |
| `level`           | "info" \| "low" \| "moderate" \| "high" \| "critical" | no       | Minimum severity level              |
| `production`      | boolean                                               | no       | Audit only production deps          |
| `omit`            | ("dev" \| "optional" \| "peer")[]                     | no       | Dep groups to omit (npm only)       |
| `workspace`       | string                                                | no       | Workspace to audit (npm only)       |
| `fix`             | boolean                                               | no       | Auto-fix vulnerabilities            |
| `args`            | string[]                                              | no       | Escape-hatch flags                  |
| `packageLockOnly` | boolean                                               | no       | Audit from lockfile only (npm only) |
| `packageManager`  | "npm" \| "pnpm" \| "yarn"                             | no       | Override PM detection               |

### Scenarios

| #   | Scenario                           | Params                                | Expected Output                                           | Priority | Status |
| --- | ---------------------------------- | ------------------------------------- | --------------------------------------------------------- | -------- | ------ |
| 1   | Clean project, no vulnerabilities  | `{ path }`                            | `summary.total: 0`, `vulnerabilities: []`                 | P0       | mocked |
| 2   | Project with known vulnerabilities | `{ path }`                            | `vulnerabilities` array populated, `summary` counts match | P0       | mocked |
| 3   | Nonexistent path                   | `{ path: "/tmp/nonexistent" }`        | Error thrown                                              | P0       | mocked |
| 4   | No package.json in path            | `{ path: "/tmp/empty-dir" }`          | Error thrown                                              | P0       | mocked |
| 5   | Flag injection via workspace       | `{ path, workspace: "--exec=evil" }`  | `assertNoFlagInjection` throws                            | P0       | mocked |
| 6   | Flag injection via args            | `{ path, args: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                            | P0       | mocked |
| 7   | level: "high" filters low/moderate | `{ path, level: "high" }`             | Only high/critical vulns reported                         | P1       | mocked |
| 8   | production: true omits devDeps     | `{ path, production: true }`          | Only production dep vulns                                 | P1       | mocked |
| 9   | fix: true runs audit fix           | `{ path, fix: true }`                 | Returns fix counts                                        | P1       | mocked |
| 10  | packageLockOnly: true              | `{ path, packageLockOnly: true }`     | Succeeds without node_modules                             | P1       | mocked |
| 11  | pnpm auto-detection                | `{ path }` (pnpm project)             | `packageManager: "pnpm"`                                  | P1       | mocked |
| 12  | yarn auto-detection                | `{ path }` (yarn project)             | `packageManager: "yarn"`                                  | P1       | mocked |
| 13  | omit: ["dev", "optional"]          | `{ path, omit: ["dev", "optional"] }` | Dev/optional deps excluded                                | P2       | mocked |
| 14  | Schema validation                  | all                                   | Zod parse succeeds for every scenario                     | P0       | mocked |

---

## Tool: `@paretools/npm` → `info`

### Implementation: `packages/server-npm/src/tools/info.ts`

### Schema: `NpmInfoSchema`

### Input params

| Param            | Type                      | Required | Notes                          |
| ---------------- | ------------------------- | -------- | ------------------------------ |
| `package`        | string                    | yes      | Package name to look up        |
| `path`           | string                    | no       | Project root path              |
| `registry`       | string                    | no       | Registry URL                   |
| `field`          | string                    | no       | Query single field             |
| `workspace`      | string                    | no       | Workspace (npm only)           |
| `compact`        | boolean                   | no       | Compact output (default: true) |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection          |

### Scenarios

| #   | Scenario                     | Params                                             | Expected Output                                       | Priority | Status |
| --- | ---------------------------- | -------------------------------------------------- | ----------------------------------------------------- | -------- | ------ |
| 1   | Existing package (express)   | `{ package: "express" }`                           | `name: "express"`, `version`, `description` populated | P0       | mocked |
| 2   | Nonexistent package          | `{ package: "zzz-nonexistent-pkg-xyz" }`           | Error thrown                                          | P0       | mocked |
| 3   | Flag injection via package   | `{ package: "--exec=evil" }`                       | `assertNoFlagInjection` throws                        | P0       | mocked |
| 4   | Flag injection via registry  | `{ package: "express", registry: "--exec=evil" }`  | `assertNoFlagInjection` throws                        | P0       | mocked |
| 5   | Flag injection via field     | `{ package: "express", field: "--exec=evil" }`     | `assertNoFlagInjection` throws                        | P0       | mocked |
| 6   | Flag injection via workspace | `{ package: "express", workspace: "--exec=evil" }` | `assertNoFlagInjection` throws                        | P0       | mocked |
| 7   | Scoped package               | `{ package: "@types/node" }`                       | `name: "@types/node"`                                 | P1       | mocked |
| 8   | Specific version             | `{ package: "express@4.17.1" }`                    | `version: "4.17.1"`                                   | P1       | mocked |
| 9   | field: "engines"             | `{ package: "express", field: "engines" }`         | `engines` populated                                   | P1       | mocked |
| 10  | compact: false               | `{ package: "express", compact: false }`           | Full output format                                    | P2       | mocked |
| 11  | Schema validation            | all                                                | Zod parse succeeds                                    | P0       | mocked |

---

## Tool: `@paretools/npm` → `init`

### Implementation: `packages/server-npm/src/tools/init.ts`

### Schema: `NpmInitSchema`

### Input params

| Param            | Type                      | Required | Notes                           |
| ---------------- | ------------------------- | -------- | ------------------------------- |
| `path`           | string                    | no       | Directory to initialize         |
| `yes`            | boolean                   | no       | Non-interactive (default: true) |
| `scope`          | string                    | no       | npm scope                       |
| `force`          | boolean                   | no       | Overwrite existing              |
| `private`        | boolean                   | no       | Set private (yarn only)         |
| `license`        | string                    | no       | License field                   |
| `authorName`     | string                    | no       | Author name                     |
| `authorEmail`    | string                    | no       | Author email                    |
| `authorUrl`      | string                    | no       | Author URL                      |
| `version`        | string                    | no       | Override version                |
| `module`         | string                    | no       | Module entry point              |
| `workspace`      | string                    | no       | Workspace (npm only)            |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection           |

### Scenarios

| #   | Scenario                        | Params                                         | Expected Output                                            | Priority | Status |
| --- | ------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | -------- | ------ |
| 1   | Init in empty directory         | `{ path }`                                     | `success: true`, `packageName`, `version: "1.0.0"`, `path` | P0       | mocked |
| 2   | Init in nonexistent directory   | `{ path: "/tmp/nonexistent" }`                 | Error thrown                                               | P0       | mocked |
| 3   | Flag injection via scope        | `{ path, scope: "--exec=evil" }`               | `assertNoFlagInjection` throws                             | P0       | mocked |
| 4   | Flag injection via license      | `{ path, license: "--exec=evil" }`             | `assertNoFlagInjection` throws                             | P0       | mocked |
| 5   | Flag injection via authorName   | `{ path, authorName: "--exec=evil" }`          | `assertNoFlagInjection` throws                             | P0       | mocked |
| 6   | Flag injection via authorEmail  | `{ path, authorEmail: "--exec=evil" }`         | `assertNoFlagInjection` throws                             | P0       | mocked |
| 7   | Flag injection via authorUrl    | `{ path, authorUrl: "--exec=evil" }`           | `assertNoFlagInjection` throws                             | P0       | mocked |
| 8   | Flag injection via version      | `{ path, version: "--exec=evil" }`             | `assertNoFlagInjection` throws                             | P0       | mocked |
| 9   | Flag injection via module       | `{ path, module: "--exec=evil" }`              | `assertNoFlagInjection` throws                             | P0       | mocked |
| 10  | Flag injection via workspace    | `{ path, workspace: "--exec=evil" }`           | `assertNoFlagInjection` throws                             | P0       | mocked |
| 11  | scope: "@myorg"                 | `{ path, scope: "@myorg" }`                    | `packageName` starts with `@myorg/`                        | P1       | mocked |
| 12  | license and author fields       | `{ path, license: "MIT", authorName: "Test" }` | Reflected in generated package.json                        | P1       | mocked |
| 13  | force: true overwrites existing | `{ path, force: true }` (existing pkg.json)    | `success: true`                                            | P2       | mocked |
| 14  | Schema validation               | all                                            | Zod parse succeeds                                         | P0       | mocked |

---

## Tool: `@paretools/npm` → `install`

### Implementation: `packages/server-npm/src/tools/install.ts`

### Schema: `NpmInstallSchema`

### Input params

| Param            | Type                      | Required | Notes                                  |
| ---------------- | ------------------------- | -------- | -------------------------------------- |
| `path`           | string                    | no       | Project root path                      |
| `args`           | string[]                  | no       | Package names / extra args             |
| `ignoreScripts`  | boolean                   | no       | Skip lifecycle scripts (default: true) |
| `saveDev`        | boolean                   | no       | Install as devDep                      |
| `frozenLockfile` | boolean                   | no       | CI mode                                |
| `dryRun`         | boolean                   | no       | Preview only                           |
| `production`     | boolean                   | no       | Production deps only                   |
| `legacyPeerDeps` | boolean                   | no       | npm only                               |
| `force`          | boolean                   | no       | Force reinstall                        |
| `noAudit`        | boolean                   | no       | Skip audit                             |
| `exact`          | boolean                   | no       | Save exact versions                    |
| `global`         | boolean                   | no       | Global install                         |
| `registry`       | string                    | no       | Registry URL                           |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection                  |
| `filter`         | string                    | no       | pnpm filter                            |

### Scenarios

| #   | Scenario                           | Params                                      | Expected Output                              | Priority | Status |
| --- | ---------------------------------- | ------------------------------------------- | -------------------------------------------- | -------- | ------ |
| 1   | Install from existing lockfile     | `{ path }`                                  | `added >= 0`, `packages > 0`, `duration > 0` | P0       | mocked |
| 2   | Install specific package           | `{ path, args: ["lodash"] }`                | `added >= 1`                                 | P0       | mocked |
| 3   | No package.json                    | `{ path: "/tmp/empty-dir" }`                | Error thrown                                 | P0       | mocked |
| 4   | Flag injection via args            | `{ path, args: ["--exec=evil"] }`           | `assertNoFlagInjection` throws               | P0       | mocked |
| 5   | Flag injection via filter          | `{ path, filter: "--exec=evil" }`           | `assertNoFlagInjection` throws               | P0       | mocked |
| 6   | Flag injection via registry        | `{ path, registry: "--exec=evil" }`         | `assertNoFlagInjection` throws               | P0       | mocked |
| 7   | saveDev: true                      | `{ path, args: ["lodash"], saveDev: true }` | Package in devDependencies                   | P1       | mocked |
| 8   | frozenLockfile: true (npm uses ci) | `{ path, frozenLockfile: true }`            | Runs `npm ci`                                | P1       | mocked |
| 9   | dryRun: true                       | `{ path, dryRun: true }`                    | No actual install, preview output            | P1       | mocked |
| 10  | production: true                   | `{ path, production: true }`                | Omits devDeps                                | P1       | mocked |
| 11  | lockfileChanged detection          | `{ path, args: ["new-pkg"] }`               | `lockfileChanged: true`                      | P1       | mocked |
| 12  | ignoreScripts: false               | `{ path, ignoreScripts: false }`            | Lifecycle scripts run                        | P2       | mocked |
| 13  | exact: true                        | `{ path, args: ["lodash"], exact: true }`   | Exact version in package.json                | P2       | mocked |
| 14  | Schema validation                  | all                                         | Zod parse succeeds                           | P0       | mocked |

---

## Tool: `@paretools/npm` → `list`

### Implementation: `packages/server-npm/src/tools/list.ts`

### Schema: `NpmListSchema`

### Input params

| Param            | Type                      | Required | Notes                          |
| ---------------- | ------------------------- | -------- | ------------------------------ |
| `path`           | string                    | no       | Project root path              |
| `depth`          | number                    | no       | Dep tree depth (default: 0)    |
| `packages`       | string[]                  | no       | Specific packages to check     |
| `workspace`      | string                    | no       | Workspace (npm only)           |
| `args`           | string[]                  | no       | Escape-hatch flags             |
| `compact`        | boolean                   | no       | Compact output (default: true) |
| `production`     | boolean                   | no       | Production deps only           |
| `all`            | boolean                   | no       | Complete dep tree              |
| `long`           | boolean                   | no       | Extended info                  |
| `global`         | boolean                   | no       | Global packages                |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection          |
| `filter`         | string                    | no       | pnpm filter                    |

### Scenarios

| #   | Scenario                     | Params                                | Expected Output                                          | Priority | Status |
| --- | ---------------------------- | ------------------------------------- | -------------------------------------------------------- | -------- | ------ |
| 1   | List top-level deps          | `{ path }`                            | `name`, `version`, `dependencies` populated, `total > 0` | P0       | mocked |
| 2   | Empty project (no deps)      | `{ path }`                            | `dependencies` empty/undefined, `total: 0`               | P0       | mocked |
| 3   | No package.json              | `{ path: "/tmp/empty" }`              | Error thrown                                             | P0       | mocked |
| 4   | Flag injection via filter    | `{ path, filter: "--exec=evil" }`     | `assertNoFlagInjection` throws                           | P0       | mocked |
| 5   | Flag injection via workspace | `{ path, workspace: "--exec=evil" }`  | `assertNoFlagInjection` throws                           | P0       | mocked |
| 6   | Flag injection via packages  | `{ path, packages: ["--exec=evil"] }` | `assertNoFlagInjection` throws                           | P0       | mocked |
| 7   | Flag injection via args      | `{ path, args: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                           | P0       | mocked |
| 8   | depth: 1                     | `{ path, depth: 1 }`                  | Nested deps one level deep                               | P1       | mocked |
| 9   | packages filter              | `{ path, packages: ["lodash"] }`      | Only lodash in output                                    | P1       | mocked |
| 10  | production: true             | `{ path, production: true }`          | No devDeps in output                                     | P1       | mocked |
| 11  | global: true                 | `{ global: true }`                    | Global packages listed                                   | P1       | mocked |
| 12  | pnpm list parsing            | `{ path }` (pnpm project)             | Correct multi-workspace parse                            | P1       | mocked |
| 13  | yarn list parsing            | `{ path }` (yarn project)             | Correct yarn tree parse                                  | P1       | mocked |
| 14  | compact: false               | `{ path, compact: false }`            | Full output format                                       | P2       | mocked |
| 15  | Schema validation            | all                                   | Zod parse succeeds                                       | P0       | mocked |

---

## Tool: `@paretools/npm` → `nvm`

### Implementation: `packages/server-npm/src/tools/nvm.ts`

### Schema: `NvmResultSchema`

### Input params

| Param           | Type                                                      | Required | Notes                                |
| --------------- | --------------------------------------------------------- | -------- | ------------------------------------ |
| `action`        | "list" \| "current" \| "ls-remote" \| "exec" \| "version" | yes      | NVM action                           |
| `path`          | string                                                    | no       | Working directory                    |
| `version`       | string                                                    | no       | Node version for exec/version        |
| `command`       | string                                                    | no       | Command for exec                     |
| `args`          | string[]                                                  | no       | Args for exec command                |
| `majorVersions` | number                                                    | no       | Limit ls-remote results (default: 4) |

### Scenarios

| #   | Scenario                          | Params                                                                      | Expected Output                         | Priority | Status |
| --- | --------------------------------- | --------------------------------------------------------------------------- | --------------------------------------- | -------- | ------ |
| 1   | action: "current"                 | `{ action: "current" }`                                                     | `current` populated with version string | P0       | mocked |
| 2   | action: "list"                    | `{ action: "list" }`                                                        | `versions` array populated              | P0       | mocked |
| 3   | nvm not installed                 | `{ action: "current" }`                                                     | Error: "nvm is not available"           | P0       | mocked |
| 4   | Flag injection via version        | `{ action: "exec", version: "--exec=evil", command: "node" }`               | `assertNoFlagInjection` throws          | P0       | mocked |
| 5   | Flag injection via command        | `{ action: "exec", version: "20", command: "--exec=evil" }`                 | `assertNoFlagInjection` throws          | P0       | mocked |
| 6   | Flag injection via args           | `{ action: "exec", version: "20", command: "node", args: ["--exec=evil"] }` | `assertNoFlagInjection` throws          | P0       | mocked |
| 7   | action: "exec" without version    | `{ action: "exec", command: "node" }`                                       | Error: "'version' is required"          | P0       | mocked |
| 8   | action: "exec" without command    | `{ action: "exec", version: "20" }`                                         | Error: "'command' is required"          | P0       | mocked |
| 9   | action: "ls-remote"               | `{ action: "ls-remote" }`                                                   | `versions` array with remote versions   | P1       | mocked |
| 10  | action: "version"                 | `{ action: "version", version: "20" }`                                      | `resolvedVersion` populated             | P1       | mocked |
| 11  | action: "version" without version | `{ action: "version" }`                                                     | Error: "'version' is required"          | P1       | mocked |
| 12  | majorVersions: 2                  | `{ action: "ls-remote", majorVersions: 2 }`                                 | Fewer results returned                  | P2       | mocked |
| 13  | .nvmrc detection                  | `{ action: "current", path }` (dir with .nvmrc)                             | `required` populated                    | P2       | mocked |
| 14  | Schema validation                 | all                                                                         | Zod parse succeeds                      | P0       | mocked |

---

## Tool: `@paretools/npm` → `outdated`

### Implementation: `packages/server-npm/src/tools/outdated.ts`

### Schema: `NpmOutdatedSchema`

### Input params

| Param            | Type                      | Required | Notes                         |
| ---------------- | ------------------------- | -------- | ----------------------------- |
| `path`           | string                    | no       | Project root path             |
| `packages`       | string[]                  | no       | Specific packages to check    |
| `workspace`      | string                    | no       | Workspace (npm only)          |
| `args`           | string[]                  | no       | Escape-hatch flags            |
| `production`     | boolean                   | no       | Production deps only          |
| `all`            | boolean                   | no       | All nested outdated           |
| `long`           | boolean                   | no       | Extended info                 |
| `compatible`     | boolean                   | no       | Semver-compatible only (pnpm) |
| `devOnly`        | boolean                   | no       | Dev deps only (pnpm)          |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection         |
| `filter`         | string                    | no       | pnpm filter                   |

### Scenarios

| #   | Scenario                                 | Params                                | Expected Output                              | Priority | Status |
| --- | ---------------------------------------- | ------------------------------------- | -------------------------------------------- | -------- | ------ |
| 1   | Project with outdated deps               | `{ path }`                            | `packages` array populated, `total > 0`      | P0       | mocked |
| 2   | All deps up to date                      | `{ path }`                            | `packages: []`, `total: 0`                   | P0       | mocked |
| 3   | No package.json                          | `{ path: "/tmp/empty" }`              | Error or empty result                        | P0       | mocked |
| 4   | Flag injection via filter                | `{ path, filter: "--exec=evil" }`     | `assertNoFlagInjection` throws               | P0       | mocked |
| 5   | Flag injection via workspace             | `{ path, workspace: "--exec=evil" }`  | `assertNoFlagInjection` throws               | P0       | mocked |
| 6   | Flag injection via packages              | `{ path, packages: ["--exec=evil"] }` | `assertNoFlagInjection` throws               | P0       | mocked |
| 7   | Flag injection via args                  | `{ path, args: ["--exec=evil"] }`     | `assertNoFlagInjection` throws               | P0       | mocked |
| 8   | Outdated entry has current/wanted/latest | `{ path }`                            | Each entry has `current`, `wanted`, `latest` | P1       | mocked |
| 9   | production: true                         | `{ path, production: true }`          | Only production outdated deps                | P1       | mocked |
| 10  | packages filter                          | `{ path, packages: ["lodash"] }`      | Only lodash in results                       | P1       | mocked |
| 11  | long: true                               | `{ path, long: true }`                | Homepage populated                           | P2       | mocked |
| 12  | Schema validation                        | all                                   | Zod parse succeeds                           | P0       | mocked |

---

## Tool: `@paretools/npm` → `run`

### Implementation: `packages/server-npm/src/tools/run.ts`

### Schema: `NpmRunSchema`

### Input params

| Param            | Type                      | Required | Notes                        |
| ---------------- | ------------------------- | -------- | ---------------------------- |
| `path`           | string                    | no       | Project root path            |
| `script`         | string                    | yes      | Script name                  |
| `args`           | string[]                  | no       | Extra args passed after `--` |
| `workspace`      | string \| string[]        | no       | Workspace target(s)          |
| `scriptShell`    | string                    | no       | Override script shell        |
| `ifPresent`      | boolean                   | no       | Skip if script missing       |
| `recursive`      | boolean                   | no       | All workspaces               |
| `ignoreScripts`  | boolean                   | no       | Skip hooks                   |
| `silent`         | boolean                   | no       | Strip log chrome             |
| `parallel`       | boolean                   | no       | Parallel (pnpm)              |
| `stream`         | boolean                   | no       | Stream output (pnpm)         |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection        |
| `filter`         | string                    | no       | pnpm filter                  |

### Scenarios

| #   | Scenario                            | Params                                                  | Expected Output                                    | Priority | Status |
| --- | ----------------------------------- | ------------------------------------------------------- | -------------------------------------------------- | -------- | ------ |
| 1   | Run existing script (build)         | `{ path, script: "build" }`                             | `success: true`, `exitCode: 0`, `stdout` populated | P0       | mocked |
| 2   | Run nonexistent script              | `{ path, script: "nonexistent" }`                       | `success: false`, `exitCode > 0`                   | P0       | mocked |
| 3   | No package.json                     | `{ path: "/tmp/empty", script: "test" }`                | Error thrown                                       | P0       | mocked |
| 4   | Flag injection via script           | `{ path, script: "--exec=evil" }`                       | `assertNoFlagInjection` throws                     | P0       | mocked |
| 5   | Flag injection via args             | `{ path, script: "build", args: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                     | P0       | mocked |
| 6   | Flag injection via filter           | `{ path, script: "build", filter: "--exec=evil" }`      | `assertNoFlagInjection` throws                     | P0       | mocked |
| 7   | Flag injection via scriptShell      | `{ path, script: "build", scriptShell: "--exec=evil" }` | `assertNoFlagInjection` throws                     | P0       | mocked |
| 8   | Flag injection via workspace        | `{ path, script: "build", workspace: "--exec=evil" }`   | `assertNoFlagInjection` throws                     | P0       | mocked |
| 9   | Script timeout                      | `{ path, script: "hang" }`                              | `timedOut: true`, `exitCode: 124`                  | P1       | mocked |
| 10  | ifPresent: true with missing script | `{ path, script: "nonexistent", ifPresent: true }`      | `success: true` or no error                        | P1       | mocked |
| 11  | Script with args                    | `{ path, script: "test", args: ["--watch"] }`           | Args passed to script                              | P1       | mocked |
| 12  | recursive: true                     | `{ path, script: "build", recursive: true }`            | Runs in all workspaces                             | P2       | mocked |
| 13  | silent: true                        | `{ path, script: "build", silent: true }`               | Cleaner output                                     | P2       | mocked |
| 14  | Schema validation                   | all                                                     | Zod parse succeeds                                 | P0       | mocked |

---

## Tool: `@paretools/npm` → `search`

### Implementation: `packages/server-npm/src/tools/search.ts`

### Schema: `NpmSearchSchema`

### Input params

| Param          | Type    | Required | Notes                          |
| -------------- | ------- | -------- | ------------------------------ |
| `query`        | string  | yes      | Search query                   |
| `path`         | string  | no       | Project root path              |
| `limit`        | number  | no       | Max results (default: 20)      |
| `exclude`      | string  | no       | Exclude matching text          |
| `registry`     | string  | no       | Registry URL                   |
| `searchopts`   | string  | no       | Advanced search opts           |
| `compact`      | boolean | no       | Compact output (default: true) |
| `preferOnline` | boolean | no       | Bypass cache                   |

### Scenarios

| #   | Scenario                                   | Params                                            | Expected Output                                 | Priority | Status |
| --- | ------------------------------------------ | ------------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | Search for "express"                       | `{ query: "express" }`                            | `packages` array populated, `total > 0`         | P0       | mocked |
| 2   | Search with no results                     | `{ query: "zzz-nonexistent-pkg-xyz-123" }`        | `packages: []`, `total: 0`                      | P0       | mocked |
| 3   | Flag injection via query                   | `{ query: "--exec=evil" }`                        | `assertNoFlagInjection` throws                  | P0       | mocked |
| 4   | Flag injection via exclude                 | `{ query: "express", exclude: "--exec=evil" }`    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 5   | Flag injection via registry                | `{ query: "express", registry: "--exec=evil" }`   | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection via searchopts              | `{ query: "express", searchopts: "--exec=evil" }` | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | limit: 5                                   | `{ query: "express", limit: 5 }`                  | `packages.length <= 5`                          | P1       | mocked |
| 8   | exclude filter                             | `{ query: "express", exclude: "generator" }`      | No "generator" in results                       | P1       | mocked |
| 9   | Package entry has name/version/description | `{ query: "lodash" }`                             | Each entry has `name`, `version`, `description` | P1       | mocked |
| 10  | compact: false                             | `{ query: "express", compact: false }`            | Full output format                              | P2       | mocked |
| 11  | Schema validation                          | all                                               | Zod parse succeeds                              | P0       | mocked |

---

## Tool: `@paretools/npm` → `test`

### Implementation: `packages/server-npm/src/tools/test.ts`

### Schema: `NpmTestSchema`

### Input params

| Param            | Type                      | Required | Notes                 |
| ---------------- | ------------------------- | -------- | --------------------- |
| `path`           | string                    | no       | Project root path     |
| `args`           | string[]                  | no       | Extra args after `--` |
| `workspace`      | string \| string[]        | no       | Workspace target(s)   |
| `ifPresent`      | boolean                   | no       | Skip if missing       |
| `recursive`      | boolean                   | no       | All workspaces        |
| `ignoreScripts`  | boolean                   | no       | Skip hooks            |
| `silent`         | boolean                   | no       | Strip log chrome      |
| `parallel`       | boolean                   | no       | Parallel (pnpm)       |
| `stream`         | boolean                   | no       | Stream output (pnpm)  |
| `packageManager` | "npm" \| "pnpm" \| "yarn" | no       | Override PM detection |
| `filter`         | string                    | no       | pnpm filter           |

### Scenarios

| #   | Scenario                     | Params                               | Expected Output                                  | Priority | Status |
| --- | ---------------------------- | ------------------------------------ | ------------------------------------------------ | -------- | ------ |
| 1   | Tests pass                   | `{ path }`                           | `success: true`, `exitCode: 0`                   | P0       | mocked |
| 2   | Tests fail                   | `{ path }`                           | `success: false`, `exitCode > 0`                 | P0       | mocked |
| 3   | No test script defined       | `{ path }`                           | `success: false`, stderr mentions missing script | P0       | mocked |
| 4   | Flag injection via args      | `{ path, args: ["--exec=evil"] }`    | `assertNoFlagInjection` throws                   | P0       | mocked |
| 5   | Flag injection via filter    | `{ path, filter: "--exec=evil" }`    | `assertNoFlagInjection` throws                   | P0       | mocked |
| 6   | Flag injection via workspace | `{ path, workspace: "--exec=evil" }` | `assertNoFlagInjection` throws                   | P0       | mocked |
| 7   | testResults parsed (vitest)  | `{ path }` (vitest project)          | `testResults` has `passed`, `failed`, `total`    | P1       | mocked |
| 8   | testResults parsed (jest)    | `{ path }` (jest project)            | `testResults` populated                          | P1       | mocked |
| 9   | Test timeout                 | `{ path }` (hanging test)            | `timedOut: true`, `exitCode: 124`                | P1       | mocked |
| 10  | ifPresent: true              | `{ path, ifPresent: true }`          | No error if script missing                       | P1       | mocked |
| 11  | recursive: true              | `{ path, recursive: true }`          | Tests run in all workspaces                      | P2       | mocked |
| 12  | Schema validation            | all                                  | Zod parse succeeds                               | P0       | mocked |

---

## Grand Summary

| Tool      | P0     | P1     | P2     | Total   |
| --------- | ------ | ------ | ------ | ------- |
| audit     | 6      | 4      | 1      | 11      |
| info      | 6      | 3      | 1      | 10      |
| init      | 10     | 2      | 1      | 13      |
| install   | 6      | 4      | 2      | 12      |
| list      | 7      | 4      | 1      | 12      |
| nvm       | 7      | 3      | 2      | 12      |
| outdated  | 6      | 3      | 1      | 10      |
| run       | 8      | 3      | 2      | 13      |
| search    | 6      | 3      | 1      | 10      |
| test      | 6      | 4      | 1      | 11      |
| **Total** | **68** | **33** | **13** | **114** |
