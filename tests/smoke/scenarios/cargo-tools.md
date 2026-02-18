# Smoke Test Scenarios: Cargo Server (12 tools)

---

## Tool: `add`

### Implementation: `packages/server-cargo/src/tools/add.ts`

### Schema: `CargoAddResultSchema`

### Input params

| Param               | Type     | Required | Notes              |
| ------------------- | -------- | -------- | ------------------ |
| `path`              | string   | no       | Project root       |
| `packages`          | string[] | yes      | Packages to add    |
| `dev`               | boolean  | no       | Default: false     |
| `features`          | string[] | no       | Features to enable |
| `dryRun`            | boolean  | no       | Default: false     |
| `build`             | boolean  | no       | Default: false     |
| `optional`          | boolean  | no       | Default: false     |
| `noDefaultFeatures` | boolean  | no       | Default: false     |
| `package`           | string   | no       | Workspace package  |
| `rename`            | string   | no       | Rename dependency  |
| `registry`          | string   | no       | Registry name      |
| `sourcePath`        | string   | no       | Local crate path   |
| `git`               | string   | no       | Git source URL     |
| `branch`            | string   | no       | Git branch         |
| `tag`               | string   | no       | Git tag            |
| `rev`               | string   | no       | Git revision       |
| `locked`            | boolean  | no       | Default: false     |
| `frozen`            | boolean  | no       | Default: false     |
| `offline`           | boolean  | no       | Default: false     |
| `compact`           | boolean  | no       | Default: true      |

### Scenarios

| #   | Scenario                           | Params                                                       | Expected Output                                                 | Priority | Status   |
| --- | ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | -------- | -------- |
| 1   | Add single crate                   | `{ path, packages: ["serde"] }`                              | `{ success: true, added: [{ name: "serde", version: "..." }] }` | P0       | complete |
| 2   | Add nonexistent crate              | `{ path, packages: ["nonexistent-crate-zzz"] }`              | `{ success: false, error: "..." }`                              | P0       | complete |
| 3   | No Cargo.toml                      | `{ path: "/tmp/empty", packages: ["serde"] }`                | Error thrown                                                    | P0       | complete |
| 4   | Flag injection on `packages`       | `{ packages: ["--exec=evil"] }`                              | `assertNoFlagInjection` throws                                  | P0       | complete |
| 5   | Flag injection on `features`       | `{ packages: ["serde"], features: ["--exec=evil"] }`         | `assertNoFlagInjection` throws                                  | P0       | complete |
| 6   | Flag injection on `package`        | `{ packages: ["serde"], package: "--exec=evil" }`            | `assertNoFlagInjection` throws                                  | P0       | complete |
| 7   | Flag injection on `rename`         | `{ packages: ["serde"], rename: "--exec=evil" }`             | `assertNoFlagInjection` throws                                  | P0       | complete |
| 8   | Flag injection on `registry`       | `{ packages: ["serde"], registry: "--exec=evil" }`           | `assertNoFlagInjection` throws                                  | P0       | complete |
| 9   | Flag injection on `sourcePath`     | `{ packages: ["serde"], sourcePath: "--exec=evil" }`         | `assertNoFlagInjection` throws                                  | P0       | complete |
| 10  | Flag injection on `git`            | `{ packages: ["serde"], git: "--exec=evil" }`                | `assertNoFlagInjection` throws                                  | P0       | complete |
| 11  | Flag injection on `branch`         | `{ packages: ["serde"], git: "url", branch: "--exec=evil" }` | `assertNoFlagInjection` throws                                  | P0       | complete |
| 12  | Mutual exclusion: sourcePath + git | `{ packages: ["serde"], sourcePath: "./local", git: "url" }` | Error: "mutually exclusive"                                     | P0       | complete |
| 13  | branch/tag/rev without git         | `{ packages: ["serde"], branch: "main" }`                    | Error: "require git source"                                     | P0       | complete |
| 14  | Add as dev dependency              | `{ path, packages: ["serde"], dev: true }`                   | `{ dependencyType: "dev" }`                                     | P1       | complete |
| 15  | Add with features                  | `{ path, packages: ["serde"], features: ["derive"] }`        | `{ added: [{ featuresActivated: ["derive"] }] }`                | P1       | complete |
| 16  | Dry run                            | `{ path, packages: ["serde"], dryRun: true }`                | `{ dryRun: true }`                                              | P1       | complete |
| 17  | Schema validation                  | all                                                          | Zod parse succeeds against `CargoAddResultSchema`               | P0       | complete |

### Summary: 17 scenarios (P0: 14, P1: 3, P2: 0)

---

## Tool: `audit`

### Implementation: `packages/server-cargo/src/tools/audit.ts`

### Schema: `CargoAuditResultSchema`

### Input params

