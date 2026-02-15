# k8s > kubectl-get

Gets Kubernetes resources and returns structured JSON output. Use instead of running `kubectl get` in the terminal.

**Command**: `kubectl get <resource> [name] [-n namespace] [-A] [-l selector] -o json`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `resource`      | string  | —       | Resource type (e.g., pods, services, deployments, nodes)   |
| `name`          | string  | —       | Resource name (omit to list all)                           |
| `namespace`     | string  | —       | Kubernetes namespace (omit for default)                    |
| `allNamespaces` | boolean | `false` | Get resources from all namespaces (-A)                     |
| `selector`      | string  | —       | Label selector (e.g., app=nginx)                           |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — List Pods

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~350 tokens

```
NAME                        READY   STATUS    RESTARTS   AGE
nginx-7c5b8d6f9-x2k4m      1/1     Running   0          3h
api-server-85b4f7d9-p9r2t   2/2     Running   1          5h
redis-cache-0               1/1     Running   0          1d

{... full JSON output from kubectl get -o json, typically 2000+ characters ...}
```

</td>
<td>

~180 tokens

```json
{
  "action": "get",
  "success": true,
  "resource": "pods",
  "namespace": "default",
  "items": [
    {
      "kind": "Pod",
      "metadata": {
        "name": "nginx-7c5b8d6f9-x2k4m",
        "namespace": "default",
        "creationTimestamp": "2026-02-14T09:00:00Z",
        "labels": { "app": "nginx" }
      },
      "status": { "phase": "Running" }
    },
    {
      "kind": "Pod",
      "metadata": {
        "name": "api-server-85b4f7d9-p9r2t",
        "namespace": "default",
        "creationTimestamp": "2026-02-14T07:00:00Z",
        "labels": { "app": "api-server" }
      },
      "status": { "phase": "Running" }
    },
    {
      "kind": "Pod",
      "metadata": {
        "name": "redis-cache-0",
        "namespace": "default",
        "creationTimestamp": "2026-02-13T12:00:00Z",
        "labels": { "app": "redis" }
      },
      "status": { "phase": "Running" }
    }
  ],
  "total": 3,
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~100 tokens

```json
{
  "action": "get",
  "success": true,
  "resource": "pods",
  "items": [
    { "metadata": { "name": "nginx-7c5b8d6f9-x2k4m" }, "status": { "phase": "Running" } },
    { "metadata": { "name": "api-server-85b4f7d9-p9r2t" }, "status": { "phase": "Running" } },
    { "metadata": { "name": "redis-cache-0" }, "status": { "phase": "Running" } }
  ],
  "total": 3,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| 3 pods in namespace    | ~350       | ~180      | ~100         | 49-71%  |
| 10 pods all namespaces | ~1200      | ~500      | ~280         | 58-77%  |
| No resources found     | ~20        | ~30       | ~30          | 0%      |

## Notes

- The tool runs `kubectl get -o json` and parses the full Kubernetes JSON response into a simplified structured format with `metadata`, `status`, and `spec` fields
- When `allNamespaces` is `true`, the `-A` flag is used and `namespace` is ignored
- The `selector` parameter maps to the `-l` label selector flag (e.g., `app=nginx,tier=frontend`)
- Resource names, namespaces, and selectors are validated against flag injection
- Compact mode drops `labels`, `creationTimestamp`, `spec`, and `namespace` from each item, keeping only `name` and `status`
