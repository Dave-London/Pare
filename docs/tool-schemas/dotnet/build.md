# dotnet > build

Runs dotnet build and returns structured diagnostics (file, line, column, code, severity, message).

**Command**: `dotnet build`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `path`          | string  | cwd     | Project root path                                          |
| `project`       | string  | --      | Path to the project or solution file                       |
| `configuration` | string  | --      | Build configuration (e.g. Debug, Release)                  |
| `framework`     | string  | --      | Target framework (e.g. net8.0)                             |
| `runtime`       | string  | --      | Target runtime identifier (e.g. win-x64, linux-x64)       |
| `noRestore`     | boolean | `false` | Skip automatic restore before building (--no-restore)      |
| `verbosity`     | enum    | --      | MSBuild verbosity level (quiet/minimal/normal/detailed/diagnostic) |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Build

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
  Determining projects to restore...
  All projects are up-to-date for restore.
  MyApp -> /home/user/MyApp/bin/Debug/net8.0/MyApp.dll

Build succeeded.
    0 Warning(s)
    0 Error(s)

Time Elapsed 00:00:02.34
```

</td>
<td>

~30 tokens

```json
{
  "success": true,
  "diagnostics": [],
  "total": 0,
  "errors": 0,
  "warnings": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (no reduction when there are no diagnostics).

</td>
</tr>
</table>

## Success — With Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
  Determining projects to restore...
  All projects are up-to-date for restore.
Program.cs(12,13): warning CS0219: The variable 'x' is assigned but its value is never used [/home/user/MyApp/MyApp.csproj]
Services/UserService.cs(5,1): warning CS8618: Non-nullable property 'Name' must contain a non-null value when exiting constructor. [/home/user/MyApp/MyApp.csproj]
  MyApp -> /home/user/MyApp/bin/Debug/net8.0/MyApp.dll

Build succeeded.
    2 Warning(s)
    0 Error(s)

Time Elapsed 00:00:01.87
```

</td>
<td>

~100 tokens

```json
{
  "success": true,
  "diagnostics": [
    {
      "file": "Program.cs",
      "line": 12,
      "column": 13,
      "severity": "warning",
      "code": "CS0219",
      "message": "The variable 'x' is assigned but its value is never used"
    },
    {
      "file": "Services/UserService.cs",
      "line": 5,
      "column": 1,
      "severity": "warning",
      "code": "CS8618",
      "message": "Non-nullable property 'Name' must contain a non-null value when exiting constructor."
    }
  ],
  "total": 2,
  "errors": 0,
  "warnings": 2
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~100 tokens

```json
{
  "success": true,
  "diagnostics": [
    {
      "file": "Program.cs",
      "line": 12,
      "column": 13,
      "severity": "warning",
      "code": "CS0219",
      "message": "The variable 'x' is assigned but its value is never used"
    },
    {
      "file": "Services/UserService.cs",
      "line": 5,
      "column": 1,
      "severity": "warning",
      "code": "CS8618",
      "message": "Non-nullable property 'Name' must contain a non-null value when exiting constructor."
    }
  ],
  "errors": 0,
  "warnings": 2,
  "total": 2
}
```

</td>
</tr>
</table>

## Error — Compilation Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
Microsoft (R) Build Engine version 17.8.0 for .NET
  Determining projects to restore...
  All projects are up-to-date for restore.
Program.cs(10,20): error CS0029: Cannot implicitly convert type 'string' to 'int' [/home/user/MyApp/MyApp.csproj]
Program.cs(15,9): error CS0103: The name 'DoSomething' does not exist in the current context [/home/user/MyApp/MyApp.csproj]

Build FAILED.
    0 Warning(s)
    2 Error(s)

Time Elapsed 00:00:01.12
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "diagnostics": [
    {
      "file": "Program.cs",
      "line": 10,
      "column": 20,
      "severity": "error",
      "code": "CS0029",
      "message": "Cannot implicitly convert type 'string' to 'int'"
    },
    {
      "file": "Program.cs",
      "line": 15,
      "column": 9,
      "severity": "error",
      "code": "CS0103",
      "message": "The name 'DoSomething' does not exist in the current context"
    }
  ],
  "total": 2,
  "errors": 2,
  "warnings": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Clean build           | ~150       | ~30       | ~30          | 80%     |
| Build with 2 warnings | ~400       | ~100      | ~100         | 75%     |
| Compilation failure   | ~300       | ~80       | ~80          | 73%     |

## Notes

- Parses MSBuild diagnostic lines in the format `file(line,col): severity code: message`
- The `configuration` parameter maps to `--configuration` (e.g. `Debug`, `Release`)
- The `framework` parameter maps to `--framework` for multi-targeting scenarios
- The `runtime` parameter maps to `--runtime` for cross-platform builds (e.g. `win-x64`, `linux-arm64`)
- In compact mode, empty `diagnostics` arrays are omitted; non-empty arrays are preserved along with counts
- The diagnostic `code` field contains the C# compiler error/warning code (e.g. `CS0029`, `CS8618`)