| Param        | Type            | Required | Notes                    |
| ------------ | --------------- | -------- | ------------------------ |
| `path`       | string          | no       | Project root             |
| `fix`        | boolean         | no       | Default: false           |
| `mode`       | "deps" \| "bin" | no       | Default: "deps"          |
| `binPath`    | string          | no       | Binary path for mode=bin |
| `noFetch`    | boolean         | no       | Default: false           |
| `ignore`     | string[]        | no       | Advisory IDs to ignore   |
| `deny`       | enum            | no       | Min severity for error   |
| `targetArch` | string          | no       | Target architecture      |
| `targetOs`   | string          | no       | Target OS                |
| `file`       | string          | no       | Cargo.lock path          |
| `db`         | string          | no       | Advisory DB path         |
| `url`        | string          | no       | Advisory DB URL          |
| `compact`    | boolean         | no       | Default: true            |

### Scenarios

| #   | Scenario                       | Params                                         | Expected Output                                                     | Priority | Status   |
| --- | ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------- | -------- | -------- |
| 1   | No vulnerabilities             | `{ path }`                                     | `{ success: true, vulnerabilities: [], summary: { total: 0 } }`     | P0       | complete |
| 2   | Vulnerabilities found          | `{ path }`                                     | `{ success: false, vulnerabilities: [...], summary: { total: N } }` | P0       | complete |
| 3   | cargo-audit not installed      | `{ path }`                                     | Error thrown                                                        | P0       | complete |
| 4   | No Cargo.lock                  | `{ path: "/tmp/empty" }`                       | Error thrown                                                        | P0       | complete |
| 5   | Flag injection on `targetArch` | `{ targetArch: "--exec=evil" }`                | `assertNoFlagInjection` throws                                      | P0       | complete |
| 6   | Flag injection on `targetOs`   | `{ targetOs: "--exec=evil" }`                  | `assertNoFlagInjection` throws                                      | P0       | complete |
| 7   | Flag injection on `file`       | `{ file: "--exec=evil" }`                      | `assertNoFlagInjection` throws                                      | P0       | complete |
| 8   | Flag injection on `db`         | `{ db: "--exec=evil" }`                        | `assertNoFlagInjection` throws                                      | P0       | complete |
| 9   | Flag injection on `binPath`    | `{ mode: "bin", binPath: "--exec=evil" }`      | `assertNoFlagInjection` throws                                      | P0       | complete |
| 10  | Flag injection on `ignore`     | `{ ignore: ["--exec=evil"] }`                  | `assertNoFlagInjection` throws                                      | P0       | complete |
| 11  | Mode=bin without binPath       | `{ mode: "bin" }`                              | Error: "binPath is required"                                        | P0       | complete |
| 12  | Mode=bin with fix              | `{ mode: "bin", binPath: "./bin", fix: true }` | Error: "fix mode is not supported"                                  | P0       | complete |
| 13  | Ignore advisory                | `{ path, ignore: ["RUSTSEC-2022-0090"] }`      | That advisory excluded                                              | P1       | complete |
| 14  | No-fetch (offline)             | `{ path, noFetch: true }`                      | Uses cached DB                                                      | P1       | complete |
| 15  | Fix mode                       | `{ path, fix: true }`                          | `{ fixesApplied: N }`                                               | P2       | complete |
| 16  | Schema validation              | all                                            | Zod parse succeeds against `CargoAuditResultSchema`                 | P0       | complete |

### Summary: 16 scenarios (P0: 13, P1: 2, P2: 1)

---

## Tool: `build`

### Implementation: `packages/server-cargo/src/tools/build.ts`

### Schema: `CargoBuildResultSchema`

### Input params

| Param               | Type                        | Required | Notes                |
| ------------------- | --------------------------- | -------- | -------------------- |
| `path`              | string                      | no       | Project root         |
| `release`           | boolean                     | no       | Default: false       |
| `keepGoing`         | boolean                     | no       | Default: false       |
| `package`           | string                      | no       | Workspace package    |
| `features`          | string[]                    | no       | Features to activate |
| `allFeatures`       | boolean                     | no       | Default: false       |
| `noDefaultFeatures` | boolean                     | no       | Default: false       |
| `target`            | string                      | no       | Target triple        |
| `profile`           | string                      | no       | Custom profile       |
| `timings`           | boolean \| "html" \| "json" | no       | Timing report        |
| `locked`            | boolean                     | no       | Default: false       |
| `frozen`            | boolean                     | no       | Default: false       |
| `offline`           | boolean                     | no       | Default: false       |
| `manifestPath`      | string                      | no       | Cargo.toml path      |
| `compact`           | boolean                     | no       | Default: true        |

### Scenarios

