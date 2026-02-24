# Schema Optimization Audit Report

**Date**: 2026-02-24
**Branch**: `schema-optimizations`
**Scope**: All 30 Pare MCP server packages

## Executive Summary

A comprehensive audit of every Zod output schema across all Pare server packages identified **~208 wasteful fields** that don't serve meaningful purposes for coding agents. These fields represent an estimated **20-35% of structured output tokens** per tool invocation.

Removing or relocating these fields would reduce agent token consumption significantly while preserving all data needed for decision-making.

### Waste by Category

| Category                     | Count | Description                                                |
| ---------------------------- | ----- | ---------------------------------------------------------- |
| Derivable counts             | ~95   | `total` fields alongside arrays (agent computes `.length`) |
| Echo-back of inputs          | ~40   | Fields returning data the agent already provided           |
| Timing/duration data         | ~30   | Execution duration agents never act on                     |
| Human-display metadata       | ~25   | URLs, tags, categories, descriptions for human display     |
| Redundant status indicators  | ~8    | Both `success: boolean` AND `exitCode: number`             |
| Nested structure duplication | ~10   | Same data at multiple nesting levels                       |

### Recommended Actions

| Action                          | Fields | Token Impact |
| ------------------------------- | ------ | ------------ |
| **REMOVE** from schema entirely | ~140   | -25% tokens  |
| **MOVE** to formatters only     | ~55    | -10% tokens  |
| **CLARIFY** semantics           | ~5     | correctness  |
| **REPLACE** with better type    | ~3     | clarity      |

---

## Detailed Findings by Package

---

### 1. server-git (27 fields)

**Derivable Counts (17 fields):**

| Schema                  | Field            | Type      | Recommendation                             |
| ----------------------- | ---------------- | --------- | ------------------------------------------ |
| `GitLogSchema`          | `total`          | `number`  | REMOVE — derivable from `commits.length`   |
| `GitDiffSchema`         | `totalAdditions` | `number?` | REMOVE — sum of `files[].additions`        |
| `GitDiffSchema`         | `totalDeletions` | `number?` | REMOVE — sum of `files[].deletions`        |
| `GitDiffSchema`         | `totalFiles`     | `number`  | REMOVE — derivable from `files.length`     |
| `GitShowSchema.diff`    | `totalAdditions` | `number`  | REMOVE — same as GitDiffSchema             |
| `GitShowSchema.diff`    | `totalDeletions` | `number`  | REMOVE — same as GitDiffSchema             |
| `GitShowSchema.diff`    | `totalFiles`     | `number`  | REMOVE — same as GitDiffSchema             |
| `GitAddSchema`          | `staged`         | `number`  | REMOVE — derivable from `files.length`     |
| `GitAddSchema`          | `newlyStaged`    | `number?` | REMOVE — derivable from files array        |
| `GitTagSchema`          | `total`          | `number?` | REMOVE — derivable from `tags.length`      |
| `GitStashListSchema`    | `total`          | `number`  | REMOVE — derivable from `stashes.length`   |
| `GitRemoteSchema`       | `total`          | `number?` | REMOVE — derivable from `remotes.length`   |
| `GitBlameSchema`        | `totalLines`     | `number`  | REMOVE — derivable aggregate               |
| `GitReflogSchema`       | `total`          | `number`  | REMOVE — derivable from `entries.length`   |
| `GitLogGraphSchema`     | `total`          | `number`  | REMOVE — derivable from `commits.length`   |
| `GitWorktreeListSchema` | `total`          | `number`  | REMOVE — derivable from `worktrees.length` |
| `GitCleanSchema`        | `removedCount`   | `number`  | REMOVE — derivable from `files.length`     |

**Echo-back of Inputs (8 fields):**

| Schema              | Field        | Type      | Recommendation                                           |
| ------------------- | ------------ | --------- | -------------------------------------------------------- |
| `GitStashSchema`    | `action`     | `enum`    | MOVE to formatters — agent knows which action it invoked |
| `GitPushSchema`     | `remote`     | `string`  | MOVE to formatters — agent specified remote              |
| `GitPushSchema`     | `branch`     | `string`  | MOVE to formatters — agent specified branch              |
| `GitCheckoutSchema` | `ref`        | `string`  | MOVE to formatters — agent knows what ref it checked out |
| `GitArchiveSchema`  | `format`     | `string`  | MOVE to formatters — agent specified format              |
| `GitArchiveSchema`  | `outputFile` | `string`  | MOVE to formatters — agent specified output file         |
| `GitArchiveSchema`  | `treeish`    | `string`  | MOVE to formatters — agent specified treeish             |
| `GitCleanSchema`    | `dryRun`     | `boolean` | MOVE to formatters — agent specified dry-run flag        |

