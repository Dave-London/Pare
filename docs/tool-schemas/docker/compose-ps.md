# docker > compose-ps

Lists Docker Compose services with structured state and status information. Use instead of running `docker compose ps` in the terminal.

**Command**: `docker compose ps --format json`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Directory containing docker-compose.yml                    |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Services Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~180 tokens

```
NAME             IMAGE          COMMAND                  SERVICE   CREATED        STATUS          PORTS
myapp-web-1      nginx:latest   "/docker-entrypoint.…"   web       2 hours ago    Up 2 hours      0.0.0.0:8080->80/tcp
myapp-db-1       postgres:16    "docker-entrypoint.s…"   db        2 hours ago    Up 2 hours      5432/tcp
myapp-cache-1    redis:7        "docker-entrypoint.s…"   cache     2 hours ago    Up 2 hours      6379/tcp
```

</td>
<td>

~65 tokens

```json
{
  "services": [
    {
      "name": "myapp-web-1",
      "service": "web",
      "state": "running",
      "status": "Up 2 hours",
      "ports": "0.0.0.0:8080->80/tcp"
    },
    { "name": "myapp-db-1", "service": "db", "state": "running", "status": "Up 2 hours" },
    { "name": "myapp-cache-1", "service": "cache", "state": "running", "status": "Up 2 hours" }
  ],
  "total": 3
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
  "services": [
    { "name": "myapp-web-1", "service": "web", "state": "running" },
    { "name": "myapp-db-1", "service": "db", "state": "running" },
    { "name": "myapp-cache-1", "service": "cache", "state": "running" }
  ],
  "total": 3
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario   | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------- | ---------- | --------- | ------------ | ------- |
| 3 services | ~180       | ~65       | ~35          | 64-81%  |

## Notes

- The `name` field is the container name (e.g., `myapp-web-1`); the `service` field is the compose service name (e.g., `web`)
- The `ports` field is only included when port mappings are present
- State values are lowercased (e.g., `running`, `exited`, `paused`)
- Compact mode drops `status` and `ports` fields, keeping only `name`, `service`, and `state`
