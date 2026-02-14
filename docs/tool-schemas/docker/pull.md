# docker > pull

Pulls a Docker image from a registry and returns structured result with digest info. Use instead of running `docker pull` in the terminal.

**Command**: `docker pull [--platform platform] <image>`

## Input Parameters

| Parameter  | Type    | Default | Description                                                     |
| ---------- | ------- | ------- | --------------------------------------------------------------- |
| `image`    | string  | ---     | Image to pull (e.g., `nginx:latest`, `ubuntu:22.04`) (required) |
| `platform` | string  | ---     | Target platform (e.g., `linux/amd64`, `linux/arm64`)            |
| `path`     | string  | cwd     | Working directory                                               |
| `compact`  | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens      |

## Success — Image Pulled

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
latest: Pulling from library/nginx
a2abf6c4d29d: Already exists
a9edb18cadd1: Pull complete
589b7251471a: Pull complete
186b1aaa4aa6: Pull complete
b4df32aa5a72: Pull complete
a0bcbecc962e: Pull complete
Digest: sha256:c26ae7472d624ba1fafd296e73cecc4f93f853088e6a9c13c0d52f6ca5865107
Status: Downloaded newer image for nginx:latest
docker.io/library/nginx:latest
```

</td>
<td>

~25 tokens

```json
{
  "image": "nginx",
  "tag": "latest",
  "digest": "sha256:c26ae7472d624ba1fafd296e73cecc4f93f853088e6a9c13c0d52f6ca5865107",
  "success": true
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
  "image": "nginx",
  "tag": "latest",
  "success": true
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
Error response from daemon: manifest for nonexistent:latest not found: manifest unknown
```

</td>
<td>

Throws `Error`: `docker pull failed: Error response from daemon: manifest for nonexistent:latest not found`

</td>
</tr>
</table>

## Token Savings

| Scenario     | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------ | ---------- | --------- | ------------ | ------- |
| Image pulled | ~100       | ~25       | ~15          | 75-85%  |

## Notes

- The image name and tag are parsed from the input string (e.g., `nginx:latest` becomes `image: "nginx"`, `tag: "latest"`)
- If no tag is specified, it defaults to `latest`
- The digest is extracted from the `Digest: sha256:...` line in Docker output
- Compact mode drops the `digest` field
- Throws an error on non-zero exit codes (e.g., image not found, authentication required)