**Pagination Metadata (2 fields):**

| Schema            | Field            | Type      | Recommendation                          |
| ----------------- | ---------------- | --------- | --------------------------------------- |
| `GitReflogSchema` | `totalAvailable` | `number?` | MOVE to formatters — UI pagination only |

---

### 2. server-github (24 fields)

**Derivable Counts (13 fields):**

| Schema                       | Field            | Type      | Recommendation                               |
| ---------------------------- | ---------------- | --------- | -------------------------------------------- |
| `PrListResultSchema`         | `total`          | `number`  | REMOVE — derivable from `prs.length`         |
| `PrDiffResultSchema`         | `totalAdditions` | `number`  | REMOVE — sum of `files[].additions`          |
| `PrDiffResultSchema`         | `totalDeletions` | `number`  | REMOVE — sum of `files[].deletions`          |
| `PrDiffResultSchema`         | `totalFiles`     | `number`  | REMOVE — derivable from `files.length`       |
| `PrChecksResultSchema`       | `total`          | `number?` | REMOVE — duplicated in `summary`             |
| `PrChecksResultSchema`       | `passed`         | `number?` | REMOVE — duplicated in `summary`             |
| `PrChecksResultSchema`       | `failed`         | `number?` | REMOVE — duplicated in `summary`             |
| `PrChecksResultSchema`       | `pending`        | `number?` | REMOVE — duplicated in `summary`             |
| `IssueListResultSchema`      | `total`          | `number`  | REMOVE — derivable from `issues.length`      |
| `ReleaseListResultSchema`    | `total`          | `number`  | REMOVE — derivable from `releases.length`    |
| `LabelListResultSchema`      | `total`          | `number`  | REMOVE — derivable from `labels.length`      |
| `DiscussionListResultSchema` | `totalCount`     | `number`  | REMOVE — derivable from `discussions.length` |
| `ReleaseCreateResultSchema`  | `assetsUploaded` | `number?` | MOVE to formatters — confirmation count      |

**Echo-back of Inputs (9 fields):**

| Schema                    | Field           | Type             | Recommendation                                    |
| ------------------------- | --------------- | ---------------- | ------------------------------------------------- |
| `PrViewResultSchema`      | `url`           | `string`         | MOVE to formatters — constructible from PR number |
| `PrViewResultSchema`      | `headBranch`    | `string`         | MOVE to formatters — agent knows branches         |
| `PrViewResultSchema`      | `baseBranch`    | `string`         | MOVE to formatters — agent knows branches         |
| `PrCreateResultSchema`    | `title`         | `string?`        | MOVE to formatters — agent specified title        |
| `PrCreateResultSchema`    | `baseBranch`    | `string?`        | MOVE to formatters — agent specified base         |
| `PrCreateResultSchema`    | `headBranch`    | `string?`        | MOVE to formatters — agent specified head         |
| `PrMergeResultSchema`     | `url`           | `string`         | MOVE to formatters — derivable                    |
| `PrReviewResultSchema`    | `url`           | `string`         | MOVE to formatters — derivable                    |
| `IssueCreateResultSchema` | `labelsApplied` | `array<string>?` | MOVE to formatters — agent specified labels       |
| `CommentResultSchema`     | `body`          | `string?`        | MOVE to formatters — agent just submitted this    |

**Timing/Duration (1 field):**

| Schema                | Field             | Type      | Recommendation                            |
| --------------------- | ----------------- | --------- | ----------------------------------------- |
| `RunViewResultSchema` | `durationSeconds` | `number?` | REMOVE — agents don't act on run duration |

**Pagination Metadata (2 fields):**

| Schema                    | Field            | Type       | Recommendation                     |
| ------------------------- | ---------------- | ---------- | ---------------------------------- |
| `PrListResultSchema`      | `totalAvailable` | `number?`  | MOVE to formatters — UI pagination |
| `IssueListResultSchema`   | `totalAvailable` | `number?`  | MOVE to formatters — UI pagination |
| `IssueListResultSchema`   | `hasMore`        | `boolean?` | MOVE to formatters — UI pagination |
| `ReleaseListResultSchema` | `totalAvailable` | `number?`  | MOVE to formatters — UI pagination |

