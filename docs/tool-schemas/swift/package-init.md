# swift > package-init

Initializes a new Swift package and returns structured result with created files.

**Command**: `swift package init`

## Input Parameters

| Parameter | Type                                                   | Default | Description                                                |
| --------- | ------------------------------------------------------ | ------- | ---------------------------------------------------------- |
| `type`    | `"library"` \| `"executable"` \| `"tool"` \| `"macro"` | —       | Package type to create                                     |
| `name`    | string                                                 | —       | Package name                                               |
| `path`    | string                                                 | cwd     | Project root path                                          |
| `compact` | boolean                                                | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Package Initialized

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~80 tokens

```
$ swift package init --type executable --name MyApp
Creating executable package: MyApp
Creating Package.swift
Creating .gitignore
Creating Sources/
Creating Sources/main.swift
Creating Tests/
Creating Tests/MyAppTests/
Creating Tests/MyAppTests/MyAppTests.swift
```

</td>
<td>

~60 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "createdFiles": [
    "Package.swift",
    ".gitignore",
    "Sources/main.swift",
    "Tests/MyAppTests/MyAppTests.swift"
  ],
  "duration": 180
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
  "duration": 180
}
```

</td>
</tr>
</table>

## Success — Library Package

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~70 tokens

```
$ swift package init --type library --name MyLib
Creating library package: MyLib
Creating Package.swift
Creating .gitignore
Creating Sources/
Creating Sources/MyLib.swift
Creating Tests/
Creating Tests/MyLibTests/
Creating Tests/MyLibTests/MyLibTests.swift
```

</td>
<td>

~55 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "createdFiles": [
    "Package.swift",
    ".gitignore",
    "Sources/MyLib.swift",
    "Tests/MyLibTests/MyLibTests.swift"
  ],
  "duration": 150
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
  "duration": 150
}
```

</td>
</tr>
</table>

## Error — Directory Not Empty

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ swift package init --type executable
error: directory is not empty; use --name to provide a package name
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "createdFiles": [],
  "duration": 30
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
  "success": false,
  "exitCode": 1,
  "duration": 30
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| Executable created | ~80        | ~60       | ~15          | 25-81%  |
| Library created    | ~70        | ~55       | ~15          | 21-79%  |
| Init fails         | ~40        | ~15       | ~15          | 63%     |

## Notes

- The `name` parameter is validated against flag injection
- The `type` parameter determines the package template: `library` (default), `executable`, `tool`, or `macro`
- The `createdFiles` array lists all files created during initialization
- Compact mode drops the `createdFiles` array, keeping only `success`, `exitCode`, and `duration`
