# dotnet > restore

Runs dotnet restore to restore NuGet dependencies and returns structured results.

**Command**: `dotnet restore`

## Input Parameters

| Parameter   | Type     | Default | Description                                                |
| ----------- | -------- | ------- | ---------------------------------------------------------- |
| `path`      | string   | cwd     | Project root path                                          |
| `project`   | string   | --      | Path to the project or solution file                       |
| `source`    | string[] | --      | NuGet package source URIs to use (--source)                |
| `locked`    | boolean  | `false` | Require lock file is up to date (--locked-mode)            |
| `verbosity` | enum     | --      | MSBuild verbosity level (quiet/minimal/normal/detailed/diagnostic) |
| `compact`   | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Restore Succeeds

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
  Determining projects to restore...
  Restored /home/user/MyApp/MyApp.csproj (in 1.23 sec).
  Restored /home/user/MyApp.Tests/MyApp.Tests.csproj (in 1.45 sec).

  2 of 2 projects are up-to-date for restore.
```

</td>
<td>

~20 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "restoredProjects": 2
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

## Error — Restore Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~200 tokens

```
  Determining projects to restore...
/home/user/MyApp/MyApp.csproj : error NU1101: Unable to find package NonExistentPackage. No packages exist with this id in source(s): nuget.org
  Failed to restore /home/user/MyApp/MyApp.csproj (in 2.10 sec).
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "errors": ["Unable to find package NonExistentPackage. No packages exist with this id in source(s): nuget.org"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| Restore success | ~200       | ~20       | ~10          | 90-95%  |
| Restore failure | ~200       | ~25       | ~25          | 88%     |

## Notes

- The `source` parameter allows specifying custom NuGet feeds via `--source` (can be specified multiple times)
- The `locked` flag uses `--locked-mode` to ensure the lock file matches -- useful in CI pipelines
- Each source URI is validated against flag injection before execution
- Compact mode drops `restoredProjects`, `warnings`, and `errors`, keeping only `success` and `exitCode`
- The `restoredProjects` count includes both newly restored and already up-to-date projects