**Redundant Status (1 field):**

| Schema            | Field    | Type     | Recommendation                     |
| ----------------- | -------- | -------- | ---------------------------------- |
| `ApiResultSchema` | `status` | `number` | REMOVE — duplicate of `statusCode` |

---

### 3. server-npm (12 fields)

| Schema              | Field              | Type      | Category       | Recommendation                                |
| ------------------- | ------------------ | --------- | -------------- | --------------------------------------------- |
| `NpmInstallSchema`  | `duration`         | `number`  | Timing         | REMOVE                                        |
| `NpmInstallSchema`  | `packages`         | `number`  | Vague semantic | CLARIFY or REMOVE                             |
| `NpmAuditSchema`    | `summary` (counts) | `object`  | Derivable      | REMOVE — compute from `vulnerabilities` array |
| `NpmOutdatedSchema` | `total`            | `number`  | Derivable      | REMOVE — `packages.length`                    |
| `NpmListSchema`     | `total`            | `number`  | Derivable      | REMOVE — ambiguous semantic                   |
| `NpmRunSchema`      | `duration`         | `number`  | Timing         | REMOVE                                        |
| `NpmRunSchema`      | `script`           | `string`  | Echo-back      | MOVE to formatters                            |
| `NpmTestSchema`     | `duration`         | `number`  | Timing         | REMOVE                                        |
| `NpmSearchSchema`   | `total`            | `number`  | Derivable      | REMOVE — `packages.length`                    |
| `NpmSearchSchema`   | `registryTotal`    | `number?` | Pagination     | MOVE to formatters                            |
| `NpmInfoSchema`     | `dist.integrity`   | `string?` | Operational    | MOVE to formatters — SRI hash                 |
| `NpmInfoSchema`     | `deprecated`       | `string?` | Display        | REPLACE with `isDeprecated: boolean`          |
| `NvmResultSchema`   | `aliases`          | `record?` | Display        | REMOVE — implementation detail                |
| `NvmResultSchema`   | `arch`             | `string?` | Environmental  | MOVE to formatters                            |
| `NvmLsRemoteSchema` | `total`            | `number`  | Derivable      | REMOVE — `versions.length`                    |

---

### 4. server-build (26 fields)

| Schema                  | Field               | Type       | Category          | Recommendation                        |
| ----------------------- | ------------------- | ---------- | ----------------- | ------------------------------------- |
| `TscResultSchema`       | `total`             | `number?`  | Derivable         | REMOVE — `diagnostics.length`         |
| `TscResultSchema`       | `totalFiles`        | `number?`  | Human metadata    | MOVE to formatters                    |
| `TscResultSchema`       | `emittedFiles`      | `array?`   | Human display     | MOVE to formatters                    |
| `BuildResultSchema`     | `duration`          | `number`   | Timing            | REMOVE                                |
| `BuildResultSchema`     | `outputLines`       | `number?`  | Meta-about-output | REMOVE                                |
| `BuildResultSchema`     | `exitCode`          | `number`   | Redundant         | Make optional — keep `success`        |
| `EsbuildResultSchema`   | `duration`          | `number`   | Timing            | REMOVE                                |
| `EsbuildResultSchema`   | `outputFileStats`   | `array?`   | Derivable         | REMOVE — use metafile                 |
| `ViteBuildResultSchema` | `duration`          | `number`   | Timing            | REMOVE                                |
| `ViteOutputFileSchema`  | `sizeBytes`         | `number?`  | Derived           | REMOVE — redundant with `size` string |
| `ViteOutputFileSchema`  | `gzipBytes`         | `number?`  | Derived           | REMOVE — redundant with `size` string |
| `WebpackResultSchema`   | `duration`          | `number`   | Timing            | REMOVE                                |
| `WebpackChunkSchema`    | `entry`             | `boolean?` | Internal metadata | REMOVE                                |
| `TurboResultSchema`     | `summary`           | `record?`  | Vague/unreliable  | REMOVE — use explicit counts          |
| `TurboTaskSchema`       | `duration` (string) | `string?`  | Redundant         | REMOVE — keep `durationMs`            |
| `TurboResultSchema`     | `duration`          | `number`   | Timing            | REMOVE                                |
| `NxResultSchema`        | `duration`          | `number`   | Timing            | REMOVE                                |
| `NxTaskSchema`          | `cache`             | `enum`     | Ambiguous         | CLARIFY enum values                   |
| `NxResultSchema`        | `affectedProjects`  | `array?`   | Input metadata    | REMOVE                                |
| `LernaResultSchema`     | `action`            | `enum`     | Echo-back         | REMOVE                                |
| `LernaResultSchema`     | `duration`          | `number`   | Timing            | REMOVE                                |
| `RollupResultSchema`    | `duration`          | `number`   | Timing            | REMOVE                                |
| `RollupBundleSchema`    | `format`            | `string?`  | Derivable         | REMOVE — infer from filename          |

