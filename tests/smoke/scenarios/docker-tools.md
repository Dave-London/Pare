# Smoke Test Scenarios: Docker Server (16 tools)

---

## Tool: `build`

### Implementation: `packages/server-docker/src/tools/build.ts`

### Schema: `DockerBuildSchema`

### Input params

| Param       | Type               | Required | Notes                      |
| ----------- | ------------------ | -------- | -------------------------- |
| `path`      | string             | no       | Build context path         |
| `tag`       | string \| string[] | no       | Image tag(s)               |
| `file`      | string             | no       | Dockerfile path            |
| `noCache`   | boolean            | no       | Default: false             |
| `pull`      | boolean            | no       | Default: false             |
| `buildArgs` | string[]           | no       | Build-time variables       |
| `target`    | string             | no       | Multi-stage build target   |
| `platform`  | string             | no       | Target platform            |
| `label`     | string[]           | no       | Image metadata labels      |
| `cacheFrom` | string[]           | no       | External cache sources     |
| `cacheTo`   | string[]           | no       | Cache export destinations  |
| `secret`    | string[]           | no       | Build secrets              |
| `ssh`       | string[]           | no       | SSH agent socket/keys      |
| `args`      | string[]           | no       | Additional build arguments |
| `compact`   | boolean            | no       | Default: true              |

### Scenarios

| #   | Scenario                                | Params                                             | Expected Output                                         | Priority | Status |
| --- | --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- | -------- | ------ |
| 1   | Successful build with tag               | `{ path, tag: "myapp:latest" }`                    | `{ success: true, imageId: "sha256:...", duration: N }` | P0       | mocked |
| 2   | Build with multiple tags                | `{ path, tag: ["myapp:latest", "myapp:v1"] }`      | `{ success: true }`, both tags applied                  | P1       | mocked |
| 3   | Build failure (bad Dockerfile)          | `{ path, file: "nonexistent.Dockerfile" }`         | `{ success: false, errors: [...] }`                     | P0       | mocked |
| 4   | Empty output (no Dockerfile in context) | `{ path: "/tmp/empty-dir" }`                       | Error thrown or `{ success: false }`                    | P0       | mocked |
| 5   | Flag injection on `tag`                 | `{ tag: "--exec=evil" }`                           | `assertNoFlagInjection` throws                          | P0       | mocked |
| 6   | Flag injection on `file`                | `{ file: "--exec=evil" }`                          | `assertNoFlagInjection` throws                          | P0       | mocked |
| 7   | Flag injection on `target`              | `{ target: "--exec=evil" }`                        | `assertNoFlagInjection` throws                          | P0       | mocked |
| 8   | Flag injection on `platform`            | `{ platform: "--exec=evil" }`                      | `assertNoFlagInjection` throws                          | P0       | mocked |
| 9   | Flag injection on `buildArgs`           | `{ buildArgs: ["--exec=evil"] }`                   | `assertNoFlagInjection` throws                          | P0       | mocked |
| 10  | Flag injection on `label`               | `{ label: ["--exec=evil"] }`                       | `assertNoFlagInjection` throws                          | P0       | mocked |
| 11  | Flag injection on `args`                | `{ args: ["--exec=evil"] }`                        | `assertNoFlagInjection` throws                          | P0       | mocked |
| 12  | Build with noCache and pull             | `{ path, tag: "test", noCache: true, pull: true }` | `{ success: true }` with fresh layers                   | P1       | mocked |
| 13  | Build with target (multi-stage)         | `{ path, target: "builder" }`                      | `{ success: true }`                                     | P1       | mocked |
| 14  | Build with buildArgs                    | `{ path, buildArgs: ["NODE_ENV=production"] }`     | `{ success: true }`                                     | P1       | mocked |
| 15  | Schema validation                       | all                                                | Zod parse succeeds against `DockerBuildSchema`          | P0       | mocked |

### Summary: 15 scenarios (P0: 8, P1: 4, P2: 0)

---

## Tool: `compose-build`

### Implementation: `packages/server-docker/src/tools/compose-build.ts`

### Schema: `DockerComposeBuildSchema`

### Input params

| Param              | Type                   | Required | Notes                             |
| ------------------ | ---------------------- | -------- | --------------------------------- |
| `path`             | string                 | no       | Directory with docker-compose.yml |
| `services`         | string[]               | no       | Specific services to build        |
| `file`             | string                 | no       | Compose file path                 |
| `noCache`          | boolean                | no       | Default: false                    |
| `pull`             | boolean                | no       | Default: false                    |
| `buildArgs`        | Record<string, string> | no       | Key-value build args              |
| `push`             | boolean                | no       | Default: false                    |
| `ssh`              | string                 | no       | SSH agent socket                  |
| `builder`          | string                 | no       | Alternate builder                 |
| `withDependencies` | boolean                | no       | Default: false                    |
| `quiet`            | boolean                | no       | Default: false                    |
| `dryRun`           | boolean                | no       | Default: false                    |
| `check`            | boolean                | no       | Default: false                    |
| `compact`          | boolean                | no       | Default: true                     |

