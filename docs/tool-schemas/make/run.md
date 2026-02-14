# make > run

Runs a make or just target and returns structured output with stdout, stderr, exit code, and duration. Auto-detects make vs just.

**Command**: `make <target>` / `just <target>`

## Input Parameters

| Parameter | Type                             | Default  | Description                                                |
| --------- | -------------------------------- | -------- | ---------------------------------------------------------- |
| `target`  | string                           | —        | Target to run (required)                                   |
| `args`    | string[]                         | `[]`     | Additional arguments to pass to the target                 |
| `path`    | string                           | cwd      | Project root path                                          |
| `tool`    | `"auto"` \| `"make"` \| `"just"` | `"auto"` | Task runner to use; "auto" detects from files              |
| `compact` | boolean                          | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Target Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~85 tokens

```
$ make build
gcc -o app src/main.c src/utils.c
Linking app...
Build complete.
```

</td>
<td>

~45 tokens

```json
{
  "target": "build",
  "success": true,
  "exitCode": 0,
  "stdout": "gcc -o app src/main.c src/utils.c\nLinking app...\nBuild complete.",
  "duration": 1240,
  "tool": "make"
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
  "target": "build",
  "success": true,
  "exitCode": 0,
  "duration": 1240,
  "tool": "make"
}
```

</td>
</tr>
</table>

## Success — Just Target with Output

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~60 tokens

```
$ just test
Running tests...
All 12 tests passed.
```

</td>
<td>

~40 tokens

```json
{
  "target": "test",
  "success": true,
  "exitCode": 0,
  "stdout": "Running tests...\nAll 12 tests passed.",
  "duration": 830,
  "tool": "just"
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
  "target": "test",
  "success": true,
  "exitCode": 0,
  "duration": 830,
  "tool": "just"
}
```

</td>
</tr>
</table>

## Error — Target Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ make deploy
rsync -avz ./dist/ server:/var/www/
rsync: connection refused (111)
rsync error: error in socket IO (code 10)
make: *** [Makefile:14: deploy] Error 10
```

</td>
<td>

~55 tokens

```json
{
  "target": "deploy",
  "success": false,
  "exitCode": 2,
  "stderr": "rsync: connection refused (111)\nrsync error: error in socket IO (code 10)\nmake: *** [Makefile:14: deploy] Error 10",
  "duration": 3420,
  "tool": "make"
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
  "target": "deploy",
  "success": false,
  "exitCode": 2,
  "duration": 3420,
  "tool": "make"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Build succeeds        | ~85        | ~45       | ~25          | 47–71%  |
| Just target succeeds  | ~60        | ~40       | ~25          | 33–58%  |
| Target fails (deploy) | ~120       | ~55       | ~25          | 54–79%  |

## Notes

- Tool auto-detection checks for `justfile` (just) or `Makefile`/`makefile`/`GNUmakefile` (make) in the project directory
- The `target` parameter is validated against flag injection (no leading `-` or `--` allowed)
- Additional `args` are also validated against flag injection for safety
- `stdout` and `stderr` are omitted from the response when empty
- Compact mode drops `stdout` and `stderr`, keeping only `target`, `success`, `exitCode`, `duration`, and `tool`
