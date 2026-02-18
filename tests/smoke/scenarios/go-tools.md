# Smoke Test Scenarios: @paretools/go

## Server: `packages/server-go` (11 tools)

---

## Tool: `build`

### Implementation: `packages/server-go/src/tools/build.ts`

### Schema: `GoBuildResultSchema`

### Input params

| Param       | Type     | Required | Notes                                                |
| ----------- | -------- | -------- | ---------------------------------------------------- |
| `path`      | string   | no       | Project root path                                    |
| `packages`  | string[] | no       | Packages to build (default: `["./..."]`)             |
| `race`      | boolean  | no       | Enable data race detection (`-race`)                 |
| `trimpath`  | boolean  | no       | Remove file system paths from binary (`-trimpath`)   |
| `verbose`   | boolean  | no       | Print compiled package names (`-v`)                  |
| `tags`      | string[] | no       | Build tags for conditional compilation               |
| `ldflags`   | string   | no       | Linker flags (`-ldflags`)                            |
| `output`    | string   | no       | Output binary name or path (`-o`)                    |
| `buildmode` | enum     | no       | Build mode (`default`, `archive`, `c-archive`, etc.) |
| `gcflags`   | string   | no       | Go compiler flags (`-gcflags`)                       |
| `compact`   | boolean  | no       | Prefer compact output                                |

### Scenarios

