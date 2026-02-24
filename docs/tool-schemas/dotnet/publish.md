# dotnet > publish

Runs dotnet publish for deployment and returns structured output with output path and diagnostics.

**Command**: `dotnet publish`

## Input Parameters

| Parameter       | Type    | Default | Description                                                  |
| --------------- | ------- | ------- | ------------------------------------------------------------ |
| `path`          | string  | cwd     | Project root path                                            |
| `project`       | string  | --      | Path to the project or solution file                         |
| `configuration` | string  | --      | Build configuration (e.g. Debug, Release)                    |
| `framework`     | string  | --      | Target framework (e.g. net8.0)                               |
| `runtime`       | string  | --      | Target runtime identifier (e.g. win-x64, linux-x64)         |
| `output`        | string  | --      | Output directory for published files (-o)                    |
| `selfContained` | boolean | --      | Publish as self-contained deployment (--self-contained)      |
| `noRestore`     | boolean | `false` | Skip automatic restore before publishing (--no-restore)      |
| `noBuild`       | boolean | `false` | Skip build before publishing (--no-build)                    |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens   |

## Success — Publish Succeeds

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
  Determining projects to restore...
  All projects are up-to-date for restore.
  MyApp -> /home/user/MyApp/bin/Release/net8.0/MyApp.dll
  MyApp -> /home/user/MyApp/bin/Release/net8.0/publish/
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "outputPath": "/home/user/MyApp/bin/Release/net8.0/publish/"
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

## Error — Publish Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~250 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
  Determining projects to restore...
  All projects are up-to-date for restore.
Program.cs(10,20): error CS0029: Cannot implicitly convert type 'string' to 'int' [/home/user/MyApp/MyApp.csproj]

Build FAILED.
    0 Warning(s)
    1 Error(s)
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "errors": ["Program.cs(10,20): error CS0029: Cannot implicitly convert type 'string' to 'int'"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| Publish success | ~200       | ~30       | ~10          | 85-95%  |
| Publish failure | ~250       | ~25       | ~25          | 90%     |

## Notes

- The `outputPath` field contains the path to the published output directory
- The `selfContained` flag controls whether the deployment includes the .NET runtime
- The `runtime` parameter maps to `--runtime` for platform-specific publishing (e.g. `linux-x64`, `osx-arm64`)
- Compact mode drops `outputPath`, `warnings`, and `errors` arrays, keeping only `success` and `exitCode`
- The `output` parameter uses `-o` to specify a custom publish directory
