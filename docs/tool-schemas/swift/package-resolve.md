# swift > package-resolve

Resolves Swift package dependencies and returns structured resolution results.

**Command**: `swift package resolve`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Dependencies Resolved

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ swift package resolve
Fetching https://github.com/apple/swift-argument-parser.git from cache
Fetching https://github.com/apple/swift-log.git from cache
Fetched https://github.com/apple/swift-argument-parser.git (0.42s)
Fetched https://github.com/apple/swift-log.git (0.38s)
Computing version for swift-argument-parser
Computed swift-argument-parser at 1.3.0 (0.01s)
Computing version for swift-log
Computed swift-log at 1.5.4 (0.01s)
```

</td>
<td>

~65 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "resolvedPackages": [
    { "name": "swift-argument-parser", "url": "https://github.com/apple/swift-argument-parser.git", "version": "1.3.0" },
    { "name": "swift-log", "url": "https://github.com/apple/swift-log.git", "version": "1.5.4" }
  ],
  "duration": 820
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
  "duration": 820
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

~15 tokens

```
$ swift package resolve
Resolved.
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "resolvedPackages": [],
  "duration": 45
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
  "duration": 45
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| 2 deps resolved   | ~120       | ~65       | ~15          | 46-88%  |
| No dependencies   | ~15        | ~15       | ~15          | 0%      |

## Notes

- Each resolved package includes `name`, optional `url` (repository URL), and optional `version`
- Compact mode drops the `resolvedPackages` array, keeping only `success`, `exitCode`, and `duration`
- This command fetches and pins package versions without building
