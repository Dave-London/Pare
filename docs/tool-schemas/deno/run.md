# deno > run

Runs a Deno script with `deno run` and returns structured output (stdout, stderr, exit code, duration).

**Command**: `deno run <file>`

## Input Parameters

| Parameter    | Type     | Default | Description                                                |
| ------------ | -------- | ------- | ---------------------------------------------------------- |
| `file`       | string   | —       | Script file to run (required, e.g. main.ts, server.ts)     |
| `args`       | string[] | `[]`    | Additional arguments to pass to the script                 |
| `path`       | string   | cwd     | Project root path                                          |
| `allowRead`  | boolean  | —       | Allow file system read access (--allow-read)               |
| `allowWrite` | boolean  | —       | Allow file system write access (--allow-write)             |
| `allowNet`   | boolean  | —       | Allow network access (--allow-net)                         |
| `allowEnv`   | boolean  | —       | Allow environment variable access (--allow-env)            |
| `allowAll`   | boolean  | —       | Allow all permissions (-A). Use with caution.              |
| `compact`    | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Script Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ deno run --allow-read main.ts
Processing 42 files...
Done in 1.2s
```

</td>
<td>

~50 tokens

```json
{
  "file": "main.ts",
  "success": true,
  "exitCode": 0,
  "stdout": "Processing 42 files...\nDone in 1.2s",
  "duration": 1240,
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
  "file": "main.ts",
  "success": true,
  "exitCode": 0,
  "duration": 1240,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Permission Denied

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ deno run main.ts
error: Uncaught (in promise) PermissionDenied: Requires read access to "data.json", run again with the --allow-read flag
    at Object.readTextFileSync (ext:deno_fs/30_fs.js:222:3)
    at file:///home/user/main.ts:3:24
```

</td>
<td>

~65 tokens

```json
{
  "file": "main.ts",
  "success": false,
  "exitCode": 1,
  "stderr": "error: Uncaught (in promise) PermissionDenied: Requires read access to \"data.json\", run again with the --allow-read flag\n    at Object.readTextFileSync (ext:deno_fs/30_fs.js:222:3)\n    at file:///home/user/main.ts:3:24",
  "duration": 180,
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
  "file": "main.ts",
  "success": false,
  "exitCode": 1,
  "duration": 180,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Script completes  | ~40        | ~50       | ~25          | 38%     |
| Permission denied | ~80        | ~65       | ~25          | 19-69%  |

## Notes

- The `file` parameter is validated against flag injection (no leading `-` or `--` allowed)
- Permission flags (`allowRead`, `allowWrite`, `allowNet`, `allowEnv`) map to Deno's security sandbox flags
- When `allowAll` is true, individual permission flags are ignored and `-A` is passed instead
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `file`, `success`, `exitCode`, `duration`, and `timedOut`
- If the script times out, `timedOut` is set to `true` and `exitCode` is `124`