### Scenarios

| #   | Scenario                          | Params                                | Expected Output                                                    | Priority | Status |
| --- | --------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | -------- | ------ |
| 1   | Build all services                | `{ path }`                            | `{ success: true, built: N, failed: 0 }`                           | P0       | mocked |
| 2   | Build specific service            | `{ path, services: ["web"] }`         | `{ success: true, services: [{ service: "web", success: true }] }` | P0       | mocked |
| 3   | No compose file found             | `{ path: "/tmp/empty" }`              | Error thrown: "docker compose build failed"                        | P0       | mocked |
| 4   | Flag injection on `file`          | `{ file: "--exec=evil" }`             | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 5   | Flag injection on `services`      | `{ services: ["--exec=evil"] }`       | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 6   | Flag injection on `ssh`           | `{ ssh: "--exec=evil" }`              | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 7   | Flag injection on `builder`       | `{ builder: "--exec=evil" }`          | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 8   | Flag injection on `buildArgs` key | `{ buildArgs: { "--exec": "evil" } }` | `assertNoFlagInjection` throws                                     | P0       | mocked |
| 9   | Build with noCache                | `{ path, noCache: true }`             | `{ success: true }`                                                | P1       | mocked |
| 10  | Dry run mode                      | `{ path, dryRun: true }`              | `{ success: true }` without actual build                           | P1       | mocked |
| 11  | Schema validation                 | all                                   | Zod parse succeeds against `DockerComposeBuildSchema`              | P0       | mocked |

### Summary: 11 scenarios (P0: 7, P1: 2, P2: 0)

---

## Tool: `compose-down`

### Implementation: `packages/server-docker/src/tools/compose-down.ts`

### Schema: `DockerComposeDownSchema`

### Input params

| Param           | Type             | Required | Notes                             |
| --------------- | ---------------- | -------- | --------------------------------- |
| `path`          | string           | yes      | Directory with docker-compose.yml |
| `volumes`       | boolean          | no       | Remove named volumes              |
| `removeOrphans` | boolean          | no       | Remove orphan containers          |
| `file`          | string           | no       | Compose file path                 |
| `rmi`           | "all" \| "local" | no       | Remove images                     |
| `services`      | string[]         | no       | Specific services                 |
| `timeout`       | number           | no       | Shutdown timeout                  |
| `dryRun`        | boolean          | no       | Default: false                    |
| `compact`       | boolean          | no       | Default: true                     |

### Scenarios

