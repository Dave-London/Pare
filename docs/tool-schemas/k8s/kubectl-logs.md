# k8s > kubectl-logs

Gets logs from a Kubernetes pod. Use instead of running `kubectl logs` in the terminal.

**Command**: `kubectl logs <pod> [-n namespace] [-c container] [--tail N] [--since duration] [--previous]`

## Input Parameters

| Parameter   | Type    | Default | Description                                                |
| ----------- | ------- | ------- | ---------------------------------------------------------- |
| `pod`       | string  | —       | Pod name                                                   |
| `namespace` | string  | —       | Kubernetes namespace (omit for default)                    |
| `container` | string  | —       | Container name (for multi-container pods)                  |
| `tail`      | number  | —       | Number of recent lines to show (e.g., 100)                 |
| `since`     | string  | —       | Only return logs newer than duration (e.g., 1h, 5m, 30s)   |
| `previous`  | boolean | `false` | Get logs from previous terminated container                |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Pod Logs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
2026-02-14T09:00:01Z INFO  Starting nginx server
2026-02-14T09:00:02Z INFO  Listening on port 80
2026-02-14T09:15:33Z INFO  GET /healthz 200 1ms
2026-02-14T09:15:34Z INFO  GET /api/v1/users 200 45ms
2026-02-14T09:20:12Z WARN  High memory usage: 85%
2026-02-14T09:25:01Z INFO  GET /api/v1/orders 200 120ms
2026-02-14T09:30:00Z INFO  GET /healthz 200 1ms
2026-02-14T09:35:44Z ERROR Connection to database timed out
2026-02-14T09:35:45Z INFO  Retrying database connection...
2026-02-14T09:35:46Z INFO  Database connection restored
```

</td>
<td>

~160 tokens

```json
{
  "action": "logs",
  "success": true,
  "pod": "nginx-7c5b8d6f9-x2k4m",
  "namespace": "default",
  "logs": "2026-02-14T09:00:01Z INFO  Starting nginx server\n2026-02-14T09:00:02Z INFO  Listening on port 80\n2026-02-14T09:15:33Z INFO  GET /healthz 200 1ms\n2026-02-14T09:15:34Z INFO  GET /api/v1/users 200 45ms\n2026-02-14T09:20:12Z WARN  High memory usage: 85%\n2026-02-14T09:25:01Z INFO  GET /api/v1/orders 200 120ms\n2026-02-14T09:30:00Z INFO  GET /healthz 200 1ms\n2026-02-14T09:35:44Z ERROR Connection to database timed out\n2026-02-14T09:35:45Z INFO  Retrying database connection...\n2026-02-14T09:35:46Z INFO  Database connection restored",
  "lineCount": 10,
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
  "action": "logs",
  "success": true,
  "pod": "nginx-7c5b8d6f9-x2k4m",
  "logs": "2026-02-14T09:00:01Z INFO  Starting nginx server\n...\n2026-02-14T09:35:46Z INFO  Database connection restored",
  "lineCount": 10,
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| 10 log lines           | ~400       | ~160      | ~100         | 60-75%  |
| 100 log lines (--tail) | ~3500      | ~1500     | ~500         | 57-85%  |
| Pod not found          | ~25        | ~30       | ~30          | 0%      |

## Notes

- The `tail` parameter maps to `--tail N` and is recommended for pods with high log volume to avoid returning megabytes of output
- The `since` parameter accepts Go duration strings (e.g., `1h`, `5m`, `30s`) and maps to `--since`
- The `previous` flag retrieves logs from the previously terminated container instance, useful for debugging crash loops
- The `container` parameter is only needed for multi-container pods; for single-container pods it can be omitted
- Pod name, namespace, container, and since values are validated against flag injection
- Compact mode truncates the `logs` field to show only the first and last few lines with an ellipsis, and drops the `namespace` and `container` fields