| #   | Scenario                         | Params                            | Expected Output                                     | Priority | Status   |
| --- | -------------------------------- | --------------------------------- | --------------------------------------------------- | -------- | -------- |
| 1   | Successful build                 | `{ path }`                        | `{ success: true, errors: 0, warnings: N }`         | P0       | complete |
| 2   | Build with errors                | `{ path }` (broken project)       | `{ success: false, diagnostics: [...], errors: N }` | P0       | complete |
| 3   | No Cargo.toml                    | `{ path: "/tmp/empty" }`          | Error thrown                                        | P0       | complete |
| 4   | Flag injection on `package`      | `{ package: "--exec=evil" }`      | `assertNoFlagInjection` throws                      | P0       | complete |
| 5   | Flag injection on `target`       | `{ target: "--exec=evil" }`       | `assertNoFlagInjection` throws                      | P0       | complete |
| 6   | Flag injection on `profile`      | `{ profile: "--exec=evil" }`      | `assertNoFlagInjection` throws                      | P0       | complete |
| 7   | Flag injection on `manifestPath` | `{ manifestPath: "--exec=evil" }` | `assertNoFlagInjection` throws                      | P0       | complete |
| 8   | Flag injection on `features`     | `{ features: ["--exec=evil"] }`   | `assertNoFlagInjection` throws                      | P0       | complete |
| 9   | Release build                    | `{ path, release: true }`         | `{ success: true }`                                 | P1       | complete |
| 10  | Build with features              | `{ path, features: ["serde"] }`   | `{ success: true }`                                 | P1       | complete |
| 11  | Keep going on errors             | `{ path, keepGoing: true }`       | Collects all diagnostics                            | P1       | complete |
| 12  | Build with timings               | `{ path, timings: true }`         | `{ timings: { generated: true } }`                  | P2       | complete |
| 13  | Schema validation                | all                               | Zod parse succeeds against `CargoBuildResultSchema` | P0       | complete |

### Summary: 13 scenarios (P0: 8, P1: 3, P2: 1)

---

## Tool: `check`

### Implementation: `packages/server-cargo/src/tools/check.ts`

### Schema: `CargoCheckResultSchema`

### Input params

| Param               | Type     | Required | Notes                |
| ------------------- | -------- | -------- | -------------------- |
| `path`              | string   | no       | Project root         |
| `package`           | string   | no       | Workspace package    |
| `keepGoing`         | boolean  | no       | Default: false       |
| `allTargets`        | boolean  | no       | Default: false       |
| `release`           | boolean  | no       | Default: false       |
| `workspace`         | boolean  | no       | Default: false       |
| `features`          | string[] | no       | Features to activate |
| `allFeatures`       | boolean  | no       | Default: false       |
| `noDefaultFeatures` | boolean  | no       | Default: false       |
| `target`            | string   | no       | Target triple        |
| `locked`            | boolean  | no       | Default: false       |
| `frozen`            | boolean  | no       | Default: false       |
| `offline`           | boolean  | no       | Default: false       |
| `compact`           | boolean  | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                          | Expected Output                                     | Priority | Status   |
| --- | ---------------------------- | ------------------------------- | --------------------------------------------------- | -------- | -------- |
| 1   | Clean project                | `{ path }`                      | `{ success: true, mode: "check", errors: 0 }`       | P0       | complete |
| 2   | Type errors                  | `{ path }` (broken)             | `{ success: false, diagnostics: [...], errors: N }` | P0       | complete |
| 3   | No Cargo.toml                | `{ path: "/tmp/empty" }`        | Error thrown                                        | P0       | complete |
| 4   | Flag injection on `package`  | `{ package: "--exec=evil" }`    | `assertNoFlagInjection` throws                      | P0       | complete |
| 5   | Flag injection on `target`   | `{ target: "--exec=evil" }`     | `assertNoFlagInjection` throws                      | P0       | complete |
| 6   | Flag injection on `features` | `{ features: ["--exec=evil"] }` | `assertNoFlagInjection` throws                      | P0       | complete |
| 7   | Check all targets            | `{ path, allTargets: true }`    | Checks bins, tests, benches                         | P1       | complete |
| 8   | Check workspace              | `{ path, workspace: true }`     | All packages checked                                | P1       | complete |
| 9   | Schema validation            | all                             | Zod parse succeeds against `CargoCheckResultSchema` | P0       | complete |

### Summary: 9 scenarios (P0: 6, P1: 2, P2: 0)

---

## Tool: `clippy`

### Implementation: `packages/server-cargo/src/tools/clippy.ts`

### Schema: `CargoClippyResultSchema`

### Input params

