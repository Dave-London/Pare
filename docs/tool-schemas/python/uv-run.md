# python > uv-run

Runs a command in a uv-managed environment and returns structured output with exit code, stdout, stderr, and timing.

**Command**: `uv run <command> [args...]`

## Input Parameters

| Parameter | Type     | Default | Description                                                      |
| --------- | -------- | ------- | ---------------------------------------------------------------- |
| `path`    | string   | cwd     | Working directory                                                |
| `command` | string[] | --      | Command and arguments to run (e.g. `["python", "script.py"]`) (required) |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens       |

## Success -- Command Completed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
Processing data...
Wrote 150 records to output.csv
Done in 2.3 seconds.
```

</td>
<td>

~35 tokens

```json
{
  "exitCode": 0,
  "stdout": "Processing data...\nWrote 150 records to output.csv\nDone in 2.3 seconds.",
  "stderr": "",
  "success": true,
  "duration": 2.45
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "exitCode": 0,
  "success": true,
  "duration": 2.45
}
```

</td>
</tr>
</table>

## Error -- Command Failed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~40 tokens

```
Traceback (most recent call last):
  File "script.py", line 5, in <module>
    raise ValueError("Invalid input")
ValueError: Invalid input
```

</td>
<td>

~40 tokens

```json
{
  "exitCode": 1,
  "stdout": "",
  "stderr": "Traceback (most recent call last):\n  File \"script.py\", line 5, in <module>\n    raise ValueError(\"Invalid input\")\nValueError: Invalid input",
  "success": false,
  "duration": 0.12
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Command success  | ~30        | ~35       | ~15          | 0-50%   |
| Command failed   | ~40        | ~40       | ~15          | 0-63%   |

## Notes

- The `command` parameter is required and must contain at least one element (the program to run)
- Duration is measured by the tool itself (wall clock time), not parsed from command output
- Full mode preserves complete stdout and stderr for debugging
- Compact mode drops stdout and stderr, keeping only `exitCode`, `success`, and `duration`
- Useful for running arbitrary Python scripts, one-off commands, or tools managed by uv
