# infra > init

Initializes a Terraform working directory. Downloads providers, configures backend, and prepares for plan/apply.

**Command**: `terraform init -input=false`

## Input Parameters

| Parameter      | Type    | Default | Description                                                       |
| -------------- | ------- | ------- | ----------------------------------------------------------------- |
| `path`         | string  | cwd     | Project root path                                                 |
| `upgrade`      | boolean | --      | Upgrade provider plugins to newest acceptable versions (-upgrade) |
| `reconfigure`  | boolean | --      | Reconfigure backend, ignoring saved configuration (-reconfigure)  |
| `migrateState` | boolean | --      | Migrate state to new backend configuration (-migrate-state)       |
| `compact`      | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens        |

## Success — Init with Providers

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Finding hashicorp/random versions matching "~> 3.5"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)
- Installing hashicorp/random v3.6.0...
- Installed hashicorp/random v3.6.0 (signed by HashiCorp)

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure.
```

</td>
<td>

~60 tokens

```json
{
  "success": true,
  "providers": [
    { "name": "hashicorp/aws", "version": "5.31.0" },
    { "name": "hashicorp/random", "version": "3.6.0" }
  ],
  "backendType": "local"
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

## Error — Init Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~200 tokens

```
Initializing the backend...

Error: Failed to get existing workspaces: S3 bucket does not exist.

The referenced S3 bucket must have been previously created. If the S3 bucket
was recently created, verify the bucket configuration and try again.
```

</td>
<td>

~20 tokens

```json
{
  "success": false,
  "error": "Failed to get existing workspaces: S3 bucket does not exist."
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Init with 2 providers | ~300       | ~60       | ~5           | 80-98%  |
| Init failure          | ~200       | ~20       | ~20          | 90%     |

## Notes

- Always uses `-input=false` to prevent interactive prompts
- The `upgrade` flag adds `-upgrade` to fetch the latest provider versions within constraints
- The `reconfigure` flag adds `-reconfigure` to reset backend configuration
- The `migrateState` flag adds `-migrate-state` for backend migrations
- Providers list includes name and resolved version from the init output
- Compact mode drops `providers`, `backendType`, and `warnings`, keeping only `success`
