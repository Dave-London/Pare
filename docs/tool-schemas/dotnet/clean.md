# dotnet > clean

Runs dotnet clean to remove build outputs and returns structured results.

**Command**: `dotnet clean`

## Input Parameters

| Parameter       | Type    | Default | Description                                                        |
| --------------- | ------- | ------- | ------------------------------------------------------------------ |
| `path`          | string  | cwd     | Project root path                                                  |
| `project`       | string  | --      | Path to the project or solution file                               |
| `configuration` | string  | --      | Build configuration to clean (e.g. Debug, Release)                 |
| `framework`     | string  | --      | Target framework to clean (e.g. net8.0)                            |
| `verbosity`     | enum    | --      | MSBuild verbosity level (quiet/minimal/normal/detailed/diagnostic) |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens         |

## Success — Clean Succeeds

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
Build started 2/24/2026 10:15:00 AM.

Build succeeded.
    0 Warning(s)
    0 Error(s)

Time Elapsed 00:00:00.42
```

</td>
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
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (output is already minimal).

</td>
</tr>
</table>

## Error — Clean Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~80 tokens

```
MSBUILD : error MSB1009: Project file does not exist.
Switch: MyApp.csproj
```

</td>
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

| Scenario      | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------- | ---------- | --------- | ------------ | ------- |
| Clean success | ~80        | ~10       | ~10          | 88%     |
| Clean failure | ~80        | ~10       | ~10          | 88%     |

## Notes

- Output is always minimal (just `success` and `exitCode`) so compact mode has no additional effect
- The `configuration` parameter cleans only the specified build configuration outputs
- The `framework` parameter cleans only the specified target framework outputs
- Removes build artifacts from `bin/` and `obj/` directories
