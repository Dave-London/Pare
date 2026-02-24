# infra > output

Shows Terraform output values from the current state. Returns structured name/value/type/sensitive data.

**Command**: `terraform output -json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Multiple Outputs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
{
  "instance_ip": {
    "value": "54.123.45.67",
    "type": "string",
    "sensitive": false
  },
  "db_connection_string": {
    "value": "postgresql://db.example.com:5432/myapp",
    "type": "string",
    "sensitive": true
  },
  "instance_ids": {
    "value": ["i-abc123", "i-def456"],
    "type": ["list", "string"],
    "sensitive": false
  }
}
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "outputs": [
    { "name": "instance_ip", "value": "54.123.45.67", "type": "string", "sensitive": false },
    {
      "name": "db_connection_string",
      "value": "postgresql://db.example.com:5432/myapp",
      "type": "string",
      "sensitive": true
    },
    { "name": "instance_ids", "value": ["i-abc123", "i-def456"], "type": "list" }
  ]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "success": true
}
```

</td>
</tr>
</table>

## Error — No State

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~80 tokens

```
No outputs found. The state file either has no outputs defined, or all the
defined outputs are empty. Please define an output in your configuration with
the `output` keyword and run `terraform refresh` for it to become available.
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "error": "No outputs found"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 3 output values | ~200       | ~80       | ~5           | 60-98%  |
| No state        | ~80        | ~15       | ~15          | 81%     |

## Notes

- Uses `terraform output -json` for machine-readable output
- Each output includes `name`, `value`, optional `type`, and optional `sensitive` flag
- Sensitive outputs have their values included -- the `sensitive` flag is metadata only
- Compact mode drops the `outputs` array entirely, keeping only `success`
- Requires a Terraform state to exist (run `terraform apply` first)
