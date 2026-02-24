# deno > task

Runs a named task from deno.json via `deno task` and returns structured output (stdout, stderr, exit code, duration).

**Command**: `deno task <name>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `name`    | string   | —       | Task name as defined in deno.json (required)               |
| `args`    | string[] | `[]`    | Additional arguments to pass to the task                   |
| `path`    | string   | cwd     | Project root path                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Task Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ deno task build
Task build deno run -A scripts/build.ts
Compiling 12 modules...
Build complete.
```

</td>
<td>

~50 tokens

```json
{
  "task": "build",
  "success": true,
  "exitCode": 0,
  "stdout": "Compiling 12 modules...\nBuild complete.",
  "duration": 2450,
  "timedOut": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "task": "build",
  "success": true,
  "exitCode": 0,
  "duration": 2450,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Task Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~90 tokens

```
$ deno task deploy
Task deploy deno run -A scripts/deploy.ts
Deploying to production...
error: Connection refused (os error 111)
    at file:///home/user/scripts/deploy.ts:15:3
```

</td>
<td>

~60 tokens

```json
{
  "task": "deploy",
  "success": false,
  "exitCode": 1,
  "stderr": "error: Connection refused (os error 111)\n    at file:///home/user/scripts/deploy.ts:15:3",
  "duration": 3200,
  "timedOut": false
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "task": "deploy",
  "success": false,
  "exitCode": 1,
  "duration": 3200,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Task succeeds | ~50        | ~50       | ~25          | 0-50%   |
| Task fails    | ~90        | ~60       | ~25          | 33-72%  |

## Notes

- The `name` parameter is validated against flag injection (no leading `-` or `--` allowed)
- Tasks are defined in `deno.json` or `deno.jsonc` under the `"tasks"` field
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `task`, `success`, `exitCode`, `duration`, and `timedOut`
- If the task times out, `timedOut` is set to `true` and `exitCode` is `124`
