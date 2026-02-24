# infra > validate

Validates Terraform configuration files for syntax and consistency errors. Returns structured diagnostics.

**Command**: `terraform validate -json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Valid Configuration

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~50 tokens

```
Success! The configuration is valid.
```

</td>
<td>

~15 tokens

```json
{
  "valid": true,
  "errorCount": 0,
  "warningCount": 0
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

## Error — Invalid Configuration

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
Error: Missing required argument

  on main.tf line 8, in resource "aws_instance" "web":
   8: resource "aws_instance" "web" {

The argument "ami" is required, but no definition was found.

Error: Unsupported argument

  on main.tf line 15, in resource "aws_instance" "web":
  15:   nonexistent_arg = "value"

An argument named "nonexistent_arg" is not expected here.
```

</td>
<td>

~80 tokens

```json
{
  "valid": false,
  "errorCount": 2,
  "warningCount": 0,
  "diagnostics": [
    {
      "severity": "error",
      "summary": "Missing required argument",
      "detail": "The argument \"ami\" is required, but no definition was found.",
      "file": "main.tf",
      "line": 8
    },
    {
      "severity": "error",
      "summary": "Unsupported argument",
      "detail": "An argument named \"nonexistent_arg\" is not expected here.",
      "file": "main.tf",
      "line": 15
    }
  ]
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~80 tokens

```json
{
  "valid": false,
  "errorCount": 2,
  "warningCount": 0,
  "diagnostics": [
    {
      "severity": "error",
      "summary": "Missing required argument",
      "detail": "The argument \"ami\" is required, but no definition was found.",
      "file": "main.tf",
      "line": 8
    },
    {
      "severity": "error",
      "summary": "Unsupported argument",
      "detail": "An argument named \"nonexistent_arg\" is not expected here.",
      "file": "main.tf",
      "line": 15
    }
  ]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Valid configuration    | ~50        | ~15       | ~15          | 70%     |
| 2 validation errors   | ~300       | ~80       | ~80          | 73%     |

## Notes

- Uses `terraform validate -json` to get machine-readable validation output
- No parameters beyond `path` and `compact` -- validate checks the entire configuration
- Diagnostics include `severity` (error/warning), `summary`, optional `detail`, `file`, and `line`
- In compact mode, empty diagnostics arrays are omitted; non-empty arrays are preserved
- Requires `terraform init` to have been run first for provider validation