---

### 5. server-lint (9 fields)

| Schema                    | Field            | Type      | Category            | Recommendation                           |
| ------------------------- | ---------------- | --------- | ------------------- | ---------------------------------------- |
| `LintResultSchema`        | `total`          | `number`  | Derivable           | REMOVE — `errors + warnings`             |
| `LintDiagnosticSchema`    | `wikiUrl`        | `string?` | Human ref           | REMOVE — agents don't follow URLs        |
| `LintDiagnosticSchema`    | `suggestedFixes` | `array?`  | UI metadata         | REMOVE — agents use `--fix` flag         |
| `LintDiagnosticSchema`    | `tags`           | `array?`  | Rule categorization | REMOVE — `rule` + `severity` sufficient  |
| `LintResultSchema`        | `deprecations`   | `array?`  | Config feedback     | REMOVE — human-only                      |
| `FormatCheckResultSchema` | `total`          | `number`  | Derivable           | REMOVE — `files.length`                  |
| `FormatWriteResultSchema` | `filesUnchanged` | `number?` | Meta-feedback       | REMOVE — agents need `filesChanged` only |

---

### 6. server-test (5 fields)

| Schema              | Field              | Type       | Category       | Recommendation                                |
| ------------------- | ------------------ | ---------- | -------------- | --------------------------------------------- |
| `TestFailureSchema` | `stack`            | `string?`  | Debug metadata | REMOVE — keep in formatter only               |
| `TestRunSchema`     | `summary.duration` | `number`   | Timing         | KEEP (in summary, low impact)                 |
| `CoverageSchema`    | `meetsThreshold`   | `boolean?` | Computed flag  | REMOVE — agents should compare numeric values |

---

### 7. server-search (9 fields)

| Schema               | Field               | Type      | Category        | Recommendation                          |
| -------------------- | ------------------- | --------- | --------------- | --------------------------------------- |
| `SearchResultSchema` | `filesSearched`     | `number`  | Scope metadata  | REMOVE — search execution detail        |
| `SearchResultSchema` | `files` (summaries) | `array?`  | Denormalized    | REMOVE in full mode — keep compact only |
| `FindResultSchema`   | `total`             | `number`  | Derivable       | REMOVE — `files.length`                 |
| `FindFileSchema`     | `name`              | `string`  | Derivable       | REMOVE — basename of `path`             |
| `FindFileSchema`     | `ext`               | `string`  | Derivable       | REMOVE — extension from `path`          |
| `CountResultSchema`  | `totalFiles`        | `number`  | Derivable       | REMOVE — `files.length`                 |
| `JqResultSchema`     | `exitCode`          | `number`  | Lightweight     | KEEP                                    |
| `YqResultSchema`     | `outputFormat`      | `string?` | Format metadata | REMOVE                                  |

---

### 8. server-docker (32 fields)

**Derivable Counts (22 fields):**

