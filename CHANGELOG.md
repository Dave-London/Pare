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
