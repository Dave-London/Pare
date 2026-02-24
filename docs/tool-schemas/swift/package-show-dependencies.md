# swift > package-show-dependencies

Shows the dependency tree of a Swift package and returns structured dependency data.

**Command**: `swift package show-dependencies`

## Input Parameters

| Parameter | Type                            | Default | Description                                                |
| --------- | ------------------------------- | ------- | ---------------------------------------------------------- |
| `format`  | `"text"` \| `"json"` \| `"dot"` | —       | Output format (text/json/dot)                              |
| `path`    | string                          | cwd     | Project root path                                          |
| `compact` | boolean                         | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Dependencies Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
$ swift package show-dependencies
.
├── swift-argument-parser<https://github.com/apple/swift-argument-parser.git@1.3.0>
│   └── swift-system<https://github.com/apple/swift-system.git@1.2.1>
├── swift-log<https://github.com/apple/swift-log.git@1.5.4>
└── swift-nio<https://github.com/apple/swift-nio.git@2.65.0>
    └── swift-collections<https://github.com/apple/swift-collections.git@1.1.0>
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "dependencies": [
    {
      "name": "swift-argument-parser",
      "url": "https://github.com/apple/swift-argument-parser.git",
      "version": "1.3.0"
    },
    { "name": "swift-log", "url": "https://github.com/apple/swift-log.git", "version": "1.5.4" },
    { "name": "swift-nio", "url": "https://github.com/apple/swift-nio.git", "version": "2.65.0" }
  ]
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

## Success — No Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ swift package show-dependencies
.
```

</td>
<td>

~10 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "dependencies": []
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

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 3 dependencies  | ~150       | ~80       | ~10          | 47-93%  |
| No dependencies | ~10        | ~10       | ~10          | 0%      |

## Notes

- Each dependency includes `name`, optional `url` (repository URL), optional `version`, and optional `path` (for local packages)
- The `format` parameter controls the raw output format but Pare always returns structured JSON
- Only direct dependencies are listed in the structured response; transitive dependencies appear in the raw CLI output tree
- Compact mode drops the `dependencies` array, keeping only `success` and `exitCode`