| Param               | Type     | Required | Notes                |
| ------------------- | -------- | -------- | -------------------- |
| `path`              | string   | no       | Project root         |
| `noDeps`            | boolean  | no       | Default: false       |
| `allTargets`        | boolean  | no       | Default: false       |
| `release`           | boolean  | no       | Default: false       |
| `package`           | string   | no       | Workspace package    |
| `fix`               | boolean  | no       | Default: false       |
| `features`          | string[] | no       | Features to activate |
| `allFeatures`       | boolean  | no       | Default: false       |
| `noDefaultFeatures` | boolean  | no       | Default: false       |
| `warn`              | string[] | no       | Lint names to warn   |
| `allow`             | string[] | no       | Lint names to allow  |
| `deny`              | string[] | no       | Lint names to deny   |
| `forbid`            | string[] | no       | Lint names to forbid |
| `locked`            | boolean  | no       | Default: false       |
| `frozen`            | boolean  | no       | Default: false       |
| `offline`           | boolean  | no       | Default: false       |
| `compact`           | boolean  | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                                    | Expected Output                                       | Priority | Status   |
| --- | ---------------------------- | ----------------------------------------- | ----------------------------------------------------- | -------- | -------- |
| 1   | Clean project                | `{ path }`                                | `{ success: true, total: 0, errors: 0, warnings: 0 }` | P0       | complete |
| 2   | Project with lint warnings   | `{ path }`                                | `{ diagnostics: [...], warnings: N }`                 | P0       | complete |
| 3   | No Cargo.toml                | `{ path: "/tmp/empty" }`                  | Error thrown                                          | P0       | complete |
| 4   | Flag injection on `package`  | `{ package: "--exec=evil" }`              | `assertNoFlagInjection` throws                        | P0       | complete |
| 5   | Flag injection on `features` | `{ features: ["--exec=evil"] }`           | `assertNoFlagInjection` throws                        | P0       | complete |
| 6   | Flag injection on `warn`     | `{ warn: ["--exec=evil"] }`               | `assertNoFlagInjection` throws                        | P0       | complete |
| 7   | Flag injection on `allow`    | `{ allow: ["--exec=evil"] }`              | `assertNoFlagInjection` throws                        | P0       | complete |
| 8   | Flag injection on `deny`     | `{ deny: ["--exec=evil"] }`               | `assertNoFlagInjection` throws                        | P0       | complete |
| 9   | Flag injection on `forbid`   | `{ forbid: ["--exec=evil"] }`             | `assertNoFlagInjection` throws                        | P0       | complete |
| 10  | Deny specific lint           | `{ path, deny: ["clippy::unwrap_used"] }` | Those lints become errors                             | P1       | complete |
| 11  | Fix mode                     | `{ path, fix: true }`                     | Auto-applied suggestions                              | P1       | complete |
| 12  | Suggestion text              | `{ path }`                                | `diagnostics[].suggestion` populated where applicable | P1       | complete |
| 13  | Schema validation            | all                                       | Zod parse succeeds against `CargoClippyResultSchema`  | P0       | complete |

### Summary: 13 scenarios (P0: 9, P1: 3, P2: 0)

---

## Tool: `doc`

### Implementation: `packages/server-cargo/src/tools/doc.ts`

### Schema: `CargoDocResultSchema`

### Input params

| Param                  | Type     | Required | Notes                |
| ---------------------- | -------- | -------- | -------------------- |
| `path`                 | string   | no       | Project root         |
| `open`                 | boolean  | no       | Default: false       |
| `noDeps`               | boolean  | no       | Default: false       |
| `documentPrivateItems` | boolean  | no       | Default: false       |
| `workspace`            | boolean  | no       | Default: false       |
| `package`              | string   | no       | Workspace package    |
| `features`             | string[] | no       | Features to activate |
| `allFeatures`          | boolean  | no       | Default: false       |
| `noDefaultFeatures`    | boolean  | no       | Default: false       |
| `target`               | string   | no       | Target triple        |
| `locked`               | boolean  | no       | Default: false       |
| `frozen`               | boolean  | no       | Default: false       |
| `offline`              | boolean  | no       | Default: false       |
| `compact`              | boolean  | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                                 | Expected Output                                         | Priority | Status   |
| --- | ---------------------------- | -------------------------------------- | ------------------------------------------------------- | -------- | -------- |
| 1   | Generate docs successfully   | `{ path }`                             | `{ success: true, warnings: 0 }`                        | P0       | complete |
| 2   | Docs with warnings           | `{ path }`                             | `{ success: true, warnings: N, warningDetails: [...] }` | P0       | complete |
| 3   | No Cargo.toml                | `{ path: "/tmp/empty" }`               | Error thrown                                            | P0       | complete |
| 4   | Flag injection on `package`  | `{ package: "--exec=evil" }`           | `assertNoFlagInjection` throws                          | P0       | complete |
| 5   | Flag injection on `target`   | `{ target: "--exec=evil" }`            | `assertNoFlagInjection` throws                          | P0       | complete |
| 6   | Flag injection on `features` | `{ features: ["--exec=evil"] }`        | `assertNoFlagInjection` throws                          | P0       | complete |
| 7   | Doc with noDeps              | `{ path, noDeps: true }`               | Only project docs                                       | P1       | complete |
| 8   | Doc private items            | `{ path, documentPrivateItems: true }` | Private items included                                  | P2       | complete |
| 9   | Schema validation            | all                                    | Zod parse succeeds against `CargoDocResultSchema`       | P0       | complete |

