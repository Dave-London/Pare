# Changelog

This is a monorepo with independent package versioning managed by [changesets](https://github.com/changesets/changesets).

Each package maintains its own changelog:

| Package                                                                | Changelog                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`@paretools/build`](https://www.npmjs.com/package/@paretools/build)   | [packages/server-build/CHANGELOG.md](packages/server-build/CHANGELOG.md)   |
| [`@paretools/cargo`](https://www.npmjs.com/package/@paretools/cargo)   | [packages/server-cargo/CHANGELOG.md](packages/server-cargo/CHANGELOG.md)   |
| [`@paretools/docker`](https://www.npmjs.com/package/@paretools/docker) | [packages/server-docker/CHANGELOG.md](packages/server-docker/CHANGELOG.md) |
| [`@paretools/git`](https://www.npmjs.com/package/@paretools/git)       | [packages/server-git/CHANGELOG.md](packages/server-git/CHANGELOG.md)       |
| [`@paretools/go`](https://www.npmjs.com/package/@paretools/go)         | [packages/server-go/CHANGELOG.md](packages/server-go/CHANGELOG.md)         |
| [`@paretools/lint`](https://www.npmjs.com/package/@paretools/lint)     | [packages/server-lint/CHANGELOG.md](packages/server-lint/CHANGELOG.md)     |
| [`@paretools/npm`](https://www.npmjs.com/package/@paretools/npm)       | [packages/server-npm/CHANGELOG.md](packages/server-npm/CHANGELOG.md)       |
| [`@paretools/python`](https://www.npmjs.com/package/@paretools/python) | [packages/server-python/CHANGELOG.md](packages/server-python/CHANGELOG.md) |
| [`@paretools/test`](https://www.npmjs.com/package/@paretools/test)     | [packages/server-test/CHANGELOG.md](packages/server-test/CHANGELOG.md)     |
| [`@paretools/shared`](https://www.npmjs.com/package/@paretools/shared) | [packages/shared/CHANGELOG.md](packages/shared/CHANGELOG.md)               |

## Aggregated changelog

Run `pnpm changelog` to regenerate the sections below from per-package changelogs.

<!-- BEGIN AGGREGATED CHANGELOG -->

### 0.22.2

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/git

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/npm

### Patch Changes

- [#1082](https://github.com/Dave-London/Pare/pull/1082) [`e97460a`](https://github.com/Dave-London/Pare/commit/e97460a2fcf98eee7c4166cfdd05add857078990) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): make install `added`/`removed`/`changed` agree with `packageDetails`

  pnpm never prints npm's "added N packages" summary sentence, so `install` on a
  pnpm project returned `added: 0, removed: 0, changed: 0` even when
  `packageDetails` listed every package that moved. Counters are now derived from
  `packageDetails` when no npm summary line is present, and fall back to pnpm's
  store-level `Packages: +N -M` line when there are no per-package details at all.

  A same-name version bump (pnpm prints `- pkg 1.0.0` then `+ pkg 1.1.0`) is now
  reported as a single `updated` entry with a new optional `previousVersion`
  field instead of one addition plus one removal. npm and yarn parsing is
  unchanged.

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

#### @paretools/shared

#### @paretools/test

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.2

---

### 0.22.1

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/git

### Patch Changes

- [#1071](https://github.com/Dave-London/Pare/pull/1071) [`5dc635c`](https://github.com/Dave-London/Pare/commit/5dc635cb2cf57301f246a15b7059b97a17edb05b) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): `add` stages and reports "." / directory paths correctly; `branch` delete returns a compact confirmation instead of the full listing

- [#1076](https://github.com/Dave-London/Pare/pull/1076) [`5e34b25`](https://github.com/Dave-London/Pare/commit/5e34b25147349a52d51a48dc8458f3032b2cc279) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix two git-server bugs around paths and worktree removal.

  **`restore` verification lied about directory pathspecs ([#1068](https://github.com/Dave-London/Pare/issues/1068)).** The post-restore
  check compared `git status --porcelain` lines against the requested paths by exact
  string, so a directory pathspec (`src`, `src/`, `.`) never matched a status line and
  `verified: true` came back regardless of what was left dirty. Verification now treats
  a path as unrestored when any remaining status entry lies at or under it, and
  translates pathspecs to repo-relative form first so it stays correct when the tool
  runs from a subdirectory.

  **`worktree` removal could report a failure it had already half-committed to
  ([#1073](https://github.com/Dave-London/Pare/issues/1073)).** `git worktree remove` deletes the admin entry even when the recursive
  delete of the working directory fails first — on Windows a large `node_modules` tree
  trips that routinely with `Filename too long` — so `prune-merged` reported
  `remove-failed` while the worktree was in fact unregistered, leaving an orphaned
  directory that later `remove` calls rejected with "is not a working tree". Removal now
  re-checks registration on failure: still registered means a genuine failure, reported
  as `removed: false` with git's stderr in a new `error` field and nothing touched; no
  longer registered means only the directory delete failed, so the tool finishes it with
  a recursive delete and reports `removed: true` with `cleanedUp: true`. The same
  handling applies to `action: "remove"`, whose thrown error now carries git's stderr.

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/python

### Patch Changes

- [#1072](https://github.com/Dave-London/Pare/pull/1072) [`4f74147`](https://github.com/Dave-London/Pare/commit/4f741473e8e47dabc7700a695d2d3440f1e10d88) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python,test): parse pytest counts only from the final summary line

  The pytest summary parser scanned every output line for `N passed` / `N failed`
  patterns, so free text that happened to contain a number next to a status word —
  notably libpq's skip reason `port 5555 failed: Connection refused` — was scraped
  as a count, producing self-contradictory results such as `failed: 5555` with
  `success: true` and an empty `failures[]`. Counts now come only from pytest's own
  final summary line (`===== N passed, M skipped in Xs =====`, also matched
  undecorated under `-q`, last occurrence wins), a consistency guard zeroes
  failure/error counts that have neither a summary line nor a parsed failure block
  behind them, and a run with failures is never reported as a success.

- Updated dependencies []:
  - @paretools/shared@0.22.1

#### @paretools/shared

#### @paretools/test

### Patch Changes

- [#1072](https://github.com/Dave-London/Pare/pull/1072) [`4f74147`](https://github.com/Dave-London/Pare/commit/4f741473e8e47dabc7700a695d2d3440f1e10d88) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python,test): parse pytest counts only from the final summary line

  The pytest summary parser scanned every output line for `N passed` / `N failed`
  patterns, so free text that happened to contain a number next to a status word —
  notably libpq's skip reason `port 5555 failed: Connection refused` — was scraped
  as a count, producing self-contradictory results such as `failed: 5555` with
  `success: true` and an empty `failures[]`. Counts now come only from pytest's own
  final summary line (`===== N passed, M skipped in Xs =====`, also matched
  undecorated under `-q`, last occurrence wins), a consistency guard zeroes
  failure/error counts that have neither a summary line nor a parsed failure block
  behind them, and a run with failures is never reported as a success.

- Updated dependencies []:
  - @paretools/shared@0.22.1

---

### 0.22.0

#### @paretools/build

### Patch Changes

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/cargo

### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1030](https://github.com/Dave-London/Pare/pull/1030) [`522a6c0`](https://github.com/Dave-London/Pare/commit/522a6c0e2377d48d4aeaf8b9ec1da7d39b89ff18) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface silent toolchain failures and restore compact payloads (part of [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - `cargo build`/`check`/`clippy`/`test`: a non-zero exit with no parseable diagnostics/tests (missing Cargo.toml, toolchain error, clippy not installed) now attaches the raw stderr as `error` plus `exitCode` instead of returning a zeroed result that reads as clean. Failing tests and denied lints still parse normally with no `error`.
  - `cargo audit`: unparseable output (cargo-audit missing, advisory DB fetch failure) now surfaces `error`/`exitCode` instead of a false-clean "0 vulnerabilities" result. Exit 1 with vulnerabilities found remains a successful scan.
  - `cargo run` compact mode: keeps the executed binary's stdout/stderr, truncated to the shared compact budget with truncation metadata, instead of dropping them.
  - `cargo audit` compact mode: keeps the first 10 advisory identities (id, package, version, severity, title, patched) plus an omitted count, instead of an empty vulnerabilities list.
  - Compact mappers and text formatters pass through the new `error`/`exitCode` fields.

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/git

### Patch Changes

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/go

### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1029](https://github.com/Dave-London/Pare/pull/1029) [`efe7799`](https://github.com/Dave-London/Pare/commit/efe7799d841e3fd3c29ece2f2d11b4e1cae45c80) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface toolchain failures and restore compact payloads ([#1022](https://github.com/Dave-London/Pare/issues/1022), [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - `go test`: toolchain failures (e.g. "go: cannot find main module", bad -tags) that previously read as a zeroed clean result now surface the raw stderr tail via a new `error` field plus `exitCode`. Normal test failures are unaffected.
  - `golangci-lint`: the parser now uses the exit code and stderr; linter crashes/config errors that previously read as a clean `{diagnostics: [], errors: 0}` result now surface `error` and `exitCode`. Exit code 1 with issues found remains a normal result.
  - Compact `run`: stdout/stderr content is now kept (truncated to the shared compact budget with `stdoutTruncated`/`stderrTruncated` flags and total line counts) instead of being dropped entirely.
  - Compact `get`: failing packages are kept with their `error`/`errorType` instead of being dropped.
  - Compact `fmt`: parse errors are kept in full instead of being reduced to a count.
  - Compact `golangci-lint`: the first 20 diagnostics are now included (fix data stripped, `diagnosticsOmitted` count when capped) instead of counts only; `error` is passed through.

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/lint

### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1028](https://github.com/Dave-London/Pare/pull/1028) [`c78d2df`](https://github.com/Dave-London/Pare/commit/c78d2df84890b69e8134e52ed81ea8d089e741c6) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface linter config failures and keep the actionable payload in compact output.

  - All six linters (eslint, biome-check, stylelint, shellcheck, hadolint, oxlint) now attach `error` and `exitCode` when the CLI exits non-zero with zero parsed diagnostics, instead of reporting a false "clean" result on config errors or crashes ([#1024](https://github.com/Dave-London/Pare/issues/1024)). Exits caused by found violations are unaffected.
  - `format-check` surfaces prettier failures (exit > 1) as `error` instead of a silent `{formatted: false, files: []}` ([#1024](https://github.com/Dave-London/Pare/issues/1024)).
  - Compact lint output now keeps the first 25 diagnostics plus `diagnosticsTruncated`/`omittedCount` and the fixable counts, instead of dropping every diagnostic ([#1022](https://github.com/Dave-London/Pare/issues/1022)).
  - Compact `format-check` output now includes the failing file list (capped at 50 with `filesTruncated`) and `total` ([#1021](https://github.com/Dave-London/Pare/issues/1021)).
  - Compact `prettier-format`/`biome-format` output now includes the list of reformatted files (capped at 50 with `filesTruncated`) ([#1022](https://github.com/Dave-London/Pare/issues/1022)).

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/npm

### Patch Changes

- [#1031](https://github.com/Dave-London/Pare/pull/1031) [`2f95f18`](https://github.com/Dave-London/Pare/commit/2f95f18ba1951417d6345a72075927bf7f90f840) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface npm failures and restore the compact list payload.

  - `outdated`: a non-zero exit with no output, or npm's `{"error": ...}` JSON payload, now returns an error instead of reading as "everything up to date" ([#1024](https://github.com/Dave-London/Pare/issues/1024))
  - `audit`: unparseable output or a failed run (e.g. ENOLOCK) now returns a structured Pare error via the shared `errorOutput`/`classifyError` helpers instead of a raw SyntaxError or a false "no vulnerabilities" ([#1024](https://github.com/Dave-London/Pare/issues/1024))
  - compact `list` output now includes `dependencyCount`, `problems`, `packageManager`, and the first 20 top-level dependencies with an omitted-count marker ([#1022](https://github.com/Dave-London/Pare/issues/1022))
  - compact `info` output now includes `dependencyCount` and `versionCount` ([#1022](https://github.com/Dave-London/Pare/issues/1022))

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/python

### Minor Changes

- [#1023](https://github.com/Dave-London/Pare/pull/1023) [`59a3024`](https://github.com/Dave-London/Pare/commit/59a3024f1b73f405072cc922c955d0b89b393526) Thanks [@Dave-London](https://github.com/Dave-London)! - pytest: surface collection/startup error diagnostics and add `env`/`extraArgs` inputs ([#984](https://github.com/Dave-London/Pare/issues/984))

  - When a pytest run fails with no test results (e.g. `ModuleNotFoundError` from a src-layout project missing `PYTHONPATH`, or a broken plugin crashing at startup), the tool now includes `exitCode` and an `errorOutput` diagnostic (capped tail of the most informative output stream) instead of a silent all-zero result.
  - New `env` input: extra environment variables merged over the parent environment (e.g. `{"PYTHONPATH": "src"}`).
  - New `extraArgs` input: additional pytest CLI arguments passed through verbatim (e.g. `["-p", "no:logfire"]`).

### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

- [#1032](https://github.com/Dave-London/Pare/pull/1032) [`8a6e788`](https://github.com/Dave-London/Pare/commit/8a6e78897b63f0dd0d9f7f6f172467f0544413cf) Thanks [@Dave-London](https://github.com/Dave-London)! - Surface silent tool failures and restore compact-mode payloads (part of [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024)).

  - pip-audit, mypy, ruff-check, ruff-format, pip-install, and poetry now attach `error` and `exitCode` when a run fails without producing parseable output, instead of returning a silent zeroed result — a crashed pip-audit no longer reads as "0 vulnerabilities", and pip's `ERROR:` lines are captured.
  - Compact mode now keeps the actionable payload: mypy/ruff diagnostics (first 20 + severity/fixable counts), pip-audit severity counts + vulnerability identities, pip-list name/version pairs, poetry package/artifact/message entries, pyenv version lists, and uv-run truncated stdout/stderr via the shared compact-stream budget.

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

#### @paretools/shared

### Minor Changes

- [#1026](https://github.com/Dave-London/Pare/pull/1026) [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared compact-output and diagnostics helpers: `truncateStream`/`compactStreamFields` (head/tail + byte-cap stream truncation with `CompactStreamSchemaFields`, generalizing the server-process compact budget from [#1020](https://github.com/Dave-London/Pare/issues/1020)) and `surfaceEmptyFailure` (attaches `error`/`exitCode` when a CLI exits non-zero with nothing parseable, with `EmptyFailureSchemaFields`, generalizing server-test's `surfaceLoadFailure`). Foundation for epics [#1022](https://github.com/Dave-London/Pare/issues/1022) and [#1024](https://github.com/Dave-London/Pare/issues/1024).

### Patch Changes

- [#1035](https://github.com/Dave-London/Pare/pull/1035) [`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f) Thanks [@Dave-London](https://github.com/Dave-London)! - Declare compact-only fields in output schemas so structuredContent validates against the registered outputSchema. Compact mappers emitted fields (e.g. `total`, `truncated`, counts) that the Zod outputSchemas did not declare; the MCP SDK converts outputSchema to JSON Schema with `additionalProperties: false` and AJV-validates structuredContent, so compact responses failed with `MCP error -32602` whenever compact mode engaged. Adds `@paretools/shared/testing` with SDK-equivalent schema validation helpers for regression tests.

#### @paretools/test

### Patch Changes

- Updated dependencies [[`ae381ea`](https://github.com/Dave-London/Pare/commit/ae381ea780e87681a3a0bd7ac991804461ebcf2f), [`4ec6e4b`](https://github.com/Dave-London/Pare/commit/4ec6e4bd00fbaade872414a295e2b80fae3dc4ea)]:
  - @paretools/shared@0.22.0

---

### 0.21.1

#### @paretools/build

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/git

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/go

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/python

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

#### @paretools/shared

### Patch Changes

- [#986](https://github.com/Dave-London/Pare/pull/986) [`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b) Thanks [@jamesx0416](https://github.com/jamesx0416)! - Close child stdin when no input is provided so commands that wait for EOF, including Bun scripts, can exit normally.

#### @paretools/test

### Patch Changes

- Updated dependencies [[`251d7a4`](https://github.com/Dave-London/Pare/commit/251d7a48a6d0a6dcf8e931644825793acac1862b)]:
  - @paretools/shared@0.21.1

---

### 0.21.0

#### @paretools/build

### Patch Changes

- [#971](https://github.com/Dave-London/Pare/pull/971) [`16ac1b4`](https://github.com/Dave-London/Pare/commit/16ac1b4c82ae6892df32437466e5d92024fa63ae) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(build): tsc never returns a contextless `success:false` — surface failure detail

  When `tsc` exits non-zero without emitting parseable diagnostics (a tsconfig
  error like `TS18003 No inputs were found`, a crash, or an npx/binary resolution
  failure), the result was `{success:false, diagnostics:[]}` — and the compact
  formatter even rendered it as "TypeScript: no errors found." `parseTscOutput`
  now attaches the raw stderr (or stdout, or a generic exit-code message) as a
  new optional `error` field whenever a failed run has no diagnostics, and the
  full/compact formatters surface it instead of implying success. Enforces the
  same "success:false ⟹ actionable output" invariant the vite-build tool got.
  The pure missing-binary case is already handled by the `assertBinaryAvailable`
  preflight. Closes [#965](https://github.com/Dave-London/Pare/issues/965).

- [#963](https://github.com/Dave-London/Pare/pull/963) [`48ef524`](https://github.com/Dave-London/Pare/commit/48ef524f04be60ca2a4d25fac3c3a0f4e88430d8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(build): vite-build success now tracks the process exit code; advisory stderr (rolldown-vite chunk-size / ineffective-dynamic-import) maps to warnings and never flips success, and a failed build always populates errors[]

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/git

### Minor Changes

- [#966](https://github.com/Dave-London/Pare/pull/966) [`132366f`](https://github.com/Dave-London/Pare/commit/132366f0fc205e39707f76eeced9071164cca3e0) Thanks [@Dave-London](https://github.com/Dave-London)! - Add safe worktree-cleanup primitives ([#921](https://github.com/Dave-London/Pare/issues/921)): `branch` gains an opt-in `mergedInto` ancestry check (per-branch `merged`/`unmerged`), `worktree list` gains opt-in `withStatus` (dirty/ahead/behind/unpushed) and `mergedInto` enrichment, and a new `worktree` action `prune-merged {base, requireClean}` batch-removes merged-clean worktrees while refusing dirty, unmerged, locked, bare, main, and current worktrees.

### Patch Changes

- [#962](https://github.com/Dave-London/Pare/pull/962) [`fff367d`](https://github.com/Dave-London/Pare/commit/fff367d9db21422aee9631f3b075739bd327e003) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): return file content from `show` with `file` + `ref` in compact mode

  `git show` with a `file` argument (blob extraction, e.g. `HEAD:src/index.ts`)
  returned empty content in the default compact mode — the compact projection
  used a commit-shaped map that emitted only an empty `hashShort` and a
  `"blob ref:file"` message, dropping `fileContent` entirely. Because the raw
  content and the structured payload are near-identical in size, the dual-output
  helper always selected the compact branch, so the content was effectively never
  returned unless `compact: false` was passed. `compactShowMap` now preserves
  `fileContent` and object metadata for non-commit objects (blob/tag/tree). Also
  raised the `file` input cap from 255 to 4096 chars to match `path`. Closes [#926](https://github.com/Dave-London/Pare/issues/926).

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.21.0

#### @paretools/shared

#### @paretools/test

### Patch Changes

- [#964](https://github.com/Dave-London/Pare/pull/964) [`cfbe390`](https://github.com/Dave-London/Pare/commit/cfbe3909f69d0990864015d2179456b7dda3752e) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(test): surface load/collection failures instead of reporting silent green, and allow flag-prefixed passthrough args

- Updated dependencies []:
  - @paretools/shared@0.21.0

---

### 0.20.0

#### @paretools/build

### Patch Changes

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/git

### Patch Changes

- [#898](https://github.com/Dave-London/Pare/pull/898) [`9937409`](https://github.com/Dave-London/Pare/commit/99374097eb89f6c1032f4e5df0eb96443cebfc54) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix checkout branch creation with `track` and `startPoint` so flags are ordered before branch operands.

- [#912](https://github.com/Dave-London/Pare/pull/912) [`854ab00`](https://github.com/Dave-London/Pare/commit/854ab00fab5a2be229fc6ec089909c217f992f93) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stash-list reporting every entry as `stash@{0}`; resolve real incrementing indices from a date-free reflog selector so `--date` no longer corrupts them. Closes [#908](https://github.com/Dave-London/Pare/issues/908).

- [#911](https://github.com/Dave-London/Pare/pull/911) [`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7) Thanks [@Dave-London](https://github.com/Dave-London)! - Clarify that the `path` parameter is authoritative: when omitted, repo-scoped tools operate on the server's own process working directory (its launch dir), not the caller's cwd. Callers in a git worktree or other directory must pass `path` explicitly to avoid operating on the wrong repository. Adds a regression test, documents the behavior in mutating git tool descriptions and the README, and updates the shared `repoPathInput` schema description. Closes [#876](https://github.com/Dave-London/Pare/issues/876).

- [#910](https://github.com/Dave-London/Pare/pull/910) [`c0dc657`](https://github.com/Dave-London/Pare/commit/c0dc657a477a50cb1e3011241c5ede54702406ae) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `worktree` list with `listVerbose=true` crashing on git's `--verbose`/`--porcelain` conflict; locked/prunable detail (including prunable reason) is now surfaced via the porcelain parser. Closes [#906](https://github.com/Dave-London/Pare/issues/906).

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/go

### Patch Changes

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/npm

### Patch Changes

- [#873](https://github.com/Dave-London/Pare/pull/873) [`2507291`](https://github.com/Dave-London/Pare/commit/25072917a937d10867b740182b047586dec7961d) Thanks [@Dave-London](https://github.com/Dave-London)! - `pare-npm install` no longer emits `--no-audit` for pnpm or yarn. The flag is npm-specific — pnpm install rejects it with `ERROR Unknown option: 'audit'`, and yarn install does not run an audit step either. With this change, `noAudit: true` is honoured on npm (still maps to `--no-audit`) and is a silent no-op on pnpm/yarn, where install never audits anyway. The tool description has been updated to reflect this.

  Resolves [#872](https://github.com/Dave-London/Pare/issues/872).

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/python

### Patch Changes

- [#902](https://github.com/Dave-London/Pare/pull/902) [`416ecb2`](https://github.com/Dave-London/Pare/commit/416ecb2433a88eadee255d02e205727d2d9d729e) Thanks [@Dave-London](https://github.com/Dave-London)! - Document Python interpreter resolution order, virtualenv detection, `python -m` fallbacks, and explicit interpreter override inputs for Python-backed tools.

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

#### @paretools/shared

### Patch Changes

- [#911](https://github.com/Dave-London/Pare/pull/911) [`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7) Thanks [@Dave-London](https://github.com/Dave-London)! - Clarify that the `path` parameter is authoritative: when omitted, repo-scoped tools operate on the server's own process working directory (its launch dir), not the caller's cwd. Callers in a git worktree or other directory must pass `path` explicitly to avoid operating on the wrong repository. Adds a regression test, documents the behavior in mutating git tool descriptions and the README, and updates the shared `repoPathInput` schema description. Closes [#876](https://github.com/Dave-London/Pare/issues/876).

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

#### @paretools/test

### Patch Changes

- [#902](https://github.com/Dave-London/Pare/pull/902) [`416ecb2`](https://github.com/Dave-London/Pare/commit/416ecb2433a88eadee255d02e205727d2d9d729e) Thanks [@Dave-London](https://github.com/Dave-London)! - Document Python interpreter resolution order, virtualenv detection, `python -m` fallbacks, and explicit interpreter override inputs for Python-backed tools.

- [#899](https://github.com/Dave-London/Pare/pull/899) [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.

- Updated dependencies [[`62c4fed`](https://github.com/Dave-London/Pare/commit/62c4fedad16d30d9f7c70e8d08e66f7ac803c5f7), [`79611ac`](https://github.com/Dave-London/Pare/commit/79611acd24581e17831e83cb096992b045ead116)]:
  - @paretools/shared@0.20.0

---

### 0.19.1

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/git

### Patch Changes

- [#864](https://github.com/Dave-London/Pare/pull/864) [`c5ba357`](https://github.com/Dave-London/Pare/commit/c5ba357ff85c181f40c5ddd35a14f2e010b1abe5) Thanks [@Dave-London](https://github.com/Dave-London)! - `pare-git status` now returns `ahead` and `behind` integer fields whenever an upstream is configured — including in the synced case (`0`/`0`), where they were previously omitted. When there is no upstream, both fields are explicitly `null` to distinguish "no tracking branch" from "synced".

  This eliminates the need for follow-up `pare-git log` / GitHub-compare round-trips just to answer "is this branch fully pushed?" during worktree audits and similar housekeeping.

  The `GitStatusSchema` now allows `ahead`/`behind` to be `number | null | undefined` (previously `number | undefined`).

  Resolves [#834](https://github.com/Dave-London/Pare/issues/834) (sub-bug 3).

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

#### @paretools/shared

#### @paretools/test

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.1

---

### 0.19.0

#### @paretools/build

### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/git

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/npm

### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.19.0

#### @paretools/shared

#### @paretools/test

### Patch Changes

- [#846](https://github.com/Dave-London/Pare/pull/846) [`ac1dbc9`](https://github.com/Dave-London/Pare/commit/ac1dbc9eba553643d2e3185323b5682eb39896cb) Thanks [@Dave-London](https://github.com/Dave-London)! - Detect missing `node_modules/` and surface typed errors instead of silently lying or returning incoherent diagnostics. See [#842](https://github.com/Dave-London/Pare/issues/842).
  - `npm.install`: after the package manager exits, verify a `node_modules/` directory was actually created (skipped for `dryRun` and `global`). If not, throw a typed error with `pm`, `cwd`, `exitCode`, and the last 5 stderr lines instead of returning `{ added: 0, removed: 0, changed: 0 }` as success.
  - `test.run`: before invoking the test framework, verify the JS framework binary (`jest` / `vitest` / `mocha`) is resolvable from a parent `node_modules/.bin/`. If missing, throw a typed `<framework> binary not found at <path> — try running "pnpm install"` error instead of crashing later with `Expected property name or '}' in JSON at position 2`. (pytest is unaffected — it's invoked via `python -m pytest`.)
  - `build.tsc`: same guard for `tsc` — return a typed not-found error instead of contradictory `{ success: false, errors: 0, diagnostics: [] }` output.

- Updated dependencies []:
  - @paretools/shared@0.19.0

---

### 0.18.1

#### @paretools/build

### Patch Changes

- [#833](https://github.com/Dave-London/Pare/pull/833) [`fdcce2a`](https://github.com/Dave-London/Pare/commit/fdcce2abdd9550427fd0e6af3a3c38591c07bef6) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix `turbo` tool reporting `passed/failed/cached` all 0 with empty `tasks: []` on modern turbo 2.x output ([#830](https://github.com/Dave-London/Pare/issues/830)). Turbo 2.x prefixes per-task status lines with `<pkg>:<task>:` (colon) instead of the legacy `<pkg>#<task>:` (hash) the parser was matching, so every task was silently skipped. The parser now accepts both separators, treats the trailing `(duration)` as optional, recognizes `cache bypass` from `--force` runs, and parses turbo 2.x's `ERROR ...` and `Failed:` failure summary lines. The `passed + failed === totalTasks` invariant is now enforced via the summary line as a fallback when per-task lines can't be matched.

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/git

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/go

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/python

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

#### @paretools/shared

### Patch Changes

- [#829](https://github.com/Dave-London/Pare/pull/829) [`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve "Command not found" error: now includes the platform, the first PATH entries the runner saw, and on Windows the well-known fallback paths probed plus whether each exists on disk. Makes [#820](https://github.com/Dave-London/Pare/issues/820)-style failures (subagent PATH not inherited) self-debugging in the wild.

- [#841](https://github.com/Dave-London/Pare/pull/841) [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e) Thanks [@Dave-London](https://github.com/Dave-London)! - Add npm/npx/pnpm/yarn to `_WIN32_FALLBACK_PATHS` so `pare-npm` and other Node-package-manager calls succeed on Windows + Git Bash when the spawned MCP server doesn't inherit the user's PATH (the same root condition as [#820](https://github.com/Dave-London/Pare/issues/820)). The cross-spawn cmd.exe wrapper in `_buildSpawnConfig` already handled `.cmd` correctly — only the fallback registry was missing entries. Fixes [#839](https://github.com/Dave-London/Pare/issues/839).

#### @paretools/test

### Patch Changes

- Updated dependencies [[`55977cf`](https://github.com/Dave-London/Pare/commit/55977cf4bc78d7da8faf0fce56109e804b8fe9b3), [`decf9ee`](https://github.com/Dave-London/Pare/commit/decf9ee3603e563ed6d5188bb9e325ff6fae841e)]:
  - @paretools/shared@0.18.1

---

### 0.18.0

#### @paretools/build

### Patch Changes

- [#805](https://github.com/Dave-London/Pare/pull/805) [`ca9c8a8`](https://github.com/Dave-London/Pare/commit/ca9c8a893966718b021233819246d9ea3e2dc347) Thanks [@Dave-London](https://github.com/Dave-London)! - Allow dash-prefixed arguments in build tool args arrays — execFile already prevents injection

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/git

### Minor Changes

- [#807](https://github.com/Dave-London/Pare/pull/807) [`203b643`](https://github.com/Dave-London/Pare/commit/203b643a5aa556c128c7ca2b7dcbc4ca6bf4d43d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add batch branch deletion — pass an array of branch names to `delete` param

### Patch Changes

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/go

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/python

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

#### @paretools/shared

### Patch Changes

- [#809](https://github.com/Dave-London/Pare/pull/809) [`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flaky integration test timeout and improve test coverage for batch branch deletion, build args, and PATH augmentation

- [#808](https://github.com/Dave-London/Pare/pull/808) [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9) Thanks [@Dave-London](https://github.com/Dave-London)! - Augment PATH with common Unix tool locations on macOS/Linux to fix ENOENT when MCP clients launch servers with stripped environment

#### @paretools/test

### Patch Changes

- Updated dependencies [[`30ce521`](https://github.com/Dave-London/Pare/commit/30ce521c205093b7daa248f7f57227d1b4ef1f47), [`2756547`](https://github.com/Dave-London/Pare/commit/2756547b77bab4441032c3d618bc157561ea0bc9)]:
  - @paretools/shared@0.18.0

---

### 0.17.0

#### @paretools/build

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/git

### Minor Changes

- [#799](https://github.com/Dave-London/Pare/pull/799) [`8c0c1c2`](https://github.com/Dave-London/Pare/commit/8c0c1c2e96cc2b8e712355454c9f20248a0aff07) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `prune` option to the pull tool for removing stale remote-tracking refs during pull (--prune)

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/go

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/python

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

#### @paretools/shared

### Patch Changes

- [#798](https://github.com/Dave-London/Pare/pull/798) [`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add fallback PATH probing for Windows MSYS2/Git Bash environments where the MCP server process does not inherit the shell PATH, causing commands like git and gh to fail with "Command not found"

#### @paretools/test

### Patch Changes

- Updated dependencies [[`e67ced8`](https://github.com/Dave-London/Pare/commit/e67ced845a2d50fb677c056eb95bbe51655d7f2b)]:
  - @paretools/shared@0.17.0

---

### 0.16.3

#### @paretools/build

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/git

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/go

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/python

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

#### @paretools/shared

### Patch Changes

- [#793](https://github.com/Dave-London/Pare/pull/793) [`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix Windows command resolution preferring extensionless shell scripts over .exe binaries, which caused docker compose tools to fail on Docker Desktop for Windows

#### @paretools/test

### Patch Changes

- Updated dependencies [[`a20439f`](https://github.com/Dave-London/Pare/commit/a20439fd634aed6ff257028e3a9f5e255ce9ccc4)]:
  - @paretools/shared@0.16.3

---

### 0.16.2

#### @paretools/build

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/cargo

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/docker

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/git

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/go

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/lint

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/npm

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/python

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

#### @paretools/shared

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

#### @paretools/test

### Patch Changes

- [#784](https://github.com/Dave-London/Pare/pull/784) [`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix boolean input parameters rejecting string values ("true"/"false") by switching from z.boolean() to z.coerce.boolean() across all tool schemas

- Updated dependencies [[`2cc1f32`](https://github.com/Dave-London/Pare/commit/2cc1f326d6600a1f5f1164e6f6351cfc0ba32a57)]:
  - @paretools/shared@0.16.2

---

### 0.16.1

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/git

### Patch Changes

- [#765](https://github.com/Dave-London/Pare/pull/765) [`3064c7b`](https://github.com/Dave-London/Pare/commit/3064c7b1610ff72d03b6eb4fcd67ac09d76b77cd) Thanks [@MergingMonkey](https://github.com/MergingMonkey)! - fix(git): strip CRLF from diff patch output on Windows and show chunks in text summary

  On Windows, git emits `\r\n` line endings. The patch-splitting regex
  captured a trailing `\r` in the filename, preventing a match against the
  `parseDiffStat` result and leaving `chunks` empty when `full: true` was used.

  This fix also updates `formatDiff` to include code chunks in the human-readable
  text output, ensuring patch visibility in MCP clients that rely on the summary.

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

#### @paretools/shared

#### @paretools/test

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.1

---

### 0.16.0

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/cargo

### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/docker

### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/git

### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

- [#758](https://github.com/Dave-London/Pare/pull/758) [`e7a37d9`](https://github.com/Dave-London/Pare/commit/e7a37d9b16afc89e544a7c91838bfed207d3b567) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): support extracting raw file blobs via show tool

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/lint

### Minor Changes

- [#759](https://github.com/Dave-London/Pare/pull/759) [`20ce7ca`](https://github.com/Dave-London/Pare/commit/20ce7ca99af786348bd43053fe5f33f96f860736) Thanks [@Dave-London](https://github.com/Dave-London)! - feat: refine MCP tool annotations (readOnlyHint, destructiveHint) across all servers

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

#### @paretools/shared

#### @paretools/test

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.16.0

---

### 0.15.0

#### @paretools/build

### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/docker

### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/git

### Patch Changes

- [#735](https://github.com/Dave-London/Pare/pull/735) [`2e4d5ac`](https://github.com/Dave-London/Pare/commit/2e4d5acfd3a1ca0694869385550dc86dd555e619) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): add security hardening for rebase exec, bisect run, and config set
  - Gate rebase --exec parameter behind assertAllowedByPolicy
  - Gate bisect run command behind assertAllowedByPolicy
  - Block dangerous git config keys that execute commands (core.fsmonitor, core.editor, etc.)

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/go

### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(security): harden input validation across go, docker, build, and make servers
  - Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
  - Add assertNoFlagInjection for ldflags and gcflags in go build
  - Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
  - Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
  - Validate make/just env key names match strict identifier pattern
  - Add assertAllowedRoot check on Docker exec/run envFile parameter

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/npm

### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: harden input validation across npm, git, search, and remote servers
  - npm install: validate args array elements and restrict registry URLs to https://
  - nvm exec: gate command behind ALLOWED_COMMANDS policy
  - npm run: restrict scriptShell to known safe shells
  - git submodule add: restrict URLs to http/https schemes by default
  - rsync: validate exclude/include array elements
  - jq: validate arg/argjson record keys

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.15.0

#### @paretools/shared

#### @paretools/test

### Patch Changes

- [#737](https://github.com/Dave-London/Pare/pull/737) [`9f9c3f2`](https://github.com/Dave-London/Pare/commit/9f9c3f2b8866d862a3b5f17100075e5362b4e454) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: validate args array elements with assertNoFlagInjection

  Added per-element flag injection validation to args arrays in build, docker, and test tools to prevent flag injection bypassing structured parameter validation.

- Updated dependencies []:
  - @paretools/shared@0.15.0

---

### 0.14.2

#### @paretools/build

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/cargo

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/docker

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/git

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/go

### Patch Changes

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/lint

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/python

### Patch Changes

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

#### @paretools/shared

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

#### @paretools/test

### Patch Changes

- [#700](https://github.com/Dave-London/Pare/pull/700) [`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: add input coercion for numeric and array parameters

  MCP clients sometimes serialize numbers as strings (`"5"` instead of `5`) and arrays as JSON strings. Added `z.coerce.number()` for all numeric input parameters and `coerceJsonArray` preprocessing for array input parameters to handle these cases gracefully.

- Updated dependencies [[`61e8ee9`](https://github.com/Dave-London/Pare/commit/61e8ee9f8697979fa68b2aff2ebc840e1af9f09a)]:
  - @paretools/shared@0.14.2

---

### 0.14.1

#### @paretools/build

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/docker

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/git

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/lint

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/npm

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/python

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

#### @paretools/shared

#### @paretools/test

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.14.1

---

### 0.14.0

#### @paretools/build

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/cargo

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/docker

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/git

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- [#680](https://github.com/Dave-London/Pare/pull/680) [`f6ae07c`](https://github.com/Dave-London/Pare/commit/f6ae07c18faed3b7d2bef17b1268dcdb4dce46ce) Thanks [@Dave-London](https://github.com/Dave-London)! - Rename checkout tool parameter from `ref` to `branch` for better discoverability by AI agents

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/go

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/lint

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/npm

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/python

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

#### @paretools/shared

### Patch Changes

- [#685](https://github.com/Dave-London/Pare/pull/685) [`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb) Thanks [@Dave-London](https://github.com/Dave-London)! - Add dev-mode runtime validation for compactDualOutput and strippedCompactDualOutput. When an optional `outputSchema` (Zod) is passed and `NODE_ENV !== 'production'` (or `PARE_DEBUG` is set), the structured output is validated against the schema before returning. Mismatches throw a descriptive error with field paths, catching compact-map / schema bugs during development and testing rather than in production.

#### @paretools/test

### Minor Changes

- [#681](https://github.com/Dave-London/Pare/pull/681) [`2f49211`](https://github.com/Dave-London/Pare/commit/2f49211fd5a3916e230beb06789de92300758aef) Thanks [@Dave-London](https://github.com/Dave-London)! - Add MCP tool annotations (readOnlyHint, destructiveHint, openWorldHint) across all server packages to help AI agents understand tool behavior and safety characteristics

### Patch Changes

- Updated dependencies [[`e5ef841`](https://github.com/Dave-London/Pare/commit/e5ef841d7c9b7ec67a52c3943bc346cebf75b6eb)]:
  - @paretools/shared@0.14.0

---

### 0.13.1

#### @paretools/build

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/cargo

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/docker

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/git

### Patch Changes

- [#668](https://github.com/Dave-London/Pare/pull/668) [`b63707c`](https://github.com/Dave-London/Pare/commit/b63707cbecdb34067c38ea6e3370a1eab0e76e46) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix cherry-pick commits array coercion (#667), checkout branch-from-tag via git switch (#666), and add 12 missing servers to init registry and presets (#660)

- [#671](https://github.com/Dave-London/Pare/pull/671) [`dd560eb`](https://github.com/Dave-London/Pare/commit/dd560eb4c586b29e473145fbd0ad9237bd4e11a1) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix checkout: use git checkout --detach instead of git switch --detach to support tag refs on all git versions (#669)

- [#664](https://github.com/Dave-London/Pare/pull/664) [`d5cef2e`](https://github.com/Dave-London/Pare/commit/d5cef2e8dcdb4b4d2b32082c294cb1cc8ea05800) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(git): accept string branch name in `forceDelete` param, matching `delete` behavior

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/go

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/lint

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/npm

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/python

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

#### @paretools/shared

### Patch Changes

- [#672](https://github.com/Dave-London/Pare/pull/672) [`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: register stub resource handlers to suppress spurious -32603 errors in OpenCode

  Some MCP clients (e.g. OpenCode) fire a `resources/read` request after every tool call that returns `structuredContent`. Because Pare servers register no resource handlers, the SDK responded with `-32601 Method Not Found` (displayed as `-32603` by OpenCode). Now `createServer()` registers empty `resources/list` and `resources/read` handlers so these requests receive a clean `-32602 InvalidParams` ("Resource not found") response instead.

- [#663](https://github.com/Dave-London/Pare/pull/663) [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(shared): eliminate shell:true default to resolve CodeQL alert #16

  Default `shell` to `false` on all platforms. On Windows, `.cmd`/`.bat` wrappers
  are automatically detected and spawned via `cmd.exe` with `windowsVerbatimArguments`
  (cross-spawn pattern), avoiding shell command injection from environment-resolved paths.

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- [#641](https://github.com/Dave-London/Pare/pull/641) [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d) Thanks [@Dave-London](https://github.com/Dave-London)! - Resolve CLI commands to absolute paths before spawning to prevent shell interpretation of PATH (fixes CodeQL alert #15)

- [#643](https://github.com/Dave-London/Pare/pull/643) [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485) Thanks [@Dave-London](https://github.com/Dave-London)! - Add strict input validation to reject unknown tool parameters instead of silently ignoring them

#### @paretools/test

### Patch Changes

- [#665](https://github.com/Dave-London/Pare/pull/665) [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: read serverInfo.version from package.json instead of hardcoding

- Updated dependencies [[`9076e2b`](https://github.com/Dave-London/Pare/commit/9076e2bd83424de221b397bd6220c79d6573f4b4), [`eb5a5a2`](https://github.com/Dave-London/Pare/commit/eb5a5a2da1b1de22035abbf53a15fdba52cb8bd5), [`b120c9b`](https://github.com/Dave-London/Pare/commit/b120c9b8d8c597022dfeec32806f52c49cf11ba8), [`79d528d`](https://github.com/Dave-London/Pare/commit/79d528d6bba90ac1f3bda016ab57058fda293a4d), [`d2be342`](https://github.com/Dave-London/Pare/commit/d2be34264a37b92a29d1ef74c201e99e07df7485)]:
  - @paretools/shared@0.13.1

---

### 0.13.0

#### @paretools/build

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/cargo

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/docker

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/git

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/go

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/lint

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/npm

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/python

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

#### @paretools/shared

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

#### @paretools/test

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

- [#628](https://github.com/Dave-London/Pare/pull/628) [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5) Thanks [@Dave-London](https://github.com/Dave-London)! - Optimize output schemas across all 16 server packages: remove derivable counts, echo-back fields, timing/duration data, and human-display metadata from Zod schemas. Move display-only data to formatters for human-readable output. Ensures compact maps only return schema-compatible fields to prevent `additionalProperties` validation failures.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

---

### 0.12.0

#### @paretools/build

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/cargo

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/docker

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/git

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/go

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/lint

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/npm

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/python

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

#### @paretools/shared

### Minor Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

#### @paretools/test

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

---

### 0.11.0

#### @paretools/build

### Minor Changes

- [#579](https://github.com/Dave-London/Pare/pull/579) [`e8c2a88`](https://github.com/Dave-London/Pare/commit/e8c2a88e5909ca08547138c57cbb6fa889c0495c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add two new build tools: lerna and rollup

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/git

### Minor Changes

- [#577](https://github.com/Dave-London/Pare/pull/577) [`b22bb4a`](https://github.com/Dave-London/Pare/commit/b22bb4acc850a7a1da4b851997c3fd4fb2ada395) Thanks [@Dave-London](https://github.com/Dave-London)! - Add four new git tools: submodule, archive, clean, and config

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/go

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/python

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

#### @paretools/shared

### Minor Changes

- [#589](https://github.com/Dave-London/Pare/pull/589) [`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85) Thanks [@Dave-London](https://github.com/Dave-London)! - Add structured error categorization for agent recovery

### Patch Changes

- [#573](https://github.com/Dave-London/Pare/pull/573) [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd) Thanks [@Dave-London](https://github.com/Dave-London)! - Add centralized Zod input schemas for common tool parameters (compactInput, projectPathInput, repoPathInput, cwdPathInput, fixInput, pathInput, configInput, filePatternsInput) to reduce duplication across server packages

#### @paretools/test

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

---

### 0.10.2

#### @paretools/build

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/cargo

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/docker

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/git

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/go

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/lint

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/npm

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/python

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

#### @paretools/shared

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

#### @paretools/test

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

---

### 0.10.1

#### @paretools/build

### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/git

### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/go

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/python

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

#### @paretools/shared

### Patch Changes

- [#565](https://github.com/Dave-London/Pare/pull/565) [`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix flag injection guards that incorrectly blocked legitimate values: git sort keys (e.g. `-creatordate`), gitleaks `logOpts` (e.g. `--since=2024-01-01`), and remove misleading validation claim from turbo `args` description.

#### @paretools/test

### Patch Changes

- [#566](https://github.com/Dave-London/Pare/pull/566) [`64ce493`](https://github.com/Dave-London/Pare/commit/64ce493e39850ca97b9efbc7ac80d4ec7a410965) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

---

### 0.10.0

#### @paretools/build

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/cargo

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/docker

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/git

### Patch Changes

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix branch compact mode garbling names for worktree branches (+ marker parsed incorrectly)

- [`ba6fab4`](https://github.com/Dave-London/Pare/commit/ba6fab4014061ea402885779b7f3a4762477d71d) - Fix worktree list Zod error by replacing z.union() with unified z.object() output schema

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/go

### Patch Changes

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/npm

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/python

### Patch Changes

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

#### @paretools/shared

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: use synchronous `execFileSync` for Windows `taskkill` in `killProcessGroup()` to prevent orphan processes accumulating after timeouts

#### @paretools/test

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- [#552](https://github.com/Dave-London/Pare/pull/552) [`a618e9f`](https://github.com/Dave-London/Pare/commit/a618e9f733b179583355ad32f8558a7fd866661e) Thanks [@Dave-London](https://github.com/Dave-London)! - Improve reliability for long-running test and GitHub CLI workflows.
  - `@paretools/test`:
    - Raise test CLI wrapper timeout policy to 5 minutes (`300_000ms`) for `run`, `coverage`, and `playwright`
    - Increase package Vitest timeout to `300_000ms`
    - Split test execution into `test:unit`, `test:integration`, and `test:fidelity` with sequential `test` orchestration
    - Auto-build required dist artifacts for integration-style tests to avoid stale-build false failures
    - Document timeout and test-batching policy in README
  - `@paretools/github`:
    - Run `gh` with `shell: false` to avoid Windows shell escaping quirks for native executable invocation
    - Add unit coverage for `gh` runner invocation options

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

---

### 0.9.0

#### @paretools/build

### Minor Changes

- [#500](https://github.com/Dave-London/Pare/pull/500) [`0880b7e`](https://github.com/Dave-London/Pare/commit/0880b7e0b8ee60bfa353626fa19c5ce506a66f8d) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(build): add env params, improve parsers, normalize output fields (P1)
  - Add `env` parameter to build and webpack tools
  - Improve error/warning detection heuristics
  - Add `define` and `metafile` params to esbuild
  - Distinguish local vs remote cache in Nx output
  - Normalize duration to milliseconds in Turbo output
  - Normalize file sizes to bytes in Vite output
  - Add `profile` param to webpack

- [#468](https://github.com/Dave-London/Pare/pull/468) [`27ecc7d`](https://github.com/Dave-London/Pare/commit/27ecc7de8d77bb82a95ae016b0992d1581d5b32b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap params and output schema enhancements across all build tools:
  - build: exitCode in output schema, timeout param, stdout/stderr/outputLines in schema
  - esbuild: target, external, sourcemap enum expansion, tsconfig, drop
  - nx: configuration, head, projects, exclude
  - tsc: declaration/declarationDir, pretty (--pretty false for parser normalization)
  - turbo: args with assertNoFlagInjection, outputLogs enum
  - vite-build: outDir, config, sourcemap, base, ssr
  - webpack: entry, target, devtool, analyze

- [#445](https://github.com/Dave-London/Pare/pull/445) [`fffa56f`](https://github.com/Dave-London/Pare/commit/fffa56f85a13d6434604a52e93a219eac2c6d170) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity gap items across all build tools:
  - build: Add `assertNoFlagInjection` on `args[]` elements; document command allowlist in description
  - esbuild: Add `splitting`, `legalComments`, and `logLevel` params
  - nx: Add `parallel`, `skipNxCache`, `nxBail`, `verbose`, `dryRun`, `outputStyle`, and `graph` params
  - tsc: Add `incremental`, `skipLibCheck`, and `emitDeclarationOnly` params; document compact-mode field loss
  - turbo: Add `force`, `continue`, `dryRun`, `affected`, `graph`, `logOrder`, and `profile` params
  - vite-build: Add `manifest`, `minify`, `logLevel`, `emptyOutDir`, and `reportCompressedSize` params
  - webpack: Add `bail` and `cache` params; append `--no-color` to prevent ANSI in text fallback

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/cargo

### Minor Changes

- [#482](https://github.com/Dave-London/Pare/pull/482) [`edad7f1`](https://github.com/Dave-London/Pare/commit/edad7f15e190a5f64c0a8e466f553fe698ec2623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo): add structured warnings to doc, clarify fmt success semantics, capture test failure output, parse tree and update into structured data

- [#479](https://github.com/Dave-London/Pare/pull/479) [`e5fb487`](https://github.com/Dave-London/Pare/commit/e5fb487f577ef0434787f7e1ea3fab51f988e867) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(cargo): fix dry-run output parsing, CVSS severity extraction, and fmt file change detection

- [#499](https://github.com/Dave-London/Pare/pull/499) [`fedc800`](https://github.com/Dave-London/Pare/commit/fedc800db713a73f357a21927e5f21475cc6d0f4) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo): improve add/audit/build/clippy/fmt/remove/run/test/update output (P1)
  - Add dependency type to add and remove output
  - Add cargo audit fix support
  - Include CVSS score/vector in audit vulnerabilities
  - Use build-finished event for authoritative success
  - Capture clippy suggestion text from JSON children
  - Add lint level configuration to clippy
  - Use --files-with-diff for more reliable fmt check
  - Distinguish compilation vs runtime failure in run
  - Add JSON message format for test compilation diagnostics
  - Improve update compact mode with update count

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#471](https://github.com/Dave-London/Pare/pull/471) [`47bd066`](https://github.com/Dave-London/Pare/commit/47bd066438916ade8a0f8d3a73f136471dbc604d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Cargo tools:
  - add: add package, rename, registry, locked/frozen/offline params; add error message to output schema
  - audit: add success field, ignore, deny, targetArch/Os, file, db/url params; add advisory date; compact preserves informational/unknown counts
  - build: add package, features, allFeatures, noDefaultFeatures, target, profile, locked/frozen/offline, manifestPath params
  - check: add features, allFeatures, noDefaultFeatures, target, locked/frozen/offline params
  - clippy: add success field, package, fix (with allow-dirty), features, locked/frozen/offline params
  - doc: add package, features, target, locked/frozen/offline params; add outputDir to schema
  - fmt: add package, edition, config, configPath, emit params
  - remove: add dryRun, package, locked/frozen/offline, manifestPath params; add error message to output schema
  - run: add bin, example, features, timeout, profile, target, locked/frozen/offline params
  - test: add package, features, testArgs, locked/frozen/offline params
  - tree: add success field (return error instead of throwing), invert, edges, features, format, target, locked/frozen/offline params
  - update: add precise, locked/frozen/offline, manifestPath params

- [#443](https://github.com/Dave-London/Pare/pull/443) [`142ffca`](https://github.com/Dave-London/Pare/commit/142ffca66886535308e8e0a5e5d7827a01c94bb1) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Cargo tools (XS complexity gaps)

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/docker

### Minor Changes

- [#502](https://github.com/Dave-London/Pare/pull/502) [`303bc5d`](https://github.com/Dave-London/Pare/commit/303bc5d5580a8ab97bc68959efbebffa494a5640) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(docker): expand output schemas, improve parsers and error handling across tools (P1)
  - #97: Improve build error parsing with structured errors (line numbers, Dockerfile context)
  - #98: Support multiple tags — `tag` accepts `string | string[]` for multiple `-t` flags
  - #99: Populate per-service `duration` in compose-build output
  - #100: Enrich compose-down with per-container `{name, action}` details
  - #101: Separate volume/network removal counts from container counts
  - #102: Add `follow` param mapping to `-f` for bounded log streaming
  - #103: Improve timestamp parsing for timezone offsets and nanoseconds
  - #104: Add log level extraction from common patterns (bracket, level=, prefix)
  - #105: Parse `Health` field and add `health` to compose-ps schema
  - #106: Add `running`/`stopped` count fields to compose-ps
  - #107: Enrich compose-up with per-service state details
  - #108: Add output truncation with `limit` param and `isTruncated` to exec
  - #109: Rename `filter` to `reference` in images tool to avoid confusion
  - #110: Parse `CreatedAt` as ISO timestamp in images output
  - #111: Add `networkSettings` (IP, ports) to inspect schema
  - #112: Add `mounts` field to inspect schema
  - #113: Separate stdout/stderr capture in logs output
  - #114: Clarify tail vs limit dual-truncation in logs docs
  - #115: Add `labels` field to network-ls schema
  - #116: Add `ipv6`, `internal`, `attachable` booleans to network-ls
  - #117: Capture `labels` as `Record<string, string>` in ps
  - #118: Capture `networks` as `string[]` in ps
  - #119: Fix digest-only pull parsing — set `tag` to digest ref
  - #120: Add `size` output field from pull summary
  - #121: Return structured error with `exitCode`, `stderr`, `errorCategory` in run
  - #122: Capture stdout/stderr for non-detached runs
  - #123: Add `memoryUsageBytes` and `memoryLimitBytes` numeric fields to stats
  - #124: Add structured I/O fields: `netIn`, `netOut`, `blockRead`, `blockWrite` to stats
  - #125: Add `labels` field to volume-ls schema

- [#459](https://github.com/Dave-London/Pare/pull/459) [`20b6c8f`](https://github.com/Dave-London/Pare/commit/20b6c8f98e08852a4cccfd9e0109a280951490fc) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for Docker tools
  - build: Add buildArgs, target, platform, label, cacheFrom, cacheTo, secret, ssh params
  - compose-build: Add file, ssh, builder params
  - compose-down: Add rmi enum param, services positional args
  - compose-logs: Add until param, file param for compose file targeting
  - compose-ps: Add file, services, status, filter params; state field changed to enum
  - compose-up: Add pull enum param (always/missing/never)
  - exec: Add user, envFile params; add duration to output schema
  - images: Add digest field to output schema
  - inspect: Add type enum, size param; add healthStatus, env, restartPolicy to output
  - logs: Add until param for time-bounded queries
  - network-ls: Add filter param (string or string[]); add createdAt to output; preserve id in compact
  - ps: Add filter param; preserve full container ID (no truncation)
  - pull: Preserve digest in compact output
  - run: Add workdir, network, platform, entrypoint, user, restart, memory, hostname, shmSize, pull, envFile params
  - stats: Add path param; preserve memoryUsage in compact output
  - volume-ls: Add filter param (string or string[]); add createdAt to output; preserve mountpoint in compact
  - compose-logs compact: Preserve timestamps in head/tail entries

- [#447](https://github.com/Dave-London/Pare/pull/447) [`32e14af`](https://github.com/Dave-London/Pare/commit/32e14af1b7fa41da945517aa71496d427c206e97) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Docker tools (XS complexity gaps)

- [#486](https://github.com/Dave-London/Pare/pull/486) [`982d087`](https://github.com/Dave-London/Pare/commit/982d0877fecb03d2aa1bed95b45426a44d719623) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(github,docker): add gist path validation, issue-create body stdin, docker/images filter, docker/inspect image support

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/git

### Minor Changes

- [#470](https://github.com/Dave-London/Pare/pull/470) [`449e4e8`](https://github.com/Dave-London/Pare/commit/449e4e8fb80a285226f04d61be5801d03d5c0162) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): implement S-complexity gaps — add validated params, enums, and output schema enhancements

- [#484](https://github.com/Dave-London/Pare/pull/484) [`02f25c1`](https://github.com/Dave-London/Pare/commit/02f25c15f341f0e6f9c239f6cba98e356543b33c) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for 10 git tools with structured fields:
  - git/add: `files` now returns `Array<{file, status}>` instead of `string[]`
  - git/branch: populate `upstream` field from `-vv` output
  - git/cherry-pick: add `state` field ("completed", "conflict", "in-progress")
  - git/diff: add `binary: boolean` field for binary file detection
  - git/merge: add `state` field ("completed", "conflict", "already-up-to-date", "fast-forward")
  - git/rebase: add `state` field ("completed", "conflict", "in-progress")
  - git/reflog: add `totalAvailable` field for total entry count
  - git/reset: add `previousRef`/`newRef` fields
  - git/restore: add post-restore verification (`verified`, `verifiedFiles`)
  - git/worktree: add `locked`/`prunable` fields

- [#478](https://github.com/Dave-London/Pare/pull/478) [`86d7b94`](https://github.com/Dave-London/Pare/commit/86d7b9474a7b700809ff0bd8fdbbca1e4f4bf12e) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): add P0 parser bug fixes and error handling improvements
  - Normalize reflog action field values across git versions
  - Add structured error output for checkout conflicts/failures
  - Add structured error output for push failures (rejected, non-fast-forward)
  - Handle nothing-to-stash gracefully with clear reason field
  - Handle stash pop/apply conflicts with structured conflict info

- [#489](https://github.com/Dave-London/Pare/pull/489) [`3128b43`](https://github.com/Dave-London/Pare/commit/3128b437a12158c573fef7fcc563ea365e29673c) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): add bisect/run, remote/add, remote/remove, tag/create, tag/delete actions and reset --hard safety guard

- [#503](https://github.com/Dave-London/Pare/pull/503) [`79585b3`](https://github.com/Dave-London/Pare/commit/79585b37aa1c310d8a44b21a1b2518a06d0a567c) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(git): improve add, blame, commit, log, pull, remote, reset, show, stash output (P1)
  - Add newlyStaged count to add output
  - Use full 40-char hashes in blame
  - Improve commit hash extraction for special branch names
  - Add fullMessage field to log output
  - Add parsed refs to log-graph entries
  - Add conflict and changed file parsing to pull
  - Add remote rename, set-url, prune, show subcommands
  - Add files+mode validation to reset
  - Guard against @@ delimiter corruption in show
  - Add stash show action and stash-list content summary

- [#450](https://github.com/Dave-London/Pare/pull/450) [`a7ed64b`](https://github.com/Dave-London/Pare/commit/a7ed64b6c70aa475d36b9e372f2ecf817e93df6c) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all git tools (XS complexity gaps)

### Patch Changes

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/go

### Minor Changes

- [#476](https://github.com/Dave-London/Pare/pull/476) [`37908b5`](https://github.com/Dave-London/Pare/commit/37908b587d75dd234ac81be96774ccb982460d40) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(go): capture non-file build errors, fix fmt files-changed detection, populate test failure output, surface package-level test failures

- [#488](https://github.com/Dave-London/Pare/pull/488) [`c7be01b`](https://github.com/Dave-London/Pare/commit/c7be01bdad905c115533b9292f118a7bbbba7615) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): add go/get version resolution, go/list modules mode, go/run output limits, go/vet JSON parsing

- [#495](https://github.com/Dave-London/Pare/pull/495) [`811edb3`](https://github.com/Dave-London/Pare/commit/811edb3dfcf7eb24b721c0cb118bd40e87d6c286) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(go): improve env, fmt, generate, get, list, vet, golangci-lint, mod-tidy output (P1)
  - Improve env compact mode for filtered queries
  - Capture fmt stderr parse errors
  - Parse generate per-directive output
  - Add per-package status to get output
  - Capture golangci-lint Replacement/fix data
  - Capture list Error field per package
  - Distinguish mod-tidy "already tidy" from "made changes"
  - Add analyzer name to vet diagnostics

- [#460](https://github.com/Dave-London/Pare/pull/460) [`e314903`](https://github.com/Dave-London/Pare/commit/e314903cfd90724224b6ca39468867895f09e7e7) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Go tools:
  - build: add tags, ldflags, output, buildmode, gcflags params
  - env: add JSON parse error handling with success field, fix filtered vars mode
  - generate: add run, skip, tags params
  - get: add update enum param (all | patch)
  - golangci-lint: add newFromRev, enable/disable, timeout, buildTags, concurrency, maxIssuesPerLinter, maxSameIssues, presets params; add resultsTruncated schema field
  - list: add success field to schema, tags param, testGoFiles to package schema
  - mod-tidy: add goVersion, compat params
  - run: add tags, timeout, exec, maxOutput params; clarify buildArgs interaction with assertNoFlagInjection
  - test: add timeout, count, cover, coverprofile, tags, parallel, shuffle params
  - vet: add success field to schema, analyzers, tags, contextLines, vettool params

- [#452](https://github.com/Dave-London/Pare/pull/452) [`6878a0f`](https://github.com/Dave-London/Pare/commit/6878a0f4facb838648e062c4aea9170e7b674782) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Go tools (XS complexity gaps)

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/lint

### Minor Changes

- [#497](https://github.com/Dave-London/Pare/pull/497) [`2ec20a0`](https://github.com/Dave-London/Pare/commit/2ec20a023476ecd525a41611d79f9bad9d3578af) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(lint): improve biome, prettier, and shellcheck parsers (P1)
  - Improve biome-check line number extraction from JSON output (support both v2+ start/end format and legacy sourceCode format)
  - Improve biome-format parser to use --reporter=json for accurate changed/unchanged file counts
  - Use --list-different for more accurate prettier-format change counting
  - Validate shellcheck file patterns and automatically expand directories to shell script files

- [#458](https://github.com/Dave-London/Pare/pull/458) [`58e1520`](https://github.com/Dave-London/Pare/commit/58e1520b65f1ddff8859543193c6e03603cbef07) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap params and output schema enhancements across all lint tools:
  - biome-check: since, configPath, linterEnabled/formatterEnabled, maxDiagnostics, skip
  - biome-format: since, configPath
  - format-check: config, ignorePath, parser
  - hadolint: config, requireLabel, shell, errorRules/warningRules/infoRules severity overrides
  - lint (eslint): maxWarnings, config, fixType, rule
  - oxlint: config, deny/warn/allow, plugins, tsconfig, ignorePath
  - prettier-format: config
  - shellcheck: exclude, enable, include, rcfile, sourcePath
  - stylelint: maxWarnings, config, ignorePath
  - Output schema: column in diagnostics (eslint, stylelint, oxlint, shellcheck, hadolint, biome), fixableErrorCount/fixableWarningCount (eslint), wikiUrl for hadolint DL rules

- [#453](https://github.com/Dave-London/Pare/pull/453) [`21dfa99`](https://github.com/Dave-London/Pare/commit/21dfa99862afa575360eca1eb1dda71f767a349f) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity gap items across all lint tools:
  - biome-check: Add `apply`, `applyUnsafe`, `diagnosticLevel`, `changed`, and `staged` params
  - biome-format: Add `changed`, `staged`, `indentStyle`, `lineWidth`, `quoteStyle`, `semicolons`, and `lineEnding` params
  - format-check: Add `ignoreUnknown`, `cache`, `noConfig`, and `logLevel` params
  - hadolint: Add `failureThreshold`, `noFail`, `strictLabels`, and `verbose` params
  - lint (eslint): Add `quiet`, `noIgnore`, `cache`, and `fixDryRun` params
  - oxlint: Add `fix`, `quiet`, `fixSuggestions`, `threads`, and `noIgnore` params
  - prettier-format: Add `ignoreUnknown`, `cache`, `noConfig`, `logLevel`, and `endOfLine` params
  - shellcheck: Add `shell`, `externalSources`, `checkSourced`, and `norc` params
  - stylelint: Add `quiet`, `allowEmptyInput`, `cache`, `reportNeedlessDisables`, and `ignoreDisables` params

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/npm

### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#475](https://github.com/Dave-London/Pare/pull/475) [`f94ec73`](https://github.com/Dave-London/Pare/commit/f94ec730e6adcd0a77774e1e849dd82b8404d201) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(npm): add stderr to init output schema for error visibility
  fix(make): parse make target descriptions from ## comment convention

- [#498](https://github.com/Dave-London/Pare/pull/498) [`e78ddea`](https://github.com/Dave-London/Pare/commit/e78ddeab1679fbd767251da9e6346ebda318d4ce) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(npm): improve install/list output, add nvm modes, add timeout detection (P1)
  - Improve install output with specific package details (best-effort parsing)
  - Fix pnpm workspace array handling in list tool (merges all workspace projects)
  - Add dependency type field to list output (dependency/devDependency/optionalDependency)
  - Add nvm ls-remote and exec actions
  - Add LTS tagging to nvm version output
  - Add timeout detection to run tool
  - Add best-effort test result parsing to test tool (jest/vitest/mocha/tap)

- [#465](https://github.com/Dave-London/Pare/pull/465) [`8be4ff2`](https://github.com/Dave-London/Pare/commit/8be4ff272de5657041e2d1927c8a33f171ea4745) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for npm tools:

  **audit**: Add `level` (severity enum), `production` (boolean), `omit` (array), `workspace`, and `args` params. Add `cve`/`cwe` fields to vulnerability output schema.

  **info**: Add `registry`, `field`, and `workspace` params. Add `engines`, `peerDependencies`, `deprecated`, `repository`, `keywords`, `versions`, and `dist.integrity` to output schema.

  **init**: Add `license`, `authorName`, `authorEmail`, `authorUrl`, `version`, `module`, and `workspace` params.

  **install**: Add `global` and `registry` params.

  **list**: Add `packages` (string[]), `workspace`, and `args` params.

  **nvm**: Add `which` (Node.js binary path) and `arch` (architecture) to output schema.

  **outdated**: Add `packages` (string[]), `workspace`, and `args` params.

  **run**: Add `workspace` (string or string[]) and `scriptShell` params.

  **search**: Add `exclude`, `registry`, and `searchopts` params. Add `keywords`, `score`, `links`, `scope`, and `registryTotal` to output schema.

  **test**: Add `workspace` (string or string[]) param.

- [#444](https://github.com/Dave-London/Pare/pull/444) [`10583b5`](https://github.com/Dave-London/Pare/commit/10583b55d936c426d71b986f2895d1d0171191b2) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity missing flags and security fixes across all npm tools:
  - **init**: `force` (--force), `private` (yarn --private)
  - **install**: `saveDev` (--save-dev), `frozenLockfile` (--frozen-lockfile / npm ci), `dryRun` (--dry-run), `production` (--omit=dev / --prod / --production), `legacyPeerDeps` (--legacy-peer-deps), `force` (--force), `noAudit` (--no-audit), `exact` (--save-exact)
  - **list**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `global` (--global), security fix for `filter` param
  - **outdated**: `production` (--omit=dev / --prod), `all` (--all), `long` (--long), `compatible` (--compatible), `devOnly` (--dev), security fix for `filter` param
  - **run**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
  - **test**: `ifPresent` (--if-present), `recursive` (--recursive / --workspaces), `ignoreScripts` (--ignore-scripts), `silent` (--silent), `parallel` (--parallel), `stream` (--stream)
  - **search**: `preferOnline` (--prefer-online)
  - **audit**: `packageLockOnly` (--package-lock-only)

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/python

### Minor Changes

- [#487](https://github.com/Dave-London/Pare/pull/487) [`48cd9c5`](https://github.com/Dave-London/Pare/commit/48cd9c51b89be6f001979cb0de16b43c91229347) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(cargo,k8s,python,npm): add output truncation, helm uninstall/rollback, pip-list outdated, pyenv installList, uv-run flag isolation, npm audit fix, nvm .nvmrc

- [#483](https://github.com/Dave-London/Pare/pull/483) [`6ad0dbf`](https://github.com/Dave-London/Pare/commit/6ad0dbf01d65d87bc3f8b383025d792fb0ab3ad2) Thanks [@Dave-London](https://github.com/Dave-London)! - Enrich output schemas for docker/compose-ps (structured ports), docker/pull (status enum), go/list (imports field), and python/ruff-format (filesUnchanged count)

- [#477](https://github.com/Dave-London/Pare/pull/477) [`1101a13`](https://github.com/Dave-London/Pare/commit/1101a1366e87f9e1d0f484c5bb218adde2718607) Thanks [@Dave-London](https://github.com/Dave-London)! - fix(python): fix pip-audit redundant arg, pip-install dry-run parsing, pyenv current detection, ruff-format check mode parsing, black exit code distinction, and uv-install resolution error parsing

- [#501](https://github.com/Dave-London/Pare/pull/501) [`15f7c52`](https://github.com/Dave-London/Pare/commit/15f7c52b5f984f5fb6004284baa9cad036545742) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(python): improve mypy, pip, poetry, pyenv, pytest, ruff output (P1)
  - Switch mypy to JSON output for reliable parsing
  - Separate notes from warnings in mypy output
  - Add severity/aliases to pip-audit vulnerabilities
  - Surface pip-list parse errors
  - Support multiple packages in pip-show
  - Tighten poetry show regex
  - Add pyenv uninstall action
  - Add warnings count to pytest output
  - Capture ruff-check fix applicability

- [#461](https://github.com/Dave-London/Pare/pull/461) [`5e6cee4`](https://github.com/Dave-London/Pare/commit/5e6cee45b7f740ffa7851ee0d4ac29f4792d9c8f) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for Python tools:
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

- [#448](https://github.com/Dave-London/Pare/pull/448) [`2a0c827`](https://github.com/Dave-London/Pare/commit/2a0c82706c7917f490affd3ed89945f5c2aa9532) Thanks [@Dave-London](https://github.com/Dave-London)! - Add missing CLI flag parameters across all Python tools (XS complexity gaps)

### Patch Changes

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

#### @paretools/shared

### Patch Changes

- [#504](https://github.com/Dave-London/Pare/pull/504) [`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173) Thanks [@Dave-London](https://github.com/Dave-London)! - fix CI: add docker formatter tests for branch coverage, skip Windows symlink tests, remove unused eslint-disable

- [#473](https://github.com/Dave-London/Pare/pull/473) [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915) Thanks [@Dave-London](https://github.com/Dave-London)! - Raise default runner and test timeouts from 60s/120s to 180s to fix Windows CI flakiness

#### @paretools/test

### Minor Changes

- [#485](https://github.com/Dave-London/Pare/pull/485) [`4a28353`](https://github.com/Dave-London/Pare/commit/4a283534680f6a3c6362ff329e5785464b4f3527) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(test): add bail, testNamePattern, workers params to run and failUnder to coverage

- [#494](https://github.com/Dave-London/Pare/pull/494) [`6b292bb`](https://github.com/Dave-London/Pare/commit/6b292bbee33ed85e4311361f23d7847b05ce58c1) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(test): add meetsThreshold, playwright flaky detection, and timeout param (P1)
  - Add `meetsThreshold` boolean to coverage output when `failUnder` is specified
  - Add `flaky` count to Playwright test results from JSON stats
  - Add `timeout` parameter to test run tool with per-framework mapping

- [#469](https://github.com/Dave-London/Pare/pull/469) [`5b0090f`](https://github.com/Dave-London/Pare/commit/5b0090f38625a8b0366eb80e516f603bc6356a30) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement S-complexity gaps for test tools
  - coverage: Add args, source, exclude, filter params with per-framework flag mapping
  - playwright: Add grep, browser, shard, trace (enum), config params
  - run: Add shard, config params with per-framework flag mapping

- [#455](https://github.com/Dave-London/Pare/pull/455) [`0b94417`](https://github.com/Dave-London/Pare/commit/0b94417c988376c93204acd54e9108b7416610b3) Thanks [@Dave-London](https://github.com/Dave-London)! - Add XS-complexity missing flags across all test tools:
  - **playwright**: `workers` (--workers), `retries` (--retries), `maxFailures` (--max-failures), `timeout` (--timeout), `lastFailed` (--last-failed), `onlyChanged` (--only-changed), `forbidOnly` (--forbid-only), `passWithNoTests` (--pass-with-no-tests)
  - **run**: `onlyChanged` (--lf / --onlyChanged / --changed), `exitFirst` (-x / --bail=1 / -b), `passWithNoTests` (--passWithNoTests)
  - **coverage**: `branch` (--cov-branch), `all` (--coverage.all / --all)

### Patch Changes

- [#440](https://github.com/Dave-London/Pare/pull/440) [`d64e6fd`](https://github.com/Dave-London/Pare/commit/d64e6fd423439b18b2f285bdad160041eb3ca5a7) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix tool bugs found while dogfooding:
  - Add `admin` option to pr-merge for bypassing branch protection
  - Fix pull tool divergent branches by always passing explicit merge strategy
  - Fix push tool setUpstream by auto-detecting current branch name
  - Add `coverage` boolean to test run tool for running tests with coverage

- Updated dependencies [[`e69ccda`](https://github.com/Dave-London/Pare/commit/e69ccdaefb391d90a2616e9cf32fde5697df1173), [`0042862`](https://github.com/Dave-London/Pare/commit/0042862ddb9c6cd0b677244efffb5a7e18b3e915)]:
  - @paretools/shared@0.9.0

---

### 0.8.5

#### @paretools/build

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/git

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/go

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/python

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

#### @paretools/shared

### Patch Changes

- [#431](https://github.com/Dave-London/Pare/pull/431) [`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a) Thanks [@Dave-London](https://github.com/Dave-London)! - Align @paretools/shared version with all server packages

#### @paretools/test

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

---

### 0.8.4

#### @paretools/build

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/cargo

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/docker

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/git

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/go

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/lint

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/npm

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/python

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

#### @paretools/test

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

---

### 0.8.3

#### @paretools/build

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/cargo

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/docker

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/git

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/go

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/lint

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/npm

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/python

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

#### @paretools/shared

### Patch Changes

- [#428](https://github.com/Dave-London/Pare/pull/428) [`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210) Thanks [@Dave-London](https://github.com/Dave-London)! - Align shared package version with server packages at 0.8.3

#### @paretools/test

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

---

### 0.8.2

#### @paretools/build

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add turbo and nx monorepo build tools.

#### @paretools/cargo

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

#### @paretools/docker

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add compose-logs, compose-build, and docker-stats tools.

#### @paretools/git

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add log-graph, reflog, bisect, and worktree tools. Fix file path case mismatch on Windows.

#### @paretools/go

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add cargo-audit tool for Rust dependency auditing. Add golangci-lint tool for Go linting. Add jq tool for JSON processing.

#### @paretools/lint

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shellcheck (shell script linter) and hadolint (Dockerfile linter) tools.

#### @paretools/npm

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add pnpm and yarn package manager support. Add nvm tool for Node.js version management.

#### @paretools/python

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add conda, pyenv, and poetry tools for Python environment and dependency management.

#### @paretools/shared

### Patch Changes

- [#421](https://github.com/Dave-London/Pare/pull/421) [`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7) Thanks [@Dave-London](https://github.com/Dave-London)! - fix: include assertAllowedRoot and assertAllowedByPolicy exports that were missing from v0.8.1

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

#### @paretools/test

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add playwright tool for running Playwright tests with structured JSON results.

---

### 0.8.1

#### @paretools/build

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/cargo

### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/docker

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/git

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/go

### Patch Changes

- [#295](https://github.com/Dave-London/Pare/pull/295) [`5e11f81`](https://github.com/Dave-London/Pare/commit/5e11f81070c1c6dfd38030d088e0e4f3711219c3) Thanks [@Dave-London](https://github.com/Dave-London)! - Align remaining packages from 0.8.0 to 0.8.1 for consistent monorepo versioning.

#### @paretools/lint

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/npm

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/python

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/shared

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

#### @paretools/test

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

---

### 0.8.0

#### @paretools/build

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/cargo

### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/docker

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/git

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/go

### Minor Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

### Patch Changes

- [#259](https://github.com/Dave-London/Pare/pull/259) [`f6948f4`](https://github.com/Dave-London/Pare/commit/f6948f428a29cd9d74a338bcdb2c7c984d47d521) Thanks [@Dave-London](https://github.com/Dave-London)! - Align all packages to 0.8.1 for consistent versioning across the monorepo.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

#### @paretools/lint

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/npm

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/python

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/shared

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

#### @paretools/test

### Minor Changes

- ### Highlights
  - **100 tools** across 14 packages — the full Pare tool suite
  - **Comprehensive benchmark**: 148 scenarios measuring token efficiency across all tools, with session impact analysis and cost savings estimates
  - **Windows reliability**: Fix git log/show format strings on Windows (angle brackets in `%an <%ae>` no longer misinterpreted by cmd.exe), align CI timeout layers

  ### Changes by package

  **@paretools/shared**
  - Add `shell` option to `RunOptions` for callers to override default shell behavior
  - Remove cmd.exe percent escaping that broke git format strings
  - Align CI timeout layers to 120s

  **@paretools/git**
  - Fix log/show returning literal format codes on Windows by disabling shell mode for native git.exe
  - Merge author+email into single field (`author` instead of separate `author`/`email`)
  - Deduplicate blame output by grouping lines per commit
  - Add `copied` field to diff schema

  **@paretools/npm**
  - Flatten nested deps with `>` delimited paths in compact mode
  - Remove resolved URLs from list schema (token savings)
  - Remove fileCount/unpackedSize from info dist (token savings)

  **@paretools/build**
  - Drop redundant errorCount/warningCount from build schemas (token savings)

  **@paretools/lint**
  - Trim diagnostic schema: drop column, fixable, endLine, endColumn (token savings)
  - Align integration test timeouts for Windows CI reliability

  **@paretools/test**
  - Restore message field in test failure compact mode

  **@paretools/docker**
  - Cap logs full mode output to prevent unbounded tokens
  - Truncate container IDs to 12 chars and prefer relative timestamps

  **@paretools/python**
  - Align integration test timeouts for Windows CI reliability

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

---

### 0.7.1

#### @paretools/cargo

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

#### @paretools/go

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.8.0

---

### 0.7.0

#### @paretools/build

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/cargo

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/docker

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/git

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/go

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/lint

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/npm

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/python

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

#### @paretools/shared

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

#### @paretools/test

### Minor Changes

- v0.7.0 — 100 tools, 14 packages

  New packages:
  - `@paretools/github` — 8 tools wrapping the `gh` CLI (pr-view, pr-list, pr-create, issue-view, issue-list, issue-create, run-view, run-list)
  - `@paretools/search` — 3 tools wrapping ripgrep and fd (search, find, count)
  - `@paretools/http` — 4 tools wrapping curl (request, get, post, head)
  - `@paretools/make` — 2 tools wrapping make and just (run, list)

  Expanded servers:
  - `@paretools/git` +5 tools: tag, stash-list, stash, remote, blame
  - `@paretools/docker` +4 tools: inspect, network-ls, volume-ls, compose-ps
  - `@paretools/go` +3 tools: env, list, get
  - `@paretools/python` +3 tools: pip-list, pip-show, ruff-format
  - `@paretools/npm` +2 tools: info, search
  - `@paretools/cargo` +2 tools: update, tree
  - `@paretools/lint` +2 tools: stylelint, oxlint

  Cross-cutting:
  - `@paretools/shared` — granular tool selection via `PARE_TOOLS` and `PARE_{SERVER}_TOOLS` environment variables (#111)

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.7.0

---

### 0.6.0

#### @paretools/build

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/cargo

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/docker

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/git

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/go

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/lint

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/npm

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/python

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

#### @paretools/shared

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

#### @paretools/test

### Minor Changes

- [`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90) Thanks [@Dave-London](https://github.com/Dave-London)! - ### Automatic compact mode

  All 9 servers now support automatic compact mode. When structured JSON output would exceed the raw CLI token count, Pare automatically applies a compact projection — keeping essential fields and dropping verbose details like stack traces, individual diagnostics, and file-level stats. This ensures Pare always uses fewer tokens than raw CLI output. Each tool accepts a `compact` parameter (default: `true`) to opt out if needed.

  ### Security hardening
  - Block dangerous Docker volume mounts (`/`, `/etc`, `/var/run/docker.sock`)
  - Default `ignoreScripts: true` for npm install
  - Validate all `args[]` arrays against flag injection
  - Windows `cmd.exe` delayed expansion escaping
  - Zod input size limits on all string/array parameters
  - Error message sanitization to prevent path leakage

  ### Reliability
  - Increased default `run()` timeout from 30s to 60s
  - Fixed flaky Windows test timeouts

### Patch Changes

- Updated dependencies [[`975d319`](https://github.com/Dave-London/Pare/commit/975d319bec6b7511066b4463cd24eb49a1c91a90)]:
  - @paretools/shared@0.6.0

---

### 0.5.0

#### @paretools/build

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/cargo

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/docker

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/git

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/go

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/lint

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/npm

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/python

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

#### @paretools/shared

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

#### @paretools/test

### Minor Changes

- v0.5.0 release — 62 tools across 9 language servers.

  ### New Tools (since v0.3.0)
  - **git**: add, commit, push, pull, checkout (full git workflow)
  - **docker**: run, exec, compose-up, compose-down, pull (full container lifecycle)
  - **cargo**: run, add, remove, fmt, doc, check (full Rust workflow)
  - **python**: pytest, uv-install, uv-run, black (testing + formatting)
  - **npm**: run, test, init (script execution + project scaffolding)
  - **go**: run, mod-tidy, fmt, generate (full Go workflow)
  - **build**: esbuild, vite-build, webpack (bundler support)
  - **lint**: prettier-format, biome-check, biome-format (Biome + write mode)

  ### Testing
  - Expanded test suite from 305 to 1,334 tests across 80+ files
  - Added fidelity, integration, and runner tests for all packages

  ### Discoverability
  - Updated all per-package READMEs with complete tool listings, badges, and cross-references
  - Expanded npm keywords for better search visibility
  - Added CI, version, license, and Node.js badges to root README

### Patch Changes

- Updated dependencies []:
  - @paretools/shared@0.5.0

---

### 0.3.0

#### @paretools/build

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/cargo

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/docker

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/git

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/go

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/lint

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/npm

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/python

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

#### @paretools/shared

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

#### @paretools/test

### Minor Changes

- [#31](https://github.com/Dave-London/pare/pull/31) [`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547) Thanks [@Dave-London](https://github.com/Dave-London)! - Security, discoverability, and test coverage improvements.

  ### Security
  - Fix git argument injection: block ref/branch params starting with `-`
  - Fix build command injection: allowlist of 24 known build tools
  - New `assertNoFlagInjection` and `assertAllowedCommand` validation utilities

  ### Features
  - Add MCP `instructions` field to all 9 servers for better client guidance
  - Optimize tool descriptions with "Use instead of" phrasing for agent discoverability
  - Increase default timeouts for build/install operations (5 min for docker, npm, cargo, go)

  ### Testing
  - Expand test suite from 146 to 305 tests
  - Add fidelity tests proving no information loss in git and vitest parsers
  - Add formatter, integration, and validation tests across all packages

  ### Infrastructure
  - Add `mcpName` field for Official MCP Registry compatibility
  - Add Smithery registry configs for all 9 servers
  - Add Dependabot, CODEOWNERS, FUNDING.yml, feature-request template
  - Expand README with per-client configs, agent snippets, and troubleshooting

### Patch Changes

- Updated dependencies [[`2ccda44`](https://github.com/Dave-London/pare/commit/2ccda44c5118a91692da215d968ef1b178b4a547)]:
  - @paretools/shared@0.3.0

---

### 0.2.0

#### @paretools/build

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/cargo

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/docker

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/git

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/go

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/lint

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/npm

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/python

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0

#### @paretools/shared

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

#### @paretools/test

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0


<!-- END AGGREGATED CHANGELOG -->
