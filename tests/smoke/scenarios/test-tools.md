# Smoke Test Scenarios: test server (3 tools)

---

## Tool: `@paretools/test` → `run`

### Implementation: `packages/server-test/src/tools/run.ts`

### Schema: `TestRunSchema`

### Input params

| Param             | Type                                      | Required | Notes                               |
| ----------------- | ----------------------------------------- | -------- | ----------------------------------- |
| `path`            | string                                    | no       | Project root path                   |
| `framework`       | "pytest" \| "jest" \| "vitest" \| "mocha" | no       | Force framework                     |
| `filter`          | string                                    | no       | Test filter pattern                 |
| `shard`           | string                                    | no       | Shard spec e.g. "1/3" (jest/vitest) |
| `config`          | string                                    | no       | Config file path                    |
| `updateSnapshots` | boolean                                   | no       | Update snapshots (vitest/jest)      |
| `coverage`        | boolean                                   | no       | Run with coverage                   |
| `onlyChanged`     | boolean                                   | no       | Only changed tests                  |
| `exitFirst`       | boolean                                   | no       | Stop on first failure               |
| `passWithNoTests` | boolean                                   | no       | Exit OK with no tests (jest/vitest) |
| `bail`            | number \| boolean                         | no       | Fail fast after N failures          |
| `testNamePattern` | string                                    | no       | Filter tests by name                |
| `workers`         | number                                    | no       | Parallel workers                    |
| `timeout`         | number                                    | no       | Per-test timeout (ms)               |
| `args`            | string[]                                  | no       | Additional args                     |
| `compact`         | boolean                                   | no       | Compact output (default: true)      |

### Scenarios

