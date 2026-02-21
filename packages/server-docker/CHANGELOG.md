# @paretools/docker

## 0.11.0

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0

## 0.10.2

### Patch Changes

- [#570](https://github.com/Dave-London/Pare/pull/570) [`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d) Thanks [@Dave-London](https://github.com/Dave-London)! - Add `bugs` URL to package.json for all packages, linking to the GitHub issues page.

- Updated dependencies [[`0c50be7`](https://github.com/Dave-London/Pare/commit/0c50be7760bc21ef20e735cef3da065ba93bb36d)]:
  - @paretools/shared@0.10.2

## 0.10.1

### Patch Changes

- Updated dependencies [[`da71ee5`](https://github.com/Dave-London/Pare/commit/da71ee56c5626d929a28ce1838019a12d496187b)]:
  - @paretools/shared@0.10.1

## 0.10.0

### Patch Changes

- [#547](https://github.com/Dave-London/Pare/pull/547) [`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2) Thanks [@Dave-London](https://github.com/Dave-London)! - Remove assertNoFlagInjection from args[] parameters — the args parameter is explicitly designed for passing CLI flags to underlying tools, so rejecting values starting with "-" made the parameter non-functional. Security is already ensured by execFile (no shell injection) and assertAllowedCommand (restricts which binary runs).

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

## 0.9.0

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

## 0.8.5

### Patch Changes

- Updated dependencies [[`7bb2541`](https://github.com/Dave-London/Pare/commit/7bb2541bfeaf27f1560ea1fdcecfff36dfb2068a)]:
  - @paretools/shared@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies [[`ac29d96`](https://github.com/Dave-London/Pare/commit/ac29d969a284ce14a67b45e24583cb57f591d210)]:
  - @paretools/shared@0.8.3

## 0.8.3

### Patch Changes

- [#414](https://github.com/Dave-London/Pare/pull/414) [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b) Thanks [@Dave-London](https://github.com/Dave-London)! - Fix stale tool counts across all docs (62/100/112/139 → 147 tools, 14 → 16 packages) and add NVD links for CVE-2025-68144 and CVE-2025-68145 in validation.ts.

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

## 0.8.2

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add compose-logs, compose-build, and docker-stats tools.

## 0.8.1

### Patch Changes

- [#257](https://github.com/Dave-London/Pare/pull/257) [`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294) Thanks [@Dave-London](https://github.com/Dave-London)! - Rebrand for MCP Registry: update mcpName to pare-\* prefix, add Pare-branded descriptions and server names to all server.json files, create server.json for github/http/make/search packages.

- Updated dependencies [[`b22708d`](https://github.com/Dave-London/Pare/commit/b22708dbdbdee9c34c4bfc3dad905190467cb294)]:
  - @paretools/shared@0.8.1

## 0.8.0

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

## 0.7.0

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

## 0.6.0

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

## 0.5.0

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

## 0.3.0

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

## 0.2.0

### Minor Changes

- [#10](https://github.com/Dave-London/pare/pull/10) [`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d) Thanks [@Dave-London](https://github.com/Dave-London)! - Initial release of all Pare MCP servers

### Patch Changes

- Updated dependencies [[`d08cf3d`](https://github.com/Dave-London/pare/commit/d08cf3d967e6a8ff9d65928aeed767fcf13f024d)]:
  - @paretools/shared@0.2.0
