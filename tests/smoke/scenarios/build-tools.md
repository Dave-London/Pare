# Smoke Test Scenarios: build server (7 tools)

---

## Tool: `@paretools/build` → `build`

### Implementation: `packages/server-build/src/tools/build.ts`

### Schema: `BuildResultSchema`

### Input params

| Param     | Type                   | Required | Notes                                        |
| --------- | ---------------------- | -------- | -------------------------------------------- |
| `command` | string                 | yes      | Build command (allowlisted)                  |
| `args`    | string[]               | yes      | Arguments for the command                    |
| `path`    | string                 | no       | Working directory                            |
| `timeout` | number                 | no       | Timeout in ms (default: 300000, max: 600000) |
| `env`     | Record<string, string> | no       | Environment variables                        |
| `compact` | boolean                | no       | Compact output (default: true)               |

### Scenarios

| #   | Scenario                             | Params                                                                          | Expected Output                       | Priority | Status |
| --- | ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | -------- | ------ |
| 1   | Successful build (npm run build)     | `{ command: "npm", args: ["run", "build"], path }`                              | `success: true`, `duration > 0`       | P0       | mocked |
| 2   | Failed build (syntax error)          | `{ command: "tsc", args: ["--noEmit"], path }`                                  | `success: false`, `errors` populated  | P0       | mocked |
| 3   | Disallowed command                   | `{ command: "rm", args: ["-rf", "/"] }`                                         | `assertAllowedCommand` throws         | P0       | mocked |
| 4   | Path-qualified command               | `{ command: "/usr/bin/node", args: [] }`                                        | `assertNoPathQualifiedCommand` throws | P0       | mocked |
| 5   | Flag injection via args              | `{ command: "npm", args: ["--exec=evil"] }`                                     | `assertNoFlagInjection` throws        | P0       | mocked |
| 6   | Flag injection via env key           | `{ command: "npm", args: ["run", "build"], env: { "--exec=evil": "val" } }`     | `assertNoFlagInjection` throws        | P0       | mocked |
| 7   | Flag injection via env value         | `{ command: "npm", args: ["run", "build"], env: { "KEY": "--exec=evil" } }`     | `assertNoFlagInjection` throws        | P0       | mocked |
| 8   | Path restricted by assertAllowedRoot | `{ command: "npm", args: ["run", "build"], path: "/etc" }`                      | `assertAllowedRoot` throws            | P0       | mocked |
| 9   | Custom timeout                       | `{ command: "npm", args: ["run", "build"], timeout: 10000 }`                    | Respects timeout                      | P1       | mocked |
| 10  | env vars passed to process           | `{ command: "npm", args: ["run", "build"], env: { "NODE_ENV": "production" } }` | Env merged                            | P1       | mocked |
| 11  | compact: false                       | `{ command: "npm", args: ["run", "build"], compact: false }`                    | Full output with stdout/stderr        | P2       | mocked |
| 12  | Schema validation                    | all                                                                             | Zod parse succeeds                    | P0       | mocked |

---

## Tool: `@paretools/build` → `esbuild`

### Implementation: `packages/server-build/src/tools/esbuild.ts`

### Schema: `EsbuildResultSchema`

### Input params

