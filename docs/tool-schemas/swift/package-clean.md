# swift > package-clean

Cleans Swift package build artifacts and returns structured result.

**Command**: `swift package clean`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Clean Completes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~10 tokens

```
$ swift package clean
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "exitCode": 0,
  "duration": 120
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (minimal output already).

</td>
</tr>
</table>

## Error — Clean Fails

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~40 tokens

```
$ swift package clean
error: unable to delete build artifacts: permission denied
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "exitCode": 1,
  "duration": 45
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (minimal output already).

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| Clean succeeds | ~10        | ~15       | ~15          | —       |
| Clean fails    | ~40        | ~15       | ~15          | 63%     |

## Notes

- This command removes the `.build` directory containing all build artifacts
- The response is intentionally minimal, containing only `success`, `exitCode`, and `duration`
- No compact mode reduction is needed since the full output is already compact