| Schema                     | Field                                             | Recommendation                          |
| -------------------------- | ------------------------------------------------- | --------------------------------------- |
| `DockerPsSchema`           | `total`, `running`, `stopped`                     | REMOVE — filter/count from `containers` |
| `DockerBuildSchema`        | `steps`, `cacheHits`, `cacheMisses`, `errorCount` | REMOVE — derive from arrays             |
| `DockerLogsSchema`         | `total`, `totalLines`                             | REMOVE — derive from entries/lines      |
| `DockerImagesSchema`       | `total`                                           | REMOVE — `images.length`                |
| `DockerComposeUpSchema`    | `started`                                         | REMOVE — derive from `serviceStates`    |
| `DockerComposeDownSchema`  | `removed`                                         | REMOVE — derive from `containers`       |
| `DockerNetworkLsSchema`    | `total`                                           | REMOVE — `networks.length`              |
| `DockerVolumeLsSchema`     | `total`                                           | REMOVE — `volumes.length`               |
| `DockerComposePsSchema`    | `total`, `running`, `stopped`                     | REMOVE — filter from `services`         |
| `DockerComposeLogsSchema`  | `total`, `totalEntries`                           | REMOVE — derive from `entries`          |
| `DockerComposeBuildSchema` | `built`, `failed`                                 | REMOVE — filter from `services`         |
| `DockerStatsSchema`        | `total`                                           | REMOVE — `containers.length`            |

**Echo-back of Inputs (4 fields):**

| Schema             | Field          | Recommendation                     |
| ------------------ | -------------- | ---------------------------------- |
| `DockerLogsSchema` | `container`    | REMOVE — agent specified container |
| `DockerRunSchema`  | `image`        | REMOVE — agent specified image     |
| `DockerPullSchema` | `image`, `tag` | REMOVE — agent specified these     |

**Timing (3 fields):**

| Schema                     | Field      | Recommendation     |
| -------------------------- | ---------- | ------------------ |
| `DockerBuildSchema`        | `duration` | MOVE to formatters |
| `DockerExecSchema`         | `duration` | MOVE to formatters |
| `DockerComposeBuildSchema` | `duration` | MOVE to formatters |

**Redundant Status (1 field):**

| Schema             | Field     | Recommendation                  |
| ------------------ | --------- | ------------------------------- |
| `DockerExecSchema` | `success` | REMOVE — derive from `exitCode` |

**Other (2 fields):**

| Schema                    | Field                  | Recommendation                  |
| ------------------------- | ---------------------- | ------------------------------- |
| `DockerComposeLogsSchema` | `services` (name list) | REMOVE — derivable from entries |

---

### 9. server-python (21 fields)

| Schema                 | Field          | Type      | Category      | Recommendation                    |
| ---------------------- | -------------- | --------- | ------------- | --------------------------------- |
| `PipInstallSchema`     | `total`        | `number`  | Derivable     | REMOVE — `installed.length`       |
| `MypyResultSchema`     | `total`        | `number`  | Derivable     | REMOVE — `diagnostics.length`     |
| `MypyResultSchema`     | `errors`       | `number`  | Derivable     | REMOVE — filter diagnostics       |
| `MypyResultSchema`     | `warnings`     | `number`  | Derivable     | REMOVE — filter diagnostics       |
| `MypyResultSchema`     | `notes`        | `number`  | Derivable     | REMOVE — filter diagnostics       |
| `RuffResultSchema`     | `total`        | `number`  | Derivable     | REMOVE — `diagnostics.length`     |
| `RuffResultSchema`     | `fixable`      | `number`  | Derivable     | REMOVE — filter diagnostics       |
| `PipAuditResultSchema` | `total`        | `number`  | Derivable     | REMOVE — `vulnerabilities.length` |
| `PipAuditVulnSchema`   | `url`          | `string`  | Human display | MOVE to formatters                |
| `PipAuditVulnSchema`   | `aliases`      | `array`   | Human display | MOVE to formatters                |
| `PytestResultSchema`   | `total`        | `number`  | Derivable     | REMOVE — sum of pass/fail/skip    |
| `PytestResultSchema`   | `duration`     | `number`  | Timing        | MOVE to formatters                |
| `UvInstallSchema`      | `total`        | `number`  | Derivable     | REMOVE — `installed.length`       |
| `UvInstallSchema`      | `duration`     | `number`  | Timing        | MOVE to formatters                |
| `UvRunSchema`          | `duration`     | `number`  | Timing        | MOVE to formatters                |
| `BlackResultSchema`    | `filesChecked` | `number`  | Derivable     | REMOVE — `changed + unchanged`    |
| `PipListSchema`        | `total`        | `number`  | Derivable     | REMOVE — `packages.length`        |
| `CondaResultSchema`    | `action`       | `literal` | Echo-back     | REMOVE                            |
| `PoetryResultSchema`   | `action`       | `enum`    | Echo-back     | REMOVE                            |
| `PoetryResultSchema`   | `total`        | `number`  | Derivable     | REMOVE                            |