| #   | Scenario                      | Params                                | Expected Output                                      | Priority | Status |
| --- | ----------------------------- | ------------------------------------- | ---------------------------------------------------- | -------- | ------ |
| 1   | Tear down all services        | `{ path }`                            | `{ success: true, stopped: N, removed: N }`          | P0       | mocked |
| 2   | Down with no running services | `{ path }`                            | `{ success: true, stopped: 0, removed: 0 }`          | P0       | mocked |
| 3   | No compose file found         | `{ path: "/tmp/empty" }`              | Error thrown                                         | P0       | mocked |
| 4   | Flag injection on `file`      | `{ path, file: "--exec=evil" }`       | `assertNoFlagInjection` throws                       | P0       | mocked |
| 5   | Flag injection on `services`  | `{ path, services: ["--exec=evil"] }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 6   | Down with volumes             | `{ path, volumes: true }`             | `{ volumesRemoved: N }`                              | P1       | mocked |
| 7   | Down with removeOrphans       | `{ path, removeOrphans: true }`       | `{ success: true }`                                  | P1       | mocked |
| 8   | Down with rmi: "all"          | `{ path, rmi: "all" }`                | Images removed                                       | P2       | mocked |
| 9   | Schema validation             | all                                   | Zod parse succeeds against `DockerComposeDownSchema` | P0       | mocked |

### Summary: 9 scenarios (P0: 5, P1: 2, P2: 1)

---

## Tool: `compose-logs`

### Implementation: `packages/server-docker/src/tools/compose-logs.ts`

### Schema: `DockerComposeLogsSchema`

### Input params

| Param         | Type     | Required | Notes                              |
| ------------- | -------- | -------- | ---------------------------------- |
| `path`        | string   | no       | Directory with docker-compose.yml  |
| `services`    | string[] | no       | Specific services                  |
| `file`        | string   | no       | Compose file path                  |
| `tail`        | number   | no       | Lines per service                  |
| `limit`       | number   | no       | Max parsed entries (default: 1000) |
| `since`       | string   | no       | Timestamp filter                   |
| `until`       | string   | no       | Timestamp filter                   |
| `timestamps`  | boolean  | no       | Default: true                      |
| `follow`      | boolean  | no       | Default: false                     |
| `index`       | number   | no       | Replica index                      |
| `noLogPrefix` | boolean  | no       | Default: false                     |
| `compact`     | boolean  | no       | Default: true                      |

### Scenarios

| #   | Scenario                      | Params                          | Expected Output                                      | Priority | Status |
| --- | ----------------------------- | ------------------------------- | ---------------------------------------------------- | -------- | ------ |
| 1   | Get logs for all services     | `{ path }`                      | `{ services: [...], entries: [...], total: N }`      | P0       | mocked |
| 2   | Get logs for specific service | `{ path, services: ["web"] }`   | Entries filtered to "web"                            | P0       | mocked |
| 3   | No running services           | `{ path }`                      | `{ services: [], entries: [], total: 0 }`            | P0       | mocked |
| 4   | Flag injection on `file`      | `{ file: "--exec=evil" }`       | `assertNoFlagInjection` throws                       | P0       | mocked |
| 5   | Flag injection on `since`     | `{ since: "--exec=evil" }`      | `assertNoFlagInjection` throws                       | P0       | mocked |
| 6   | Flag injection on `until`     | `{ until: "--exec=evil" }`      | `assertNoFlagInjection` throws                       | P0       | mocked |
| 7   | Flag injection on `services`  | `{ services: ["--exec=evil"] }` | `assertNoFlagInjection` throws                       | P0       | mocked |
| 8   | Logs with tail limit          | `{ path, tail: 10 }`            | At most 10 lines per service                         | P1       | mocked |
| 9   | Logs with since filter        | `{ path, since: "10m" }`        | Only recent entries                                  | P1       | mocked |
| 10  | Truncation with limit         | `{ path, limit: 5 }`            | `{ isTruncated: true }` when more available          | P1       | mocked |
| 11  | Schema validation             | all                             | Zod parse succeeds against `DockerComposeLogsSchema` | P0       | mocked |

### Summary: 11 scenarios (P0: 6, P1: 3, P2: 0)

---

## Tool: `compose-ps`

### Implementation: `packages/server-docker/src/tools/compose-ps.ts`

### Schema: `DockerComposePsSchema`

### Input params

| Param      | Type     | Required | Notes                             |
| ---------- | -------- | -------- | --------------------------------- |
| `path`     | string   | no       | Directory with docker-compose.yml |
| `file`     | string   | no       | Compose file path                 |
| `services` | string[] | no       | Filter to specific services       |
| `status`   | string[] | no       | Filter by status                  |
| `filter`   | string   | no       | Generic property filter           |
| `all`      | boolean  | no       | Show stopped containers           |
| `noTrunc`  | boolean  | no       | Default: false                    |
| `compact`  | boolean  | no       | Default: true                     |

### Scenarios

| #   | Scenario                     | Params                          | Expected Output                                    | Priority | Status |
| --- | ---------------------------- | ------------------------------- | -------------------------------------------------- | -------- | ------ |
| 1   | List running services        | `{ path }`                      | `{ services: [...], total: N, running: N }`        | P0       | mocked |
| 2   | No services running          | `{ path }`                      | `{ services: [], total: 0 }`                       | P0       | mocked |
| 3   | Flag injection on `file`     | `{ file: "--exec=evil" }`       | `assertNoFlagInjection` throws                     | P0       | mocked |
| 4   | Flag injection on `services` | `{ services: ["--exec=evil"] }` | `assertNoFlagInjection` throws                     | P0       | mocked |
| 5   | Flag injection on `filter`   | `{ filter: "--exec=evil" }`     | `assertNoFlagInjection` throws                     | P0       | mocked |
| 6   | Flag injection on `status`   | `{ status: ["--exec=evil"] }`   | `assertNoFlagInjection` throws                     | P0       | mocked |
| 7   | Filter by status             | `{ path, status: ["running"] }` | Only running services                              | P1       | mocked |
| 8   | Show all including stopped   | `{ path, all: true }`           | Includes stopped containers                        | P1       | mocked |
| 9   | Schema validation            | all                             | Zod parse succeeds against `DockerComposePsSchema` | P0       | mocked |

### Summary: 9 scenarios (P0: 6, P1: 2, P2: 0)

---

## Tool: `compose-up`

### Implementation: `packages/server-docker/src/tools/compose-up.ts`

### Schema: `DockerComposeUpSchema`

### Input params

| Param              | Type                             | Required | Notes                             |
| ------------------ | -------------------------------- | -------- | --------------------------------- |
| `path`             | string                           | yes      | Directory with docker-compose.yml |
| `services`         | string[]                         | no       | Specific services                 |
| `scale`            | Record<string, number>           | no       | Per-service scale map             |
| `detach`           | boolean                          | no       | Default: true                     |
| `build`            | boolean                          | no       | Default: false                    |
| `file`             | string                           | no       | Compose file path                 |
| `pull`             | "always" \| "missing" \| "never" | no       | Pull policy                       |
| `wait`             | boolean                          | no       | Default: false                    |
| `forceRecreate`    | boolean                          | no       | Default: false                    |
| `timeout`          | number                           | no       | Startup timeout                   |
| `noRecreate`       | boolean                          | no       | Default: false                    |
| `noDeps`           | boolean                          | no       | Default: false                    |
| `removeOrphans`    | boolean                          | no       | Default: false                    |
| `waitTimeout`      | number                           | no       | Wait timeout                      |
| `renewAnonVolumes` | boolean                          | no       | Default: false                    |
| `dryRun`           | boolean                          | no       | Default: false                    |
| `compact`          | boolean                          | no       | Default: true                     |

### Scenarios

| #   | Scenario                       | Params                                | Expected Output                                    | Priority | Status |
| --- | ------------------------------ | ------------------------------------- | -------------------------------------------------- | -------- | ------ |
| 1   | Start all services             | `{ path }`                            | `{ success: true, started: N }`                    | P0       | mocked |
| 2   | Start specific service         | `{ path, services: ["web"] }`         | `{ success: true, services: ["web"] }`             | P0       | mocked |
| 3   | No compose file                | `{ path: "/tmp/empty" }`              | Error thrown                                       | P0       | mocked |
| 4   | Flag injection on `file`       | `{ path, file: "--exec=evil" }`       | `assertNoFlagInjection` throws                     | P0       | mocked |
| 5   | Flag injection on `services`   | `{ path, services: ["--exec=evil"] }` | `assertNoFlagInjection` throws                     | P0       | mocked |
| 6   | Flag injection on `scale` key  | `{ path, scale: { "--evil": 1 } }`    | `assertNoFlagInjection` throws                     | P0       | mocked |
| 7   | Invalid scale value (negative) | `{ path, scale: { "web": -1 } }`      | Error thrown: "non-negative integers"              | P0       | mocked |
| 8   | Up with build flag             | `{ path, build: true }`               | `{ success: true }`                                | P1       | mocked |
| 9   | Up with forceRecreate          | `{ path, forceRecreate: true }`       | `{ success: true }`                                | P1       | mocked |
| 10  | Dry run mode                   | `{ path, dryRun: true }`              | `{ success: true }` without starting               | P1       | mocked |
| 11  | Up with scale                  | `{ path, scale: { "web": 3 } }`       | `{ started: 3 }`                                   | P2       | mocked |
| 12  | Schema validation              | all                                   | Zod parse succeeds against `DockerComposeUpSchema` | P0       | mocked |

### Summary: 12 scenarios (P0: 7, P1: 3, P2: 1)

---

## Tool: `exec`

### Implementation: `packages/server-docker/src/tools/exec.ts`

### Schema: `DockerExecSchema`

### Input params

| Param       | Type     | Required | Notes                              |
| ----------- | -------- | -------- | ---------------------------------- |
| `container` | string   | yes      | Container name or ID               |
| `command`   | string[] | yes      | Command to execute                 |
| `workdir`   | string   | no       | Working directory inside container |
| `user`      | string   | no       | User to run as                     |
| `env`       | string[] | no       | Environment variables              |
| `envFile`   | string   | no       | Env file path                      |
| `detach`    | boolean  | no       | Default: false                     |
| `timeout`   | number   | no       | 1000-600000 ms                     |
| `parseJson` | boolean  | no       | Default: false                     |
| `limit`     | number   | no       | Max stdout chars                   |
| `path`      | string   | no       | Host working directory             |
| `compact`   | boolean  | no       | Default: true                      |

### Scenarios

| #   | Scenario                         | Params                                                         | Expected Output                                 | Priority | Status |
| --- | -------------------------------- | -------------------------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | Execute simple command           | `{ container: "mycontainer", command: ["ls", "-la"] }`         | `{ exitCode: 0, success: true, stdout: "..." }` | P0       | mocked |
| 2   | Command failure (exit code != 0) | `{ container: "c", command: ["false"] }`                       | `{ exitCode: 1, success: false }`               | P0       | mocked |
| 3   | Empty command array              | `{ container: "c", command: [] }`                              | Error thrown: "command array must not be empty" | P0       | mocked |
| 4   | Container not found              | `{ container: "nonexistent", command: ["ls"] }`                | Error thrown                                    | P0       | mocked |
| 5   | Flag injection on `container`    | `{ container: "--exec=evil", command: ["ls"] }`                | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection on `command[0]`   | `{ container: "c", command: ["--evil"] }`                      | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | Flag injection on `workdir`      | `{ container: "c", command: ["ls"], workdir: "--exec=evil" }`  | `assertNoFlagInjection` throws                  | P0       | mocked |
| 8   | Flag injection on `user`         | `{ container: "c", command: ["ls"], user: "--exec=evil" }`     | `assertNoFlagInjection` throws                  | P0       | mocked |
| 9   | Flag injection on `env`          | `{ container: "c", command: ["ls"], env: ["--exec=evil"] }`    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 10  | Flag injection on `envFile`      | `{ container: "c", command: ["ls"], envFile: "--exec=evil" }`  | `assertNoFlagInjection` throws                  | P0       | mocked |
| 11  | Command timeout                  | `{ container: "c", command: ["sleep", "999"], timeout: 1000 }` | `{ timedOut: true, exitCode: 124 }`             | P1       | mocked |
| 12  | Output truncation with limit     | `{ container: "c", command: ["cat", "big"], limit: 100 }`      | `{ isTruncated: true }`                         | P1       | mocked |
| 13  | Parse JSON output                | `{ container: "c", command: ["echo", "{}"], parseJson: true }` | `{ json: {} }`                                  | P1       | mocked |
| 14  | Schema validation                | all                                                            | Zod parse succeeds against `DockerExecSchema`   | P0       | mocked |

### Summary: 14 scenarios (P0: 9, P1: 3, P2: 0)

---

## Tool: `images`

### Implementation: `packages/server-docker/src/tools/images.ts`

### Schema: `DockerImagesSchema`

### Input params

| Param        | Type    | Required | Notes                     |
| ------------ | ------- | -------- | ------------------------- |
| `all`        | boolean | no       | Include intermediates     |
| `reference`  | string  | no       | Filter by image reference |
| `filterExpr` | string  | no       | Key-value filter          |
| `digests`    | boolean | no       | Show digests              |
| `noTrunc`    | boolean | no       | Full IDs                  |
| `compact`    | boolean | no       | Default: true             |

### Scenarios

| #   | Scenario                       | Params                            | Expected Output                                 | Priority | Status |
| --- | ------------------------------ | --------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | List all images                | `{}`                              | `{ images: [...], total: N }`                   | P0       | mocked |
| 2   | No images present              | `{}`                              | `{ images: [], total: 0 }`                      | P0       | mocked |
| 3   | Flag injection on `reference`  | `{ reference: "--exec=evil" }`    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 4   | Flag injection on `filterExpr` | `{ filterExpr: "--exec=evil" }`   | `assertNoFlagInjection` throws                  | P0       | mocked |
| 5   | Filter by reference            | `{ reference: "nginx" }`          | Only nginx images                               | P1       | mocked |
| 6   | Filter with filterExpr         | `{ filterExpr: "dangling=true" }` | Only dangling images                            | P1       | mocked |
| 7   | Show digests                   | `{ digests: true }`               | `digest` field populated                        | P2       | mocked |
| 8   | Schema validation              | all                               | Zod parse succeeds against `DockerImagesSchema` | P0       | mocked |

### Summary: 8 scenarios (P0: 4, P1: 2, P2: 1)

---

## Tool: `inspect`

### Implementation: `packages/server-docker/src/tools/inspect.ts`

### Schema: `DockerInspectSchema`

### Input params

| Param     | Type                                            | Required | Notes                |
| --------- | ----------------------------------------------- | -------- | -------------------- |
| `target`  | string \| string[]                              | yes      | Target(s) to inspect |
| `type`    | "container" \| "image" \| "volume" \| "network" | no       | Object type          |
| `size`    | boolean                                         | no       | Display file sizes   |
| `path`    | string                                          | no       | Working directory    |
| `compact` | boolean                                         | no       | Default: true        |

### Scenarios

| #   | Scenario                   | Params                                      | Expected Output                                        | Priority | Status |
| --- | -------------------------- | ------------------------------------------- | ------------------------------------------------------ | -------- | ------ |
| 1   | Inspect running container  | `{ target: "mycontainer" }`                 | `{ id: "...", name: "...", state: { running: true } }` | P0       | mocked |
| 2   | Inspect image              | `{ target: "nginx:latest", type: "image" }` | `{ inspectType: "image", repoTags: [...] }`            | P0       | mocked |
| 3   | Target not found           | `{ target: "nonexistent" }`                 | Error thrown: "docker inspect failed"                  | P0       | mocked |
| 4   | Empty result               | `{ target: "nonexistent" }`                 | Error thrown: "docker inspect returned no objects"     | P0       | mocked |
| 5   | Flag injection on `target` | `{ target: "--exec=evil" }`                 | `assertNoFlagInjection` throws                         | P0       | mocked |
| 6   | Multiple targets           | `{ target: ["c1", "c2"] }`                  | `relatedTargets` array populated                       | P1       | mocked |
| 7   | Inspect network            | `{ target: "bridge", type: "network" }`     | `{ inspectType: "network", driver: "bridge" }`         | P1       | mocked |
| 8   | Inspect volume             | `{ target: "myvol", type: "volume" }`       | `{ inspectType: "volume" }`                            | P1       | mocked |
| 9   | Schema validation          | all                                         | Zod parse succeeds against `DockerInspectSchema`       | P0       | mocked |

### Summary: 9 scenarios (P0: 6, P1: 3, P2: 0)

---

## Tool: `logs`

### Implementation: `packages/server-docker/src/tools/logs.ts`

### Schema: `DockerLogsSchema`

### Input params

| Param        | Type    | Required | Notes                |
| ------------ | ------- | -------- | -------------------- |
| `container`  | string  | yes      | Container name or ID |
| `tail`       | number  | no       | Default: 100         |
| `since`      | string  | no       | Timestamp filter     |
| `until`      | string  | no       | Timestamp filter     |
| `limit`      | number  | no       | Max lines in output  |
| `timestamps` | boolean | no       | Default: false       |
| `details`    | boolean | no       | Default: false       |
| `compact`    | boolean | no       | Default: true        |

### Scenarios

| #   | Scenario                      | Params                                     | Expected Output                                        | Priority | Status |
| --- | ----------------------------- | ------------------------------------------ | ------------------------------------------------------ | -------- | ------ |
| 1   | Get container logs            | `{ container: "mycontainer" }`             | `{ container: "mycontainer", lines: [...], total: N }` | P0       | mocked |
| 2   | Container with no logs        | `{ container: "empty" }`                   | `{ total: 0 }`                                         | P0       | mocked |
| 3   | Container not found           | `{ container: "nonexistent" }`             | Error thrown                                           | P0       | mocked |
| 4   | Flag injection on `container` | `{ container: "--exec=evil" }`             | `assertNoFlagInjection` throws                         | P0       | mocked |
| 5   | Flag injection on `since`     | `{ container: "c", since: "--exec=evil" }` | `assertNoFlagInjection` throws                         | P0       | mocked |
| 6   | Flag injection on `until`     | `{ container: "c", until: "--exec=evil" }` | `assertNoFlagInjection` throws                         | P0       | mocked |
| 7   | Logs with tail                | `{ container: "c", tail: 10 }`             | At most 10 lines                                       | P1       | mocked |
| 8   | Logs with limit truncation    | `{ container: "c", limit: 5 }`             | `{ isTruncated: true }`                                | P1       | mocked |
| 9   | Logs with timestamps          | `{ container: "c", timestamps: true }`     | `entries[].timestamp` populated                        | P1       | mocked |
| 10  | Schema validation             | all                                        | Zod parse succeeds against `DockerLogsSchema`          | P0       | mocked |

### Summary: 10 scenarios (P0: 6, P1: 3, P2: 0)

---

## Tool: `network-ls`

### Implementation: `packages/server-docker/src/tools/network-ls.ts`

### Schema: `DockerNetworkLsSchema`

### Input params

| Param     | Type               | Required | Notes                        |
| --------- | ------------------ | -------- | ---------------------------- |
| `path`    | string             | no       | Working directory            |
| `filter`  | string \| string[] | no       | Filter by driver, name, etc. |
| `noTrunc` | boolean            | no       | Default: false               |
| `compact` | boolean            | no       | Default: true                |

### Scenarios

| #   | Scenario                          | Params                                         | Expected Output                                                       | Priority | Status |
| --- | --------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- | -------- | ------ |
| 1   | List all networks                 | `{}`                                           | `{ networks: [...], total: N }` (includes default bridge, host, none) | P0       | mocked |
| 2   | Empty output (no custom networks) | `{}`                                           | `{ networks: [...], total: >= 3 }` (defaults always exist)            | P0       | mocked |
| 3   | Flag injection on `filter`        | `{ filter: "--exec=evil" }`                    | `assertNoFlagInjection` throws                                        | P0       | mocked |
| 4   | Filter by driver                  | `{ filter: "driver=bridge" }`                  | Only bridge networks                                                  | P1       | mocked |
| 5   | Multiple filters                  | `{ filter: ["driver=bridge", "scope=local"] }` | Intersection of filters                                               | P1       | mocked |
| 6   | Schema validation                 | all                                            | Zod parse succeeds against `DockerNetworkLsSchema`                    | P0       | mocked |

### Summary: 6 scenarios (P0: 4, P1: 2, P2: 0)

---

## Tool: `ps`

### Implementation: `packages/server-docker/src/tools/ps.ts`

### Schema: `DockerPsSchema`

### Input params

| Param     | Type    | Required | Notes              |
| --------- | ------- | -------- | ------------------ |
| `all`     | boolean | no       | Default: true      |
| `last`    | number  | no       | Show N most recent |
| `size`    | boolean | no       | Default: false     |
| `filter`  | string  | no       | Filter expression  |
| `compact` | boolean | no       | Default: true      |

### Scenarios

| #   | Scenario                   | Params                         | Expected Output                                           | Priority | Status |
| --- | -------------------------- | ------------------------------ | --------------------------------------------------------- | -------- | ------ |
| 1   | List containers            | `{}`                           | `{ containers: [...], total: N, running: N, stopped: N }` | P0       | mocked |
| 2   | No containers              | `{}`                           | `{ containers: [], total: 0, running: 0, stopped: 0 }`    | P0       | mocked |
| 3   | Flag injection on `filter` | `{ filter: "--exec=evil" }`    | `assertNoFlagInjection` throws                            | P0       | mocked |
| 4   | Filter by status           | `{ filter: "status=running" }` | Only running containers                                   | P1       | mocked |
| 5   | Show last N                | `{ last: 1 }`                  | At most 1 container                                       | P1       | mocked |
| 6   | Show sizes                 | `{ size: true }`               | Size info in output                                       | P2       | mocked |
| 7   | Schema validation          | all                            | Zod parse succeeds against `DockerPsSchema`               | P0       | mocked |

### Summary: 7 scenarios (P0: 4, P1: 2, P2: 1)

---

## Tool: `pull`

### Implementation: `packages/server-docker/src/tools/pull.ts`

### Schema: `DockerPullSchema`

### Input params

| Param      | Type    | Required | Notes             |
| ---------- | ------- | -------- | ----------------- |
| `image`    | string  | yes      | Image to pull     |
| `platform` | string  | no       | Target platform   |
| `allTags`  | boolean | no       | Default: false    |
| `quiet`    | boolean | no       | Default: false    |
| `path`     | string  | no       | Working directory |
| `compact`  | boolean | no       | Default: true     |

### Scenarios

| #   | Scenario                     | Params                                         | Expected Output                                                       | Priority | Status |
| --- | ---------------------------- | ---------------------------------------------- | --------------------------------------------------------------------- | -------- | ------ |
| 1   | Pull existing image          | `{ image: "alpine:latest" }`                   | `{ status: "pulled", success: true, image: "alpine", tag: "latest" }` | P0       | mocked |
| 2   | Pull already up-to-date      | `{ image: "alpine:latest" }`                   | `{ status: "up-to-date", success: true }`                             | P0       | mocked |
| 3   | Pull nonexistent image       | `{ image: "nonexistent/image:99" }`            | `{ status: "error", success: false, errorType: "not-found" }`         | P0       | mocked |
| 4   | Flag injection on `image`    | `{ image: "--exec=evil" }`                     | `assertNoFlagInjection` throws                                        | P0       | mocked |
| 5   | Flag injection on `platform` | `{ image: "alpine", platform: "--exec=evil" }` | `assertNoFlagInjection` throws                                        | P0       | mocked |
| 6   | Pull with platform           | `{ image: "alpine", platform: "linux/arm64" }` | `{ success: true }`                                                   | P1       | mocked |
| 7   | Schema validation            | all                                            | Zod parse succeeds against `DockerPullSchema`                         | P0       | mocked |

### Summary: 7 scenarios (P0: 5, P1: 1, P2: 0)

---

## Tool: `run`

### Implementation: `packages/server-docker/src/tools/run.ts`

### Schema: `DockerRunSchema`

### Input params

| Param        | Type     | Required | Notes                 |
| ------------ | -------- | -------- | --------------------- |
| `image`      | string   | yes      | Image to run          |
| `name`       | string   | no       | Container name        |
| `ports`      | string[] | no       | Port mappings         |
| `volumes`    | string[] | no       | Volume mounts         |
| `env`        | string[] | no       | Environment variables |
| `envFile`    | string   | no       | Env file path         |
| `detach`     | boolean  | no       | Default: true         |
| `rm`         | boolean  | no       | Default: false        |
| `command`    | string[] | no       | Command to run        |
| `workdir`    | string   | no       | Container workdir     |
| `network`    | string   | no       | Network to connect    |
| `platform`   | string   | no       | Target platform       |
| `entrypoint` | string   | no       | Override entrypoint   |
| `user`       | string   | no       | Run as user           |
| `restart`    | enum     | no       | Restart policy        |
| `memory`     | string   | no       | Memory limit          |
| `hostname`   | string   | no       | Container hostname    |
| `shmSize`    | string   | no       | /dev/shm size         |
| `pull`       | enum     | no       | Pull policy           |
| `cpus`       | number   | no       | CPU allocation        |
| `readOnly`   | boolean  | no       | Default: false        |
| `path`       | string   | no       | Working directory     |
| `compact`    | boolean  | no       | Default: true         |

### Scenarios

| #   | Scenario                        | Params                                                                  | Expected Output                                                 | Priority | Status |
| --- | ------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- | -------- | ------ |
| 1   | Run detached container          | `{ image: "nginx:latest" }`                                             | `{ containerId: "...", image: "nginx:latest", detached: true }` | P0       | mocked |
| 2   | Image not found error           | `{ image: "nonexistent:99" }`                                           | `{ errorCategory: "image-not-found" }`                          | P0       | mocked |
| 3   | Non-detached run with exit code | `{ image: "alpine", command: ["echo", "hi"], detach: false, rm: true }` | `{ exitCode: 0, stdout: "hi" }`                                 | P0       | mocked |
| 4   | Flag injection on `image`       | `{ image: "--exec=evil" }`                                              | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 5   | Flag injection on `name`        | `{ image: "alpine", name: "--exec=evil" }`                              | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 6   | Flag injection on `workdir`     | `{ image: "alpine", workdir: "--exec=evil" }`                           | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 7   | Flag injection on `network`     | `{ image: "alpine", network: "--exec=evil" }`                           | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 8   | Flag injection on `volumes`     | `{ image: "alpine", volumes: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 9   | Flag injection on `env`         | `{ image: "alpine", env: ["--exec=evil"] }`                             | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 10  | Flag injection on `command[0]`  | `{ image: "alpine", command: ["--evil"] }`                              | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 11  | Flag injection on `entrypoint`  | `{ image: "alpine", entrypoint: "--exec=evil" }`                        | `assertNoFlagInjection` throws                                  | P0       | mocked |
| 12  | Run with port mapping           | `{ image: "nginx", ports: ["8080:80"] }`                                | `{ containerId: "..." }`                                        | P1       | mocked |
| 13  | Run with environment vars       | `{ image: "alpine", env: ["FOO=bar"] }`                                 | `{ containerId: "..." }`                                        | P1       | mocked |
| 14  | Run with memory limit           | `{ image: "alpine", memory: "512m" }`                                   | `{ containerId: "..." }`                                        | P2       | mocked |
| 15  | Schema validation               | all                                                                     | Zod parse succeeds against `DockerRunSchema`                    | P0       | mocked |

### Summary: 15 scenarios (P0: 11, P1: 2, P2: 1)

---

## Tool: `stats`

### Implementation: `packages/server-docker/src/tools/stats.ts`

### Schema: `DockerStatsSchema`

### Input params

| Param        | Type     | Required | Notes                         |
| ------------ | -------- | -------- | ----------------------------- |
| `containers` | string[] | no       | Filter by container names/IDs |
| `all`        | boolean  | no       | Include stopped               |
| `noTrunc`    | boolean  | no       | Default: false                |
| `path`       | string   | no       | Working directory             |
| `compact`    | boolean  | no       | Default: true                 |

### Scenarios

| #   | Scenario                         | Params                            | Expected Output                                                  | Priority | Status |
| --- | -------------------------------- | --------------------------------- | ---------------------------------------------------------------- | -------- | ------ |
| 1   | Stats for running containers     | `{}`                              | `{ containers: [...], total: N }` with cpuPercent, memoryPercent | P0       | mocked |
| 2   | No running containers            | `{}`                              | `{ containers: [], total: 0 }`                                   | P0       | mocked |
| 3   | Flag injection on `containers`   | `{ containers: ["--exec=evil"] }` | `assertNoFlagInjection` throws                                   | P0       | mocked |
| 4   | Stats for specific container     | `{ containers: ["mycontainer"] }` | Single container stats                                           | P1       | mocked |
| 5   | All containers including stopped | `{ all: true }`                   | Includes stopped containers                                      | P1       | mocked |
| 6   | Schema validation                | all                               | Zod parse succeeds against `DockerStatsSchema`                   | P0       | mocked |

### Summary: 6 scenarios (P0: 4, P1: 2, P2: 0)

---

## Tool: `volume-ls`

### Implementation: `packages/server-docker/src/tools/volume-ls.ts`

### Schema: `DockerVolumeLsSchema`

### Input params

| Param     | Type               | Required | Notes                            |
| --------- | ------------------ | -------- | -------------------------------- |
| `path`    | string             | no       | Working directory                |
| `filter`  | string \| string[] | no       | Filter by dangling, driver, etc. |
| `cluster` | boolean            | no       | Swarm cluster volumes            |
| `compact` | boolean            | no       | Default: true                    |

### Scenarios

| #   | Scenario                   | Params                                          | Expected Output                                   | Priority | Status |
| --- | -------------------------- | ----------------------------------------------- | ------------------------------------------------- | -------- | ------ |
| 1   | List all volumes           | `{}`                                            | `{ volumes: [...], total: N }`                    | P0       | mocked |
| 2   | No volumes                 | `{}`                                            | `{ volumes: [], total: 0 }`                       | P0       | mocked |
| 3   | Flag injection on `filter` | `{ filter: "--exec=evil" }`                     | `assertNoFlagInjection` throws                    | P0       | mocked |
| 4   | Filter by dangling         | `{ filter: "dangling=true" }`                   | Only dangling volumes                             | P1       | mocked |
| 5   | Multiple filters           | `{ filter: ["dangling=true", "driver=local"] }` | Intersection                                      | P1       | mocked |
| 6   | Schema validation          | all                                             | Zod parse succeeds against `DockerVolumeLsSchema` | P0       | mocked |

### Summary: 6 scenarios (P0: 4, P1: 2, P2: 0)

---

## Grand Summary

| Tool          | P0     | P1     | P2    | Total   |
| ------------- | ------ | ------ | ----- | ------- |
| build         | 8      | 4      | 0     | 15      |
| compose-build | 7      | 2      | 0     | 11      |
| compose-down  | 5      | 2      | 1     | 9       |
| compose-logs  | 6      | 3      | 0     | 11      |
| compose-ps    | 6      | 2      | 0     | 9       |
| compose-up    | 7      | 3      | 1     | 12      |
| exec          | 9      | 3      | 0     | 14      |
| images        | 4      | 2      | 1     | 8       |
| inspect       | 6      | 3      | 0     | 9       |
| logs          | 6      | 3      | 0     | 10      |
| network-ls    | 4      | 2      | 0     | 6       |
| ps            | 4      | 2      | 1     | 7       |
| pull          | 5      | 1      | 0     | 7       |
| run           | 11     | 2      | 1     | 15      |
| stats         | 4      | 2      | 0     | 6       |
| volume-ls     | 4      | 2      | 0     | 6       |
| **Total**     | **96** | **38** | **5** | **145** |
