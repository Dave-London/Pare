# remote > ssh-test

Tests SSH connectivity to a remote host using `ssh -T` and returns whether the host is reachable.

**Command**: `ssh -T -o BatchMode=yes [user@]host`

## Input Parameters

| Parameter        | Type    | Default | Description                                                |
| ---------------- | ------- | ------- | ---------------------------------------------------------- |
| `host`           | string  | --      | Remote host to test connectivity to (hostname or IP)       |
| `user`           | string  | --      | SSH username (if not specified, uses SSH config default)   |
| `port`           | number  | `22`    | SSH port number                                            |
| `identityFile`   | string  | --      | Path to SSH private key file                               |
| `connectTimeout` | number  | `10`    | Connection timeout in seconds                              |
| `compact`        | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success -- Host Reachable

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~15 tokens

```
$ ssh -T -o BatchMode=yes deploy@web01.example.com
Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)
```

</td>
<td>

~25 tokens

```json
{
  "host": "web01.example.com",
  "user": "deploy",
  "reachable": true,
  "exitCode": 0,
  "banner": "Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)",
  "duration": 850
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
  "host": "web01.example.com",
  "user": "deploy",
  "reachable": true,
  "exitCode": 0,
  "duration": 850
}
```

</td>
</tr>
</table>

## Error -- Host Unreachable

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~20 tokens

```
$ ssh -T -o BatchMode=yes deploy@down.example.com
ssh: connect to host down.example.com port 22: Connection timed out
```

</td>
<td>

~25 tokens

```json
{
  "host": "down.example.com",
  "user": "deploy",
  "reachable": false,
  "exitCode": 255,
  "error": "ssh: connect to host down.example.com port 22: Connection timed out",
  "duration": 10200
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "host": "down.example.com",
  "user": "deploy",
  "reachable": false,
  "exitCode": 255,
  "error": "ssh: connect to host down.example.com port 22: Connection timed out",
  "duration": 10200
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario         | CLI Tokens | Pare Full | Pare Compact | Savings |
| ---------------- | ---------- | --------- | ------------ | ------- |
| Host reachable   | ~15        | ~25       | ~15          | 0%      |
| Host unreachable | ~20        | ~25       | ~20          | 0%      |

## Notes

- Uses `-T` to disable pseudo-terminal allocation and `-o BatchMode=yes` to prevent interactive prompts
- The `banner` field captures any welcome message returned by the remote host on successful connection
- The `reachable` boolean provides a clear signal for automation without parsing error messages
- Default `connectTimeout` is 10 seconds; set a lower value for faster failure detection in scripts
- Compact mode drops the `banner` field on success and preserves `error` on failure