### Summary: 9 scenarios (P0: 6, P1: 1, P2: 1)

---

## Tool: `fmt`

### Implementation: `packages/server-cargo/src/tools/fmt.ts`

### Schema: `CargoFmtResultSchema`

### Input params

| Param         | Type                                 | Required | Notes                         |
| ------------- | ------------------------------------ | -------- | ----------------------------- |
| `path`        | string                               | no       | Project root                  |
| `check`       | boolean                              | no       | Default: false                |
| `includeDiff` | boolean                              | no       | Default: false                |
| `all`         | boolean                              | no       | Format all workspace packages |
| `backup`      | boolean                              | no       | Default: false                |
| `package`     | string                               | no       | Workspace package             |
| `edition`     | "2015" \| "2018" \| "2021" \| "2024" | no       | Rust edition                  |
| `config`      | string                               | no       | Rustfmt config                |
| `configPath`  | string                               | no       | Config file path              |
| `emit`        | "files" \| "stdout"                  | no       | Output mode                   |
| `compact`     | boolean                              | no       | Default: true                 |

### Scenarios

| #   | Scenario                       | Params                                     | Expected Output                                              | Priority | Status   |
| --- | ------------------------------ | ------------------------------------------ | ------------------------------------------------------------ | -------- | -------- |
| 1   | Already formatted              | `{ path }`                                 | `{ success: true, needsFormatting: false, filesChanged: 0 }` | P0       | complete |
| 2   | Files need formatting          | `{ path }`                                 | `{ success: true, filesChanged: N, files: [...] }`           | P0       | complete |
| 3   | Check mode with violations     | `{ path, check: true }`                    | `{ success: false, needsFormatting: true }`                  | P0       | complete |
| 4   | No Cargo.toml                  | `{ path: "/tmp/empty" }`                   | Error thrown                                                 | P0       | complete |
| 5   | Flag injection on `package`    | `{ package: "--exec=evil" }`               | `assertNoFlagInjection` throws                               | P0       | complete |
| 6   | Flag injection on `configPath` | `{ configPath: "--exec=evil" }`            | `assertNoFlagInjection` throws                               | P0       | complete |
| 7   | Check with diff output         | `{ path, check: true, includeDiff: true }` | `{ diff: "..." }`                                            | P1       | complete |
| 8   | Format workspace               | `{ path, all: true }`                      | All packages formatted                                       | P1       | complete |
| 9   | Custom edition                 | `{ path, edition: "2021" }`                | Uses edition-specific rules                                  | P2       | complete |
| 10  | Schema validation              | all                                        | Zod parse succeeds against `CargoFmtResultSchema`            | P0       | complete |

### Summary: 10 scenarios (P0: 6, P1: 2, P2: 1)

---

## Tool: `remove`

### Implementation: `packages/server-cargo/src/tools/remove.ts`

### Schema: `CargoRemoveResultSchema`

### Input params

| Param          | Type     | Required | Notes              |
| -------------- | -------- | -------- | ------------------ |
| `path`         | string   | no       | Project root       |
| `packages`     | string[] | yes      | Packages to remove |
| `dev`          | boolean  | no       | Default: false     |
| `build`        | boolean  | no       | Default: false     |
| `dryRun`       | boolean  | no       | Default: false     |
| `package`      | string   | no       | Workspace package  |
| `locked`       | boolean  | no       | Default: false     |
| `frozen`       | boolean  | no       | Default: false     |
| `offline`      | boolean  | no       | Default: false     |
| `manifestPath` | string   | no       | Cargo.toml path    |
| `compact`      | boolean  | no       | Default: true      |

### Scenarios

