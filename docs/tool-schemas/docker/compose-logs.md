# docker > compose-logs

Retrieves Docker Compose service logs as structured entries. Use instead of running `docker compose logs` in the terminal.

**Command**: `docker compose logs --no-color [--timestamps] [--tail n] [--since timestamp] [services...]`

## Input Parameters

| Parameter    | Type     | Default | Description                                                |
| ------------ | -------- | ------- | ---------------------------------------------------------- |
| `path`       | string   | ---     | Directory containing docker-compose.yml                    |
| `services`   | string[] | `[]`    | Specific services to get logs for (default: all)           |
| `tail`       | number   | ---     | Number of lines to return per service (passed to --tail)   |
| `since`      | string   | ---     | Show logs since timestamp (e.g., `10m`, `2024-01-01`)      |
| `timestamps` | boolean  | `true`  | Include timestamps in output                               |
| `compact`    | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Compose Logs Retrieved

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
web-1    | 2024-01-15T10:00:01.000Z Server starting on port 3000
web-1    | 2024-01-15T10:00:02.000Z Ready to accept connections
db-1     | 2024-01-15T10:00:01.000Z PostgreSQL init process complete
db-1     | 2024-01-15T10:00:02.000Z database system is ready to accept connections
cache-1  | 2024-01-15T10:00:01.000Z Ready to accept connections
```

</td>
<td>

~90 tokens

```json
{
  "services": ["web-1", "db-1", "cache-1"],
  "entries": [
    { "timestamp": "2024-01-15T10:00:01.000Z", "service": "web-1", "message": "Server starting on port 3000" },
    { "timestamp": "2024-01-15T10:00:02.000Z", "service": "web-1", "message": "Ready to accept connections" },
    { "timestamp": "2024-01-15T10:00:01.000Z", "service": "db-1", "message": "PostgreSQL init process complete" },
    { "timestamp": "2024-01-15T10:00:02.000Z", "service": "db-1", "message": "database system is ready to accept connections" },
    { "timestamp": "2024-01-15T10:00:01.000Z", "service": "cache-1", "message": "Ready to accept connections" }
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

~55 tokens

```json
{
  "services": ["web-1", "db-1", "cache-1"],
  "total": 5,
  "head": [
    { "service": "web-1", "message": "Server starting on port 3000" },
    { "service": "web-1", "message": "Ready to accept connections" },
    { "service": "db-1", "message": "PostgreSQL init process complete" },
    { "service": "db-1", "message": "database system is ready to accept connections" },
    { "service": "cache-1", "message": "Ready to accept connections" }
  ],
  "tail": []
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| 5 entries, 3 services | ~200       | ~90       | ~55          | 55-73%  |

## Notes

- Log entries are parsed from Docker Compose's `service | [timestamp] message` format
- ISO timestamps are extracted when present; otherwise entries have no `timestamp` field
- When output exceeds the limit, `isTruncated` and `totalEntries` fields are included
- Compact mode keeps only the first 5 (`head`) and last 5 (`tail`) entries, dropping `timestamp` from each entry
- The `--no-color` flag is always passed to strip ANSI escape codes
