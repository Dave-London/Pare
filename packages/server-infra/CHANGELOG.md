# @paretools/infra

## 0.11.1

### Patch Changes

- [#601](https://github.com/Dave-London/Pare/pull/601) [`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c) Thanks [@Dave-London](https://github.com/Dave-London)! - Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0

## 0.11.0

### Minor Changes

- [#584](https://github.com/Dave-London/Pare/pull/584) [`3acab13`](https://github.com/Dave-London/Pare/commit/3acab1356e85bbea759b8b7fe7d4bfc2daf8359a) Thanks [@Dave-London](https://github.com/Dave-London)! - New package: @paretools/infra — Structured Terraform operations (8 tools)

- [#592](https://github.com/Dave-London/Pare/pull/592) [`3610e74`](https://github.com/Dave-London/Pare/commit/3610e74f5ee06b60115f7ab0165d8d5939f375fb) Thanks [@Dave-London](https://github.com/Dave-London)! - Add vagrant tool with status, global-status, up, halt, and destroy actions

### Patch Changes

- Updated dependencies [[`154f567`](https://github.com/Dave-London/Pare/commit/154f5678d69df15db746d0fc8afbcc2ecc17ac85), [`a069792`](https://github.com/Dave-London/Pare/commit/a069792ad77be8c159fcf9b72ffc6036ff9d25dd)]:
  - @paretools/shared@0.11.0
