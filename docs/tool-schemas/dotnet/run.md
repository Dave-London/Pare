# dotnet > run

Runs a .NET application and returns structured output (exit code, stdout, stderr).

**Command**: `dotnet run`

## Input Parameters

| Parameter       | Type     | Default   | Description                                                |
| --------------- | -------- | --------- | ---------------------------------------------------------- |
| `path`          | string   | cwd       | Project root path                                          |
| `project`       | string   | --        | Path to the project file to run                            |
| `configuration` | string   | --        | Build configuration (e.g. Debug, Release)                  |
| `framework`     | string   | --        | Target framework (e.g. net8.0)                             |
| `noBuild`       | boolean  | `false`   | Skip build before running (--no-build)                     |
| `noRestore`     | boolean  | `false`   | Skip automatic restore before running (--no-restore)       |
| `args`          | string[] | `[]`      | Arguments to pass to the application (after --)            |
| `timeout`       | number   | --        | Execution timeout in ms (min: 1000, max: 600000)           |
| `maxOutputSize` | number   | `1048576` | Maximum stdout/stderr size in bytes before truncation      |
| `compact`       | boolean  | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Normal Execution

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Building...
Hello, World!
Processing 42 items...
Done.
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "Hello, World!\nProcessing 42 items...\nDone.",
  "stderr": ""
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": true,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error — Runtime Exception

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
Building...
Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.
   at MyApp.Program.Main(String[] args) in /home/user/MyApp/Program.cs:line 15
   at MyApp.Program.<Main>(String[] args)
```

</td>
<td>

~60 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "stdout": "",
  "stderr": "Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.\n   at MyApp.Program.Main(String[] args) in /home/user/MyApp/Program.cs:line 15"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "success": false,
  "exitCode": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Normal run        | ~80        | ~40       | ~10          | 50-88%  |
| Runtime exception | ~250       | ~60       | ~10          | 76-96%  |

## Notes

- Arguments after `args` are passed to the application via the `--` separator
- The `project` parameter maps to `--project` to select a specific project file
- Both `project` and `args` values are validated against flag injection
- Compact mode drops `stdout` and `stderr`, keeping only `exitCode` and `success`
- The `timedOut` field is set to `true` when the process exceeds the timeout limit
- The `maxOutputSize` parameter truncates stdout/stderr to prevent excessive memory usage