| Param           | Type                                                               | Required | Notes                          |
| --------------- | ------------------------------------------------------------------ | -------- | ------------------------------ |
| `path`          | string                                                             | no       | Project root path              |
| `entryPoints`   | string[]                                                           | yes      | Entry point files              |
| `outdir`        | string                                                             | no       | Output directory               |
| `outfile`       | string                                                             | no       | Output file                    |
| `bundle`        | boolean                                                            | no       | Bundle deps (default: true)    |
| `minify`        | boolean                                                            | no       | Minify (default: false)        |
| `format`        | "esm" \| "cjs" \| "iife"                                           | no       | Output format                  |
| `platform`      | "browser" \| "node" \| "neutral"                                   | no       | Target platform                |
| `sourcemap`     | "true" \| "linked" \| "inline" \| "external" \| "both"             | no       | Source map mode                |
| `target`        | string                                                             | no       | Target env                     |
| `external`      | string[]                                                           | no       | External packages              |
| `tsconfig`      | string                                                             | no       | tsconfig path                  |
| `drop`          | ("console" \| "debugger")[]                                        | no       | Statements to drop             |
| `splitting`     | boolean                                                            | no       | Code splitting                 |
| `legalComments` | "none" \| "inline" \| "eof" \| "linked" \| "external"              | no       | Legal comments                 |
| `logLevel`      | "verbose" \| "debug" \| "info" \| "warning" \| "error" \| "silent" | no       | Log level                      |
| `define`        | Record<string, string>                                             | no       | Compile-time constants         |
| `loader`        | Record<string, string>                                             | no       | Custom file loaders            |
| `metafile`      | boolean                                                            | no       | Bundle analysis                |
| `args`          | string[]                                                           | no       | Additional flags               |
| `compact`       | boolean                                                            | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                        | Params                                                                                    | Expected Output                          | Priority | Status |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------- | -------- | ------ |
| 1   | Bundle single entry             | `{ entryPoints: ["src/index.ts"], outdir: "dist", path }`                                 | `success: true`, `duration > 0`          | P0       | mocked |
| 2   | Build error (missing entry)     | `{ entryPoints: ["nonexistent.ts"], outdir: "dist" }`                                     | `success: false`, `errors` populated     | P0       | mocked |
| 3   | Flag injection via entryPoints  | `{ entryPoints: ["--exec=evil"], outdir: "dist" }`                                        | `assertNoFlagInjection` throws           | P0       | mocked |
| 4   | Flag injection via target       | `{ entryPoints: ["src/index.ts"], target: "--exec=evil" }`                                | `assertNoFlagInjection` throws           | P0       | mocked |
| 5   | Flag injection via external     | `{ entryPoints: ["src/index.ts"], external: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws           | P0       | mocked |
| 6   | Flag injection via tsconfig     | `{ entryPoints: ["src/index.ts"], tsconfig: "--exec=evil" }`                              | `assertNoFlagInjection` throws           | P0       | mocked |
| 7   | Flag injection via define key   | `{ entryPoints: ["src/index.ts"], define: { "--exec=evil": "x" } }`                       | `assertNoFlagInjection` throws           | P0       | mocked |
| 8   | Flag injection via loader key   | `{ entryPoints: ["src/index.ts"], loader: { "--exec=evil": "text" } }`                    | `assertNoFlagInjection` throws           | P0       | mocked |
| 9   | Flag injection via args         | `{ entryPoints: ["src/index.ts"], args: ["--exec=evil"] }`                                | `assertNoFlagInjection` throws           | P0       | mocked |
| 10  | format: "esm", platform: "node" | `{ entryPoints: ["src/index.ts"], outdir: "dist", format: "esm", platform: "node" }`      | `success: true`                          | P1       | mocked |
| 11  | minify: true                    | `{ entryPoints: ["src/index.ts"], outdir: "dist", minify: true }`                         | Smaller output                           | P1       | mocked |
| 12  | metafile: true                  | `{ entryPoints: ["src/index.ts"], outdir: "dist", metafile: true }`                       | `metafile` populated with inputs/outputs | P1       | mocked |
| 13  | sourcemap: "inline"             | `{ entryPoints: ["src/index.ts"], outdir: "dist", sourcemap: "inline" }`                  | Source maps inline                       | P1       | mocked |
| 14  | splitting: true with esm        | `{ entryPoints: ["src/index.ts"], outdir: "dist", format: "esm", splitting: true }`       | Code splitting enabled                   | P2       | mocked |
| 15  | define: compile-time constants  | `{ entryPoints: ["src/index.ts"], define: { "process.env.NODE_ENV": "\"production\"" } }` | Constants replaced                       | P2       | mocked |
| 16  | Schema validation               | all                                                                                       | Zod parse succeeds                       | P0       | mocked |

---

## Tool: `@paretools/build` → `tsc`

### Implementation: `packages/server-build/src/tools/tsc.ts`

### Schema: `TscResultSchema`

### Input params

| Param                 | Type    | Required | Notes                          |
| --------------------- | ------- | -------- | ------------------------------ |
| `path`                | string  | no       | Project root path              |
| `noEmit`              | boolean | no       | Skip emit (default: true)      |
| `listEmittedFiles`    | boolean | no       | List emitted files             |
| `project`             | string  | no       | tsconfig path                  |
| `incremental`         | boolean | no       | Incremental compilation        |
| `skipLibCheck`        | boolean | no       | Skip .d.ts checking            |
| `emitDeclarationOnly` | boolean | no       | Only emit .d.ts                |
| `declaration`         | boolean | no       | Generate .d.ts                 |
| `declarationDir`      | string  | no       | .d.ts output dir               |
| `pretty`              | boolean | no       | Pretty output                  |
| `compact`             | boolean | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                            | Params                                     | Expected Output                                         | Priority | Status   |
| --- | ----------------------------------- | ------------------------------------------ | ------------------------------------------------------- | -------- | -------- |
| 1   | Clean project, no errors            | `{ path }`                                 | `success: true`, `errors: 0`, `diagnostics: []`         | P0       | complete |
| 2   | Project with type errors            | `{ path }`                                 | `success: false`, `errors > 0`, `diagnostics` populated | P0       | complete |
| 3   | No tsconfig.json                    | `{ path: "/tmp/empty" }`                   | Error thrown or success with no files                   | P0       | complete |
| 4   | Flag injection via project          | `{ path, project: "--exec=evil" }`         | `assertNoFlagInjection` throws                          | P0       | mocked   |
| 5   | Flag injection via declarationDir   | `{ path, declarationDir: "--exec=evil" }`  | `assertNoFlagInjection` throws                          | P0       | mocked   |
| 6   | Diagnostic has file/line/severity   | `{ path }` (with errors)                   | Each diagnostic has `file`, `line`, `severity`          | P1       | mocked   |
| 7   | noEmit: false with listEmittedFiles | `{ path, noEmit: false }`                  | `emittedFiles` populated                                | P1       | mocked   |
| 8   | project: custom tsconfig            | `{ path, project: "tsconfig.build.json" }` | Uses specified config                                   | P1       | mocked   |
| 9   | skipLibCheck: true                  | `{ path, skipLibCheck: true }`             | Faster check, .d.ts errors skipped                      | P1       | mocked   |
| 10  | compact: false                      | `{ path, compact: false }`                 | Full diagnostics with column/message                    | P2       | mocked   |
| 11  | incremental: true                   | `{ path, incremental: true }`              | Incremental build state                                 | P2       | mocked   |
| 12  | pretty: false                       | `{ path, pretty: false }`                  | Normalized parser-friendly output                       | P2       | mocked   |
| 13  | Schema validation                   | all                                        | Zod parse succeeds                                      | P0       | mocked   |

---

## Tool: `@paretools/build` → `turbo`

### Implementation: `packages/server-build/src/tools/turbo.ts`

### Schema: `TurboResultSchema`

### Input params

| Param               | Type                                                           | Required | Notes                          |
| ------------------- | -------------------------------------------------------------- | -------- | ------------------------------ |
| `task`              | string                                                         | no       | Single Turbo task              |
| `tasks`             | string[]                                                       | no       | Multiple tasks                 |
| `filter`            | string                                                         | no       | Package filter                 |
| `concurrency`       | number                                                         | no       | Max concurrent tasks           |
| `force`             | boolean                                                        | no       | Bypass cache                   |
| `continue_on_error` | boolean                                                        | no       | Continue after failures        |
| `dryRun`            | boolean                                                        | no       | Preview task graph             |
| `affected`          | boolean                                                        | no       | Only affected tasks            |
| `graph`             | boolean                                                        | no       | Task graph visualization       |
| `logOrder`          | "stream" \| "grouped" \| "auto"                                | no       | Log output order               |
| `profile`           | boolean                                                        | no       | Performance profile            |
| `summarize`         | boolean                                                        | no       | Run summary metadata           |
| `outputLogs`        | "full" \| "hash-only" \| "new-only" \| "errors-only" \| "none" | no       | Task log control               |
| `args`              | string[]                                                       | no       | Additional flags               |
| `path`              | string                                                         | no       | Project root path              |
| `compact`           | boolean                                                        | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                   | Params                                       | Expected Output                                 | Priority | Status |
| --- | -------------------------- | -------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | Run build task             | `{ task: "build", path }`                    | `success: true`, `totalTasks > 0`, `passed > 0` | P0       | mocked |
| 2   | No task or tasks provided  | `{ path }`                                   | Error: "Either task or tasks must be provided"  | P0       | mocked |
| 3   | Task failure               | `{ task: "failing-task", path }`             | `success: false`, `failed > 0`                  | P0       | mocked |
| 4   | Flag injection via task    | `{ task: "--exec=evil" }`                    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 5   | Flag injection via filter  | `{ task: "build", filter: "--exec=evil" }`   | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection via args    | `{ task: "build", args: ["--exec=evil"] }`   | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | Multiple tasks             | `{ tasks: ["build", "test"], path }`         | Both tasks run, `totalTasks` reflects both      | P1       | mocked |
| 8   | filter by package          | `{ task: "build", filter: "@scope/pkg" }`    | Only filtered package runs                      | P1       | mocked |
| 9   | force: true bypasses cache | `{ task: "build", force: true }`             | `cached: 0`                                     | P1       | mocked |
| 10  | Cache hit detection        | `{ task: "build", path }` (2nd run)          | `cached > 0`                                    | P1       | mocked |
| 11  | dryRun: true               | `{ task: "build", dryRun: true }`            | Preview without execution                       | P1       | mocked |
| 12  | summarize: true            | `{ task: "build", summarize: true }`         | `summary` populated from JSON                   | P2       | mocked |
| 13  | continue_on_error: true    | `{ task: "build", continue_on_error: true }` | Continues past failures                         | P2       | mocked |
| 14  | Schema validation          | all                                          | Zod parse succeeds                              | P0       | mocked |

---

## Tool: `@paretools/build` → `vite-build`

### Implementation: `packages/server-build/src/tools/vite-build.ts`

### Schema: `ViteBuildResultSchema`

### Input params

| Param                  | Type                                    | Required | Notes                            |
| ---------------------- | --------------------------------------- | -------- | -------------------------------- |
| `path`                 | string                                  | no       | Project root path                |
| `mode`                 | string                                  | no       | Build mode (default: production) |
| `outDir`               | string                                  | no       | Custom output dir                |
| `config`               | string                                  | no       | Vite config path                 |
| `sourcemap`            | boolean \| "inline" \| "hidden"         | no       | Source map mode                  |
| `base`                 | string                                  | no       | Public base path                 |
| `ssr`                  | string                                  | no       | SSR entry point                  |
| `manifest`             | boolean                                 | no       | Generate manifest                |
| `minify`               | "esbuild" \| "terser" \| "false"        | no       | Minification strategy            |
| `logLevel`             | "info" \| "warn" \| "error" \| "silent" | no       | Log level                        |
| `emptyOutDir`          | boolean                                 | no       | Empty outDir before build        |
| `reportCompressedSize` | boolean                                 | no       | Report gzip sizes                |
| `args`                 | string[]                                | no       | Additional flags                 |
| `compact`              | boolean                                 | no       | Compact output (default: true)   |

### Scenarios

| #   | Scenario                    | Params                            | Expected Output                                      | Priority | Status |
| --- | --------------------------- | --------------------------------- | ---------------------------------------------------- | -------- | ------ |
| 1   | Successful Vite build       | `{ path }`                        | `success: true`, `duration > 0`, `outputs` populated | P0       | mocked |
| 2   | Build failure (no config)   | `{ path: "/tmp/empty" }`          | `success: false`, `errors` populated                 | P0       | mocked |
| 3   | Flag injection via mode     | `{ path, mode: "--exec=evil" }`   | `assertNoFlagInjection` throws                       | P0       | mocked |
| 4   | Flag injection via outDir   | `{ path, outDir: "--exec=evil" }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 5   | Flag injection via config   | `{ path, config: "--exec=evil" }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 6   | Flag injection via base     | `{ path, base: "--exec=evil" }`   | `assertNoFlagInjection` throws                       | P0       | mocked |
| 7   | Flag injection via ssr      | `{ path, ssr: "--exec=evil" }`    | `assertNoFlagInjection` throws                       | P0       | mocked |
| 8   | Flag injection via args     | `{ path, args: ["--exec=evil"] }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 9   | Output files have file/size | `{ path }`                        | Each output has `file`, `size`                       | P1       | mocked |
| 10  | sourcemap: true             | `{ path, sourcemap: true }`       | Source maps generated                                | P1       | mocked |
| 11  | minify: "false"             | `{ path, minify: "false" }`       | No minification                                      | P1       | mocked |
| 12  | emptyOutDir: true           | `{ path, emptyOutDir: true }`     | Output dir cleaned first                             | P2       | mocked |
| 13  | Schema validation           | all                               | Zod parse succeeds                                   | P0       | mocked |