---

### 10. server-cargo (19 fields)

| Schema                    | Field        | Type      | Category           | Recommendation                        |
| ------------------------- | ------------ | --------- | ------------------ | ------------------------------------- |
| `CargoBuildResultSchema`  | `total`      | `number`  | Derivable          | REMOVE — `diagnostics.length`         |
| `CargoBuildResultSchema`  | `errors`     | `number`  | Derivable          | REMOVE — filter diagnostics           |
| `CargoBuildResultSchema`  | `warnings`   | `number`  | Derivable          | REMOVE — filter diagnostics           |
| `CargoCheckResultSchema`  | `mode`       | `literal` | Echo-back          | REMOVE                                |
| `CargoTestResultSchema`   | `total`      | `number`  | Derivable          | REMOVE — `passed + failed + ignored`  |
| `CargoTestResultSchema`   | `duration`   | `string`  | Timing             | MOVE to formatters                    |
| `CargoClippyResultSchema` | `total`      | `number`  | Derivable          | REMOVE — `diagnostics.length`         |
| `CargoClippyResultSchema` | `errors`     | `number`  | Derivable          | REMOVE — filter diagnostics           |
| `CargoClippyResultSchema` | `warnings`   | `number`  | Derivable          | REMOVE — filter diagnostics           |
| `CargoRunResultSchema`    | `signal`     | `string`  | Execution metadata | MOVE to formatters                    |
| `CargoAddResultSchema`    | `total`      | `number`  | Derivable          | REMOVE — `added.length`               |
| `CargoRemoveResultSchema` | `total`      | `number`  | Derivable          | REMOVE — `removed.length`             |
| `CargoUpdateResultSchema` | `output`     | `string`  | Raw fallback       | MOVE to error cases only              |
| `CargoTreeResultSchema`   | `tree`       | `string`  | Raw output         | MOVE to formatters                    |
| `CargoAuditVulnSchema`    | `url`        | `string`  | Human display      | MOVE to formatters                    |
| `CargoAuditVulnSchema`    | `date`       | `string`  | Human display      | MOVE to formatters                    |
| `CargoAuditVulnSchema`    | `cvssVector` | `string`  | Raw metadata       | MOVE to formatters — keep `cvssScore` |

---

### 11. server-go (12 fields)

| Schema                         | Field        | Type     | Category              | Recommendation                       |
| ------------------------------ | ------------ | -------- | --------------------- | ------------------------------------ |
| `GoBuildResultSchema`          | `total`      | `number` | Derivable             | REMOVE                               |
| `GoTestResultSchema`           | `total`      | `number` | Derivable             | REMOVE — `passed + failed + skipped` |
| `GoVetResultSchema`            | `total`      | `number` | Derivable             | REMOVE                               |
| `GoRunResultSchema`            | `signal`     | `string` | Execution metadata    | MOVE to formatters                   |
| `GoListResultSchema`           | `total`      | `number` | Derivable             | REMOVE                               |
| `GoGetResultSchema`            | `output`     | `string` | Raw fallback          | MOVE to error cases only             |
| `GolangciLintDiagnosticSchema` | `sourceLine` | `string` | Human display         | MOVE to formatters                   |
| `GolangciLintDiagnosticSchema` | `category`   | `enum`   | Derived metadata      | MOVE to formatters                   |
| `GolangciLintResultSchema`     | `byLinter`   | `array`  | Derivable aggregation | REMOVE — group from diagnostics      |

---

### 12. server-http (10 fields)

| Schema                   | Field             | Type      | Category      | Recommendation                  |
| ------------------------ | ----------------- | --------- | ------------- | ------------------------------- |
| `TimingDetailsSchema`    | `namelookup`      | `number`  | Timing detail | MOVE to formatters              |
| `TimingDetailsSchema`    | `connect`         | `number`  | Timing detail | MOVE to formatters              |
| `TimingDetailsSchema`    | `appconnect`      | `number?` | Timing detail | MOVE to formatters              |
| `TimingDetailsSchema`    | `pretransfer`     | `number?` | Timing detail | MOVE to formatters              |
| `TimingDetailsSchema`    | `starttransfer`   | `number?` | Timing detail | MOVE to formatters              |
| `HttpResponseSchema`     | `uploadSize`      | `number?` | Echo-back     | REMOVE                          |
| `HttpResponseSchema`     | `scheme`          | `string?` | Echo-back     | REMOVE — agent knows URL scheme |
| `HttpHeadResponseSchema` | `scheme`          | `string?` | Echo-back     | REMOVE                          |
| `HttpResponseSchema`     | `tlsVerifyResult` | `number?` | Cryptic code  | REPLACE with boolean or MOVE    |
| `HttpHeadResponseSchema` | `tlsVerifyResult` | `number?` | Cryptic code  | REPLACE with boolean or MOVE    |

