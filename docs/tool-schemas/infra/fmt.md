# infra > fmt

Checks Terraform configuration formatting. Lists files that need formatting and optionally shows diffs.

**Command**: `terraform fmt -check`

## Input Parameters

| Parameter   | Type    | Default | Description                                                |
| ----------- | ------- | ------- | ---------------------------------------------------------- |
| `path`      | string  | cwd     | Project root path                                          |
| `diff`      | boolean | --      | Show formatting differences (-diff)                        |
| `recursive` | boolean | `true`  | Process files in subdirectories (-recursive, default true) |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — All Formatted

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

~10 tokens

```json
{
  "success": true,
  "files": []
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

## Check Mode — Files Need Formatting

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
main.tf
modules/vpc/main.tf
modules/vpc/variables.tf
```

</td>
<td>

~25 tokens

```json
{
  "success": false,
  "files": ["main.tf", "modules/vpc/main.tf", "modules/vpc/variables.tf"]
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
  "success": false
}
```

</td>
</tr>
</table>

## Check Mode — With Diff

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
main.tf
--- old/main.tf
+++ new/main.tf
@@ -3,5 +3,5 @@
 resource "aws_instance" "web" {
-  ami           ="ami-0c55b159cbfafe1f0"
-  instance_type="t3.micro"
+  ami           = "ami-0c55b159cbfafe1f0"
+  instance_type = "t3.micro"
 }
```

</td>
<td>

~80 tokens

```json
{
  "success": false,
  "files": ["main.tf"],
  "diff": "--- old/main.tf\n+++ new/main.tf\n@@ -3,5 +3,5 @@\n resource \"aws_instance\" \"web\" {\n-  ami           =\"ami-0c55b159cbfafe1f0\"\n-  instance_type=\"t3.micro\"\n+  ami           = \"ami-0c55b159cbfafe1f0\"\n+  instance_type = \"t3.micro\"\n }"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                    | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------------- | ---------- | --------- | ------------ | ------- |
| All formatted               | ~5         | ~10       | ~5           | 0%      |
| 3 files need formatting     | ~100       | ~25       | ~5           | 75-95%  |
| Diff with formatting issues | ~300       | ~80       | ~5           | 73-98%  |

## Notes

- Always runs in check mode (`-check`) -- does not modify files
- The `diff` flag adds `-diff` to show what changes would be made
- The `recursive` parameter defaults to `true`; pass `false` to limit to the current directory
- Compact mode drops `files` and `diff` fields, keeping only `success`
- Exit code is non-zero when files need formatting
