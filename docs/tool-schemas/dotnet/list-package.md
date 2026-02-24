# dotnet > list-package

Runs dotnet list package and returns structured NuGet package listings per project and framework.

**Command**: `dotnet list [project] package`

## Input Parameters

| Parameter            | Type    | Default | Description                                                  |
| -------------------- | ------- | ------- | ------------------------------------------------------------ |
| `path`               | string  | cwd     | Project root path                                            |
| `project`            | string  | --      | Path to the project or solution file                         |
| `outdated`           | boolean | `false` | Show outdated packages (--outdated)                          |
| `deprecated`         | boolean | `false` | Show deprecated packages (--deprecated)                      |
| `vulnerable`         | boolean | `false` | Show packages with known vulnerabilities (--vulnerable)      |
| `includeTransitive`  | boolean | `false` | Include transitive packages (--include-transitive)           |
| `format`             | enum    | --      | Output format: json or text (--format)                       |
| `source`             | string  | --      | NuGet package source URI for version checks (--source)       |
| `compact`            | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens   |

## Success — List Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
Project 'MyApp' has the following package references
   [net8.0]:
   Top-level Package                Requested   Resolved
   > Microsoft.Extensions.Logging   8.0.0       8.0.0
   > Newtonsoft.Json                13.0.3      13.0.3
   > Serilog                        3.1.1       3.1.1

Project 'MyApp.Tests' has the following package references
   [net8.0]:
   Top-level Package       Requested   Resolved
   > xunit                 2.7.0       2.7.0
   > xunit.runner.console  2.7.0       2.7.0
```

</td>
<td>

~150 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "projects": [
    {
      "project": "MyApp",
      "frameworks": [
        {
          "framework": "net8.0",
          "topLevel": [
            { "id": "Microsoft.Extensions.Logging", "resolved": "8.0.0" },
            { "id": "Newtonsoft.Json", "resolved": "13.0.3" },
            { "id": "Serilog", "resolved": "3.1.1" }
          ]
        }
      ]
    },
    {
      "project": "MyApp.Tests",
      "frameworks": [
        {
          "framework": "net8.0",
          "topLevel": [
            { "id": "xunit", "resolved": "2.7.0" },
            { "id": "xunit.runner.console", "resolved": "2.7.0" }
          ]
        }
      ]
    }
  ]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~30 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "projects": [
    { "project": "MyApp", "frameworks": [{ "framework": "net8.0" }] },
    { "project": "MyApp.Tests", "frameworks": [{ "framework": "net8.0" }] }
  ]
}
```

</td>
</tr>
</table>

## Success — Outdated Packages

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
Project 'MyApp' has the following updates to its packages
   [net8.0]:
   Top-level Package                Requested   Resolved   Latest
   > Newtonsoft.Json                13.0.1      13.0.1     13.0.3
   > Serilog                        3.0.0       3.0.0      3.1.1
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "projects": [
    {
      "project": "MyApp",
      "frameworks": [
        {
          "framework": "net8.0",
          "topLevel": [
            { "id": "Newtonsoft.Json", "resolved": "13.0.1", "latest": "13.0.3" },
            { "id": "Serilog", "resolved": "3.0.0", "latest": "3.1.1" }
          ]
        }
      ]
    }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| List 5 packages    | ~350       | ~150      | ~30          | 57-91%  |
| Outdated packages  | ~250       | ~80       | ~30          | 68-88%  |

## Notes

- The `outdated` flag adds `--outdated` to show packages with newer versions available
- The `deprecated` flag adds `--deprecated` to show packages marked as deprecated on nuget.org
- The `vulnerable` flag adds `--vulnerable` to show packages with known security vulnerabilities
- The `includeTransitive` flag adds `--include-transitive` to include indirect dependencies
- The `latest` field on each package entry is only present when `outdated` is true
- The `deprecated` field on each package entry is only present when `deprecated` is true
- Compact mode drops individual package entries, keeping only project and framework names