---

### 13. server-k8s (23 fields)

**Echo-back of Inputs (15 fields):**

| Schema                        | Field                           | Recommendation                |
| ----------------------------- | ------------------------------- | ----------------------------- |
| `KubectlGetResultSchema`      | `resource`, `namespace`         | REMOVE / MOVE                 |
| `KubectlGetResultSchema`      | `names`                         | REMOVE — derivable from items |
| `KubectlDescribeResultSchema` | `resource`, `name`, `namespace` | REMOVE / MOVE                 |
| `KubectlLogsResultSchema`     | `pod`, `container`, `namespace` | REMOVE / MOVE                 |
| `HelmListResultSchema`        | `namespace`, `names`            | REMOVE / MOVE                 |
| `HelmStatusResultSchema`      | `name`, `namespace`, `notes`    | REMOVE / MOVE                 |
| `HelmInstallResultSchema`     | `name`                          | REMOVE                        |
| `HelmUpgradeResultSchema`     | `name`                          | REMOVE                        |
| `HelmUninstallResultSchema`   | `name`                          | REMOVE                        |
| `HelmRollbackResultSchema`    | `name`                          | REMOVE                        |
| `HelmHistoryResultSchema`     | `name`                          | REMOVE                        |

**Derivable Counts (5 fields):**

| Schema                    | Field       | Recommendation              |
| ------------------------- | ----------- | --------------------------- |
| `KubectlGetResultSchema`  | `total`     | REMOVE — `items.length`     |
| `KubectlLogsResultSchema` | `lineCount` | REMOVE — derivable          |
| `HelmListResultSchema`    | `total`     | REMOVE — `releases.length`  |
| `HelmHistoryResultSchema` | `total`     | REMOVE — `revisions.length` |

**Other (3 fields):**

| Schema                     | Field    | Recommendation                    |
| -------------------------- | -------- | --------------------------------- |
| `KubectlApplyResultSchema` | `output` | MOVE to formatters — raw output   |
| `HelmStatusResultSchema`   | `notes`  | MOVE to formatters — display only |

---

### 14. server-security (11 fields)

| Schema                     | Field                  | Type      | Category        | Recommendation      |
| -------------------------- | ---------------------- | --------- | --------------- | ------------------- |
| `TrivyVulnerabilitySchema` | `title`                | `string?` | Display         | MOVE to formatters  |
| `TrivyScanResultSchema`    | `totalVulnerabilities` | `number`  | Derivable       | REMOVE              |
| `SemgrepFindingSchema`     | `category`             | `string?` | Display         | MOVE to formatters  |
| `SemgrepScanResultSchema`  | `config`               | `string`  | Echo-back       | MOVE to formatters  |
| `SemgrepScanResultSchema`  | `totalFindings`        | `number`  | Derivable       | REMOVE              |
| `GitleaksFindingSchema`    | `description`          | `string`  | Display         | MOVE to formatters  |
| `GitleaksFindingSchema`    | `author`               | `string`  | Metadata        | MOVE to formatters  |
| `GitleaksFindingSchema`    | `date`                 | `string`  | Metadata        | MOVE to formatters  |
| `GitleaksSummarySchema`    | `ruleCounts`           | `record?` | Derivable       | REMOVE              |
| `GitleaksScanResultSchema` | `totalFindings`        | `number`  | Derivable (dup) | REMOVE one instance |

---

### 15. server-make (8 fields)

