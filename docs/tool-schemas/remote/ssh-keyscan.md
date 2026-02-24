# remote > ssh-keyscan

Retrieves public host keys from a remote SSH server using `ssh-keyscan`.

**Command**: `ssh-keyscan [-t keyType] [-p port] host`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `host`    | string  | --      | Remote host to scan for public keys (hostname or IP)       |
| `port`    | number  | `22`    | SSH port number                                            |
| `keyType` | enum    | all     | Specific key type: `rsa`, `ecdsa`, or `ed25519`            |
| `timeout` | number  | `5`     | Timeout in seconds for the keyscan operation               |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Host Keys Retrieved

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~120 tokens

```
$ ssh-keyscan github.com
# github.com:22 SSH-2.0-babeld-f345ed5d
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
github.com ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q14zNKs=
```

</td>
<td>

~100 tokens

```json
{
  "host": "github.com",
  "keys": [
    {
      "host": "github.com",
      "keyType": "ssh-ed25519",
      "key": "AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl"
    },
    {
      "host": "github.com",
      "keyType": "ecdsa-sha2-nistp256",
      "key": "AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg="
    },
    {
      "host": "github.com",
      "keyType": "ssh-rsa",
      "key": "AAAAB3NzaC1yc2EAAAADAQABAAABgQCj7ndNxQowgcQnjshcLrqPEiiphnt+VTTvDP6mHBL9j1aNUkY4Ue1gvwnGLVlOhGeYrnZaMgRK6+PKCUXaDbC7qtbW8gIkhL7aGCsOr/C56SJMy/BCZfxd1nWzAOxSDPgVsmerOBYfNqltV9/hWCqBywINIR+5dIg6JTJ72pcEpEjcYgXkE2YEFXV1JHnsKgbLWNlhScqb2UmyRkQyytRLtL+38TGxkxCflmO+5Z8CSSNY7GidjMIZ7Q14zNKs="
    }
  ],
  "success": true
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~10 tokens

```json
{
  "host": "github.com",
  "keys": [],
  "success": true
}
```

</td>
</tr>
</table>

## Error -- Host Not Found

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ ssh-keyscan nonexistent.example.com
getaddrinfo nonexistent.example.com: Name or service not known
```

</td>
<td>

~15 tokens

```json
{
  "host": "nonexistent.example.com",
  "keys": [],
  "error": "getaddrinfo nonexistent.example.com: Name or service not known",
  "success": false
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
  "host": "nonexistent.example.com",
  "keys": [],
  "error": "getaddrinfo nonexistent.example.com: Name or service not known",
  "success": false
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario       | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------- | ---------- | --------- | ------------ | ------- |
| 3 host keys    | ~120       | ~100      | ~10          | 17-92%  |
| Host not found | ~15        | ~15       | ~15          | 0%      |

## Notes

- Useful for populating `known_hosts` or verifying host key fingerprints before connecting
- Use `keyType` to request only a specific key type (e.g., `ed25519` for modern keys)
- Each key entry includes `host`, `keyType`, and the base64-encoded public `key`
- Compact mode clears the `keys` array, keeping only the `host` and `success` status
- The default timeout is 5 seconds; increase for hosts with high latency
