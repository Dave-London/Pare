# docker > images

Lists Docker images with structured repository, tag, size, and creation info. Use instead of running `docker images` in the terminal.

**Command**: `docker images --format json [-a] [filter]`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `all`     | boolean | `false` | Show all images including intermediates                    |
| `filter`  | string  | ---     | Filter by reference (e.g., `myapp`, `nginx:*`)             |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Images Listed

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
nginx        latest    a1b2c3d4e5f6   2 days ago     187MB
node         20-slim   b2c3d4e5f6a7   5 days ago     228MB
postgres     16        c3d4e5f6a7b8   1 week ago     432MB
redis        7         d4e5f6a7b8c9   2 weeks ago    138MB
```

</td>
<td>

~85 tokens

```json
{
  "images": [
    {
      "id": "a1b2c3d4e5f6",
      "repository": "nginx",
      "tag": "latest",
      "size": "187MB",
      "created": "2 days ago"
    },
    {
      "id": "b2c3d4e5f6a7",
      "repository": "node",
      "tag": "20-slim",
      "size": "228MB",
      "created": "5 days ago"
    },
    {
      "id": "c3d4e5f6a7b8",
      "repository": "postgres",
      "tag": "16",
      "size": "432MB",
      "created": "1 week ago"
    },
    {
      "id": "d4e5f6a7b8c9",
      "repository": "redis",
      "tag": "7",
      "size": "138MB",
      "created": "2 weeks ago"
    }
  ],
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~70 tokens

```json
{
  "images": [
    { "id": "a1b2c3d4e5f6", "repository": "nginx", "tag": "latest", "size": "187MB" },
    { "id": "b2c3d4e5f6a7", "repository": "node", "tag": "20-slim", "size": "228MB" },
    { "id": "c3d4e5f6a7b8", "repository": "postgres", "tag": "16", "size": "432MB" },
    { "id": "d4e5f6a7b8c9", "repository": "redis", "tag": "7", "size": "138MB" }
  ],
  "total": 4
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------- | ---------- | --------- | ------------ | ------- |
| 4 images | ~200       | ~85       | ~70          | 58-65%  |

## Notes

- Image IDs are truncated to 12 characters
- The `filter` parameter maps to Docker's reference filter (e.g., `docker images nginx:*`)
- Compact mode drops the `created` field from each image entry
- The `all` flag includes intermediate (dangling) images, matching `docker images -a`