---

## Tool: `@paretools/build` → `webpack`

### Implementation: `packages/server-build/src/tools/webpack.ts`

### Schema: `WebpackResultSchema`

### Input params

| Param     | Type                                    | Required | Notes                          |
| --------- | --------------------------------------- | -------- | ------------------------------ |
| `path`    | string                                  | no       | Project root path              |
| `config`  | string                                  | no       | Webpack config path            |
| `mode`    | "production" \| "development" \| "none" | no       | Build mode                     |
| `entry`   | string                                  | no       | Entry point file               |
| `target`  | string                                  | no       | Build target env               |
| `devtool` | string                                  | no       | Source map strategy            |
| `analyze` | boolean                                 | no       | Bundle analyzer                |
| `bail`    | boolean                                 | no       | Fail on first error            |
| `cache`   | boolean                                 | no       | Enable/disable cache           |
| `env`     | Record<string, string>                  | no       | Env vars for config            |
| `profile` | boolean                                 | no       | Per-module timing              |
| `args`    | string[]                                | no       | Additional flags               |
| `compact` | boolean                                 | no       | Compact output (default: true) |

### Scenarios

| #   | Scenario                     | Params                                    | Expected Output                                     | Priority | Status |
| --- | ---------------------------- | ----------------------------------------- | --------------------------------------------------- | -------- | ------ |
| 1   | Successful webpack build     | `{ path }`                                | `success: true`, `duration > 0`, `assets` populated | P0       | mocked |
| 2   | Build failure                | `{ path }` (broken config)                | `success: false`, `errors` populated                | P0       | mocked |
| 3   | No webpack config            | `{ path: "/tmp/empty" }`                  | Error or failure                                    | P0       | mocked |
| 4   | Flag injection via config    | `{ path, config: "--exec=evil" }`         | `assertNoFlagInjection` throws                      | P0       | mocked |
| 5   | Flag injection via entry     | `{ path, entry: "--exec=evil" }`          | `assertNoFlagInjection` throws                      | P0       | mocked |
| 6   | Flag injection via target    | `{ path, target: "--exec=evil" }`         | `assertNoFlagInjection` throws                      | P0       | mocked |
| 7   | Flag injection via devtool   | `{ path, devtool: "--exec=evil" }`        | `assertNoFlagInjection` throws                      | P0       | mocked |
| 8   | Flag injection via args      | `{ path, args: ["--exec=evil"] }`         | `assertNoFlagInjection` throws                      | P0       | mocked |
| 9   | Flag injection via env key   | `{ path, env: { "--exec=evil": "val" } }` | `assertNoFlagInjection` throws                      | P0       | mocked |
| 10  | Flag injection via env value | `{ path, env: { "KEY": "--exec=evil" } }` | `assertNoFlagInjection` throws                      | P0       | mocked |
| 11  | Assets have name/size        | `{ path }`                                | Each asset has `name`, `size`                       | P1       | mocked |
| 12  | mode: "production"           | `{ path, mode: "production" }`            | Production optimizations                            | P1       | mocked |
| 13  | profile: true                | `{ path, profile: true }`                 | `profile` with `modules` timing data                | P1       | mocked |
| 14  | bail: true                   | `{ path, bail: true }`                    | Stops on first error                                | P2       | mocked |
| 15  | cache: false                 | `{ path, cache: false }`                  | No caching                                          | P2       | mocked |
| 16  | Schema validation            | all                                       | Zod parse succeeds                                  | P0       | mocked |