| #   | Scenario                         | Params                                                 | Expected Output                                            | Priority | Status   |
| --- | -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | -------- | -------- |
| 1   | Remove existing dep              | `{ path, packages: ["serde"] }`                        | `{ success: true, removed: ["serde"], total: 1 }`          | P0       | complete |
| 2   | Remove nonexistent dep           | `{ path, packages: ["nonexistent"] }`                  | `{ success: false, error: "..." }`                         | P0       | complete |
| 3   | No Cargo.toml                    | `{ path: "/tmp/empty", packages: ["serde"] }`          | Error thrown                                               | P0       | complete |
| 4   | Flag injection on `packages`     | `{ packages: ["--exec=evil"] }`                        | `assertNoFlagInjection` throws                             | P0       | complete |
| 5   | Flag injection on `package`      | `{ packages: ["serde"], package: "--exec=evil" }`      | `assertNoFlagInjection` throws                             | P0       | complete |
| 6   | Flag injection on `manifestPath` | `{ packages: ["serde"], manifestPath: "--exec=evil" }` | `assertNoFlagInjection` throws                             | P0       | complete |
| 7   | Remove dev dep                   | `{ path, packages: ["test-crate"], dev: true }`        | `{ dependencyType: "dev" }`                                | P1       | complete |
| 8   | Dry run                          | `{ path, packages: ["serde"], dryRun: true }`          | Preview without modifying                                  | P1       | complete |
| 9   | Partial success (multi-package)  | `{ path, packages: ["exists", "not-exists"] }`         | `{ partialSuccess: true, failedPackages: ["not-exists"] }` | P1       | complete |
| 10  | Schema validation                | all                                                    | Zod parse succeeds against `CargoRemoveResultSchema`       | P0       | complete |

### Summary: 10 scenarios (P0: 7, P1: 3, P2: 0)

---

## Tool: `run`

### Implementation: `packages/server-cargo/src/tools/run.ts`

### Schema: `CargoRunResultSchema`

### Input params

| Param               | Type     | Required | Notes                |
| ------------------- | -------- | -------- | -------------------- |
| `path`              | string   | no       | Project root         |
| `args`              | string[] | no       | Program arguments    |
| `release`           | boolean  | no       | Default: false       |
| `package`           | string   | no       | Workspace package    |
| `bin`               | string   | no       | Binary name          |
| `example`           | string   | no       | Example name         |
| `features`          | string[] | no       | Features to activate |
| `allFeatures`       | boolean  | no       | Default: false       |
| `noDefaultFeatures` | boolean  | no       | Default: false       |
| `timeout`           | number   | no       | 1000-600000 ms       |
| `profile`           | string   | no       | Custom profile       |
| `target`            | string   | no       | Target triple        |
| `locked`            | boolean  | no       | Default: false       |
| `frozen`            | boolean  | no       | Default: false       |
| `offline`           | boolean  | no       | Default: false       |
| `maxOutputSize`     | number   | no       | Default: 1048576     |
| `compact`           | boolean  | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                                   | Expected Output                                                 | Priority | Status   |
| --- | ---------------------------- | ---------------------------------------- | --------------------------------------------------------------- | -------- | -------- |
| 1   | Run successful program       | `{ path }`                               | `{ exitCode: 0, success: true, stdout: "..." }`                 | P0       | complete |
| 2   | Compilation error            | `{ path }` (broken)                      | `{ exitCode: 101, success: false, failureType: "compilation" }` | P0       | complete |
| 3   | Runtime error                | `{ path }` (panicking program)           | `{ exitCode: 101, success: false, failureType: "runtime" }`     | P0       | complete |
| 4   | No Cargo.toml                | `{ path: "/tmp/empty" }`                 | Error thrown                                                    | P0       | complete |
| 5   | Flag injection on `package`  | `{ package: "--exec=evil" }`             | `assertNoFlagInjection` throws                                  | P0       | complete |
| 6   | Flag injection on `bin`      | `{ bin: "--exec=evil" }`                 | `assertNoFlagInjection` throws                                  | P0       | complete |
| 7   | Flag injection on `example`  | `{ example: "--exec=evil" }`             | `assertNoFlagInjection` throws                                  | P0       | complete |
| 8   | Flag injection on `profile`  | `{ profile: "--exec=evil" }`             | `assertNoFlagInjection` throws                                  | P0       | complete |
| 9   | Flag injection on `target`   | `{ target: "--exec=evil" }`              | `assertNoFlagInjection` throws                                  | P0       | complete |
| 10  | Flag injection on `args`     | `{ args: ["--exec=evil"] }`              | `assertNoFlagInjection` throws                                  | P0       | complete |
| 11  | Flag injection on `features` | `{ features: ["--exec=evil"] }`          | `assertNoFlagInjection` throws                                  | P0       | complete |
| 12  | Timeout                      | `{ path, timeout: 1000 }` (long-running) | `{ failureType: "timeout" }`                                    | P1       | complete |
| 13  | Output truncation            | `{ path, maxOutputSize: 1024 }`          | `{ stdoutTruncated: true }`                                     | P1       | complete |
| 14  | Run with args                | `{ path, args: ["--help"] }`             | `{ exitCode: 0 }`                                               | P1       | complete |
| 15  | Schema validation            | all                                      | Zod parse succeeds against `CargoRunResultSchema`               | P0       | complete |

