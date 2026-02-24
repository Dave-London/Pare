# infra > state-list

Lists all resources tracked in the Terraform state. Returns resource addresses.

**Command**: `terraform state list`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Resources in State

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
aws_instance.web
aws_security_group.web_sg
aws_s3_bucket.assets
aws_iam_role.lambda_role
aws_lambda_function.api
```

</td>
<td>

~40 tokens

```json
{
  "success": true,
  "resources": [
    "aws_instance.web",
    "aws_security_group.web_sg",
    "aws_s3_bucket.assets",
    "aws_iam_role.lambda_role",
    "aws_lambda_function.api"
  ],
  "total": 5
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
  "total": 5
}
```

</td>
</tr>
</table>

## Success — Empty State

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~5 tokens

```
(no output)
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "resources": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario    | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------- | ---------- | --------- | ------------ | ------- |
| 5 resources | ~100       | ~40       | ~10          | 60-90%  |
| Empty state | ~5         | ~15       | ~10          | 0%      |

## Notes

- Returns a flat list of resource addresses in the Terraform state
- Compact mode drops the `resources` array, keeping only the `total` count
- Useful for inspecting what infrastructure is currently managed by Terraform
- Requires a Terraform state file to exist
