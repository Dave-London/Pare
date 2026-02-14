# docker > logs

Retrieves container logs as structured line arrays. Use instead of running `docker logs` in the terminal.

**Command**: `docker logs <container> --tail <n> [--since <timestamp>]`

## Input Parameters

| Parameter   | Type    | Default | Description                                                                    |
| ----------- | ------- | ------- | ------------------------------------------------------------------------------ |
| `container` | string  | ---     | Container name or ID (required)                                                |
| `tail`      | number  | `100`   | Number of lines to return from Docker                                          |
| `since`     | string  | ---     | Show logs since timestamp (e.g., `10m`, `2024-01-01`)                          |
| `limit`     | number  | `100`   | Max lines in structured output. Lines beyond this are truncated with a flag.   |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens                     |

## Success — Container Logs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
2024-01-15 10:00:01 [info] Server starting on port 3000
2024-01-15 10:00:02 [info] Connected to database
2024-01-15 10:00:03 [info] Ready to accept connections
2024-01-15 10:01:15 [warn] Slow query detected (1200ms)
2024-01-15 10:02:30 [info] Health check passed
```

</td>
<td>

~60 tokens

```json
{
  "container": "web",
  "lines": [
    "2024-01-15 10:00:01 [info] Server starting on port 3000",
    "2024-01-15 10:00:02 [info] Connected to database",
    "2024-01-15 10:00:03 [info] Ready to accept connections",
    "2024-01-15 10:01:15 [warn] Slow query detected (1200ms)",
    "2024-01-15 10:02:30 [info] Health check passed"
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

~45 tokens

```json
{
  "container": "web",
  "total": 5,
  "head": [
    "2024-01-15 10:00:01 [info] Server starting on port 3000",
    "2024-01-15 10:00:02 [info] Connected to database",
    "2024-01-15 10:00:03 [info] Ready to accept connections",
    "2024-01-15 10:01:15 [warn] Slow query detected (1200ms)",
    "2024-01-15 10:02:30 [info] Health check passed"
  ],
  "tail": []
}
```

</td>
</tr>
</table>

## Success — Truncated Logs

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~500+ tokens (many log lines)

</td>
<td>

~65 tokens (capped at `limit`)

```json
{
  "container": "web",
  "lines": ["line 1", "line 2", "...first 100 lines..."],
  "total": 100,
  "isTruncated": true,
  "totalLines": 5000
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~35 tokens

```json
{
  "container": "web",
  "total": 100,
  "head": ["line 1", "line 2", "line 3", "line 4", "line 5"],
  "tail": ["line 96", "line 97", "line 98", "line 99", "line 100"]
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario        | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------- | ---------- | --------- | ------------ | ------- |
| 5 log lines     | ~120       | ~60       | ~45          | 50-63%  |
| 5000 lines (truncated) | ~500+  | ~65       | ~35          | 87-93%  |

## Notes

- The `tail` parameter controls how many lines Docker returns; the `limit` parameter controls how many lines appear in the structured output
- When `limit` < total lines returned, `isTruncated` and `totalLines` fields are included
- Compact mode keeps only the first 5 (`head`) and last 5 (`tail`) lines, dropping the full `lines` array
- Logs are read from both stdout and stderr (Docker may output to either)
