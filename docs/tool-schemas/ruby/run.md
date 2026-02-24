# ruby > run

Executes a Ruby script file and returns structured output (stdout, stderr, exit code, duration).

**Command**: `ruby <file> [args...]`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `file`    | string   | --      | Path to the Ruby file to execute                           |
| `args`    | string[] | `[]`    | Arguments to pass to the Ruby script                       |
| `path`    | string   | cwd     | Working directory                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Script Execution

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ ruby generate_report.rb --format json
Processing 150 records...
Report generated: output/report_2026-02-24.json
Done in 2.3 seconds.
```

</td>
<td>

~35 tokens

```json
{
  "file": "generate_report.rb",
  "success": true,
  "exitCode": 0,
  "stdout": "Processing 150 records...\nReport generated: output/report_2026-02-24.json\nDone in 2.3 seconds.",
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

~15 tokens

```json
{
  "file": "generate_report.rb",
  "success": true,
  "exitCode": 0,
  "duration": 2450,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Error -- Runtime Error

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ ruby app.rb
app.rb:12:in `connect': Connection refused - connect(2) for "localhost" port 5432 (Errno::ECONNREFUSED)
	from app.rb:12:in `<main>'
```

</td>
<td>

~40 tokens

```json
{
  "file": "app.rb",
  "success": false,
  "exitCode": 1,
  "stderr": "app.rb:12:in `connect': Connection refused - connect(2) for \"localhost\" port 5432 (Errno::ECONNREFUSED)\n\tfrom app.rb:12:in `<main>'",
  "duration": 120,
  "timedOut": false
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
  "file": "app.rb",
  "success": false,
  "exitCode": 1,
  "duration": 120,
  "timedOut": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| Script success | ~30        | ~35       | ~15          | 0-50%   |
| Runtime error  | ~40        | ~40       | ~15          | 0-63%   |

## Notes

- Supports passing arguments to the Ruby script via the `args` parameter
- The `timedOut` field indicates whether the script was killed due to a timeout
- Compact mode drops `stdout` and `stderr`, keeping only `file`, `success`, `exitCode`, `duration`, and `timedOut`
- Token savings scale with the verbosity of the script's output
