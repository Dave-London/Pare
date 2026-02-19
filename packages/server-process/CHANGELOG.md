# @paretools/process

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

- [#490](https://github.com/Dave-London/Pare/pull/490) [`0cee3e2`](https://github.com/Dave-London/Pare/commit/0cee3e2c9052ceb9167cfd121c4a8065ff1fe665) Thanks [@Dave-London](https://github.com/Dave-London)! - feat(process): add truncated detection, shell mode, and stripEnv options (P1)
  - Add `truncated` boolean to output schema for maxBuffer detection
  - Add `shell` parameter for shell-mode execution with security warnings
  - Add `stripEnv` parameter for minimal environment isolation

- [#464](https://github.com/Dave-London/Pare/pull/464) [`d0083a0`](https://github.com/Dave-London/Pare/commit/d0083a04c0118bcd7cc821b59d370d7d7f0bb16b) Thanks [@Dave-London](https://github.com/Dave-London)! - Add S-complexity gap implementations for the process run tool:
  - Add `stdin` param for piping input data to commands (e.g., jq, grep)
  - Add `maxBuffer` param to control maximum stdout+stderr buffer size
  - Add `killSignal` param (enum) to control signal sent on timeout
  - Add `maxOutputLines` param to truncate output by line count (agent-friendly)
  - Add `encoding` param (enum) for non-UTF-8 output support
  - Add `stdoutTruncatedLines` and `stderrTruncatedLines` output fields

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

- Updated dependencies [[`2e4ad7f`](https://github.com/Dave-London/Pare/commit/2e4ad7f515a5e1763188ed02b09aabe9798bcfa7), [`89b3690`](https://github.com/Dave-London/Pare/commit/89b3690a73619f2481409db33964083d1e88c05b)]:
  - @paretools/shared@0.8.2

## 0.8.2

### Patch Changes

- [#400](https://github.com/Dave-London/Pare/pull/400) [`e5d12d5`](https://github.com/Dave-London/Pare/commit/e5d12d55484546888d3c9a7be9f1b26d2b927221) Thanks [@Dave-London](https://github.com/Dave-London)! - New packages: k8s (kubectl, helm), process (process-run), and security (trivy, semgrep, gitleaks).