| #   | Scenario                               | Params                                     | Expected Output                                                   | Priority | Status   |
| --- | -------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- | -------- | -------- |
| 1   | Successful build, no errors            | `{ path }`                                 | `{ success: true, errors: [], total: 0 }`                         | P0       | complete |
| 2   | Build with compile errors              | `{ path }` (broken code)                   | `{ success: false, errors: [{ file, line, message }], total: N }` | P0       | complete |
| 3   | Build with raw errors (linker/package) | `{ path }` (linker error)                  | `{ success: false, rawErrors: ["..."] }`                          | P0       | mocked   |
| 4   | Empty project / no Go files            | `{ path }` (empty dir)                     | Error thrown or `{ success: false }`                              | P0       | mocked   |
| 5   | Flag injection via packages            | `{ path, packages: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 6   | Flag injection via output              | `{ path, output: "--exec=evil" }`          | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 7   | Flag injection via tags                | `{ path, tags: ["--exec=evil"] }`          | `assertNoFlagInjection` throws                                    | P0       | mocked   |
| 8   | Build with race detection              | `{ path, race: true }`                     | `success: true`, `-race` in args                                  | P1       | mocked   |
| 9   | Build with trimpath                    | `{ path, trimpath: true }`                 | `success: true`, `-trimpath` in args                              | P1       | mocked   |
| 10  | Build with tags                        | `{ path, tags: ["integration"] }`          | `success: true`, correct tag passed                               | P1       | mocked   |
| 11  | Build with ldflags                     | `{ path, ldflags: "-X main.version=1.0" }` | `success: true`, ldflags applied                                  | P1       | mocked   |
| 12  | Build with output path                 | `{ path, output: "mybin" }`                | Binary written to specified path                                  | P1       | mocked   |
| 13  | Build with buildmode                   | `{ path, buildmode: "pie" }`               | `success: true`, buildmode applied                                | P2       | mocked   |
| 14  | Build with gcflags                     | `{ path, gcflags: "-N -l" }`               | `success: true`, gcflags applied                                  | P2       | mocked   |
| 15  | Build cache estimate populated         | `{ path }`                                 | `buildCache: { estimatedHits, estimatedMisses, totalPackages }`   | P1       | mocked   |
| 16  | Schema validation on all outputs       | all                                        | Zod parse succeeds                                                | P0       | mocked   |

**Subtotal: 16 scenarios (P0: 7, P1: 5, P2: 2)**

---

## Tool: `test`

### Implementation: `packages/server-go/src/tools/test.ts`

### Schema: `GoTestResultSchema`

### Input params

| Param          | Type     | Required | Notes                                   |
| -------------- | -------- | -------- | --------------------------------------- |
| `path`         | string   | no       | Project root path                       |
| `packages`     | string[] | no       | Packages to test (default: `["./..."]`) |
| `run`          | string   | no       | Test name filter regex                  |
| `bench`        | string   | no       | Benchmark name filter regex             |
| `benchtime`    | string   | no       | Benchmark duration/count                |
| `benchmem`     | boolean  | no       | Memory allocation stats for benchmarks  |
| `failfast`     | boolean  | no       | Stop after first failure                |
| `short`        | boolean  | no       | Shorten long-running tests              |
| `race`         | boolean  | no       | Data race detection                     |
| `timeout`      | string   | no       | Test execution timeout                  |
| `count`        | number   | no       | Run each test N times                   |
| `cover`        | boolean  | no       | Enable coverage analysis                |
| `coverprofile` | string   | no       | Write coverage profile to file          |
| `tags`         | string[] | no       | Build tags                              |
| `parallel`     | number   | no       | Max parallel tests                      |
| `shuffle`      | enum     | no       | Randomize test order (`"on"` / `"off"`) |
| `compact`      | boolean  | no       | Prefer compact output                   |

### Scenarios

| #   | Scenario                         | Params                                  | Expected Output                                                  | Priority | Status   |
| --- | -------------------------------- | --------------------------------------- | ---------------------------------------------------------------- | -------- | -------- |
| 17  | All tests pass                   | `{ path }`                              | `{ success: true, passed: N, failed: 0, skipped: 0 }`            | P0       | complete |
| 18  | Some tests fail                  | `{ path }` (failing tests)              | `{ success: false, failed: N > 0, tests: [{ status: "fail" }] }` | P0       | complete |
| 19  | Tests with subtests              | `{ path }`                              | `tests` includes entries with `parent` field                     | P0       | mocked   |
| 20  | Package-level build failure      | `{ path }` (broken package)             | `{ success: false, packageFailures: [{ package, output }] }`     | P0       | mocked   |
| 21  | No test files found              | `{ path }` (no `_test.go`)              | `{ success: true, total: 0, tests: [] }`                         | P0       | mocked   |
| 22  | Flag injection via packages      | `{ path, packages: ["--exec=evil"] }`   | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 23  | Flag injection via run           | `{ path, run: "--exec=evil" }`          | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 24  | Flag injection via bench         | `{ path, bench: "--exec=evil" }`        | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 25  | Flag injection via benchtime     | `{ path, benchtime: "--exec=evil" }`    | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 26  | Flag injection via timeout       | `{ path, timeout: "--exec=evil" }`      | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 27  | Flag injection via coverprofile  | `{ path, coverprofile: "--exec=evil" }` | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 28  | Flag injection via tags          | `{ path, tags: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                                   | P0       | mocked   |
| 29  | Run with filter                  | `{ path, run: "TestFoo" }`              | Only matching tests in output                                    | P1       | mocked   |
| 30  | Run with failfast                | `{ path, failfast: true }`              | Stops after first failure                                        | P1       | mocked   |
| 31  | Run with race detection          | `{ path, race: true }`                  | Race detector enabled                                            | P1       | mocked   |
| 32  | Run with coverage                | `{ path, cover: true }`                 | Coverage data in output                                          | P1       | mocked   |
| 33  | Run benchmarks                   | `{ path, bench: "." }`                  | Benchmark results in output                                      | P1       | mocked   |
| 34  | Shuffle tests                    | `{ path, shuffle: "on" }`               | `-shuffle=on` in args                                            | P2       | mocked   |
| 35  | Schema validation on all outputs | all                                     | Zod parse succeeds                                               | P0       | mocked   |

**Subtotal: 19 scenarios (P0: 12, P1: 5, P2: 1)**

---

## Tool: `vet`

### Implementation: `packages/server-go/src/tools/vet.ts`

### Schema: `GoVetResultSchema`

### Input params

| Param          | Type     | Required | Notes                                  |
| -------------- | -------- | -------- | -------------------------------------- |
| `path`         | string   | no       | Project root path                      |
| `packages`     | string[] | no       | Packages to vet (default: `["./..."]`) |
| `analyzers`    | string[] | no       | Specific analyzers to enable/disable   |
| `tags`         | string[] | no       | Build tags                             |
| `contextLines` | number   | no       | Context lines around diagnostics       |
| `vettool`      | string   | no       | Path to custom analyzer tool binary    |
| `compact`      | boolean  | no       | Prefer compact output                  |

### Scenarios

| #   | Scenario                         | Params                                 | Expected Output                                                        | Priority | Status   |
| --- | -------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | -------- | -------- |
| 36  | Clean code, no diagnostics       | `{ path }`                             | `{ success: true, diagnostics: [], total: 0 }`                         | P0       | complete |
| 37  | Code with vet issues             | `{ path }` (vet warnings)              | `{ success: false, diagnostics: [{ file, line, message }], total: N }` | P0       | complete |
| 38  | Code with compilation errors     | `{ path }` (broken code)               | `compilationErrors` populated                                          | P0       | mocked   |
| 39  | Flag injection via packages      | `{ path, packages: ["--exec=evil"] }`  | `assertNoFlagInjection` throws                                         | P0       | mocked   |
| 40  | Flag injection via tags          | `{ path, tags: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                                         | P0       | mocked   |
| 41  | Flag injection via vettool       | `{ path, vettool: "--exec=evil" }`     | `assertNoFlagInjection` throws                                         | P0       | mocked   |
| 42  | Flag injection via analyzers     | `{ path, analyzers: ["--exec=evil"] }` | `assertNoFlagInjection` throws                                         | P0       | mocked   |
| 43  | Diagnostics with analyzer names  | `{ path }` (printf issues)             | `diagnostics[].analyzer` populated (e.g., `"printf"`)                  | P1       | mocked   |
| 44  | Enable specific analyzer         | `{ path, analyzers: ["shadow"] }`      | Only shadow diagnostics reported                                       | P1       | mocked   |
| 45  | Disable specific analyzer        | `{ path, analyzers: ["-printf"] }`     | Printf analyzer disabled                                               | P1       | mocked   |
| 46  | Context lines                    | `{ path, contextLines: 3 }`            | `-c=3` in args                                                         | P2       | mocked   |
| 47  | Custom vettool                   | `{ path, vettool: "/path/to/tool" }`   | `-vettool` in args                                                     | P2       | mocked   |
| 48  | Schema validation on all outputs | all                                    | Zod parse succeeds                                                     | P0       | mocked   |

**Subtotal: 13 scenarios (P0: 8, P1: 3, P2: 2)**

---

## Tool: `run`

### Implementation: `packages/server-go/src/tools/run.ts`

### Schema: `GoRunResultSchema`

### Input params

| Param       | Type     | Required | Notes                                    |
| ----------- | -------- | -------- | ---------------------------------------- |
| `path`      | string   | no       | Project root path                        |
| `file`      | string   | no       | Go file or package to run (default: `.`) |
| `args`      | string[] | no       | Arguments to pass to the program         |
| `buildArgs` | string[] | no       | Build flags (no flag injection check)    |
| `race`      | boolean  | no       | Data race detection                      |
| `tags`      | string[] | no       | Build tags                               |
| `timeout`   | number   | no       | Execution timeout in ms                  |
| `exec`      | string   | no       | Custom execution wrapper                 |
| `maxOutput` | number   | no       | Max chars for stdout/stderr              |
| `stream`    | boolean  | no       | Tail-focused output for long-running     |
| `tailLines` | number   | no       | Lines to keep when streaming             |
| `compact`   | boolean  | no       | Prefer compact output                    |

### Scenarios

| #   | Scenario                         | Params                                         | Expected Output                                  | Priority | Status |
| --- | -------------------------------- | ---------------------------------------------- | ------------------------------------------------ | -------- | ------ |
| 49  | Successful run with stdout       | `{ path, file: "main.go" }`                    | `{ success: true, exitCode: 0, stdout: "..." }`  | P0       | mocked |
| 50  | Run with non-zero exit code      | `{ path, file: "fail.go" }`                    | `{ success: false, exitCode: 1, stderr: "..." }` | P0       | mocked |
| 51  | Run with compile errors          | `{ path, file: "broken.go" }`                  | `{ success: false, stderr: "..." }`              | P0       | mocked |
| 52  | Flag injection via file          | `{ path, file: "--exec=evil" }`                | `assertNoFlagInjection` throws                   | P0       | mocked |
| 53  | Flag injection via exec          | `{ path, exec: "--exec=evil" }`                | `assertNoFlagInjection` throws                   | P0       | mocked |
| 54  | Flag injection via tags          | `{ path, tags: ["--exec=evil"] }`              | `assertNoFlagInjection` throws                   | P0       | mocked |
| 55  | Run with timeout (times out)     | `{ path, file: "infinite.go", timeout: 1000 }` | `{ timedOut: true, signal: "SIGTERM" }`          | P0       | mocked |
| 56  | Run with program args            | `{ path, file: ".", args: ["--flag", "val"] }` | Args passed after `--` separator                 | P1       | mocked |
| 57  | Run with race detection          | `{ path, file: ".", race: true }`              | `-race` in args                                  | P1       | mocked |
| 58  | Run with maxOutput truncation    | `{ path, maxOutput: 100 }`                     | `stdoutTruncated: true` when output > 100 chars  | P1       | mocked |
| 59  | Run with stream/tailLines        | `{ path, stream: true, tailLines: 10 }`        | Only last 10 lines kept                          | P1       | mocked |
| 60  | Run with custom exec wrapper     | `{ path, exec: "/usr/bin/time" }`              | `-exec` in args                                  | P2       | mocked |
| 61  | Schema validation on all outputs | all                                            | Zod parse succeeds                               | P0       | mocked |

**Subtotal: 13 scenarios (P0: 7, P1: 4, P2: 1)**

---

## Tool: `fmt`

### Implementation: `packages/server-go/src/tools/fmt.ts`

### Schema: `GoFmtResultSchema`

### Input params

| Param       | Type     | Required | Notes                                      |
| ----------- | -------- | -------- | ------------------------------------------ |
| `path`      | string   | no       | Project root path                          |
| `patterns`  | string[] | no       | File patterns to format (default: `["."]`) |
| `check`     | boolean  | no       | Check mode only (list unformatted files)   |
| `diff`      | boolean  | no       | Display diffs (`-d`)                       |
| `simplify`  | boolean  | no       | Simplify code (`-s`)                       |
| `allErrors` | boolean  | no       | Report all errors (`-e`)                   |
| `compact`   | boolean  | no       | Prefer compact output                      |

### Scenarios

| #   | Scenario                             | Params                                | Expected Output                                    | Priority | Status   |
| --- | ------------------------------------ | ------------------------------------- | -------------------------------------------------- | -------- | -------- |
| 62  | All files formatted                  | `{ path }`                            | `{ success: true, filesChanged: 0 }`               | P0       | complete |
| 63  | Unformatted files found (check mode) | `{ path, check: true }`               | `{ filesChanged: N, files: ["unformatted.go"] }`   | P0       | complete |
| 64  | Files reformatted (fix mode)         | `{ path }`                            | `{ success: true, filesChanged: N, files: [...] }` | P0       | mocked   |
| 65  | Parse errors in Go files             | `{ path }` (syntax errors)            | `parseErrors: [{ file, line, message }]`           | P0       | mocked   |
| 66  | Flag injection via patterns          | `{ path, patterns: ["--exec=evil"] }` | `assertNoFlagInjection` throws                     | P0       | mocked   |
| 67  | Diff output with changes             | `{ path, diff: true }`                | `changes: [{ file, diff }]` populated              | P1       | mocked   |
| 68  | Simplify mode                        | `{ path, simplify: true }`            | `-s` in args                                       | P1       | mocked   |
| 69  | All errors mode                      | `{ path, allErrors: true }`           | `-e` in args, more errors reported                 | P2       | mocked   |
| 70  | Schema validation on all outputs     | all                                   | Zod parse succeeds                                 | P0       | mocked   |

**Subtotal: 9 scenarios (P0: 6, P1: 2, P2: 1)**

---

## Tool: `env`

### Implementation: `packages/server-go/src/tools/env.ts`

### Schema: `GoEnvResultSchema`

### Input params

| Param     | Type     | Required | Notes                                    |
| --------- | -------- | -------- | ---------------------------------------- |
| `path`    | string   | no       | Project root path                        |
| `vars`    | string[] | no       | Specific env vars to query               |
| `changed` | boolean  | no       | Show only changed variables (`-changed`) |
| `compact` | boolean  | no       | Prefer compact output                    |

### Scenarios

| #   | Scenario                         | Params                                 | Expected Output                                              | Priority | Status   |
| --- | -------------------------------- | -------------------------------------- | ------------------------------------------------------------ | -------- | -------- |
| 71  | Full environment returned        | `{ path }`                             | `{ success: true, goroot, gopath, goversion, goos, goarch }` | P0       | complete |
| 72  | Specific vars queried            | `{ path, vars: ["GOROOT", "GOPATH"] }` | `vars` map includes only requested keys                      | P0       | mocked   |
| 73  | Flag injection via vars          | `{ path, vars: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                               | P0       | mocked   |
| 74  | Changed mode                     | `{ path, changed: true }`              | `-changed` in args, only modified vars shown                 | P1       | mocked   |
| 75  | cgoEnabled field populated       | `{ path }`                             | `cgoEnabled` is boolean                                      | P1       | mocked   |
| 76  | Schema validation on all outputs | all                                    | Zod parse succeeds                                           | P0       | mocked   |

**Subtotal: 6 scenarios (P0: 4, P1: 2, P2: 0)**

---

## Tool: `mod-tidy`

### Implementation: `packages/server-go/src/tools/mod-tidy.ts`

### Schema: `GoModTidyResultSchema`

### Input params

| Param             | Type    | Required | Notes                                       |
| ----------------- | ------- | -------- | ------------------------------------------- |
| `path`            | string  | no       | Project root path                           |
| `diff`            | boolean | no       | Check mode: show what changes would be made |
| `verbose`         | boolean | no       | Print info about removed modules            |
| `continueOnError` | boolean | no       | Proceed despite errors (`-e`)               |
| `goVersion`       | string  | no       | Expected Go version (`-go=<version>`)       |
| `compat`          | string  | no       | Backward compatibility version              |
| `compact`         | boolean | no       | Prefer compact output                       |

### Scenarios

| #   | Scenario                          | Params                               | Expected Output                                                      | Priority | Status |
| --- | --------------------------------- | ------------------------------------ | -------------------------------------------------------------------- | -------- | ------ |
| 77  | Already tidy (no changes needed)  | `{ path }`                           | `{ success: true, madeChanges: false }`                              | P0       | mocked |
| 78  | Modules added and removed         | `{ path }` (messy go.mod)            | `{ success: true, madeChanges: true, addedModules, removedModules }` | P0       | mocked |
| 79  | Network error during tidy         | `{ path }` (unreachable dep)         | `{ success: false, errorType: "network" }`                           | P0       | mocked |
| 80  | Not a Go module (no go.mod)       | `{ path: "/tmp/not-a-module" }`      | Error thrown                                                         | P0       | mocked |
| 81  | Flag injection via goVersion      | `{ path, goVersion: "--exec=evil" }` | `assertNoFlagInjection` throws                                       | P0       | mocked |
| 82  | Flag injection via compat         | `{ path, compat: "--exec=evil" }`    | `assertNoFlagInjection` throws                                       | P0       | mocked |
| 83  | Diff mode (non-destructive check) | `{ path, diff: true }`               | `-diff` in args, files not modified                                  | P1       | mocked |
| 84  | Verbose output                    | `{ path, verbose: true }`            | Module removal info in output                                        | P1       | mocked |
| 85  | Go version override               | `{ path, goVersion: "1.21" }`        | `-go=1.21` in args                                                   | P1       | mocked |
| 86  | Compat version                    | `{ path, compat: "1.20" }`           | `-compat=1.20` in args                                               | P2       | mocked |
| 87  | Continue on error                 | `{ path, continueOnError: true }`    | `-e` in args                                                         | P2       | mocked |
| 88  | Schema validation on all outputs  | all                                  | Zod parse succeeds                                                   | P0       | mocked |

**Subtotal: 12 scenarios (P0: 7, P1: 3, P2: 2)**

---

## Tool: `generate`

### Implementation: `packages/server-go/src/tools/generate.ts`

### Schema: `GoGenerateResultSchema`

### Input params

| Param      | Type     | Required | Notes                                       |
| ---------- | -------- | -------- | ------------------------------------------- |
| `path`     | string   | no       | Project root path                           |
| `patterns` | string[] | no       | Packages to generate (default: `["./..."]`) |
| `dryRun`   | boolean  | no       | Print commands without executing (`-n`)     |
| `run`      | string   | no       | Directive filter regex (`-run`)             |
| `skip`     | string   | no       | Directive skip regex (`-skip`)              |
| `verbose`  | boolean  | no       | Print package/file names (`-v`)             |
| `commands` | boolean  | no       | Print commands as executed (`-x`)           |
| `timeout`  | number   | no       | Execution timeout in ms                     |
| `tags`     | string[] | no       | Build tags                                  |
| `compact`  | boolean  | no       | Prefer compact output                       |

### Scenarios

| #   | Scenario                         | Params                                    | Expected Output                                          | Priority | Status |
| --- | -------------------------------- | ----------------------------------------- | -------------------------------------------------------- | -------- | ------ |
| 89  | Successful generate              | `{ path }`                                | `{ success: true }`                                      | P0       | mocked |
| 90  | Generate with failed directive   | `{ path }` (broken directive)             | `{ success: false, directives: [{ status: "failed" }] }` | P0       | mocked |
| 91  | No generate directives found     | `{ path }` (no directives)                | `{ success: true, output: "" }`                          | P0       | mocked |
| 92  | Generate times out               | `{ path, timeout: 1000 }` (slow gen)      | `{ success: false, timedOut: true }`                     | P0       | mocked |
| 93  | Flag injection via patterns      | `{ path, patterns: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                           | P0       | mocked |
| 94  | Flag injection via run           | `{ path, run: "--exec=evil" }`            | `assertNoFlagInjection` throws                           | P0       | mocked |
| 95  | Flag injection via skip          | `{ path, skip: "--exec=evil" }`           | `assertNoFlagInjection` throws                           | P0       | mocked |
| 96  | Flag injection via tags          | `{ path, tags: ["--exec=evil"] }`         | `assertNoFlagInjection` throws                           | P0       | mocked |
| 97  | Dry run mode                     | `{ path, dryRun: true }`                  | Commands printed but not executed                        | P1       | mocked |
| 98  | Run filter                       | `{ path, run: "stringer" }`               | Only matching directives executed                        | P1       | mocked |
| 99  | Skip filter                      | `{ path, skip: "protobuf" }`              | Matching directives skipped                              | P1       | mocked |
| 100 | Verbose and commands mode        | `{ path, verbose: true, commands: true }` | `-v` and `-x` in args                                    | P2       | mocked |
| 101 | Schema validation on all outputs | all                                       | Zod parse succeeds                                       | P0       | mocked |

**Subtotal: 13 scenarios (P0: 9, P1: 3, P2: 1)**

---

## Tool: `get`

### Implementation: `packages/server-go/src/tools/get.ts`

### Schema: `GoGetResultSchema`

### Input params

| Param          | Type     | Required | Notes                              |
| -------------- | -------- | -------- | ---------------------------------- |
| `packages`     | string[] | yes      | Packages to install                |
| `path`         | string   | no       | Project root path                  |
| `update`       | enum     | no       | `"all"` or `"patch"` update mode   |
| `testDeps`     | boolean  | no       | Download test dependencies (`-t`)  |
| `verbose`      | boolean  | no       | Print download progress (`-v`)     |
| `downloadOnly` | boolean  | no       | Download without installing (`-d`) |
| `compact`      | boolean  | no       | Prefer compact output              |

### Scenarios

| #   | Scenario                         | Params                                            | Expected Output                                  | Priority | Status |
| --- | -------------------------------- | ------------------------------------------------- | ------------------------------------------------ | -------- | ------ |
| 102 | Install a single package         | `{ packages: ["github.com/pkg/errors@latest"] }`  | `{ success: true, resolvedPackages: [...] }`     | P0       | mocked |
| 103 | Package not found                | `{ packages: ["github.com/nonexistent/pkg"] }`    | `{ success: false }`, error in output            | P0       | mocked |
| 104 | Not a Go module (no go.mod)      | `{ path: "/tmp/no-mod", packages: ["..."] }`      | Error thrown                                     | P0       | mocked |
| 105 | Flag injection via packages      | `{ packages: ["--exec=evil"] }`                   | `assertNoFlagInjection` throws                   | P0       | mocked |
| 106 | go.mod changes tracked           | `{ packages: ["new/pkg@latest"] }`                | `goModChanges: { added: [...], removed: [...] }` | P0       | mocked |
| 107 | Update all dependencies          | `{ path, packages: ["./..."], update: "all" }`    | `-u` in args                                     | P1       | mocked |
| 108 | Update patch only                | `{ path, packages: ["./..."], update: "patch" }`  | `-u=patch` in args                               | P1       | mocked |
| 109 | Download only                    | `{ path, packages: ["..."], downloadOnly: true }` | `-d` in args                                     | P1       | mocked |
| 110 | Include test deps                | `{ path, packages: ["..."], testDeps: true }`     | `-t` in args                                     | P2       | mocked |
| 111 | Per-package status tracking      | `{ packages: ["pkg1", "pkg2"] }`                  | `packages` array with per-pkg success/failure    | P1       | mocked |
| 112 | Schema validation on all outputs | all                                               | Zod parse succeeds                               | P0       | mocked |

**Subtotal: 11 scenarios (P0: 6, P1: 4, P2: 1)**

---

## Tool: `list`

### Implementation: `packages/server-go/src/tools/list.ts`

### Schema: `GoListResultSchema`

### Input params

| Param            | Type     | Required | Notes                                   |
| ---------------- | -------- | -------- | --------------------------------------- |
| `path`           | string   | no       | Project root path                       |
| `packages`       | string[] | no       | Package patterns (default: `["./..."]`) |
| `jsonFields`     | string[] | no       | Selective JSON fields for go1.22+       |
| `modules`        | boolean  | no       | List modules instead of packages (`-m`) |
| `updates`        | boolean  | no       | Show module updates (`-u`)              |
| `deps`           | boolean  | no       | Include transitive deps (`-deps`)       |
| `tolerateErrors` | boolean  | no       | Tolerate errors (`-e`)                  |
| `versions`       | boolean  | no       | Show all known module versions          |
| `find`           | boolean  | no       | Fast listing without deps (`-find`)     |
| `tags`           | string[] | no       | Build tags                              |
| `compact`        | boolean  | no       | Prefer compact output                   |

### Scenarios

| #   | Scenario                              | Params                                        | Expected Output                                 | Priority | Status   |
| --- | ------------------------------------- | --------------------------------------------- | ----------------------------------------------- | -------- | -------- |
| 113 | List packages in project              | `{ path }`                                    | `{ success: true, packages: [...], total: N }`  | P0       | complete |
| 114 | List modules                          | `{ path, modules: true }`                     | `{ success: true, modules: [...], total: N }`   | P0       | mocked   |
| 115 | No packages found                     | `{ path }` (empty project)                    | `{ success: true, total: 0 }`                   | P0       | mocked   |
| 116 | Flag injection via packages           | `{ path, packages: ["--exec=evil"] }`         | `assertNoFlagInjection` throws                  | P0       | mocked   |
| 117 | Flag injection via jsonFields         | `{ path, jsonFields: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                  | P0       | mocked   |
| 118 | Flag injection via tags               | `{ path, tags: ["--exec=evil"] }`             | `assertNoFlagInjection` throws                  | P0       | mocked   |
| 119 | Package with error info               | `{ path }` (broken import)                    | `packages[].error.err` populated                | P1       | mocked   |
| 120 | Module with version/dir info          | `{ path, modules: true }`                     | `modules[].path`, `modules[].version` populated | P1       | mocked   |
| 121 | Updates mode auto-enables module mode | `{ path, updates: true }`                     | `-m -u` in args                                 | P1       | mocked   |
| 122 | Deps mode                             | `{ path, deps: true }`                        | `-deps` in args, transitive deps listed         | P1       | mocked   |
| 123 | Selective JSON fields                 | `{ path, jsonFields: ["Dir", "ImportPath"] }` | `-json=Dir,ImportPath` in args                  | P1       | mocked   |
| 124 | Find mode (fast)                      | `{ path, find: true }`                        | `-find` in args                                 | P2       | mocked   |
| 125 | Tolerate errors                       | `{ path, tolerateErrors: true }`              | `-e` in args                                    | P2       | mocked   |
| 126 | Schema validation on all outputs      | all                                           | Zod parse succeeds                              | P0       | mocked   |

**Subtotal: 14 scenarios (P0: 7, P1: 5, P2: 2)**

---

## Tool: `golangci-lint`

### Implementation: `packages/server-go/src/tools/golangci-lint.ts`

### Schema: `GolangciLintResultSchema`

### Input params

| Param                | Type     | Required | Notes                                        |
| -------------------- | -------- | -------- | -------------------------------------------- |
| `path`               | string   | no       | Project root path                            |
| `patterns`           | string[] | no       | File patterns to lint (default: `["./..."]`) |
| `config`             | string   | no       | Path to config file                          |
| `fix`                | boolean  | no       | Auto-fix issues (`--fix`)                    |
| `fast`               | boolean  | no       | Run only fast linters (`--fast`)             |
| `new`                | boolean  | no       | Show only new issues (`--new`)               |
| `newFromRev`         | string   | no       | Issues after git revision (`--new-from-rev`) |
| `enable`             | string[] | no       | Enable specific linters                      |
| `disable`            | string[] | no       | Disable specific linters                     |
| `timeout`            | string   | no       | Linter run timeout                           |
| `buildTags`          | string[] | no       | Build tags                                   |
| `concurrency`        | number   | no       | CPUs to use                                  |
| `maxIssuesPerLinter` | number   | no       | Max issues per linter                        |
| `maxSameIssues`      | number   | no       | Max same issues reported                     |
| `presets`            | enum[]   | no       | Linter presets                               |
| `sortResults`        | boolean  | no       | Sort lint results                            |
| `compact`            | boolean  | no       | Prefer compact output                        |

### Scenarios

| #   | Scenario                         | Params                                    | Expected Output                                                          | Priority | Status   |
| --- | -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ | -------- | -------- |
| 127 | Clean code, no diagnostics       | `{ path }`                                | `{ total: 0, errors: 0, warnings: 0, diagnostics: [] }`                  | P0       | complete |
| 128 | Code with lint issues            | `{ path }` (lint warnings)                | `{ total: N, diagnostics: [{ file, line, linter, severity, message }] }` | P0       | complete |
| 129 | golangci-lint not installed      | `{ path }` (no binary)                    | Error thrown                                                             | P0       | mocked   |
| 130 | Flag injection via patterns      | `{ path, patterns: ["--exec=evil"] }`     | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 131 | Flag injection via config        | `{ path, config: "--exec=evil" }`         | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 132 | Flag injection via newFromRev    | `{ path, newFromRev: "--exec=evil" }`     | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 133 | Flag injection via timeout       | `{ path, timeout: "--exec=evil" }`        | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 134 | Flag injection via enable        | `{ path, enable: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 135 | Flag injection via disable       | `{ path, disable: ["--exec=evil"] }`      | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 136 | Flag injection via buildTags     | `{ path, buildTags: ["--exec=evil"] }`    | `assertNoFlagInjection` throws                                           | P0       | mocked   |
| 137 | Enable specific linters          | `{ path, enable: ["govet", "errcheck"] }` | `--enable govet,errcheck` in args                                        | P1       | mocked   |
| 138 | Disable specific linters         | `{ path, disable: ["deadcode"] }`         | `--disable deadcode` in args                                             | P1       | mocked   |
| 139 | New from rev                     | `{ path, newFromRev: "HEAD~5" }`          | `--new-from-rev HEAD~5` in args                                          | P1       | mocked   |
| 140 | Fix mode                         | `{ path, fix: true }`                     | `--fix` in args                                                          | P1       | mocked   |
| 141 | By-linter summary populated      | `{ path }` (multiple linters)             | `byLinter: [{ linter, count }]`                                          | P1       | mocked   |
| 142 | Results truncated flag           | `{ path, maxIssuesPerLinter: 1 }`         | `resultsTruncated: true` when limit hit                                  | P1       | mocked   |
| 143 | Presets                          | `{ path, presets: ["bugs", "style"] }`    | `--presets bugs,style` in args                                           | P2       | mocked   |
| 144 | Concurrency                      | `{ path, concurrency: 2 }`                | `--concurrency 2` in args                                                | P2       | mocked   |
| 145 | Schema validation on all outputs | all                                       | Zod parse succeeds                                                       | P0       | mocked   |

**Subtotal: 19 scenarios (P0: 11, P1: 6, P2: 2)**

---

## Tool: `mod-tidy` — (covered above, see scenarios 77-88)

---

## Grand Summary

| Tool            | Total   | P0     | P1     | P2     |
| --------------- | ------- | ------ | ------ | ------ |
| `build`         | 16      | 7      | 5      | 2      |
| `test`          | 19      | 12     | 5      | 1      |
| `vet`           | 13      | 8      | 3      | 2      |
| `run`           | 13      | 7      | 4      | 1      |
| `fmt`           | 9       | 6      | 2      | 1      |
| `env`           | 6       | 4      | 2      | 0      |
| `mod-tidy`      | 12      | 7      | 3      | 2      |
| `generate`      | 13      | 9      | 3      | 1      |
| `get`           | 11      | 6      | 4      | 1      |
| `list`          | 14      | 7      | 5      | 2      |
| `golangci-lint` | 19      | 11     | 6      | 2      |
| **Total**       | **145** | **84** | **42** | **13** |
