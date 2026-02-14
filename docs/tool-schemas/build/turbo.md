# build > turbo

Runs Turborepo tasks and returns structured per-package results with cache hit/miss info.

**Command**: `npx turbo run <task> --output-logs=new-only [--filter <pkg>]`

## Input Parameters

| Parameter     | Type    | Default | Description                                                |
| ------------- | ------- | ------- | ---------------------------------------------------------- |
| `task`        | string  | ---     | Turbo task to run (e.g., `build`, `test`, `lint`)          |
| `filter`      | string  | ---     | Package filter (e.g., `@scope/pkg` or `pkg...`)            |
| `concurrency` | number  | ---     | Maximum number of concurrent tasks                         |
| `path`        | string  | cwd     | Project root path                                          |
| `compact`     | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success --- All Tasks Pass

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ npx turbo run build

 Tasks:    5 successful, 5 total
 Cached:   3 cached, 5 total
   Time:    4.2s

@scope/shared#build: cache hit, replaying logs abc123 (100ms)
@scope/utils#build: cache hit, replaying logs def456 (95ms)
@scope/core#build: cache hit, replaying logs ghi789 (110ms)
@scope/api#build: cache miss, executing jkl012 (2.1s)
@scope/web#build: cache miss, executing mno345 (1.8s)
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "duration": 4.2,
  "tasks": [
    {
      "package": "@scope/shared",
      "task": "build",
      "status": "pass",
      "duration": "100ms",
      "cache": "hit"
    },
    {
      "package": "@scope/utils",
      "task": "build",
      "status": "pass",
      "duration": "95ms",
      "cache": "hit"
    },
    {
      "package": "@scope/core",
      "task": "build",
      "status": "pass",
      "duration": "110ms",
      "cache": "hit"
    },
    {
      "package": "@scope/api",
      "task": "build",
      "status": "pass",
      "duration": "2.1s",
      "cache": "miss"
    },
    {
      "package": "@scope/web",
      "task": "build",
      "status": "pass",
      "duration": "1.8s",
      "cache": "miss"
    }
  ],
  "totalTasks": 5,
  "passed": 5,
  "failed": 0,
  "cached": 3
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": true,
  "duration": 4.2,
  "totalTasks": 5,
  "passed": 5,
  "failed": 0,
  "cached": 3
}
```

</td>
</tr>
</table>

## Error --- Task Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
$ npx turbo run build

 Tasks:    2 successful, 3 total
 Cached:   1 cached, 3 total
   Time:    3.5s

@scope/shared#build: cache hit, replaying logs abc123 (100ms)
@scope/core#build: cache miss, executing def456 (1.2s)
@scope/web#build: command exited (1)

ERROR: command finished with error: exit status 1
```

</td>
<td>

~70 tokens

```json
{
  "success": false,
  "duration": 3.5,
  "tasks": [
    {
      "package": "@scope/shared",
      "task": "build",
      "status": "pass",
      "duration": "100ms",
      "cache": "hit"
    },
    {
      "package": "@scope/core",
      "task": "build",
      "status": "pass",
      "duration": "1.2s",
      "cache": "miss"
    },
    { "package": "@scope/web", "task": "build", "status": "fail", "cache": "miss" }
  ],
  "totalTasks": 3,
  "passed": 2,
  "failed": 1,
  "cached": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": false,
  "duration": 3.5,
  "totalTasks": 3,
  "passed": 2,
  "failed": 1,
  "cached": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 5 tasks, all pass  | ~200       | ~100      | ~30          | 50--85% |
| 3 tasks, 1 failure | ~180       | ~70       | ~30          | 61--83% |

## Notes

- The `--output-logs=new-only` flag is always appended to suppress replayed cache logs
- Task status lines are parsed from the `package#task: cache hit/miss` format
- Failed tasks are detected by `exited (N)` or `ERROR` patterns in the output
- Summary counts (`totalTasks`, `cached`) are parsed from Turbo's summary lines when available, otherwise computed from parsed tasks
- In compact mode, the `tasks` array is omitted; only summary counts (`totalTasks`, `passed`, `failed`, `cached`) are returned
- The `filter` parameter maps to `--filter` and supports Turbo's package filtering syntax (e.g., `@scope/pkg`, `pkg...`, `{./apps/*}`)
