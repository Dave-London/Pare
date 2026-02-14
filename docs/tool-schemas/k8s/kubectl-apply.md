# k8s > kubectl-apply

Applies a Kubernetes manifest file. Use instead of running `kubectl apply` in the terminal.

**Command**: `kubectl apply -f <file> [-n namespace] [--dry-run mode] -o json`

## Input Parameters

| Parameter   | Type    | Default  | Description                                                |
| ----------- | ------- | -------- | ---------------------------------------------------------- |
| `file`      | string  | —        | Path to the manifest file to apply                         |
| `namespace` | string  | —        | Kubernetes namespace (omit for default)                    |
| `dryRun`    | enum    | `"none"` | Dry run mode: `none`, `client`, or `server`                |
| `compact`   | boolean | `true`   | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Apply Manifest

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~300 tokens

```
deployment.apps/nginx created
service/nginx-svc created

{... full JSON output from kubectl apply -o json, typically 1500+ characters ...}
```

</td>
<td>

~80 tokens

```json
{
  "action": "apply",
  "success": true,
  "output": "deployment.apps/nginx created\nservice/nginx-svc created",
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~60 tokens

```json
{
  "action": "apply",
  "success": true,
  "output": "deployment.apps/nginx created\nservice/nginx-svc created",
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Error — Invalid Manifest

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~80 tokens

```
error: error validating "deployment.yaml": error validating data: ValidationError(Deployment.spec):
missing required field "selector" in io.k8s.api.apps.v1.DeploymentSpec
```

</td>
<td>

~50 tokens

```json
{
  "action": "apply",
  "success": false,
  "output": "",
  "exitCode": 1,
  "error": "error validating \"deployment.yaml\": missing required field \"selector\" in io.k8s.api.apps.v1.DeploymentSpec"
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario            | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------- | ---------- | --------- | ------------ | ------- |
| 2 resources created | ~300       | ~80       | ~60          | 73-80%  |
| Dry run (server)    | ~350       | ~90       | ~70          | 74-80%  |
| Validation error    | ~80        | ~50       | ~50          | 37%     |

## Notes

- The tool runs `kubectl apply -f <file> -o json` to capture structured output from the apply operation
- The `dryRun` parameter supports three modes: `none` (default, applies for real), `client` (local validation only), and `server` (server-side dry run without persisting)
- The `file` parameter accepts a path to a YAML or JSON manifest file; it is not validated against flag injection since it is passed directly as the `-f` argument
- The `namespace` parameter is validated against flag injection
- Compact mode is similar to full mode for this tool since the output is already concise; the main savings come from parsing the verbose `-o json` response into a simple success/output structure