### Summary: 15 scenarios (P0: 11, P1: 3, P2: 0)

---

## Tool: `test`

### Implementation: `packages/server-cargo/src/tools/test.ts`

### Schema: `CargoTestResultSchema`

### Input params

| Param               | Type     | Required | Notes                |
| ------------------- | -------- | -------- | -------------------- |
| `path`              | string   | no       | Project root         |
| `filter`            | string   | no       | Test name filter     |
| `noFailFast`        | boolean  | no       | Default: false       |
| `noRun`             | boolean  | no       | Default: false       |
| `release`           | boolean  | no       | Default: false       |
| `doc`               | boolean  | no       | Default: false       |
| `package`           | string   | no       | Workspace package    |
| `features`          | string[] | no       | Features to activate |
| `allFeatures`       | boolean  | no       | Default: false       |
| `noDefaultFeatures` | boolean  | no       | Default: false       |
| `testArgs`          | string[] | no       | Test harness args    |
| `locked`            | boolean  | no       | Default: false       |
| `frozen`            | boolean  | no       | Default: false       |
| `offline`           | boolean  | no       | Default: false       |
| `compact`           | boolean  | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                              | Expected Output                                                    | Priority | Status   |
| --- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------ | -------- | -------- |
| 1   | All tests pass               | `{ path }`                          | `{ success: true, passed: N, failed: 0, total: N }`                | P0       | complete |
| 2   | Tests with failures          | `{ path }`                          | `{ success: false, tests: [{ status: "FAILED", output: "..." }] }` | P0       | complete |
| 3   | No tests found               | `{ path }` (no tests)               | `{ success: true, total: 0 }`                                      | P0       | complete |
| 4   | Compilation failure          | `{ path }` (broken)                 | `{ success: false, compilationDiagnostics: [...] }`                | P0       | complete |
| 5   | Flag injection on `filter`   | `{ filter: "--exec=evil" }`         | `assertNoFlagInjection` throws                                     | P0       | complete |
| 6   | Flag injection on `package`  | `{ package: "--exec=evil" }`        | `assertNoFlagInjection` throws                                     | P0       | complete |
| 7   | Flag injection on `features` | `{ features: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                     | P0       | complete |
| 8   | Filter specific test         | `{ path, filter: "test_name" }`     | Only matching tests                                                | P1       | complete |
| 9   | Doc tests only               | `{ path, doc: true }`               | Only doc tests                                                     | P1       | complete |
| 10  | Ignored tests                | `{ path, testArgs: ["--ignored"] }` | Runs ignored tests                                                 | P1       | complete |
| 11  | Test duration tracking       | `{ path }`                          | `{ duration: "..." }` populated                                    | P2       | complete |
| 12  | Schema validation            | all                                 | Zod parse succeeds against `CargoTestResultSchema`                 | P0       | complete |

### Summary: 12 scenarios (P0: 7, P1: 3, P2: 1)

---

## Tool: `tree`

### Implementation: `packages/server-cargo/src/tools/tree.ts`

### Schema: `CargoTreeResultSchema`

### Input params

| Param               | Type              | Required | Notes                |
| ------------------- | ----------------- | -------- | -------------------- |
| `path`              | string            | no       | Project root         |
| `depth`             | number            | no       | Max tree depth       |
| `package`           | string            | no       | Focus package        |
| `duplicates`        | boolean           | no       | Default: false       |
| `charset`           | "utf8" \| "ascii" | no       | Display charset      |
| `prune`             | string            | no       | Package to prune     |
| `invert`            | string            | no       | Reverse deps         |
| `edges`             | enum              | no       | Edge filter          |
| `features`          | string[]          | no       | Features to activate |
| `allFeatures`       | boolean           | no       | Default: false       |
| `noDefaultFeatures` | boolean           | no       | Default: false       |
| `format`            | string            | no       | Custom format        |
| `target`            | string            | no       | Platform filter      |
| `locked`            | boolean           | no       | Default: false       |
| `frozen`            | boolean           | no       | Default: false       |
| `offline`           | boolean           | no       | Default: false       |
| `compact`           | boolean           | no       | Default: true        |

### Scenarios

| #   | Scenario                     | Params                          | Expected Output                                                    | Priority | Status   |
| --- | ---------------------------- | ------------------------------- | ------------------------------------------------------------------ | -------- | -------- |
| 1   | Display dependency tree      | `{ path }`                      | `{ success: true, dependencies: [...], packages: N, tree: "..." }` | P0       | complete |
| 2   | No Cargo.toml                | `{ path: "/tmp/empty" }`        | Error thrown                                                       | P0       | complete |
| 3   | Flag injection on `package`  | `{ package: "--exec=evil" }`    | `assertNoFlagInjection` throws                                     | P0       | complete |
| 4   | Flag injection on `prune`    | `{ prune: "--exec=evil" }`      | `assertNoFlagInjection` throws                                     | P0       | complete |
| 5   | Flag injection on `invert`   | `{ invert: "--exec=evil" }`     | `assertNoFlagInjection` throws                                     | P0       | complete |
| 6   | Flag injection on `format`   | `{ format: "--exec=evil" }`     | `assertNoFlagInjection` throws                                     | P0       | complete |
| 7   | Flag injection on `target`   | `{ target: "--exec=evil" }`     | `assertNoFlagInjection` throws                                     | P0       | complete |
| 8   | Flag injection on `features` | `{ features: ["--exec=evil"] }` | `assertNoFlagInjection` throws                                     | P0       | complete |
| 9   | Depth limit                  | `{ path, depth: 1 }`            | Only direct deps                                                   | P1       | complete |
| 10  | Show duplicates              | `{ path, duplicates: true }`    | Only multiply-versioned deps                                       | P1       | complete |
| 11  | Invert tree                  | `{ path, invert: "serde" }`     | Reverse dependency chain                                           | P1       | complete |
| 12  | Schema validation            | all                             | Zod parse succeeds against `CargoTreeResultSchema`                 | P0       | complete |

### Summary: 12 scenarios (P0: 9, P1: 3, P2: 0)

---

## Tool: `update`

### Implementation: `packages/server-cargo/src/tools/update.ts`

### Schema: `CargoUpdateResultSchema`

### Input params

| Param          | Type    | Required | Notes            |
| -------------- | ------- | -------- | ---------------- |
| `path`         | string  | no       | Project root     |
| `package`      | string  | no       | Specific package |
| `dryRun`       | boolean | no       | Default: false   |
| `aggressive`   | boolean | no       | Default: false   |
| `workspace`    | boolean | no       | Default: false   |
| `precise`      | string  | no       | Exact version    |
| `locked`       | boolean | no       | Default: false   |
| `frozen`       | boolean | no       | Default: false   |
| `offline`      | boolean | no       | Default: false   |
| `manifestPath` | string  | no       | Cargo.toml path  |
| `compact`      | boolean | no       | Default: true    |

### Scenarios

| #   | Scenario                         | Params                                           | Expected Output                                      | Priority | Status   |
| --- | -------------------------------- | ------------------------------------------------ | ---------------------------------------------------- | -------- | -------- |
| 1   | Update all deps                  | `{ path }`                                       | `{ success: true, updated: [...], totalUpdated: N }` | P0       | complete |
| 2   | No updates available             | `{ path }`                                       | `{ success: true, totalUpdated: 0 }`                 | P0       | complete |
| 3   | No Cargo.toml                    | `{ path: "/tmp/empty" }`                         | Error thrown                                         | P0       | complete |
| 4   | Flag injection on `package`      | `{ package: "--exec=evil" }`                     | `assertNoFlagInjection` throws                       | P0       | complete |
| 5   | Flag injection on `precise`      | `{ package: "serde", precise: "--exec=evil" }`   | `assertNoFlagInjection` throws                       | P0       | complete |
| 6   | Flag injection on `manifestPath` | `{ manifestPath: "--exec=evil" }`                | `assertNoFlagInjection` throws                       | P0       | complete |
| 7   | Update specific package          | `{ path, package: "serde" }`                     | Only serde updated                                   | P1       | complete |
| 8   | Dry run                          | `{ path, dryRun: true }`                         | Preview without modifying                            | P1       | complete |
| 9   | Precise version                  | `{ path, package: "serde", precise: "1.0.200" }` | Updated to exact version                             | P2       | complete |
| 10  | Schema validation                | all                                              | Zod parse succeeds against `CargoUpdateResultSchema` | P0       | complete |

### Summary: 10 scenarios (P0: 7, P1: 2, P2: 1)

---

## Grand Summary

| Tool      | P0      | P1     | P2    | Total   |
| --------- | ------- | ------ | ----- | ------- |
| add       | 14      | 3      | 0     | 17      |
| audit     | 13      | 2      | 1     | 16      |
| build     | 8       | 3      | 1     | 13      |
| check     | 6       | 2      | 0     | 9       |
| clippy    | 9       | 3      | 0     | 13      |
| doc       | 6       | 1      | 1     | 9       |
| fmt       | 6       | 2      | 1     | 10      |
| remove    | 7       | 3      | 0     | 10      |
| run       | 11      | 3      | 0     | 15      |
| test      | 7       | 3      | 1     | 12      |
| tree      | 9       | 3      | 0     | 12      |
| update    | 7       | 2      | 1     | 10      |
| **Total** | **103** | **30** | **6** | **146** |
