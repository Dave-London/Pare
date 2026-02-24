# infra > plan

Shows the Terraform execution plan with resource change counts. Read-only -- does not modify infrastructure.

**Command**: `terraform plan -input=false`

## Input Parameters

| Parameter | Type              | Default | Description                                                  |
| --------- | ----------------- | ------- | ------------------------------------------------------------ |
| `path`    | string            | cwd     | Project root path                                            |
| `out`     | string            | --      | Save the plan to a file for later apply (-out=FILE)          |
| `target`  | string            | --      | Target a specific resource for planning (-target=RESOURCE)   |
| `varFile` | string            | --      | Path to a variable definitions file (-var-file=FILE)         |
| `vars`    | Record<string,string> | --  | Variable overrides as key-value pairs (-var KEY=VALUE)       |
| `compact` | boolean           | `true`  | Auto-compact when structured output exceeds raw CLI tokens   |

## Success — Resources to Create

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~500 tokens

```
Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                          = "ami-0c55b159cbfafe1f0"
      + instance_type                = "t3.micro"
      + ...
    }

  # aws_security_group.web_sg will be created
  + resource "aws_security_group" "web_sg" {
      + name        = "web-sg"
      + vpc_id      = "vpc-abc123"
      + ...
    }

  # aws_s3_bucket.assets will be created
  + resource "aws_s3_bucket" "assets" {
      + bucket = "my-assets-bucket"
      + ...
    }

Plan: 3 to add, 0 to change, 0 to destroy.
```

</td>
<td>

~80 tokens

```json
{
  "success": true,
  "add": 3,
  "change": 0,
  "destroy": 0,
  "resources": [
    { "address": "aws_instance.web", "action": "create" },
    { "address": "aws_security_group.web_sg", "action": "create" },
    { "address": "aws_s3_bucket.assets", "action": "create" }
  ]
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
  "add": 3,
  "change": 0,
  "destroy": 0
}
```

</td>
</tr>
</table>

## Success — Mixed Changes

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
Terraform will perform the following actions:

  # aws_instance.web will be updated in-place
  ~ resource "aws_instance" "web" {
      ~ instance_type = "t3.micro" -> "t3.small"
    }

  # aws_s3_bucket.old will be destroyed
  - resource "aws_s3_bucket" "old" {
      - bucket = "old-bucket"
    }

Plan: 0 to add, 1 to change, 1 to destroy.
```

</td>
<td>

~50 tokens

```json
{
  "success": true,
  "add": 0,
  "change": 1,
  "destroy": 1,
  "resources": [
    { "address": "aws_instance.web", "action": "update" },
    { "address": "aws_s3_bucket.old", "action": "delete" }
  ]
}
```

</td>
</tr>
</table>

## Error — Plan Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~150 tokens

```
Error: Reference to undeclared resource

  on main.tf line 12, in resource "aws_instance" "web":
  12:   subnet_id = aws_subnet.main.id

A managed resource "aws_subnet" "main" has not been declared in the root module.
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "add": 0,
  "change": 0,
  "destroy": 0,
  "error": "Reference to undeclared resource"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| 3 resources to create | ~500       | ~80       | ~15          | 84-97%  |
| Mixed changes         | ~400       | ~50       | ~15          | 88-96%  |
| Plan failure          | ~150       | ~20       | ~20          | 87%     |

## Notes

- Always uses `-input=false` to prevent interactive prompts
- The `out` parameter saves the plan for later `terraform apply` usage
- The `target` parameter uses `-target` to plan only specific resources
- The `varFile` parameter uses `-var-file` for variable definitions files
- The `vars` parameter passes individual `-var` key=value pairs
- Resource actions are normalized to: `create`, `update`, `delete`, `replace`, `read`, `no-op`
- Compact mode drops the `resources` array, keeping only summary counts