---

## Tool: `@paretools/build` → `nx`

### Implementation: `packages/server-build/src/tools/nx.ts`

### Schema: `NxResultSchema`

### Input params

| Param           | Type                                                                        | Required | Notes                                   |
| --------------- | --------------------------------------------------------------------------- | -------- | --------------------------------------- |
| `target`        | string                                                                      | yes      | Nx target (build, test, lint)           |
| `project`       | string                                                                      | no       | Specific project                        |
| `affected`      | boolean                                                                     | no       | Only affected projects (default: false) |
| `base`          | string                                                                      | no       | Base ref for affected                   |
| `head`          | string                                                                      | no       | Head ref for affected                   |
| `configuration` | string                                                                      | no       | Build configuration                     |
| `projects`      | string[]                                                                    | no       | Projects for run-many                   |
| `exclude`       | string[]                                                                    | no       | Projects to exclude                     |
| `path`          | string                                                                      | no       | Project root path                       |
| `parallel`      | number                                                                      | no       | Max parallel tasks                      |
| `skipNxCache`   | boolean                                                                     | no       | Skip cache                              |
| `nxBail`        | boolean                                                                     | no       | Stop on first failure                   |
| `verbose`       | boolean                                                                     | no       | Verbose output                          |
| `dryRun`        | boolean                                                                     | no       | Preview task graph                      |
| `outputStyle`   | "dynamic" \| "static" \| "stream" \| "stream-without-prefixes" \| "compact" | no       | Output style                            |
| `graph`         | boolean                                                                     | no       | Generate task graph                     |
| `args`          | string[]                                                                    | no       | Additional args                         |
| `compact`       | boolean                                                                     | no       | Compact output (default: true)          |

