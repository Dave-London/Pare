# docker > run

Runs a Docker container from an image and returns structured container ID and status. Use instead of running `docker run` in the terminal.

**Command**: `docker run [-d] [--rm] [--name name] [-p port] [-v volume] [-e env] <image> [command...]`

## Input Parameters

| Parameter | Type     | Default | Description                                                |
| --------- | -------- | ------- | ---------------------------------------------------------- |
| `image`   | string   | ---     | Docker image to run (e.g., `nginx:latest`) (required)      |
| `name`    | string   | ---     | Container name                                             |
| `ports`   | string[] | `[]`    | Port mappings (e.g., `["8080:80", "443:443"]`)             |
| `volumes` | string[] | `[]`    | Volume mounts (e.g., `["/host/path:/container/path"]`)     |
| `env`     | string[] | `[]`    | Environment variables (e.g., `["KEY=VALUE"]`)              |
| `detach`  | boolean  | `true`  | Run container in background                                |
| `rm`      | boolean  | `false` | Remove container after exit                                |
| `command` | string[] | `[]`    | Command to run in the container                            |
| `path`    | string   | cwd     | Working directory                                          |
| `compact` | boolean  | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Container Started

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~25 tokens

```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

</td>
<td>

~20 tokens

```json
{
  "containerId": "a1b2c3d4e5f6",
  "image": "nginx:latest",
  "detached": true,
  "name": "web"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~15 tokens

```json
{
  "containerId": "a1b2c3d4e5f6",
  "image": "nginx:latest",
  "detached": true
}
```

</td>
</tr>
</table>

## Error — Image Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~30 tokens

```
Unable to find image 'nonexistent:latest' locally
docker: Error response from daemon: pull access denied for nonexistent
```

</td>
<td>

Throws `Error`: `docker run failed: Error response from daemon: pull access denied for nonexistent`

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Container started | ~25       | ~20       | ~15          | 20-40%  |

## Notes

- Container IDs are truncated to 12 characters
- The `detach` parameter defaults to `true` (background mode). When `false`, the tool waits for the container to exit
- Port mappings are validated to prevent injection attacks. Volume mounts are checked for safety (no host root mounts)
- Compact mode drops the `name` field
- Throws an error on non-zero exit codes with the stderr/stdout message
