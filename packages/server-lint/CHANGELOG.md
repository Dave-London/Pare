# @paretools/lint

## 0.12.0

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

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

- Updated dependencies [[`3a6f31c`](https://github.com/Dave-London/Pare/commit/3a6f31c92a3507388dacbf1fd69afa3f76e032e2)]:
  - @paretools/shared@0.10.0

## 0.9.0

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

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - Add shellcheck (shell script linter) and hadolint (Dockerfile linter) tools.

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