### Scenarios

| #   | Scenario                         | Params                                                     | Expected Output                            | Priority | Status |
| --- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | -------- | ------ |
| 1   | Run build for single project     | `{ target: "build", project: "my-app", path }`             | `success: true`, `total > 0`, `passed > 0` | P0       | mocked |
| 2   | Run-many build                   | `{ target: "build", path }`                                | All projects run, `total > 0`              | P0       | mocked |
| 3   | Nx not installed                 | `{ target: "build", path: "/tmp/empty" }`                  | Error thrown                               | P0       | mocked |
| 4   | Flag injection via target        | `{ target: "--exec=evil" }`                                | `assertNoFlagInjection` throws             | P0       | mocked |
| 5   | Flag injection via project       | `{ target: "build", project: "--exec=evil" }`              | `assertNoFlagInjection` throws             | P0       | mocked |
| 6   | Flag injection via base          | `{ target: "build", affected: true, base: "--exec=evil" }` | `assertNoFlagInjection` throws             | P0       | mocked |
| 7   | Flag injection via head          | `{ target: "build", affected: true, head: "--exec=evil" }` | `assertNoFlagInjection` throws             | P0       | mocked |
| 8   | Flag injection via configuration | `{ target: "build", configuration: "--exec=evil" }`        | `assertNoFlagInjection` throws             | P0       | mocked |
| 9   | Flag injection via projects      | `{ target: "build", projects: ["--exec=evil"] }`           | `assertNoFlagInjection` throws             | P0       | mocked |
| 10  | Flag injection via exclude       | `{ target: "build", exclude: ["--exec=evil"] }`            | `assertNoFlagInjection` throws             | P0       | mocked |
| 11  | Flag injection via args          | `{ target: "build", args: ["--exec=evil"] }`               | `assertNoFlagInjection` throws             | P0       | mocked |
| 12  | affected: true                   | `{ target: "build", affected: true, path }`                | Only affected projects                     | P1       | mocked |
| 13  | Task with cache hit              | `{ target: "build", path }` (2nd run)                      | `cached > 0`                               | P1       | mocked |
| 14  | skipNxCache: true                | `{ target: "build", skipNxCache: true }`                   | `cached: 0`                                | P1       | mocked |
| 15  | nxBail: true with failure        | `{ target: "build", nxBail: true }`                        | Stops after first failure                  | P1       | mocked |
| 16  | dryRun: true                     | `{ target: "build", dryRun: true }`                        | Preview without execution                  | P2       | mocked |
| 17  | Schema validation                | all                                                        | Zod parse succeeds                         | P0       | mocked |

---

## Grand Summary

| Tool       | P0     | P1     | P2     | Total  |
| ---------- | ------ | ------ | ------ | ------ |
| build      | 8      | 2      | 1      | 11     |
| esbuild    | 9      | 4      | 2      | 15     |
| tsc        | 5      | 4      | 3      | 12     |
| turbo      | 6      | 5      | 2      | 13     |
| vite-build | 8      | 3      | 1      | 12     |
| webpack    | 10     | 3      | 2      | 15     |
| nx         | 11     | 4      | 1      | 16     |
| **Total**  | **57** | **25** | **12** | **94** |
