# infra > show

Shows the current Terraform state or a saved plan file in structured JSON. Returns resources, outputs, and version info.

**Command**: `terraform show -json [planFile]`

## Input Parameters

| Parameter  | Type    | Default | Description                                                        |
| ---------- | ------- | ------- | ------------------------------------------------------------------ |
| `path`     | string  | cwd     | Project root path                                                  |
| `planFile` | string  | --      | Path to a saved plan file to show instead of the current state     |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens         |

## Success — Show State

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~800 tokens

```
{... very large JSON output from terraform show -json, typically 3000+ characters
  containing full resource attributes, metadata, provider versions, etc. ...}
```

</td>
<td>

~120 tokens

```json
{
  "success": true,
  "terraformVersion": "1.7.0",
  "resourceCount": 3,
  "resources": [
    { "address": "aws_instance.web", "type": "aws_instance", "name": "web", "provider": "registry.terraform.io/hashicorp/aws" },
    { "address": "aws_security_group.web_sg", "type": "aws_security_group", "name": "web_sg", "provider": "registry.terraform.io/hashicorp/aws" },
    { "address": "aws_s3_bucket.assets", "type": "aws_s3_bucket", "name": "assets", "provider": "registry.terraform.io/hashicorp/aws" }
  ],
  "outputs": [
    { "name": "instance_ip", "value": "54.123.45.67" },
    { "name": "bucket_arn", "value": "arn:aws:s3:::my-assets-bucket", "sensitive": false }
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
  "resourceCount": 3
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

~50 tokens

```
No state.
```

</td>
<td>

~15 tokens

```json
{
  "success": false,
  "resourceCount": 0,
  "error": "No state"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 3 resources + outs | ~800       | ~120      | ~10          | 85-99%  |
| No state           | ~50        | ~15       | ~15          | 70%     |

## Notes

- Uses `terraform show -json` to get machine-readable state output
- The `planFile` parameter allows showing a saved plan file instead of the live state
- Resources include `address`, `type`, `name`, and optional `provider`
- Outputs include `name`, `value`, and optional `sensitive` flag
- Compact mode drops `resources`, `outputs`, and `terraformVersion`, keeping only `resourceCount`
- The raw Terraform JSON state is extremely verbose -- Pare strips non-essential attributes aggressively