| Schema                 | Field       | Type       | Category       | Recommendation     |
| ---------------------- | ----------- | ---------- | -------------- | ------------------ |
| `MakeRunResultSchema`  | `target`    | `string`   | Echo-back      | MOVE to formatters |
| `MakeRunResultSchema`  | `tool`      | `enum`     | Echo-back      | MOVE to formatters |
| `MakeRunResultSchema`  | `duration`  | `number`   | Timing         | MOVE to formatters |
| `MakeRunResultSchema`  | `errorType` | `enum?`    | Categorization | MOVE to formatters |
| `MakeListResultSchema` | `total`     | `number`   | Derivable      | REMOVE             |
| `MakeListResultSchema` | `tool`      | `enum`     | Echo-back      | MOVE to formatters |
| `MakeTargetSchema`     | `isPhony`   | `boolean?` | Metadata       | MOVE to formatters |
| `MakeTargetSchema`     | `recipe`    | `array?`   | Display        | MOVE to formatters |

---

### 16. server-process (6 fields)

| Schema                   | Field                  | Type      | Category    | Recommendation     |
| ------------------------ | ---------------------- | --------- | ----------- | ------------------ |
| `ProcessRunResultSchema` | `command`              | `string`  | Echo-back   | REMOVE             |
| `ProcessRunResultSchema` | `duration`             | `number`  | Timing      | MOVE to formatters |
| `ProcessRunResultSchema` | `userCpuTimeMs`        | `number?` | Performance | MOVE to formatters |
| `ProcessRunResultSchema` | `systemCpuTimeMs`      | `number?` | Performance | MOVE to formatters |
| `ProcessRunResultSchema` | `stdoutTruncatedLines` | `number?` | Meta        | MOVE to formatters |
| `ProcessRunResultSchema` | `stderrTruncatedLines` | `number?` | Meta        | MOVE to formatters |

---

## Implementation Plan

### Phase 1: Derivable Counts (HIGH PRIORITY — ~95 fields)

Every `total` / count field alongside an array is waste. This is the single highest-impact change.

**Pattern**: Remove `total` fields from Zod schemas; compute in formatters via `array.length`.

**Affected packages**: ALL (every package has at least one).

**Risk**: Low. These fields are always computed from arrays that remain present.

### Phase 2: Timing/Duration (HIGH PRIORITY — ~30 fields)

Move all `duration`, `durationMs`, `durationSeconds` to formatter-only output. Keep timing data in the human-readable `content` text but omit from `structuredContent`.

**Affected packages**: build, npm, docker, python, cargo, go, make, process, http, github.

**Risk**: Low. No agent logic depends on timing.

### Phase 3: Echo-back of Inputs (MEDIUM PRIORITY — ~40 fields)

Remove fields that return data the agent already provided (command, script, target, image, branch, etc.).

**Affected packages**: git, github, npm, docker, k8s, make, process.

**Risk**: Medium. Some formatters depend on these for human-readable output. Must ensure formatters receive this data separately (from the tool input, not the parsed output).

### Phase 4: Human-Display Metadata (MEDIUM PRIORITY — ~25 fields)

Move URLs, tags, categories, descriptions, and other display-only fields to formatters.

**Affected packages**: lint, security, cargo, python, http, k8s.

**Risk**: Low-Medium. Formatters already have access to full parsed data.

### Phase 5: Redundant Status + Structural Duplication (LOW PRIORITY — ~18 fields)

- Standardize on either `success` or `exitCode` (not both)
- Remove PrChecksResultSchema top-level duplicate fields
- Clean up nested duplication in PipShowSchema

**Risk**: Medium. May require version bumps if consumers rely on specific field names.

---

## Token Savings Estimate

| Phase              | Fields Removed | Est. Token Savings |
| ------------------ | -------------- | ------------------ |
| Phase 1: Counts    | ~95            | 8-12%              |
| Phase 2: Timing    | ~30            | 5-8%               |
| Phase 3: Echo-back | ~40            | 5-8%               |
| Phase 4: Display   | ~25            | 3-5%               |
| Phase 5: Redundant | ~18            | 2-4%               |
| **Total**          | **~208**       | **23-37%**         |

These are conservative estimates based on typical field sizes. Actual savings will vary by tool — tools with large arrays (git log, docker ps, npm audit) will see the highest absolute savings from count removal.

---

## Notes

- All removals should be **minor version bumps** (not patch) since they remove fields from the output schema
- Formatters must be updated to compute removed fields locally for human-readable output
- Compact mode already omits many of these fields — this audit formalizes that pattern into the schema itself
- Consider adding a `schemaVersion` field to enable gradual migration
