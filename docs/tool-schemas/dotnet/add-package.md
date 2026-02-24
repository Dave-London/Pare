# dotnet > add-package

Runs dotnet add package to add a NuGet package and returns structured results.

**Command**: `dotnet add [project] package <name>`

## Input Parameters

| Parameter    | Type    | Default | Description                                                |
| ------------ | ------- | ------- | ---------------------------------------------------------- |
| `path`       | string  | cwd     | Project root path                                          |
| `project`    | string  | --      | Path to the project file                                   |
| `package`    | string  | --      | NuGet package name to add (required)                       |
| `version`    | string  | --      | Package version to install (--version)                     |
| `prerelease` | boolean | `false` | Allow prerelease packages (--prerelease)                   |
| `source`     | string  | --      | NuGet package source URI to use (--source)                 |
| `noRestore`  | boolean | `false` | Skip automatic restore after adding (--no-restore)         |
| `compact`    | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Adding a Package

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
  Determining projects to restore...
  Writing /tmp/tmpVc3Kdn.tmp
info : X]  GET https://api.nuget.org/v3/registration5-gz-semver2/newtonsoft.json/index.json
info : Adding PackageReference for package 'Newtonsoft.Json' into project '/home/user/MyApp/MyApp.csproj'.
info : Restoring packages for /home/user/MyApp/MyApp.csproj...
info :   CACHE https://api.nuget.org/v3/registration5-gz-semver2/newtonsoft.json/index.json
info : Package 'Newtonsoft.Json' is compatible with all the specified frameworks in project '/home/user/MyApp/MyApp.csproj'.
info : PackageReference for package 'Newtonsoft.Json' version '13.0.3' added to file '/home/user/MyApp/MyApp.csproj'.
```

</td>
<td>

~25 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "package": "Newtonsoft.Json",
  "version": "13.0.3"
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
  "success": true,
  "exitCode": 0,
  "package": "Newtonsoft.Json"
}
```

</td>
</tr>
</table>

## Error — Package Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~100 tokens

```
  Determining projects to restore...
  Writing /tmp/tmpVc3Kdn.tmp
info : Adding PackageReference for package 'NonExistentPackage' into project '/home/user/MyApp/MyApp.csproj'.
error: Package 'NonExistentPackage' is not found in the following primary source(s): 'https://api.nuget.org/v3/index.json'.
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "package": "NonExistentPackage",
  "errors": ["Package 'NonExistentPackage' is not found in the following primary source(s): 'https://api.nuget.org/v3/index.json'."]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Adding a package  | ~150       | ~25       | ~15          | 83-90%  |
| Package not found | ~100       | ~25       | ~25          | 75%     |

## Notes

- Package name and version are validated against flag injection before execution
- The `prerelease` flag adds `--prerelease` to allow installing pre-release versions
- The `source` parameter allows specifying a custom NuGet feed via `--source`
- Compact mode drops the `version` field, keeping only `package` name and status
- WARNING: Adding NuGet packages downloads and may execute third-party code. Only add trusted packages.
