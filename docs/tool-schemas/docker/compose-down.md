# docker > compose-down

Stops Docker Compose services and returns structured status. Use instead of running `docker compose down` in the terminal.

**Command**: `docker compose [-f file] down [--volumes] [--remove-orphans]`

## Input Parameters

| Parameter       | Type    | Default | Description                                                |
| --------------- | ------- | ------- | ---------------------------------------------------------- |
| `path`          | string  | ---     | Directory containing docker-compose.yml (required)         |
| `volumes`       | boolean | `false` | Also remove named volumes                                  |
| `removeOrphans` | boolean | `false` | Remove orphan containers                                   |
| `file`          | string  | ---     | Compose file path (default: docker-compose.yml)            |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Services Stopped

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
[+] Running 4/4
 ✔ Container myapp-web-1   Stopped          0.5s
 ✔ Container myapp-cache-1 Stopped          0.3s
 ✔ Container myapp-db-1    Stopped          1.0s
 ✔ Container myapp-web-1   Removed          0.1s
 ✔ Container myapp-cache-1 Removed          0.1s
 ✔ Container myapp-db-1    Removed          0.1s
 ✔ Network myapp_default   Removed          0.1s
```

</td>
<td>

~15 tokens

```json
{
  "success": true,
  "stopped": 3,
  "removed": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

Same as full (already compact).

</td>
</tr>
</table>

## Token Savings

| Scenario               | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------------- | ---------- | --------- | ------------ | ------- |
| 3 services + 1 network | ~120       | ~15       | ~15          | 88%     |

## Notes

- Stopped count reflects containers with `Stopped` status; removed count includes containers and networks with `Removed` status
- The `volumes` flag maps to `--volumes`, which removes named volumes declared in the compose file
- The `removeOrphans` flag maps to `--remove-orphans`, which removes containers not defined in the compose file
- The response is naturally compact, so compact mode returns the same schema as full mode
- Throws an error if compose down fails and nothing was stopped or removed
