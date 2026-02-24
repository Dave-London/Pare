# bazel > bazel

Bazel build system operations: build, test, query, info, run, clean, fetch.

**Command**: `bazel <action> [flags] [targets]`

## Input Parameters

| Parameter         | Type                                                                                                  | Default    | Description                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `action`          | `"build"` \| `"test"` \| `"query"` \| `"info"` \| `"run"` \| `"clean"` \| `"fetch"`                   | —          | Bazel action (required)                                    |
| `targets`         | string[]                                                                                              | —          | Target patterns (e.g. `//src:app`, `//...`)                |
| `workDir`         | string                                                                                                | cwd        | Repository / workspace path                                |
| `queryExpr`       | string                                                                                                | —          | Query expression for query action                          |
| `queryOutput`     | `"label"` \| `"label_kind"` \| `"minrank"` \| `"maxrank"` \| `"package"` \| `"location"` \| `"build"` | `"label"`  | Query output format                                        |
| `keepGoing`       | boolean                                                                                               | —          | Continue after errors (`-k`)                               |
| `testOutput`      | `"summary"` \| `"errors"` \| `"all"` \| `"streamed"`                                                  | `"errors"` | Test output mode                                           |
| `verboseFailures` | boolean                                                                                               | `true`     | Verbose failure messages                                   |
| `infoKey`         | string                                                                                                | —          | Specific info key                                          |
| `expunge`         | boolean                                                                                               | —          | Full clean with `--expunge`                                |
| `compact`         | boolean                                                                                               | `true`     | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Build (3 targets)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ bazel build //src:app //src:lib //src:utils
INFO: Analyzed 3 targets (15 packages loaded, 120 targets configured).
INFO: Found 3 targets...
INFO: Elapsed time: 4.312s, Critical Path: 2.10s
INFO: 28 processes: 12 internal, 16 linux-sandbox.
INFO: Build completed successfully, 28 total actions
```

</td>
<td>

~85 tokens

```json
{
  "action": "build",
  "success": true,
  "targets": [],
  "summary": {
    "totalTargets": 3,
    "successTargets": 3,
    "failedTargets": 0
  },
  "durationMs": 4312,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~40 tokens

```json
{
  "action": "build",
  "success": true,
  "totalTargets": 3,
  "successTargets": 3,
  "failedTargets": 0,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Success — Test with Failures

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
$ bazel test //tests:all
INFO: Analyzed 4 targets (0 packages loaded, 0 targets configured).
INFO: Found 4 test targets...
//tests:unit_tests                                                       PASSED in 1.2s
//tests:integration_tests                                                PASSED in 3.8s
//tests:e2e_tests                                                        FAILED in 5.1s
  /home/user/.cache/bazel/_bazel_user/abc123/execroot/myproject/bazel-out/k8-fastbuild/testlogs/tests/e2e_tests/test.log
//tests:benchmark_tests                                                  TIMEOUT in 60.0s
  /home/user/.cache/bazel/_bazel_user/abc123/execroot/myproject/bazel-out/k8-fastbuild/testlogs/tests/benchmark_tests/test.log
Executed 4 out of 4 tests: 2 tests pass and 2 fail locally.
INFO: Elapsed time: 72.350s, Critical Path: 60.02s
INFO: Build completed, 1 test FAILED, 4 total actions
```

</td>
<td>

~140 tokens

```json
{
  "action": "test",
  "success": false,
  "tests": [
    { "label": "//tests:unit_tests", "status": "passed", "durationMs": 1200 },
    { "label": "//tests:integration_tests", "status": "passed", "durationMs": 3800 },
    { "label": "//tests:e2e_tests", "status": "failed", "durationMs": 5100 },
    { "label": "//tests:benchmark_tests", "status": "timeout", "durationMs": 60000 }
  ],
  "summary": {
    "totalTests": 4,
    "passed": 2,
    "failed": 1,
    "timeout": 1,
    "flaky": 0,
    "skipped": 0
  },
  "durationMs": 72350,
  "exitCode": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~65 tokens

```json
{
  "action": "test",
  "success": false,
  "totalTests": 4,
  "passed": 2,
  "failed": 1,
  "timeout": 1,
  "flaky": 0,
  "failedTests": [
    { "label": "//tests:e2e_tests", "durationMs": 5100 },
    { "label": "//tests:benchmark_tests", "durationMs": 60000 }
  ],
  "exitCode": 3
}
```

</td>
</tr>
</table>

## Success — Query

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ bazel query 'deps(//src:app)'
//src:app
//src:lib
//src:utils
//third_party:protobuf
//third_party:grpc
@bazel_tools//tools/cpp:toolchain
@bazel_tools//tools/cpp:malloc
```

</td>
<td>

~65 tokens

```json
{
  "action": "query",
  "success": true,
  "results": [
    "//src:app",
    "//src:lib",
    "//src:utils",
    "//third_party:protobuf",
    "//third_party:grpc",
    "@bazel_tools//tools/cpp:toolchain",
    "@bazel_tools//tools/cpp:malloc"
  ],
  "count": 7,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~65 tokens

```json
{
  "action": "query",
  "success": true,
  "count": 7,
  "results": [
    "//src:app",
    "//src:lib",
    "//src:utils",
    "//third_party:protobuf",
    "//third_party:grpc",
    "@bazel_tools//tools/cpp:toolchain",
    "@bazel_tools//tools/cpp:malloc"
  ],
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error — Build Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~280 tokens

```
$ bazel build //src:app
INFO: Analyzed 1 target (0 packages loaded, 0 targets configured).
ERROR: /home/user/project/src/BUILD:12:10: Compiling src/main.cc failed: (Exit 1): gcc failed: error executing CppCompile command
src/main.cc:25:5: error: use of undeclared identifier 'foo'
    foo();
    ^
1 error generated.
ERROR: Target //src:app failed to build
INFO: Elapsed time: 1.820s, Critical Path: 0.85s
INFO: Build completed unsuccessfully, 2 total actions
FAILED: Build did NOT complete successfully
```

</td>
<td>

~110 tokens

```json
{
  "action": "build",
  "success": false,
  "targets": [{ "label": "//src:app", "status": "failed" }],
  "summary": {
    "totalTargets": 1,
    "successTargets": 0,
    "failedTargets": 1
  },
  "errors": [
    {
      "target": "//src:app",
      "message": "Target //src:app failed to build"
    },
    {
      "file": "/home/user/project/src/BUILD",
      "line": 12,
      "message": "Compiling src/main.cc failed: (Exit 1): gcc failed: error executing CppCompile command"
    }
  ],
  "durationMs": 1820,
  "exitCode": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~75 tokens

```json
{
  "action": "build",
  "success": false,
  "totalTargets": 1,
  "successTargets": 0,
  "failedTargets": 1,
  "errors": [
    {
      "target": "//src:app",
      "message": "Target //src:app failed to build"
    },
    {
      "file": "/home/user/project/src/BUILD",
      "line": 12,
      "message": "Compiling src/main.cc failed: (Exit 1): gcc failed: error executing CppCompile command"
    }
  ],
  "exitCode": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Build (3 targets)  | ~180       | ~85       | ~40          | 53-78%  |
| Test with failures | ~350       | ~140      | ~65          | 60-81%  |
| Query (7 deps)     | ~120       | ~65       | ~65          | 46%     |
| Build failure      | ~280       | ~110      | ~75          | 61-73%  |

## Notes

- All actions use `--nocolor` and `--curses=no` for deterministic output parsing
- Target patterns must start with `//`, `@`, or be `"..."` -- validated before execution
- The `run` action requires exactly one target and is gated by policy
- The `clean --expunge` combination is also gated by policy for safety
- Query supports multiple output formats via `queryOutput` (default `label`)
- Compact mode for build flattens the `summary` object and drops the `targets` array; for test it drops per-test results and keeps only failed/timeout tests
- The `info` action returns key-value pairs as a `Record<string, string>` -- when `infoKey` is provided, only that single key is returned
