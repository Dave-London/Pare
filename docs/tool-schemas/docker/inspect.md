# docker > inspect

Shows detailed container or image information with structured state, image, and platform data. Use instead of running `docker inspect` in the terminal.

**Command**: `docker inspect --format json <target>`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `target`  | string  | ---     | Container or image name/ID to inspect (required)           |
| `path`    | string  | cwd     | Working directory                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Container Inspected

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~2000+ tokens (full JSON inspect output)

```
[
  {
    "Id": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8...",
    "Created": "2024-01-15T10:00:00.000000000Z",
    "Path": "/docker-entrypoint.sh",
    "Args": ["nginx", "-g", "daemon off;"],
    "State": {
      "Status": "running",
      "Running": true,
      "Paused": false,
      "Restarting": false,
      "OOMKilled": false,
      "Dead": false,
      "Pid": 12345,
      "ExitCode": 0,
      "Error": "",
      "StartedAt": "2024-01-15T10:00:01.000000000Z",
      "FinishedAt": "0001-01-01T00:00:00Z"
    },
    "Image": "sha256:a1b2c3d4...",
    "Config": { "Image": "nginx:latest", ... },
    "NetworkSettings": { ... },
    ...
  }
]
```

</td>
<td>

~40 tokens

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "web",
  "state": {
    "status": "running",
    "running": true,
    "startedAt": "2024-01-15T10:00:01.000000000Z"
  },
  "image": "nginx:latest",
  "created": "2024-01-15T10:00:00.000000000Z"
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "id": "a1b2c3d4e5f6",
  "name": "web",
  "status": "running",
  "running": true,
  "image": "nginx:latest"
}
```

</td>
</tr>
</table>

## Error — Target Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Error</strong></td>
<td>

~20 tokens

```
Error: No such object: nonexistent
```

</td>
<td>

Throws `Error`: `docker inspect failed: Error: No such object: nonexistent`

</td>
</tr>
</table>

## Token Savings

| Scenario          | CLI Tokens | Pare Full | Pare Compact | Savings |
| ----------------- | ---------- | --------- | ------------ | ------- |
| Running container | ~2000+     | ~40       | ~25          | 98-99%  |
| Target not found  | ~20        | ---       | ---          | error   |

## Notes

- Docker's `inspect` returns a massive JSON blob (network settings, mounts, config, etc.); Pare extracts only the essential fields
- The container ID is truncated to 12 characters; the leading `/` is stripped from the name
- The `startedAt` field is omitted when it has the zero value (`0001-01-01T00:00:00Z`)
- The `platform` field is included only when present in Docker's output
- Compact mode flattens the `state` object into top-level `status` and `running` fields, and drops `startedAt`, `platform`, and `created`
- This tool provides the largest token savings of any Docker tool due to the verbosity of raw `docker inspect` output
