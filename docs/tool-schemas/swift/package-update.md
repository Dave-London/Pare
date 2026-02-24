# swift > package-update

Updates Swift package dependencies and returns structured update results.

**Command**: `swift package update`

## Input Parameters

| Parameter  | Type     | Default | Description                                                |
| ---------- | -------- | ------- | ---------------------------------------------------------- |
| `packages` | string[] | —       | Specific packages to update (updates all if not specified) |
| `path`     | string   | cwd     | Project root path                                          |
| `compact`  | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Packages Updated

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~150 tokens

```
$ swift package update
Updating https://github.com/apple/swift-argument-parser.git
Updating https://github.com/apple/swift-log.git
Computing version for swift-argument-parser
Computed swift-argument-parser at 1.4.0 (was 1.3.0) (0.02s)
Computing version for swift-log
Computed swift-log at 1.6.1 (was 1.5.4) (0.01s)
Updated 2 dependencies.
```

</td>
<td>

~65 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "updatedPackages": [
    { "name": "swift-argument-parser", "oldVersion": "1.3.0", "newVersion": "1.4.0" },
    { "name": "swift-log", "oldVersion": "1.5.4", "newVersion": "1.6.1" }
  ],
  "duration": 1250
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
  "duration": 1250
}
```

</td>
</tr>
</table>

## Success — Already Up to Date

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~30 tokens

```
$ swift package update
Everything is already up-to-date.
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "updatedPackages": [],
  "duration": 380
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
  "duration": 380
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 2 packages updated | ~150       | ~65       | ~15          | 57-90%  |
| Already up to date | ~30        | ~15       | ~15          | 50%     |

## Notes

- Each updated package includes `name`, optional `oldVersion`, and optional `newVersion`
- Package names in the `packages` parameter are validated against flag injection
- If `packages` is omitted, all dependencies are updated
- Compact mode drops the `updatedPackages` array, keeping only `success`, `exitCode`, and `duration`
