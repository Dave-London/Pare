# bun > run

Runs a script or file with `bun run` and returns structured output (stdout, stderr, exit code, duration).

**Command**: `bun run <script>`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `script`  | string   | —       | Script name or file path to run (required)                 |
| `args`    | string[] | `[]`    | Additional arguments to pass to the script                 |
| `path`    | string   | cwd     | Project root path                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Script Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
$ bun run build
Bundling src/index.ts...
Build complete in 142ms
```

</td>
<td>

~45 tokens

```json
{
  "script": "build",
  "success": true,
  "exitCode": 0,
  "stdout": "Bundling src/index.ts...\nBuild complete in 142ms",
  "duration": 320,
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
  "script": "build",
  "success": true,
  "exitCode": 0,
  "duration": 320,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error — Script Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ bun run lint
error: Script "lint" exited with code 1
src/app.ts:12:5 - error: 'x' is declared but never used
src/app.ts:18:9 - error: Unexpected any type
```

</td>
<td>

~55 tokens

```json
{
  "script": "lint",
  "success": false,
  "exitCode": 1,
  "stderr": "error: Script \"lint\" exited with code 1\nsrc/app.ts:12:5 - error: 'x' is declared but never used\nsrc/app.ts:18:9 - error: Unexpected any type",
  "duration": 580,
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
  "script": "lint",
  "success": false,
  "exitCode": 1,
  "duration": 580,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Script passes | ~50        | ~45       | ~25          | 10-50%  |
| Script fails  | ~80        | ~55       | ~25          | 31-69%  |

## Notes

- The `script` parameter is validated against flag injection (no leading `-` or `--` allowed)
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `script`, `success`, `exitCode`, `duration`, and `timedOut`
- If the script times out, `timedOut` is set to `true` and `exitCode` is `124`
