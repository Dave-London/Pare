# @paretools/nix

## 0.13.0

### Minor Changes

- [#634](https://github.com/Dave-London/Pare/pull/634) [`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d) Thanks [@Dave-London](https://github.com/Dave-London)! - Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.

### Patch Changes

- Updated dependencies [[`d280e88`](https://github.com/Dave-London/Pare/commit/d280e888c2025c607de8f07183dc9b333f66254d), [`a4b6fec`](https://github.com/Dave-London/Pare/commit/a4b6fec2badb5aa596215dc3b8971399195d2df5)]:
  - @paretools/shared@0.13.0

## 0.11.1

### Patch Changes

- Updated dependencies [[`6eac155`](https://github.com/Dave-London/Pare/commit/6eac155d9e4efbe4ba5cc43c33622dccf5ffe09c)]:
  - @paretools/shared@0.12.0