| #   | Scenario                           | Params                                                                        | Expected Output                                                  | Priority | Status  |
| --- | ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ------- |
| 1   | All tests pass (vitest)            | `{ path, framework: "vitest" }`                                               | `summary.passed > 0`, `summary.failed: 0`, `framework: "vitest"` | P0       | pending |
| 2   | Some tests fail (vitest)           | `{ path, framework: "vitest" }`                                               | `summary.failed > 0`, `failures` array populated                 | P0       | pending |
| 3   | No tests found                     | `{ path, framework: "vitest", filter: "nonexistent" }`                        | `summary.total: 0`                                               | P0       | pending |
| 4   | Framework auto-detection           | `{ path }`                                                                    | `framework` matches detected framework                           | P0       | pending |
| 5   | No framework detected              | `{ path: "/tmp/empty" }`                                                      | Error thrown                                                     | P0       | pending |
| 6   | Flag injection via args            | `{ path, framework: "vitest", args: ["--exec=evil"] }`                        | `assertNoFlagInjection` throws                                   | P0       | pending |
| 7   | Flag injection via filter          | `{ path, framework: "vitest", filter: "--exec=evil" }`                        | `assertNoFlagInjection` throws                                   | P0       | pending |
| 8   | Flag injection via shard           | `{ path, framework: "vitest", shard: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                   | P0       | pending |
| 9   | Flag injection via config          | `{ path, framework: "vitest", config: "--exec=evil" }`                        | `assertNoFlagInjection` throws                                   | P0       | pending |
| 10  | Flag injection via testNamePattern | `{ path, framework: "vitest", testNamePattern: "--exec=evil" }`               | `assertNoFlagInjection` throws                                   | P0       | pending |
| 11  | Failure details have name/message  | `{ path, framework: "vitest" }` (failing)                                     | Each failure has `name`, `message`                               | P1       | pending |
| 12  | filter: specific test file         | `{ path, framework: "vitest", filter: "parsers" }`                            | Only matching tests run                                          | P1       | pending |
| 13  | exitFirst: true                    | `{ path, framework: "vitest", exitFirst: true }`                              | Stops on first failure                                           | P1       | pending |
| 14  | bail: 3                            | `{ path, framework: "vitest", bail: 3 }`                                      | Stops after 3 failures                                           | P1       | pending |
| 15  | testNamePattern: "should parse"    | `{ path, framework: "vitest", testNamePattern: "should parse" }`              | Only matching test names                                         | P1       | pending |
| 16  | workers: 1                         | `{ path, framework: "vitest", workers: 1 }`                                   | Single-threaded execution                                        | P1       | pending |
| 17  | All tests pass (jest)              | `{ path, framework: "jest" }`                                                 | `framework: "jest"`, `summary.passed > 0`                        | P1       | pending |
| 18  | All tests pass (pytest)            | `{ path, framework: "pytest" }`                                               | `framework: "pytest"`, `summary.passed > 0`                      | P1       | pending |
| 19  | All tests pass (mocha)             | `{ path, framework: "mocha" }`                                                | `framework: "mocha"`, `summary.passed > 0`                       | P1       | pending |
| 20  | shard: "1/3" (vitest)              | `{ path, framework: "vitest", shard: "1/3" }`                                 | Subset of tests run                                              | P2       | pending |
| 21  | updateSnapshots: true              | `{ path, framework: "vitest", updateSnapshots: true }`                        | Snapshots updated                                                | P2       | pending |
| 22  | passWithNoTests: true              | `{ path, framework: "vitest", filter: "nonexistent", passWithNoTests: true }` | Exits successfully                                               | P2       | pending |
| 23  | timeout: 5000                      | `{ path, framework: "vitest", timeout: 5000 }`                                | Per-test timeout applied                                         | P2       | pending |
| 24  | compact: false                     | `{ path, framework: "vitest", compact: false }`                               | Full output with test list                                       | P2       | pending |
| 25  | Schema validation                  | all                                                                           | Zod parse succeeds                                               | P0       | pending |

---

## Tool: `@paretools/test` → `coverage`

### Implementation: `packages/server-test/src/tools/coverage.ts`

### Schema: `CoverageSchema`

### Input params

| Param       | Type                                      | Required | Notes                          |
| ----------- | ----------------------------------------- | -------- | ------------------------------ |
| `path`      | string                                    | no       | Project root path              |
| `framework` | "pytest" \| "jest" \| "vitest" \| "mocha" | no       | Force framework                |
| `branch`    | boolean                                   | no       | Branch coverage (pytest)       |
| `all`       | boolean                                   | no       | Include untested files         |
| `filter`    | string                                    | no       | Test filter pattern            |
| `source`    | string[]                                  | no       | Source paths to scope          |
| `exclude`   | string[]                                  | no       | Exclude patterns               |
| `failUnder` | number                                    | no       | Min line coverage %            |
| `args`      | string[]                                  | no       | Additional args                |
| `compact`   | boolean                                   | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                    | Params                                                     | Expected Output                                               | Priority | Status  |
| --- | --------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | -------- | ------- |
| 1   | Coverage report (vitest)    | `{ path, framework: "vitest" }`                            | `framework: "vitest"`, `summary.lines > 0`, `files` populated | P0       | pending |
| 2   | Coverage report (jest)      | `{ path, framework: "jest" }`                              | `framework: "jest"`, `summary.lines > 0`                      | P0       | pending |
| 3   | No tests/coverage provider  | `{ path: "/tmp/empty" }`                                   | Error thrown                                                  | P0       | pending |
| 4   | Flag injection via args     | `{ path, framework: "vitest", args: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                | P0       | pending |
| 5   | Flag injection via source   | `{ path, framework: "vitest", source: ["--exec=evil"] }`   | `assertNoFlagInjection` throws                                | P0       | pending |
| 6   | Flag injection via exclude  | `{ path, framework: "vitest", exclude: ["--exec=evil"] }`  | `assertNoFlagInjection` throws                                | P0       | pending |
| 7   | Flag injection via filter   | `{ path, framework: "vitest", filter: "--exec=evil" }`     | `assertNoFlagInjection` throws                                | P0       | pending |
| 8   | Per-file coverage data      | `{ path, framework: "vitest" }`                            | Each file has `file`, `lines`                                 | P1       | pending |
| 9   | failUnder: 80 (passes)      | `{ path, framework: "vitest", failUnder: 80 }`             | `meetsThreshold: true`                                        | P1       | pending |
| 10  | failUnder: 99 (fails)       | `{ path, framework: "vitest", failUnder: 99 }`             | `meetsThreshold: false`                                       | P1       | pending |
| 11  | all: true includes untested | `{ path, framework: "vitest", all: true }`                 | Files with 0% in output                                       | P1       | pending |
| 12  | source scoping              | `{ path, framework: "vitest", source: ["src/lib"] }`       | Only src/lib files in coverage                                | P1       | pending |
| 13  | Coverage report (pytest)    | `{ path, framework: "pytest" }`                            | `framework: "pytest"`, coverage data                          | P1       | pending |
| 14  | Coverage report (mocha)     | `{ path, framework: "mocha" }`                             | `framework: "mocha"`, coverage data                           | P1       | pending |
| 15  | branch: true (pytest)       | `{ path, framework: "pytest", branch: true }`              | `summary.branches` populated                                  | P2       | pending |
| 16  | exclude patterns            | `{ path, framework: "vitest", exclude: ["**/*.test.ts"] }` | Test files excluded from coverage                             | P2       | pending |
| 17  | compact: false              | `{ path, framework: "vitest", compact: false }`            | Full per-file details                                         | P2       | pending |
| 18  | Schema validation           | all                                                        | Zod parse succeeds                                            | P0       | pending |

---

## Tool: `@paretools/test` → `playwright`

### Implementation: `packages/server-test/src/tools/playwright.ts`

### Schema: `PlaywrightResultSchema`

### Input params

| Param             | Type                                 | Required | Notes                             |
| ----------------- | ------------------------------------ | -------- | --------------------------------- |
| `path`            | string                               | no       | Project root path                 |
| `filter`          | string                               | no       | Test filter pattern               |
| `project`         | string                               | no       | Playwright project name           |
| `grep`            | string                               | no       | Regex pattern for titles          |
| `browser`         | string                               | no       | Browser to use                    |
| `shard`           | string                               | no       | Shard spec e.g. "1/3"             |
| `trace`           | "on" \| "off" \| "retain-on-failure" | no       | Trace mode                        |
| `config`          | string                               | no       | Config file path                  |
| `headed`          | boolean                              | no       | Headed mode (default: false)      |
| `updateSnapshots` | boolean                              | no       | Update snapshots (default: false) |
| `workers`         | number                               | no       | Parallel workers                  |
| `retries`         | number                               | no       | Retry count                       |
| `maxFailures`     | number                               | no       | Stop after N failures             |
| `timeout`         | number                               | no       | Per-test timeout (ms)             |
| `lastFailed`      | boolean                              | no       | Re-run failed tests               |
| `onlyChanged`     | boolean                              | no       | Only changed tests                |
| `forbidOnly`      | boolean                              | no       | CI safety: fail on test.only      |
| `passWithNoTests` | boolean                              | no       | OK with no tests                  |
| `args`            | string[]                             | no       | Additional args                   |
| `compact`         | boolean                              | no       | Compact output (default: true)    |

### Scenarios

| #   | Scenario                         | Params                                                   | Expected Output                            | Priority | Status  |
| --- | -------------------------------- | -------------------------------------------------------- | ------------------------------------------ | -------- | ------- |
| 1   | All tests pass                   | `{ path }`                                               | `summary.passed > 0`, `summary.failed: 0`  | P0       | pending |
| 2   | Some tests fail                  | `{ path }`                                               | `summary.failed > 0`, `failures` populated | P0       | pending |
| 3   | Playwright not installed         | `{ path: "/tmp/empty" }`                                 | Error thrown                               | P0       | pending |
| 4   | No tests found                   | `{ path, filter: "nonexistent" }`                        | `summary.total: 0`                         | P0       | pending |
| 5   | Flag injection via args          | `{ path, args: ["--exec=evil"] }`                        | `assertNoFlagInjection` throws             | P0       | pending |
| 6   | Flag injection via filter        | `{ path, filter: "--exec=evil" }`                        | `assertNoFlagInjection` throws             | P0       | pending |
| 7   | Flag injection via project       | `{ path, project: "--exec=evil" }`                       | `assertNoFlagInjection` throws             | P0       | pending |
| 8   | Flag injection via grep          | `{ path, grep: "--exec=evil" }`                          | `assertNoFlagInjection` throws             | P0       | pending |
| 9   | Flag injection via browser       | `{ path, browser: "--exec=evil" }`                       | `assertNoFlagInjection` throws             | P0       | pending |
| 10  | Flag injection via shard         | `{ path, shard: "--exec=evil" }`                         | `assertNoFlagInjection` throws             | P0       | pending |
| 11  | Flag injection via config        | `{ path, config: "--exec=evil" }`                        | `assertNoFlagInjection` throws             | P0       | pending |
| 12  | Failure details have title/error | `{ path }` (failing)                                     | Each failure has `title`, `error`          | P1       | pending |
| 13  | project: "chromium"              | `{ path, project: "chromium" }`                          | Only chromium tests run                    | P1       | pending |
| 14  | grep: "login"                    | `{ path, grep: "login" }`                                | Only matching tests                        | P1       | pending |
| 15  | workers: 1                       | `{ path, workers: 1 }`                                   | Sequential execution                       | P1       | pending |
| 16  | retries: 2                       | `{ path, retries: 2 }`                                   | Flaky tests retried                        | P1       | pending |
| 17  | maxFailures: 1                   | `{ path, maxFailures: 1 }`                               | Stops after 1 failure                      | P1       | pending |
| 18  | forbidOnly: true                 | `{ path, forbidOnly: true }`                             | Fails on test.only                         | P1       | pending |
| 19  | shard: "1/3"                     | `{ path, shard: "1/3" }`                                 | Subset of tests run                        | P2       | pending |
| 20  | trace: "on"                      | `{ path, trace: "on" }`                                  | Traces recorded                            | P2       | pending |
| 21  | lastFailed: true                 | `{ path, lastFailed: true }`                             | Only previously failed tests               | P2       | pending |
| 22  | passWithNoTests: true            | `{ path, filter: "nonexistent", passWithNoTests: true }` | Exits successfully                         | P2       | pending |
| 23  | timeout: 10000                   | `{ path, timeout: 10000 }`                               | Per-test timeout applied                   | P2       | pending |
| 24  | Schema validation                | all                                                      | Zod parse succeeds                         | P0       | pending |

---

## Grand Summary

| Tool       | P0     | P1     | P2     | Total  |
| ---------- | ------ | ------ | ------ | ------ |
| run        | 10     | 9      | 5      | 24     |
| coverage   | 7      | 7      | 3      | 17     |
| playwright | 11     | 7      | 5      | 23     |
| **Total**  | **28** | **23** | **13** | **64** |
